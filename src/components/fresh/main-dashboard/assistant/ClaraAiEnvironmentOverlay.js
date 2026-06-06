import { useEffect, useMemo, useRef, useState } from "react";
import ClaraAiEnvironmentOverlayCore from "./ClaraAiEnvironmentOverlay.jsx";
import { buildClaraFinanceSnapshot } from "@/lib/clara-local-brain";

function parseForecastNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/php/gi, "").replace(/[₱,\s]/g, "").trim();
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function hasValue(value) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((item) => hasValue(item));
  if (typeof value === "object") return Object.values(value).some((item) => hasValue(item));
  return Boolean(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function readPath(source = {}, path = "") {
  return String(path || "").split(".").reduce((current, key) => current?.[key], source);
}

function firstArray(source = {}, paths = []) {
  for (const path of paths) {
    const value = readPath(source, path);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function firstValue(source = {}, paths = []) {
  for (const path of paths) {
    const value = readPath(source, path);
    if (hasValue(value)) return value;
  }
  return null;
}

function firstNumber(source = {}, paths = []) {
  for (const path of paths) {
    const number = parseForecastNumber(readPath(source, path));
    if (number !== null) return number;
  }
  return null;
}

function countReadable(value) {
  return asArray(value).filter((item) => hasValue(item)).length;
}

function formatForecastMoney(value) {
  const number = parseForecastNumber(value);
  return number !== null ? "₱" + number.toLocaleString("en-PH", { maximumFractionDigits: 0 }) : "Not available";
}

function formatForecastValue(value) {
  if (!hasValue(value)) return "Missing";
  if (Array.isArray(value)) {
    const readable = value.filter((item) => hasValue(item));
    return readable.length ? readable.map((item) => formatForecastValue(item)).join(", ") : "Missing";
  }
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "Missing";
  if (typeof value === "string") return value.trim() || "Missing";
  if (typeof value === "object") {
    const direct = value.label || value.value || value.name || value.title || value.status || value.type || value.category;
    if (hasValue(direct)) return String(direct);
    return "Available";
  }
  return String(value);
}

function formatForecastCount(value) {
  const number = parseForecastNumber(value);
  return number !== null ? String(number) : "0";
}

function formatForecastPercent(value) {
  const number = parseForecastNumber(value);
  return number !== null ? Math.round(number) + "%" : "Missing";
}

function normalizeText(value = "") {
  return String(value || "").toLowerCase().replace(/[“”"'`]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function hasEmergencyFundData(emergencyFund = {}) {
  if (!emergencyFund || typeof emergencyFund !== "object") return false;
  return [
    emergencyFund.saved,
    emergencyFund.current,
    emergencyFund.currentAmount,
    emergencyFund.current_amount,
    emergencyFund.amount,
    emergencyFund.saved_amount,
    emergencyFund.target,
    emergencyFund.goal,
    emergencyFund.targetAmount,
    emergencyFund.target_amount,
    emergencyFund.goal_amount,
    emergencyFund.monthsCovered,
    emergencyFund.months_covered,
    emergencyFund.months,
  ].some((value) => hasValue(value));
}

function expensePlanStatus(expense = {}) {
  const combined = normalizeText([
    expense.planning_status,
    expense.budget_status,
    expense.plan_status,
    expense.budgetStatus,
    expense.status,
    expense.budget_category,
    expense.expense_category,
    expense.category,
    expense.category_name,
    expense.type,
  ].filter(Boolean).join(" "));

  if (combined.includes("unplanned") || combined.includes("not planned") || combined.includes("outside plan")) return "unplanned";
  if (combined.includes("undocumented") || combined.includes("outside") || combined.includes("over budget") || combined.includes("budget risk")) return "outside_plan";
  if (combined.includes("planned") || combined.includes("budgeted") || combined.includes("covered")) return "planned";
  return "unknown";
}

function countExpensesByStatus(expenses = [], statuses = []) {
  return asArray(expenses).filter((expense) => statuses.includes(expensePlanStatus(expense))).length;
}

function countGoalDeadlines(goals = []) {
  return asArray(goals).filter((goal) => hasValue(goal.deadline || goal.due_date || goal.dueDate || goal.target_date || goal.targetDate || goal.end_date || goal.endDate)).length;
}

function mergeUniqueArrays(...arrays) {
  const seen = new Set();
  return arrays.flatMap(asArray).filter((item) => {
    const key = item?.id || item?.local_id || item?.transaction_id || item?.name || item?.title || JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildForecastPhaseOneSnapshot(context = {}) {
  const financeSnapshot = buildClaraFinanceSnapshot(context || {});
  const source = { ...(financeSnapshot.rawContext || {}), ...(context || {}) };

  const wallets = asArray(financeSnapshot.wallets).length ? asArray(financeSnapshot.wallets) : firstArray(source, ["wallets", "userWallets", "finance.wallets"]);
  const expenses = asArray(financeSnapshot.expenses).length ? asArray(financeSnapshot.expenses) : firstArray(source, ["expenses", "monthlyExpensesList", "recentExpenses", "finance.expenses"]);
  const walletTransactions = asArray(financeSnapshot.walletTransactions).length ? asArray(financeSnapshot.walletTransactions) : firstArray(source, ["walletTransactions", "wallet_transactions", "finance.walletTransactions"]);
  const rawTransactions = firstArray(source, ["transactions", "recentTransactions", "finance.transactions"]);
  const transactions = mergeUniqueArrays(walletTransactions, rawTransactions);
  const transfers = asArray(financeSnapshot.transfers).length ? asArray(financeSnapshot.transfers) : firstArray(source, ["transfers", "walletTransfers", "wallet_transfers", "finance.transfers"]);

  const incomeRecords = firstArray(source, ["incomeRecords", "income_records", "incomes", "incomeEntries", "finance.incomeRecords", "finance.incomes"]);
  const incomeSources = firstArray(source, ["incomeSources", "income_sources", "finance.incomeSources"]);
  const expectedIncome = firstNumber(source, ["expectedIncome", "expected_income", "nextIncome", "next_income", "monthlyIncome", "income", "finance.expectedIncome", "finance.monthlyIncome"]) ?? financeSnapshot.income ?? null;
  const incomeRecordsCount = countReadable(incomeRecords) || (financeSnapshot.income !== null && financeSnapshot.income !== undefined ? 1 : 0);

  const budgets = asArray(financeSnapshot.budgets).length ? asArray(financeSnapshot.budgets) : firstArray(source, ["budgets", "budgetList", "budgetCategories", "budget_categories", "finance.budgets"]);
  const budgetCategories = asArray(financeSnapshot.budgetPlan?.categories).length ? asArray(financeSnapshot.budgetPlan.categories) : budgets;
  const budgetRemaining = firstNumber(source, ["budgetRemaining", "remainingBudget", "effectiveBudgetRemaining", "finance.budgetRemaining"]) ?? financeSnapshot.effectiveBudgetRemaining ?? financeSnapshot.budgetRemaining ?? null;

  const recurringExpenses = firstArray(source, ["recurringExpenses", "recurring_expenses", "monthlyRecurringExpenses", "finance.recurringExpenses"]);
  const subscriptions = firstArray(source, ["subscriptions", "subscriptionRecords", "finance.subscriptions"]);
  const bills = firstArray(source, ["bills", "monthlyBills", "billRecords", "finance.bills"]);
  const debtObligations = firstArray(source, ["debtObligations", "debt_obligations", "debts", "loans", "obligations", "finance.debtObligations", "finance.debts"]);

  const savingsGoals = asArray(financeSnapshot.savingsGoals).length ? asArray(financeSnapshot.savingsGoals) : firstArray(source, ["savingsGoals", "savings_goals", "goals", "finance.savingsGoals"]);
  const emergencyFund = financeSnapshot.emergencyFund || firstValue(source, ["emergencyFund", "emergency_fund", "finance.emergencyFund"]) || {};
  const rawEmergencyFund = firstValue(source, ["emergencyFund", "emergency_fund", "finance.emergencyFund"]);
  const emergencyFundSaved = firstNumber(source, ["emergencyFund.saved", "emergencyFund.current", "emergencyFund.currentAmount", "emergencyFund.current_amount", "emergency_fund.saved", "emergency_fund.current", "emergencyFundSaved", "emergency_fund_saved"]) ?? financeSnapshot.emergencyFund?.saved ?? null;
  const emergencyProtectedAmount = firstNumber(source, ["protectedEmergencyAmount", "emergencyProtectedAmount", "emergency_protected_amount", "emergencyFund.protectedAmount", "emergency_fund.protected_amount"]) ?? (financeSnapshot.hasReadableWalletBalances ? financeSnapshot.protectedEmergencyAmount : null);

  const moneyLeft = firstNumber(source, ["moneyLeft", "money_left", "dashboardMoneyLeft", "dashboard.moneyLeft", "summary.moneyLeft", "finance.moneyLeft"]) ?? financeSnapshot.availableMoney ?? null;
  const totalWalletBalance = financeSnapshot.hasReadableWalletBalances ? financeSnapshot.totalWalletBalance : firstNumber(source, ["totalWalletBalance", "totalBalance", "walletBalance", "wallet_balance", "finance.totalWalletBalance"]);
  const safeSpendableMoney = firstNumber(source, ["safeSpendableMoney", "safeSpendableAmount", "safe_spendable_money", "safe_spendable_amount", "finance.safeSpendableMoney"]) ?? financeSnapshot.safeSpendableAmount ?? null;

  const paydayTiming = firstValue(source, ["paydayInfo", "payday_info", "payday", "paydayCycle", "incomeTiming", "income_timing", "finance.paydayInfo", "profileAnswers.paydayCycle.value", "profile.paydayCycle", "lifeProfile.paydayCycle"]);
  const workSchedule = firstValue(source, ["workSchedule", "scheduleRoutine", "schedule_routine", "profileAnswers.scheduleRoutine.value", "profile.scheduleRoutine", "lifeProfile.scheduleRoutine"]);
  const sleepPattern = firstValue(source, ["sleepPattern", "sleep_pattern", "profileAnswers.sleepPattern.value", "profile.sleepPattern", "lifeProfile.sleepPattern"]);
  const energyDrop = firstValue(source, ["energyDrop", "energy_drop", "energyLevelTrends", "profileAnswers.energyLevelTrends.value", "profile.energyLevelTrends", "lifeProfile.energyLevelTrends"]);
  const burnoutIndicators = firstValue(source, ["burnoutIndicators", "burnout_indicators", "profileAnswers.burnoutIndicators.value", "profile.burnoutIndicators", "lifeProfile.burnoutIndicators"]);

  const stressSpendingHabit = firstValue(source, ["stressSpendingHabit", "stressSpendingHabits", "stress_spending_habits", "profileAnswers.stressSpendingHabits.value", "profile.stressSpendingHabits", "lifeProfile.stressSpendingHabits", "behaviorProfile.stressSpendingHabits"]);
  const commonImpulsePurchases = firstValue(source, ["commonImpulsePurchases", "commonImpulsivePurchases", "common_impulse_purchases", "profileAnswers.commonImpulsivePurchases.value", "profile.commonImpulsivePurchases", "lifeProfile.commonImpulsivePurchases", "behaviorProfile.commonImpulsivePurchases"]);
  const biggestSpendingWeakness = firstValue(source, ["biggestSpendingWeakness", "biggest_spending_weakness", "profileAnswers.biggestSpendingWeakness.value", "profile.biggestSpendingWeakness", "lifeProfile.biggestSpendingWeakness", "behaviorProfile.biggestSpendingWeakness"]);
  const recentExpenseActivity = expenses.length || transactions.length ? String(expenses.length + transactions.length) + " visible record(s)" : firstValue(source, ["recentExpenseActivity", "recentBehavior.recentExpenseActivity", "behavioralObservation.recentExpenseActivity", "ai_financial_memory.recentExpenseActivity"]);

  const plannedExpensesCount = countExpensesByStatus(expenses, ["planned"]);
  const unplannedExpensesCount = countExpensesByStatus(expenses, ["unplanned"]);
  const outsidePlanSpendingCount = countExpensesByStatus(expenses, ["outside_plan", "unplanned"]);
  const emergencyFundAvailable = hasEmergencyFundData(rawEmergencyFund) || hasValue(emergencyFundSaved) || hasEmergencyFundData(emergencyFund);
  const hasScheduleData = [workSchedule, sleepPattern, energyDrop, burnoutIndicators].some(hasValue);

  const currentMoney = {
    walletCount: wallets.length,
    totalWalletBalance,
    moneyLeft,
    safeSpendableMoney,
    emergencyProtectedAmount,
  };

  const moneyComingIn = {
    incomeRecordsCount,
    incomeSourcesCount: incomeSources.length,
    expectedIncome,
    paydayTiming,
  };

  const moneyGoingOut = {
    expensesCount: expenses.length,
    transactionsCount: transactions.length,
    transfersCount: transfers.length,
    recurringExpensesCount: recurringExpenses.length,
    subscriptionsCount: subscriptions.length,
    billsCount: bills.length,
    debtObligationsCount: debtObligations.length,
  };

  const budgetPressure = {
    budgetsCount: budgets.length || (financeSnapshot.hasActiveBudgetPlan ? 1 : 0),
    budgetCategoriesCount: budgetCategories.length,
    budgetRemaining,
    plannedExpensesCount,
    unplannedExpensesCount,
    outsidePlanSpendingCount,
  };

  const savingsPressure = {
    savingsGoalsCount: savingsGoals.length,
    savingsProgress: financeSnapshot.savingsProgress,
    emergencyFund: emergencyFundSaved,
    goalDeadlinesCount: countGoalDeadlines(savingsGoals),
  };

  const behaviorRisk = {
    recentExpenseActivity,
    stressSpendingHabit,
    commonImpulsePurchases,
    biggestSpendingWeakness,
    unplannedSpendingCount: unplannedExpensesCount,
  };

  const schedulePaydayRisk = {
    paydayCycle: paydayTiming,
    workSchedule,
    sleepPattern,
    energyDrop,
    burnoutIndicators,
  };

  const missingData = [];
  if (!wallets.length) missingData.push("No wallet data");
  if (!expenses.length && !transactions.length) missingData.push("No recent expenses or transactions");
  if (!incomeSources.length && !incomeRecordsCount && expectedIncome === null) missingData.push("No income source");
  if (!hasValue(paydayTiming)) missingData.push("No payday timing");
  if (!emergencyFundAvailable) missingData.push("No emergency fund data");
  if (!debtObligations.length) missingData.push("No debt obligation data");
  if (!recurringExpenses.length && !subscriptions.length && !bills.length) missingData.push("No recurring expense data");
  if (!hasScheduleData) missingData.push("No schedule/routine data");

  const usableGroups = [
    wallets.length > 0 || totalWalletBalance !== null || moneyLeft !== null || safeSpendableMoney !== null,
    incomeSources.length > 0 || incomeRecordsCount > 0 || expectedIncome !== null,
    expenses.length > 0 || transactions.length > 0 || transfers.length > 0 || recurringExpenses.length > 0 || subscriptions.length > 0 || bills.length > 0 || debtObligations.length > 0,
    budgetPressure.budgetsCount > 0 || budgetPressure.budgetCategoriesCount > 0 || budgetRemaining !== null,
    savingsGoals.length > 0 || emergencyFundAvailable,
    [recentExpenseActivity, stressSpendingHabit, commonImpulsePurchases, biggestSpendingWeakness].some(hasValue) || unplannedExpensesCount > 0,
    hasValue(paydayTiming) || hasScheduleData,
  ].filter(Boolean).length;

  const dataCompleteness = usableGroups >= 6 ? "strong" : usableGroups >= 3 ? "medium" : "weak";

  return {
    currentMoney,
    moneyComingIn,
    moneyGoingOut,
    budgetPressure,
    savingsPressure,
    behaviorRisk,
    schedulePaydayRisk,
    missingData,
    dataCompleteness,
    hasUsableData: usableGroups > 0 || Boolean(financeSnapshot.hasAnyData),
    financeSnapshot,
    generatedAt: new Date().toISOString(),
  };
}

function forecastLoadingText() {
  return [
    "CLARA is reading your future money signals…",
    "Checking your money available, income timing, money going out, budget pressure, savings pressure, behavior risk, and payday schedule.",
    "No typing needed. This Phase 1 snapshot uses your current local records only.",
  ].join("\n\n");
}

function forecastReadyText(snapshot = {}) {
  const completenessLabel = String(snapshot.dataCompleteness || "weak").charAt(0).toUpperCase() + String(snapshot.dataCompleteness || "weak").slice(1);
  const current = snapshot.currentMoney || {};
  const incoming = snapshot.moneyComingIn || {};
  const outgoing = snapshot.moneyGoingOut || {};
  const budget = snapshot.budgetPressure || {};
  const savings = snapshot.savingsPressure || {};
  const behavior = snapshot.behaviorRisk || {};
  const schedule = snapshot.schedulePaydayRisk || {};
  const missing = asArray(snapshot.missingData);
  const missingLines = missing.length ? missing.map((item) => "• " + item).join("\n") : "• No major missing data detected for Phase 1";

  return [
    "Forecast snapshot ready",
    "",
    "CLARA has prepared your money forecast snapshot.",
    "Forecast generation will use this data in the next phase.",
    "",
    "Data completeness level: " + completenessLabel,
    "",
    "Current money:",
    "Wallets found: " + formatForecastCount(current.walletCount),
    "Total wallet balance: " + formatForecastMoney(current.totalWalletBalance),
    "Money left: " + formatForecastMoney(current.moneyLeft),
    "Safe spendable money: " + formatForecastMoney(current.safeSpendableMoney),
    "Emergency protected amount: " + formatForecastMoney(current.emergencyProtectedAmount),
    "",
    "Money coming in:",
    "Income records found: " + formatForecastCount(incoming.incomeRecordsCount),
    "Income sources found: " + formatForecastCount(incoming.incomeSourcesCount),
    "Expected income: " + formatForecastMoney(incoming.expectedIncome),
    "Payday timing: " + formatForecastValue(incoming.paydayTiming),
    "",
    "Money going out:",
    "Expenses found: " + formatForecastCount(outgoing.expensesCount),
    "Transactions found: " + formatForecastCount(outgoing.transactionsCount),
    "Transfers found: " + formatForecastCount(outgoing.transfersCount),
    "Recurring expenses found: " + formatForecastCount(outgoing.recurringExpensesCount),
    "Subscriptions found: " + formatForecastCount(outgoing.subscriptionsCount),
    "Bills found: " + formatForecastCount(outgoing.billsCount),
    "Debt obligations found: " + formatForecastCount(outgoing.debtObligationsCount),
    "",
    "Budget pressure:",
    "Budgets found: " + formatForecastCount(budget.budgetsCount),
    "Budget categories found: " + formatForecastCount(budget.budgetCategoriesCount),
    "Budget remaining: " + formatForecastMoney(budget.budgetRemaining),
    "Planned expenses found: " + formatForecastCount(budget.plannedExpensesCount),
    "Unplanned expenses found: " + formatForecastCount(budget.unplannedExpensesCount),
    "Outside-plan spending found: " + formatForecastCount(budget.outsidePlanSpendingCount),
    "",
    "Savings pressure:",
    "Savings goals found: " + formatForecastCount(savings.savingsGoalsCount),
    "Savings progress: " + formatForecastPercent(savings.savingsProgress),
    "Emergency fund: " + formatForecastMoney(savings.emergencyFund),
    "Goal deadlines found: " + formatForecastCount(savings.goalDeadlinesCount),
    "",
    "Behavior risk:",
    "Recent expense activity: " + formatForecastValue(behavior.recentExpenseActivity),
    "Unplanned spending count: " + formatForecastCount(behavior.unplannedSpendingCount),
    "Stress spending habit: " + formatForecastValue(behavior.stressSpendingHabit),
    "Common impulse purchases: " + formatForecastValue(behavior.commonImpulsePurchases),
    "Biggest spending weakness: " + formatForecastValue(behavior.biggestSpendingWeakness),
    "",
    "Schedule / payday risk:",
    "Payday cycle: " + formatForecastValue(schedule.paydayCycle),
    "Work schedule: " + formatForecastValue(schedule.workSchedule),
    "Sleep pattern: " + formatForecastValue(schedule.sleepPattern),
    "Energy drop: " + formatForecastValue(schedule.energyDrop),
    "Burnout indicators: " + formatForecastValue(schedule.burnoutIndicators),
    "",
    "Missing data detected:",
    missingLines,
  ].join("\n");
}

function makeForecastMessage(role, text, meta = {}) {
  return {
    id: "forecast-phase-one-" + role + "-" + Date.now() + "-" + Math.random().toString(36).slice(2),
    role,
    text,
    ...meta,
  };
}

function isForecastActionTarget(target) {
  const button = target?.closest?.("button");
  if (!button) return false;
  const text = normalizeText(button.textContent || "");
  return Boolean(
    text.includes("future money forecast") ||
      (text.includes("forecast") && text.includes("predict where your money is heading")) ||
      text === "forecast"
  );
}

export default function ClaraAiEnvironmentOverlay(props) {
  const { isActive = false, messages = [], claraAssistantContext = {} } = props;
  const [forecastMessages, setForecastMessages] = useState([]);
  const forecastTimerRef = useRef(null);

  const clearForecastTimer = () => {
    if (forecastTimerRef.current) {
      window.clearTimeout(forecastTimerRef.current);
      forecastTimerRef.current = null;
    }
  };

  useEffect(() => () => clearForecastTimer(), []);

  useEffect(() => {
    if (!isActive) {
      clearForecastTimer();
      setForecastMessages([]);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || typeof document === "undefined") return undefined;

    const handleForecastClick = (event) => {
      if (!isForecastActionTarget(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      clearForecastTimer();

      const userMessage = makeForecastMessage("user", "Future Money Forecast");
      const loadingMessage = makeForecastMessage("clara", forecastLoadingText(), {
        source: "forecast_phase_one",
        smartAction: { id: "forecast", title: "Future Money Forecast", shortTitle: "Forecast", chips: [] },
      });

      setForecastMessages([userMessage, loadingMessage]);

      forecastTimerRef.current = window.setTimeout(() => {
        try {
          const snapshot = buildForecastPhaseOneSnapshot(claraAssistantContext);
          setForecastMessages([
            userMessage,
            {
              ...loadingMessage,
              text: forecastReadyText(snapshot),
              source: "forecast_phase_one",
            },
          ]);
        } catch (error) {
          console.error("[CLARA Forecast Phase 1] Snapshot failed", error);
          setForecastMessages([
            userMessage,
            {
              ...loadingMessage,
              text: "Forecast snapshot could not be prepared right now. CLARA stayed safe and did not change your records.",
              source: "forecast_phase_one",
            },
          ]);
        } finally {
          forecastTimerRef.current = null;
        }
      }, 650);
    };

    document.addEventListener("click", handleForecastClick, true);
    return () => document.removeEventListener("click", handleForecastClick, true);
  }, [isActive, claraAssistantContext]);

  const mergedMessages = useMemo(
    () => [...asArray(messages), ...forecastMessages],
    [messages, forecastMessages]
  );

  return <ClaraAiEnvironmentOverlayCore {...props} messages={mergedMessages} claraAssistantContext={claraAssistantContext} />;
}
