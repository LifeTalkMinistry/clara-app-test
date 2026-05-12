const PESO_FORMATTER = new Intl.NumberFormat("en-PH", {
  maximumFractionDigits: 0,
});

const ME_PROFILE_PREFIX = "clara_me_basic_profile_";
const SCHEDULE_PREFIX = "clara_schedule_events_v2_";

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function cleanText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s₱.,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getNumber(...values) {
  for (const value of values) {
    if (!hasValue(value)) continue;
    if (typeof value === "number" && Number.isFinite(value)) return value;

    const number = Number(
      String(value)
        .replace(/php/gi, "")
        .replace(/[₱,\s]/g, "")
        .trim()
    );

    if (Number.isFinite(number)) return number;
  }

  return null;
}

function formatMoney(value, fallbackFormatter) {
  if (typeof fallbackFormatter === "function") return fallbackFormatter(value || 0);
  const number = getNumber(value);
  if (number === null) return "₱0";
  return `₱${PESO_FORMATTER.format(number)}`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function readLatestLocalValue(prefix) {
  if (typeof window === "undefined" || !window.localStorage) return null;

  try {
    const keys = Object.keys(window.localStorage).filter((key) => key.startsWith(prefix));
    for (let index = keys.length - 1; index >= 0; index -= 1) {
      const parsed = JSON.parse(window.localStorage.getItem(keys[index]) || "null");
      if (parsed) return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function readUserProfileContext(explicitProfile = null) {
  const profile = explicitProfile || readLatestLocalValue(ME_PROFILE_PREFIX) || {};

  return {
    moneyPersonality: profile.personality || "Unknown",
    protectFirst: profile.responsibility || "Bills and essentials",
    incomeRhythm: profile.incomeRhythm || "Unknown",
    currentStatus: profile.status || "Unknown",
    dependents: profile.dependents || "Unknown",
    age: profile.age || "",
    guidanceTone: profile.coachingStyle || "Balanced",
  };
}

function normalizeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(from, to) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function isMoneyEvent(event = {}) {
  const type = cleanText(event.type);
  const title = cleanText(event.title || event.name);
  return Boolean(event.amount) || ["bill", "payday", "money"].includes(type) || /bill|rent|due|payment|payday|salary|tuition|loan|debt/.test(title);
}

function readScheduleContext(explicitEvents = null) {
  const rawEvents = explicitEvents || readLatestLocalValue(SCHEDULE_PREFIX) || [];
  const today = new Date();

  const events = safeArray(rawEvents)
    .map((event) => ({
      id: event.id,
      title: event.title || event.name || "Schedule",
      type: event.type || "Schedule",
      date: event.date,
      amount: getNumber(event.amount),
      note: event.note || event.description || "",
      parsedDate: normalizeDate(event.date),
      raw: event,
    }))
    .filter((event) => event.parsedDate);

  const upcomingMoneyEvents = events
    .filter(isMoneyEvent)
    .map((event) => ({ ...event, daysUntil: daysBetween(today, event.parsedDate) }))
    .filter((event) => event.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const nextMoneyPressure = upcomingMoneyEvents[0] || null;
  const pressureThisWeek = upcomingMoneyEvents.some((event) => event.daysUntil <= 7);
  const pressureThisMonth = upcomingMoneyEvents.some((event) => event.daysUntil <= 30);

  return {
    upcomingMoneyEvents,
    nextMoneyPressure,
    daysUntilNextMoneyPressure: nextMoneyPressure?.daysUntil ?? null,
    pressureThisWeek,
    pressureThisMonth,
  };
}

function buildFinanceContext(financeContext = {}) {
  const availableMoney = getNumber(
    financeContext.availableMoney,
    financeContext.walletMoney,
    financeContext.totalMoneyLeft,
    financeContext.totalWalletBalance,
    financeContext.totalAvailableMoney
  );

  const budgetAllocated = getNumber(financeContext.budgetAllocated, financeContext.totalBudgetAllocated);
  const budgetRemaining = getNumber(financeContext.budgetRemaining, financeContext.remainingBudget);
  const monthlySpent = getNumber(financeContext.monthlySpent, financeContext.thisMonthSpent, financeContext.totalExpensesThisMonth);
  const unplannedSpent = getNumber(financeContext.unplannedSpent);
  const wantsSpent = getNumber(financeContext.wantsSpent);

  const hasActiveBudgetPlan =
    Boolean(financeContext.hasActiveBudgetPlan) ||
    (budgetAllocated !== null && budgetAllocated > 0) ||
    safeArray(financeContext.budgets).some((budget) => getNumber(budget?.allocated, budget?.amount, budget?.limit) > 0);

  return {
    availableMoney,
    budgetAllocated,
    budgetRemaining: hasActiveBudgetPlan ? budgetRemaining : null,
    monthlySpent,
    unplannedSpent,
    wantsSpent,
    hasActiveBudgetPlan,
    emergencyFund: financeContext.emergencyFund || {},
    savingsGoals: safeArray(financeContext.savingsGoals),
  };
}

function extractPurchaseAmount(message = "") {
  const matches = String(message || "")
    .replace(/,/g, "")
    .match(/(?:₱|php\s*)?\d+(?:\.\d{1,2})?/gi);

  if (!matches?.length) return null;

  const amounts = matches
    .map((match) => Number(match.replace(/php/gi, "").replace(/₱/g, "").trim()))
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  return amounts.length ? Math.max(...amounts) : null;
}

function classifyPurchase(message = "") {
  const text = cleanText(message);

  const essential = /medicine|meds|doctor|hospital|bill|rent|tuition|grocery|groceries|rice|food at home|transport|fare|load|utility|electric|water|work tool|school|repair/.test(text);
  const growth = /book|course|class|learning|study|gym|health|workout|therapy|work tool|equipment|career|interview/.test(text);
  const relational = /date|girlfriend|boyfriend|partner|family|parent|child|children|friend|gift|send money|support/.test(text);
  const optional = /milktea|milk tea|coffee|shoes|clothes|game|gaming|skin|makeup|delivery|order food|grab|foodpanda|restaurant|treat|shopping|sale/.test(text);
  const emotional = /stress|stressed|sad|tired|deserve|craving|bored|reward|bad day|anxious|overwhelmed/.test(text);

  return {
    essential,
    growth,
    relational,
    optional,
    emotional,
    category: essential ? "essential" : growth ? "growth" : relational ? "relationship" : optional ? "optional" : "unknown",
  };
}

function getDecisionLabel(decision) {
  if (decision === "safe") return "Safe";
  if (decision === "limit") return "Okay with limit";
  if (decision === "delay") return "Better delay";
  return "Protect first";
}

function getSuggestedLimit({ amount, finance, schedule }) {
  const available = finance.availableMoney || 0;
  const budgetCap = finance.budgetRemaining !== null ? finance.budgetRemaining : available;
  const pressureFactor = schedule.pressureThisWeek ? 0.08 : 0.15;
  const limit = Math.max(50, Math.min(amount, budgetCap * pressureFactor));
  return Math.floor(limit / 50) * 50 || 50;
}

function chooseTone(profile) {
  const tone = cleanText(profile.guidanceTone);
  if (tone.includes("strict")) return "Be firm.";
  if (tone.includes("gentle")) return "Keep it gentle.";
  if (tone.includes("straight")) return "Be direct.";
  return "Keep it balanced.";
}

export function buildClaraDecisionContext({ message, financeContext = {}, userProfileContext = null, scheduleEvents = null } = {}) {
  return {
    purchaseRequest: {
      amount: extractPurchaseAmount(message),
      text: String(message || "").trim(),
      signals: classifyPurchase(message),
    },
    financeContext: buildFinanceContext(financeContext),
    userProfileContext: readUserProfileContext(userProfileContext),
    scheduleContext: readScheduleContext(scheduleEvents),
  };
}

export function evaluatePurchaseDecision({ message, financeContext = {}, userProfileContext = null, scheduleEvents = null } = {}) {
  const context = buildClaraDecisionContext({ message, financeContext, userProfileContext, scheduleEvents });
  const { purchaseRequest, financeContext: finance, scheduleContext: schedule, userProfileContext: profile } = context;
  const amount = purchaseRequest.amount;
  const signals = purchaseRequest.signals;
  const contextUsed = [];

  if (!amount) {
    return {
      decision: "need_amount",
      title: "Need amount",
      message: "How much is it? I’ll check it against your money left, schedule, and what you told CLARA to protect first.",
      reason: "No purchase amount was detected.",
      nextAction: "Send the item with the price.",
      contextUsed,
      context,
    };
  }

  const available = finance.availableMoney;
  const amountText = formatMoney(amount);
  const availableText = available !== null ? formatMoney(available) : "your visible money";
  const nextPressure = schedule.nextMoneyPressure;
  const pressureSoon = Boolean(nextPressure && nextPressure.daysUntil <= 7);
  const pressureText = nextPressure
    ? `${nextPressure.title} in ${nextPressure.daysUntil === 0 ? "today" : `${nextPressure.daysUntil} day${nextPressure.daysUntil === 1 ? "" : "s"}`}`
    : "upcoming money pressure";
  const protectFirst = profile.protectFirst || "your priorities";
  const personality = cleanText(profile.moneyPersonality);
  const share = available && available > 0 ? amount / available : null;
  const activeBudgetPressure = finance.budgetRemaining !== null && amount > finance.budgetRemaining;

  if (available !== null) contextUsed.push("money left");
  if (finance.hasActiveBudgetPlan) contextUsed.push("budget plan");
  if (nextPressure) contextUsed.push("schedule pressure");
  if (profile.protectFirst) contextUsed.push("protect-first priority");
  if (profile.moneyPersonality && profile.moneyPersonality !== "Unknown") contextUsed.push("money personality");
  if (signals.essential || signals.growth || signals.relational || signals.optional || signals.emotional) contextUsed.push("purchase purpose");

  if (available !== null && amount > available) {
    return {
      decision: "protect",
      title: getDecisionLabel("protect"),
      message: `Not today. ${amountText} is higher than your visible money left of ${availableText}. Protect ${protectFirst.toLowerCase()} first.`,
      reason: "The purchase is higher than available money.",
      nextAction: "Delay it or find a lower-cost option.",
      contextUsed,
      context,
    };
  }

  if (activeBudgetPressure && !signals.essential) {
    return {
      decision: "delay",
      title: getDecisionLabel("delay"),
      message: `I’d delay this. ${amountText} may fit your wallet, but it goes beyond your active budget space. Protect ${protectFirst.toLowerCase()} first.`,
      reason: "The amount is above budget remaining.",
      nextAction: "Rebalance first or choose a cheaper version.",
      contextUsed,
      context,
    };
  }

  if (pressureSoon && !signals.essential && share !== null && share >= 0.08) {
    const suggestedLimit = getSuggestedLimit({ amount, finance, schedule });
    return {
      decision: signals.growth || signals.relational ? "limit" : "delay",
      title: getDecisionLabel(signals.growth || signals.relational ? "limit" : "delay"),
      message: signals.growth || signals.relational
        ? `You can consider it, but keep it around ${formatMoney(suggestedLimit)} if possible. Your schedule shows ${pressureText}, so spend with timing in mind.`
        : `I’d delay this for now. Your schedule shows ${pressureText}, and ${amountText} may reduce your flexibility before that date.`,
      reason: "Upcoming schedule pressure makes optional spending riskier.",
      suggestedLimit,
      nextAction: signals.growth || signals.relational ? "Set a limit before buying." : "Wait until the pressure passes.",
      contextUsed,
      context,
    };
  }

  if (signals.emotional && !signals.essential) {
    const suggestedLimit = getSuggestedLimit({ amount, finance, schedule });
    return {
      decision: "limit",
      title: getDecisionLabel("limit"),
      message: `Pause first. This sounds like it may be emotion-led spending, so keep it under ${formatMoney(suggestedLimit)} or delay it until tomorrow. ${chooseTone(profile)}`,
      reason: "The message contains emotional-spending signals.",
      suggestedLimit,
      nextAction: "Wait 10 minutes, then decide again.",
      contextUsed,
      context,
    };
  }

  if (personality.includes("impulse") && signals.optional) {
    return {
      decision: "delay",
      title: getDecisionLabel("delay"),
      message: `Better delay. Your money personality suggests optional purchases can move fast, and ${amountText} should not quietly compete with ${protectFirst.toLowerCase()}.`,
      reason: "Optional purchase plus impulse/comfort personality risk.",
      nextAction: "Save it as a planned purchase instead.",
      contextUsed,
      context,
    };
  }

  if (personality.includes("generous") && signals.relational && share !== null && share >= 0.1) {
    const suggestedLimit = getSuggestedLimit({ amount, finance, schedule });
    return {
      decision: "limit",
      title: getDecisionLabel("limit"),
      message: `You care about people, but protect your essentials too. Consider keeping this around ${formatMoney(suggestedLimit)} so helping someone does not hurt your own month.`,
      reason: "Relational spending can become over-giving.",
      suggestedLimit,
      nextAction: "Help within a clear limit.",
      contextUsed,
      context,
    };
  }

  if (share !== null && share >= 0.5 && !signals.essential) {
    return {
      decision: "protect",
      title: getDecisionLabel("protect"),
      message: `Not recommended. ${amountText} would use a large part of your ${availableText}. Protect ${protectFirst.toLowerCase()} first.`,
      reason: "The purchase would consume too much available money.",
      nextAction: "Delay or split it into a planned purchase.",
      contextUsed,
      context,
    };
  }

  if (share !== null && share >= 0.12 && !signals.essential) {
    const suggestedLimit = getSuggestedLimit({ amount, finance, schedule });
    return {
      decision: "limit",
      title: getDecisionLabel("limit"),
      message: `You can buy it only if it stays intentional. ${amountText} is noticeable against your ${availableText}, so keep it closer to ${formatMoney(suggestedLimit)} if this is optional.`,
      reason: "The amount is meaningful compared with available money.",
      suggestedLimit,
      nextAction: "Set a limit and log it right away.",
      contextUsed,
      context,
    };
  }

  if (signals.essential) {
    return {
      decision: "safe",
      title: getDecisionLabel("safe"),
      message: `Yes, this looks reasonable because it sounds essential. ${amountText} should still be logged so CLARA can protect ${protectFirst.toLowerCase()} accurately.`,
      reason: "The purchase supports an essential need.",
      nextAction: "Buy it intentionally and log it.",
      contextUsed,
      context,
    };
  }

  if (signals.growth || signals.relational) {
    return {
      decision: "limit",
      title: getDecisionLabel("limit"),
      message: `This can be okay if planned. It supports ${signals.growth ? "growth or health" : "relationship or family"}, but still protect ${protectFirst.toLowerCase()} first.`,
      reason: "The purchase has a positive life purpose but still needs a limit.",
      nextAction: "Choose a clear amount before spending.",
      contextUsed,
      context,
    };
  }

  return {
    decision: "safe",
    title: getDecisionLabel("safe"),
    message: `Safe, but still intentional. ${amountText} looks manageable against your ${availableText}. Log it after buying so small spending stays visible.`,
    reason: "No major pressure was detected from available context.",
    nextAction: "Log it right away.",
    contextUsed,
    context,
  };
}

export function generateContextualPurchaseReply(message, financeContext = {}, options = {}) {
  const result = evaluatePurchaseDecision({
    message,
    financeContext,
    userProfileContext: options.userProfileContext,
    scheduleEvents: options.scheduleEvents,
  });

  if (result.decision === "need_amount") return result.message;

  const contextText = result.contextUsed?.length
    ? ` I considered your ${result.contextUsed.slice(0, 3).join(", ")}.`
    : "";

  return `${result.title}. ${result.message}${contextText}`.trim();
}

export function buildContextForGeminiPrompt(context = {}) {
  const decisionContext = buildClaraDecisionContext({
    message: context.message,
    financeContext: context.financeContext || context,
    userProfileContext: context.userProfileContext,
    scheduleEvents: context.scheduleEvents,
  });

  const profile = decisionContext.userProfileContext;
  const schedule = decisionContext.scheduleContext;

  return {
    profile,
    schedule,
    purchaseSignals: decisionContext.purchaseRequest.signals,
    purchaseAmount: decisionContext.purchaseRequest.amount,
  };
}
