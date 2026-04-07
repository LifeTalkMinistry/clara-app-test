import { useState, useEffect, useCallback, useMemo } from "react";

const STORAGE_KEYS = {
  expenses: "clara_expenses",
  incomes: "clara_incomes",
  wallets: "clara_wallets",
  budgets: "clara_budgets",
};

const getStoredData = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setStoredData = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const startOfDay = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const isSameUser = (itemEmail, userEmail) => {
  if (!userEmail) return true;
  return normalizeText(itemEmail) === normalizeText(userEmail);
};

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const getExpenseDate = (expense) => {
  return (
    expense?.date ||
    expense?.expense_date ||
    expense?.created_at ||
    expense?.timestamp ||
    new Date().toISOString()
  );
};

const getBudgetAmount = (budget) => {
  return toNumber(
    budget?.amount ??
      budget?.limit ??
      budget?.budget ??
      budget?.value ??
      budget?.monthlyBudget
  );
};

const getBudgetCategory = (budget) => {
  return normalizeText(
    budget?.category ?? budget?.name ?? budget?.title ?? budget?.label
  );
};

const getExpenseCategory = (expense) => {
  return normalizeText(
    expense?.category ??
      expense?.budgetCategory ??
      expense?.type ??
      expense?.classification ??
      expense?.label
  );
};

const shouldCountExpenseForBudget = (expense, budget) => {
  const budgetCategory = getBudgetCategory(budget);
  const expenseCategory = getExpenseCategory(expense);

  if (!budgetCategory) return false;
  if (!expenseCategory) return false;

  return budgetCategory === expenseCategory;
};

const getBudgetResetDate = (budget) => {
  return (
    budget?.lastResetAt ||
    budget?.resetAt ||
    budget?.resetDate ||
    budget?.periodStart ||
    null
  );
};

export default function useFinancialData(userEmail) {
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [budgets, setBudgets] = useState([]);

  const loadAll = useCallback(() => {
    const allExpenses = getStoredData(STORAGE_KEYS.expenses).filter((item) =>
      isSameUser(item?.userEmail || item?.email || item?.created_by, userEmail)
    );

    const allIncomes = getStoredData(STORAGE_KEYS.incomes).filter((item) =>
      isSameUser(item?.userEmail || item?.email || item?.created_by, userEmail)
    );

    const allWallets = getStoredData(STORAGE_KEYS.wallets).filter((item) =>
      isSameUser(item?.userEmail || item?.email || item?.created_by, userEmail)
    );

    const allBudgets = getStoredData(STORAGE_KEYS.budgets).filter((item) =>
      isSameUser(item?.userEmail || item?.email || item?.created_by, userEmail)
    );

    setExpenses(allExpenses);
    setIncomes(allIncomes);
    setWallets(allWallets);
    setBudgets(allBudgets);
  }, [userEmail]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const handleStorage = () => loadAll();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("clara-finance-updated", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("clara-finance-updated", handleStorage);
    };
  }, [loadAll]);

  const refreshData = useCallback(() => {
    loadAll();
    window.dispatchEvent(new Event("clara-finance-updated"));
  }, [loadAll]);

  const computedBudgets = useMemo(() => {
    return budgets.map((budget) => {
      const budgetAmount = getBudgetAmount(budget);
      const resetDateRaw = getBudgetResetDate(budget);
      const resetDate = resetDateRaw ? startOfDay(resetDateRaw) : null;

      const spent = expenses.reduce((total, expense) => {
        if (!shouldCountExpenseForBudget(expense, budget)) return total;

        const expenseDate = startOfDay(getExpenseDate(expense));
        if (!expenseDate) return total;

        if (resetDate && expenseDate < resetDate) return total;

        return total + toNumber(expense?.amount);
      }, 0);

      const remaining = Math.max(budgetAmount - spent, 0);
      const overspent = Math.max(spent - budgetAmount, 0);
      const progress = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;

      return {
        ...budget,
        amount: budgetAmount,
        spent,
        remaining,
        overspent,
        progress,
        isOverBudget: spent > budgetAmount,
        resetAt: resetDateRaw || null,
        lastResetAt: resetDateRaw || null,
      };
    });
  }, [budgets, expenses]);

  const updateStorageCollection = useCallback(
    (key, updater) => {
      const allItems = getStoredData(key);

      const nextItems = updater(allItems);
      setStoredData(key, nextItems);

      loadAll();
      window.dispatchEvent(new Event("clara-finance-updated"));

      return nextItems;
    },
    [loadAll]
  );

  const resetBudget = useCallback(
    (budgetId) => {
      updateStorageCollection(STORAGE_KEYS.budgets, (allBudgets) =>
        allBudgets.map((budget) => {
          const ownerMatches = isSameUser(
            budget?.userEmail || budget?.email || budget?.created_by,
            userEmail
          );

          if (!ownerMatches) return budget;
          if (String(budget?.id) !== String(budgetId)) return budget;

          return {
            ...budget,
            lastResetAt: new Date().toISOString(),
          };
        })
      );
    },
    [updateStorageCollection, userEmail]
  );

  const addExpense = useCallback(
    (expense) => {
      updateStorageCollection(STORAGE_KEYS.expenses, (allExpenses) => [
        {
          id: expense?.id || `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          ...expense,
          amount: toNumber(expense?.amount),
          userEmail: expense?.userEmail || userEmail || "",
          date: expense?.date || new Date().toISOString(),
        },
        ...allExpenses,
      ]);
    },
    [updateStorageCollection, userEmail]
  );

  const updateExpense = useCallback(
    (expenseId, updates) => {
      updateStorageCollection(STORAGE_KEYS.expenses, (allExpenses) =>
        allExpenses.map((expense) => {
          const ownerMatches = isSameUser(
            expense?.userEmail || expense?.email || expense?.created_by,
            userEmail
          );

          if (!ownerMatches) return expense;
          if (String(expense?.id) !== String(expenseId)) return expense;

          return {
            ...expense,
            ...updates,
            amount:
              updates?.amount !== undefined
                ? toNumber(updates.amount)
                : toNumber(expense?.amount),
          };
        })
      );
    },
    [updateStorageCollection, userEmail]
  );

  const deleteExpense = useCallback(
    (expenseId) => {
      updateStorageCollection(STORAGE_KEYS.expenses, (allExpenses) =>
        allExpenses.filter((expense) => {
          const ownerMatches = isSameUser(
            expense?.userEmail || expense?.email || expense?.created_by,
            userEmail
          );

          if (!ownerMatches) return true;
          return String(expense?.id) !== String(expenseId);
        })
      );
    },
    [updateStorageCollection, userEmail]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, item) => sum + toNumber(item?.amount), 0),
    [expenses]
  );

  const totalIncome = useMemo(
    () => incomes.reduce((sum, item) => sum + toNumber(item?.amount), 0),
    [incomes]
  );

  const totalWalletBalance = useMemo(
    () => wallets.reduce((sum, item) => sum + toNumber(item?.balance), 0),
    [wallets]
  );

  return {
    expenses,
    incomes,
    wallets,
    budgets: computedBudgets,

    totalExpenses,
    totalIncome,
    totalWalletBalance,

    refreshData,
    resetBudget,

    addExpense,
    updateExpense,
    deleteExpense,
  };
}