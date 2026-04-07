import { useState, useEffect, useCallback, useMemo } from "react";

const STORAGE_KEYS = {
  expenses: "clara_expenses",
  incomes: "clara_incomes",
  wallets: "clara_wallets",
  budgets: "clara_budgets",
  walletTransactions: "clara_wallet_transactions",
  transfers: "clara_transfers",
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
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

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

const getItemOwnerEmail = (item) =>
  item?.userEmail ||
  item?.email ||
  item?.created_by ||
  item?.user_email ||
  item?.owner_email ||
  "";

const getWalletDate = (item) => {
  return (
    item?.date ||
    item?.created_at ||
    item?.timestamp ||
    item?.updated_at ||
    new Date().toISOString()
  );
};

const getWalletBaseBalance = (wallet) => {
  return toNumber(
    wallet?.starting_balance ??
      wallet?.startingBalance ??
      wallet?.balance ??
      wallet?.current_balance ??
      0
  );
};

const getWalletTransactionAmount = (txn) => {
  return Math.abs(
    toNumber(txn?.amount ?? txn?.value ?? txn?.total ?? txn?.money ?? 0)
  );
};

const normalizeWalletIncomeSource = (txn) => {
  return (
    txn?.source_details ||
    txn?.source_type ||
    txn?.tag ||
    txn?.notes ||
    "Wallet Income"
  );
};

export default function useFinancialData(userEmail) {
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(() => {
    setLoading(true);

    const allExpenses = getStoredData(STORAGE_KEYS.expenses).filter((item) =>
      isSameUser(getItemOwnerEmail(item), userEmail)
    );

    const allIncomes = getStoredData(STORAGE_KEYS.incomes).filter((item) =>
      isSameUser(getItemOwnerEmail(item), userEmail)
    );

    const allWallets = getStoredData(STORAGE_KEYS.wallets).filter((item) =>
      isSameUser(getItemOwnerEmail(item), userEmail)
    );

    const allBudgets = getStoredData(STORAGE_KEYS.budgets).filter((item) =>
      isSameUser(getItemOwnerEmail(item), userEmail)
    );

    const userWalletIds = new Set(allWallets.map((wallet) => String(wallet?.id)));

    const allWalletTransactions = getStoredData(
      STORAGE_KEYS.walletTransactions
    ).filter(
      (item) =>
        isSameUser(getItemOwnerEmail(item), userEmail) ||
        userWalletIds.has(String(item?.wallet_id))
    );

    const allTransfers = getStoredData(STORAGE_KEYS.transfers).filter(
      (item) =>
        isSameUser(getItemOwnerEmail(item), userEmail) ||
        userWalletIds.has(String(item?.wallet_id)) ||
        userWalletIds.has(String(item?.linked_wallet_id))
    );

    setExpenses(allExpenses);
    setIncomes(allIncomes);
    setWallets(allWallets);
    setBudgets(allBudgets);
    setWalletTransactions(allWalletTransactions);
    setTransfers(allTransfers);
    setLoading(false);
  }, [userEmail]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const handleStorage = () => loadAll();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("clara-finance-updated", handleStorage);
    window.addEventListener("clara-wallets-updated", handleStorage);
    window.addEventListener("clara-expenses-updated", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("clara-finance-updated", handleStorage);
      window.removeEventListener("clara-wallets-updated", handleStorage);
      window.removeEventListener("clara-expenses-updated", handleStorage);
    };
  }, [loadAll]);

  const refreshData = useCallback(() => {
    loadAll();
    window.dispatchEvent(new Event("clara-finance-updated"));
  }, [loadAll]);

  const normalizedWallets = useMemo(() => {
    return wallets.map((wallet) => {
      const walletId = String(wallet?.id);

      const deposits = walletTransactions
        .filter((txn) => String(txn?.wallet_id) === walletId)
        .reduce((sum, txn) => sum + getWalletTransactionAmount(txn), 0);

      const transfersIn = transfers
        .filter(
          (transfer) =>
            String(transfer?.wallet_id) === walletId &&
            String(transfer?.type) === "transfer_in"
        )
        .reduce((sum, transfer) => sum + toNumber(transfer?.amount), 0);

      const transfersOut = transfers
        .filter(
          (transfer) =>
            String(transfer?.wallet_id) === walletId &&
            String(transfer?.type) === "transfer_out"
        )
        .reduce((sum, transfer) => sum + toNumber(transfer?.amount), 0);

      const computedBalance =
        getWalletBaseBalance(wallet) + deposits + transfersIn - transfersOut;

      return {
        ...wallet,
        balance: computedBalance,
      };
    });
  }, [wallets, walletTransactions, transfers]);

  const walletIncomeEntries = useMemo(() => {
    const depositEntries = walletTransactions.map((txn) => ({
      id: `wallet-txn-${txn.id}`,
      amount: getWalletTransactionAmount(txn),
      date: getWalletDate(txn),
      wallet_id: txn?.wallet_id ? String(txn.wallet_id) : "",
      source: normalizeWalletIncomeSource(txn),
      category: "Wallet Income",
      note: txn?.notes || "",
      sourceType: "wallet_transaction",
      userEmail: getItemOwnerEmail(txn) || userEmail || "",
    }));

    return depositEntries;
  }, [walletTransactions, userEmail]);

  const combinedIncomeEntries = useMemo(() => {
    const directIncomes = (incomes || []).map((item) => ({
      ...item,
      amount: Math.abs(toNumber(item?.amount)),
      date: getWalletDate(item),
      sourceType: "income",
    }));

    const merged = [...directIncomes];
    const seen = new Set(
      directIncomes.map((item) =>
        [
          Math.abs(toNumber(item?.amount)),
          item?.date,
          normalizeText(item?.wallet_id),
          normalizeText(item?.source || item?.category || item?.note),
        ].join("|")
      )
    );

    walletIncomeEntries.forEach((item) => {
      const key = [
        Math.abs(toNumber(item?.amount)),
        item?.date,
        normalizeText(item?.wallet_id),
        normalizeText(item?.source || item?.category || item?.note),
      ].join("|");

      if (seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });

    return merged.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [incomes, walletIncomeEntries]);

  const normalizedWalletActivity = useMemo(() => {
    const txns = walletTransactions.map((txn) => ({
      id: `txn-${txn.id}`,
      wallet_id: txn?.wallet_id ? String(txn.wallet_id) : "",
      wallet_name:
        normalizedWallets.find((w) => String(w.id) === String(txn.wallet_id))
          ?.name || "Wallet",
      amount: getWalletTransactionAmount(txn),
      type: "income",
      date: getWalletDate(txn),
      source: normalizeWalletIncomeSource(txn),
      note: txn?.notes || "",
    }));

    const xfers = transfers.map((transfer) => ({
      id: `transfer-${transfer.id}`,
      wallet_id: transfer?.wallet_id ? String(transfer.wallet_id) : "",
      wallet_name:
        normalizedWallets.find((w) => String(w.id) === String(transfer.wallet_id))
          ?.name || "Wallet",
      amount: toNumber(transfer?.amount),
      type: transfer?.type || "transfer",
      date: getWalletDate(transfer),
      source: transfer?.note || "",
      note: transfer?.note || "",
    }));

    return [...txns, ...xfers].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [walletTransactions, transfers, normalizedWallets]);

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
      const progress =
        budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;

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
          const ownerMatches = isSameUser(getItemOwnerEmail(budget), userEmail);

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
          id:
            expense?.id ||
            `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
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
          const ownerMatches = isSameUser(getItemOwnerEmail(expense), userEmail);

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
          const ownerMatches = isSameUser(getItemOwnerEmail(expense), userEmail);

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
    () =>
      combinedIncomeEntries.reduce((sum, item) => sum + toNumber(item?.amount), 0),
    [combinedIncomeEntries]
  );

  const totalWalletBalance = useMemo(
    () => normalizedWallets.reduce((sum, item) => sum + toNumber(item?.balance), 0),
    [normalizedWallets]
  );

  return {
    loading,
    expenses,
    incomes: combinedIncomeEntries,
    rawIncomes: incomes,
    wallets: normalizedWallets,
    walletTransactions,
    transfers,
    walletActivity: normalizedWalletActivity,
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