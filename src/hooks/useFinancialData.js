import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getWalletBalance } from "@/utils/financialEngine";
import {
  getExpenses,
  addExpense as repoAddExpense,
  updateExpense as repoUpdateExpense,
  deleteExpense as repoDeleteExpense,
  getWallets,
  addWallet as repoAddWallet,
  updateWallet as repoUpdateWallet,
  deleteWallet as repoDeleteWallet,
  getWalletTransactions,
  addIncome as repoAddIncome,
  transferBetweenWallets as repoTransferBetweenWallets,
  getBudgets,
  addBudget as repoAddBudget,
  updateBudget as repoUpdateBudget,
  deleteBudget as repoDeleteBudget,
} from "@/lib/financeRepository";
import {
  LOCAL_FINANCE_STORES,
  getLocalRecords,
} from "@/lib/localFinanceStore";

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

const FINANCE_INCOME_TYPES = new Set([
  "income",
  "add",
  "cash_in",
  "deposit",
  "opening_balance",
  "credit",
]);

const getLocalUserId = (user) => {
  const value = user?.id || user?.email || "";
  return String(value).trim();
};

const sortByNewest = (rows) =>
  [...(rows || [])].sort((a, b) => {
    const aTime = new Date(
      a?.createdAt || a?.created_at || a?.created_date || a?.date || 0
    ).getTime();

    const bTime = new Date(
      b?.createdAt || b?.created_at || b?.created_date || b?.date || 0
    ).getTime();

    return bTime - aTime;
  });

const createEmptyFinancialCache = (key = null) => ({
  key,
  loaded: false,
  expenses: [],
  incomes: [],
  wallets: [],
  budgets: [],
  walletTransactions: [],
  transfers: [],
});

let financialDataCache = createEmptyFinancialCache();

export default function useFinancialData(user) {
  const localUserId = getLocalUserId(user);
  const cacheKey = localUserId || null;

  const initialCache =
    financialDataCache.loaded && financialDataCache.key === cacheKey
      ? financialDataCache
      : createEmptyFinancialCache(cacheKey);

  const [expenses, setExpenses] = useState(initialCache.expenses);
  const [incomes, setIncomes] = useState(initialCache.incomes);
  const [wallets, setWallets] = useState(initialCache.wallets);
  const [budgets, setBudgets] = useState(initialCache.budgets);
  const [walletTransactions, setWalletTransactions] = useState(
    initialCache.walletTransactions
  );
  const [transfers, setTransfers] = useState(initialCache.transfers);
  const [loading, setLoading] = useState(!initialCache.loaded);

  const mountedRef = useRef(true);

  const hydrateFromCache = useCallback((nextCache) => {
    if (!mountedRef.current) return;

    setExpenses(nextCache.expenses || []);
    setIncomes(nextCache.incomes || []);
    setWallets(nextCache.wallets || []);
    setBudgets(nextCache.budgets || []);
    setWalletTransactions(nextCache.walletTransactions || []);
    setTransfers(nextCache.transfers || []);
    setLoading(!nextCache.loaded);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadAll = useCallback(async () => {
    if (!localUserId) {
      const emptyCache = createEmptyFinancialCache();
      financialDataCache = emptyCache;
      hydrateFromCache(emptyCache);
      setLoading(false);
      return emptyCache;
    }

    setLoading(true);

    try {
      const [
        rawExpenses,
        rawWallets,
        rawBudgets,
        rawWalletTransactions,
        rawTransfers,
      ] = await Promise.all([
        getExpenses(localUserId),
        getWallets(localUserId),
        getBudgets(localUserId),
        getWalletTransactions(localUserId),
        getLocalRecords(LOCAL_FINANCE_STORES.transfers, localUserId),
      ]);

      const safeWalletTransactions = sortByNewest(rawWalletTransactions || []);
      const safeTransfers = sortByNewest(rawTransfers || []);

      const normalizedWallets = (rawWallets || []).map((wallet) => {
        const balance = getWalletBalance(
          wallet,
          safeWalletTransactions,
          safeTransfers
        );

        return {
          ...wallet,
          balance,
          derived_balance: balance,
        };
      });

      const nextCache = {
        key: cacheKey,
        loaded: true,
        expenses: sortByNewest(rawExpenses || []),
        incomes: [],
        wallets: normalizedWallets,
        budgets: rawBudgets || [],
        walletTransactions: safeWalletTransactions,
        transfers: safeTransfers,
      };

      financialDataCache = nextCache;
      hydrateFromCache(nextCache);

      return nextCache;
    } catch (error) {
      console.error("IndexedDB finance loadAll error:", error);

      const fallbackCache =
        financialDataCache.key === cacheKey
          ? { ...financialDataCache, loaded: true }
          : createEmptyFinancialCache(cacheKey);

      financialDataCache = fallbackCache;
      hydrateFromCache(fallbackCache);

      return fallbackCache;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [cacheKey, hydrateFromCache, localUserId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refreshData = useCallback(() => loadAll(), [loadAll]);

  const addExpense = async (expense) => {
    if (!localUserId) {
      throw new Error("User is required to add an expense.");
    }

    await repoAddExpense(localUserId, expense);
    await refreshData();
  };

  const updateExpense = async (id, updates) => {
    if (!localUserId) {
      throw new Error("User is required to update an expense.");
    }

    await repoUpdateExpense(localUserId, id, updates);
    await refreshData();
  };

  const deleteExpense = async (id) => {
    if (!localUserId) {
      throw new Error("User is required to delete an expense.");
    }

    await repoDeleteExpense(localUserId, id);
    await refreshData();
  };

  const addWallet = async (wallet) => {
    if (!localUserId) {
      throw new Error("User is required to add a wallet.");
    }

    await repoAddWallet(localUserId, wallet);
    await refreshData();
  };

  const updateWallet = async (id, updates) => {
    if (!localUserId) {
      throw new Error("User is required to update a wallet.");
    }

    await repoUpdateWallet(localUserId, id, updates);
    await refreshData();
  };

  const deleteWallet = async (id) => {
    if (!localUserId) {
      throw new Error("User is required to delete a wallet.");
    }

    await repoDeleteWallet(localUserId, id);
    await refreshData();
  };

  const addIncome = async (income) => {
    if (!localUserId) {
      throw new Error("User is required to add income.");
    }

    await repoAddIncome(localUserId, income);
    await refreshData();
  };

  const transferBetweenWallets = async (payload) => {
    if (!localUserId) {
      throw new Error("User is required to transfer between wallets.");
    }

    await repoTransferBetweenWallets(localUserId, payload);
    await refreshData();
  };

  const addBudget = async (budget) => {
    if (!localUserId) {
      throw new Error("User is required to add a budget.");
    }

    await repoAddBudget(localUserId, budget);
    await refreshData();
  };

  const updateBudget = async (id, updates) => {
    if (!localUserId) {
      throw new Error("User is required to update a budget.");
    }

    await repoUpdateBudget(localUserId, id, updates);
    await refreshData();
  };

  const deleteBudget = async (id) => {
    if (!localUserId) {
      throw new Error("User is required to delete a budget.");
    }

    await repoDeleteBudget(localUserId, id);
    await refreshData();
  };

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0),
    [expenses]
  );

  const totalIncome = useMemo(() => {
    return walletTransactions
      .filter((transaction) =>
        FINANCE_INCOME_TYPES.has(
          String(transaction?.type || "").trim().toLowerCase()
        )
      )
      .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
  }, [walletTransactions]);

  const totalWalletBalance = useMemo(
    () =>
      wallets.reduce((sum, wallet) => {
        const value =
          wallet.derived_balance ??
          wallet.balance ??
          wallet.current_balance ??
          wallet.wallet_balance ??
          wallet.starting_balance ??
          0;

        return sum + toNumber(value);
      }, 0),
    [wallets]
  );

  const retentionRate = useMemo(() => {
    if (totalIncome <= 0) return 0;
    return ((totalIncome - totalExpenses) / totalIncome) * 100;
  }, [totalExpenses, totalIncome]);

  return {
    loading,
    expenses,
    incomes,
    wallets,
    budgets,
    walletTransactions,
    transfers,
    totalExpenses,
    totalIncome,
    totalWalletBalance,
    retentionRate,
    refreshData,
    addExpense,
    updateExpense,
    deleteExpense,
    addWallet,
    updateWallet,
    deleteWallet,
    addIncome,
    transferBetweenWallets,
    addBudget,
    updateBudget,
    deleteBudget,
  };
}
