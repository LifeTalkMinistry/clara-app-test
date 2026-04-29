const normalizeString = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalizeString(value).toLowerCase();

export const firstValidNumber = (...values) => {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
};

export const normalizeDateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const sortByNewestDate = (items = [], dateKeys = ["created_at", "date", "updated_at"]) => {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];

  return [...safeItems].sort((a, b) => {
    const aDate = dateKeys.map((key) => normalizeDateValue(a?.[key])).find(Boolean) || null;
    const bDate = dateKeys.map((key) => normalizeDateValue(b?.[key])).find(Boolean) || null;
    return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
  });
};

export const getWalletDisplayBalance = (wallet) =>
  firstValidNumber(
    wallet?.balance,
    wallet?.current_balance,
    wallet?.wallet_balance,
    wallet?.available_balance,
    wallet?.amount
  );

export const getBudgetTotal = (budget) =>
  firstValidNumber(
    budget?.allocated_amount,
    budget?.budget_amount,
    budget?.total_budget,
    budget?.budget,
    budget?.amount,
    budget?.target_amount
  );

export const getBudgetSpent = (budget) =>
  firstValidNumber(
    budget?.spent,
    budget?.spent_amount,
    budget?.total_spent,
    budget?.used_amount
  );

export const getSavingsSaved = (goal) =>
  firstValidNumber(
    goal?.saved_amount,
    goal?.current_amount,
    goal?.saved,
    goal?.progress_amount,
    goal?.amount_saved
  );

export const getSavingsTarget = (goal) =>
  firstValidNumber(
    goal?.target_amount,
    goal?.goal_amount,
    goal?.target,
    goal?.amount,
    goal?.desired_amount
  );

export const buildMoneySummary = ({ wallets = [], expenses = [], budgets = [], savingsGoals = [], emergencyFund = null, walletMoney = 0 } = {}) => {
  const safeWallets = Array.isArray(wallets) ? wallets : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeBudgets = Array.isArray(budgets) ? budgets : [];
  const safeSavingsGoals = Array.isArray(savingsGoals) ? savingsGoals : [];

  const walletTotal = safeWallets.reduce((sum, wallet) => sum + getWalletDisplayBalance(wallet), 0);
  const totalBudget = safeBudgets.reduce((sum, budget) => sum + getBudgetTotal(budget), 0);
  const totalBudgetSpent = safeBudgets.reduce((sum, budget) => sum + getBudgetSpent(budget), 0);
  const expenseTotal = safeExpenses.reduce((sum, expense) => sum + firstValidNumber(expense?.amount, expense?.total, expense?.value), 0);
  const savingsSaved = safeSavingsGoals.reduce((sum, goal) => sum + getSavingsSaved(goal), 0);
  const savingsTarget = safeSavingsGoals.reduce((sum, goal) => sum + getSavingsTarget(goal), 0);
  const emergencySaved = firstValidNumber(emergencyFund?.saved_amount, emergencyFund?.current_amount, emergencyFund?.saved, emergencyFund?.balance, emergencyFund?.amount);
  const reliableWalletMoney = firstValidNumber(walletMoney, walletTotal);

  return {
    walletTotal,
    walletMoney: reliableWalletMoney,
    expenseTotal,
    totalBudget,
    totalBudgetSpent,
    budgetRemaining: Math.max(totalBudget - totalBudgetSpent, 0),
    savingsSaved,
    savingsTarget,
    emergencySaved,
    hasWallets: safeWallets.length > 0,
    hasExpenses: safeExpenses.length > 0,
    hasBudgets: safeBudgets.length > 0,
    hasSavingsGoals: safeSavingsGoals.length > 0,
  };
};

export const buildRecentActivity = ({ expenses = [], walletTransactions = [], transfers = [], savingsTransactions = [], emergencyFundTransactions = [], limit = 8 } = {}) => {
  const expenseItems = (Array.isArray(expenses) ? expenses : []).map((item) => ({
    ...item,
    activityType: "expense",
    activityTitle: item?.title || item?.name || item?.category || "Expense",
    activityAmount: -Math.abs(firstValidNumber(item?.amount, item?.total, item?.value)),
    activityDate: item?.created_at || item?.date || item?.expense_date,
  }));

  const walletItems = (Array.isArray(walletTransactions) ? walletTransactions : [])
    .filter((item) => {
      const type = normalizeLower(item?.type || item?.transaction_type || item?.kind);
      return !["expense"].includes(type) && !item?.expense_id && !item?.expenseId;
    })
    .map((item) => ({
      ...item,
      activityType: normalizeLower(item?.type || item?.transaction_type || "wallet"),
      activityTitle: item?.title || item?.description || item?.type || "Wallet activity",
      activityAmount: firstValidNumber(item?.amount, item?.total, item?.value),
      activityDate: item?.created_at || item?.date || item?.transaction_date,
    }));

  const transferItems = (Array.isArray(transfers) ? transfers : []).map((item) => ({
    ...item,
    activityType: "transfer",
    activityTitle: item?.title || item?.description || "Transfer",
    activityAmount: firstValidNumber(item?.amount, item?.total, item?.value),
    activityDate: item?.created_at || item?.date || item?.transaction_date,
  }));

  const savingsItems = (Array.isArray(savingsTransactions) ? savingsTransactions : []).map((item) => ({
    ...item,
    activityType: "savings",
    activityTitle: item?.title || item?.description || "Savings activity",
    activityAmount: firstValidNumber(item?.amount, item?.total, item?.value),
    activityDate: item?.created_at || item?.date || item?.transaction_date,
  }));

  const protectionItems = (Array.isArray(emergencyFundTransactions) ? emergencyFundTransactions : []).map((item) => ({
    ...item,
    activityType: "protection",
    activityTitle: item?.title || item?.description || "Protection fund activity",
    activityAmount: firstValidNumber(item?.amount, item?.total, item?.value),
    activityDate: item?.created_at || item?.date || item?.transaction_date,
  }));

  return sortByNewestDate([...expenseItems, ...walletItems, ...transferItems, ...savingsItems, ...protectionItems], ["activityDate", "created_at", "date", "updated_at"]).slice(0, Math.max(Number(limit) || 8, 0));
};

export const getStableFinanceSignature = ({ wallets = [], expenses = [], budgets = [], savingsGoals = [], walletTransactions = [] } = {}) => [
  Array.isArray(wallets) ? wallets.length : 0,
  Array.isArray(expenses) ? expenses.length : 0,
  Array.isArray(budgets) ? budgets.length : 0,
  Array.isArray(savingsGoals) ? savingsGoals.length : 0,
  Array.isArray(walletTransactions) ? walletTransactions.length : 0,
].join(":");
