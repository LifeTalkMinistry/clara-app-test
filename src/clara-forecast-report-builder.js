const NOT_AVAILABLE = "Not available";
const MISSING = "Missing";
const MAX_HORIZON_MONTHS = 12;

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

function amount(value) {
  if (!hasValue(value)) return NOT_AVAILABLE;
  return `₱${toNumber(value).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function signedAmount(value) {
  const number = toNumber(value);
  const sign = number > 0 ? "+" : number < 0 ? "-" : "";
  return `${sign}${amount(Math.abs(number))}`;
}

function count(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function text(value) {
  return hasValue(value) ? String(value).trim() : MISSING;
}

function percent(value) {
  if (!hasValue(value)) return NOT_AVAILABLE;
  const number = toNumber(value);
  return Number.isFinite(number) ? `${Math.round(number)}%` : NOT_AVAILABLE;
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
  if (normalized === "medium" || normalized === "partial") return "medium";
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

function getRecordDate(record = {}) {
  const raw = record.date || record.createdAt || record.created_at || record.updatedAt || record.updated_at || record.lastActivityAt || record.last_activity_at || record.targetDate || record.target_date || "";
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
    safeSpendableMoney: data.safeSpendableMoney ?? data.spendableWalletBalance,
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

function getExpenseAmount(expense = {}) {
  return firstNumber(expense, ["amount", "total", "value"]);
}

function getIncomeAmount(income = {}) {
  return firstNumber(income, ["amount", "total", "value", "currentBalance", "current_balance", "totalMoneyIn", "total_money_in"]);
}

function getWalletBalance(wallet = {}) {
  return firstNumber(wallet, ["balance", "currentBalance", "current_balance", "derived_balance", "spendableBalance", "available_balance"]);
}

function getEmergencySaved(emergencyFund = {}) {
  return firstNumber(emergencyFund, ["savedAmount", "saved_amount", "saved", "currentAmount", "current_amount", "amount", "balance"]);
}

function getEmergencyTarget(emergencyFund = {}) {
  return firstNumber(emergencyFund, ["targetAmount", "target_amount", "target", "goal_amount"]);
}

function getGoalSaved(goal = {}) {
  return firstNumber(goal, ["savedAmount", "saved_amount", "saved", "current_amount"]);
}

function getGoalTarget(goal = {}) {
  return firstNumber(goal, ["targetAmount", "target_amount", "target", "goal_amount"]);
}

function getDebtBalance(debt = {}) {
  return firstNumber(debt, ["balance", "totalDebt", "total_debt", "remainingBalance", "remaining_balance", "amount"]);
}

function getDebtMonthlyPayment(debt = {}) {
  return firstNumber(debt, ["monthlyDebt", "monthly_debt", "monthlyPayment", "monthly_payment", "payment", "amount"]);
}

function isIncomeTransaction(transaction = {}) {
  const type = firstText(transaction, ["type", "transaction_type", "kind"]).toLowerCase();
  return ["income", "add", "cash_in", "deposit", "opening_balance", "credit"].includes(type);
}

function isExpenseTransaction(transaction = {}) {
  const type = firstText(transaction, ["type", "transaction_type", "kind"]).toLowerCase();
  return ["expense", "withdrawal", "debit", "spend", "purchase", "cash_out"].includes(type);
}

function isUnplanned(expense = {}) {
  const textValue = `${expense.planningStatus || ""} ${expense.planning_status || ""} ${expense.budgetStatus || ""} ${expense.budget_status || ""} ${expense.status || ""}`.toLowerCase();
  return /unplanned|outside|undocumented|over budget|budget risk|not planned/.test(textValue);
}

function categoryOf(expense = {}) {
  return firstText(expense, ["category", "title", "name", "note", "type"]) || "Uncategorized";
}

function detectAvailableHistoryMonths(snapshot = {}) {
  const records = getRecords(snapshot);
  const datedRecords = [
    ...records.incomes,
    ...records.expenses,
    ...records.walletTransactions,
    ...records.transfers,
  ]
    .map(getRecordDate)
    .filter(Boolean);

  if (!datedRecords.length) return 0;

  const minDate = datedRecords.reduce((oldest, date) => (date < oldest ? date : oldest), datedRecords[0]);
  const maxDate = datedRecords.reduce((latest, date) => (date > latest ? date : latest), datedRecords[0]);
  const observedMonths = monthsBetweenInclusive(minDate, maxDate);
  const uniqueMonths = new Set(datedRecords.map(monthKey).filter(Boolean)).size;
  return Math.min(MAX_HORIZON_MONTHS, Math.max(observedMonths, uniqueMonths, 1));
}

export function getClaraForecastHorizonSummary(snapshot = {}) {
  const availableHistoryMonths = detectAvailableHistoryMonths(snapshot);
  const eligibleMonths = Array.from({ length: Math.min(MAX_HORIZON_MONTHS, availableHistoryMonths) }, (_, index) => index + 1);
  return {
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
  const hasMoneyContext = toArray(records.wallets).length > 0 || toArray(records.incomes).length > 0 || toArray(records.expenses).length > 0 || toArray(records.walletTransactions).length > 0;
  return {
    allowed: summary.availableHistoryMonths >= horizon && hasMoneyContext,
    horizon,
    availableHistoryMonths: summary.availableHistoryMonths,
    reason: !hasMoneyContext
      ? "CLARA needs at least one wallet, income, expense, or transaction record before forecasting."
      : summary.availableHistoryMonths < horizon
        ? `CLARA only has about ${summary.availableHistoryMonths} month${summary.availableHistoryMonths === 1 ? "" : "s"} of usable history. Try a shorter timeframe first.`
        : "Ready",
  };
}

function monthlyAverages(snapshot = {}, horizonMonths = 1) {
  const horizon = normalizeHorizonMonths(horizonMonths);
  const records = getRecords(snapshot);
  const incomeWindow = recordsInWindow(records.incomes, horizon);
  const transactionIncomeWindow = recordsInWindow(records.walletTransactions.filter(isIncomeTransaction), horizon);
  const expenseWindow = recordsInWindow(records.expenses, horizon);
  const transactionExpenseWindow = recordsInWindow(records.walletTransactions.filter(isExpenseTransaction), horizon);
  const expensesToUse = expenseWindow.length ? expenseWindow : transactionExpenseWindow;
  const incomesToUse = incomeWindow.length ? incomeWindow : transactionIncomeWindow;

  const totalIncome = sum(incomesToUse, getIncomeAmount);
  const incomeSourceFallback = sum(records.incomeSources, getIncomeAmount);
  const totalExpenses = sum(expensesToUse, getExpenseAmount);
  const unplannedExpenses = expensesToUse.filter(isUnplanned);
  const totalUnplanned = sum(unplannedExpenses, getExpenseAmount);
  const transfersOut = sum(recordsInWindow(records.transfers, horizon), (transfer) => firstNumber(transfer, ["amount", "total", "value"]));
  const currentWalletTotal = sum(records.wallets, getWalletBalance) || currentMoney(snapshot).totalWalletBalance || 0;
  const currentEmergency = getEmergencySaved(records.emergencyFund || {}) || currentMoney(snapshot).emergencyProtectedAmount || 0;
  const emergencyTarget = getEmergencyTarget(records.emergencyFund || {});
  const totalSavingsSaved = sum(records.savingsGoals, getGoalSaved);
  const totalSavingsTarget = sum(records.savingsGoals, getGoalTarget);
  const totalDebtBalance = sum(records.debtObligations, getDebtBalance);
  const monthlyDebtPayment = sum(records.debtObligations, getDebtMonthlyPayment);
  const observedMonthlyIncome = totalIncome / horizon;
  const fallbackMonthlyIncome = incomeSourceFallback > 0 && !totalIncome ? incomeSourceFallback : 0;
  const averageMonthlyIncome = observedMonthlyIncome || fallbackMonthlyIncome;
  const averageMonthlyExpenses = totalExpenses / horizon;
  const averageMonthlyUnplanned = totalUnplanned / horizon;
  const averageMonthlyTransfers = transfersOut / horizon;
  const netMonthlyCashFlow = averageMonthlyIncome - averageMonthlyExpenses - monthlyDebtPayment;

  const categoryTotals = expensesToUse.reduce((map, expense) => {
    const category = categoryOf(expense);
    map.set(category, (map.get(category) || 0) + getExpenseAmount(expense));
    return map;
  }, new Map());

  const biggestLeak = [...categoryTotals.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([category, value]) => ({ category, amount: value, monthlyAmount: value / horizon }))[0] || null;

  const riskyCategories = unplannedExpenses.reduce((map, expense) => {
    const category = categoryOf(expense);
    map.set(category, (map.get(category) || 0) + getExpenseAmount(expense));
    return map;
  }, new Map());
  const biggestRiskyCategory = [...riskyCategories.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([category, value]) => ({ category, amount: value, monthlyAmount: value / horizon }))[0] || biggestLeak;

  const emergencyMonthlyProgress = Math.max(0, currentEmergency > 0 ? Math.min(netMonthlyCashFlow * 0.2, currentEmergency / Math.max(horizon, 1)) : 0);
  const savingsMonthlyProgress = Math.max(0, totalSavingsSaved > 0 ? Math.min(netMonthlyCashFlow * 0.25, totalSavingsSaved / Math.max(horizon, 1)) : 0);

  return {
    horizon,
    incomeRecordsUsed: incomesToUse.length,
    expenseRecordsUsed: expensesToUse.length,
    transactionRecordsUsed: transactionIncomeWindow.length + transactionExpenseWindow.length,
    currentWalletTotal,
    currentEmergency,
    emergencyTarget,
    totalSavingsSaved,
    totalSavingsTarget,
    totalDebtBalance,
    monthlyDebtPayment,
    averageMonthlyIncome,
    averageMonthlyExpenses,
    averageMonthlyUnplanned,
    averageMonthlyTransfers,
    netMonthlyCashFlow,
    projectedIncome: averageMonthlyIncome * horizon,
    projectedExpenses: averageMonthlyExpenses * horizon,
    projectedUnplannedLeak: averageMonthlyUnplanned * horizon,
    biggestLeak,
    biggestRiskyCategory,
    unplannedCount: unplannedExpenses.length,
    emergencyMonthlyProgress,
    savingsMonthlyProgress,
  };
}

function buildProjection(snapshot = {}, horizonMonths = 1) {
  const avg = monthlyAverages(snapshot, horizonMonths);
  const horizon = avg.horizon;
  const badLeakCost = avg.projectedUnplannedLeak;
  const goodEmergencyGrowth = avg.emergencyMonthlyProgress * horizon;
  const goodSavingsGrowth = avg.savingsMonthlyProgress * horizon;
  const debtReduction = Math.min(avg.totalDebtBalance, avg.monthlyDebtPayment * horizon);
  const projectedDebtBalance = Math.max(0, avg.totalDebtBalance - debtReduction);
  const projectedWalletIfSame = avg.currentWalletTotal + avg.netMonthlyCashFlow * horizon;
  const projectedWalletIfImproved = projectedWalletIfSame + badLeakCost;
  const projectedEmergencyIfGood = avg.currentEmergency + goodEmergencyGrowth;
  const projectedEmergencyIfImproved = projectedEmergencyIfGood + Math.max(0, badLeakCost * 0.35);
  const projectedSavingsIfGood = avg.totalSavingsSaved + goodSavingsGrowth;
  const projectedSavingsIfImproved = projectedSavingsIfGood + Math.max(0, badLeakCost * 0.45);
  const projectedNetPositionSame = projectedWalletIfSame + projectedEmergencyIfGood + projectedSavingsIfGood - projectedDebtBalance;
  const projectedNetPositionImproved = projectedWalletIfImproved + projectedEmergencyIfImproved + projectedSavingsIfImproved - projectedDebtBalance;

  const status = projectedNetPositionImproved > projectedNetPositionSame && avg.netMonthlyCashFlow >= 0
    ? "Improving"
    : avg.netMonthlyCashFlow >= 0
      ? "Stable"
      : projectedWalletIfSame > 0
        ? "Under Pressure"
        : "At Risk";

  return {
    ...avg,
    badLeakCost,
    goodEmergencyGrowth,
    goodSavingsGrowth,
    debtReduction,
    projectedDebtBalance,
    projectedWalletIfSame,
    projectedWalletIfImproved,
    projectedEmergencyIfGood,
    projectedEmergencyIfImproved,
    projectedSavingsIfGood,
    projectedSavingsIfImproved,
    projectedNetPositionSame,
    projectedNetPositionImproved,
    status,
  };
}

function readinessReport(snapshot = {}, horizonMonths = 1, reason = "") {
  const completeness = normalizeCompleteness(snapshot.dataCompleteness);
  const missingData = normalizeMissingData(snapshot);
  const horizonSummary = getClaraForecastHorizonSummary(snapshot);
  return {
    title: "FUTURE MONEY FORECAST",
    subtitle: "Readiness check",
    type: "readiness",
    horizonMonths: normalizeHorizonMonths(horizonMonths),
    cards: [
      {
        eyebrow: "01 / FORECAST NOT READY",
        title: "Not Enough History Yet",
        body: reason || "CLARA needs more financial behavior before this forecast becomes reliable.",
        stats: [
          stat("Requested forecast", monthLabel(horizonMonths)),
          stat("Usable history", `${horizonSummary.availableHistoryMonths} month${horizonSummary.availableHistoryMonths === 1 ? "" : "s"}`),
          stat("Data completeness", labelCompleteness(completeness)),
          stat("Gemini", "Not used"),
        ],
      },
      {
        eyebrow: "02 / WHAT CLARA NEEDS",
        title: "Build Forecast Evidence",
        body: "To unlock forecasting, keep recording wallets, income, expenses, emergency fund, savings, debts, and budget behavior.",
        stats: [
          stat("Minimum useful history", "1 month"),
          stat("Maximum forecast", "12 months"),
          stat("Rule", "Forecast cannot exceed history"),
        ],
        final: true,
        tone: "needs-data",
        missingData: missingData.length ? missingData : ["At least 1 month of consistent financial activity"],
      },
    ],
  };
}

export function buildClaraForecastReport(snapshot = {}, options = {}) {
  const horizon = normalizeHorizonMonths(options.horizonMonths || snapshot.selectedForecastHorizonMonths || 1);
  const eligibility = canBuildClaraForecast(snapshot, horizon);
  if (!eligibility.allowed) return readinessReport(snapshot, horizon, eligibility.reason);

  const projection = buildProjection(snapshot, horizon);
  const horizonText = monthLabel(horizon);
  const badCategory = projection.biggestRiskyCategory?.category || projection.biggestLeak?.category || "Unplanned spending";
  const goodSavingsText = projection.totalSavingsSaved || projection.currentEmergency ? "savings and protection are already visible" : "good money habits need more visible proof";
  const improvementLift = projection.projectedNetPositionImproved - projection.projectedNetPositionSame;

  return {
    title: "FUTURE MONEY FORECAST",
    subtitle: `${horizonText} outlook`,
    type: "projection",
    horizonMonths: horizon,
    cards: [
      {
        eyebrow: "01 / FORECAST BASIS",
        title: "How CLARA Calculated This",
        body: `This forecast uses your last ${horizonText} of local behavior and projects the next ${horizonText} using the same deterministic formula.`,
        stats: [
          stat("Forecast horizon", horizonText),
          stat("Income records used", count(projection.incomeRecordsUsed)),
          stat("Expense records used", count(projection.expenseRecordsUsed)),
          stat("Average monthly income", amount(projection.averageMonthlyIncome)),
          stat("Average monthly expenses", amount(projection.averageMonthlyExpenses)),
        ],
      },
      {
        eyebrow: "02 / BAD HABITS CLARA FOUND",
        title: "What Is Leaking Money",
        body: `CLARA found money pressure from ${badCategory}. This does not shame the user; it shows where future money can quietly disappear.`,
        stats: [
          stat("Unplanned spending count", count(projection.unplannedCount)),
          stat("Average monthly leak", amount(projection.averageMonthlyUnplanned)),
          stat("Biggest pressure area", text(badCategory)),
          stat(`${horizonText} leak cost`, amount(projection.badLeakCost)),
        ],
      },
      {
        eyebrow: "03 / IF NOTHING CHANGES",
        title: "Cost of Staying the Same",
        body: "If the risky behavior continues, money that could have built emergency fund, savings, or debt freedom may continue escaping first.",
        stats: [
          stat("Projected money left", amount(projection.projectedWalletIfSame)),
          stat("Emergency fund outcome", amount(projection.projectedEmergencyIfGood)),
          stat("Savings goal outcome", amount(projection.projectedSavingsIfGood)),
          stat("Remaining debt", amount(projection.projectedDebtBalance)),
        ],
      },
      {
        eyebrow: "04 / GOOD HABITS CLARA FOUND",
        title: "What Is Already Helping You",
        body: `CLARA also recognizes the good side: ${goodSavingsText}. These are the behaviors worth protecting.`,
        stats: [
          stat("Net monthly direction", signedAmount(projection.netMonthlyCashFlow)),
          stat("Debt payment pace", amount(projection.monthlyDebtPayment)),
          stat("Emergency fund now", amount(projection.currentEmergency)),
          stat("Savings goals now", amount(projection.totalSavingsSaved)),
        ],
      },
      {
        eyebrow: "05 / IF GOOD HABITS CONTINUE",
        title: "Value of Your Strong Side",
        body: `If the good habits continue for ${horizonText}, CLARA projects progress in protection, savings, and debt reduction where records are available.`,
        stats: [
          stat("Emergency fund growth", amount(projection.goodEmergencyGrowth)),
          stat("Savings growth", amount(projection.goodSavingsGrowth)),
          stat("Debt reduction", amount(projection.debtReduction)),
          stat("Projected debt balance", amount(projection.projectedDebtBalance)),
        ],
      },
      {
        eyebrow: "06 / BETTER FUTURE SCENARIO",
        title: "Keep Good, Fix Leaks",
        body: "This is the better version: keep the good behavior and redirect the leak instead of letting it disappear.",
        stats: [
          stat("Recovered leak potential", amount(projection.badLeakCost)),
          stat("Better money left", amount(projection.projectedWalletIfImproved)),
          stat("Better emergency fund", amount(projection.projectedEmergencyIfImproved)),
          stat("Better savings position", amount(projection.projectedSavingsIfImproved)),
        ],
      },
      {
        eyebrow: "07 / REAL FINANCIAL RESULT",
        title: `After ${horizonText}`,
        body: "This is the practical outcome CLARA can show from the selected timeframe: projected money, protection, savings, debt, and total direction.",
        stats: [
          stat("Projected money left", amount(projection.projectedWalletIfImproved)),
          stat("Projected emergency fund", amount(projection.projectedEmergencyIfImproved)),
          stat("Projected savings goals", amount(projection.projectedSavingsIfImproved)),
          stat("Projected remaining debt", amount(projection.projectedDebtBalance)),
          stat("Projected net position", amount(projection.projectedNetPositionImproved)),
        ],
      },
      {
        eyebrow: "08 / NEXT BEST MOVE",
        title: projection.status,
        body: `Imagine what can happen in ${horizonText} if you keep the habits that help you and fix the leak that slows you down. Start with one move: reduce ${badCategory} by a small fixed amount this month.`,
        final: true,
        tone: projection.status === "At Risk" ? "needs-data" : projection.status === "Under Pressure" ? "partial" : "ready",
        stats: [
          stat("Financial direction", projection.status),
          stat("Better-future lift", amount(improvementLift)),
          stat("Focus leak", text(badCategory)),
          stat("Formula", "Same engine, selected months"),
        ],
        missingData: [],
      },
    ],
  };
}
