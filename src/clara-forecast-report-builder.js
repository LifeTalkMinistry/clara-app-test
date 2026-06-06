const NOT_ENOUGH_DATA = "Not enough data yet";
const NO_MAJOR_SIGNAL = "No major signal detected";
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

function amount(value, fallback = NOT_ENOUGH_DATA) {
  if (!hasValue(value)) return fallback;
  return `₱${toNumber(value).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function signedAmount(value, fallback = NOT_ENOUGH_DATA) {
  if (!hasValue(value)) return fallback;
  const number = toNumber(value);
  const sign = number > 0 ? "+" : number < 0 ? "-" : "";
  return `${sign}${amount(Math.abs(number), "₱0")}`;
}

function count(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function text(value, fallback = NOT_ENOUGH_DATA) {
  return hasValue(value) ? String(value).trim() : fallback;
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
  return firstNumber(goal, ["savedAmount", "saved_amount", "saved", "current_amount", "currentAmount", "amount", "balance"]);
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

function categoryTotals(expenses = [], horizon = 1) {
  return expenses.reduce((map, expense) => {
    const category = categoryOf(expense);
    map.set(category, (map.get(category) || 0) + getExpenseAmount(expense));
    return map;
  }, new Map());
}

function topCategory(map = new Map(), horizon = 1) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([category, value]) => ({ category, amount: value, monthlyAmount: value / Math.max(horizon, 1) }))[0] || null;
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
  const money = currentMoney(snapshot);
  const currentWalletTotal = sum(records.wallets, getWalletBalance) || money.totalWalletBalance || 0;
  const currentMoneyLeft = hasValue(money.safeSpendableMoney) ? toNumber(money.safeSpendableMoney) : currentWalletTotal;
  const currentEmergency = getEmergencySaved(records.emergencyFund || {}) || money.emergencyProtectedAmount || 0;
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

  const allCategoryTotals = categoryTotals(expensesToUse, horizon);
  const riskyCategoryTotals = categoryTotals(unplannedExpenses, horizon);
  const biggestLeak = topCategory(allCategoryTotals, horizon);
  const biggestRiskyCategory = topCategory(riskyCategoryTotals, horizon) || biggestLeak;

  const incomeMonthCount = new Set(incomesToUse.map(getRecordDate).map(monthKey).filter(Boolean)).size;
  const expenseMonthCount = new Set(expensesToUse.map(getRecordDate).map(monthKey).filter(Boolean)).size;
  const emergencyMonthlyProgress = Math.max(0, currentEmergency > 0 ? Math.min(netMonthlyCashFlow * 0.2, currentEmergency / Math.max(horizon, 1)) : 0);
  const savingsMonthlyProgress = Math.max(0, totalSavingsSaved > 0 ? Math.min(netMonthlyCashFlow * 0.25, totalSavingsSaved / Math.max(horizon, 1)) : 0);

  return {
    horizon,
    incomeRecordsUsed: incomesToUse.length,
    expenseRecordsUsed: expensesToUse.length,
    transactionRecordsUsed: transactionIncomeWindow.length + transactionExpenseWindow.length,
    budgetRecordsUsed: records.budgets.length,
    savingsGoalRecordsUsed: records.savingsGoals.length,
    debtRecordsUsed: records.debtObligations.length,
    incomeMonthCount,
    expenseMonthCount,
    currentWalletTotal,
    currentMoneyLeft,
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

function directionFromProjection(projectedMoneyLeft, netCashFlow, projectedNetPosition) {
  if (projectedNetPosition > 0 && netCashFlow > 0) return "Improving";
  if (projectedMoneyLeft >= 0 && netCashFlow >= 0) return "Stable";
  if (projectedMoneyLeft >= 0) return "Under pressure";
  return "At risk";
}

function buildProjection(snapshot = {}, horizonMonths = 1) {
  const avg = monthlyAverages(snapshot, horizonMonths);
  const horizon = avg.horizon;
  const badLeakCost = avg.projectedUnplannedLeak;
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
  const projectedMoneyLeftIfImproved = projectedMoneyLeftIfGood + recoveredLeakPotential;
  const projectedWalletIfImproved = projectedWalletIfGood + recoveredLeakPotential;
  const projectedEmergencyIfImproved = projectedEmergencyIfGood + Math.max(0, recoveredLeakPotential * 0.35);
  const projectedSavingsIfImproved = projectedSavingsIfGood + Math.max(0, recoveredLeakPotential * 0.45);
  const projectedTotalAvailable = projectedMoneyLeftIfImproved + projectedEmergencyIfImproved + projectedSavingsIfImproved;
  const projectedNetPositionSame = projectedMoneyLeftIfSame + projectedEmergencyIfSame + projectedSavingsIfSame - avg.totalDebtBalance;
  const projectedNetPositionGood = projectedMoneyLeftIfGood + projectedEmergencyIfGood + projectedSavingsIfGood - projectedDebtBalance;
  const projectedNetPositionImproved = projectedTotalAvailable - projectedDebtBalance;
  const currentDirection = directionFromProjection(avg.currentMoneyLeft, avg.netMonthlyCashFlow, avg.currentMoneyLeft + avg.currentEmergency + avg.totalSavingsSaved - avg.totalDebtBalance);
  const badDirection = directionFromProjection(projectedMoneyLeftIfSame, avg.netMonthlyCashFlow, projectedNetPositionSame);
  const goodDirection = directionFromProjection(projectedMoneyLeftIfGood, avg.netMonthlyCashFlow, projectedNetPositionGood);
  const betterDirection = directionFromProjection(projectedMoneyLeftIfImproved, avg.netMonthlyCashFlow + avg.averageMonthlyUnplanned, projectedNetPositionImproved);

  return {
    ...avg,
    badLeakCost,
    recoveredLeakPotential,
    goodEmergencyGrowth,
    goodSavingsGrowth,
    debtReduction,
    projectedDebtBalance,
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
        tone: "neutral",
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
        tone: "neutral",
        body: "Keep recording wallets, income, expenses, emergency fund, savings, debts, and budget behavior so CLARA can build a stronger local forecast.",
        stats: [
          stat("Minimum useful history", "1 month"),
          stat("Maximum forecast", "12 months"),
          stat("Rule", "Forecast cannot exceed history"),
        ],
        final: true,
        ctaLabel: "I got it now",
        missingData: missingData.length ? missingData : ["At least 1 month of consistent financial activity"],
      },
    ],
  };
}

function signalWhen(condition, success, fallback = NO_MAJOR_SIGNAL) {
  return condition ? success : fallback;
}

function dataBasisSummary(projection = {}, availableHistoryMonths = 0) {
  const parts = [
    `${availableHistoryMonths} usable month${availableHistoryMonths === 1 ? "" : "s"}`,
    `${count(projection.incomeRecordsUsed)} income`,
    `${count(projection.expenseRecordsUsed)} expense`,
  ];
  if (projection.transactionRecordsUsed) parts.push(`${count(projection.transactionRecordsUsed)} transaction`);
  return parts.join(" · ");
}

function savingsSummary(projection = {}) {
  if (!projection.savingsGoalRecordsUsed && !projection.totalSavingsSaved && !projection.totalSavingsTarget) return NOT_ENOUGH_DATA;
  if (projection.totalSavingsTarget) return `${amount(projection.totalSavingsSaved, "₱0")} / ${amount(projection.totalSavingsTarget)}`;
  return amount(projection.totalSavingsSaved, "₱0");
}

function emergencySummary(projection = {}) {
  if (!projection.currentEmergency && !projection.emergencyTarget) return NOT_ENOUGH_DATA;
  if (projection.emergencyTarget) return `${amount(projection.currentEmergency, "₱0")} / ${amount(projection.emergencyTarget)}`;
  return amount(projection.currentEmergency, "₱0");
}

function categorySignal(categoryRecord, prefix = "Likely leak") {
  if (!categoryRecord?.category) return NOT_ENOUGH_DATA;
  return `${prefix}: ${categoryRecord.category}`;
}

function nextBestAction(projection = {}) {
  const category = projection.biggestRiskyCategory?.category || projection.biggestLeak?.category || "";
  if (category && projection.badLeakCost > 0) {
    return `Reduce ${category} first, then redirect the saved amount to emergency fund, savings, or debt.`;
  }
  if (projection.budgetRecordsUsed <= 0) return "Create one simple budget limit for your highest spending category.";
  return "Keep recording your next 7 days so CLARA can sharpen the next forecast.";
}

export function buildClaraForecastReport(snapshot = {}, options = {}) {
  const horizon = normalizeHorizonMonths(options.horizonMonths || snapshot.selectedForecastHorizonMonths || 1);
  const eligibility = canBuildClaraForecast(snapshot, horizon);
  if (!eligibility.allowed) return readinessReport(snapshot, horizon, eligibility.reason);

  const projection = buildProjection(snapshot, horizon);
  const horizonText = monthLabel(horizon);
  const horizonSummary = getClaraForecastHorizonSummary(snapshot);
  const leakCategory = projection.biggestRiskyCategory?.category || projection.biggestLeak?.category || "";
  const leakLabel = categorySignal(projection.biggestRiskyCategory || projection.biggestLeak, "Likely leak");
  const improvementLift = projection.projectedNetPositionImproved - projection.projectedNetPositionSame;
  const hasLeak = projection.badLeakCost > 0;
  const hasSavingsDiscipline = projection.totalSavingsSaved > 0 || projection.currentEmergency > 0;
  const hasDebtActivity = projection.monthlyDebtPayment > 0 || projection.debtRecordsUsed > 0;

  return {
    title: "FUTURE MONEY FORECAST",
    subtitle: `${horizonText} behavioral forecast`,
    type: "projection",
    horizonMonths: horizon,
    cards: [
      {
        eyebrow: "01 / FORECAST SETUP",
        title: "Forecast Setup",
        tone: "neutral",
        hero: horizonText,
        body: "CLARA used your local records only. No Gemini call is used for this report.",
        stats: [
          stat("Selected Forecast Horizon", horizonText),
          stat("Historical Data Used", `${horizonSummary.availableHistoryMonths} month${horizonSummary.availableHistoryMonths === 1 ? "" : "s"}`),
          stat("Forecast Confidence", labelCompleteness(snapshot.dataCompleteness)),
          stat("Data Basis Summary", dataBasisSummary(projection, horizonSummary.availableHistoryMonths)),
        ],
      },
      {
        eyebrow: "02 / CURRENT POSITION",
        title: "Current Financial Position",
        tone: "neutral",
        hero: amount(projection.currentMoneyLeft, NOT_ENOUGH_DATA),
        body: "This is the money position CLARA sees before projecting your next months.",
        stats: [
          stat("Current Money Left", amount(projection.currentMoneyLeft, NOT_ENOUGH_DATA)),
          stat("Wallet Balance", amount(projection.currentWalletTotal, NOT_ENOUGH_DATA)),
          stat("Emergency Fund", emergencySummary(projection)),
          stat("Savings Goals", savingsSummary(projection)),
          stat("Debt Balance", projection.debtRecordsUsed ? amount(projection.totalDebtBalance, "₱0") : NOT_ENOUGH_DATA),
          stat("Current Financial Direction", projection.currentDirection),
        ],
      },
      {
        eyebrow: "03 / REALITY CHECK",
        title: "Risky Habits CLARA Found",
        tone: "reality",
        body: "These are conservative signals based on available spending records. CLARA marks patterns, not judgment.",
        stats: [
          stat("Impulse Spending", signalWhen(projection.unplannedCount > 0, "Detected pattern")),
          stat("Unplanned Purchases", projection.unplannedCount > 0 ? `${count(projection.unplannedCount)} record${projection.unplannedCount === 1 ? "" : "s"}` : NO_MAJOR_SIGNAL),
          stat("Overspending Categories", leakLabel),
          stat("Spending Leaks", projection.biggestLeak ? `${categorySignal(projection.biggestLeak)} · ${amount(projection.biggestLeak.monthlyAmount)}/mo` : NOT_ENOUGH_DATA),
          stat("Financial Risks Detected", projection.badDirection === "At risk" || projection.badDirection === "Under pressure" ? projection.badDirection : NO_MAJOR_SIGNAL),
        ],
      },
      {
        eyebrow: "04 / REALITY CHECK",
        title: "What These Habits May Cost You",
        tone: "reality",
        hero: hasLeak ? amount(projection.badLeakCost) : NO_MAJOR_SIGNAL,
        body: "This slide shows the cost of leaks if the same pattern continues through the selected horizon.",
        stats: [
          stat("Monthly Leak Cost", projection.averageMonthlyUnplanned > 0 ? amount(projection.averageMonthlyUnplanned) : NO_MAJOR_SIGNAL),
          stat("Forecasted Leak Cost", hasLeak ? amount(projection.badLeakCost) : NO_MAJOR_SIGNAL),
          stat("Goals Being Delayed", hasLeak && projection.totalSavingsTarget > projection.totalSavingsSaved ? `Up to ${amount(Math.min(projection.badLeakCost, projection.totalSavingsTarget - projection.totalSavingsSaved))}` : NO_MAJOR_SIGNAL),
          stat("Emergency Fund Impact", hasLeak ? `${amount(Math.max(0, projection.badLeakCost * 0.35))} could protect you` : NO_MAJOR_SIGNAL),
          stat("Debt Impact", hasLeak && projection.totalDebtBalance > 0 ? `${amount(Math.min(projection.badLeakCost, projection.totalDebtBalance))} could reduce debt` : NO_MAJOR_SIGNAL),
        ],
      },
      {
        eyebrow: "05 / BAD FUTURE PROJECTION",
        title: "If Nothing Changes",
        tone: "reality",
        hero: amount(projection.projectedMoneyLeftIfSame, NOT_ENOUGH_DATA),
        body: "This is the pressure path: the forecast if the same income, spending, leak, savings, and debt behavior continues.",
        stats: [
          stat("Projected Money Left", amount(projection.projectedMoneyLeftIfSame, NOT_ENOUGH_DATA)),
          stat("Projected Emergency Fund", amount(projection.projectedEmergencyIfSame, "₱0")),
          stat("Projected Savings Progress", amount(projection.projectedSavingsIfSame, "₱0")),
          stat("Projected Debt Position", projection.debtRecordsUsed ? amount(projection.totalDebtBalance, "₱0") : NOT_ENOUGH_DATA),
          stat("Financial Direction", projection.badDirection),
        ],
      },
      {
        eyebrow: "06 / HOPE CHECK",
        title: "Good Habits CLARA Found",
        tone: "hope",
        body: "CLARA also looks for what is already working, so the report does not only focus on risk.",
        stats: [
          stat("Consistent Income", signalWhen(projection.incomeRecordsUsed > 0, `Based on ${count(projection.incomeRecordsUsed)} record${projection.incomeRecordsUsed === 1 ? "" : "s"}`)),
          stat("Savings Discipline", signalWhen(hasSavingsDiscipline, "Based on available records")),
          stat("Budget Usage", signalWhen(projection.budgetRecordsUsed > 0, `${count(projection.budgetRecordsUsed)} budget record${projection.budgetRecordsUsed === 1 ? "" : "s"}`)),
          stat("Emergency Fund Contributions", projection.currentEmergency > 0 ? amount(projection.currentEmergency) : NO_MAJOR_SIGNAL),
          stat("Debt Payments", signalWhen(hasDebtActivity, projection.monthlyDebtPayment > 0 ? amount(projection.monthlyDebtPayment) : "Debt records exist")),
          stat("Positive Behaviors", projection.netMonthlyCashFlow >= 0 ? "Money direction is stable or improving" : "Good records exist, but cash flow needs support"),
        ],
      },
      {
        eyebrow: "07 / HOPE CHECK",
        title: "Value of the Good Habits",
        tone: "hope",
        hero: amount(projection.debtReduction + projection.goodEmergencyGrowth + projection.goodSavingsGrowth, "₱0"),
        body: "These values come from the good behavior already visible in your local data.",
        stats: [
          stat("Future Value of Savings", amount(projection.goodSavingsGrowth, "₱0")),
          stat("Future Value of Budgeting", projection.budgetRecordsUsed > 0 ? "Budget records are active" : NOT_ENOUGH_DATA),
          stat("Future Value of Debt Reduction", amount(projection.debtReduction, "₱0")),
          stat("Future Value of Emergency Fund Growth", amount(projection.goodEmergencyGrowth, "₱0")),
        ],
      },
      {
        eyebrow: "08 / GOOD FUTURE PROJECTION",
        title: "If You Continue the Good",
        tone: "hope",
        hero: amount(projection.projectedMoneyLeftIfGood, NOT_ENOUGH_DATA),
        body: "This is the steady path if the helpful behaviors continue without adding a new improvement plan yet.",
        stats: [
          stat("Projected Money Left", amount(projection.projectedMoneyLeftIfGood, NOT_ENOUGH_DATA)),
          stat("Projected Emergency Fund", amount(projection.projectedEmergencyIfGood, "₱0")),
          stat("Projected Savings Progress", amount(projection.projectedSavingsIfGood, "₱0")),
          stat("Projected Debt Reduction", amount(projection.debtReduction, "₱0")),
          stat("Financial Direction", projection.goodDirection),
        ],
      },
      {
        eyebrow: "09 / POSSIBILITY PLAN",
        title: "Keep the Good, Fix the Bad",
        tone: "possibility",
        body: "The better future does not require changing everything. CLARA starts with protecting what works and fixing the biggest leak first.",
        stats: [
          stat("Good Habits to Protect", hasSavingsDiscipline || projection.incomeRecordsUsed > 0 ? "Income, savings, protection, and budget signals" : NOT_ENOUGH_DATA),
          stat("Biggest Leak to Fix", leakCategory ? `Likely leak: ${leakCategory}` : NOT_ENOUGH_DATA),
          stat("Recommended Adjustments", nextBestAction(projection)),
          stat("Highest Impact Change", hasLeak ? `Recover up to ${amount(projection.badLeakCost)} over ${horizonText}` : "Record more spending evidence first"),
        ],
      },
      {
        eyebrow: "10 / BEST FUTURE PROJECTION",
        title: "Your Better Future Outcome",
        tone: "possibility",
        hero: amount(projection.projectedTotalAvailable, NOT_ENOUGH_DATA),
        body: `This is the better direction if you keep the good habits and redirect the leak CLARA found. One next best action: ${nextBestAction(projection)}`,
        final: true,
        ctaLabel: "I got it now",
        stats: [
          stat("Projected Money Left", amount(projection.projectedMoneyLeftIfImproved, NOT_ENOUGH_DATA)),
          stat("Projected Emergency Fund", amount(projection.projectedEmergencyIfImproved, "₱0")),
          stat("Projected Savings Goal Completion", amount(projection.projectedSavingsIfImproved, "₱0")),
          stat("Projected Debt Balance", projection.debtRecordsUsed ? amount(projection.projectedDebtBalance, "₱0") : NOT_ENOUGH_DATA),
          stat("Projected Total Available Money", amount(projection.projectedTotalAvailable, NOT_ENOUGH_DATA)),
          stat("Financial Direction", projection.betterDirection),
          stat("One Next Best Action", nextBestAction(projection)),
          stat("Better-future lift", amount(improvementLift, "₱0")),
        ],
        missingData: [],
      },
    ],
  };
}
