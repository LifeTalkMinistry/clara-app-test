import {
  LOCAL_FINANCE_STORES,
  getLocalRecords,
  upsertLocalRecord,
} from "./localFinanceStore";
import {
  LIFE_STAGE_MEMORY_RECORD_ID,
  readCachedLifeStageIntelligence,
  saveLifeStageIntelligence,
} from "./lifeStageIntelligenceEngine";

export const BEHAVIORAL_OBSERVATION_KEY = "clara_behavioral_observation_v1";
export const BEHAVIORAL_OBSERVATION_MEMORY_ID = "clara_behavioral_observation_current";

const LOCAL_USER_KEY = "clara_local_user_id";
const FALLBACK_LOCAL_USER_ID = "local-user";
const DAY_MS = 86400000;
const LOOKBACK_DAYS = 45;
const RECENT_DAYS = 30;
const PREVIOUS_DAYS = 30;
const MIN_CONFIDENCE = 0.32;

function nowIso() {
  return new Date().toISOString();
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanText(value, max = 240) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function safeDate(value) {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function isoDate(value) {
  return safeDate(value).toISOString();
}

function dayKey(value) {
  return isoDate(value).slice(0, 10);
}

function monthKey(value) {
  return isoDate(value).slice(0, 7);
}

function daysAgo(dateValue) {
  return Math.floor((Date.now() - safeDate(dateValue).getTime()) / DAY_MS);
}

function unique(list) {
  return [...new Set((list || []).filter(Boolean))];
}

function resolveLocalUserId(localUserIdInput) {
  if (localUserIdInput) return String(localUserIdInput).trim() || FALLBACK_LOCAL_USER_ID;
  if (typeof window === "undefined") return FALLBACK_LOCAL_USER_ID;
  return String(window.localStorage.getItem(LOCAL_USER_KEY) || FALLBACK_LOCAL_USER_ID).trim() || FALLBACK_LOCAL_USER_ID;
}

function readJsonStorage(key, fallback = null) {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) || "");
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function recordDate(record = {}) {
  return record.date || record.spentAt || record.createdAt || record.created_at || record.updatedAt || record.updated_at || new Date().toISOString();
}

function normalizeExpense(expense = {}) {
  const date = recordDate(expense);
  return {
    id: expense.id,
    amount: Math.abs(toNumber(expense.amount || expense.total || expense.value)),
    category: cleanText(expense.category || expense.categoryName || expense.type || "other", 80).toLowerCase() || "other",
    item: cleanText(expense.item || expense.label || expense.name || expense.description || "expense", 120),
    walletId: expense.walletId || expense.wallet_id || expense.wallet || null,
    date: isoDate(date),
    day: dayKey(date),
    month: monthKey(date),
    hour: safeDate(date).getHours(),
    planningStatus: cleanText(expense.planning_status || expense.planningStatus || expense.status || "planned", 60).toLowerCase(),
    unplannedReason: cleanText(expense.unplanned_reason || expense.unplannedReason || expense.reason || "", 200),
  };
}

function normalizeWallet(wallet = {}) {
  return {
    id: wallet.id,
    name: cleanText(wallet.name || wallet.label || "Wallet", 80),
    balance: toNumber(wallet.balance || wallet.currentBalance || wallet.current_balance || wallet.amount),
    updatedAt: isoDate(wallet.updatedAt || wallet.updated_at || wallet.createdAt || wallet.created_at || Date.now()),
  };
}

function normalizeMovement(record = {}) {
  const date = recordDate(record);
  return {
    id: record.id,
    amount: Math.abs(toNumber(record.amount || record.total || record.value)),
    type: cleanText(record.type || record.kind || "movement", 60).toLowerCase(),
    fromWalletId: record.fromWalletId || record.from_wallet_id || record.fromWallet || record.from_wallet || null,
    toWalletId: record.toWalletId || record.to_wallet_id || record.toWallet || record.to_wallet || null,
    walletId: record.walletId || record.wallet_id || record.wallet || null,
    date: isoDate(date),
    day: dayKey(date),
  };
}

function normalizeBudget(budget = {}) {
  const limit = toNumber(budget.limit || budget.amount || budget.budgetAmount || budget.budget_amount || budget.allocated || budget.target);
  const spent = toNumber(budget.spent || budget.used || budget.currentSpend || budget.current_spend || budget.consumed);
  return {
    id: budget.id,
    category: cleanText(budget.category || budget.name || budget.label || "budget", 80).toLowerCase(),
    limit,
    spent,
    remaining: limit ? limit - spent : toNumber(budget.remaining),
    period: cleanText(budget.period || budget.month || monthKey(Date.now()), 20),
    updatedAt: isoDate(budget.updatedAt || budget.updated_at || budget.createdAt || budget.created_at || Date.now()),
  };
}

function normalizeSavingsGoal(goal = {}) {
  const target = toNumber(goal.targetAmount || goal.target_amount || goal.target || goal.goalAmount || goal.goal_amount);
  const saved = toNumber(goal.savedAmount || goal.saved_amount || goal.currentAmount || goal.current_amount || goal.balance || goal.saved);
  return {
    id: goal.id,
    name: cleanText(goal.name || goal.title || goal.label || "Savings goal", 90),
    target,
    saved,
    progress: target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0,
    updatedAt: isoDate(goal.updatedAt || goal.updated_at || goal.createdAt || goal.created_at || Date.now()),
  };
}

function normalizeEmergencyFund(record = {}) {
  const target = toNumber(record.targetAmount || record.target_amount || record.target || record.goalAmount || record.goal_amount);
  const saved = toNumber(record.savedAmount || record.saved_amount || record.currentAmount || record.current_amount || record.balance || record.saved);
  return {
    id: record.id || "emergency_fund",
    target,
    saved,
    progress: target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0,
    updatedAt: isoDate(record.updatedAt || record.updated_at || record.createdAt || record.created_at || Date.now()),
  };
}

function groupBy(list, keyFn) {
  return (list || []).reduce((acc, item) => {
    const key = keyFn(item);
    if (!key) return acc;
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function sum(list, field = "amount") {
  return (list || []).reduce((total, item) => total + toNumber(item[field]), 0);
}

function average(list, field = "amount") {
  if (!list?.length) return 0;
  return sum(list, field) / list.length;
}

function topCategory(expenses) {
  const grouped = groupBy(expenses, (item) => item.category || "other");
  return Object.entries(grouped)
    .map(([category, items]) => ({ category, total: sum(items), count: items.length }))
    .sort((a, b) => b.total - a.total)[0] || null;
}

function trendDelta(current, previous) {
  if (!previous && current) return 100;
  if (!previous) return 0;
  return Math.round(((current - previous) / Math.max(1, previous)) * 100);
}

function createObservation({ type, title, summary, severity = "watch", confidence = MIN_CONFIDENCE, evidence = [], signal = "", action = "" }) {
  return {
    id: `${type}_${cleanText(title, 50).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    type,
    title,
    summary,
    severity,
    confidence: Math.max(0, Math.min(1, Number(confidence || MIN_CONFIDENCE))),
    evidence: evidence.slice(0, 6),
    signal,
    action,
    createdAt: nowIso(),
  };
}

function analyzeExpenses(expenses = []) {
  const recent = expenses.filter((expense) => daysAgo(expense.date) <= RECENT_DAYS);
  const previous = expenses.filter((expense) => daysAgo(expense.date) > RECENT_DAYS && daysAgo(expense.date) <= RECENT_DAYS + PREVIOUS_DAYS);
  const observations = [];

  const recentTotal = sum(recent);
  const previousTotal = sum(previous);
  const byDay = groupBy(recent, (expense) => expense.day);
  const activeDays = Object.keys(byDay).length;
  const dailyAverage = activeDays ? recentTotal / activeDays : 0;
  const smallFrequent = recent.filter((expense) => expense.amount > 0 && expense.amount <= Math.max(150, dailyAverage * 0.55));
  const unplanned = recent.filter((expense) => /unplanned|undocumented|impulse/i.test(expense.planningStatus + " " + expense.unplannedReason));
  const lateNight = recent.filter((expense) => expense.hour >= 22 || expense.hour <= 4);
  const convenience = recent.filter((expense) => /food|coffee|delivery|transport|shopping|entertainment|personal/i.test(`${expense.category} ${expense.item}`));
  const top = topCategory(recent);

  const burstDays = Object.entries(byDay)
    .map(([day, items]) => ({ day, count: items.length, total: sum(items), items }))
    .filter((day) => day.count >= 4 || day.total >= Math.max(500, dailyAverage * 1.8));

  if (smallFrequent.length >= Math.max(8, activeDays * 0.45)) {
    observations.push(createObservation({
      type: "impulse_pattern",
      title: "Small-but-frequent spending",
      summary: "CLARA noticed repeated smaller expenses. This may be harmless individually, but the pattern can quietly reduce weekly control.",
      severity: "moderate",
      confidence: Math.min(0.86, 0.42 + smallFrequent.length / 45),
      evidence: [`${smallFrequent.length} small expenses in the last ${RECENT_DAYS} days`, top ? `Top category: ${top.category}` : ""],
      signal: "frequent low-value expense pattern",
      action: "Set a tiny weekly cap for the category that repeats most often.",
    }));
  }

  if (burstDays.length >= 2) {
    observations.push(createObservation({
      type: "impulse_pattern",
      title: "Spending burst detected",
      summary: "CLARA noticed spending clustering on certain days. This may indicate impulse windows, stressful days, payday effects, or convenience pressure.",
      severity: burstDays.length >= 4 ? "high" : "moderate",
      confidence: Math.min(0.88, 0.5 + burstDays.length / 12),
      evidence: burstDays.slice(0, 3).map((day) => `${day.day}: ${day.count} expenses / ₱${Math.round(day.total)}`),
      signal: "checkout clustering",
      action: "Add a pause rule before the second flexible purchase on the same day.",
    }));
  }

  if (lateNight.length >= 3) {
    observations.push(createObservation({
      type: "emotional_spending_signal",
      title: "Late-night spending signal",
      summary: "CLARA noticed expenses logged late at night or very early. This may be connected to fatigue, cravings, stress relief, or convenience decisions.",
      severity: lateNight.length >= 6 ? "high" : "watch",
      confidence: Math.min(0.82, 0.45 + lateNight.length / 18),
      evidence: [`${lateNight.length} late-night expenses in recent history`],
      signal: "late-night convenience or relief spending",
      action: "Create a planned night-time limit instead of relying on willpower when tired.",
    }));
  }

  if (unplanned.length >= Math.max(3, recent.length * 0.28)) {
    observations.push(createObservation({
      type: "discipline_shift",
      title: "Unplanned spending rising",
      summary: "CLARA noticed a meaningful share of recent spending marked as unplanned or impulse-related. This may show pressure leaking into flexible spending.",
      severity: unplanned.length >= recent.length * 0.45 ? "high" : "moderate",
      confidence: Math.min(0.9, 0.48 + unplanned.length / Math.max(12, recent.length || 1)),
      evidence: [`${unplanned.length}/${recent.length || 0} recent expenses look unplanned`],
      signal: "unplanned expense ratio",
      action: "Protect the next essential category first, then set a small flexible-spending boundary.",
    }));
  }

  if (convenience.length >= Math.max(6, recent.length * 0.34)) {
    observations.push(createObservation({
      type: "stress_indicator",
      title: "Convenience spending pressure",
      summary: "CLARA noticed repeated convenience-type spending. This may be influenced by low time, low energy, commute pressure, or recovery needs.",
      severity: "watch",
      confidence: Math.min(0.78, 0.4 + convenience.length / 35),
      evidence: [`${convenience.length} convenience-like expenses detected`],
      signal: "time and energy spending pressure",
      action: "Plan one low-effort fallback option before the week gets busy.",
    }));
  }

  const delta = trendDelta(recentTotal, previousTotal);
  if (previous.length >= 3 && delta <= -20) {
    observations.push(createObservation({
      type: "recovery_progress",
      title: "Spending recovery improving",
      summary: "CLARA noticed recent spending is lower than the previous period. This may indicate better control, fewer impulse windows, or a calmer routine.",
      severity: "positive",
      confidence: Math.min(0.82, 0.5 + Math.abs(delta) / 100),
      evidence: [`Recent spending changed by ${delta}% versus previous period`],
      signal: "spending reduction trend",
      action: "Keep the current boundary that helped reduce spending.",
    }));
  }

  return {
    observations,
    stats: {
      recentExpenseCount: recent.length,
      recentTotal,
      previousTotal,
      spendDeltaPercent: delta,
      activeDays,
      dailyAverage: Math.round(dailyAverage),
      unplannedRatio: recent.length ? unplanned.length / recent.length : 0,
      lateNightCount: lateNight.length,
      burstDayCount: burstDays.length,
      topCategory: top,
    },
  };
}

function analyzeWallets(wallets = [], movements = [], expenses = []) {
  const observations = [];
  const totalBalance = sum(wallets, "balance");
  const recentExpenseTotal = sum(expenses.filter((expense) => daysAgo(expense.date) <= 14));
  const transferGroups = groupBy(movements.filter((item) => daysAgo(item.date) <= 30), (item) => `${item.day}_${Math.round(item.amount)}`);
  const reversalLike = Object.values(transferGroups).filter((items) => items.length >= 2);

  if (wallets.length && totalBalance > 0 && recentExpenseTotal > totalBalance * 0.85) {
    observations.push(createObservation({
      type: "survival_indicator",
      title: "Low balance pressure",
      summary: "CLARA noticed recent spending is close to the visible wallet balance. This may create survival pressure before the next income cycle.",
      severity: "high",
      confidence: 0.62,
      evidence: [`Wallet balance: ₱${Math.round(totalBalance)}`, `Recent 14-day expenses: ₱${Math.round(recentExpenseTotal)}`],
      signal: "wallet pressure against recent spending",
      action: "Protect essentials first and delay flexible purchases until the next money-in event.",
    }));
  }

  if (reversalLike.length >= 2) {
    observations.push(createObservation({
      type: "routine_instability",
      title: "Transfer adjustment pattern",
      summary: "CLARA noticed repeated same-day or same-amount wallet movements. This may mean the user is correcting allocation mistakes or reacting to pressure mid-cycle.",
      severity: "watch",
      confidence: Math.min(0.74, 0.42 + reversalLike.length / 10),
      evidence: [`${reversalLike.length} transfer clusters detected`],
      signal: "wallet movement corrections",
      action: "Review wallet allocation once before spending starts, not after pressure appears.",
    }));
  }

  return { observations, stats: { totalBalance, reversalClusterCount: reversalLike.length } };
}

function analyzeBudgets(budgets = [], expenses = []) {
  const observations = [];
  const activeBudgets = budgets.filter((budget) => budget.limit > 0);
  const overBudget = activeBudgets.filter((budget) => budget.spent > budget.limit || budget.remaining < 0);
  const noBudgetButSpending = !activeBudgets.length && expenses.filter((expense) => daysAgo(expense.date) <= 30).length >= 5;

  if (overBudget.length) {
    observations.push(createObservation({
      type: "budget_instability",
      title: "Budget pressure detected",
      summary: "CLARA noticed at least one budget appears overused. This may show the budget is too tight, the category is under-protected, or the routine changed.",
      severity: overBudget.length >= 2 ? "high" : "moderate",
      confidence: Math.min(0.82, 0.55 + overBudget.length / 8),
      evidence: overBudget.slice(0, 3).map((budget) => `${budget.category}: ₱${Math.round(budget.spent)} / ₱${Math.round(budget.limit)}`),
      signal: "budget overuse",
      action: "Adjust the most pressured budget before judging the spending behavior.",
    }));
  }

  if (noBudgetButSpending) {
    observations.push(createObservation({
      type: "avoidance_indicator",
      title: "Spending without budget structure",
      summary: "CLARA sees spending activity but no active budget structure yet. This may make pressure harder to notice until it becomes urgent.",
      severity: "watch",
      confidence: 0.58,
      evidence: [`${expenses.filter((expense) => daysAgo(expense.date) <= 30).length} recent expenses with no detected active budget`],
      signal: "budget setup avoidance or incompleteness",
      action: "Start with only one budget: the category that repeats most often.",
    }));
  }

  return { observations, stats: { activeBudgetCount: activeBudgets.length, overBudgetCount: overBudget.length } };
}

function analyzeSavings(savingsGoals = [], emergencyFunds = []) {
  const observations = [];
  const activeGoals = savingsGoals.filter((goal) => goal.target > 0);
  const progressingGoals = activeGoals.filter((goal) => goal.progress > 0);
  const emergency = emergencyFunds[0] || null;

  if (activeGoals.length && progressingGoals.length >= Math.max(1, Math.ceil(activeGoals.length * 0.5))) {
    observations.push(createObservation({
      type: "discipline_indicator",
      title: "Savings structure is forming",
      summary: "CLARA noticed savings goals with progress. This is a positive discipline signal because money is being given a future purpose.",
      severity: "positive",
      confidence: Math.min(0.84, 0.5 + progressingGoals.length / 8),
      evidence: progressingGoals.slice(0, 3).map((goal) => `${goal.name}: ${goal.progress}%`),
      signal: "savings consistency foundation",
      action: "Keep savings small and repeatable instead of depending on perfect months.",
    }));
  }

  if (emergency?.target > 0 && emergency.progress < 20) {
    observations.push(createObservation({
      type: "survival_indicator",
      title: "Emergency buffer still fragile",
      summary: "CLARA noticed the emergency fund is still low compared with the target. This can make sudden costs feel bigger than they really are.",
      severity: "moderate",
      confidence: 0.64,
      evidence: [`Emergency fund progress: ${emergency.progress}%`],
      signal: "low emergency buffer",
      action: "Add even a tiny fixed amount before flexible spending when money comes in.",
    }));
  }

  return { observations, stats: { activeGoalCount: activeGoals.length, progressingGoalCount: progressingGoals.length, emergencyProgress: emergency?.progress ?? null } };
}

function buildBehavioralMetrics({ expenseStats, walletStats, budgetStats, savingsStats, observations }) {
  const riskCount = observations.filter((item) => item.severity === "high" || item.severity === "moderate").length;
  const positiveCount = observations.filter((item) => item.severity === "positive").length;
  const impulseCount = observations.filter((item) => /impulse|emotional|stress/i.test(item.type)).length;
  const survivalCount = observations.filter((item) => /survival|budget|avoidance/i.test(item.type)).length;

  const consistencyScore = clamp(68 - expenseStats.burstDayCount * 6 - expenseStats.unplannedRatio * 28 + positiveCount * 7 - riskCount * 2);
  const stabilityScore = clamp(70 - survivalCount * 10 - (walletStats.totalBalance ? 0 : 4) - budgetStats.overBudgetCount * 8 + savingsStats.progressingGoalCount * 6);
  const disciplineScore = clamp(58 + savingsStats.progressingGoalCount * 9 + budgetStats.activeBudgetCount * 5 - expenseStats.unplannedRatio * 26 - impulseCount * 6);
  const emotionalSpendingProbability = clamp(28 + impulseCount * 15 + expenseStats.lateNightCount * 3 + expenseStats.unplannedRatio * 40);
  const financialStressIndex = clamp(35 + survivalCount * 16 + budgetStats.overBudgetCount * 12 + (expenseStats.spendDeltaPercent > 35 ? 10 : 0));
  const recoveryProgress = clamp(positiveCount * 22 + (expenseStats.spendDeltaPercent < -20 ? 30 : 0) + savingsStats.progressingGoalCount * 8);
  const survivalCycleRisk = clamp(30 + survivalCount * 14 + (walletStats.totalBalance && expenseStats.recentTotal > walletStats.totalBalance ? 20 : 0));

  return {
    consistencyScore,
    stabilityScore,
    disciplineScore,
    emotionalSpendingProbability,
    financialStressIndex,
    recoveryProgress,
    survivalCycleRisk,
    observedBehaviorConfidence: clamp(30 + Math.min(45, expenseStats.recentExpenseCount * 3) + observations.length * 4),
  };
}

function buildBehavioralSummary(observations, metrics) {
  const topObservation = observations[0];
  if (!topObservation) {
    return "CLARA is beginning to observe behavior patterns. The snapshot will become more accurate as expenses, wallets, budgets, and savings activity build over time.";
  }

  if (topObservation.severity === "positive") {
    return `CLARA noticed a positive shift: ${topObservation.title.toLowerCase()}. This suggests the user's financial rhythm may be improving, even if pressure still exists.`;
  }

  return `CLARA noticed ${topObservation.title.toLowerCase()}. This may indicate a pressure pattern, especially when combined with a ${metrics.financialStressIndex}% financial stress index and ${metrics.emotionalSpendingProbability}% emotional spending probability.`;
}

function buildRiskTrajectory(observations, metrics, previous) {
  const previousStress = previous?.metrics?.financialStressIndex ?? null;
  const currentStress = metrics.financialStressIndex;
  const direction = previousStress === null ? "learning" : currentStress > previousStress + 6 ? "rising" : currentStress < previousStress - 6 ? "improving" : "steady";

  return {
    direction,
    previousStress,
    currentStress,
    note:
      direction === "rising"
        ? "Pressure signals increased compared with the last observation."
        : direction === "improving"
          ? "Pressure signals softened compared with the last observation."
          : direction === "steady"
            ? "Pressure signals are relatively steady."
            : "CLARA is still building the first behavior baseline.",
  };
}

function buildSnapshotPatch(observationSnapshot, intelligence) {
  const snapshot = intelligence?.snapshot || {};
  const localMetrics = snapshot.metrics || {};
  const behavior = observationSnapshot.metrics;
  const financialPressureBoost = behavior.financialStressIndex >= 75 ? 6 : behavior.financialStressIndex >= 55 ? 3 : 0;
  const emotionalBoost = behavior.emotionalSpendingProbability >= 70 ? 7 : behavior.emotionalSpendingProbability >= 50 ? 3 : 0;
  const routinePenalty = behavior.consistencyScore < 45 ? 6 : behavior.consistencyScore < 60 ? 3 : 0;

  const nextMetrics = {
    ...localMetrics,
    financialPressure: clamp((localMetrics.financialPressure || 0) + financialPressureBoost),
    emotionalSpendingRisk: clamp((localMetrics.emotionalSpendingRisk || 0) + emotionalBoost),
    routineStability: clamp((localMetrics.routineStability || 0) - routinePenalty),
    burnoutRisk: clamp((localMetrics.burnoutRisk || 0) + (behavior.financialStressIndex >= 75 ? 4 : 0)),
  };

  const indicators = (snapshot.indicators || []).map((indicator) => {
    const mapping = {
      "Financial Pressure": "financialPressure",
      "Burnout Risk": "burnoutRisk",
      "Routine Stability": "routineStability",
      "Emotional Spending": "emotionalSpendingRisk",
      "Future Potential": "futurePotential",
    };
    const key = mapping[indicator.label];
    return key ? { ...indicator, value: clamp(nextMetrics[key]) } : indicator;
  });

  return {
    ...snapshot,
    metrics: nextMetrics,
    indicators,
    behavioralObservation: {
      summary: observationSnapshot.summary,
      metrics: observationSnapshot.metrics,
      observations: observationSnapshot.observations,
      riskTrajectory: observationSnapshot.riskTrajectory,
      confidenceLayers: observationSnapshot.confidenceLayers,
      updatedAt: observationSnapshot.updatedAt,
    },
    observedHabits: observationSnapshot.observations.slice(0, 4),
    adaptiveWarnings: observationSnapshot.observations.filter((item) => item.severity !== "positive").slice(0, 3),
    recoveryMilestones: observationSnapshot.observations.filter((item) => item.severity === "positive").slice(0, 3),
    behaviorUpdatedAt: observationSnapshot.updatedAt,
    statusBadge:
      observationSnapshot.riskTrajectory.direction === "rising"
        ? "Pressure Signals Rising"
        : observationSnapshot.riskTrajectory.direction === "improving"
          ? "Recovery Improving"
          : snapshot.statusBadge || "Behavior Learning",
    updatedAt: observationSnapshot.updatedAt,
  };
}

async function readFinanceContext(localUserId) {
  const safeLocalUserId = resolveLocalUserId(localUserId);
  const safeRead = async (storeName) => {
    try {
      return await getLocalRecords(storeName, safeLocalUserId);
    } catch (error) {
      console.warn(`CLARA behavioral observation skipped ${storeName}:`, error);
      return [];
    }
  };

  const [expenses, wallets, walletTransactions, transfers, budgets, savingsGoals, emergencyFund] = await Promise.all([
    safeRead(LOCAL_FINANCE_STORES.expenses),
    safeRead(LOCAL_FINANCE_STORES.wallets),
    safeRead(LOCAL_FINANCE_STORES.walletTransactions),
    safeRead(LOCAL_FINANCE_STORES.transfers),
    safeRead(LOCAL_FINANCE_STORES.budgets),
    safeRead(LOCAL_FINANCE_STORES.savingsGoals),
    safeRead(LOCAL_FINANCE_STORES.emergencyFund),
  ]);

  return {
    localUserId: safeLocalUserId,
    expenses: expenses.map(normalizeExpense).filter((item) => item.amount > 0 && daysAgo(item.date) <= LOOKBACK_DAYS + PREVIOUS_DAYS),
    wallets: wallets.map(normalizeWallet),
    movements: [...walletTransactions.map(normalizeMovement), ...transfers.map(normalizeMovement)],
    budgets: budgets.map(normalizeBudget),
    savingsGoals: savingsGoals.map(normalizeSavingsGoal),
    emergencyFund: emergencyFund.map(normalizeEmergencyFund),
  };
}

export async function buildBehavioralObservationSnapshot(options = {}) {
  const context = await readFinanceContext(options.localUserId);
  const previous = readJsonStorage(BEHAVIORAL_OBSERVATION_KEY, null);

  const expenseAnalysis = analyzeExpenses(context.expenses);
  const walletAnalysis = analyzeWallets(context.wallets, context.movements, context.expenses);
  const budgetAnalysis = analyzeBudgets(context.budgets, context.expenses);
  const savingsAnalysis = analyzeSavings(context.savingsGoals, context.emergencyFund);

  const observations = [
    ...expenseAnalysis.observations,
    ...walletAnalysis.observations,
    ...budgetAnalysis.observations,
    ...savingsAnalysis.observations,
  ]
    .sort((a, b) => {
      const severityWeight = { high: 4, moderate: 3, watch: 2, positive: 1 };
      return (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0) || b.confidence - a.confidence;
    })
    .slice(0, 10);

  const metrics = buildBehavioralMetrics({
    expenseStats: expenseAnalysis.stats,
    walletStats: walletAnalysis.stats,
    budgetStats: budgetAnalysis.stats,
    savingsStats: savingsAnalysis.stats,
    observations,
  });

  const snapshot = {
    id: "clara_behavioral_observation_current",
    version: 1,
    localUserId: context.localUserId,
    summary: buildBehavioralSummary(observations, metrics),
    observations,
    metrics,
    stats: {
      expenses: expenseAnalysis.stats,
      wallets: walletAnalysis.stats,
      budgets: budgetAnalysis.stats,
      savings: savingsAnalysis.stats,
    },
    riskTrajectory: buildRiskTrajectory(observations, metrics, previous),
    confidenceLayers: {
      userDeclared: readCachedLifeStageIntelligence()?.snapshot?.confidenceScore || null,
      observedBehavior: metrics.observedBehaviorConfidence / 100,
      geminiWorld: readCachedLifeStageIntelligence()?.worldEnrichment ? 0.68 : 0.35,
      historicalConsistency: previous?.metrics ? Math.max(0.35, Math.min(0.9, 1 - Math.abs(metrics.financialStressIndex - previous.metrics.financialStressIndex) / 100)) : 0.35,
    },
    updatedAt: nowIso(),
  };

  return snapshot;
}

export async function saveBehavioralObservationSnapshot(observationSnapshot, options = {}) {
  if (!observationSnapshot) return null;
  const localUserId = resolveLocalUserId(options.localUserId || observationSnapshot.localUserId);
  const previous = readJsonStorage(BEHAVIORAL_OBSERVATION_KEY, null);
  const history = [
    {
      id: `behavior_history_${Date.now()}`,
      summary: observationSnapshot.summary,
      metrics: observationSnapshot.metrics,
      riskTrajectory: observationSnapshot.riskTrajectory,
      observationCount: observationSnapshot.observations?.length || 0,
      createdAt: observationSnapshot.updatedAt || nowIso(),
    },
    ...(previous?.history || []),
  ].slice(0, 24);

  const stored = { ...observationSnapshot, history };
  writeJsonStorage(BEHAVIORAL_OBSERVATION_KEY, stored);

  try {
    await upsertLocalRecord(
      LOCAL_FINANCE_STORES.aiFinancialMemory,
      {
        id: BEHAVIORAL_OBSERVATION_MEMORY_ID,
        memoryType: "behavioral_observation",
        summary: stored.summary,
        observations: stored.observations,
        metrics: stored.metrics,
        riskTrajectory: stored.riskTrajectory,
        confidenceLayers: stored.confidenceLayers,
        history: stored.history,
        updatedAt: stored.updatedAt,
      },
      localUserId
    );

    const activeLifeMemory = readCachedLifeStageIntelligence();
    await upsertLocalRecord(
      LOCAL_FINANCE_STORES.aiFinancialMemory,
      {
        id: `${LIFE_STAGE_MEMORY_RECORD_ID}_behavioral_overlay`,
        memoryType: "life_stage_behavioral_overlay",
        stage: activeLifeMemory?.stage || null,
        summary: stored.summary,
        observations: stored.observations,
        metrics: stored.metrics,
        updatedAt: stored.updatedAt,
      },
      localUserId
    );
  } catch (error) {
    console.warn("CLARA behavioral observation IndexedDB save skipped:", error);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("clara:behavior-pattern-updated", { detail: stored }));
  }

  return stored;
}

export async function updateLifeSnapshotWithBehavior(observationSnapshot, options = {}) {
  const intelligence = readCachedLifeStageIntelligence();
  if (!intelligence?.snapshot || !observationSnapshot) return null;

  const updated = {
    ...intelligence,
    version: Math.max(3, Number(intelligence.version || 1)),
    behaviorProfile: {
      ...(intelligence.behaviorProfile || {}),
      observedBehaviorUpdatedAt: observationSnapshot.updatedAt,
      observedBehaviorConfidence: observationSnapshot.confidenceLayers?.observedBehavior || null,
      interpretedTags: unique([
        ...(intelligence.behaviorProfile?.interpretedTags || []),
        "behavior_observation_active",
        ...observationSnapshot.observations.slice(0, 4).map((item) => `observed:${item.type}`),
      ]),
    },
    snapshot: buildSnapshotPatch(observationSnapshot, intelligence),
    behavioralObservation: observationSnapshot,
    nextRefreshReason: "behavioral_observation_overlay_active",
  };

  await saveLifeStageIntelligence(updated, {
    reason: options.reason || "life_stage_behavioral_observation_updated",
    localUserId: options.localUserId || observationSnapshot.localUserId,
  });

  return updated;
}

export async function runBehavioralObservationAnalysis(options = {}) {
  const observationSnapshot = await buildBehavioralObservationSnapshot(options);
  const stored = await saveBehavioralObservationSnapshot(observationSnapshot, options);
  const updatedLifeSnapshot = await updateLifeSnapshotWithBehavior(stored, options);
  return { observationSnapshot: stored, updatedLifeSnapshot };
}

export function readCachedBehavioralObservation() {
  return readJsonStorage(BEHAVIORAL_OBSERVATION_KEY, null);
}
