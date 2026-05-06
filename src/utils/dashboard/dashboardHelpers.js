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

export const createFinanceId = () => {
  return `finance_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

export const isClaraOnline = () => {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
};

export const createLocalOnlyExpenseRecord = (
  expense = {}
) => ({
  ...expense,
  local_only: true,
  pending_sync: true,
});

export const isProtectedFinanceRefreshWarning = (
  message = ""
) => {
  const normalized = normalizeLower(message);

  return (
    normalized.includes("protected finance") ||
    normalized.includes("refresh blocked") ||
    normalized.includes("finance refresh warning")
  );
};

export const isOwnedByUser = (item, userId) => {
  if (!item || !userId) return false;

  return (
    item.user_id === userId ||
    item.owner_id === userId ||
    item.created_by === userId
  );
};

export const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const isTruthyActive = (value) => {
  return [
    true,
    1,
    "1",
    "true",
    "active",
    "enabled",
  ].includes(value);
};

export const normalizeDateValue = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

export const getPHParts = (
  date = new Date()
) => {
  const normalized =
    normalizeDateValue(date) || new Date();

  return {
    year: normalized.getFullYear(),
    month: normalized.getMonth() + 1,
    day: normalized.getDate(),
  };
};

export const getPHDateKey = (
  date = new Date()
) => {
  const { year, month, day } =
    getPHParts(date);

  return `${year}-${String(month).padStart(
    2,
    "0"
  )}-${String(day).padStart(2, "0")}`;
};

export const getPHMonthKey = (
  date = new Date()
) => {
  const { year, month } =
    getPHParts(date);

  return `${year}-${String(month).padStart(
    2,
    "0"
  )}`;
};

export const getPHMonthRange = (
  date = new Date()
) => {
  const normalized =
    normalizeDateValue(date) || new Date();

  return {
    start: new Date(
      normalized.getFullYear(),
      normalized.getMonth(),
      1
    ),

    end: new Date(
      normalized.getFullYear(),
      normalized.getMonth() + 1,
      0
    ),
  };
};

export const isInPHRange = (
  date,
  start,
  end
) => {
  const target = normalizeDateValue(date);

  if (!target) return false;

  return target >= start && target <= end;
};

export const sortByNewestDate = (
  items = [],
  field = "created_at"
) => {
  return [...items].sort((a, b) => {
    return (
      new Date(b?.[field] || 0) -
      new Date(a?.[field] || 0)
    );
  });
};

export const formatCompactDate = (
  value
) => {
  const date = normalizeDateValue(value);

  if (!date) return "";

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month: "short",
      day: "numeric",
    }
  ).format(date);
};

export const formatCurrency = (
  value = 0
) => {
  return new Intl.NumberFormat(
    "en-PH",
    {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }
  ).format(safeNumber(value));
};

export const formatCompactCurrency = (
  value = 0
) => {
  return new Intl.NumberFormat(
    "en-PH",
    {
      notation: "compact",
      maximumFractionDigits: 1,
    }
  ).format(safeNumber(value));
};

export const getTransactionDate = (
  transaction = {}
) => {
  return (
    transaction.date ||
    transaction.created_at ||
    transaction.updated_at ||
    new Date().toISOString()
  );
};

export const getExpenseCategoryKey = (
  expense = {}
) => {
  return normalizeLower(
    expense.category ||
      expense.type ||
      "other"
  );
};

export const getBudgetCategoryKey = (
  budget = {}
) => {
  return normalizeLower(
    budget.category ||
      budget.name ||
      "other"
  );
};

export const clampPercentage = (
  value
) => {
  return Math.min(
    100,
    Math.max(0, safeNumber(value))
  );
};

export const getProgressPercentage = (
  current,
  target
) => {
  const safeTarget = safeNumber(target);

  if (safeTarget <= 0) return 0;

  return clampPercentage(
    (safeNumber(current) / safeTarget) * 100
  );
};

export const getBudgetRemaining = (
  budgetAmount,
  spentAmount
) => {
  return Math.max(
    0,
    safeNumber(budgetAmount) -
      safeNumber(spentAmount)
  );
};

export const getBudgetUsagePercentage = (
  spentAmount,
  budgetAmount
) => {
  const safeBudget =
    safeNumber(budgetAmount);

  if (safeBudget <= 0) return 0;

  return clampPercentage(
    (safeNumber(spentAmount) /
      safeBudget) *
      100
  );
};

export const sumTransactions = (
  transactions = []
) => {
  return transactions.reduce(
    (sum, item) => {
      return (
        sum + safeNumber(item?.amount)
      );
    },
    0
  );
};

export const calculateWalletTotal = (
  wallets = []
) => {
  return wallets.reduce(
    (sum, wallet) => {
      return (
        sum +
        safeNumber(wallet?.balance)
      );
    },
    0
  );
};

export const calculateTotalBudget = (
  budgets = []
) => {
  return budgets.reduce(
    (sum, budget) => {
      return (
        sum +
        safeNumber(budget?.amount)
      );
    },
    0
  );
};

export const calculateTotalSpent = (
  expenses = []
) => {
  return expenses.reduce(
    (sum, expense) => {
      return (
        sum +
        safeNumber(expense?.amount)
      );
    },
    0
  );
};
