import {
  LOCAL_FINANCE_STORES,
  getLocalRecords,
  upsertLocalRecord,
} from "./localFinanceStore";
import {
  readCachedLifeStageIntelligence,
  saveLifeStageIntelligence,
} from "./lifeStageIntelligenceEngine";
import { readCachedBehavioralObservation } from "./behavioralObservationEngine";

export const PREDICTIVE_DECISION_KEY = "clara_predictive_decision_intelligence_v1";
export const PREDICTIVE_DECISION_MEMORY_ID = "clara_predictive_decision_current";

const LOCAL_USER_KEY = "clara_local_user_id";
const FALLBACK_LOCAL_USER_ID = "local-user";
const DAY_MS = 86400000;
const LOOKBACK_DAYS = 45;
const MAX_PREDICTIONS = 8;

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

function daysAgo(dateValue) {
  return Math.floor((Date.now() - safeDate(dateValue).getTime()) / DAY_MS);
}

function dayKey(value) {
  return isoDate(value).slice(0, 10);
}

function unique(list) {
  return [...new Set((list || []).filter(Boolean))];
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

function resolveLocalUserId(localUserIdInput) {
  if (localUserIdInput) return String(localUserIdInput).trim() || FALLBACK_LOCAL_USER_ID;
  if (typeof window === "undefined") return FALLBACK_LOCAL_USER_ID;
  return String(window.localStorage.getItem(LOCAL_USER_KEY) || FALLBACK_LOCAL_USER_ID).trim() || FALLBACK_LOCAL_USER_ID;
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
    date: isoDate(date),
    day: dayKey(date),
    hour: safeDate(date).getHours(),
    planningStatus: cleanText(expense.planning_status || expense.planningStatus || expense.status || "planned", 60).toLowerCase(),
    reason: cleanText(expense.unplanned_reason || expense.unplannedReason || expense.reason || "", 200),
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

function normalizeBudget(budget = {}) {
  const limit = toNumber(budget.limit || budget.amount || budget.budgetAmount || budget.budget_amount || budget.allocated || budget.target);
  const spent = toNumber(budget.spent || budget.used || budget.currentSpend || budget.current_spend || budget.consumed);
  return {
    id: budget.id,
    category: cleanText(budget.category || budget.name || budget.label || "budget", 80).toLowerCase(),
    limit,
    spent,
    remaining: limit ? limit - spent : toNumber(budget.remaining),
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

function trendDelta(current, previous) {
  if (!previous && current) return 100;
  if (!previous) return 0;
  return Math.round(((current - previous) / Math.max(1, previous)) * 100);
}

function createPrediction({ type, title, forecast, probability = 50, confidence = 0.45, severity = "watch", timeframe = "next 7 days", basis = [], action = "", decisionGuidance = "" }) {
  const safeProbability = clamp(probability);
  const safeConfidence = Math.max(0, Math.min(1, Number(confidence || 0.45)));
  return {
    id: `${type}_${cleanText(title, 60).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    type,
    title,
    forecast,
    probability: safeProbability,
    confidence: Number(safeConfidence.toFixed(2)),
    confidenceLabel: safeConfidence >= 0.74 ? "Strong" : safeConfidence >= 0.55 ? "Good" : "Learning",
    severity,
    timeframe,
    basis: basis.filter(Boolean).slice(0, 6),
    action,
    decisionGuidance,
    languageGuard: "Prediction is an estimate based on observed CLARA data, not certainty.",
    createdAt: nowIso(),
  };
}

function estimateIncomeCycle(intelligence = {}) {
  const rhythm = cleanText(intelligence.answers?.rhythm || intelligence.rawProfile?.rhythm || "", 120).toLowerCase();
  const today = new Date();
  const day = today.getDate();
  let nextPaydayDay = null;
  let label = "unknown cycle";

  if (/twice|cutoff|15|30/.test(rhythm)) {
    nextPaydayDay = day <= 15 ? 15 : 30;
    label = "twice-a-month cutoff";
  } else if (/monthly|salary|stable/.test(rhythm)) {
    nextPaydayDay = 30;
    label = "monthly salary cycle";
  } else if (/weekly/.test(rhythm)) {
    return { label: "weekly rhythm", daysUntilExpectedIncome: 7 - today.getDay(), confidence: 0.45 };
  }

  if (!nextPaydayDay) return { label, daysUntilExpectedIncome: null, confidence: 0.18 };
  const daysUntil = nextPaydayDay >= day ? nextPaydayDay - day : Math.max(1, 30 - day + nextPaydayDay);
  return { label, daysUntilExpectedIncome: daysUntil, confidence: rhythm ? 0.52 : 0.25 };
}

function buildContextStats({ expenses, wallets, budgets, savingsGoals, emergencyFund }) {
  const recent7 = expenses.filter((expense) => daysAgo(expense.date) <= 7);
  const previous7 = expenses.filter((expense) => daysAgo(expense.date) > 7 && daysAgo(expense.date) <= 14);
  const recent30 = expenses.filter((expense) => daysAgo(expense.date) <= 30);
  const previous30 = expenses.filter((expense) => daysAgo(expense.date) > 30 && daysAgo(expense.date) <= 60);
  const recentUnplanned = recent30.filter((expense) => /unplanned|undocumented|impulse/i.test(`${expense.planningStatus} ${expense.reason}`));
  const lateNight = recent30.filter((expense) => expense.hour >= 22 || expense.hour <= 4);
  const convenience = recent30.filter((expense) => /food|coffee|delivery|transport|shopping|entertainment|personal/i.test(`${expense.category} ${expense.item}`));
  const byDay = groupBy(recent30, (expense) => expense.day);
  const burstDays = Object.entries(byDay).filter(([, items]) => items.length >= 4 || sum(items) >= Math.max(500, average(recent30) * 3));
  const totalBalance = sum(wallets, "balance");
  const activeBudgets = budgets.filter((budget) => budget.limit > 0);
  const overBudget = activeBudgets.filter((budget) => budget.spent > budget.limit || budget.remaining < 0);
  const savingsProgress = savingsGoals.filter((goal) => goal.target > 0 && goal.progress > 0);
  const emergency = emergencyFund[0] || null;

  return {
    recent7Total: sum(recent7),
    previous7Total: sum(previous7),
    recent30Total: sum(recent30),
    previous30Total: sum(previous30),
    recentExpenseCount: recent30.length,
    unplannedRatio: recent30.length ? recentUnplanned.length / recent30.length : 0,
    unplannedCount: recentUnplanned.length,
    lateNightCount: lateNight.length,
    convenienceCount: convenience.length,
    burstDayCount: burstDays.length,
    totalBalance,
    activeBudgetCount: activeBudgets.length,
    overBudgetCount: overBudget.length,
    savingsProgressCount: savingsProgress.length,
    emergencyProgress: emergency?.progress ?? null,
    spendDelta7: trendDelta(sum(recent7), sum(previous7)),
    spendDelta30: trendDelta(sum(recent30), sum(previous30)),
    activeDays: Object.keys(byDay).length,
  };
}

function paydayExhaustionPrediction({ stats, intelligence }) {
  const cycle = estimateIncomeCycle(intelligence);
  const pressure = intelligence.snapshot?.metrics?.financialPressure || 0;
  const stress = intelligence.snapshot?.behavioralObservation?.metrics?.financialStressIndex || 0;
  const lowBalancePressure = stats.totalBalance > 0 && stats.recent7Total > stats.totalBalance * 0.5;
  const nearPayday = cycle.daysUntilExpectedIncome !== null && cycle.daysUntilExpectedIncome <= 6;
  const probability = clamp(35 + pressure * 0.22 + stress * 0.18 + (lowBalancePressure ? 20 : 0) + (nearPayday ? 8 : 0));

  if (probability < 48) return null;

  return createPrediction({
    type: "payday_exhaustion",
    title: "Possible cutoff pressure ahead",
    forecast: `CLARA sees a possible balance-pressure window ${cycle.daysUntilExpectedIncome !== null ? `${cycle.daysUntilExpectedIncome} day(s) before the next expected ${cycle.label}` : "before the next income cycle"}.`,
    probability,
    confidence: Math.min(0.78, 0.38 + cycle.confidence + (stats.recentExpenseCount >= 8 ? 0.12 : 0)),
    severity: probability >= 75 ? "high" : "moderate",
    timeframe: cycle.daysUntilExpectedIncome !== null ? `next ${Math.max(1, cycle.daysUntilExpectedIncome)} days` : "this cycle",
    basis: [
      cycle.label !== "unknown cycle" ? `Income rhythm suggests ${cycle.label}` : "Income cycle is not fully known yet",
      stats.totalBalance ? `Visible balance: ₱${Math.round(stats.totalBalance)}` : "Visible balance is limited or unavailable",
      `Recent 7-day spending: ₱${Math.round(stats.recent7Total)}`,
      stress ? `Observed stress signal: ${stress}%` : "Behavioral stress baseline still learning",
    ],
    action: "Protect essentials for the next few days before adding flexible spending.",
    decisionGuidance: "Before spending, ask whether this purchase will make the last few days before income harder.",
  });
}

function impulseEscalationPrediction({ stats }) {
  const probability = clamp(25 + stats.unplannedRatio * 52 + stats.burstDayCount * 8 + stats.lateNightCount * 3);
  if (probability < 45) return null;

  return createPrediction({
    type: "impulse_escalation",
    title: "Impulse risk may be rising",
    forecast: "Unplanned or clustered spending appears elevated compared with the current behavior baseline.",
    probability,
    confidence: Math.min(0.84, 0.42 + stats.recentExpenseCount / 60 + stats.unplannedRatio * 0.25),
    severity: probability >= 72 ? "high" : "watch",
    timeframe: "this week",
    basis: [
      `${stats.unplannedCount} unplanned-looking expenses in the recent window`,
      `${stats.burstDayCount} spending burst day(s) detected`,
      stats.lateNightCount ? `${stats.lateNightCount} late-night transaction(s)` : "No strong late-night signal yet",
    ],
    action: "Use a pause rule before the second flexible purchase in the same day.",
    decisionGuidance: "Waiting a few hours may reduce impulse pressure if the purchase is not essential.",
  });
}

function stressEscalationPrediction({ stats, observation }) {
  const behavior = observation?.metrics || {};
  const probability = clamp(30 + (behavior.financialStressIndex || 0) * 0.35 + stats.convenienceCount * 2 + stats.overBudgetCount * 9);
  if (probability < 50) return null;

  return createPrediction({
    type: "stress_escalation",
    title: "Pressure may be building",
    forecast: "Convenience spending, budget pressure, or behavioral stress signals may be moving together.",
    probability,
    confidence: Math.min(0.82, 0.45 + (behavior.observedBehaviorConfidence || 0) / 220),
    severity: probability >= 76 ? "high" : "moderate",
    timeframe: "next 7 days",
    basis: [
      behavior.financialStressIndex ? `Financial stress index: ${behavior.financialStressIndex}%` : "Stress index still learning",
      `${stats.convenienceCount} convenience-like expense(s) recently`,
      stats.overBudgetCount ? `${stats.overBudgetCount} overused budget(s)` : "No strong over-budget signal yet",
    ],
    action: "Choose one low-effort fallback plan before stress creates a spending shortcut.",
    decisionGuidance: "This is a good moment to simplify the next decision, not force perfect discipline.",
  });
}

function savingsFailurePrediction({ stats, intelligence }) {
  const pressure = intelligence.snapshot?.metrics?.financialPressure || 0;
  const probability = clamp(22 + pressure * 0.22 + stats.spendDelta30 * 0.12 + stats.overBudgetCount * 10 + (stats.emergencyProgress !== null && stats.emergencyProgress < 20 ? 14 : 0) - stats.savingsProgressCount * 8);
  if (probability < 44) return null;

  return createPrediction({
    type: "savings_failure_risk",
    title: "Savings consistency may weaken",
    forecast: "Current spending pressure may make savings harder to maintain this cycle unless the amount is made smaller and more automatic.",
    probability,
    confidence: Math.min(0.8, 0.4 + (stats.activeBudgetCount ? 0.08 : 0) + (stats.recentExpenseCount / 90)),
    severity: probability >= 70 ? "moderate" : "watch",
    timeframe: "this month",
    basis: [
      `Financial pressure: ${pressure}%`,
      stats.spendDelta30 ? `30-day spending trend: ${stats.spendDelta30}%` : "Spending trend is still forming",
      stats.emergencyProgress !== null ? `Emergency fund progress: ${stats.emergencyProgress}%` : "Emergency buffer not fully known",
      stats.savingsProgressCount ? `${stats.savingsProgressCount} savings goal(s) already moving` : "Savings movement is limited so far",
    ],
    action: "Switch to a smaller repeatable saving move instead of waiting for a perfect month.",
    decisionGuidance: "Before spending extra, protect a tiny amount for the future first.",
  });
}

function recoveryMomentumPrediction({ stats, observation }) {
  const behavior = observation?.metrics || {};
  const improving = observation?.riskTrajectory?.direction === "improving" || stats.spendDelta7 <= -18 || (behavior.recoveryProgress || 0) >= 45;
  if (!improving) return null;

  const probability = clamp(48 + Math.abs(Math.min(0, stats.spendDelta7)) * 0.5 + (behavior.recoveryProgress || 0) * 0.35);

  return createPrediction({
    type: "recovery_momentum",
    title: "Recovery momentum forming",
    forecast: "CLARA sees signs that the user may be regaining control or stabilizing spending pressure.",
    probability,
    confidence: Math.min(0.82, 0.5 + (behavior.observedBehaviorConfidence || 0) / 260),
    severity: "positive",
    timeframe: "this week",
    basis: [
      stats.spendDelta7 ? `7-day spending trend: ${stats.spendDelta7}%` : "Recent spending trend is stabilizing",
      behavior.recoveryProgress ? `Recovery progress: ${behavior.recoveryProgress}%` : "Recovery signal detected from behavior trajectory",
      observation?.riskTrajectory?.direction ? `Trajectory: ${observation.riskTrajectory.direction}` : "Trajectory still learning",
    ],
    action: "Repeat the same boundary that created the improvement before adding new rules.",
    decisionGuidance: "The goal is to protect momentum, not become stricter than necessary.",
  });
}

function burnoutPressurePrediction({ intelligence, observation }) {
  const metrics = intelligence.snapshot?.metrics || {};
  const behavior = observation?.metrics || {};
  const probability = clamp(25 + (metrics.burnoutRisk || 0) * 0.35 + (behavior.financialStressIndex || 0) * 0.25 + (metrics.recoveryCapacity < 40 ? 14 : 0));
  if (probability < 50) return null;

  return createPrediction({
    type: "burnout_pressure_forecast",
    title: "Recovery pressure may affect spending",
    forecast: "Low recovery capacity may make convenience, reward, or avoidance spending more likely in this cycle.",
    probability,
    confidence: Math.min(0.8, 0.44 + (metrics.burnoutRisk || 0) / 220 + (behavior.observedBehaviorConfidence || 0) / 360),
    severity: probability >= 76 ? "high" : "moderate",
    timeframe: "next 7 days",
    basis: [
      `Burnout risk: ${metrics.burnoutRisk || 0}%`,
      `Recovery capacity: ${metrics.recoveryCapacity || 0}%`,
      behavior.financialStressIndex ? `Observed stress signal: ${behavior.financialStressIndex}%` : "Observed stress still learning",
    ],
    action: "Plan a low-cost recovery option before exhaustion turns into spending pressure.",
    decisionGuidance: "If the purchase is mainly for relief, choose the lowest-cost relief that still helps.",
  });
}

function buildDecisionForecast(predictions) {
  const activeRisks = predictions.filter((item) => item.severity !== "positive");
  const positives = predictions.filter((item) => item.severity === "positive");
  const top = predictions[0];

  return {
    title: top?.title || "CLARA is building your forecast",
    summary: top
      ? `${top.forecast} This is an estimate, so CLARA will keep checking whether the pattern strengthens or softens.`
      : "CLARA needs more behavior history before making strong forecasts. For now, decisions will stay guided by the local Life Snapshot.",
    activeRiskCount: activeRisks.length,
    positiveMomentumCount: positives.length,
    overallDirection: positives.length && !activeRisks.length ? "improving" : activeRisks.length >= 2 ? "watch" : top ? "learning" : "learning",
    nextBestAction: top?.action || "Keep logging spending so CLARA can forecast with better confidence.",
  };
}

function buildConfidenceLayers({ predictions, observation, intelligence }) {
  const avgPredictionConfidence = predictions.length
    ? predictions.reduce((total, item) => total + item.confidence, 0) / predictions.length
    : 0.28;
  const observationConfidence = observation?.confidenceLayers?.observedBehavior || (observation?.metrics?.observedBehaviorConfidence ? observation.metrics.observedBehaviorConfidence / 100 : 0.3);
  const worldConfidence = intelligence?.worldEnrichment ? 0.68 : 0.34;
  const userDeclared = intelligence?.snapshot?.confidenceScore || 0.42;
  const historical = observation?.confidenceLayers?.historicalConsistency || 0.35;

  return {
    predictionConfidence: Number(avgPredictionConfidence.toFixed(2)),
    userDeclaredConfidence: Number(userDeclared.toFixed(2)),
    observedBehaviorWeight: Number(Math.max(0.25, Math.min(0.82, observationConfidence)).toFixed(2)),
    worldPressureWeight: Number(worldConfidence.toFixed(2)),
    historicalConsistencyWeight: Number(historical.toFixed(2)),
  };
}

async function readFinanceContext(localUserId) {
  const safeLocalUserId = resolveLocalUserId(localUserId);
  const safeRead = async (storeName) => {
    try {
      return await getLocalRecords(storeName, safeLocalUserId);
    } catch (error) {
      console.warn(`CLARA predictive decision skipped ${storeName}:`, error);
      return [];
    }
  };

  const [expenses, wallets, budgets, savingsGoals, emergencyFund] = await Promise.all([
    safeRead(LOCAL_FINANCE_STORES.expenses),
    safeRead(LOCAL_FINANCE_STORES.wallets),
    safeRead(LOCAL_FINANCE_STORES.budgets),
    safeRead(LOCAL_FINANCE_STORES.savingsGoals),
    safeRead(LOCAL_FINANCE_STORES.emergencyFund),
  ]);

  return {
    localUserId: safeLocalUserId,
    expenses: expenses.map(normalizeExpense).filter((item) => item.amount > 0 && daysAgo(item.date) <= LOOKBACK_DAYS + 30),
    wallets: wallets.map(normalizeWallet),
    budgets: budgets.map(normalizeBudget),
    savingsGoals: savingsGoals.map(normalizeSavingsGoal),
    emergencyFund: emergencyFund.map(normalizeEmergencyFund),
  };
}

export async function buildPredictiveDecisionSnapshot(options = {}) {
  const context = await readFinanceContext(options.localUserId);
  const intelligence = readCachedLifeStageIntelligence();
  const observation = readCachedBehavioralObservation();
  const previous = readJsonStorage(PREDICTIVE_DECISION_KEY, null);
  const stats = buildContextStats(context);

  const predictionInputs = { stats, intelligence: intelligence || {}, observation: observation || {} };
  const predictions = [
    paydayExhaustionPrediction(predictionInputs),
    impulseEscalationPrediction(predictionInputs),
    stressEscalationPrediction(predictionInputs),
    savingsFailurePrediction(predictionInputs),
    recoveryMomentumPrediction(predictionInputs),
    burnoutPressurePrediction(predictionInputs),
  ]
    .filter(Boolean)
    .sort((a, b) => {
      const severityWeight = { high: 5, moderate: 4, watch: 3, positive: 2 };
      return (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0) || b.probability - a.probability;
    })
    .slice(0, MAX_PREDICTIONS);

  const forecast = buildDecisionForecast(predictions);
  const confidenceLayers = buildConfidenceLayers({ predictions, observation, intelligence });
  const previousTop = previous?.predictions?.[0]?.type || null;
  const currentTop = predictions[0]?.type || null;

  return {
    id: "clara_predictive_decision_current",
    version: 1,
    localUserId: context.localUserId,
    stage: intelligence?.stage || null,
    forecast,
    predictions,
    stats,
    confidenceLayers,
    predictionTrajectory: {
      direction:
        forecast.overallDirection === "improving"
          ? "improving"
          : previousTop && currentTop && previousTop !== currentTop
            ? "shifting"
            : predictions.length
              ? "active"
              : "learning",
      previousTopPrediction: previousTop,
      currentTopPrediction: currentTop,
      note:
        previousTop && currentTop && previousTop !== currentTop
          ? "The leading forecast changed, so CLARA is watching whether this becomes a real shift."
          : predictions.length
            ? "CLARA has enough signals to keep a light predictive watch active."
            : "CLARA is still collecting enough behavior history for confident forecasts.",
    },
    updatedAt: nowIso(),
  };
}

export async function savePredictiveDecisionSnapshot(predictionSnapshot, options = {}) {
  if (!predictionSnapshot) return null;
  const localUserId = resolveLocalUserId(options.localUserId || predictionSnapshot.localUserId);
  const previous = readJsonStorage(PREDICTIVE_DECISION_KEY, null);
  const history = [
    {
      id: `prediction_history_${Date.now()}`,
      topPrediction: predictionSnapshot.predictions?.[0]?.type || null,
      forecast: predictionSnapshot.forecast,
      confidenceLayers: predictionSnapshot.confidenceLayers,
      createdAt: predictionSnapshot.updatedAt || nowIso(),
      resolved: false,
    },
    ...(previous?.history || []),
  ].slice(0, 30);

  const stored = { ...predictionSnapshot, history };
  writeJsonStorage(PREDICTIVE_DECISION_KEY, stored);

  try {
    await upsertLocalRecord(
      LOCAL_FINANCE_STORES.aiFinancialMemory,
      {
        id: PREDICTIVE_DECISION_MEMORY_ID,
        memoryType: "predictive_decision_intelligence",
        stage: stored.stage,
        forecast: stored.forecast,
        predictions: stored.predictions,
        confidenceLayers: stored.confidenceLayers,
        predictionTrajectory: stored.predictionTrajectory,
        history: stored.history,
        updatedAt: stored.updatedAt,
      },
      localUserId
    );
  } catch (error) {
    console.warn("CLARA predictive decision IndexedDB save skipped:", error);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("clara:prediction-updated", { detail: stored }));
  }

  return stored;
}

function patchLifeSnapshotWithPredictions(intelligence, predictionSnapshot) {
  if (!intelligence?.snapshot || !predictionSnapshot) return intelligence;
  const topPrediction = predictionSnapshot.predictions?.[0];
  return {
    ...intelligence,
    version: Math.max(4, Number(intelligence.version || 1)),
    behaviorProfile: {
      ...(intelligence.behaviorProfile || {}),
      predictiveDecisionUpdatedAt: predictionSnapshot.updatedAt,
      interpretedTags: unique([
        ...(intelligence.behaviorProfile?.interpretedTags || []),
        "predictive_decision_active",
        ...predictionSnapshot.predictions.slice(0, 4).map((item) => `prediction:${item.type}`),
      ]),
    },
    snapshot: {
      ...intelligence.snapshot,
      predictiveDecision: predictionSnapshot,
      predictiveWatch: predictionSnapshot.predictions.slice(0, 4),
      pressureForecast: predictionSnapshot.forecast,
      financialMomentum: predictionSnapshot.forecast.overallDirection,
      decisionImpactWarnings: predictionSnapshot.predictions.filter((item) => item.severity !== "positive").slice(0, 3),
      adaptiveTimingSuggestions: predictionSnapshot.predictions.map((item) => item.decisionGuidance).filter(Boolean).slice(0, 3),
      statusBadge:
        topPrediction?.severity === "positive"
          ? "Recovery Momentum Forecast"
          : topPrediction?.severity === "high"
            ? "Predictive Pressure Watch"
            : intelligence.snapshot.statusBadge || "Predictive Watch Active",
      updatedAt: predictionSnapshot.updatedAt,
    },
    predictiveDecision: predictionSnapshot,
    nextRefreshReason: "predictive_decision_overlay_active",
  };
}

export async function updateLifeSnapshotWithPrediction(predictionSnapshot, options = {}) {
  const intelligence = readCachedLifeStageIntelligence();
  if (!intelligence?.snapshot || !predictionSnapshot) return null;
  const updated = patchLifeSnapshotWithPredictions(intelligence, predictionSnapshot);
  await saveLifeStageIntelligence(updated, {
    reason: options.reason || "life_stage_predictive_decision_updated",
    localUserId: options.localUserId || predictionSnapshot.localUserId,
  });
  return updated;
}

export async function runPredictiveDecisionAnalysis(options = {}) {
  const predictionSnapshot = await buildPredictiveDecisionSnapshot(options);
  const stored = await savePredictiveDecisionSnapshot(predictionSnapshot, options);
  const updatedLifeSnapshot = await updateLifeSnapshotWithPrediction(stored, options);
  return { predictionSnapshot: stored, updatedLifeSnapshot };
}

export function readCachedPredictiveDecision() {
  return readJsonStorage(PREDICTIVE_DECISION_KEY, null);
}
