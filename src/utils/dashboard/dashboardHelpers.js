export const normalizeString = (value) => {
  return String(value ?? "").trim();
};

export const normalizeLower = (value) => {
  return normalizeString(value).toLowerCase();
};

export const PH_TIME_ZONE = "Asia/Manila";
export const PH_OFFSET_MINUTES = 8 * 60;
export const DEBUG_FINANCE_DIAGNOSTICS = false;

export const FINANCE_CATEGORIES = [
  "food",
  "transport",
  "housing",
  "utilities",
  "entertainment",
  "shopping",
  "health",
  "education",
  "personal",
  "other",
];

export const INCOME_TRANSACTION_TYPES = new Set([
  "income",
  "add",
  "cash_in",
  "deposit",
  "opening_balance",
  "credit",
]);

export const createFinanceId = () => {
  return `finance_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

export const isClaraOnline = () => {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
};

export const createLocalOnlyExpenseRecord = (expense = {}) => ({
  ...expense,
  local_only: true,
  pending_sync: true,
});

export const isProtectedFinanceRefreshWarning = (message = "") => {
  const normalized = normalizeLower(message);

  return (
    normalized.includes("protected finance") ||
    normalized.includes("refresh blocked") ||
    normalized.includes("finance refresh warning")
  );
};

export const ENROLLMENT_PENDING_STATUSES = new Set([
  "pending",
  "under_review",
  "payment_pending",
]);

export const ENROLLMENT_APPROVED_STATUSES = new Set([
  "approved",
  "active",
  "enrolled",
]);

export const ENROLLMENT_BLOCKED_TO_ENROLL_STATUSES = new Set([
  "",
  "none",
  "free",
  "rejected",
  "resubmit_required",
  "cancelled",
]);

export const isOwnedByUser = (item, userId) => {
  if (!item || !userId) return false;

  return (
    item.user_id === userId ||
    item.owner_id === userId ||
    item.created_by === userId
  );
};

export const firstValidNumber = (...values) => {
  for (const value of values) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

export const firstPositiveNumber = (...values) => {
  for (const value of values) {
    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 0;
};

export const isTruthyActive = (value) => {
  return [true, 1, "1", "true", "active", "enabled"].includes(value);
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