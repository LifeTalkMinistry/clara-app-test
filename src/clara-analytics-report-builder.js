const NOT_ENOUGH_DATA = "Not enough data to generate result";
const MAX_ANALYSIS_MONTHS = 12;

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value = 0) {
  return `₱${toNumber(value).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function stat(label, value) {
  return { label, value };
}

function normalizeAnalysisMonths(value = 1) {
  const months = Math.round(toNumber(value));
  return Math.min(Math.max(months || 1, 1), MAX_ANALYSIS_MONTHS);
}

function monthLabel(months = 1) {
  const safeMonths = normalizeAnalysisMonths(months);
  return `${safeMonths} month${safeMonths === 1 ? "" : "s"}`;
}

function firstNumber(source = {}, keys = []) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return toNumber(value);
  }
  return 0;
}

function firstText(source = {}, keys = []) {
  for (const key of keys) {
    const value = source?.[key];
    if (clean(value)) return clean(value);
  }
  return "";
}

function getRecords(snapshot = {}) {
  const records = snapshot.forecastRecords || snapshot.analyticsRecords || {};
  return {
    wallets: toArray(records.wallets),
    incomes: toArray(records.incomes),
    incomeSources: toArray(records.incomeSources),
    expenses: toArray(records.expenses),
    walletTransactions: toArray(records.walletTransactions),
    transfers: toArray(records.transfers),
    budgets: toArray(records.budgets),
    savingsGoals: toArray(records.savingsGoals),
    debtObligations: toArray(records.debtObligations),
    emergencyFund: records.emergencyFund || null,
  };
}

function getRecordDate(record = {}) {
  const raw = record.date || record.transactionDate || record.transaction_date || record.createdAt || record.created_at || record.updatedAt || record.updated_at || record.dueDate || record.due_date || record.targetDate || record.target_date || "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function transactionType(record = {}) {
  return firstText(record, ["type", "transaction_type", "kind", "movementType", "movement_type"]).toLowerCase();
}

function isOpeningBalance(record = {}) {
  const type = transactionType(record);
  const text = clean(`${record.source || ""} ${record.reason || ""} ${record.title || ""} ${record.note || ""}`).toLowerCase();
  return type === "opening_balance" || text.includes("opening balance");
}

function isInternalMovement(record = {}) {
  const type = transactionType(record);
  const text = clean(`${type} ${record.source || ""} ${record.title || ""} ${record.note || ""}`).toLowerCase();
  return ["transfer", "internal_transfer", "wallet_transfer", "move", "movement", "internal_movement"].includes(type) || text.includes("wallet transfer") || text.includes("internal movement");
}

function isIncomeTransaction(record = {}) {
  if (isOpeningBalance(record) || isInternalMovement(record)) return false;
  return ["income", "add", "cash_in", "deposit", "credit"].includes(transactionType(record));
}

function isExpenseTransaction(record = {}) {
  if (isInternalMovement(record)) return false;
  return ["expense", "withdrawal", "debit", "spend", "purchase", "cash_out"].includes(transactionType(record));
}

function amountOf(record = {}) {
  return firstNumber(record, ["amount", "total", "value"]);
}

function walletBalance(wallet = {}) {
  return firstNumber(wallet, ["balance", "currentBalance", "current_balance", "derived_balance", "spendableBalance", "available_balance"]);
}

function emergencySaved(record = {}) {
  return firstNumber(record || {}, ["savedAmount", "saved_amount", "saved", "currentAmount", "current_amount", "amount", "balance"]);
}

function emergencyTarget(record = {}) {
  return firstNumber(record || {}, ["targetAmount", "target_amount", "target", "goal_amount"]);
}

function savingsSaved(record = {}) {
  return firstNumber(record, ["savedAmount", "saved_amount", "saved", "currentAmount", "current_amount", "amount", "balance"]);
}

function savingsTarget(record = {}) {
  return firstNumber(record, ["targetAmount", "target_amount", "target", "goal_amount"]);
}

function debtBalance(record = {}) {
  return firstNumber(record, ["balance", "totalDebt", "total_debt", "remainingBalance", "remaining_balance", "amount"]);
}

function debtPayment(record = {}) {
  return firstNumber(record, ["monthlyDebt", "monthly_debt", "monthlyPayment", "monthly_payment", "payment", "scheduledPayment", "scheduled_payment"]);
}

function categoryOf(record = {}) {
  return firstText(record, ["category", "categoryName", "category_name", "budgetCategory", "budget_category", "title", "name", "type"]) || "Uncategorized";
}

function isUnplanned(record = {}) {
  const text = `${record.planningStatus || ""} ${record.planning_status || ""} ${record.budgetStatus || ""} ${record.budget_status || ""} ${record.status || ""} ${record.needType || ""} ${record.need_type || ""}`.toLowerCase();
  return /unplanned|outside|undocumented|over budget|over-budget|not planned|unbudgeted/.test(text);
}

function activeMonthSummary(snapshot = {}) {
  const records = getRecords(snapshot);
  const months = new Set();
  const dates = [];
  const add = (record) => {
    const date = getRecordDate(record);
    const key = monthKey(date);
    if (!key) return;
    months.add(key);
    dates.push(date);
  };
  records.incomes.forEach((record) => amountOf(record) > 0 && !isOpeningBalance(record) && add(record));
  records.expenses.forEach((record) => amountOf(record) > 0 && add(record));
  records.walletTransactions.forEach((record) => ((isIncomeTransaction(record) || isExpenseTransaction(record)) && amountOf(record) > 0) && add(record));
  const minDate = dates.length ? dates.reduce((oldest, date) => date < oldest ? date : oldest, dates[0]) : null;
  const maxDate = dates.length ? dates.reduce((latest, date) => date > latest ? date : latest, dates[0]) : null;
  const dateSpanMonths = minDate && maxDate ? Math.max(1, ((maxDate.getFullYear() - minDate.getFullYear()) * 12) + (maxDate.getMonth() - minDate.getMonth()) + 1) : 0;
  return { activeFinancialMonths: months.size, availableHistoryMonths: months.size, dateSpanMonths: Math.min(12, dateSpanMonths), latestRecordDate: maxDate };
}

function hasUsableFinanceContext(snapshot = {}) {
  const records = getRecords(snapshot);
  return records.wallets.length || records.incomes.length || records.incomeSources.length || records.expenses.length || records.walletTransactions.length || records.budgets.length || records.savingsGoals.length || records.debtObligations.length || records.emergencyFund;
}

export function getClaraAnalyticsWindowSummary(snapshot = {}) {
  const history = activeMonthSummary(snapshot);
  const hasAnyContext = Boolean(hasUsableFinanceContext(snapshot));
  const eligibleMonths = hasAnyContext ? Array.from({ length: Math.min(MAX_ANALYSIS_MONTHS, history.availableHistoryMonths) }, (_, index) => index + 1) : [];
  return { ...history, hasAnyContext, eligibleMonths, maxAnalysisMonths: MAX_ANALYSIS_MONTHS, hasAnyEligibleWindow: eligibleMonths.length > 0 };
}

export function canBuildClaraAnalytics(snapshot = {}, analysisMonths = 1) {
  const months = normalizeAnalysisMonths(analysisMonths);
  const summary = getClaraAnalyticsWindowSummary(snapshot);
  return {
    allowed: summary.hasAnyContext && summary.availableHistoryMonths >= months,
    analysisMonths: months,
    availableHistoryMonths: summary.availableHistoryMonths,
    reason: !summary.hasAnyContext ? "CLARA needs at least one saved money record before analysis." : summary.availableHistoryMonths < months ? `CLARA only has about ${summary.availableHistoryMonths} active financial month${summary.availableHistoryMonths === 1 ? "" : "s"} of usable records.` : "Ready",
  };
}

export function buildClaraAnalyticsReport(snapshot = {}, options = {}) {
  const analysisMonths = normalizeAnalysisMonths(options.analysisMonths || 1);
  const records = getRecords(snapshot);
  const eligibility = canBuildClaraAnalytics(snapshot, analysisMonths);
  const summary = getClaraAnalyticsWindowSummary(snapshot);
  const latestDate = summary.latestRecordDate || new Date();
  const start = new Date(latestDate.getFullYear(), latestDate.getMonth() - analysisMonths + 1, 1);
  const inWindow = (record) => {
    const date = getRecordDate(record);
    return date && date >= start && date <= latestDate;
  };

  const incomeRecords = records.incomes.filter((record) => inWindow(record) && !isOpeningBalance(record));
  const txIncomeRecords = records.walletTransactions.filter((record) => inWindow(record) && isIncomeTransaction(record));
  const expenseRecords = records.expenses.filter(inWindow);
  const txExpenseRecords = expenseRecords.length ? [] : records.walletTransactions.filter((record) => inWindow(record) && isExpenseTransaction(record));
  const expenses = [...expenseRecords, ...txExpenseRecords];
  const income = incomeRecords.length ? incomeRecords.reduce((total, record) => total + amountOf(record), 0) : txIncomeRecords.reduce((total, record) => total + amountOf(record), 0);
  const totalExpenses = expenses.reduce((total, record) => total + amountOf(record), 0);
  const netCashFlow = income - totalExpenses;
  const walletTotal = records.wallets.reduce((total, wallet) => total + walletBalance(wallet), 0) || toNumber(snapshot.currentMoney?.totalWalletBalance);
  const moneyLeft = toNumber(snapshot.currentMoney?.safeSpendableMoney ?? snapshot.currentMoney?.moneyLeft ?? walletTotal);
  const categoryMap = expenses.reduce((map, record) => {
    const category = categoryOf(record);
    map.set(category, (map.get(category) || 0) + amountOf(record));
    return map;
  }, new Map());
  const topCategory = [...categoryMap.entries()].sort((a, b) => b[1] - a[1])[0] || null;
  const unplanned = expenses.filter(isUnplanned);
  const unplannedTotal = unplanned.reduce((total, record) => total + amountOf(record), 0);
  const emergencyAmount = emergencySaved(records.emergencyFund || {});
  const emergencyGoal = emergencyTarget(records.emergencyFund || {});
  const savingsAmount = records.savingsGoals.reduce((total, record) => total + savingsSaved(record), 0);
  const savingsGoal = records.savingsGoals.reduce((total, record) => total + savingsTarget(record), 0);
  const debtTotal = records.debtObligations.reduce((total, record) => total + debtBalance(record), 0);
  const monthlyDebt = records.debtObligations.reduce((total, record) => total + debtPayment(record), 0);
  const avgExpenses = totalExpenses / Math.max(analysisMonths, 1);
  const pressure = income > 0 && totalExpenses / income >= 0.9 ? "High pressure" : income > 0 && totalExpenses / income >= 0.75 ? "Moderate pressure" : "Manageable";
  const diagnosis = !eligibility.allowed ? "Not enough data" : netCashFlow < 0 ? "At risk" : unplannedTotal > 0 ? "Leaking" : pressure !== "Manageable" ? "Pressured" : savingsAmount > 0 || emergencyAmount > 0 ? "Recovering" : "Stable";
  const nextAction = !eligibility.allowed ? "Add income and expense records first so CLARA can read your actual pattern." : unplannedTotal > 0 && topCategory ? `Cap ${topCategory[0]} spending and protect ${money(unplannedTotal)} this month.` : netCashFlow < 0 ? `Reduce expenses by at least ${money(Math.abs(netCashFlow))} this month.` : emergencyGoal > emergencyAmount ? `Add a small fixed amount toward the emergency fund gap of ${money(emergencyGoal - emergencyAmount)}.` : "Keep tracking every major money movement this month.";
  const safe = (value) => eligibility.allowed ? value : NOT_ENOUGH_DATA;
  const period = monthLabel(analysisMonths);
  const missingData = eligibility.allowed ? [] : [eligibility.reason];

  const cards = [
    { eyebrow: "01 / ANALYTIC SETUP", title: "Analytic Setup", tone: "neutral", hero: safe(period), body: eligibility.allowed ? "CLARA used your local money records to read what is happening in the selected analysis window." : eligibility.reason, stats: [stat("Selected Analysis Period", safe(period)), stat("Available History", summary.availableHistoryMonths ? `${summary.availableHistoryMonths} active month${summary.availableHistoryMonths === 1 ? "" : "s"}` : NOT_ENOUGH_DATA), stat("Date Span Observed", summary.dateSpanMonths ? `${summary.dateSpanMonths} month${summary.dateSpanMonths === 1 ? "" : "s"}` : NOT_ENOUGH_DATA), stat("Records Used", safe(`${incomeRecords.length + txIncomeRecords.length + expenses.length} records`))] },
    { eyebrow: "02 / CURRENT POSITION", title: "Current Financial Position", tone: "neutral", hero: safe(money(moneyLeft)), body: "This is the current base CLARA sees before checking income, spending, protection, and debt pressure.", stats: [stat("Money Left", safe(money(moneyLeft))), stat("Total Wallet Balance", safe(money(walletTotal))), stat("Emergency Fund", safe(money(emergencyAmount))), stat("Savings Protected", safe(money(savingsAmount))), stat("Debt Balance", safe(debtTotal > 0 ? money(debtTotal) : "No debt records found"))] },
    { eyebrow: "03 / INCOME REALITY", title: "Income Reality", tone: "neutral", hero: safe(`${money(income)} actual income`), body: eligibility.allowed && income > 0 ? "CLARA found usable income records for this analysis window. This gives the report a clear income baseline before comparing your spending, savings, and money pressure." : "CLARA needs usable income records to build a clearer income baseline for this analysis window.", stats: [stat("Actual Income Received", safe(money(income))), stat("Recorded Income Entries", safe(`${incomeRecords.length || txIncomeRecords.length} record${(incomeRecords.length || txIncomeRecords.length) === 1 ? "" : "s"}`)), stat("Income Sources Found", safe(`${records.incomeSources.length} source${records.incomeSources.length === 1 ? "" : "s"}`)), stat("Income Consistency", safe((incomeRecords.length || txIncomeRecords.length) > 0 ? "Income recorded this period" : "No income recorded this period")), stat("Income Signal", safe(income > 0 ? "Visible enough for analysis" : "Needs income records"))] },
    { eyebrow: "04 / SPENDING REALITY", title: "Spending Reality", tone: "reality", hero: safe(money(totalExpenses)), body: "This is the actual spending pressure found in the selected analysis window.", stats: [stat("Actual Expenses", safe(money(totalExpenses))), stat("Average Monthly Expenses", safe(money(avgExpenses))), stat("Expense Records Used", safe(`${expenses.length} record${expenses.length === 1 ? "" : "s"}`)), stat("Spending Pressure", safe(pressure)), stat("Net Cash Flow", safe(money(netCashFlow)))] },
    { eyebrow: "05 / CATEGORY ANALYSIS", title: "Top Spending Categories", tone: "reality", hero: safe(topCategory ? topCategory[0] : "No major leak detected"), body: "This shows where most spending actually went during the selected analysis window.", stats: [stat("Biggest Spending Category", safe(topCategory ? topCategory[0] : "No major leak detected")), stat("Top Category Amount", safe(topCategory ? money(topCategory[1]) : "₱0")), stat("Top Spending Areas", safe([...categoryMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, value]) => `${name}: ${money(value)}`).join(" · ") || "No category spending found"))] },
    { eyebrow: "06 / BUDGET ALIGNMENT", title: "Budget Alignment", tone: "hope", hero: safe(records.budgets.length ? "Reviewed" : "No budget records"), body: "This compares actual spending with the budget categories CLARA can read locally.", stats: [stat("Budget Records Used", safe(`${records.budgets.length} record${records.budgets.length === 1 ? "" : "s"}`)), stat("Actual Spending", safe(money(totalExpenses))), stat("Over-Budget Categories", safe("Review current categories")), stat("Unbudgeted Areas", safe("Check uncategorized spending"))] },
    { eyebrow: "07 / LEAK SIGNALS", title: "Money Leak Signals", tone: unplannedTotal > 0 ? "reality" : "hope", hero: safe(unplannedTotal > 0 ? money(unplannedTotal) : "No major leak detected"), body: "This identifies current leak signals from unplanned spending and budget overages.", stats: [stat("Unplanned Spending Count", safe(`${unplanned.length} record${unplanned.length === 1 ? "" : "s"}`)), stat("Unplanned Spending Total", safe(money(unplannedTotal))), stat("Repeated Leak Pattern", safe(unplanned.length >= 2 ? "Detected" : "Not detected")), stat("Leak Category", safe(topCategory ? topCategory[0] : "No major leak detected"))] },
    { eyebrow: "08 / PROTECTION STATUS", title: "Savings / Emergency / Debt Status", tone: emergencyGoal > emergencyAmount || debtTotal > 0 ? "reality" : "hope", hero: safe(emergencyGoal > emergencyAmount ? "Emergency gap open" : debtTotal > 0 ? "Debt still active" : "Protection started"), body: "This reads how much money is protected and how much pressure still comes from debt or emergency gaps.", stats: [stat("Protected Money", safe(money(emergencyAmount + savingsAmount))), stat("Emergency Gap", safe(emergencyGoal > 0 ? money(Math.max(0, emergencyGoal - emergencyAmount)) : NOT_ENOUGH_DATA)), stat("Savings Progress", safe(savingsGoal > 0 ? `${Math.round((savingsAmount / savingsGoal) * 100)}%` : NOT_ENOUGH_DATA)), stat("Debt Pressure", safe(debtTotal > 0 ? "Active debt pressure" : "No debt records found")), stat("Monthly Debt Payment", safe(monthlyDebt > 0 ? money(monthlyDebt) : "No debt records found"))] },
    { eyebrow: "09 / CURRENT DIAGNOSIS", title: "Current Behavior Diagnosis", tone: ["At risk", "Leaking", "Pressured"].includes(diagnosis) ? "reality" : "hope", hero: safe(diagnosis), body: "This is CLARA's current diagnosis based only on local records in the selected analysis window.", stats: [stat("Current Financial Diagnosis", safe(diagnosis)), stat("Net Cash Flow", safe(money(netCashFlow))), stat("Spending Pressure", safe(pressure)), stat("Leak Status", safe(unplannedTotal > 0 ? "Active signal" : "No major signal"))] },
    { eyebrow: "10 / NEXT BEST ACTION", title: "Best Action This Month", tone: "possibility", hero: safe("1 action"), body: eligibility.allowed ? "Start here first. This is the clearest action CLARA sees from the selected analysis window." : "Start by adding enough local records for CLARA to read your actual money situation.", stats: [stat("Best Action This Month", nextAction), stat("Focus Area", safe(topCategory ? topCategory[0] : diagnosis)), stat("Amount To Control", safe(unplannedTotal > 0 ? money(unplannedTotal) : money(Math.max(0, Math.abs(netCashFlow))))), stat("Why This Matters", safe("It protects current money decisions before another spending cycle starts."))], final: true, ctaLabel: "Close Analytic", missingData },
  ];

  return {
    title: "CURRENT MONEY ANALYTIC",
    subtitle: `${period} financial analysis`,
    type: eligibility.allowed ? "analysis" : "readiness",
    analysisMonths,
    cards,
    audit: { version: "analytics-audit-v1", analysis: { selectedAnalysisMonths: analysisMonths, activeFinancialMonths: summary.availableHistoryMonths }, rawTotals: { totalWalletBalance: walletTotal, moneyLeft, income, totalExpenses, netCashFlow, emergencyAmount, savingsAmount, debtTotal }, diagnosis: { currentDiagnosis: diagnosis, nextBestAction: nextAction }, missingData, slideTrace: {} },
  };
}
