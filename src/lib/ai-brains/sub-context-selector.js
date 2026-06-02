import { buildClaraFinanceSnapshot } from "../clara-local-brain";
import { getScheduleContextForAI } from "../clara-schedule-ai-context";
import { CLARA_BRAINS, CLARA_BRAIN_LABELS, CLARA_BRAIN_KEYS } from "./brain-router";

function cleanText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9₱.,?'’\s-]/g, " ")
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : "unknown";
}

function count(items) {
  return Array.isArray(items) ? items.length : 0;
}

function yesNo(value) {
  return value ? "loaded" : "missing";
}

function extractPurchaseAmount(message = "") {
  const matches = [...String(message || "").replace(/,/g, "").matchAll(/(?:₱|php\s*|p\s*)?(\d+(?:\.\d{1,2})?)\s*(?:pesos?|php)?/gi)]
    .map((match) => Number(match[1]))
    .filter((number) => Number.isFinite(number) && number > 0);
  return matches.length ? Math.max(...matches) : null;
}

function hasAny(text = "", pattern) {
  return pattern.test(text);
}

function getTopSpendingCategory(finance = {}) {
  const top = finance.topSpendingCategory || {};
  return top?.category ? `${top.category}: ${money(top.amount)}` : "none";
}

function getBudgetCategoryCount(finance = {}) {
  return count(finance?.budgetPlan?.categories);
}

function buildLoadedData({ context = {}, finance = {}, schedule = {} } = {}) {
  const plan = finance.budgetPlan || {};
  const hasEmergency = Number.isFinite(Number(finance?.emergencyFund?.saved)) || Number.isFinite(Number(finance?.emergencyFund?.target));

  return {
    finance: {
      wallets: count(finance.wallets) > 0,
      budgetPlan: Boolean(plan.hasDeclaredBudget || getBudgetCategoryCount(finance) > 0),
      budgetCategories: getBudgetCategoryCount(finance) > 0,
      transactions: count(finance.currentMonthExpenses || finance.expenses) > 0 || Number(finance.monthlySpent || 0) > 0,
      monthlySummary: Number.isFinite(Number(finance.monthlySpent)),
      spendingCategories: Boolean(finance.topSpendingCategory?.category),
      savingsGoals: count(finance.savingsGoals) > 0,
      emergencyFund: hasEmergency,
      debts: count(context.debtObligations || context.debts || context.obligations) > 0,
    },
    schedule: {
      upcomingItems: count(schedule.upcomingItems) > 0,
      moneyImpactEvents: count(schedule.upcomingMoneyItems) > 0,
      appointments: count(schedule.upcomingItems) > 0,
      reminders: count(schedule.upcomingItems) > 0,
      deadlines: count(schedule.upcomingItems) > 0,
      nextItem: Boolean(schedule.nextItem),
      nextMoneyItem: Boolean(schedule.nextMoneyItem),
    },
    memory: {
      spendingPatterns: Boolean(context?.behavioralMemory || context?.spendingPatterns || context?.memory?.spendingPatterns || context?.lifeProfile?.spendingTrigger || context?.profile?.spendingTrigger),
      paydayBehavior: Boolean(context?.paydayBehavior || context?.memory?.paydayBehavior || context?.lifeProfile?.incomeRhythm || context?.profile?.incomeRhythm),
      emotionalTriggers: Boolean(context?.emotionalTriggers || context?.memory?.emotionalTriggers || context?.lifeProfile?.spendingTrigger || context?.profile?.spendingTrigger),
      preferences: Boolean(context?.preferences || context?.memory?.preferences || context?.lifeProfile?.coachingStyle || context?.profile?.coachingStyle),
      goals: count(finance.savingsGoals) > 0 || Boolean(context?.lifeProfile?.meaningfulGoal || context?.profile?.meaningfulGoal),
    },
  };
}

function selectFinanceSubContexts(text = "") {
  const selected = [];
  if (hasAny(text, /\b(wallet|balance|cash|available money|money left|gcash|maya|bank)\b/)) selected.push("finance.wallets");
  if (hasAny(text, /\b(budget|category|categories|allocated|remaining|left|over budget)\b/)) selected.push("finance.budgetPlan", "finance.budgetCategories");
  if (hasAny(text, /\b(spent|spending|expense|expenses|transaction|transactions|this month|monthly|eating most|top category)\b/)) selected.push("finance.transactions", "finance.monthlySummary", "finance.spendingCategories");
  if (hasAny(text, /\b(savings?|goal|goals|save)\b/)) selected.push("finance.savingsGoals");
  if (hasAny(text, /\b(emergency fund|emergency|buffer|reserve|protected money)\b/)) selected.push("finance.emergencyFund");
  if (hasAny(text, /\b(debt|loan|utang|owe|obligation|payable)\b/)) selected.push("finance.debts");
  return selected.length ? unique(selected) : ["finance.wallets", "finance.budgetPlan", "finance.monthlySummary"];
}

function selectDecisionSubContexts(text = "") {
  const selected = ["decision.purchaseAmount", "finance.wallets", "finance.budgetPlan", "finance.emergencyFund", "decision.risk"];
  if (hasAny(text, /\b(schedule|appointment|calendar|upcoming|coming up|dentist|doctor|meeting|shift|class|before i spend|before buying|prepare money)\b/)) selected.push("schedule.upcomingItems", "schedule.moneyImpactEvents");
  if (hasAny(text, /\b(goal|savings?|save|target|dream)\b/)) selected.push("finance.savingsGoals");
  if (hasAny(text, /\b(payday|salary|after payday|pattern|usually|trigger|guilty|tempted|impulse)\b/)) selected.push("memory.spendingPatterns", "memory.emotionalTriggers", "memory.paydayBehavior");
  return unique(selected);
}

function selectCoachSubContexts(text = "") {
  const selected = ["coach.emotionalState", "coach.behaviorPattern", "finance.budgetPlan", "finance.wallets"];
  if (hasAny(text, /\b(guilty|tempted|craving|impulse|spend|buy|save|pressure|stress|anxious|regret)\b/)) selected.push("coach.financialPressure", "memory.emotionalTriggers", "memory.spendingPatterns");
  if (hasAny(text, /\b(payday|salary|after payday|usually|pattern|trigger)\b/)) selected.push("memory.paydayBehavior");
  if (hasAny(text, /\b(goal|savings?|protect|priority)\b/)) selected.push("memory.goals", "finance.savingsGoals");
  return unique(selected);
}

function selectMemorySubContexts(text = "") {
  const selected = [];
  if (hasAny(text, /\b(payday|salary|allowance|after payday|after i get paid)\b/)) selected.push("memory.paydayBehavior", "memory.spendingPatterns");
  if (hasAny(text, /\b(usually|always|pattern|noticed|realized|trigger|whenever|lately|recently)\b/)) selected.push("memory.spendingPatterns");
  if (hasAny(text, /\b(guilty|stress|sad|bored|tempted|regret|pressure|emotion|feel|feeling)\b/)) selected.push("memory.emotionalTriggers");
  if (hasAny(text, /\b(i prefer|preference|style|direct|short advice)\b/)) selected.push("memory.preferences");
  if (hasAny(text, /\b(goal|priority|dream|target|saving for|protect)\b/)) selected.push("memory.goals");
  return selected.length ? unique(selected) : ["memory.spendingPatterns"];
}

function selectScheduleSubContexts(text = "") {
  const selected = ["schedule.upcomingItems"];
  if (hasAny(text, /\b(dentist|doctor|medical|payment|cost|money|prepare|budget|financial|impact)\b/)) selected.push("schedule.moneyImpactEvents");
  if (hasAny(text, /\b(reminder|remind|deadline|due date)\b/)) selected.push("schedule.reminders", "schedule.deadlines");
  if (hasAny(text, /\b(shift|class|meeting|appointment|calendar|event)\b/)) selected.push("schedule.appointments");
  return unique(selected);
}

function selectByBrain({ brain, text }) {
  if (brain === CLARA_BRAINS.FINANCE) return selectFinanceSubContexts(text);
  if (brain === CLARA_BRAINS.DECISION) return selectDecisionSubContexts(text);
  if (brain === CLARA_BRAINS.COACH) return selectCoachSubContexts(text);
  if (brain === CLARA_BRAINS.MEMORY) return selectMemorySubContexts(text);
  if (brain === CLARA_BRAINS.SCHEDULE) return selectScheduleSubContexts(text);
  return [];
}

function routeForBrain(brain) {
  return {
    brain,
    brainKey: CLARA_BRAIN_KEYS[brain],
    contexts: [],
  };
}

export function selectClaraSubContexts({ message = "", context = {}, brainRoute = {} } = {}) {
  const text = cleanText(message);
  const finance = buildClaraFinanceSnapshot(context || {});
  const schedule = getScheduleContextForAI(context || {});
  const selectedSubContexts = selectByBrain({ brain: brainRoute.brain, text });
  const loadedData = buildLoadedData({ context, finance, schedule });
  const purchaseAmount = extractPurchaseAmount(message);

  const primaryMissing = selectedSubContexts.filter((subContext) => {
    const [cabinet, key] = subContext.split(".");
    if (cabinet === "decision" || cabinet === "coach") return false;
    return loadedData?.[cabinet]?.[key] === false;
  });

  return {
    brain: brainRoute.brain,
    brainKey: brainRoute.brainKey,
    brainLabel: CLARA_BRAIN_LABELS[brainRoute.brain] || "Unknown Brain",
    topLevelContexts: Array.isArray(brainRoute.contexts) ? brainRoute.contexts : [],
    selectedSubContexts,
    primaryMissing,
    purchaseAmount,
    loadedData,
    debugSummary: {
      finance: {
        availableMoney: finance.availableMoney,
        monthlySpent: finance.monthlySpent,
        topSpendingCategory: getTopSpendingCategory(finance),
        budgetCategoryCount: getBudgetCategoryCount(finance),
        savingsGoalCount: count(finance.savingsGoals),
      },
      schedule: {
        nextItem: schedule.nextItem?.title || "none",
        nextItemDate: schedule.nextItem?.dateLabel || "none",
        nextMoneyItem: schedule.nextMoneyItem?.title || "none",
        nextMoneyAmount: schedule.nextMoneyItem?.amountText || "none",
        upcomingCount: count(schedule.upcomingItems),
      },
    },
  };
}

export function attachClaraSubContextSelection(context = {}, selection = null) {
  if (!selection) return context || {};
  return {
    ...(context || {}),
    claraSubContextSelection: selection,
  };
}

export function getClaraSubContextSelection(context = {}) {
  return context?.claraSubContextSelection || null;
}

export function buildClaraBrainSubContextPromptBlock({ brain, message = "", context = {} } = {}) {
  return buildClaraSubContextPromptBlock(
    attachClaraSubContextSelection(
      context,
      selectClaraSubContexts({
        message,
        context,
        brainRoute: routeForBrain(brain),
      })
    )
  );
}

export function buildClaraSubContextPromptBlock(context = {}) {
  const selection = getClaraSubContextSelection(context);
  if (!selection) {
    return "CLARA SUB-CONTEXT SELECTION:\nNo sub-context selection was attached for this reply.";
  }

  const finance = selection.debugSummary?.finance || {};
  const schedule = selection.debugSummary?.schedule || {};

  return `CLARA SUB-CONTEXT SELECTION:
Selected brain: ${selection.brainLabel}
Top-level contexts: ${selection.topLevelContexts.join(", ") || "none"}
Selected sub-contexts: ${selection.selectedSubContexts.join(", ") || "none"}
Missing selected sub-contexts: ${selection.primaryMissing.join(", ") || "none"}
Purchase amount detected: ${selection.purchaseAmount ? money(selection.purchaseAmount) : "none"}
Loaded data summary:
- Wallets: ${yesNo(selection.loadedData?.finance?.wallets)}; available money: ${money(finance.availableMoney)}
- Budget plan: ${yesNo(selection.loadedData?.finance?.budgetPlan)}; budget category count: ${finance.budgetCategoryCount || 0}
- Transactions/monthly summary: ${yesNo(selection.loadedData?.finance?.transactions)}; monthly spent: ${money(finance.monthlySpent)}; top category: ${finance.topSpendingCategory || "none"}
- Savings goals: ${yesNo(selection.loadedData?.finance?.savingsGoals)}; count: ${finance.savingsGoalCount || 0}
- Schedule upcoming items: ${yesNo(selection.loadedData?.schedule?.upcomingItems)}; next: ${schedule.nextItem || "none"} (${schedule.nextItemDate || "none"})
- Schedule money-impact events: ${yesNo(selection.loadedData?.schedule?.moneyImpactEvents)}; next money event: ${schedule.nextMoneyItem || "none"}; amount: ${schedule.nextMoneyAmount || "none"}
Use the selected sub-contexts first. If a selected sub-context is missing, say what is missing instead of guessing.`;
}

export function logClaraSubContextSelection({ shouldDebug = false, selection = null } = {}) {
  if (!shouldDebug || !selection) return;
  console.log("[CLARA Sub-Context Selector]", {
    brain: selection.brain,
    label: selection.brainLabel,
    topLevelContexts: selection.topLevelContexts,
    selectedSubContexts: selection.selectedSubContexts,
    primaryMissing: selection.primaryMissing,
    loadedData: selection.loadedData,
    debugSummary: selection.debugSummary,
  });
}
