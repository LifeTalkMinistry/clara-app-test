import { requestGeminiJson } from "./clara-gemini-json-utils";
import {
  buildContextPackage,
  clean,
  safeList,
  safeRecord,
  toNumber,
} from "./clara-buy-check-budget-intelligence.js";
import { buildBudgetMetadata } from "./clara-buy-check-budget-engine.js";

const ACTIONS = new Set(["reply", "probe", "ready", "continue", "reassess", "redirect"]);
const CLARA_ATTITUDE_STORAGE_KEY = "clara_buy_check_attitude_v1";
const CLARA_COMMUNICATION_ATTITUDES = {
  gentle: {
    label: "Gentle",
    instruction: "Be patient, reassuring, and soft when correcting a weak spending decision. Keep accountability clear without pressure or sharp phrasing.",
  },
  supportive: {
    label: "Supportive",
    instruction: "Be encouraging and understanding while maintaining clear accountability. Acknowledge the user's goal, then guide them toward the financially stronger move.",
  },
  balanced: {
    label: "Balanced",
    instruction: "Use CLARA's standard style: calm, practical, objective, straightforward, and naturally warm without being overly soft or strict.",
  },
  firm: {
    label: "Firm",
    instruction: "Be direct and disciplined. Clearly challenge weak spending justifications and poor timing, with less cushioning, while remaining respectful and non-shaming.",
  },
  strict: {
    label: "Strict",
    instruction: "Use maximum financial accountability. Be very direct, challenge excuses and impulse reasoning clearly, and do not sugarcoat financially poor choices. Never shame, insult, threaten, or take away the user's final choice.",
  },
};

function selectedCommunicationAttitude() {
  let key = "balanced";
  try {
    if (typeof window !== "undefined") {
      const stored = clean(window.localStorage?.getItem(CLARA_ATTITUDE_STORAGE_KEY));
      if (stored && CLARA_COMMUNICATION_ATTITUDES[stored]) key = stored;
    }
  } catch {
    key = "balanced";
  }
  return CLARA_COMMUNICATION_ATTITUDES[key] || CLARA_COMMUNICATION_ATTITUDES.balanced;
}

const EVIDENCE_KEYS = [
  "item",
  "purpose",
  "currentSituation",
  "urgency",
  "alternatives",
  "timing",
  "constraints",
  "readinessSummary",
];

function sanitizeEvidence(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const evidence = {};

  EVIDENCE_KEYS.forEach((key) => {
    const text = clean(source[key]);
    if (!text) return;
    evidence[key] = text.slice(0, key === "item" ? 120 : 420);
  });

  const price = toNumber(source.price);
  if (price > 0) evidence.price = price;
  return evidence;
}

function mergeEvidence(previous = {}, incoming = {}) {
  return { ...sanitizeEvidence(previous), ...sanitizeEvidence(incoming) };
}

function transactionReasonFromEvidence(evidence = {}) {
  return clean(
    evidence.purpose ||
      evidence.currentSituation ||
      evidence.readinessSummary ||
      "",
  );
}

function transcript(history = []) {
  const lines = (Array.isArray(history) ? history.slice(-12) : [])
    .map((message) => {
      const text = clean(message?.text || message?.content || "");
      if (!text) return "";
      return `${message?.role === "user" ? "User" : "CLARA"}: ${text}`;
    })
    .filter(Boolean);
  return lines.length ? lines.join("\n") : "No earlier messages yet.";
}

function userNameFromContext(context = {}) {
  return clean(
    context.userName ||
      context.name ||
      context.profile?.name ||
      context.profile?.full_name ||
      context.profile?.first_name ||
      context.me?.name ||
      context.lifeProfile?.name ||
      context.user?.name ||
      context.user?.full_name ||
      context.user?.first_name ||
      context.user?.user_metadata?.full_name ||
      context.user?.user_metadata?.name ||
      context.user?.user_metadata?.first_name ||
      "",
  );
}

function firstName(value = "") {
  return clean(value).split(/\s+/).filter(Boolean)[0] || "";
}

function compactBudgetSnapshot(context = {}) {
  try {
    return buildBudgetMetadata(safeList(context.budgets), "other")
      .slice(0, 8)
      .map((budget) => ({
        title: clean(budget.title),
        limit: toNumber(budget.limit),
        remaining: toNumber(budget.preRemaining),
        family: clean(budget.family),
      }));
  } catch (error) {
    console.warn("[CLARA Buy Check] Budget snapshot fallback used.", error);
    return [];
  }
}

function compactGoal(goal = {}) {
  const source = safeRecord(goal);
  return {
    name: clean(source.name || source.title || "Savings goal"),
    savedAmount: toNumber(source.savedAmount ?? source.saved_amount ?? source.saved ?? source.current_amount),
    targetAmount: toNumber(source.targetAmount ?? source.target_amount ?? source.target ?? source.goal_amount),
  };
}

function compactObligation(obligation = {}) {
  const source = safeRecord(obligation);
  return {
    title: clean(source.title || source.name || "Obligation"),
    amount: toNumber(source.amount),
    dueDate: source.dueDate || source.date || null,
  };
}

function compactScheduleEvent(event = {}) {
  const source = safeRecord(event);
  return {
    title: clean(source.title || source.name || "Upcoming event"),
    date: source.date || source.start || null,
    amount: toNumber(source.amount ?? source.cost),
  };
}

function compactRelevantBudget(pkg = {}) {
  const budget = safeRecord(pkg.budget);
  const selected = safeRecord(budget.selectedBudget || budget.matchingBudget || pkg.finance?.matchingBudget);
  if (!selected.title && !budget.status) return null;
  return {
    title: clean(selected.title),
    status: clean(budget.status),
    remainingBefore: toNumber(budget.remainingBefore ?? selected.remaining),
    remainingAfter: Number.isFinite(Number(budget.remainingAfter ?? selected.remainingAfter))
      ? Number(budget.remainingAfter ?? selected.remainingAfter)
      : null,
    shortfall: toNumber(budget.shortfall),
    walletShortfall: toNumber(budget.walletShortfall),
    walletFundingStatus: clean(budget.walletFundingStatus),
  };
}

function buildConversationFinancialContext(assistantContext = {}, evidence = {}) {
  const understood = sanitizeEvidence(evidence);
  const purchase = {
    item: clean(understood.item),
    price: toNumber(understood.price),
    reason: transactionReasonFromEvidence(understood),
    planningStatus: "unplanned",
  };

  let pkg = {};
  try {
    pkg = buildContextPackage(purchase, assistantContext);
  } catch (error) {
    console.warn("[CLARA Buy Check] Universal conversation context degraded safely.", error);
  }

  const wallet = safeRecord(pkg.wallet);
  const income = safeRecord(pkg.incomeRunway);
  const obligations = safeRecord(pkg.obligations);
  const emergencyFund = safeRecord(pkg.emergencyFund);
  const savingsGoals = safeRecord(pkg.savingsGoals);
  const calendar = safeRecord(pkg.calendar);
  const safety = safeRecord(pkg.safety);
  const upcomingSchedule = safeList(calendar.upcomingEvents).slice(0, 4).map(compactScheduleEvent);
  const dueObligations = safeList(obligations.dueBeforeNextIncome).slice(0, 6).map(compactObligation);
  const goals = safeList(savingsGoals.records).slice(0, 6).map(compactGoal);
  const price = toNumber(purchase.price);
  const spendable = toNumber(wallet.spendableTotal);

  return {
    purchaseAlreadyUnderstood: {
      item: purchase.item,
      price,
      suggestedTransactionReason: purchase.reason,
    },
    income: {
      latestRecordedAmount: toNumber(income.latestIncomeAmount),
      sourceName: clean(income.sourceName),
      nextExpectedDate: income.estimatedNextIncomeDate || null,
      daysUntilNextIncome: Number.isFinite(Number(income.daysUntilNextIncome)) ? Number(income.daysUntilNextIncome) : null,
      timingConfidence: clean(income.confidence || "none"),
    },
    wallets: {
      spendableMoney: spendable,
      protectedMoney: toNumber(wallet.protectedTotal),
      reservedMoney: toNumber(wallet.reservedAmount),
      spendableWalletCount: safeList(wallet.selectedEligibleWallets).length,
      moneyAfterPurchase: price > 0 ? spendable - price : null,
    },
    budgets: compactBudgetSnapshot(assistantContext),
    relevantPurchaseBudget: compactRelevantBudget(pkg),
    emergencyFund: emergencyFund.configured ? {
      savedAmount: toNumber(emergencyFund.savedAmount),
      targetAmount: toNumber(emergencyFund.targetAmount),
      stillRequiredThisCycle: toNumber(emergencyFund.stillRequiredThisCycle),
      targetComplete: Boolean(emergencyFund.targetComplete),
      wouldBeAffected: Boolean(emergencyFund.wouldBeAffected),
      wouldRequireWithdrawal: Boolean(emergencyFund.wouldRequireWithdrawal),
    } : null,
    savingsGoals: {
      activeGoalCount: goals.length,
      stillRequiredThisCycle: toNumber(savingsGoals.stillRequiredThisCycle),
      wouldBeAffected: Boolean(savingsGoals.wouldBeAffected),
      wouldRequireWithdrawal: Boolean(savingsGoals.wouldRequireWithdrawal),
      goals,
    },
    debtsAndObligations: {
      totalDueBeforeNextIncome: toNumber(obligations.totalDueBeforeNextIncome),
      conflictAfterPurchase: Boolean(obligations.conflictAfterPurchase),
      nearestDue: dueObligations[0] || null,
      dueBeforeNextIncome: dueObligations,
    },
    nearestUpcomingSchedule: upcomingSchedule[0] || null,
    upcomingSchedule,
    safety: {
      commitmentsBeforeNextIncome: toNumber(safety.commitmentsBeforeNextIncome),
      safeToSpendBeforePurchase: toNumber(safety.safeToSpendBeforePurchase),
      safeToSpendAfterPurchase: price > 0 && Number.isFinite(Number(safety.safeToSpendAfterPurchase))
        ? Number(safety.safeToSpendAfterPurchase)
        : null,
      survivalReserve: toNumber(safety.survivalReserve),
      dataConfidence: clean(safety.dataConfidence || "low"),
    },
  };
}

function buildPrompt({ message, history = [], evidence = {}, assistantContext = {} } = {}) {
  const userName = userNameFromContext(assistantContext) || "the user";
  const understoodEvidence = sanitizeEvidence(evidence);
  const financialContext = buildConversationFinancialContext(assistantContext, understoodEvidence);
  const communicationAttitude = selectedCommunicationAttitude();

  return `You are CLARA, an economist-informed personal spending decision expert.
You are speaking with ${userName} inside Ask Before You Spend.

PRIMARY JOB
Help the user make financially wise spending decisions through one continuous conversation.

COMMUNICATION ATTITUDE
- Selected: ${communicationAttitude.label}
- ${communicationAttitude.instruction}
- The selected attitude changes HOW you communicate: tone, directness, warmth, and accountability.
- It must NEVER change verified financial facts, economic reasoning, affordability assessment, recommendation quality, evidence extraction, safety boundaries, or the user's final decision authority.
- In every attitude remain practical, concise, financially mature, respectful, and non-shaming.

CRITICAL ARCHITECTURE RULE
- VERIFIED FINANCIAL CONTEXT is active context for EVERY turn. Use it while deciding what to ask, what to point out, and what guidance to give.
- Do NOT save the user's wallet, budget, income timing, obligations, emergency fund, savings goals, or purchase amount for a separate final-analysis stage.
- There is NO separate final BUY / WAIT / PAUSE verdict process after this conversation.
- Your financial guidance is part of the conversation itself.
- When the purchase and price are known, actively consider how that amount fits the verified money situation. Be selective: mention only the financial facts that actually help the user decide.
- CLARA application data owns what is financially true. You own the economic interpretation of those verified facts.

CONVERSATION BEHAVIOR
- Treat this as one continuous natural conversation, not a form or questionnaire.
- Read the recent conversation, the purchase evidence already understood, the latest message, and verified financial context together before responding.
- Follow the selected communication attitude while staying practical, concise, financially mature, respectful, and non-shaming.
- Use the user's name naturally when appropriate, but do not repeat it mechanically.
- If the user is simply greeting or casually starting the conversation, reply naturally first.
- If the user is considering a purchase, understand what matters and give useful financial guidance as soon as the verified facts support it.
- Ask only questions whose answers could materially improve the guidance or the user's own decision.
- Ask one useful question at a time when possible.
- Do not interrogate, shame, moralize, or automatically discourage spending.
- Do not repeat questions the user already answered anywhere in the recent conversation or PURCHASE EVIDENCE ALREADY UNDERSTOOD.
- If the user corrects or adds information, trust the newest information and continue instead of restarting.
- The application does NOT need to classify the item, payment method, reason, installment plan, motive, or purchase intent for you. Understand those from the conversation yourself.
- If the user explicitly chooses "Ask more" or says they need more help before deciding, actively continue the discussion. Do not immediately repeat the final choice question without first helping with what remains uncertain.

VISIBLE RESPONSE STYLE — STRICT
- THINK DEEPLY. SPEAK SIMPLY.
- Your internal financial consideration may be complex. Your visible reply normally must not be.
- Normally use 1–2 short sentences. Never exceed 3 short sentences unless a safety refusal truly requires it.
- Aim for roughly 20–45 words. Treat about 60 words as a hard ceiling for an ordinary reply.
- Sound like a financially smart friend, not a financial adviser giving a report, lecture, sermon, coaching session, or classroom explanation.
- Mention only the ONE most important financial point for this turn. A second fact is allowed only when it is essential to understand the first.
- Do not recite every balance, obligation, budget, savings goal, tradeoff, or calculation you considered.
- Do not prove that you analyzed the context by listing it back to the user.
- Prefer plain conversational phrasing such as: "₱6k is pretty heavy for a casual want. I'd probably wait on this one. Still want to buy it?"
- Avoid filler openings such as "Thanks for sharing", "I'm happy to help", "Based on the information provided", "Let's take a look", "It's important to consider", or similar formal setup.
- For a clear recommendation: say the recommendation briefly, give ONE short reason, then continue naturally.
- When asking a question, ask ONE question. Do not bundle several example options into the same reply unless the user specifically asks for options.
- If the user chooses Ask more and has not named a specific concern, a good response is simply: "Sure. What are you still unsure about?"
- Use the user's name sparingly. Usually zero or one time in a reply is enough.
- Do not repeat CLARA's identity/title on ordinary greetings. A simple friendly greeting is enough.

BUY / NOT-BUY GUIDANCE
- Do not be permanently anti-spending. A strong financial position or a genuinely useful purchase can justify encouraging the purchase.
- If buying appears reasonable, say so naturally and emphasize the practical benefit when useful. Do not add unnecessary warnings merely to sound cautious.
- If waiting or not buying appears wiser, explain the main reason in the selected communication attitude and without lecturing.
- Do not declare an assumed emotion or motive as fact.
- You may suggest a cheaper, safer, better-timed, or more useful alternative when that genuinely helps.
- Even when the purchase itself looks reasonable, if you can see ONE genuinely practical alternative that could save the user money while still meeting the same main need, ask permission naturally in the selected communication attitude before giving it.
- A natural permission question is: "This looks reasonable. Want me to give you one alternative that could save you some money?" Adapt the wording naturally to the conversation; do not repeat this exact sentence mechanically.
- Use action "probe" for that permission question. Do not reveal the alternative yet unless the user says yes or clearly asks for it.
- If the user says yes, give only the single strongest practical alternative, explain it briefly, and then continue the same conversation toward the user's final choice.
- If the user declines, respect it, do not offer that alternative again, and move naturally toward "ready" when appropriate.
- Do not manufacture an alternative merely because one is possible. Only offer this when the alternative is meaningfully useful and plausibly saves money without defeating the user's main purpose.
- The USER makes the final decision. You guide; you do not take control away from them.

WHEN YOU ARE SATISFIED
- Stay engaged. Do not announce that another analysis is about to run.
- If one genuinely useful money-saving alternative is still worth offering and the user has not already accepted or declined it, ask permission first instead of jumping directly to "ready".
- When you have enough context to be genuinely useful, any useful alternative has been resolved or is unnecessary, and the user has received your guidance, set action to "ready" and end the visible reply with a natural version of: "Will you still buy it?"
- "ready" means READY FOR THE USER'S YES / NO / ASK MORE CHOICE. It does NOT mean run another AI verdict.
- Do not use "ready" merely because item + price exist; use it when the conversation has enough context for the user's decision.

TRANSACTION REASON
- Keep evidence.purpose as a concise, transaction-ready suggested reason that CLARA can place into Transaction Hub if the user chooses Yes.
- Example: "Replacing damaged work shoes" rather than a long paragraph.
- Refine this suggested reason as the conversation becomes clearer.
- Base it only on what the user stated or clearly confirmed. Do not invent a purpose.
- evidence.readinessSummary may be longer and should preserve the important user-provided context behind the decision.

STRICT SCOPE BOUNDARY
- CLARA is not a general-purpose assistant.
- If the user asks for something clearly outside money, spending, affordability, budgeting, financial tradeoffs, or a legitimate financial consequence, do not answer the unrelated request.
- Briefly reintroduce yourself as CLARA and explain that your job is focused on financial and spending decisions.
- Do not end abruptly. Redirect back to a relevant money topic and finish with a financial question in the selected communication attitude.

HARM BOUNDARY
- Do not assist with planning, encouraging, facilitating, or carrying out violence, serious harm, or dangerous wrongdoing.
- Keep any refusal brief and calm, reintroduce CLARA's financial role, and redirect toward a legitimate financial issue if one exists.
- You may still help with legitimate financial consequences such as emergency expenses, damaged property, medical costs, transportation, or another safe spending decision.

FINANCIAL INTEGRITY
- Use only financial facts supplied in VERIFIED FINANCIAL CONTEXT and facts explicitly stated by the user.
- Never invent balances, income, budgets, debts, obligations, savings, dates, schedule costs, or other financial facts.
- Do not treat missing data as zero unless the supplied context explicitly says zero.
- Do not invent calculated peso amounts. If a useful calculated amount is already supplied in VERIFIED FINANCIAL CONTEXT, you may use it.

RECENT CONVERSATION
${transcript(history)}

PURCHASE EVIDENCE ALREADY UNDERSTOOD
${JSON.stringify(understoodEvidence, null, 2)}

LATEST USER MESSAGE
${clean(message)}

VERIFIED FINANCIAL CONTEXT
${JSON.stringify(financialContext, null, 2)}

WHAT TO DO THIS TURN
Choose the conversational action that best fits the latest message.
- reply: a natural response when no probe or final user-choice moment is needed.
- probe: ask one decision-relevant follow-up question, including natural permission in the selected communication attitude to share one genuinely useful money-saving alternative.
- ready: the conversation is mature enough to ask whether the user will still buy; include your useful guidance and ask that question in the reply.
- continue: keep discussing or clarifying something already in progress without restarting.
- reassess: the user supplied new information that materially changes your earlier guidance; update it naturally.
- redirect: the request is outside CLARA's scope or crosses the harm boundary, so redirect safely.

EVIDENCE OUTPUT RULE
Return purchase evidence that YOU inferred from the conversation. Do not expect the application to pre-classify it for you.
- Include only facts the user actually stated or clearly confirmed.
- Preserve payment/installment details, timing, constraints, alternatives, and other decision-relevant facts when they appear.
- purpose must be the concise transaction-ready suggested reason when one is supported.
- readinessSummary should be a concise but complete natural-language summary of decision-relevant user-provided facts. Do not omit details such as down payment, installment amount, installment duration, interest/fees, replacement need, work need, or other material constraints when the user mentioned them.
- Do not invent missing evidence.

Return valid JSON only:
{
  "action": "reply" | "probe" | "ready" | "continue" | "reassess" | "redirect",
  "reply": "the exact natural response CLARA should show",
  "evidence": {
    "item": "",
    "price": 0,
    "purpose": "",
    "currentSituation": "",
    "urgency": "",
    "alternatives": "",
    "timing": "",
    "constraints": "",
    "readinessSummary": ""
  },
  "readinessConfidence": 0.0
}`;
}

function fallbackTurn(message = "", evidence = {}, assistantContext = {}) {
  const current = sanitizeEvidence(evidence);
  const name = firstName(userNameFromContext(assistantContext));
  const greeting = /^(hi|hello|hey|yo|good\s+(morning|afternoon|evening)|kumusta|kamusta)[!.\s]*$/i.test(clean(message));

  if (greeting && !current.item) {
    return {
      action: "reply",
      reply: `Hey${name ? ` ${name}` : ""}! What are you thinking of buying?`,
      evidence: current,
      readinessConfidence: 0,
      source: "fallback",
    };
  }

  if (!current.item) {
    return {
      action: "probe",
      reply: "What are you thinking of buying?",
      evidence: current,
      readinessConfidence: 0.2,
      source: "fallback",
    };
  }

  if (!current.price) {
    return {
      action: "probe",
      reply: `How much is the ${current.item}?`,
      evidence: current,
      readinessConfidence: 0.45,
      source: "fallback",
    };
  }

  if (!transactionReasonFromEvidence(current)) {
    return {
      action: "probe",
      reply: "Do you need it, or is it more of a want?",
      evidence: current,
      readinessConfidence: 0.65,
      source: "fallback",
    };
  }

  return {
    action: "ready",
    reply: "Got it. Will you still buy it?",
    evidence: current,
    readinessConfidence: 0.85,
    source: "fallback",
  };
}

export async function runClaraBuyCheckExpertTurn({
  message,
  history = [],
  evidence = {},
  assistantContext = {},
} = {}) {
  const previousEvidence = sanitizeEvidence(evidence);
  const fallback = fallbackTurn(message, previousEvidence, assistantContext);

  try {
    const { json, model } = await requestGeminiJson({
      feature: "ask-before-you-spend",
      prompt: buildPrompt({ message, history, evidence: previousEvidence, assistantContext }),
      temperature: 0.3,
      maxOutputTokens: 520,
      timeoutMs: 12000,
      label: "CLARA universal spending conversation",
    });

    const mergedEvidence = mergeEvidence(previousEvidence, json?.evidence);
    const requestedAction = clean(json?.action).toLowerCase();
    const action = ACTIONS.has(requestedAction) ? requestedAction : fallback.action;
    const reply = clean(json?.reply).slice(0, 720);
    const readinessConfidence = Math.max(0, Math.min(1, Number(json?.readinessConfidence || 0)));
    const readyEnough = Boolean(
      mergedEvidence.item &&
        Number(mergedEvidence.price) > 0 &&
        transactionReasonFromEvidence(mergedEvidence),
    );

    if (action === "ready" && !readyEnough) {
      return { ...fallbackTurn(message, mergedEvidence, assistantContext), model };
    }

    if (!reply) {
      return { ...fallbackTurn(message, mergedEvidence, assistantContext), model };
    }

    return {
      action,
      reply,
      evidence: mergedEvidence,
      readinessConfidence,
      source: "ai",
      model,
    };
  } catch (error) {
    console.warn("[CLARA Buy Check] Universal conversation fallback used.", error);
    return fallback;
  }
}

export {
  buildConversationFinancialContext,
  buildPrompt,
  mergeEvidence,
  sanitizeEvidence,
  transactionReasonFromEvidence,
};