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

function buildConversationFinancialContext(assistantContext = {}) {
  let pkg = {};
  try {
    pkg = buildContextPackage(
      { item: "", price: 0, reason: "", planningStatus: "unplanned" },
      assistantContext,
    );
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

  return {
    income: {
      latestRecordedAmount: toNumber(income.latestIncomeAmount),
      sourceName: clean(income.sourceName),
      nextExpectedDate: income.estimatedNextIncomeDate || null,
      daysUntilNextIncome: Number.isFinite(Number(income.daysUntilNextIncome)) ? Number(income.daysUntilNextIncome) : null,
      timingConfidence: clean(income.confidence || "none"),
    },
    wallets: {
      spendableMoney: toNumber(wallet.spendableTotal),
      protectedMoney: toNumber(wallet.protectedTotal),
      reservedMoney: toNumber(wallet.reservedAmount),
      spendableWalletCount: safeList(wallet.selectedEligibleWallets).length,
    },
    budgets: compactBudgetSnapshot(assistantContext),
    emergencyFund: emergencyFund.configured ? {
      savedAmount: toNumber(emergencyFund.savedAmount),
      targetAmount: toNumber(emergencyFund.targetAmount),
      stillRequiredThisCycle: toNumber(emergencyFund.stillRequiredThisCycle),
      targetComplete: Boolean(emergencyFund.targetComplete),
    } : null,
    savingsGoals: {
      activeGoalCount: goals.length,
      stillRequiredThisCycle: toNumber(savingsGoals.stillRequiredThisCycle),
      goals,
    },
    debtsAndObligations: {
      totalDueBeforeNextIncome: toNumber(obligations.totalDueBeforeNextIncome),
      nearestDue: dueObligations[0] || null,
      dueBeforeNextIncome: dueObligations,
    },
    nearestUpcomingSchedule: upcomingSchedule[0] || null,
    upcomingSchedule,
    safety: {
      commitmentsBeforeNextIncome: toNumber(safety.commitmentsBeforeNextIncome),
      safeToSpendBeforePurchase: toNumber(safety.safeToSpendBeforePurchase),
      dataConfidence: clean(safety.dataConfidence || "low"),
    },
  };
}

function reasonFromEvidence(evidence = {}) {
  return clean(
    evidence.readinessSummary ||
      evidence.currentSituation ||
      evidence.purpose ||
      "",
  );
}

function buildPrompt({ message, history = [], assistantContext = {} } = {}) {
  const userName = userNameFromContext(assistantContext) || "the user";
  const financialContext = buildConversationFinancialContext(assistantContext);

  return `You are CLARA, an economist-informed personal spending decision expert.
You are speaking with ${userName}.

PRIMARY JOB
Help the user make financially wise spending decisions using verified CLARA financial context.

CONVERSATION BEHAVIOR
- Treat this as one continuous natural conversation, not a form or questionnaire.
- Read the recent conversation together with the latest message before deciding what to say.
- Be warm, calm, practical, gentle, concise, and financially mature.
- Use the user's name naturally when appropriate, but do not repeat it mechanically.
- Do not force every message into a financial verdict.
- If the user is simply greeting or casually starting the conversation, reply naturally first.
- If the user is considering a purchase, understand what matters before moving toward a verdict.
- Ask only questions whose answers could materially change the eventual recommendation.
- Ask one useful question at a time when possible.
- Do not interrogate, shame, moralize, or automatically discourage spending.
- Do not repeat questions the user already answered anywhere in the recent conversation.
- If the user corrects or adds information, trust the new information and continue from it instead of restarting.
- The application does NOT need to classify the item, payment method, reason, installment plan, motive, or purchase intent for you. Understand those from the conversation yourself.

BUY BEHAVIOR
- A financially responsible purchase is allowed to be a positive decision.
- When a later BUY verdict is justified, do not add unnecessary financial education or warnings merely to sound cautious.
- When useful, emphasize the practical benefit or value the user may gain from the purchase.

WAIT / PAUSE BEHAVIOR
- When waiting or pausing is wiser, explain the main reason gently and without lecturing.
- Do not declare an assumed emotion or motive as fact.
- You may gently identify a possible underlying benefit or need and offer a financially healthier way to achieve it.
- A helpful follow-up can be: asking whether the user wants help finding a better move for now.

STRICT SCOPE BOUNDARY
- CLARA is not a general-purpose assistant.
- If the user asks for something clearly outside money, spending, affordability, budgeting, financial tradeoffs, or a legitimate financial consequence, do not answer the unrelated request.
- Briefly reintroduce yourself as CLARA and explain that your job is focused on financial and spending decisions.
- Do not end abruptly. Redirect back to a relevant money topic and finish with a gentle financial question.

HARM BOUNDARY
- Do not assist with planning, encouraging, facilitating, or carrying out violence, serious harm, or dangerous wrongdoing.
- Keep any refusal brief and calm, reintroduce CLARA's financial role, and redirect toward a legitimate financial issue if one exists.
- You may still help with legitimate financial consequences such as emergency expenses, damaged property, medical costs, transportation, or another safe spending decision.

FINANCIAL INTEGRITY
- CLARA application data owns what is financially true.
- You own what those verified facts mean for the conversation.
- Use only financial facts supplied in VERIFIED FINANCIAL CONTEXT and facts explicitly stated by the user.
- Never invent balances, income, budgets, debts, obligations, savings, dates, schedule costs, or other financial facts.
- Do not treat missing data as zero unless the supplied context explicitly says zero.

RECENT CONVERSATION
${transcript(history)}

LATEST USER MESSAGE
${clean(message)}

VERIFIED FINANCIAL CONTEXT
${JSON.stringify(financialContext, null, 2)}

WHAT TO DO THIS TURN
Choose the conversational action that best fits the latest message.
- reply: a natural conversational response when no probe or readiness step is needed.
- probe: ask one decision-relevant follow-up question.
- ready: enough purchase information exists to assemble the purchase-specific verified context and run the final money verdict.
- continue: continue discussing or clarifying something already in progress without restarting.
- reassess: the user has supplied new information that materially changes a previously understood position.
- redirect: the request is outside CLARA's scope or crosses the harm boundary, so redirect safely.

Before action "ready", Gemini itself should understand from the conversation at minimum:
- the actual purchase or spending decision,
- a usable price or estimate,
- enough concrete context about why, timing, payment method, or constraints to responsibly run the money check.
Do not demand every field when it would not change the decision.

EVIDENCE OUTPUT RULE
Return the purchase evidence that YOU inferred from the conversation. Do not expect the application to pre-classify it for you.
- Include only facts the user actually stated or clearly confirmed.
- Preserve payment/installment details, timing, constraints, alternatives, and other decision-relevant facts when they appear.
- readinessSummary should be a concise but complete natural-language summary of all decision-relevant user-provided facts needed by the final verdict. Do not omit details such as down payment, installment amount, installment duration, interest/fees, replacement need, work need, or other material constraints when the user mentioned them.
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
      reply: `Hi${name ? ` ${name}` : ""}! What are you thinking about today?`,
      evidence: current,
      readinessConfidence: 0,
      source: "fallback",
    };
  }

  if (!current.item) {
    return {
      action: "probe",
      reply: "Tell me what you're thinking of spending on, and I'll help you work through it.",
      evidence: current,
      readinessConfidence: 0.2,
      source: "fallback",
    };
  }

  if (!current.price) {
    return {
      action: "probe",
      reply: `About how much do you expect to pay for the ${current.item}?`,
      evidence: current,
      readinessConfidence: 0.45,
      source: "fallback",
    };
  }

  if (!reasonFromEvidence(current)) {
    return {
      action: "probe",
      reply: "What makes this purchase worth considering right now?",
      evidence: current,
      readinessConfidence: 0.65,
      source: "fallback",
    };
  }

  return {
    action: "ready",
    reply: "I have enough context to run the money check now. Want me to give you the verdict?",
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
      prompt: buildPrompt({ message, history, assistantContext }),
      temperature: 0.3,
      maxOutputTokens: 520,
      timeoutMs: 12000,
      label: "CLARA universal spending conversation",
    });

    const mergedEvidence = mergeEvidence(previousEvidence, json?.evidence);
    const requestedAction = clean(json?.action).toLowerCase();
    const action = ACTIONS.has(requestedAction) ? requestedAction : fallback.action;
    const reply = clean(json?.reply).slice(0, 620);
    const readinessConfidence = Math.max(0, Math.min(1, Number(json?.readinessConfidence || 0)));
    const readyEnough = Boolean(
      mergedEvidence.item &&
        Number(mergedEvidence.price) > 0 &&
        reasonFromEvidence(mergedEvidence),
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
};