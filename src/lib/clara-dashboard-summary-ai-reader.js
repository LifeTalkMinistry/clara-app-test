import { buildClaraFinanceSnapshot } from "@/lib/clara-local-brain";
import {
  getPHMonthKey,
  getTransactionDate,
  INCOME_TRANSACTION_TYPES,
  normalizeLower,
} from "@/utils/dashboard/dashboardHelpers";

const DASHBOARD_SUMMARY_READER_LOG_PREFIX = "[CLARA Dashboard Summary AI Reader]";
const CLARA_EMERGENCY_RESERVE_WALLET_ID = "clara-emergency-reserve-wallet";

function isDevLoggingEnabled() {
  return Boolean(import.meta?.env?.DEV || import.meta?.env?.VITE_CLARA_DEBUG_AI === "true");
}

export function logDashboardSummaryAiReader(message, payload) {
  if (!isDevLoggingEnabled()) return;
  if (payload !== undefined) console.info(DASHBOARD_SUMMARY_READER_LOG_PREFIX, message, payload);
  else console.info(DASHBOARD_SUMMARY_READER_LOG_PREFIX, message);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function cleanNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const number = Number(String(value ?? "0").replace(/php/gi, "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function firstNumber(...values) {
  for (const value of values) {
    if (!hasValue(value)) continue;
    const number = cleanNumber(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function peso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(cleanNumber(value));
}

function getWalletId(wallet = {}) {
  return String(wallet.id || wallet.wallet_id || wallet.walletId || wallet.local_id || wallet.localId || "").trim();
}

function getWalletName(wallet = {}) {
  return String(wallet.name || wallet.wallet_name || wallet.title || wallet.label || "Wallet").trim() || "Wallet";
}

function getWalletVisibleBalance(wallet = {}) {
  return firstNumber(
    wallet.derived_balance,
    wallet.balance,
    wallet.current_balance,
    wallet.wallet_balance,
    wallet.available_balance,
    wallet.starting_balance,
    wallet.amount
  );
}

function isStandaloneEmergencyReserveWallet(wallet = {}) {
  const id = getWalletId(wallet);
  return Boolean(
    id === CLARA_EMERGENCY_RESERVE_WALLET_ID ||
      wallet.wallet_id === CLARA_EMERGENCY_RESERVE_WALLET_ID ||
      wallet.walletId === CLARA_EMERGENCY_RESERVE_WALLET_ID ||
      wallet.isEmergencyReserveWallet ||
      wallet.protected_reserve
  );
}

function getReadableWallets(wallets = []) {
  return safeArray(wallets)
    .filter((wallet) => !isStandaloneEmergencyReserveWallet(wallet))
    .map((wallet) => {
      const balance = getWalletVisibleBalance(wallet);
      return {
        id: getWalletId(wallet) || getWalletName(wallet),
        name: getWalletName(wallet),
        balance,
        hasReadableBalance: balance !== null,
        protectedAmount: firstNumber(
          wallet.protected_balance,
          wallet.reserve_balance,
          wallet.emergencyProtectedAmount,
          wallet.emergency_protected_amount
        ) ?? 0,
        raw: wallet,
      };
    });
}

function getRecordMonthKey(record = {}) {
  const date = getTransactionDate(record);
  return getPHMonthKey(date || new Date());
}

function isCurrentMonthRecord(record = {}, now = new Date()) {
  return getRecordMonthKey(record) === getPHMonthKey(now);
}

function getExpenseAmount(expense = {}) {
  return cleanNumber(expense.amount ?? expense.total ?? expense.value ?? expense.price ?? expense.expense_amount ?? expense.spent_amount);
}

function getExpenseCategory(expense = {}) {
  return String(
    expense.category ||
      expense.budget_category ||
      expense.budgetCategory ||
      expense.expense_category ||
      expense.category_name ||
      expense.type ||
      "Uncategorized"
  ).trim() || "Uncategorized";
}

function getIncomeAmount(income = {}) {
  return cleanNumber(income.amount ?? income.total ?? income.value ?? income.income_amount ?? income.received_amount ?? income.netAmount ?? income.net_amount);
}

function getTransferAmount(transfer = {}) {
  return cleanNumber(transfer.amount ?? transfer.total ?? transfer.value ?? transfer.transfer_amount);
}

function isIncomeLikeTransaction(transaction = {}) {
  const type = normalizeLower(transaction.type || transaction.transaction_type || transaction.source_type || transaction.sourceType || transaction.kind || transaction.category);
  return INCOME_TRANSACTION_TYPES.has(type) || type.includes("income") || type.includes("salary") || type.includes("deposit") || type.includes("credit") || type.includes("cash in") || type.includes("payday");
}

function getCurrentMonthIncomeRecords({ incomes = [], walletTransactions = [], incomeHubSnapshot = null } = {}, now = new Date()) {
  const incomeTransactions = safeArray(walletTransactions).filter((transaction) => isIncomeLikeTransaction(transaction) && isCurrentMonthRecord(transaction, now));
  if (incomeTransactions.length) return incomeTransactions.map((transaction) => ({ ...transaction, __dashboardIncomeSource: "wallet_transaction" }));

  const incomeRows = safeArray(incomes).filter((income) => isCurrentMonthRecord(income, now));
  if (incomeRows.length) return incomeRows.map((income) => ({ ...income, __dashboardIncomeSource: "income_record" }));

  const hubRows = safeArray(incomeHubSnapshot?.thisMonthIncomeTransactions || incomeHubSnapshot?.thisMonthTransactions || incomeHubSnapshot?.incomeTransactions)
    .filter((income) => isCurrentMonthRecord(income, now));

  return hubRows.map((income) => ({ ...income, __dashboardIncomeSource: "income_hub_snapshot" }));
}

function getIncomeRecordAmount(record = {}) {
  if (record.__dashboardIncomeSource === "wallet_transaction") return cleanNumber(record.amount);
  return getIncomeAmount(record);
}

function getCurrentMonthTransferRecords({ transfers = [], transactionHubSnapshot = null } = {}, now = new Date()) {
  const transferRows = safeArray(transfers).filter((transfer) => isCurrentMonthRecord(transfer, now));
  if (transferRows.length) return transferRows;

  return safeArray(transactionHubSnapshot?.thisMonthTransactions)
    .filter((transaction) => transaction?.group === "transfer")
    .filter((transaction) => isCurrentMonthRecord(transaction, now));
}

function getEmergencyProtectedAmount(emergencyFund = null, wallets = [], totalWalletBalance = 0) {
  const fund = emergencyFund && typeof emergencyFund === "object" ? emergencyFund : {};
  const walletProtectedAmount = safeArray(wallets).reduce((sum, wallet) => sum + cleanNumber(wallet.protectedAmount), 0);
  const fundSavedAmount = firstNumber(
    fund.saved,
    fund.current,
    fund.currentAmount,
    fund.current_amount,
    fund.amount,
    fund.saved_amount,
    fund.balance,
    fund.protectedAmount,
    fund.protected_amount,
    fund.reserveAmount,
    fund.reserve_amount
  ) ?? 0;

  const protectedAmount = Math.max(walletProtectedAmount, fundSavedAmount);
  return Math.min(Math.max(protectedAmount, 0), Math.max(totalWalletBalance, 0));
}

function buildCategoryBreakdown(records = []) {
  const totals = new Map();

  safeArray(records).forEach((record) => {
    const category = getExpenseCategory(record);
    const amount = getExpenseAmount(record);
    const current = totals.get(category) || { category, amount: 0, count: 0 };
    current.amount += amount;
    current.count += 1;
    totals.set(category, current);
  });

  return [...totals.values()].sort((left, right) => right.amount - left.amount);
}

function getBudgetRemaining(finance = {}) {
  const plan = finance.budgetPlan || {};
  if (plan.hasDeclaredBudget) {
    return firstNumber(plan.remainingSpendableBudget, finance.budgetRemaining, finance.remainingBudget);
  }
  return null;
}

function buildDataCompleteness({ walletCount, expenseCountThisMonth, incomeCountThisMonth, transferCountThisMonth, emergencyProtectedAmount, budgetRemaining }) {
  const readableGroups = [
    walletCount > 0,
    expenseCountThisMonth > 0,
    incomeCountThisMonth > 0,
    transferCountThisMonth > 0,
    emergencyProtectedAmount > 0,
    budgetRemaining !== null,
  ].filter(Boolean).length;
  const totalGroups = 6;
  const score = Math.round((readableGroups / totalGroups) * 100);

  return {
    score,
    level: score >= 70 ? "strong" : score >= 35 ? "partial" : "limited",
    readableGroups,
    totalGroups,
  };
}

function buildMissingData({ walletCount, expenseCountThisMonth, incomeCountThisMonth, transferCountThisMonth, emergencyProtectedAmount, budgetRemaining }) {
  const missing = [];
  if (!walletCount) missing.push("wallets");
  if (!expenseCountThisMonth) missing.push("expenses_this_month");
  if (!incomeCountThisMonth) missing.push("income_this_month");
  if (!transferCountThisMonth) missing.push("transfers_this_month");
  if (!emergencyProtectedAmount) missing.push("emergency_fund_protection");
  if (budgetRemaining === null) missing.push("active_budget_remaining");
  return missing;
}

export function buildDashboardSummaryAiSnapshot(context = {}) {
  const now = context.now || new Date();
  const rawWallets = safeArray(context.wallets);
  const wallets = getReadableWallets(rawWallets);
  const readableWallets = wallets.filter((wallet) => wallet.hasReadableBalance);
  const totalWalletBalance = readableWallets.reduce((sum, wallet) => sum + cleanNumber(wallet.balance), 0);
  const emergencyProtectedAmount = getEmergencyProtectedAmount(context.emergencyFund, wallets, totalWalletBalance);
  const safeSpendableMoney = Math.max(totalWalletBalance - emergencyProtectedAmount, 0);

  const expensesThisMonth = safeArray(context.expenses).filter((expense) => isCurrentMonthRecord(expense, now));
  const totalExpenseThisMonth = expensesThisMonth.reduce((sum, expense) => sum + getExpenseAmount(expense), 0);
  const categoryBreakdown = buildCategoryBreakdown(expensesThisMonth);

  const incomeRecordsThisMonth = getCurrentMonthIncomeRecords(context, now);
  const totalIncomeThisMonth = incomeRecordsThisMonth.reduce((sum, income) => sum + getIncomeRecordAmount(income), 0);
  const transferRecordsThisMonth = getCurrentMonthTransferRecords(context, now);
  const totalTransferVolumeThisMonth = transferRecordsThisMonth.reduce((sum, transfer) => sum + getTransferAmount(transfer), 0);
  const finance = buildClaraFinanceSnapshot({ ...context, wallets: readableWallets.map((wallet) => wallet.raw), expenses: expensesThisMonth });
  const budgetRemaining = getBudgetRemaining(finance);
  const topWallet = readableWallets.slice().sort((left, right) => cleanNumber(right.balance) - cleanNumber(left.balance))[0] || null;
  const topExpenseCategory = categoryBreakdown[0] || null;

  const walletCount = readableWallets.length;
  const expenseCountThisMonth = expensesThisMonth.length;
  const incomeCountThisMonth = incomeRecordsThisMonth.length;
  const transferCountThisMonth = transferRecordsThisMonth.length;
  const dataCompleteness = buildDataCompleteness({
    walletCount,
    expenseCountThisMonth,
    incomeCountThisMonth,
    transferCountThisMonth,
    emergencyProtectedAmount,
    budgetRemaining,
  });
  const missingData = buildMissingData({
    walletCount,
    expenseCountThisMonth,
    incomeCountThisMonth,
    transferCountThisMonth,
    emergencyProtectedAmount,
    budgetRemaining,
  });

  const connected = Boolean(
    rawWallets.length ||
      safeArray(context.expenses).length ||
      safeArray(context.incomes).length ||
      safeArray(context.walletTransactions).length ||
      safeArray(context.transfers).length ||
      safeArray(context.budgets).length ||
      safeArray(context.savingsGoals).length ||
      context.emergencyFund ||
      context.transactionHubSnapshot?.connected ||
      context.incomeHubSnapshot?.connected
  );

  const snapshot = {
    connected,
    moneyLeft: totalWalletBalance,
    totalWalletBalance,
    safeSpendableMoney,
    emergencyProtectedAmount,
    totalExpenseThisMonth,
    totalIncomeThisMonth,
    netFlowThisMonth: totalIncomeThisMonth - totalExpenseThisMonth,
    walletCount,
    expenseCountThisMonth,
    incomeCountThisMonth,
    transferCountThisMonth,
    topWallet: topWallet
      ? {
          id: topWallet.id,
          name: topWallet.name,
          balance: cleanNumber(topWallet.balance),
        }
      : null,
    topExpenseCategory,
    budgetRemaining,
    dataCompleteness,
    missingData,
    generatedAt: new Date().toISOString(),
    categoryBreakdown: categoryBreakdown.slice(0, 6),
    totalTransferVolumeThisMonth,
    currentMonthKey: getPHMonthKey(now),
  };

  logDashboardSummaryAiReader("Snapshot ready", {
    walletCount: snapshot.walletCount,
    expenseCountThisMonth: snapshot.expenseCountThisMonth,
    incomeCountThisMonth: snapshot.incomeCountThisMonth,
    transferCountThisMonth: snapshot.transferCountThisMonth,
    moneyLeft: snapshot.moneyLeft,
    totalExpenseThisMonth: snapshot.totalExpenseThisMonth,
    generatedAt: snapshot.generatedAt,
  });

  return snapshot;
}

export function detectDashboardSummaryIntent(message = "") {
  const text = normalizeText(message);
  if (!text) return null;

  const asksMoneyLeft = /\b(money left|left money|have left|money do i have left|how much.*left|current money|money status|available money)\b/.test(text);
  const asksTotalExpense = /\b(total expense|total expenses|expense this month|expenses this month|spent this month|spend this month|how much did i spend|how much.*spent|monthly expense|monthly expenses)\b/.test(text);
  const asksWhyMoneyLeft = /\b(why|explain|how come)\b.*\b(money left|this amount|amount)\b/.test(text);
  const asksDashboard = /\b(explain my dashboard|dashboard summary|current money status|money status|dashboard)\b/.test(text);
  const asksSpendable = /\b(safe to spend|safe spend|spendable|safe money|can i spend|available to spend|wallet balance.*spendable|spendable money|protected money)\b/.test(text);
  const asksWhereMoneyWent = /\b(where did my money go|where my money went|biggest outflow|biggest expense|top expense|spending went|money go)\b/.test(text);
  const asksWalletDifference = /\b(wallet balance.*different|different from wallet|balance different|wallet.*safe spendable|wallet.*money left)\b/.test(text);

  if (asksWalletDifference || asksSpendable) return "spendable";
  if (asksTotalExpense) return "total_expense";
  if (asksWhereMoneyWent) return "where_money_went";
  if (asksWhyMoneyLeft) return "money_left_reason";
  if (asksMoneyLeft) return "money_left";
  if (asksDashboard) return "dashboard_summary";
  return null;
}

function hasUsableDashboardSummaryData(snapshot = {}) {
  return Boolean(
    snapshot.connected &&
      (snapshot.walletCount > 0 ||
        snapshot.expenseCountThisMonth > 0 ||
        snapshot.incomeCountThisMonth > 0 ||
        snapshot.transferCountThisMonth > 0 ||
        snapshot.emergencyProtectedAmount > 0)
  );
}

function noUsableDataReply(snapshot = {}) {
  if (!snapshot.connected) {
    return "Dashboard Summary data is not connected yet, so I can’t honestly say I checked real finance records.";
  }

  return "I checked your dashboard summary, but I don’t see enough wallet or expense records yet to explain your Money Left.";
}

function moneyLeftReply(snapshot = {}) {
  const protectedLine = snapshot.emergencyProtectedAmount > 0
    ? `\n\nYou also have ${peso(snapshot.emergencyProtectedAmount)} protected for your Emergency Fund, so your safe spendable money is ${peso(snapshot.safeSpendableMoney)}.`
    : "";

  return `I checked your dashboard summary. Your current Money Left is ${peso(snapshot.moneyLeft)}.${protectedLine}\n\nThat comes from ${snapshot.walletCount} readable wallet ${snapshot.walletCount === 1 ? "balance" : "balances"}.`;
}

function totalExpenseReply(snapshot = {}) {
  if (!snapshot.expenseCountThisMonth) {
    return "I checked your dashboard summary. I don’t see any expense records this month yet, so your Total Expense is ₱0.";
  }

  return `I checked your dashboard summary. Your total recorded expense this month is ${peso(snapshot.totalExpenseThisMonth)} from ${snapshot.expenseCountThisMonth} expense ${snapshot.expenseCountThisMonth === 1 ? "record" : "records"}.`;
}

function spendableReply(snapshot = {}) {
  if (snapshot.emergencyProtectedAmount > 0) {
    return `I checked your dashboard summary. Your total wallet balance is ${peso(snapshot.totalWalletBalance)}, but your safe spendable money is ${peso(snapshot.safeSpendableMoney)} because ${peso(snapshot.emergencyProtectedAmount)} is protected for your Emergency Fund.`;
  }

  return `I checked your dashboard summary. Your safe spendable money is ${peso(snapshot.safeSpendableMoney)}. I don’t see protected Emergency Fund money reducing it right now.`;
}

function moneyLeftReasonReply(snapshot = {}) {
  const lines = [`I checked your dashboard summary. Your Money Left is ${peso(snapshot.moneyLeft)} because your readable wallet balances total ${peso(snapshot.totalWalletBalance)}.`];

  if (snapshot.topWallet) {
    lines.push(`Your biggest wallet is ${snapshot.topWallet.name} with ${peso(snapshot.topWallet.balance)}.`);
  }

  if (snapshot.emergencyProtectedAmount > 0) {
    lines.push(`${peso(snapshot.emergencyProtectedAmount)} is protected for Emergency Fund, so your safer spendable amount is ${peso(snapshot.safeSpendableMoney)}.`);
  }

  if (snapshot.totalExpenseThisMonth > 0) {
    lines.push(`This month’s recorded expenses are ${peso(snapshot.totalExpenseThisMonth)}.`);
  }

  return lines.join("\n\n");
}

function dashboardSummaryReply(snapshot = {}) {
  const topCategory = snapshot.topExpenseCategory
    ? `${snapshot.topExpenseCategory.category} at ${peso(snapshot.topExpenseCategory.amount)}`
    : "no top expense category yet";

  const protectedLine = snapshot.emergencyProtectedAmount > 0
    ? `\n\nProtected money: ${peso(snapshot.emergencyProtectedAmount)} for Emergency Fund. Safe spendable: ${peso(snapshot.safeSpendableMoney)}.`
    : "";

  return `I checked your dashboard summary. Money Left is ${peso(snapshot.moneyLeft)}, Total Expense this month is ${peso(snapshot.totalExpenseThisMonth)}, and recorded income this month is ${peso(snapshot.totalIncomeThisMonth)}.\n\nYour net flow this month is ${peso(snapshot.netFlowThisMonth)}. Biggest spending category: ${topCategory}.${protectedLine}`;
}

function whereMoneyWentReply(snapshot = {}) {
  const categories = safeArray(snapshot.categoryBreakdown).filter((item) => item.amount > 0);

  if (!categories.length) {
    return "I checked your dashboard and Transaction Hub. I don’t see enough expense records this month yet to show where your money went.";
  }

  const top = categories.slice(0, 3);
  const list = top
    .map((item, index) => `${index + 1}. ${item.category}: ${peso(item.amount)}`)
    .join("\n");

  return `I checked your dashboard and Transaction Hub. Your biggest recorded outflow this month is ${top[0].category} at ${peso(top[0].amount)}.\n\n${list}`;
}

export function buildDashboardSummaryDirectReply(message = "", context = {}) {
  const intent = detectDashboardSummaryIntent(message);
  if (!intent) return "";

  const snapshot = context.dashboardSummarySnapshot || buildDashboardSummaryAiSnapshot(context);
  const logIntent = intent === "where_money_went" || intent === "money_left_reason" ? "dashboard_summary" : intent;

  logDashboardSummaryAiReader(`Query detected: ${logIntent}`);
  logDashboardSummaryAiReader("Matched records:", {
    wallets: snapshot.walletCount || 0,
    expensesThisMonth: snapshot.expenseCountThisMonth || 0,
    incomesThisMonth: snapshot.incomeCountThisMonth || 0,
    transfersThisMonth: snapshot.transferCountThisMonth || 0,
  });

  if (!hasUsableDashboardSummaryData(snapshot)) return noUsableDataReply(snapshot);

  if (intent === "total_expense") return totalExpenseReply(snapshot);
  if (intent === "spendable") return spendableReply(snapshot);
  if (intent === "where_money_went") return whereMoneyWentReply(snapshot);
  if (intent === "money_left_reason") return moneyLeftReasonReply(snapshot);
  if (intent === "dashboard_summary") return dashboardSummaryReply(snapshot);
  return moneyLeftReply(snapshot);
}
