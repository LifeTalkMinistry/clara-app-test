const NOT_ENOUGH_DATA = "Not enough data yet";
const CURRENT_POSITION_NOT_ENOUGH_DATA = "Not enough data to generate result";
const NO_DEBT_RECORDS = "No debt records found";
const NO_COST_DRIVER = "No major cost driver detected";
const MAX_HORIZON_MONTHS = 12;
const OPENING_BALANCE_WARNING = "Opening balance excluded from monthly income projection.";
const INCOME_SOURCE_BALANCE_WARNING = "Income sources were not used as monthly income because no explicit recurring amount was found.";
const GOOD_HABIT_ESTIMATE_WARNING = "Good habit value is estimated from current behavior, not guaranteed.";
const SPARSE_HORIZON_WARNING = "Sparse active months inside selected horizon.";
const WALLET_EXPENSE_LINK_WARNING = "Wallet transaction expenses exist but were not merged due to missing link fields.";
const BUDGET_INTERPRETATION_WARNING = "Budget records exist but could not be interpreted for leak detection.";
const DEBT_PAYMENT_EXPENSE_WARNING = "Debt payment may already be included in expenses.";

function hasValue(value) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === "object") return Object.values(value).some(hasValue);
  return Boolean(value);
}

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function amount(value, fallback = NOT_ENOUGH_DATA) {
  if (!hasValue(value)) return fallback;
  return `₱${toNumber(value).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function count(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function stat(label, value) {
  return { label, value };
}

function normalizeHorizonMonths(value = 1) {
  const months = Math.round(toNumber(value));
  return Math.min(Math.max(months || 1, 1), MAX_HORIZON_MONTHS);
}

function monthLabel(months = 1) {
  const safeMonths = normalizeHorizonMonths(months);
  return `${safeMonths} month${safeMonths === 1 ? "" : "s"}`;
}

function normalizeCompleteness(value = "") {
  const normalized = String(value || "weak").trim().toLowerCase();
  if (normalized === "strong") return "strong";
  if (normalized === "medium" || normalized === "partial" || normalized === "moderate") return "medium";
  return "weak";
}

function labelCompleteness(value = "") {
  const normalized = normalizeCompleteness(value);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function normalizeMissingData(snapshot = {}) {
  const missing = Array.isArray(snapshot.missingData) ? snapshot.missingData : [];
  return missing.map((item) => String(item || "").trim()).filter(Boolean);
}

function firstNumber(source = {}, keys = []) {
  for (const key of keys) {
    const value = source?.[key];
    if (hasValue(value)) return toNumber(value);
  }
  return 0;
}

function firstText(source = {}, keys = []) {
  for (const key of keys) {
    const value = source?.[key];
    if (hasValue(value)) return String(value).trim();
  }
  return "";
}

function currentMoney(snapshot = {}) {
  const data = snapshot.currentMoney || {};
  return {
    walletCount: data.walletCount ?? snapshot.counts?.wallets,
    totalWalletBalance: data.totalWalletBalance,
    safeSpendableMoney: data.safeSpendableMoney ?? data.spendableWalletBalance ?? data.moneyLeft ?? data.currentMoneyLeft,
    emergencyProtectedAmount: data.emergencyProtectedAmount,
  };
}

function getRecords(snapshot = {}) {
  const forecastRecords = snapshot.forecastRecords || {};
  return {
    wallets: toArray(forecastRecords.wallets),
    incomes: toArray(forecastRecords.incomes),
    incomeSources: toArray(forecastRecords.incomeSources),
    expenses: toArray(forecastRecords.expenses),
    walletTransactions: toArray(forecastRecords.walletTransactions),
    transfers: toArray(forecastRecords.transfers),
    budgets: toArray(forecastRecords.budgets),
    savingsGoals: toArray(forecastRecords.savingsGoals),
    debtObligations: toArray(forecastRecords.debtObligations),
    emergencyFund: forecastRecords.emergencyFund || snapshot.savingsPressure?.emergencyFund || null,
  };
}

function getRecordDate(record = {}) {
  const raw = record.date
    || record.transactionDate
    || record.transaction_date
    || record.paidAt
    || record.paid_at
    || record.lastPaidAt
    || record.last_paid_at
    || record.activityDate
    || record.activity_date
    || record.createdAt
    || record.created_at
    || record.updatedAt
    || record.updated_at
    || record.lastActivityAt
    || record.last_activity_at
    || record.targetDate
    || record.target_date
    || record.dueDate
    || record.due_date
    || "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthsBetweenInclusive(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return Math.max(months, 0);
}

function isRecentEnough(date, horizonMonths) {
  if (!date) return false;
  const boundary = new Date();
  boundary.setMonth(boundary.getMonth() - normalizeHorizonMonths(horizonMonths));
  return date >= boundary;
}

function recordsInWindow(records = [], horizonMonths = 1) {
  return toArray(records).filter((record) => isRecentEnough(getRecordDate(record), horizonMonths));
}

function sum(records = [], getter) {
  return toArray(records).reduce((total, record) => total + toNumber(getter(record)), 0);
}

function cleanLower(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function getExpenseAmount(expense = {}) {
  return firstNumber(expense, ["amount", "total", "value"]);
}

function getIncomeAmount(income = {}) {
  return firstNumber(income, ["amount", "total", "value"]);
}

function getExplicitRecurringIncomeSourceAmount(source = {}) {
  return firstNumber(source, [
    "monthlyAmount",
    "monthly_amount",
    "expectedMonthlyIncome",
    "expected_monthly_income",
    "recurringAmount",
    "recurring_amount",
    "salaryAmount",
    "salary_amount",
  ]);
}

function getWalletBalance(wallet = {}) {
  return firstNumber(wallet, ["balance", "currentBalance", "current_balance", "derived_balance", "spendableBalance", "available_balance"]);
}

function getEmergencySaved(emergencyFund = {}) {
  return firstNumber(emergencyFund || {}, ["savedAmount", "saved_amount", "saved", "currentAmount", "current_amount", "amount", "balance"]);
}

function getEmergencyTarget(emergencyFund = {}) {
  return firstNumber(emergencyFund || {}, ["targetAmount", "target_amount", "target", "goal_amount"]);
}

function getGoalSaved(goal = {}) {
  return firstNumber(goal, ["savedAmount", "saved_amount", "saved", "current_amount", "currentAmount", "amount", "balance"]);
}

function getGoalTarget(goal = {}) {
  return firstNumber(goal, ["targetAmount", "target_amount", "target", "goal_amount"]);
}

function getDebtBalance(debt = {}) {
  return firstNumber(debt, ["balance", "totalDebt", "total_debt", "remainingBalance", "remaining_balance", "debt_balance", "amount"]);
}

function getDebtMonthlyPayment(debt = {}) {
  return firstNumber(debt, ["monthlyDebt", "monthly_debt", "monthlyPayment", "monthly_payment", "payment", "scheduledPayment", "scheduled_payment"]);
}

function transactionType(transaction = {}) {
  return firstText(transaction, ["type", "transaction_type", "kind", "movementType", "movement_type"]).toLowerCase();
}

function isOpeningBalanceTransaction(transaction = {}) {
  const type = transactionType(transaction);
  const source = cleanLower(`${transaction.source || ""} ${transaction.reason || ""} ${transaction.title || ""} ${transaction.note || ""}`);
  return type === "opening_balance" || source.includes("opening balance");
}

function isTransferOrInternalMovement(transaction = {}) {
  const type = transactionType(transaction);
  const text = cleanLower(`${type} ${transaction.source || ""} ${transaction.title || ""} ${transaction.note || ""} ${transaction.category || ""}`);
  return ["transfer", "internal_transfer", "wallet_transfer", "move", "movement", "internal_movement"].includes(type)
    || text.includes("internal movement")
    || text.includes("wallet transfer")
    || text.includes("transfer between");
}

function isIncomeTransaction(transaction = {}) {
  if (isOpeningBalanceTransaction(transaction) || isTransferOrInternalMovement(transaction)) return false;
  const type = transactionType(transaction);
  return ["income", "add", "cash_in", "deposit", "credit"].includes(type);
}

function isExpenseTransaction(transaction = {}) {
  if (isTransferOrInternalMovement(transaction)) return false;
  const type = transactionType(transaction);
  return ["expense", "withdrawal", "debit", "spend", "purchase", "cash_out"].includes(type);
}

function hasOpeningBalanceIncome(records = {}) {
  return toArray(records.walletTransactions).some(isOpeningBalanceTransaction)
    || toArray(records.incomes).some((income) => transactionType(income) === "opening_balance" || isOpeningBalanceTransaction(income));
}

function categoryOf(expense = {}) {
  return firstText(expense, ["category", "categoryName", "category_name", "budgetCategory", "budget_category", "title", "name", "note", "type"]) || "Uncategorized";
}

function isUnplanned(expense = {}) {
  const textValue = `${expense.planningStatus || ""} ${expense.planning_status || ""} ${expense.budgetStatus || ""} ${expense.budget_status || ""} ${expense.status || ""} ${expense.needType || ""} ${expense.need_type || ""}`.toLowerCase();
  return /unplanned|outside|undocumented|over budget|over-budget|budget risk|not planned|unbudgeted/.test(textValue);
}

function hasExplicitRiskStatus(expense = {}) {
  return isUnplanned(expense);
}

function linkKeys(record = {}) {
  return [
    record.id,
    record.expenseId,
    record.expense_id,
    record.sourceExpenseId,
    record.source_expense_id,
    record.referenceId,
    record.reference_id,
    record.linkedExpenseId,
    record.linked_expense_id,
  ].map((value) => String(value || "").trim()).filter(Boolean);
}

function transactionLinkKeys(record = {}) {
  return [
    record.expenseId,
    record.expense_id,
    record.sourceExpenseId,
    record.source_expense_id,
    record.referenceId,
    record.reference_id,
    record.linkedExpenseId,
    record.linked_expense_id,
  ].map((value) => String(value || "").trim()).filter(Boolean);
}

function buildCanonicalExpenseEvents(records, horizonMonths, auditWarnings = []) {
  const horizon = normalizeHorizonMonths(horizonMonths);
  const expenseWindow = recordsInWindow(records.expenses, horizon);
  const walletExpenseWindow = recordsInWindow(toArray(records.walletTransactions).filter(isExpenseTransaction), horizon);
  const expenseKeys = new Set(expenseWindow.flatMap(linkKeys));
  const canonical = expenseWindow.map((expense) => ({ ...expense, __source: "expense" }));

  if (!walletExpenseWindow.length) return canonical;

  if (!expenseWindow.length) {
    return walletExpenseWindow.map((transaction) => ({ ...transaction, __source: "wallet_transaction" }));
  }

  let blockedForMissingLinks = false;
  for (const transaction of walletExpenseWindow) {
    const links = transactionLinkKeys(transaction);
    if (!links.length) {
      blockedForMissingLinks = true;
      continue;
    }
    const isLinkedToExpense = links.some((key) => expenseKeys.has(key));
    if (!isLinkedToExpense) canonical.push({ ...transaction, __source: "wallet_transaction" });
  }

  if (blockedForMissingLinks && !auditWarnings.includes(WALLET_EXPENSE_LINK_WARNING)) {
    auditWarnings.push(WALLET_EXPENSE_LINK_WARNING);
  }

  return canonical;
}

function categoryTotals(expenses = []) {
  return expenses.reduce((map, expense) => {
    const category = categoryOf(expense);
    map.set(category, (map.get(category) || 0) + getExpenseAmount(expense));
    return map;
  }, new Map());
}

function topCategory(map = new Map(), horizon = 1) {
  return [...map.entries()]
    .filter(([, value]) => value > 0)
    .sort((left, right) => right[1] - left[1])
    .map(([category, value]) => ({ category, amount: value, monthlyAmount: value / Math.max(horizon, 1) }))[0] || null;
}

function getBudgetCategory(budget = {}) {
  return firstText(budget, ["category", "title", "name", "label", "budget_category"]);
}

function getBudgetAllocation(budget = {}) {
  const allocation = firstNumber(budget, [
    "limit",
    "amount",
    "plannedAmount",
    "planned_amount",
    "allocatedAmount",
    "allocated_amount",
    "monthlyLimit",
    "monthly_limit",
    "categoryLimit",
    "category_limit",
  ]);
  const remaining = firstNumber(budget, ["remainingAmount", "remaining_amount"]);
  if (allocation > 0) return allocation;
  if (remaining > 0) return remaining;
  return 0;
}

function buildBudgetMap(records = {}, auditWarnings = []) {
  const map = new Map();
  const budgets = toArray(records.budgets);
  let uninterpretable = false;

  for (const budget of budgets) {
    const category = getBudgetCategory(budget);
    const allocation = getBudgetAllocation(budget);
    if (!category || allocation <= 0) {
      uninterpretable = true;
      continue;
    }
    map.set(category, (map.get(category) || 0) + allocation);
  }

  if (budgets.length && !map.size && uninterpretable && !auditWarnings.includes(BUDGET_INTERPRETATION_WARNING)) {
    auditWarnings.push(BUDGET_INTERPRETATION_WARNING);
  }

  return map;
}

function buildLeakAnalysis(expenses = [], records = {}, horizon = 1, auditWarnings = []) {
  const allCategoryTotals = categoryTotals(expenses);
  const biggestOverallCategory = topCategory(allCategoryTotals, horizon);
  const explicitRiskExpenses = expenses.filter(hasExplicitRiskStatus);
  const unplannedTotals = categoryTotals(explicitRiskExpenses);
  const totalUnplanned = sum(explicitRiskExpenses, getExpenseAmount);
  const riskTotals = new Map(unplannedTotals);
  const budgetMap = buildBudgetMap(records, auditWarnings);
  let totalOverBudget = 0;
  let hasBudgetOverspend = false;

  for (const [category, spent] of allCategoryTotals.entries()) {
    const allocation = budgetMap.get(category) || 0;
    if (allocation > 0 && spent > allocation) {
      const overage = spent - allocation;
      totalOverBudget += overage;
      hasBudgetOverspend = true;
      riskTotals.set(category, (riskTotals.get(category) || 0) + overage);
    }
  }

  const repeatedUnplanned = explicitRiskExpenses.length >= 2;
  const biggestRiskyCategory = topCategory(riskTotals, horizon);
  let leakEvidenceType = "none";
  if (hasBudgetOverspend) leakEvidenceType = "budget";
  else if (totalUnplanned > 0) leakEvidenceType = "explicit";
  else if (repeatedUnplanned) leakEvidenceType = "repeated_unplanned";

  const badLeakCost = leakEvidenceType === "budget"
    ? Math.max(totalOverBudget, totalUnplanned)
    : totalUnplanned;

  return {
    allCategoryTotals,
    riskyCategoryTotals: riskTotals,
    biggestOverallCategory,
    biggestRiskyCategory: biggestRiskyCategory || null,
    totalUnplanned,
    totalOverBudget,
    badLeakCost: Math.max(0, badLeakCost),
    unplannedCount: explicitRiskExpenses.length,
    leakEvidenceType,
    leakIsActualOrInferred: leakEvidenceType === "none" ? "none" : "actual",
  };
}

function activeMonthCounts(records = {}) {
  const financialMonths = new Set();
  const incomeMonths = new Set();
  const expenseMonths = new Set();
  const transactionMonths = new Set();
  const usableDates = [];

  const addMonth = (targetSet, record, alsoFinancial = true) => {
    const date = getRecordDate(record);
    const key = monthKey(date);
    if (!key) return;
    targetSet.add(key);
    if (alsoFinancial) financialMonths.add(key);
    usableDates.push(date);
  };

  toArray(records.incomes).forEach((record) => {
    if (getIncomeAmount(record) > 0 && !isOpeningBalanceTransaction(record)) addMonth(incomeMonths, record);
  });

  toArray(records.expenses).forEach((record) => {
    if (getExpenseAmount(record) > 0) addMonth(expenseMonths, record);
  });

  toArray(records.walletTransactions).forEach((record) => {
    if (isIncomeTransaction(record) && getIncomeAmount(record) > 0) {
      addMonth(transactionMonths, record);
      addMonth(incomeMonths, record);
      return;
    }
    if (isExpenseTransaction(record) && getExpenseAmount(record) > 0) {
      addMonth(transactionMonths, record);
      addMonth(expenseMonths, record);
    }
  });

  toArray(records.debtObligations).forEach((record) => {
    if (getDebtMonthlyPayment(record) > 0 && getRecordDate(record)) addMonth(financialMonths, record, false);
  });

  toArray(records.savingsGoals).forEach((record) => {
    if (getGoalSaved(record) > 0 && getRecordDate(record)) addMonth(financialMonths, record, false);
  });

  if (records.emergencyFund && getEmergencySaved(records.emergencyFund) > 0 && getRecordDate(records.emergencyFund)) {
    addMonth(financialMonths, records.emergencyFund, false);
  }

  const minDate = usableDates.length ? usableDates.reduce((oldest, date) => (date < oldest ? date : oldest), usableDates[0]) : null;
  const maxDate = usableDates.length ? usableDates.reduce((latest, date) => (date > latest ? date : latest), usableDates[0]) : null;
  const dateSpanMonths = monthsBetweenInclusive(minDate, maxDate);
  const activeFinancialMonths = financialMonths.size;

  return {
    dateSpanMonths: Math.min(MAX_HORIZON_MONTHS, dateSpanMonths),
    activeFinancialMonths,
    activeIncomeMonths: incomeMonths.size,
    activeExpenseMonths: expenseMonths.size,
    activeTransactionMonths: transactionMonths.size,
    availableHistoryMonths: activeFinancialMonths,
    sparseHistoryWarning: dateSpanMonths > activeFinancialMonths ? "Sparse history detected: date span is larger than usable active financial months." : "",
  };
}

export function buildForecastHistorySummary(snapshot = {}) {
  return activeMonthCounts(getRecords(snapshot));
}

function detectAvailableHistoryMonths(snapshot = {}) {
  return buildForecastHistorySummary(snapshot).availableHistoryMonths;
}

export function getClaraForecastHorizonSummary(snapshot = {}) {
  const history = buildForecastHistorySummary(snapshot);
  const availableHistoryMonths = detectAvailableHistoryMonths(snapshot);
  const eligibleMonths = Array.from({ length: Math.min(MAX_HORIZON_MONTHS, availableHistoryMonths) }, (_, index) => index + 1);
  return {
    ...history,
    availableHistoryMonths,
    eligibleMonths,
    maxHorizonMonths: MAX_HORIZON_MONTHS,
    hasAnyEligibleHorizon: eligibleMonths.length > 0,
  };
}

export function canBuildClaraForecast(snapshot = {}, horizonMonths = 1) {
  const horizon = normalizeHorizonMonths(horizonMonths);
  const summary = getClaraForecastHorizonSummary(snapshot);
  const records = getRecords(snapshot);
  const hasMoneyContext = summary.activeFinancialMonths > 0
    || toArray(records.wallets).length > 0
    || toArray(records.incomes).length > 0
    || toArray(records.expenses).length > 0
    || toArray(records.walletTransactions).some((transaction) => isIncomeTransaction(transaction) || isExpenseTransaction(transaction));

  return {
    allowed: summary.availableHistoryMonths >= horizon && hasMoneyContext,
    horizon,
    availableHistoryMonths: summary.availableHistoryMonths,
    reason: !hasMoneyContext
      ? "CLARA needs at least one wallet, income, expense, or transaction record before forecasting."
      : summary.availableHistoryMonths < horizon
        ? `CLARA only has about ${summary.availableHistoryMonths} active financial month${summary.availableHistoryMonths === 1 ? "" : "s"} of usable history. Try a shorter timeframe first.`
        : "Ready",
  };
}

function activeMonthsInWindow(records = {}, horizon = 1) {
  return activeMonthCounts({
    ...records,
    incomes: recordsInWindow(records.incomes, horizon),
    expenses: recordsInWindow(records.expenses, horizon),
    walletTransactions: recordsInWindow(records.walletTransactions, horizon),
    debtObligations: recordsInWindow(records.debtObligations, horizon),
    savingsGoals: recordsInWindow(records.savingsGoals, horizon),
    emergencyFund: isRecentEnough(getRecordDate(records.emergencyFund || {}), horizon) ? records.emergencyFund : null,
  });
}

function monthlyAverages(snapshot = {}, horizonMonths = 1, auditWarnings = []) {
  const horizon = normalizeHorizonMonths(horizonMonths);
  const records = getRecords(snapshot);
  const incomeWindow = recordsInWindow(records.incomes, horizon).filter((income) => !isOpeningBalanceTransaction(income));
  const transactionIncomeWindow = recordsInWindow(records.walletTransactions.filter(isIncomeTransaction), horizon);
  const incomesToUse = incomeWindow.length ? incomeWindow : transactionIncomeWindow;
  const expensesToUse = buildCanonicalExpenseEvents(records, horizon, auditWarnings);
  const totalIncomeEvents = sum(incomesToUse, getIncomeAmount);
  const explicitRecurringIncome = sum(records.incomeSources, getExplicitRecurringIncomeSourceAmount);
  const incomeSourceHasBalances = records.incomeSources.some((source) => firstNumber(source, ["currentBalance", "current_balance", "balance", "totalMoneyIn", "total_money_in"]) > 0);

  if (hasOpeningBalanceIncome(records) && !auditWarnings.includes(OPENING_BALANCE_WARNING)) {
    auditWarnings.push(OPENING_BALANCE_WARNING);
  }

  if (records.incomeSources.length && explicitRecurringIncome <= 0 && incomeSourceHasBalances && !auditWarnings.includes(INCOME_SOURCE_BALANCE_WARNING)) {
    auditWarnings.push(INCOME_SOURCE_BALANCE_WARNING);
  }

  const totalIncome = totalIncomeEvents > 0 ? totalIncomeEvents : explicitRecurringIncome;
  const totalExpenses = sum(expensesToUse, getExpenseAmount);
  const historyWindow = activeMonthsInWindow(records, horizon);
  const denominatorUsed = Math.max(historyWindow.activeFinancialMonths, 1);
  const incomeDenominator = Math.max(historyWindow.activeIncomeMonths, historyWindow.activeFinancialMonths, 1);
  const expenseDenominator = Math.max(historyWindow.activeExpenseMonths, historyWindow.activeFinancialMonths, 1);
  const leak = buildLeakAnalysis(expensesToUse, records, horizon, auditWarnings);
  const unplannedDenominator = Math.max(historyWindow.activeExpenseMonths, 1);

  if (horizon > historyWindow.activeFinancialMonths && historyWindow.activeFinancialMonths > 0 && !auditWarnings.includes(SPARSE_HORIZON_WARNING)) {
    auditWarnings.push(SPARSE_HORIZON_WARNING);
  }

  const money = currentMoney(snapshot);
  const walletRecordsTotal = sum(records.wallets, getWalletBalance);
  const currentWalletTotalAvailable = records.wallets.length > 0 || hasValue(money.totalWalletBalance);
  const currentWalletTotal = walletRecordsTotal || money.totalWalletBalance || 0;
  const currentMoneyLeftAvailable = hasValue(money.safeSpendableMoney) || currentWalletTotalAvailable;
  const currentMoneyLeft = hasValue(money.safeSpendableMoney) ? toNumber(money.safeSpendableMoney) : currentWalletTotal;
  const currentEmergency = getEmergencySaved(records.emergencyFund || {}) || money.emergencyProtectedAmount || 0;
  const emergencyTarget = getEmergencyTarget(records.emergencyFund || {});
  const totalSavingsSaved = sum(records.savingsGoals, getGoalSaved);
  const totalSavingsTarget = sum(records.savingsGoals, getGoalTarget);
  const totalDebtBalance = sum(records.debtObligations, getDebtBalance);
  const monthlyDebtPayment = sum(records.debtObligations, getDebtMonthlyPayment);
  const averageMonthlyIncome = totalIncome / incomeDenominator;
  const averageMonthlyExpenses = totalExpenses / expenseDenominator;
  const averageMonthlyUnplanned = leak.totalUnplanned / unplannedDenominator;
  const netMonthlyCashFlow = averageMonthlyIncome - averageMonthlyExpenses - monthlyDebtPayment;

  if (monthlyDebtPayment > 0 && expensesToUse.some((expense) => cleanLower(`${categoryOf(expense)} ${expense.title || ""} ${expense.name || ""} ${expense.note || ""}`).match(/debt|loan|payment|utang|installment/)) && !auditWarnings.includes(DEBT_PAYMENT_EXPENSE_WARNING)) {
    auditWarnings.push(DEBT_PAYMENT_EXPENSE_WARNING);
  }

  const emergencyMonthlyProgress = Math.max(0, currentEmergency > 0 ? Math.min(netMonthlyCashFlow * 0.2, currentEmergency / denominatorUsed) : 0);
  const savingsMonthlyProgress = Math.max(0, totalSavingsSaved > 0 ? Math.min(netMonthlyCashFlow * 0.25, totalSavingsSaved / denominatorUsed) : 0);

  return {
    horizon,
    incomeRecordsUsed: incomesToUse.length,
    expenseRecordsUsed: expensesToUse.length,
    transactionRecordsUsed: transactionIncomeWindow.length + expensesToUse.filter((record) => record.__source === "wallet_transaction").length,
    budgetRecordsUsed: records.budgets.length,
    savingsGoalRecordsUsed: records.savingsGoals.length,
    debtRecordsUsed: records.debtObligations.length,
    activeFinancialMonthsInWindow: historyWindow.activeFinancialMonths,
    activeIncomeMonthsInWindow: historyWindow.activeIncomeMonths,
    activeExpenseMonthsInWindow: historyWindow.activeExpenseMonths,
    activeTransactionMonthsInWindow: historyWindow.activeTransactionMonths,
    denominatorUsed,
    currentWalletTotal,
    currentWalletTotalAvailable,
    currentMoneyLeft,
    currentMoneyLeftAvailable,
    currentEmergency,
    emergencyTarget,
    totalSavingsSaved,
    totalSavingsTarget,
    totalDebtBalance,
    monthlyDebtPayment,
    totalIncomeInWindow: totalIncomeEvents,
    explicitRecurringIncome,
    totalExpensesInWindow: totalExpenses,
    totalUnplannedInWindow: leak.totalUnplanned,
    totalOverBudgetInWindow: leak.totalOverBudget,
    averageMonthlyIncome,
    averageMonthlyExpenses,
    averageMonthlyUnplanned,
    netMonthlyCashFlow,
    projectedIncome: averageMonthlyIncome * horizon,
    projectedExpenses: averageMonthlyExpenses * horizon,
    projectedUnplannedLeak: leak.badLeakCost,
    biggestLeak: leak.biggestOverallCategory,
    biggestRiskyCategory: leak.biggestRiskyCategory,
    biggestOverallCategory: leak.biggestOverallCategory,
    unplannedCount: leak.unplannedCount,
    emergencyMonthlyProgress,
    savingsMonthlyProgress,
    leakEvidenceType: leak.leakEvidenceType,
    leakIsActualOrInferred: leak.leakIsActualOrInferred,
    badLeakCost: leak.badLeakCost,
  };
}

function allocateRecoveredLeak(recoveredLeakPotential, options = {}) {
  const total = Math.max(0, toNumber(recoveredLeakPotential));
  const projectedDebtBalance = Math.max(0, toNumber(options.projectedDebtBalance));
  const hasDebt = Boolean(options.hasDebt && projectedDebtBalance > 0);

  if (!total) {
    return { moneyLeft: 0, emergency: 0, savings: 0, debt: 0, totalAllocated: 0, allocationIntegrityPass: true };
  }

  if (!hasDebt) {
    const moneyLeft = total * 0.2;
    const emergency = total * 0.35;
    const savings = total - moneyLeft - emergency;
    const totalAllocated = moneyLeft + emergency + savings;
    return { moneyLeft, emergency, savings, debt: 0, totalAllocated, allocationIntegrityPass: totalAllocated <= total + 0.0001 };
  }

  const moneyLeft = total * 0.2;
  const plannedDebt = total * 0.4;
  const debt = Math.min(plannedDebt, projectedDebtBalance);
  const unusedDebtAllocation = Math.max(0, plannedDebt - debt);
  const emergency = total * 0.2 + unusedDebtAllocation * 0.5;
  const savings = total * 0.2 + unusedDebtAllocation * 0.5;
  const totalAllocated = moneyLeft + emergency + savings + debt;
  return { moneyLeft, emergency, savings, debt, totalAllocated, allocationIntegrityPass: totalAllocated <= total + 0.0001 };
}

function directionFromProjection(projectedMoneyLeft, netCashFlow, projectedNetPosition) {
  if (projectedNetPosition > 0 && netCashFlow > 0) return "Improving";
  if (projectedMoneyLeft >= 0 && netCashFlow >= 0) return "Stable";
  if (projectedMoneyLeft >= 0) return "Under pressure";
  return "At risk";
}

function buildProjection(snapshot = {}, horizonMonths = 1, auditWarnings = []) {
  const avg = monthlyAverages(snapshot, horizonMonths, auditWarnings);
  const horizon = avg.horizon;
  const badLeakCost = avg.badLeakCost;
  const goodEmergencyGrowth = avg.emergencyMonthlyProgress * horizon;
  const goodSavingsGrowth = avg.savingsMonthlyProgress * horizon;
  const debtReduction = Math.min(avg.totalDebtBalance, avg.monthlyDebtPayment * horizon);
  const projectedDebtBalance = Math.max(0, avg.totalDebtBalance - debtReduction);
  const projectedMoneyLeftIfSame = avg.currentMoneyLeft + avg.netMonthlyCashFlow * horizon;
  const projectedWalletIfSame = avg.currentWalletTotal + avg.netMonthlyCashFlow * horizon;
  const projectedEmergencyIfSame = avg.currentEmergency;
  const projectedSavingsIfSame = avg.totalSavingsSaved;
  const projectedEmergencyIfGood = avg.currentEmergency + goodEmergencyGrowth;
  const projectedSavingsIfGood = avg.totalSavingsSaved + goodSavingsGrowth;
  const projectedMoneyLeftIfGood = projectedMoneyLeftIfSame;
  const projectedWalletIfGood = projectedWalletIfSame;
  const recoveredLeakPotential = Math.max(0, badLeakCost);
  const allocation = allocateRecoveredLeak(recoveredLeakPotential, {
    projectedDebtBalance,
    hasDebt: avg.totalDebtBalance > 0,
  });
  const projectedMoneyLeftIfImproved = projectedMoneyLeftIfGood + allocation.moneyLeft;
  const projectedWalletIfImproved = projectedWalletIfGood + allocation.moneyLeft;
  const projectedEmergencyIfImproved = projectedEmergencyIfGood + allocation.emergency;
  const projectedSavingsIfImproved = projectedSavingsIfGood + allocation.savings;
  const projectedDebtBalanceIfImproved = Math.max(0, projectedDebtBalance - allocation.debt);
  const projectedTotalAvailable = projectedMoneyLeftIfImproved + projectedEmergencyIfImproved + projectedSavingsIfImproved;
  const projectedNetPositionSame = projectedMoneyLeftIfSame + projectedEmergencyIfSame + projectedSavingsIfSame - avg.totalDebtBalance;
  const projectedNetPositionGood = projectedMoneyLeftIfGood + projectedEmergencyIfGood + projectedSavingsIfGood - projectedDebtBalance;
  const projectedNetPositionImproved = projectedTotalAvailable - projectedDebtBalanceIfImproved;
  const currentDirection = directionFromProjection(avg.currentMoneyLeft, avg.netMonthlyCashFlow, avg.currentMoneyLeft + avg.currentEmergency + avg.totalSavingsSaved - avg.totalDebtBalance);
  const badDirection = directionFromProjection(projectedMoneyLeftIfSame, avg.netMonthlyCashFlow, projectedNetPositionSame);
  const goodDirection = directionFromProjection(projectedMoneyLeftIfGood, avg.netMonthlyCashFlow, projectedNetPositionGood);
  const betterDirection = directionFromProjection(projectedMoneyLeftIfImproved, avg.netMonthlyCashFlow + avg.averageMonthlyUnplanned, projectedNetPositionImproved);

  if (!auditWarnings.includes(GOOD_HABIT_ESTIMATE_WARNING)) auditWarnings.push(GOOD_HABIT_ESTIMATE_WARNING);

  return {
    ...avg,
    badLeakCost,
    recoveredLeakPotential,
    betterFutureAllocation: allocation,
    goodEmergencyGrowth,
    goodSavingsGrowth,
    debtReduction,
    projectedDebtBalance,
    projectedDebtBalanceIfImproved,
    projectedWalletIfSame,
    projectedMoneyLeftIfSame,
    projectedEmergencyIfSame,
    projectedSavingsIfSame,
    projectedMoneyLeftIfGood,
    projectedWalletIfGood,
    projectedEmergencyIfGood,
    projectedSavingsIfGood,
    projectedMoneyLeftIfImproved,
    projectedWalletIfImproved,
    projectedEmergencyIfImproved,
    projectedSavingsIfImproved,
    projectedTotalAvailable,
    projectedNetPositionSame,
    projectedNetPositionGood,
    projectedNetPositionImproved,
    currentDirection,
    badDirection,
    goodDirection,
    betterDirection,
    status: betterDirection,
  };
}

function createEmptyForecastAudit(horizonMonths = 1, history = {}) {
  const horizon = normalizeHorizonMonths(horizonMonths);
  return {
    version: "forecast-audit-v1",
    horizon: {
      selectedHorizonMonths: horizon,
      maxHorizonMonths: MAX_HORIZON_MONTHS,
      dateSpanMonths: history.dateSpanMonths || 0,
      activeFinancialMonths: history.activeFinancialMonths || 0,
      activeIncomeMonths: history.activeIncomeMonths || 0,
      activeExpenseMonths: history.activeExpenseMonths || 0,
      activeTransactionMonths: history.activeTransactionMonths || 0,
      availableHistoryMonthsUsed: history.availableHistoryMonths || 0,
      sparseHistoryWarning: history.sparseHistoryWarning || "",
    },
    rawTotals: {
      currentMoneyLeft: 0,
      totalWalletBalance: 0,
      totalIncomeInWindow: 0,
      totalExpensesInWindow: 0,
      totalUnplannedInWindow: 0,
      totalOverBudgetInWindow: 0,
      totalDebtBalance: 0,
      monthlyDebtPayment: 0,
      currentEmergency: 0,
      totalSavingsSaved: 0,
      totalSavingsTarget: 0,
    },
    monthlyAverages: {
      denominatorUsed: 1,
      averageMonthlyIncome: 0,
      averageMonthlyExpenses: 0,
      averageMonthlyUnplanned: 0,
      netMonthlyCashFlow: 0,
    },
    leakAnalysis: {
      leakEvidenceType: "none",
      biggestRiskyCategory: null,
      biggestOverallCategory: null,
      badLeakCost: 0,
      leakIsActualOrInferred: "none",
    },
    betterFutureAllocation: {
      recoveredLeakPotential: 0,
      moneyLeftAllocation: 0,
      emergencyAllocation: 0,
      savingsAllocation: 0,
      debtAllocation: 0,
      totalAllocated: 0,
      allocationIntegrityPass: true,
    },
    formulas: {
      projectedMoneyLeftIfSame: 0,
      projectedMoneyLeftIfGood: 0,
      projectedMoneyLeftIfImproved: 0,
      projectedEmergencyIfImproved: 0,
      projectedSavingsIfImproved: 0,
      projectedDebtBalance: 0,
      projectedDebtBalanceIfImproved: 0,
      projectedTotalAvailable: 0,
      betterFutureLift: 0,
    },
    slideTrace: {
      slide1: [],
      slide2: [],
      slide3: [],
      slide4: [],
      slide5: [],
      slide6: [],
      slide7: [],
      slide8: [],
      slide9: [],
      slide10: [],
    },
    warnings: [],
  };
}

function traceTypeForLabel(label = "") {
  const normalized = String(label).toLowerCase();
  if (normalized.includes("estimated")) return "ESTIMATED";
  if (normalized.includes("forecast") || normalized.includes("projected") || normalized.includes("direction") || normalized.includes("value") || normalized.includes("risk")) return "CALCULATED";
  if (normalized.includes("likely") || normalized.includes("recommended")) return "INFERRED";
  if (normalized.includes("not enough")) return "FALLBACK";
  return "ACTUAL";
}

function traceRows(card = {}, slideNumber = 1) {
  const rows = [];
  if (card.hero) {
    rows.push({
      label: "Hero",
      value: card.hero,
      type: traceTypeForLabel(card.hero),
      formula: "Report builder card hero",
      source: `slide${slideNumber}`,
      riskLevel: card.tone || "neutral",
    });
  }
  toArray(card.stats).forEach((item) => {
    rows.push({
      label: item.label,
      value: item.value,
      type: traceTypeForLabel(item.label),
      formula: "Report builder normalized local-data calculation",
      source: `slide${slideNumber}`,
      riskLevel: card.tone || "neutral",
    });
  });
  return rows;
}

function buildForecastAudit(snapshot = {}, projection = {}, horizonMonths = 1, warnings = [], cards = []) {
  const history = getClaraForecastHorizonSummary(snapshot);
  const audit = createEmptyForecastAudit(horizonMonths, history);
  const allocation = projection.betterFutureAllocation || {};
  const betterFutureLift = projection.projectedNetPositionImproved - projection.projectedNetPositionSame;

  audit.rawTotals = {
    currentMoneyLeft: projection.currentMoneyLeft || 0,
    totalWalletBalance: projection.currentWalletTotal || 0,
    totalIncomeInWindow: projection.totalIncomeInWindow || 0,
    totalExpensesInWindow: projection.totalExpensesInWindow || 0,
    totalUnplannedInWindow: projection.totalUnplannedInWindow || 0,
    totalOverBudgetInWindow: projection.totalOverBudgetInWindow || 0,
    totalDebtBalance: projection.totalDebtBalance || 0,
    monthlyDebtPayment: projection.monthlyDebtPayment || 0,
    currentEmergency: projection.currentEmergency || 0,
    totalSavingsSaved: projection.totalSavingsSaved || 0,
    totalSavingsTarget: projection.totalSavingsTarget || 0,
  };
  audit.monthlyAverages = {
    denominatorUsed: projection.denominatorUsed || 1,
    averageMonthlyIncome: projection.averageMonthlyIncome || 0,
    averageMonthlyExpenses: projection.averageMonthlyExpenses || 0,
    averageMonthlyUnplanned: projection.averageMonthlyUnplanned || 0,
    netMonthlyCashFlow: projection.netMonthlyCashFlow || 0,
  };
  audit.leakAnalysis = {
    leakEvidenceType: projection.leakEvidenceType || "none",
    biggestRiskyCategory: projection.biggestRiskyCategory?.category || null,
    biggestOverallCategory: projection.biggestOverallCategory?.category || null,
    badLeakCost: projection.badLeakCost || 0,
    leakIsActualOrInferred: projection.leakIsActualOrInferred || "none",
  };
  audit.betterFutureAllocation = {
    recoveredLeakPotential: projection.recoveredLeakPotential || 0,
    moneyLeftAllocation: allocation.moneyLeft || 0,
    emergencyAllocation: allocation.emergency || 0,
    savingsAllocation: allocation.savings || 0,
    debtAllocation: allocation.debt || 0,
    totalAllocated: allocation.totalAllocated || 0,
    allocationIntegrityPass: allocation.allocationIntegrityPass !== false,
  };
  audit.formulas = {
    projectedMoneyLeftIfSame: projection.projectedMoneyLeftIfSame || 0,
    projectedMoneyLeftIfGood: projection.projectedMoneyLeftIfGood || 0,
    projectedMoneyLeftIfImproved: projection.projectedMoneyLeftIfImproved || 0,
    projectedEmergencyIfImproved: projection.projectedEmergencyIfImproved || 0,
    projectedSavingsIfImproved: projection.projectedSavingsIfImproved || 0,
    projectedDebtBalance: projection.projectedDebtBalance || 0,
    projectedDebtBalanceIfImproved: projection.projectedDebtBalanceIfImproved || 0,
    projectedTotalAvailable: projection.projectedTotalAvailable || 0,
    betterFutureLift: Number.isFinite(betterFutureLift) ? betterFutureLift : 0,
  };
  audit.warnings = [...new Set([...(history.sparseHistoryWarning ? [history.sparseHistoryWarning] : []), ...warnings])];
  cards.forEach((card, index) => {
    audit.slideTrace[`slide${index + 1}`] = traceRows(card, index + 1);
  });
  return audit;
}

function readinessReport(snapshot = {}, horizonMonths = 1, reason = "") {
  const completeness = normalizeCompleteness(snapshot.dataCompleteness);
  const missingData = normalizeMissingData(snapshot);
  const horizonSummary = getClaraForecastHorizonSummary(snapshot);
  const audit = createEmptyForecastAudit(horizonMonths, horizonSummary);
  audit.warnings = [reason || "Forecast blocked because usable active financial history is not enough for the selected horizon."].filter(Boolean);

  const report = {
    title: "FUTURE MONEY FORECAST",
    subtitle: "Readiness check",
    type: "readiness",
    horizonMonths: normalizeHorizonMonths(horizonMonths),
    cards: [
      {
        eyebrow: "01 / FORECAST NOT READY",
        title: "Not Enough History Yet",
        tone: "neutral",
        body: reason || "CLARA needs more financial behavior before this forecast becomes reliable.",
        stats: [
          stat("Requested forecast", monthLabel(horizonMonths)),
          stat("Usable active history", `${horizonSummary.availableHistoryMonths} month${horizonSummary.availableHistoryMonths === 1 ? "" : "s"}`),
          stat("Date span observed", `${horizonSummary.dateSpanMonths} month${horizonSummary.dateSpanMonths === 1 ? "" : "s"}`),
          stat("Data completeness", labelCompleteness(completeness)),
          stat("Gemini", "Not used"),
        ],
      },
      {
        eyebrow: "02 / WHAT CLARA NEEDS",
        title: "Build Forecast Evidence",
        tone: "neutral",
        body: "Keep recording wallets, income, expenses, emergency fund, savings, debts, and budget behavior so CLARA can build a stronger local forecast.",
        stats: [
          stat("Minimum useful history", "1 active financial month"),
          stat("Maximum forecast", "12 months"),
          stat("Rule", "Forecast cannot exceed active usable history"),
        ],
        final: true,
        ctaLabel: "I got it now",
        missingData: missingData.length ? missingData : ["At least 1 month of consistent financial activity"],
      },
    ],
  };
  audit.slideTrace.slide1 = traceRows(report.cards[0], 1);
  audit.slideTrace.slide2 = traceRows(report.cards[1], 2);
  return { ...report, audit };
}

function dataBasisSummary(projection = {}, availableHistoryMonths = 0) {
  const parts = [
    `${availableHistoryMonths} active usable month${availableHistoryMonths === 1 ? "" : "s"}`,
    `${count(projection.incomeRecordsUsed)} income`,
    `${count(projection.expenseRecordsUsed)} expense`,
  ];
  if (projection.transactionRecordsUsed) parts.push(`${count(projection.transactionRecordsUsed)} transaction`);
  return parts.join(" · ");
}

function currentPositionMoneyLeftSummary(projection = {}) {
  return projection.currentMoneyLeftAvailable ? amount(projection.currentMoneyLeft, CURRENT_POSITION_NOT_ENOUGH_DATA) : CURRENT_POSITION_NOT_ENOUGH_DATA;
}

function totalWalletBalanceSummary(projection = {}) {
  return projection.currentWalletTotalAvailable ? amount(projection.currentWalletTotal, CURRENT_POSITION_NOT_ENOUGH_DATA) : CURRENT_POSITION_NOT_ENOUGH_DATA;
}

function savingsSummary(projection = {}) {
  if (!projection.savingsGoalRecordsUsed && !projection.totalSavingsSaved && !projection.totalSavingsTarget) return "No savings goal created";
  if (projection.totalSavingsTarget) return `${amount(projection.totalSavingsSaved, "₱0")} / ${amount(projection.totalSavingsTarget)}`;
  return amount(projection.totalSavingsSaved, "₱0");
}

function emergencySummary(projection = {}) {
  if (!projection.currentEmergency && !projection.emergencyTarget) return "No emergency fund created";
  if (projection.emergencyTarget) return `${amount(projection.currentEmergency, "₱0")} / ${amount(projection.emergencyTarget)}`;
  return amount(projection.currentEmergency, "₱0");
}

function debtPositionSummary(projection = {}) {
  return projection.debtRecordsUsed ? `${amount(projection.totalDebtBalance, "₱0")} remaining` : NO_DEBT_RECORDS;
}

function netFinancialPositionSummary(projection = {}) {
  if (!projection.currentMoneyLeftAvailable) return CURRENT_POSITION_NOT_ENOUGH_DATA;
  return amount(projection.currentMoneyLeft + projection.currentEmergency + projection.totalSavingsSaved - projection.totalDebtBalance, CURRENT_POSITION_NOT_ENOUGH_DATA);
}

function currentPositionDirectionSummary(projection = {}) {
  if (!projection.currentMoneyLeftAvailable) return CURRENT_POSITION_NOT_ENOUGH_DATA;
  if (projection.netMonthlyCashFlow > 0 && projection.currentMoneyLeft + projection.currentEmergency + projection.totalSavingsSaved >= projection.totalDebtBalance) return "Improving";
  if (projection.netMonthlyCashFlow >= 0) return "Stable";
  if (projection.monthlyDebtPayment > 0 || projection.currentEmergency > 0 || projection.totalSavingsSaved > 0) return "Recovering";
  return "Declining";
}

function hasRiskDiagnosisData(projection = {}) {
  return count(projection.expenseRecordsUsed) > 0;
}

function hasRiskEvidence(projection = {}) {
  return projection.leakEvidenceType && projection.leakEvidenceType !== "none" && projection.badLeakCost > 0;
}

function unplannedRatio(projection = {}) {
  const expenses = count(projection.expenseRecordsUsed);
  if (!expenses) return 0;
  return count(projection.unplannedCount) / expenses;
}

function impulseSpendingSummary(projection = {}) {
  if (!hasRiskDiagnosisData(projection)) return CURRENT_POSITION_NOT_ENOUGH_DATA;
  const ratio = unplannedRatio(projection);
  if (!hasRiskEvidence(projection)) return "Low signal";
  if (ratio <= 0.25 && projection.leakEvidenceType !== "budget") return "Low signal";
  if (ratio <= 0.5 || projection.leakEvidenceType === "budget") return "Moderate signal";
  return "High signal";
}

function unplannedPurchasesSummary(projection = {}) {
  if (!hasRiskDiagnosisData(projection)) return CURRENT_POSITION_NOT_ENOUGH_DATA;
  const records = count(projection.unplannedCount);
  return `${records} record${records === 1 ? "" : "s"}`;
}

function biggestOverspendingCategorySummary(projection = {}) {
  if (!hasRiskEvidence(projection)) return "No major category detected";
  return projection.biggestRiskyCategory?.category || "No major category detected";
}

function estimatedMonthlyLeakSummary(projection = {}) {
  if (!hasRiskEvidence(projection)) return CURRENT_POSITION_NOT_ENOUGH_DATA;
  return `${amount(projection.badLeakCost / Math.max(projection.activeExpenseMonthsInWindow, 1), "₱0")}/month`;
}

function monthlyLeakCostSummary(projection = {}) {
  return hasRiskEvidence(projection) ? `${amount(projection.badLeakCost / Math.max(projection.activeExpenseMonthsInWindow, 1), "₱0")}/month` : CURRENT_POSITION_NOT_ENOUGH_DATA;
}

function forecastedLeakCostSummary(projection = {}) {
  return hasRiskEvidence(projection) ? amount(projection.badLeakCost, CURRENT_POSITION_NOT_ENOUGH_DATA) : CURRENT_POSITION_NOT_ENOUGH_DATA;
}

function goalDelayAmount(projection = {}) {
  const remainingGoalGap = Math.max(0, projection.totalSavingsTarget - projection.totalSavingsSaved);
  if (!hasRiskEvidence(projection) || remainingGoalGap <= 0) return 0;
  return Math.min(projection.badLeakCost, remainingGoalGap);
}

function moneyDivertedFromGoalsSummary(projection = {}) {
  const delayedAmount = goalDelayAmount(projection);
  return delayedAmount > 0 ? `Up to ${amount(delayedAmount, "₱0")}` : CURRENT_POSITION_NOT_ENOUGH_DATA;
}

function emergencyFundOpportunitySummary(projection = {}) {
  return hasRiskEvidence(projection) ? amount(projection.betterFutureAllocation?.emergency || 0, "₱0") : CURRENT_POSITION_NOT_ENOUGH_DATA;
}

function savingsProgressDelayedSummary(projection = {}) {
  const delayedAmount = goalDelayAmount(projection);
  return delayedAmount > 0 ? `${amount(delayedAmount, "₱0")} delayed` : CURRENT_POSITION_NOT_ENOUGH_DATA;
}

function debtReductionMissedSummary(projection = {}) {
  if (!projection.debtRecordsUsed || projection.totalDebtBalance <= 0) return NO_DEBT_RECORDS;
  return hasRiskEvidence(projection) ? `${amount(projection.betterFutureAllocation?.debt || 0, "₱0")} missed payoff` : CURRENT_POSITION_NOT_ENOUGH_DATA;
}

function biggestCostDriverSummary(projection = {}) {
  if (!hasRiskEvidence(projection)) return NO_COST_DRIVER;
  return projection.biggestRiskyCategory?.category || NO_COST_DRIVER;
}

function costOfRiskyHabitsBodySummary(projection = {}) {
  return hasRiskEvidence(projection)
    ? "This shows what your current leak may cost over the selected horizon if the same pattern continues."
    : "No major risk evidence was found, so CLARA does not label the biggest spending category as a leak.";
}

function financialRiskLevelSummary(projection = {}) {
  if (!hasRiskDiagnosisData(projection)) return CURRENT_POSITION_NOT_ENOUGH_DATA;
  if (!hasRiskEvidence(projection)) return "Low";
  const leakShare = projection.averageMonthlyExpenses > 0 ? projection.averageMonthlyUnplanned / projection.averageMonthlyExpenses : 0;
  if (projection.badDirection === "At risk" || leakShare >= 0.3) return "High";
  return "Moderate";
}

function primaryRiskPatternSummary(projection = {}) {
  if (!hasRiskEvidence(projection)) return "No major pattern detected";
  const category = projection.biggestRiskyCategory?.category;
  if (projection.leakEvidenceType === "budget" && category) return `${category} budget overspending`;
  if (category && count(projection.unplannedCount) >= 3) return `Frequent ${category.toLowerCase()} spending`;
  if (count(projection.unplannedCount) >= 2) return "Repeated unplanned purchases";
  if (category) return `${category} spending risk`;
  return "Detected spending pattern";
}

function budgetAlignmentSummary(projection = {}) {
  if (!hasRiskDiagnosisData(projection) || count(projection.budgetRecordsUsed) <= 0) return CURRENT_POSITION_NOT_ENOUGH_DATA;
  if (projection.leakEvidenceType === "budget") return "Budget overspending detected";
  if (!hasRiskEvidence(projection)) return "Mostly planned";
  return "Budget drift detected";
}

function riskyHabitsHeroSummary(projection = {}) {
  if (!hasRiskDiagnosisData(projection) || !hasRiskEvidence(projection)) return "No major risk detected";
  const category = projection.biggestRiskyCategory?.category;
  if (category) return `${category} Leak`;
  return `${amount(projection.badLeakCost)} Leak`;
}

function riskyHabitsBodySummary(projection = {}) {
  return hasRiskDiagnosisData(projection)
    ? "These are observed spending patterns based on your available records. CLARA identifies behaviors with risk evidence, not simply the largest category."
    : "CLARA needs more spending and budget records before it can identify risky habits with confidence.";
}

function unchangedPathHeroSummary(projection = {}) {
  if (hasRiskEvidence(projection)) return `${amount(projection.badLeakCost, "₱0")} Unfixed`;
  if (hasRiskDiagnosisData(projection)) return "No major leak detected";
  return CURRENT_POSITION_NOT_ENOUGH_DATA;
}

function leakCostCarriedForwardSummary(projection = {}) {
  return hasRiskEvidence(projection) ? amount(projection.badLeakCost, "₱0") : "No major leak detected";
}

function moneyNotRedirectedSummary(projection = {}) {
  return hasRiskEvidence(projection) ? amount(projection.badLeakCost, "₱0") : "No major leak detected";
}

function unchangedPathDirectionSummary(projection = {}) {
  if (!projection.currentMoneyLeftAvailable) return CURRENT_POSITION_NOT_ENOUGH_DATA;
  if (hasRiskEvidence(projection) && projection.badDirection === "Improving") return "Improving, but leaking";
  if (hasRiskEvidence(projection) && projection.badDirection === "Stable") return "Stable, but leaking";
  return projection.badDirection || CURRENT_POSITION_NOT_ENOUGH_DATA;
}

function unchangedPathBodySummary(projection = {}) {
  return hasRiskDiagnosisData(projection)
    ? "This is the unchanged path: your money may still move forward, but any verified leak continues to reduce what could have gone to savings, emergency fund, or debt."
    : "CLARA needs more records before it can project what happens if current habits continue.";
}

function recordCountSummary(total = 0, noun = "record") {
  const safeTotal = count(total);
  return `${safeTotal} ${noun} record${safeTotal === 1 ? "" : "s"}`;
}

function positiveFinancialDirectionSummary(projection = {}) {
  if (!projection.currentMoneyLeftAvailable && !projection.incomeRecordsUsed && !projection.expenseRecordsUsed) return CURRENT_POSITION_NOT_ENOUGH_DATA;
  if (projection.netMonthlyCashFlow > 0) return "Improving";
  if (projection.netMonthlyCashFlow >= 0) return "Stable or improving";
  if (currentPositionDirectionSummary(projection) === "Recovering") return "Recovering";
  return CURRENT_POSITION_NOT_ENOUGH_DATA;
}

function slideSixGoodHabitSignals(projection = {}) {
  const incomeRecords = count(projection.incomeRecordsUsed);
  const budgetRecords = count(projection.budgetRecordsUsed);
  const expenseRecords = count(projection.expenseRecordsUsed);
  const transactionRecords = count(projection.transactionRecordsUsed);
  const savingsRecords = count(projection.savingsGoalRecordsUsed);
  const debtRecords = count(projection.debtRecordsUsed);
  const hasStableIncome = incomeRecords > 0 || projection.averageMonthlyIncome > 0;
  const hasSavingsDiscipline = savingsRecords > 0 || projection.totalSavingsSaved > 0;
  const hasBudgetUsage = budgetRecords > 0;
  const hasEmergencyActivity = projection.currentEmergency > 0 || projection.emergencyTarget > 0;
  const hasDebtResponsibility = debtRecords > 0 || projection.monthlyDebtPayment > 0;
  const plannedMoneyBehavior = hasBudgetUsage
    ? "Budget tracking active"
    : count(projection.unplannedCount) > 0 && count(projection.unplannedCount) < expenseRecords
      ? "Planned spending signals found"
      : expenseRecords > 0 || transactionRecords > 0
        ? "Some spending is being tracked"
        : CURRENT_POSITION_NOT_ENOUGH_DATA;
  const positiveDirection = positiveFinancialDirectionSummary(projection);
  const positiveSignals = [
    hasStableIncome,
    hasSavingsDiscipline,
    hasBudgetUsage,
    hasEmergencyActivity,
    hasDebtResponsibility,
    plannedMoneyBehavior !== CURRENT_POSITION_NOT_ENOUGH_DATA,
    positiveDirection !== CURRENT_POSITION_NOT_ENOUGH_DATA,
  ].filter(Boolean).length;

  return {
    count: positiveSignals,
    hasStableIncome,
    hasSavingsDiscipline,
    hasBudgetUsage,
    stats: [
      stat("Income Consistency", incomeRecords > 0 ? recordCountSummary(incomeRecords, "income") : hasStableIncome ? "Stable income records found" : CURRENT_POSITION_NOT_ENOUGH_DATA),
      stat("Savings Discipline", hasSavingsDiscipline ? "Savings activity detected" : CURRENT_POSITION_NOT_ENOUGH_DATA),
      stat("Budget Usage", hasBudgetUsage ? recordCountSummary(budgetRecords, "budget") : "No budget records found"),
      stat("Emergency Fund Activity", projection.currentEmergency > 0 ? `${amount(projection.currentEmergency, "₱0")} protected` : projection.emergencyTarget > 0 ? "Emergency fund started" : "No emergency fund created"),
      stat("Debt Responsibility", debtRecords > 0 ? projection.monthlyDebtPayment > 0 ? `${amount(projection.monthlyDebtPayment, "₱0")} payment signal` : "Debt records active" : NO_DEBT_RECORDS),
      stat("Planned Money Behavior", plannedMoneyBehavior),
      stat("Positive Financial Direction", positiveDirection),
    ],
  };
}

function slideSixHeroSummary(signals = {}) {
  if (signals.count > 0) return `${signals.count} Good Signal${signals.count === 1 ? "" : "s"}`;
  if (signals.hasStableIncome) return "Stable Income";
  if (signals.hasSavingsDiscipline) return "Savings Active";
  if (signals.hasBudgetUsage) return "Budget Tracking Active";
  return "No major positive signal yet";
}

function slideSixBodySummary(signals = {}) {
  return signals.count > 0
    ? "CLARA also looks for what is already working. These habits are the strengths your forecast can build from."
    : "CLARA needs more local records before it can identify positive financial habits with confidence.";
}

function totalGoodHabitValue(projection = {}) {
  return projection.debtReduction + projection.goodEmergencyGrowth + projection.goodSavingsGrowth;
}

function savingsValueSummary(projection = {}) {
  const hasSavingsData = projection.savingsGoalRecordsUsed > 0 || projection.totalSavingsSaved > 0 || projection.totalSavingsTarget > 0 || projection.goodSavingsGrowth > 0;
  return hasSavingsData ? amount(projection.goodSavingsGrowth, "₱0") : CURRENT_POSITION_NOT_ENOUGH_DATA;
}

function emergencyGrowthSummary(projection = {}) {
  const hasEmergencyData = projection.currentEmergency > 0 || projection.emergencyTarget > 0 || projection.goodEmergencyGrowth > 0;
  return hasEmergencyData ? amount(projection.goodEmergencyGrowth, "₱0") : "No emergency fund created";
}

function budgetControlValueSummary(projection = {}) {
  return projection.budgetRecordsUsed > 0 ? "Tracking active" : "No budget records found";
}

function debtReductionValueSummary(projection = {}) {
  return projection.debtRecordsUsed ? amount(projection.debtReduction, "₱0") : NO_DEBT_RECORDS;
}

function protectedMoneySummary(projection = {}) {
  const protectedMoney = projection.currentEmergency > 0 ? projection.currentEmergency : projection.totalSavingsSaved;
  return protectedMoney > 0 ? amount(protectedMoney, "₱0") : CURRENT_POSITION_NOT_ENOUGH_DATA;
}

function totalGoodHabitValueSummary(projection = {}) {
  return amount(totalGoodHabitValue(projection), "₱0");
}

function strongestValueDriverSummary(projection = {}) {
  const drivers = [
    { label: "Savings", value: projection.goodSavingsGrowth },
    { label: "Emergency Fund", value: projection.goodEmergencyGrowth },
    { label: "Debt Reduction", value: projection.debtReduction },
  ].filter((driver) => driver.value > 0).sort((left, right) => right.value - left.value);
  if (drivers.length) return drivers[0].label;
  if (projection.budgetRecordsUsed > 0) return "Budget Tracking";
  return "No major value driver detected";
}

function slideSevenBodySummary(projection = {}) {
  const hasValueEvidence = totalGoodHabitValue(projection) > 0 || projection.currentEmergency > 0 || projection.totalSavingsSaved > 0 || projection.budgetRecordsUsed > 0;
  return hasValueEvidence
    ? "These estimates show what your good habits may continue protecting, building, or improving based on your local records."
    : "CLARA needs more local records before it can estimate the value of good habits with confidence.";
}

function nextBestAction(projection = {}) {
  const category = projection.biggestRiskyCategory?.category || "";
  if (category && hasRiskEvidence(projection)) return `Reduce ${category} first, then redirect the saved amount to emergency fund, savings, or debt.`;
  if (projection.budgetRecordsUsed <= 0) return "Create one simple budget limit for your highest spending category.";
  return "Keep recording your next 7 days so CLARA can sharpen the next forecast.";
}

export function buildClaraForecastReport(snapshot = {}, options = {}) {
  const horizon = normalizeHorizonMonths(options.horizonMonths || snapshot.selectedForecastHorizonMonths || 1);
  const eligibility = canBuildClaraForecast(snapshot, horizon);
  if (!eligibility.allowed) return readinessReport(snapshot, horizon, eligibility.reason);

  const auditWarnings = [];
  const projection = buildProjection(snapshot, horizon, auditWarnings);
  const horizonText = monthLabel(horizon);
  const horizonSummary = getClaraForecastHorizonSummary(snapshot);
  const leakCategory = projection.biggestRiskyCategory?.category || "";
  const improvementLift = projection.projectedNetPositionImproved - projection.projectedNetPositionSame;
  const hasLeak = hasRiskEvidence(projection);
  const hasSavingsDiscipline = projection.totalSavingsSaved > 0 || projection.currentEmergency > 0;
  const slideSixSignals = slideSixGoodHabitSignals(projection);

  const cards = [
    {
      eyebrow: "01 / FORECAST SETUP",
      title: "Forecast Setup",
      tone: "neutral",
      hero: horizonText,
      body: "CLARA used your local records only. No Gemini call is used for this report.",
      stats: [
        stat("Selected Forecast Horizon", horizonText),
        stat("Historical Data Used", `${horizonSummary.availableHistoryMonths} active month${horizonSummary.availableHistoryMonths === 1 ? "" : "s"}`),
        stat("Date Span Observed", `${horizonSummary.dateSpanMonths} month${horizonSummary.dateSpanMonths === 1 ? "" : "s"}`),
        stat("Forecast Confidence", labelCompleteness(snapshot.dataCompleteness)),
        stat("Data Basis Summary", dataBasisSummary(projection, horizonSummary.availableHistoryMonths)),
      ],
    },
    {
      eyebrow: "02 / CURRENT POSITION",
      title: "Current Financial Position",
      tone: "neutral",
      hero: currentPositionMoneyLeftSummary(projection),
      body: "This is your current financial starting point before CLARA projects what may happen over the selected timeframe.",
      stats: [
        stat("Current Money Left", currentPositionMoneyLeftSummary(projection)),
        stat("Total Wallet Balance", totalWalletBalanceSummary(projection)),
        stat("Emergency Fund Status", emergencySummary(projection)),
        stat("Savings Goal Progress", savingsSummary(projection)),
        stat("Debt Position", debtPositionSummary(projection)),
        stat("Net Financial Position", netFinancialPositionSummary(projection)),
        stat("Current Financial Direction", currentPositionDirectionSummary(projection)),
      ],
    },
    {
      eyebrow: "03 / REALITY CHECK",
      title: "Risky Habits CLARA Found",
      tone: "reality",
      hero: riskyHabitsHeroSummary(projection),
      body: riskyHabitsBodySummary(projection),
      stats: [
        stat("Impulse Spending", impulseSpendingSummary(projection)),
        stat("Unplanned Purchases", unplannedPurchasesSummary(projection)),
        stat("Biggest Overspending Category", biggestOverspendingCategorySummary(projection)),
        stat("Estimated Monthly Leak", estimatedMonthlyLeakSummary(projection)),
        stat("Financial Risk Level", financialRiskLevelSummary(projection)),
        stat("Primary Risk Pattern", primaryRiskPatternSummary(projection)),
        stat("Budget Alignment", budgetAlignmentSummary(projection)),
      ],
    },
    {
      eyebrow: "04 / REALITY CHECK",
      title: "Cost of These Habits",
      tone: "reality",
      hero: forecastedLeakCostSummary(projection),
      body: costOfRiskyHabitsBodySummary(projection),
      stats: [
        stat("Monthly Leak Cost", monthlyLeakCostSummary(projection)),
        stat("Forecasted Leak Cost", forecastedLeakCostSummary(projection)),
        stat("Money Diverted From Goals", moneyDivertedFromGoalsSummary(projection)),
        stat("Emergency Fund Opportunity", emergencyFundOpportunitySummary(projection)),
        stat("Savings Progress Delayed", savingsProgressDelayedSummary(projection)),
        stat("Debt Reduction Missed", debtReductionMissedSummary(projection)),
        stat("Biggest Cost Driver", biggestCostDriverSummary(projection)),
      ],
    },
    {
      eyebrow: "05 / BAD FUTURE PROJECTION",
      title: "If Nothing Changes",
      tone: "reality",
      hero: unchangedPathHeroSummary(projection),
      body: unchangedPathBodySummary(projection),
      stats: [
        stat("Projected Money Left", amount(projection.projectedMoneyLeftIfSame, NOT_ENOUGH_DATA)),
        stat("Projected Emergency Fund", amount(projection.projectedEmergencyIfSame, "₱0")),
        stat("Projected Savings Progress", amount(projection.projectedSavingsIfSame, "₱0")),
        stat("Projected Debt Position", projection.debtRecordsUsed ? amount(projection.projectedDebtBalance, "₱0") : NO_DEBT_RECORDS),
        stat("Leak Cost Carried Forward", leakCostCarriedForwardSummary(projection)),
        stat("Money Not Redirected", moneyNotRedirectedSummary(projection)),
        stat("Financial Direction", unchangedPathDirectionSummary(projection)),
      ],
    },
    {
      eyebrow: "06 / HOPE CHECK",
      title: "Good Habits CLARA Found",
      tone: "hope",
      hero: slideSixHeroSummary(slideSixSignals),
      body: slideSixBodySummary(slideSixSignals),
      stats: slideSixSignals.stats,
    },
    {
      eyebrow: "07 / HOPE CHECK",
      title: "Value of the Good Habits",
      tone: "hope",
      hero: totalGoodHabitValueSummary(projection),
      body: slideSevenBodySummary(projection),
      stats: [
        stat("Estimated Savings Value", savingsValueSummary(projection)),
        stat("Estimated Emergency Growth", emergencyGrowthSummary(projection)),
        stat("Budget Control Value", budgetControlValueSummary(projection)),
        stat("Debt Reduction Value", debtReductionValueSummary(projection)),
        stat("Protected Money", protectedMoneySummary(projection)),
        stat("Estimated Good-Habit Value", totalGoodHabitValueSummary(projection)),
        stat("Strongest Value Driver", strongestValueDriverSummary(projection)),
      ],
    },
    {
      eyebrow: "08 / GOOD FUTURE PROJECTION",
      title: "If You Continue the Good",
      tone: "hope",
      hero: amount(projection.projectedMoneyLeftIfGood, NOT_ENOUGH_DATA),
      body: "This is the steady path if your current good habits continue, but the biggest leak has not been corrected yet.",
      stats: [
        stat("Projected Money Left", amount(projection.projectedMoneyLeftIfGood, NOT_ENOUGH_DATA)),
        stat("Projected Emergency Fund", amount(projection.projectedEmergencyIfGood, "₱0")),
        stat("Projected Savings Progress", amount(projection.projectedSavingsIfGood, "₱0")),
        stat("Projected Debt Reduction", amount(projection.debtReduction, "₱0")),
        stat("Estimated Good-Habit Value Applied", totalGoodHabitValueSummary(projection)),
        stat("Financial Direction", projection.goodDirection),
      ],
    },
    {
      eyebrow: "09 / POSSIBILITY PLAN",
      title: "Keep the Good, Fix the Bad",
      tone: "possibility",
      body: "The better future does not require changing everything. CLARA starts with protecting what works and fixing the biggest verified leak first.",
      stats: [
        stat("Good Habits to Protect", hasSavingsDiscipline || projection.incomeRecordsUsed > 0 ? "Income, savings, protection, and budget signals" : NOT_ENOUGH_DATA),
        stat("Biggest Leak to Fix", leakCategory && hasLeak ? `Likely leak: ${leakCategory}` : NOT_ENOUGH_DATA),
        stat("Recommended Adjustments", nextBestAction(projection)),
        stat("Highest Impact Change", hasLeak ? `Recover up to ${amount(projection.badLeakCost)} over ${horizonText}` : "Record more spending evidence first"),
      ],
    },
    {
      eyebrow: "10 / BEST FUTURE PROJECTION",
      title: "Your Better Future Outcome",
      tone: "possibility",
      hero: amount(projection.projectedTotalAvailable, NOT_ENOUGH_DATA),
      body: `This is the better direction if you keep the good habits and redirect the verified leak CLARA found. One next best action: ${nextBestAction(projection)}`,
      final: true,
      ctaLabel: "I got it now",
      stats: [
        stat("Projected Money Left", amount(projection.projectedMoneyLeftIfImproved, NOT_ENOUGH_DATA)),
        stat("Projected Emergency Fund", amount(projection.projectedEmergencyIfImproved, "₱0")),
        stat("Projected Savings Goal Completion", amount(projection.projectedSavingsIfImproved, "₱0")),
        stat("Projected Debt Balance", projection.debtRecordsUsed ? amount(projection.projectedDebtBalanceIfImproved, "₱0") : NOT_ENOUGH_DATA),
        stat("Projected Total Available Money", amount(projection.projectedTotalAvailable, NOT_ENOUGH_DATA)),
        stat("Financial Direction", projection.betterDirection),
        stat("One Next Best Action", nextBestAction(projection)),
        stat("Better-future lift", amount(improvementLift, "₱0")),
      ],
      missingData: [],
    },
  ];

  return {
    title: "FUTURE MONEY FORECAST",
    subtitle: `${horizonText} behavioral forecast`,
    type: "projection",
    horizonMonths: horizon,
    cards,
    audit: buildForecastAudit(snapshot, projection, horizon, auditWarnings, cards),
  };
}
