export const normalizeString = (value) => {
  return String(value ?? "").trim();
};

export const normalizeLower = (value) => {
  return normalizeString(value).toLowerCase();
};

export const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatCurrency = (value = 0) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(safeNumber(value));
};

export const formatCompactCurrency = (value = 0) => {
  return new Intl.NumberFormat("en-PH", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(safeNumber(value));
};

export const clampPercentage = (value) => {
  return Math.min(100, Math.max(0, safeNumber(value)));
};

export const getProgressPercentage = (current, target) => {
  const safeTarget = safeNumber(target);

  if (safeTarget <= 0) return 0;

  return clampPercentage((safeNumber(current) / safeTarget) * 100);
};

export const getBudgetRemaining = (budgetAmount, spentAmount) => {
  return Math.max(
    0,
    safeNumber(budgetAmount) - safeNumber(spentAmount)
  );
};

export const getBudgetUsagePercentage = (
  spentAmount,
  budgetAmount
) => {
  const safeBudget = safeNumber(budgetAmount);

  if (safeBudget <= 0) return 0;

  return clampPercentage(
    (safeNumber(spentAmount) / safeBudget) * 100
  );
};

export const getSavingsProgress = (savedAmount, targetAmount) => {
  return getProgressPercentage(savedAmount, targetAmount);
};

export const getEmergencyFundProgress = (
  currentAmount,
  targetAmount
) => {
  return getProgressPercentage(currentAmount, targetAmount);
};

export const getEmergencyFundMonthsCovered = (
  emergencyFundAmount,
  monthlyExpenses
) => {
  const expenses = safeNumber(monthlyExpenses);

  if (expenses <= 0) return 0;

  return safeNumber(emergencyFundAmount) / expenses;
};

export const getSpendingStatusTone = (percentage) => {
  const pct = safeNumber(percentage);

  if (pct >= 85) return "rose";
  if (pct >= 60) return "amber";

  return "emerald";
};

export const formatMonthKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
};

export const getCurrentMonthRange = () => {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  );

  return {
    start,
    end,
  };
};

export const sumTransactions = (transactions = []) => {
  return transactions.reduce((sum, item) => {
    return sum + safeNumber(item?.amount);
  }, 0);
};

export const groupTransactionsByCategory = (
  transactions = []
) => {
  return transactions.reduce((acc, item) => {
    const category = item?.category || "Other";

    if (!acc[category]) {
      acc[category] = [];
    }

    acc[category].push(item);

    return acc;
  }, {});
};

export const calculateWalletTotal = (wallets = []) => {
  return wallets.reduce((sum, wallet) => {
    return sum + safeNumber(wallet?.balance);
  }, 0);
};

export const calculateTotalBudget = (budgets = []) => {
  return budgets.reduce((sum, budget) => {
    return sum + safeNumber(budget?.amount);
  }, 0);
};

export const calculateTotalSpent = (expenses = []) => {
  return expenses.reduce((sum, expense) => {
    return sum + safeNumber(expense?.amount);
  }, 0);
};