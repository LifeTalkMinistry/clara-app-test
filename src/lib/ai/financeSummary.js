export function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function formatPeso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getExpenseDate(expense) {
  return new Date(expense?.date || expense?.created_at || expense?.updated_at || 0);
}

export function buildFinanceSummary({
  expenses = [],
  wallets = [],
  budgets = [],
  walletTransactions = [],
  totalWalletBalance = 0,
}) {
  const sortedExpenses = [...expenses].sort(
    (a, b) => getExpenseDate(b).getTime() - getExpenseDate(a).getTime()
  );

  const biggestExpense =
    [...expenses].sort((a, b) => toNumber(b?.amount) - toNumber(a?.amount))[0] || null;

  const recentExpenses = sortedExpenses.slice(0, 5);

  const categoryTotals = expenses.reduce((acc, expense) => {
    const category = normalizeText(expense?.category || "other") || "other";
    acc[category] = (acc[category] || 0) + toNumber(expense?.amount);
    return acc;
  }, {});

  const topCategoryEntry =
    Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] || null;

  const topCategory = topCategoryEntry
    ? {
        name: topCategoryEntry[0],
        amount: topCategoryEntry[1],
      }
    : null;

  const walletCount = wallets.length;
  const budgetCount = budgets.length;
  const expenseCount = expenses.length;
  const transactionCount = walletTransactions.length;

  return {
    totals: {
      walletBalance: toNumber(totalWalletBalance),
      walletCount,
      budgetCount,
      expenseCount,
      transactionCount,
    },
    biggestExpense: biggestExpense
      ? {
          id: biggestExpense.id,
          item: biggestExpense.item || biggestExpense.title || biggestExpense.notes || "Expense",
          category: biggestExpense.category || "other",
          amount: toNumber(biggestExpense.amount),
          date: biggestExpense.date || biggestExpense.created_at || null,
        }
      : null,
    topCategory,
    recentExpenses: recentExpenses.map((expense) => ({
      id: expense.id,
      item: expense.item || expense.title || expense.notes || "Expense",
      category: expense.category || "other",
      amount: toNumber(expense.amount),
      date: expense.date || expense.created_at || null,
      wallet_id: expense.wallet_id || null,
    })),
    wallets: wallets.map((wallet) => ({
      id: wallet.id,
      name: wallet.name || wallet.wallet_name || wallet.title || "Wallet",
      balance: toNumber(
        wallet.balance ??
          wallet.derived_balance ??
          wallet.current_balance ??
          wallet.wallet_balance ??
          0
      ),
    })),
    budgets: budgets.map((budget) => ({
      id: budget.id,
      name: budget.name || budget.title || budget.category || "Budget",
      amount: toNumber(
        budget.amount ??
          budget.budget ??
          budget.total_budget ??
          budget.budget_amount ??
          0
      ),
      spent: toNumber(
        budget.spent ??
          budget.spent_amount ??
          budget.total_spent ??
          0
      ),
    })),
  };
}