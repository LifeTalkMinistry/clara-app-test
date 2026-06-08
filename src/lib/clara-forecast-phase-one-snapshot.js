function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function clean(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function hasValue(value) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === "object") return Object.values(value).some(hasValue);
  return Boolean(value);
}

function readPath(source = {}, path = "") {
  return String(path || "").split(".").reduce((current, key) => current?.[key], source);
}

function firstValue(source = {}, paths = []) {
  for (const path of paths) {
    const value = readPath(source, path);
    if (hasValue(value)) return value;
  }
  return null;
}

function firstProfileValue(effectiveContext = {}, fallbackContext = {}, keys = []) {
  const meProfile = effectiveContext.meProfileContext || {};
  const sources = [
    meProfile,
    meProfile.profileAnswers,
    meProfile.profile,
    meProfile.lifeProfile,
    fallbackContext.profileAnswers,
    fallbackContext.profile,
    fallbackContext.lifeProfile,
    fallbackContext.meProfileContext,
    fallbackContext.meProfileContext?.profileAnswers,
  ];

  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const key of keys) {
      const direct = source[key];
      if (hasValue(direct?.value)) return direct.value;
      if (hasValue(direct)) return direct;
    }
  }

  return null;
}

function flattenMemoryRecords(memoryContext = {}) {
  const cabinets = asArray(memoryContext?.memoryCabinets).flatMap((cabinet) =>
    asArray(cabinet.records).map((record) => ({ ...record, cabinet: cabinet.cabinet }))
  );
  const profileNotes = asArray(memoryContext?.profileMemoryNotes);
  const history = asArray(memoryContext?.userMessageHistory);
  return [...cabinets, ...profileNotes, ...history].filter(Boolean);
}

function findMemorySignal(memoryContext = {}, patterns = []) {
  const records = flattenMemoryRecords(memoryContext);
  const match = records.find((record) => {
    const text = clean(`${record.summary || ""} ${record.text || ""} ${record.content || ""} ${asArray(record.signals).join(" ")}`).toLowerCase();
    return patterns.some((pattern) => text.includes(pattern));
  });
  return clean(match?.summary || match?.text || match?.content || asArray(match?.signals).join(", ")) || null;
}

function getWalletBalance(wallet = {}) {
  return toNumber(wallet.balance ?? wallet.currentBalance ?? wallet.current_balance ?? wallet.derived_balance ?? 0);
}

function getProtectedWalletAmount(wallet = {}) {
  return toNumber(
    wallet.emergencyProtectedAmount ??
      wallet.emergency_protected_amount ??
      wallet.protectedEmergencyAmount ??
      wallet.protected_emergency_amount ??
      wallet.protectedAmount ??
      wallet.protected_amount ??
      0
  );
}

function getEmergencySaved(emergencyFund = {}) {
  return toNumber(
    emergencyFund.savedAmount ??
      emergencyFund.saved_amount ??
      emergencyFund.saved ??
      emergencyFund.currentAmount ??
      emergencyFund.current_amount ??
      emergencyFund.amount ??
      emergencyFund.balance ??
      0
  );
}

function getBudgetAmount(budget = {}) {
  return toNumber(
    budget.limit ??
      budget.amount ??
      budget.plannedAmount ??
      budget.planned_amount ??
      budget.allocatedAmount ??
      budget.allocated_amount ??
      budget.monthlyLimit ??
      budget.monthly_limit ??
      budget.categoryLimit ??
      budget.category_limit ??
      budget.budget_amount ??
      budget.allocated ??
      budget.allocated_amount ??
      0
  );
}

function expenseStatus(expense = {}) {
  const text = clean(`${expense.planningStatus || ""} ${expense.planning_status || ""} ${expense.budgetStatus || ""} ${expense.budget_status || ""} ${expense.status || ""} ${expense.category || ""}`).toLowerCase();
  if (text.includes("unplanned") || text.includes("not planned")) return "unplanned";
  if (text.includes("undocumented") || text.includes("outside") || text.includes("over budget") || text.includes("budget risk")) return "outside_plan";
  if (text.includes("planned") || text.includes("budgeted")) return "planned";
  return "unknown";
}

function countByStatus(expenses = [], statuses = []) {
  return asArray(expenses).filter((expense) => statuses.includes(expenseStatus(expense))).length;
}

function labelContains(record = {}, terms = []) {
  const text = clean(`${record.title || ""} ${record.name || ""} ${record.note || ""} ${record.category || ""} ${record.type || ""}`).toLowerCase();
  return terms.some((term) => text.includes(term));
}

function sumValues(records = [], getter) {
  return asArray(records).reduce((total, record) => total + toNumber(getter(record)), 0);
}

function calculateSavingsProgress(goals = []) {
  const totalSaved = sumValues(goals, (goal) => goal.savedAmount ?? goal.saved_amount ?? goal.saved ?? goal.current_amount);
  const totalTarget = sumValues(goals, (goal) => goal.targetAmount ?? goal.target_amount ?? goal.target ?? goal.goal_amount);
  return totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 999) : null;
}

function countGoalDeadlines(goals = []) {
  return asArray(goals).filter((goal) => hasValue(goal.targetDate || goal.target_date || goal.deadline || goal.dueDate || goal.due_date)).length;
}

function expectedIncomeFromSources(incomeSources = []) {
  const explicitRecurringTotal = sumValues(incomeSources, (source) =>
    source.monthlyAmount ??
      source.monthly_amount ??
      source.expectedMonthlyIncome ??
      source.expected_monthly_income ??
      source.recurringAmount ??
      source.recurring_amount ??
      source.salaryAmount ??
      source.salary_amount
  );

  return explicitRecurringTotal > 0 ? explicitRecurringTotal : null;
}

function formatActivityCount(expenses = [], transactions = []) {
  const total = asArray(expenses).length + asArray(transactions).length;
  return total > 0 ? `${total} visible record(s)` : null;
}

export function buildClaraForecastPhaseOneSnapshot(effectiveContext = {}, fallbackContext = {}) {
  const wallets = asArray(effectiveContext.wallets);
  const budgets = asArray(effectiveContext.budgets);
  const expenses = asArray(effectiveContext.expenses);
  const walletTransactions = asArray(effectiveContext.walletTransactions);
  const transfers = asArray(effectiveContext.transfers);
  const incomes = asArray(effectiveContext.incomes);
  const incomeSources = asArray(effectiveContext.incomeSources);
  const savingsGoals = asArray(effectiveContext.savingsGoals);
  const debtObligations = asArray(effectiveContext.debtObligations);
  const emergencyFund = effectiveContext.emergencyFund || null;
  const memoryContext = effectiveContext.memoryContext || null;

  const totalWalletBalance = sumValues(wallets, getWalletBalance);
  const emergencySaved = getEmergencySaved(emergencyFund || {});
  const protectedWalletBalance = sumValues(wallets, getProtectedWalletAmount);
  const emergencyProtectedAmount = emergencySaved || protectedWalletBalance || 0;
  const protectedMoney = Math.max(emergencyProtectedAmount, protectedWalletBalance, 0);
  const spendableWalletBalance = Math.max(totalWalletBalance - protectedMoney, 0);

  const paydayTiming = firstProfileValue(effectiveContext, fallbackContext, ["paydayCycle", "payday", "incomeTiming", "incomePattern"]);
  const workSchedule = firstProfileValue(effectiveContext, fallbackContext, ["scheduleRoutine", "workSchedule", "workType"]);
  const sleepPattern = firstProfileValue(effectiveContext, fallbackContext, ["sleepPattern"]);
  const energyDrop = firstProfileValue(effectiveContext, fallbackContext, ["energyLevelTrends", "energyDrop"]);
  const burnoutIndicators = firstProfileValue(effectiveContext, fallbackContext, ["burnoutIndicators", "workExhaustion"]);

  const stressSpendingHabit =
    firstProfileValue(effectiveContext, fallbackContext, ["stressSpendingHabits", "stressSpendingHabit"]) ||
    findMemorySignal(memoryContext, ["stress", "pressure"]);
  const commonImpulsePurchases =
    firstProfileValue(effectiveContext, fallbackContext, ["commonImpulsivePurchases", "commonImpulsePurchases"]) ||
    findMemorySignal(memoryContext, ["impulse", "shopee", "lazada", "coffee", "food"]);
  const biggestSpendingWeakness =
    firstProfileValue(effectiveContext, fallbackContext, ["biggestSpendingWeakness", "spendingWeakness"]) ||
    findMemorySignal(memoryContext, ["weakness", "leak", "overspend"]);

  const recurringExpensesCount = expenses.filter((expense) => labelContains(expense, ["recurring", "monthly", "subscription", "bill", "rent"])).length;
  const subscriptionsCount = expenses.filter((expense) => labelContains(expense, ["subscription", "netflix", "spotify", "app", "tool"])).length;
  const billsCount = expenses.filter((expense) => labelContains(expense, ["bill", "electric", "water", "internet", "rent", "load"])).length;

  const plannedExpensesCount = countByStatus(expenses, ["planned"]);
  const unplannedExpensesCount = countByStatus(expenses, ["unplanned"]);
  const outsidePlanSpendingCount = countByStatus(expenses, ["unplanned", "outside_plan"]);
  const totalBudgetAmount = sumValues(budgets, getBudgetAmount);
  const totalExpenseAmount = sumValues(expenses, (expense) => expense.amount);
  const budgetRemaining = budgets.length ? Math.max(totalBudgetAmount - totalExpenseAmount, 0) : null;

  const expectedIncome = expectedIncomeFromSources(incomeSources) ?? (incomes.length ? sumValues(incomes, (income) => income.amount) : null);
  const savingsProgress = calculateSavingsProgress(savingsGoals);
  const hasScheduleData = [paydayTiming, workSchedule, sleepPattern, energyDrop, burnoutIndicators].some(hasValue);
  const hasBehaviorData = [stressSpendingHabit, commonImpulsePurchases, biggestSpendingWeakness].some(hasValue) || unplannedExpensesCount > 0;
  const hasRecurringExpenseData = recurringExpensesCount > 0 || subscriptionsCount > 0 || billsCount > 0;

  const missingData = [];
  if (!wallets.length) missingData.push("No wallet data");
  if (!expenses.length && !walletTransactions.length) missingData.push("No recent expenses or transactions");
  if (!incomeSources.length && !incomes.length) missingData.push("No income source");
  if (!hasValue(paydayTiming)) missingData.push("No payday timing");
  if (!emergencyFund && !emergencyProtectedAmount) missingData.push("No emergency fund data");
  if (!debtObligations.length) missingData.push("No debt obligation data");
  if (!hasRecurringExpenseData) missingData.push("No recurring expense data");
  if (!hasScheduleData) missingData.push("No schedule/routine data");

  const usableGroups = [
    wallets.length > 0 || totalWalletBalance > 0 || spendableWalletBalance > 0,
    incomeSources.length > 0 || incomes.length > 0 || expectedIncome !== null,
    expenses.length > 0 || walletTransactions.length > 0 || transfers.length > 0,
    budgets.length > 0 || budgetRemaining !== null,
    savingsGoals.length > 0 || Boolean(emergencyFund) || emergencyProtectedAmount > 0,
    hasBehaviorData,
    hasScheduleData || hasValue(paydayTiming),
  ].filter(Boolean).length;

  const dataCompleteness = usableGroups >= 6 ? "strong" : usableGroups >= 3 ? "medium" : "weak";

  return {
    currentMoney: {
      walletCount: wallets.length,
      totalWalletBalance,
      spendableWalletBalance,
      protectedWalletBalance,
      moneyLeft: firstValue(fallbackContext, ["dashboardSummarySnapshot.moneyLeft", "dashboardCardsLiveSnapshot.moneyLeft", "moneyLeft"]) ?? spendableWalletBalance,
      safeSpendableMoney: spendableWalletBalance,
      emergencyProtectedAmount,
    },
    moneyComingIn: {
      incomeRecordsCount: incomes.length,
      incomeSourcesCount: incomeSources.length,
      expectedIncome,
      paydayTiming,
    },
    moneyGoingOut: {
      expensesCount: expenses.length,
      transactionsCount: walletTransactions.length,
      transfersCount: transfers.length,
      recurringExpensesCount,
      subscriptionsCount,
      billsCount,
      debtObligationsCount: debtObligations.length,
    },
    budgetPressure: {
      budgetsCount: budgets.length,
      budgetCategoriesCount: budgets.length,
      budgetRemaining,
      plannedExpensesCount,
      unplannedExpensesCount,
      outsidePlanSpendingCount,
    },
    savingsPressure: {
      savingsGoalsCount: savingsGoals.length,
      savingsProgress,
      emergencyFund: emergencySaved || null,
      goalDeadlinesCount: countGoalDeadlines(savingsGoals),
    },
    behaviorRisk: {
      recentExpenseActivity: formatActivityCount(expenses, walletTransactions),
      stressSpendingHabit,
      commonImpulsePurchases,
      biggestSpendingWeakness,
      unplannedSpendingCount: unplannedExpensesCount,
    },
    schedulePaydayRisk: {
      paydayCycle: paydayTiming,
      workSchedule,
      sleepPattern,
      energyDrop,
      burnoutIndicators,
    },
    missingData,
    dataCompleteness,
    hasUsableData: usableGroups > 0,
    dataReadStatus: effectiveContext.dataReadStatus || {},
    source: effectiveContext.source || "real",
    generatedAt: new Date().toISOString(),
    forecastRecords: {
      wallets,
      budgets,
      expenses,
      walletTransactions,
      transfers,
      incomes,
      incomeSources,
      savingsGoals,
      debtObligations,
      emergencyFund,
    },
  };
}
