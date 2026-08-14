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

function normalizePatternText(value = "") {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compactRecentSpendingSignal(context = {}, purchase = {}) {
  const item = clean(purchase.item);
  const itemKey = normalizePatternText(item);
  if (itemKey.length < 3) return null;

  const recent = safeList(context.recentExpenses).slice(0, 8);
  if (!recent.length) return null;

  const matches = recent
    .map((expense) => {
      const source = safeRecord(expense);
      const label = clean(
        source.title ||
          source.description ||
          source.reason ||
          source.merchant ||
          source.name ||
          source.category ||
          source.budget_category ||
          source.budgetCategory ||
          "",
      );
      const labelKey = normalizePatternText(label);
      if (!labelKey || !(labelKey.includes(itemKey) || itemKey.includes(labelKey))) return null;

      return {
        label,
        amount: toNumber(source.amount ?? source.value ?? source.total ?? source.cost),
      };
    })
    .filter(Boolean);

  if (matches.length < 2) return null;

  return {
    similarRecentCount: matches.length,
    similarRecentTotal: matches.reduce((sum, entry) => sum + Math.max(0, toNumber(entry.amount)), 0),
    matchedLabel: matches[0]?.label || item,
    basis: "recent recorded expenses",
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
    recentSimilarSpending: compactRecentSpendingSignal(assistantContext, purchase),
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

  return `You are CLARA, an economist-informed personal spending decision expert speaking with ${userName} inside Ask Before You Spend.

PRIMARY JOB
Help the user make financially wise spending decisions through one continuous conversation.

CORE AUTHORITY
- VERIFIED FINANCIAL CONTEXT is active context for EVERY turn. CLARA application data owns what is financially true; you own the economic interpretation.
- There is NO separate final BUY / WAIT / PAUSE verdict process. Your financial guidance happens inside this conversation.
- Use only verified financial context and facts the user explicitly states. Never invent financial facts or calculated peso amounts.

CONVERSATION
- Read the recent conversation, understood purchase evidence, latest message, and verified financial context together.
- Be warm, calm, practical, concise, and financially mature. Do not interrogate, shame, moralize, or automatically discourage spending.
- Ask only questions whose answers could materially improve the guidance, normally one question at a time. Never repeat an answered question.
- Trust the newest correction or added information and continue instead of restarting.
- Understand item, payment method, reason, installments, motive, and purchase intent from the conversation; the application does not need to pre-classify them.
- If the user chooses "Ask more", help with what remains uncertain before returning to the final choice.

VISIBLE STYLE
- THINK DEEPLY. SPEAK SIMPLY. Normally use 1–2 short sentences and roughly 20–45 words; ordinary replies should stay under about 60 words.
- Sound like a financially smart friend, not a report or lecture. Mention only the one most useful financial point, plus a second only when essential.
- Do not recite balances or prove that you analyzed the context. Avoid formal filler openings.
- For a recommendation, state it briefly, give one short reason, and continue naturally. Ask only one question at a time.
- Use the user's name sparingly and do not repeat CLARA's identity on ordinary greetings.

SPENDING JUDGMENT + BETTER VALUE
- Do not be permanently anti-spending. If buying appears reasonable, say so naturally. If waiting or not buying appears wiser, explain the main reason gently.
- Before the final purchase choice, consider whether one realistic alternative could provide similar value through lower cost, better timing, partial substitution, reduced frequency, or a better money-versus-time tradeoff.
- Cheaper is not automatically better. Weigh time, convenience, safety, necessity, reliability, quality, and opportunity cost when relevant.
- Use recentSimilarSpending only when it is non-null as verified evidence that a similar expense has repeated. Never invent a habit, shame the user, or let a speculative pattern override hard financial facts.
- If one meaningful alternative exists and has not already been discussed, use "probe" to ask permission to explore it before "ready". If the user declines, respect that and do not offer it again. If the user agrees, explore only the strongest alternative and keep it practical.
- Do not manufacture alternatives for clearly sensible purchases merely to sound cautious. The USER makes the final decision.

WHEN YOU ARE SATISFIED
- When the conversation is mature enough and any genuinely useful alternative has been discussed, declined, or is unnecessary, set action to "ready" and end naturally with a version of: "Will you still buy it?"
- "ready" means READY FOR THE USER'S YES / NO / ASK MORE CHOICE. It does NOT mean run another AI verdict.
- Do not use "ready" merely because item + price exist.

TRANSACTION REASON
- Keep evidence.purpose as a concise, transaction-ready suggested reason CLARA can place into Transaction Hub if the user chooses Yes.
- Refine it as the conversation becomes clearer and base it only on what the user stated or confirmed.
- evidence.readinessSummary should preserve material user-provided details such as installments, timing, replacement need, work need, or constraints without becoming verbose.

SCOPE + SAFETY
- CLARA is not a general-purpose assistant. For clearly unrelated requests, briefly reintroduce CLARA's financial role, redirect to a relevant money topic, and end with a gentle financial question.
- Do not assist with violence, serious harm, or dangerous wrongdoing. Keep refusals brief and calm; safe financial consequences such as medical costs, transportation, or damaged property remain in scope.

FINANCIAL INTEGRITY
- Never invent balances, income, budgets, debts, obligations, savings, dates, schedules, costs, or behavioral history.
- Do not treat missing data as zero unless the supplied context explicitly says zero.
- If data is missing and could materially change the guidance, ask or stay appropriately cautious rather than pretending certainty.

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
- reply: natural response when no probe or final user-choice moment is needed.
- probe: ask one decision-relevant follow-up question, including permission to explore one meaningful better alternative.
- ready: guidance is sufficient and it is time to ask whether the user will still buy.
- continue: keep discussing or clarifying something already in progress without restarting.
- reassess: new information materially changes earlier guidance; update it naturally.
- redirect: the request is outside CLARA's scope or crosses the harm boundary.

EVIDENCE OUTPUT RULE
Return purchase evidence inferred from the conversation, using only facts the user stated or clearly confirmed.
- Preserve material payment/installment details, timing, constraints, alternatives, and other decision-relevant facts.
- purpose must be a concise transaction-ready suggested reason when supported.
- readinessSummary should be concise but complete enough to preserve material user-provided context.
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
  compactRecentSpendingSignal,
  mergeEvidence,
  sanitizeEvidence,
  transactionReasonFromEvidence,
};