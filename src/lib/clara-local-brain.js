import { buildClaraBudgetSnapshot } from "./clara-budget-snapshot";

const CLARA_UNKNOWN_REPLY =
  "I can help with money decisions, spending, wallet health, budgets, savings, emergency fund, or purchase checks. What do you want to check?";
const CLARA_LOADING_REPLY = "Dashboard data is still loading. Try again in a second.";
const CLARA_NOT_ENOUGH_DATA_REPLY =
  "I need more dashboard data before I can answer that clearly. Add wallets, expenses, budgets, savings, or emergency fund details first.";

const INTENTS = {
  FUTURE_FORECAST: "future_forecast",
  SPENDING_CHECK: "spending_check",
  WALLET_HEALTH: "wallet_health",
  AVAILABLE_MONEY: "available_money",
  BUDGET_CHECK: "budget_check",
  SAVINGS_CHECK: "savings_check",
  EMERGENCY_FUND_CHECK: "emergency_fund_check",
  PURCHASE_DECISION: "purchase_decision",
  DAILY_WARNING: "daily_warning",
  UNKNOWN: "unknown",
};

function cleanText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s₱.,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const cleaned = String(value).replace(/php/gi, "").replace(/[₱,\s]/g, "").trim();
    const number = Number(cleaned);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function getText(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return String(value).trim();
  }
  return "";
}

function formatMoney(value) {
  const number = getNumber(value);
  if (number === null) return null;
  return `₱${number.toLocaleString("en-PH", { maximumFractionDigits: number % 1 === 0 ? 0 : 2 })}`;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getPath(source, path) {
  return String(path || "").split(".").reduce((current, key) => current?.[key], source);
}

function firstNumber(source, paths = []) {
  for (const path of paths) {
    const number = getNumber(getPath(source, path));
    if (number !== null) return number;
  }
  return null;
}

function firstArray(source, paths = []) {
  for (const path of paths) {
    const value = getPath(source, path);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function sumNumbers(values = []) {
  return asArray(values).reduce((sum, value) => sum + (getNumber(value) ?? 0), 0);
}

function clampPercent(value) {
  const number = getNumber(value);
  if (number === null) return null;
  return Math.max(0, Math.min(number, 100));
}

function getDateMonthKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getExpenseDate(expense = {}) {
  return getText(expense.date, expense.created_at, expense.createdAt, expense.spent_at, expense.logged_at, expense.transaction_date, expense.transactionDate);
}

function normalizeWallet(wallet = {}) {
  return {
    id: wallet.id || wallet.wallet_id || wallet.local_id || wallet.name || "wallet",
    name: getText(wallet.name, wallet.wallet_name, wallet.title, wallet.label, "Wallet"),
    balance: getNumber(wallet.derived_balance, wallet.balance, wallet.current_balance, wallet.wallet_balance, wallet.available_balance, wallet.amount, wallet.total, wallet.starting_balance),
    raw: wallet,
  };
}

function normalizeExpense(expense = {}) {
  const amount = getNumber(expense.amount, expense.total, expense.value, expense.expense_amount, expense.spent_amount, expense.price);
  const date = getExpenseDate(expense);
  const planningStatus = cleanText(getText(expense.planning_status, expense.planningStatus, expense.budget_status, expense.status));
  const needType = cleanText(getText(expense.need_type, expense.needType, expense.type, expense.spending_type));
  const category = getText(expense.budget_category, expense.expense_category, expense.category, expense.category_name, expense.type, "Expense");
  const isPlanned = planningStatus.includes("unplanned")
    ? false
    : planningStatus.includes("planned") || planningStatus.includes("budget risk") || planningStatus.includes("over budget")
      ? true
      : typeof expense.planned === "boolean"
        ? expense.planned
        : typeof expense.is_planned === "boolean"
          ? expense.is_planned
          : null;
  const isNeed = needType.includes("need") && !needType.includes("want") ? true : needType.includes("want") ? false : null;

  return {
    id: expense.id || expense.expense_id || expense.local_id || `${date}-${amount}`,
    amount,
    date,
    monthKey: getDateMonthKey(date),
    category,
    merchant: getText(expense.merchant, expense.name, expense.title, expense.note),
    walletId: expense.wallet_id || expense.walletId || expense.wallet,
    planningStatus,
    needType,
    isPlanned,
    isNeed,
    raw: expense,
  };
}

function normalizeWalletTransaction(transaction = {}) {
  const amount = getNumber(transaction.amount, transaction.value, transaction.total, transaction.transaction_amount);
  const type = cleanText(getText(transaction.type, transaction.transaction_type, transaction.kind, transaction.action));
  const date = getText(transaction.date, transaction.created_at, transaction.createdAt, transaction.transaction_date, transaction.transactionDate, transaction.logged_at);
  return {
    id: transaction.id || transaction.transaction_id || transaction.local_id || `${date}-${amount}`,
    amount,
    type,
    date,
    monthKey: getDateMonthKey(date),
    walletId: transaction.wallet_id || transaction.walletId || transaction.wallet,
    title: getText(transaction.title, transaction.name, transaction.note, transaction.description),
    raw: transaction,
  };
}

function normalizeTransfer(transfer = {}) {
  const amount = getNumber(transfer.amount, transfer.value, transfer.total, transfer.transfer_amount);
  const date = getText(transfer.date, transfer.created_at, transfer.createdAt, transfer.transaction_date, transfer.transactionDate, transfer.logged_at);
  return {
    id: transfer.id || transfer.transfer_id || transfer.local_id || `${date}-${amount}`,
    amount,
    date,
    monthKey: getDateMonthKey(date),
    fromWalletId: transfer.from_wallet_id || transfer.fromWalletId || transfer.from_wallet,
    toWalletId: transfer.to_wallet_id || transfer.toWalletId || transfer.to_wallet,
    title: getText(transfer.title, transfer.name, transfer.note, transfer.description, "Transfer"),
    raw: transfer,
  };
}

function normalizeSavingsGoal(goal = {}) {
  const saved = getNumber(goal.saved, goal.current, goal.saved_amount, goal.current_amount, goal.amount, goal.progress);
  const target = getNumber(goal.target, goal.goal, goal.target_amount, goal.goal_amount, goal.required_amount);
  return {
    id: goal.id || goal.goal_id || goal.local_id || goal.title || "savings-goal",
    name: getText(goal.name, goal.title, goal.goal_name, "Savings goal"),
    saved,
    target,
    percent: saved !== null && target !== null && target > 0 ? clampPercent((saved / target) * 100) : null,
    raw: goal,
  };
}

function buildEmergencyFund(context = {}) {
  const fund = context.emergencyFund || context.emergency_fund || {};
  const saved = getNumber(fund.saved, fund.current, fund.currentAmount, fund.current_amount, fund.amount, fund.saved_amount, context.emergencyFundSaved, context.emergency_fund_saved);
  const target = getNumber(fund.target, fund.goal, fund.targetAmount, fund.target_amount, fund.goal_amount, context.emergencyFundTarget, context.emergency_fund_target, context.survivalExpense);
  const monthsCovered = getNumber(fund.monthsCovered, fund.months_covered, fund.months, context.emergencyFundMonths, context.emergency_fund_months);
  const explicitPercent = clampPercent(fund.percentage || fund.percent || fund.progressPercent || fund.progress_percent);
  const percent = explicitPercent !== null ? explicitPercent : saved !== null && target !== null && target > 0 ? clampPercent((saved / target) * 100) : null;
  return { saved, target, monthsCovered, percent, remaining: saved !== null && target !== null ? Math.max(target - saved, 0) : null, summary: getText(fund.summary), raw: fund };
}

function buildSpendingBreakdown(expenses = [], currentMonthKey = getCurrentMonthKey()) {
  const safeExpenses = asArray(expenses);
  const datedExpenses = safeExpenses.filter((expense) => expense.monthKey);
  const currentMonthExpenses = datedExpenses.length ? safeExpenses.filter((expense) => expense.monthKey === currentMonthKey) : safeExpenses;
  const monthlySpent = sumNumbers(currentMonthExpenses.map((expense) => expense.amount));
  const spendingByCategory = currentMonthExpenses.reduce((map, expense) => {
    const category = getText(expense.category, "Expense");
    map[category] = (map[category] || 0) + (getNumber(expense.amount) || 0);
    return map;
  }, {});
  const topCategory = Object.entries(spendingByCategory).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount }))[0] || null;
  return {
    currentMonthExpenses,
    monthlySpent: currentMonthExpenses.length ? monthlySpent : null,
    monthlySpentLabel: datedExpenses.length ? "this month" : "visible expenses",
    totalSpent: safeExpenses.length ? sumNumbers(safeExpenses.map((expense) => expense.amount)) : null,
    plannedSpent: sumNumbers(currentMonthExpenses.filter((expense) => expense.isPlanned === true).map((expense) => expense.amount)) || null,
    unplannedSpent: sumNumbers(currentMonthExpenses.filter((expense) => expense.isPlanned === false).map((expense) => expense.amount)) || null,
    needsSpent: sumNumbers(currentMonthExpenses.filter((expense) => expense.isNeed === true).map((expense) => expense.amount)) || null,
    wantsSpent: sumNumbers(currentMonthExpenses.filter((expense) => expense.isNeed === false).map((expense) => expense.amount)) || null,
    spendingByCategory,
    topCategory,
  };
}

function getPurchasePrice(message = "") {
  const matches = [...String(message || "").replace(/,/g, "").matchAll(/(?:₱|php\s*)?(\d+(?:\.\d{1,2})?)/gi)]
    .map((match) => Number(match[1]))
    .filter((number) => Number.isFinite(number) && number > 0);
  return matches.length ? Math.max(...matches) : null;
}

function hasActiveBudgetPlan(snapshot = {}) {
  return Boolean(snapshot?.budgetPlan?.hasDeclaredBudget || snapshot?.hasActiveBudgetPlan === true);
}

function getBudgetPressure(plan = {}) {
  if (!plan.hasDeclaredBudget) return "none";
  if (plan.isOverspent || plan.remainingSpendableBudget <= 0) return "high";
  if (plan.declaredBudget > 0 && plan.remainingSpendableBudget < plan.declaredBudget * 0.2) return "medium";
  return "low";
}

export function buildClaraFinanceSnapshot(context = {}) {
  const source = { ...(context?.financeSnapshot || {}), ...(context?.dashboardSnapshot || {}), ...(context || {}) };
  const rawExpenses = firstArray(source, ["expenses", "monthlyExpensesList", "recentExpenses", "finance.expenses"]);
  const expenses = rawExpenses.map(normalizeExpense);
  const wallets = firstArray(source, ["wallets", "userWallets", "finance.wallets"]).map(normalizeWallet);
  const walletTransactions = firstArray(source, ["walletTransactions", "wallet_transactions", "transactions", "finance.walletTransactions"]).map(normalizeWalletTransaction);
  const transfers = firstArray(source, ["transfers", "walletTransfers", "wallet_transfers", "finance.transfers"]).map(normalizeTransfer);
  const budgetPlan = buildClaraBudgetSnapshot({ ...source, expenses: rawExpenses });
  const budgets = budgetPlan.hasBudgetCategories ? budgetPlan.categories : [];
  const savingsGoals = [
    ...firstArray(source, ["savingsGoals", "savings_goals", "goals", "finance.savingsGoals"]),
    ...(source.savings && !Array.isArray(source.savings) ? [source.savings] : []),
    ...(source.savingsGoal ? [source.savingsGoal] : []),
  ].map(normalizeSavingsGoal);
  const walletTotal = wallets.length ? sumNumbers(wallets.map((wallet) => wallet.balance)) : null;
  const availableMoney = firstNumber(source, ["totalAvailableMoney", "totalMoneyLeft", "moneyLeftThisMonth", "availableMoney", "walletMoney", "totalWalletBalance", "cashAvailable", "finance.availableMoney"]);
  const totalWalletBalance = firstNumber(source, ["totalWalletBalance", "walletMoney", "finance.totalWalletBalance"]) ?? walletTotal;
  const resolvedAvailableMoney = availableMoney ?? totalWalletBalance;
  const spendingBreakdown = buildSpendingBreakdown(expenses);
  const monthlySpent = firstNumber(source, ["monthlySpent", "totalExpensesThisMonth", "thisMonthSpent", "monthlyExpenses", "spentThisMonth", "finance.monthlySpent"]) ?? spendingBreakdown.monthlySpent;
  const savingsSaved = firstNumber(source, ["totalSavingsSaved", "savingsSaved", "savedAmount"]) ?? (savingsGoals.length ? sumNumbers(savingsGoals.map((goal) => goal.saved)) : null);
  const savingsTarget = firstNumber(source, ["totalSavingsTarget", "savingsTarget", "targetSavings"]) ?? (savingsGoals.length ? sumNumbers(savingsGoals.map((goal) => goal.target)) : null);
  const emergencyFund = buildEmergencyFund(source);
  const income = firstNumber(source, ["income", "monthlyIncome", "incomeThisMonth", "totalIncome", "addedFunds", "addFunds", "fundsAdded", "finance.income"]);
  const hasAnyData = Boolean(wallets.length || expenses.length || walletTransactions.length || transfers.length || budgets.length || savingsGoals.length || resolvedAvailableMoney !== null || monthlySpent !== null || budgetPlan.hasDeclaredBudget || budgetPlan.spentTotal > 0 || savingsSaved !== null || savingsTarget !== null || emergencyFund.saved !== null || emergencyFund.target !== null || income !== null);

  return {
    rawContext: source,
    hasAnyData,
    dataStatus: hasAnyData ? "ready" : "loading",
    hasActiveBudgetPlan: budgetPlan.hasDeclaredBudget,
    wallets,
    walletCount: wallets.length,
    walletBalances: wallets.map((wallet) => ({ id: wallet.id, name: wallet.name, balance: wallet.balance })),
    totalBalance: totalWalletBalance,
    totalWalletBalance,
    availableMoney: resolvedAvailableMoney,
    expenses,
    expenseCount: expenses.length,
    currentMonthExpenses: spendingBreakdown.currentMonthExpenses,
    monthlySpent,
    totalExpensesCurrentMonth: monthlySpent,
    monthlySpentLabel: spendingBreakdown.monthlySpentLabel,
    totalSpent: spendingBreakdown.totalSpent,
    plannedSpent: budgetPlan.plannedSpent || spendingBreakdown.plannedSpent,
    unplannedSpent: budgetPlan.unplannedSpent || spendingBreakdown.unplannedSpent,
    undocumentedSpent: budgetPlan.undocumentedSpent,
    needsSpent: spendingBreakdown.needsSpent,
    wantsSpent: spendingBreakdown.wantsSpent,
    spendingByCategory: spendingBreakdown.spendingByCategory,
    topSpendingCategory: spendingBreakdown.topCategory,
    walletTransactions,
    transfers,
    budgets,
    budgetAllocated: budgetPlan.allocatedBudget,
    budgetSpent: budgetPlan.spentTotal,
    budgetRemaining: budgetPlan.remainingSpendableBudget,
    remainingBudget: budgetPlan.remainingSpendableBudget,
    effectiveBudgetRemaining: budgetPlan.hasDeclaredBudget ? budgetPlan.remainingSpendableBudget : null,
    budgetPressure: getBudgetPressure(budgetPlan),
    budgetPlan,
    savingsGoals,
    savingsSaved,
    savingsTarget,
    savingsProgress: savingsSaved !== null && savingsTarget !== null && savingsTarget > 0 ? clampPercent((savingsSaved / savingsTarget) * 100) : null,
    emergencyFund,
    income,
  };
}

export function hasUsableClaraSnapshot(snapshot = {}) {
  return Boolean(snapshot?.hasAnyData);
}

export function detectClaraIntent(message = "") {
  const text = cleanText(message);
  if (!text) return INTENTS.UNKNOWN;
  if (/\b(before i buy|before buying|before i purchase|before purchasing|should i buy|can i buy|can i afford|afford this|is it okay to buy|purchase decision|buy this)\b/.test(text)) return INTENTS.PURCHASE_DECISION;
  if (/\b(predict|forecast|future|where will my money|next week|next month|financial future)\b/.test(text)) return INTENTS.FUTURE_FORECAST;
  if (/\b(wallet health|wallets|wallet|balance health|cash health)\b/.test(text)) return INTENTS.WALLET_HEALTH;
  if (/\b(budget|budget check|budget health|budget left|budget remaining|remaining budget|overspend|overspending)\b/.test(text)) return INTENTS.BUDGET_CHECK;
  if (/\b(check my spending|spending check|spending|spent|spend|expenses|expense|leaks|unplanned|wants|needs)\b/.test(text)) return INTENTS.SPENDING_CHECK;
  if (/\b(how much do i have|how much money do i have|available money|money left|how much money|left to spend|can spend|remaining money|cash left|total balance|balance)\b/.test(text)) return INTENTS.AVAILABLE_MONEY;
  if (/\b(savings check|savings|saving|save|goal|goals|on track)\b/.test(text)) return INTENTS.SAVINGS_CHECK;
  if (/\b(emergency fund|emergency|survival buffer|buffer)\b/.test(text)) return INTENTS.EMERGENCY_FUND_CHECK;
  if (/\b(warning|warn|watch today|careful today|what should i watch|daily check|today)\b/.test(text)) return INTENTS.DAILY_WARNING;
  return INTENTS.UNKNOWN;
}

function getAvailabilityTone(amount) {
  if (amount === null) return "";
  if (amount <= 0) return "Pause non-essential spending first. You are in a tight zone.";
  if (amount < 1000) return "Your buffer is thin. Protect it from small leaks today.";
  if (amount < 5000) return "You still have room, but watch small daily leaks.";
  return "You have breathing room, but still spend with intention.";
}

function getPressureTone(snapshot = {}) {
  if (snapshot.availableMoney !== null && snapshot.availableMoney <= 0) return "Your available money is tight, so protect essentials only.";
  if (hasActiveBudgetPlan(snapshot) && snapshot.budgetRemaining !== null && snapshot.budgetRemaining <= 0) return "Your monthly budget is already pressured, so pause wants first.";
  if (snapshot.unplannedSpent !== null && snapshot.unplannedSpent > 0) return "The main risk is unplanned spending, not one big mistake.";
  return "You are not in panic mode, but consistency will decide the outcome.";
}

export function generateSpendingCheck(snapshot = {}) {
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;
  const spent = snapshot.monthlySpent !== null ? formatMoney(snapshot.monthlySpent) : null;
  const available = snapshot.availableMoney !== null ? formatMoney(snapshot.availableMoney) : null;
  const parts = [];
  if (spent) parts.push(`You’ve spent ${spent} in ${snapshot.monthlySpentLabel || "this period"}.`);
  if (snapshot.topSpendingCategory?.category && snapshot.topSpendingCategory?.amount) parts.push(`Your biggest category is ${snapshot.topSpendingCategory.category} at ${formatMoney(snapshot.topSpendingCategory.amount)}.`);
  if (available) parts.push(`You still have ${available} available.`);
  parts.push(snapshot.unplannedSpent ? `Unplanned spending is ${formatMoney(snapshot.unplannedSpent)}, so that is the first leak to watch.` : getPressureTone(snapshot));
  return parts.filter(Boolean).join(" ") || "I need your spending or wallet data before I can judge your spending clearly.";
}

export function generateWalletHealth(snapshot = {}) {
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;
  if (!snapshot.wallets.length && snapshot.availableMoney === null) return "I do not see wallet details loaded yet. Add or load wallets first so I can check wallet health.";
  const total = snapshot.totalWalletBalance !== null ? snapshot.totalWalletBalance : snapshot.availableMoney;
  const walletText = snapshot.wallets.slice(0, 3).map((wallet) => wallet.balance !== null ? `${wallet.name} (${formatMoney(wallet.balance)})` : wallet.name).join(", ");
  return [`Total visible wallet balance is ${formatMoney(total)}.`, walletText ? `Main wallets: ${walletText}.` : "", getAvailabilityTone(total)].filter(Boolean).join(" ");
}

export function generateAvailableMoneyReply(snapshot = {}) {
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;
  if (snapshot.availableMoney === null) return "I need your available money or wallet balance before I can answer that clearly.";
  const spent = snapshot.monthlySpent !== null ? `You have already spent ${formatMoney(snapshot.monthlySpent)} in ${snapshot.monthlySpentLabel || "this period"}.` : "";
  return [`You currently have ${formatMoney(snapshot.availableMoney)} available.`, spent, getAvailabilityTone(snapshot.availableMoney)].filter(Boolean).join(" ");
}

export function generateBudgetCheck(snapshot = {}) {
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;
  const plan = snapshot.budgetPlan || {};
  if (!plan.hasDeclaredBudget) return "I do not see a declared monthly budget yet. Set a monthly budget before treating any purchase as budget-approved.";
  const declared = formatMoney(plan.declaredBudget);
  const spent = formatMoney(plan.spentTotal);
  const remaining = formatMoney(plan.remainingSpendableBudget);
  if (plan.isOverspent) return `Budget check: you’ve spent ${spent} against your ${declared} monthly budget, so you are over budget. Pause wants first and rebalance the month.`;
  if (!plan.hasBudgetCategories) return `Budget check: ${remaining} left from your ${declared} monthly budget. You’ve spent ${spent} so far. You haven’t created budget categories yet, so this is overall budget tracking, not category-level tracking.`;
  if (!plan.isBudgetFullyAllocated) return `Budget check: ${remaining} left from your ${declared} monthly budget. ${formatMoney(plan.allocatedBudget)} is allocated into categories and ${formatMoney(plan.unallocatedBudget)} is still unallocated.`;
  return `Budget check: ${spent} spent out of your ${declared} monthly budget. Remaining spendable budget: ${remaining}. Category tracking is active.`;
}

export function generateSavingsCheck(snapshot = {}) {
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;
  if (snapshot.savingsSaved === null && snapshot.savingsTarget === null && !snapshot.savingsGoals.length) return "I do not see savings goals loaded yet. Add a savings goal so CLARA can protect it before you spend.";
  if (snapshot.savingsSaved !== null && snapshot.savingsTarget !== null && snapshot.savingsTarget > 0) return `Savings check: ${formatMoney(snapshot.savingsSaved)} saved out of ${formatMoney(snapshot.savingsTarget)}. That is about ${Math.min((snapshot.savingsSaved / snapshot.savingsTarget) * 100, 100).toFixed(0)}% complete. Protect this from impulse spending.`;
  if (snapshot.savingsSaved !== null) return `Your saved amount is ${formatMoney(snapshot.savingsSaved)}. That is progress worth protecting.`;
  if (snapshot.savingsTarget !== null) return `Your savings target is ${formatMoney(snapshot.savingsTarget)}. I need saved progress to check if you are on track.`;
  return "I can see savings data, but the saved and target values are not clear yet.";
}

export function generateEmergencyFundCheck(snapshot = {}) {
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;
  const fund = snapshot.emergencyFund || {};
  if (fund.summary) return fund.summary;
  if (fund.saved !== null && fund.target !== null) return `Emergency fund: ${formatMoney(fund.saved)} out of ${formatMoney(fund.target)}. Build this before lifestyle upgrades.`;
  if (fund.saved !== null) return `Your emergency fund shows ${formatMoney(fund.saved)}. Treat that as protection money, not extra spending money.`;
  if (fund.target !== null) return `Your emergency fund target is ${formatMoney(fund.target)}. I need the saved amount to judge your buffer.`;
  return snapshot.availableMoney !== null ? `I do not see a dedicated emergency fund yet. Based only on available money, you have ${formatMoney(snapshot.availableMoney)} visible, but that is not the same as protected emergency savings.` : "I do not see emergency fund details loaded yet.";
}

export function generateFutureForecast(snapshot = {}) {
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;
  const signals = [];
  if (snapshot.availableMoney !== null) signals.push(`available money: ${formatMoney(snapshot.availableMoney)}`);
  if (snapshot.monthlySpent !== null) signals.push(`${snapshot.monthlySpentLabel || "spending"}: ${formatMoney(snapshot.monthlySpent)}`);
  if (snapshot.budgetRemaining !== null) signals.push(`budget remaining: ${formatMoney(snapshot.budgetRemaining)}`);
  if (snapshot.savingsSaved !== null) signals.push(`savings: ${formatMoney(snapshot.savingsSaved)}`);
  if (!signals.length) return CLARA_NOT_ENOUGH_DATA_REPLY;
  return `Forecast: if nothing changes, ${getPressureTone(snapshot).toLowerCase()} I am basing this only on loaded data: ${signals.join(", ")}.`;
}

export function generatePurchaseDecisionReply(message = "", snapshot = {}) {
  const price = getPurchasePrice(message);
  if (price === null) return "What are you planning to buy, and how much is it?";
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;
  const available = snapshot.availableMoney;
  const budgetRemaining = hasActiveBudgetPlan(snapshot) ? snapshot.budgetRemaining : null;
  const priceText = formatMoney(price);
  if (available === null && budgetRemaining === null) return "I need your available money or monthly budget before I can judge this purchase clearly.";
  if (available !== null && price > available) return `Not recommended. This is around ${priceText}, but you only have ${formatMoney(available)} available. Pause this and protect essentials first.`;
  if (budgetRemaining !== null && price > budgetRemaining) return `Better delay. You have ${available !== null ? formatMoney(available) : "some money"} available, but only ${formatMoney(budgetRemaining)} remains in your monthly budget. Rebalance first or reduce the cost.`;
  const budgetLine = budgetRemaining !== null ? ` Your monthly budget still has ${formatMoney(budgetRemaining)} remaining.` : "";
  const categoryLine = snapshot.budgetPlan?.hasBudgetCategories ? "" : " No category budget is active yet, so log it carefully and categorize it after buying.";
  return `Safe, but still intentional. ${priceText} looks manageable based on your loaded data.${budgetLine}${categoryLine}`;
}

export function generateDailyWarning(snapshot = {}) {
  if (!snapshot.hasAnyData) return CLARA_LOADING_REPLY;
  if (snapshot.availableMoney !== null && snapshot.availableMoney <= 0) return "Today’s warning: protect essentials only. Your available money is already tight.";
  if (hasActiveBudgetPlan(snapshot) && snapshot.budgetRemaining !== null && snapshot.budgetRemaining <= 0) return "Today’s warning: stop wants first. Your monthly budget is already at the danger line.";
  if (snapshot.unplannedSpent !== null && snapshot.unplannedSpent > 0) return `Today’s warning: watch unplanned spending. I can see ${formatMoney(snapshot.unplannedSpent)} unplanned, so pause before small purchases.`;
  if (snapshot.availableMoney !== null && snapshot.availableMoney < 1000) return `Today’s warning: your buffer is thin at ${formatMoney(snapshot.availableMoney)}. Avoid small leaks and protect essentials.`;
  return "Today’s warning: stay intentional. Before spending, check if it is planned, needed, and aligned with your goal.";
}

export function generateClaraLocalReply(message = "", context = {}) {
  const snapshot = buildClaraFinanceSnapshot(context);
  const intent = detectClaraIntent(message);
  switch (intent) {
    case INTENTS.FUTURE_FORECAST:
      return generateFutureForecast(snapshot);
    case INTENTS.SPENDING_CHECK:
      return generateSpendingCheck(snapshot);
    case INTENTS.WALLET_HEALTH:
      return generateWalletHealth(snapshot);
    case INTENTS.AVAILABLE_MONEY:
      return generateAvailableMoneyReply(snapshot);
    case INTENTS.BUDGET_CHECK:
      return generateBudgetCheck(snapshot);
    case INTENTS.SAVINGS_CHECK:
      return generateSavingsCheck(snapshot);
    case INTENTS.EMERGENCY_FUND_CHECK:
      return generateEmergencyFundCheck(snapshot);
    case INTENTS.PURCHASE_DECISION:
      return generatePurchaseDecisionReply(message, snapshot);
    case INTENTS.DAILY_WARNING:
      return generateDailyWarning(snapshot);
    default:
      return CLARA_UNKNOWN_REPLY;
  }
}

export const CLARA_LOCAL_INTENTS = INTENTS;
