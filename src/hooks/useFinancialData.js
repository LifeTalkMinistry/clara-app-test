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
  addMoney as repoAddMoney,
  transferBetweenWallets as repoTransferBetweenWallets,
  getTransfers,
  getBudgets,
  addBudget as repoAddBudget,
  updateBudget as repoUpdateBudget,
  deleteBudget as repoDeleteBudget,
  upsertBudget as repoUpsertBudget,
  getSavingsGoals,
  upsertSavingsGoal as repoUpsertSavingsGoal,
  getEmergencyFund,
  upsertEmergencyFund as repoUpsertEmergencyFund,
} from "@/lib/financeRepository";
import {
  LOCAL_FINANCE_STORES,
  getLocalRecordById,
  upsertLocalRecord,
  softDeleteLocalRecord,
} from "@/lib/localFinanceStore";
import { readClaraDevIdentityOverride } from "@/lib/clara-dev-simulator";

const FINANCE_INCOME_TYPES = new Set([
  "income",
  "add",
  "cash_in",
  "deposit",
  "opening_balance",
  "credit",
]);

export const CLARA_DEMO_LOCAL_USER_ID = "clara-demo-user";

const WALLET_TRANSACTION_STORE =
  LOCAL_FINANCE_STORES?.walletTransactions || "wallet_transactions";

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

const getFinanceIdentityMode = () => {
  try {
    return readClaraDevIdentityOverride()?.scenarioId || "real_user";
  } catch {
    return "real_user";
  }
};

const getLocalUserId = (user) => {
  if (getFinanceIdentityMode() === "demo_user") {
    return CLARA_DEMO_LOCAL_USER_ID;
  }

  const value = user?.id || user?.email || "local-user";
  return String(value || "local-user").trim() || "local-user";
};

const sortByNewest = (rows) =>
  [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const aTime = new Date(
      a?.createdAt || a?.created_at || a?.created_date || a?.date || 0
    ).getTime();

    const bTime = new Date(
      b?.createdAt || b?.created_at || b?.created_date || b?.date || 0
    ).getTime();

    return bTime - aTime;
  });

const sortByOldest = (rows) =>
  [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const aTime = new Date(
      a?.createdAt || a?.created_at || a?.created_date || a?.date || 0
    ).getTime();

    const bTime = new Date(
      b?.createdAt || b?.created_at || b?.created_date || b?.date || 0
    ).getTime();

    return aTime - bTime;
  });

const removeDeletedRows = (rows) =>
  (Array.isArray(rows) ? rows : []).filter(
    (row) => !row?.deletedAt && !row?.deleted_at
  );

const createEmptyFinancialCache = (key = null) => ({
  key,
  loaded: false,
  hydrated: false,
  error: null,
  expenses: [],
  incomes: [],
  wallets: [],
  budgets: [],
  walletTransactions: [],
  transfers: [],
  savingsGoals: [],
  emergencyFund: null,
});

let financialDataCache = createEmptyFinancialCache();

function useFinancialData(user) {
  const localUserId = getLocalUserId(user);
  const identityMode = getFinanceIdentityMode();
  const cacheKey = `${localUserId || "local-user"}::${identityMode}`;

  const hasUsableCache =
    financialDataCache.loaded && financialDataCache.key === cacheKey;

  const initialCache = hasUsableCache
    ? financialDataCache
    : createEmptyFinancialCache(cacheKey);

  const [expenses, setExpenses] = useState(initialCache.expenses || []);
  const [incomes, setIncomes] = useState(initialCache.incomes || []);
  const [wallets, setWallets] = useState(initialCache.wallets || []);
  const [budgets, setBudgets] = useState(initialCache.budgets || []);
  const [walletTransactions, setWalletTransactions] = useState(
    initialCache.walletTransactions || []
  );
  const [transfers, setTransfers] = useState(initialCache.transfers || []);
  const [savingsGoals, setSavingsGoals] = useState(
    initialCache.savingsGoals || []
  );
  const [emergencyFund, setEmergencyFund] = useState(
    initialCache.emergencyFund || null
  );

  const [loading, setLoading] = useState(!hasUsableCache);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(initialCache.error || null);

  const mountedRef = useRef(true);
  const hydratedRef = useRef(hasUsableCache);
  const loadingPromiseRef = useRef(null);

  const hydrateFromCache = useCallback((nextCache) => {
    if (!mountedRef.current) return;

    setExpenses(Array.isArray(nextCache.expenses) ? nextCache.expenses : []);
    setIncomes(Array.isArray(nextCache.incomes) ? nextCache.incomes : []);
    setWallets(Array.isArray(nextCache.wallets) ? nextCache.wallets : []);
    setBudgets(Array.isArray(nextCache.budgets) ? nextCache.budgets : []);
    setWalletTransactions(
      Array.isArray(nextCache.walletTransactions)
        ? nextCache.walletTransactions
        : []
    );
    setTransfers(Array.isArray(nextCache.transfers) ? nextCache.transfers : []);
    setSavingsGoals(
      Array.isArray(nextCache.savingsGoals) ? nextCache.savingsGoals : []
    );
    setEmergencyFund(nextCache.emergencyFund || null);
    setError(nextCache.error || null);

    if (nextCache.loaded) {
      hydratedRef.current = true;
      setLoading(false);
    }
  }, []);

  const buildSafeCache = useCallback(
    ({
      rawExpenses,
      rawWallets,
      rawWalletTransactions,
      rawTransfers,
      rawBudgets,
      rawSavingsGoals,
      rawEmergencyFund,
    }) => {
      const safeExpenses = sortByNewest(removeDeletedRows(rawExpenses));
      const safeWalletTransactions = sortByNewest(
        removeDeletedRows(rawWalletTransactions)
      );
      const safeTransfers = sortByNewest(removeDeletedRows(rawTransfers));
      const safeBudgets = sortByNewest(removeDeletedRows(rawBudgets));
      const safeSavingsGoals = sortByOldest(removeDeletedRows(rawSavingsGoals));

      const normalizedWallets = sortByOldest(removeDeletedRows(rawWallets)).map(
        (wallet) => {
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
        }
      );

      const safeIncomes = safeWalletTransactions.filter((transaction) =>
        FINANCE_INCOME_TYPES.has(
          String(transaction?.type || "").trim().toLowerCase()
        )
      );

      return {
        key: cacheKey,
        loaded: true,
        hydrated: true,
        error: null,
        expenses: safeExpenses,
        incomes: safeIncomes,
        wallets: normalizedWallets,
        budgets: safeBudgets,
        walletTransactions: safeWalletTransactions,
        transfers: safeTransfers,
        savingsGoals: safeSavingsGoals,
        emergencyFund: rawEmergencyFund || null,
      };
    },
    [cacheKey]
  );

  const loadAll = useCallback(
    async ({ background = false } = {}) => {
      if (loadingPromiseRef.current) return loadingPromiseRef.current;

      const shouldShowInitialLoading = !hydratedRef.current && !background;

      if (mountedRef.current) {
        if (shouldShowInitialLoading) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError(null);
      }

      const promise = (async () => {
        try {
          const [
            rawExpenses,
            rawWallets,
            rawWalletTransactions,
            rawTransfers,
            rawBudgets,
            rawSavingsGoals,
            rawEmergencyFund,
          ] = await Promise.all([
            getExpenses(localUserId),
            getWallets(localUserId),
            getWalletTransactions(localUserId),
            getTransfers(localUserId),
            getBudgets(localUserId),
            getSavingsGoals(localUserId),
            getEmergencyFund(localUserId),
          ]);

          const nextCache = buildSafeCache({
            rawExpenses,
            rawWallets,
            rawWalletTransactions,
            rawTransfers,
            rawBudgets,
            rawSavingsGoals,
            rawEmergencyFund,
          });

          financialDataCache = nextCache;
          hydrateFromCache(nextCache);

          return nextCache;
        } catch (loadError) {
          console.error("CLARA offline finance refresh error:", loadError);

          const previousCache =
            financialDataCache.key === cacheKey
              ? financialDataCache
              : createEmptyFinancialCache(cacheKey);

          const fallbackCache = {
            ...previousCache,
            key: cacheKey,
            loaded: true,
            hydrated: true,
            error: loadError,
            expenses: Array.isArray(previousCache.expenses)
              ? previousCache.expenses
              : [],
            incomes: Array.isArray(previousCache.incomes)
              ? previousCache.incomes
              : [],
            wallets: Array.isArray(previousCache.wallets)
              ? previousCache.wallets
              : [],
            budgets: Array.isArray(previousCache.budgets)
              ? previousCache.budgets
              : [],
            walletTransactions: Array.isArray(previousCache.walletTransactions)
              ? previousCache.walletTransactions
              : [],
            transfers: Array.isArray(previousCache.transfers)
              ? previousCache.transfers
              : [],
            savingsGoals: Array.isArray(previousCache.savingsGoals)
              ? previousCache.savingsGoals
              : [],
            emergencyFund: previousCache.emergencyFund || null,
          };

          financialDataCache = fallbackCache;
          hydrateFromCache(fallbackCache);

          return fallbackCache;
        } finally {
          loadingPromiseRef.current = null;

          if (mountedRef.current) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      })();

      loadingPromiseRef.current = promise;
      return promise;
    },
    [buildSafeCache, cacheKey, hydrateFromCache, localUserId]
  );

  useEffect(() => {
    mountedRef.current = true;

    const cacheIsForCurrentUser =
      financialDataCache.loaded && financialDataCache.key === cacheKey;

    if (cacheIsForCurrentUser) {
      hydrateFromCache(financialDataCache);
      loadAll({ background: true });
    } else {
      hydratedRef.current = false;
      loadAll({ background: false });
    }

    return () => {
      mountedRef.current = false;
    };
  }, [cacheKey, hydrateFromCache, loadAll]);

  const refreshData = useCallback(
    () => loadAll({ background: hydratedRef.current }),
    [loadAll]
  );

  const addExpense = useCallback(
    async (expense) => {
      const result = await repoAddExpense(localUserId, expense);
      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const updateExpense = useCallback(
    async (id, updates) => {
      const result = await repoUpdateExpense(localUserId, id, updates);
      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const deleteExpense = useCallback(
    async (id) => {
      const result = await repoDeleteExpense(localUserId, id);
      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const addWallet = useCallback(
    async (wallet) => {
      const result = await repoAddWallet(localUserId, wallet);
      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const updateWallet = useCallback(
    async (id, updates) => {
      const result = await repoUpdateWallet(localUserId, id, updates);
      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const deleteWallet = useCallback(
    async (id) => {
      const result = await repoDeleteWallet(localUserId, id);
      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const addIncome = useCallback(
    async (income) => {
      const result = await repoAddIncome(localUserId, income);
      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const addMoney = useCallback(
    async (income) => {
      const result =
        typeof repoAddMoney === "function"
          ? await repoAddMoney(localUserId, income)
          : await repoAddIncome(localUserId, income);

      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const updateWalletTransaction = useCallback(
    async (id, updates = {}) => {
      if (!id) throw new Error("Wallet transaction id is required.");

      const existing = await getLocalRecordById(
        WALLET_TRANSACTION_STORE,
        id,
        localUserId
      );

      if (!existing) {
        throw new Error("Wallet transaction not found for this local user.");
      }

      const now = new Date().toISOString();
      const result = await upsertLocalRecord(
        WALLET_TRANSACTION_STORE,
        {
          ...existing,
          ...(updates || {}),
          id: existing.id,
          localUserId,
          createdAt: existing.createdAt,
          updatedAt: now,
          updated_at: now,
          syncStatus: updates?.syncStatus || existing.syncStatus || "local_only",
          source: updates?.source || existing.source || "local",
        },
        localUserId
      );

      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const deleteWalletTransaction = useCallback(
    async (id) => {
      if (!id) throw new Error("Wallet transaction id is required.");

      const result = await softDeleteLocalRecord(
        WALLET_TRANSACTION_STORE,
        id,
        localUserId
      );

      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const deleteIncome = useCallback(
    async (id) => {
      return deleteWalletTransaction(id);
    },
    [deleteWalletTransaction]
  );

  const transferBetweenWallets = useCallback(
    async (payload) => {
      const result = await repoTransferBetweenWallets(localUserId, payload);
      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const addBudget = useCallback(
    async (budget) => {
      const result = await repoAddBudget(localUserId, budget);
      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const updateBudget = useCallback(
    async (id, updates) => {
      const result = await repoUpdateBudget(localUserId, id, updates);
      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const deleteBudget = useCallback(
    async (id) => {
      const result = await repoDeleteBudget(localUserId, id);
      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const upsertBudget = useCallback(
    async (budget) => {
      const result = await repoUpsertBudget(localUserId, budget);
      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const addSavingsGoal = useCallback(
    async (goal) => {
      const result = await repoUpsertSavingsGoal(localUserId, {
        ...(goal || {}),
        deletedAt: null,
        deleted_at: null,
      });

      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const updateSavingsGoal = useCallback(
    async (id, updates = {}) => {
      const result = await repoUpsertSavingsGoal(localUserId, {
        ...(updates || {}),
        id,
        updatedAt: new Date().toISOString(),
      });

      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const deleteSavingsGoal = useCallback(
    async (id) => {
      const now = new Date().toISOString();

      const result = await repoUpsertSavingsGoal(localUserId, {
        id,
        deletedAt: now,
        deleted_at: now,
        updatedAt: now,
        updated_at: now,
      });

      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const updateEmergencyFund = useCallback(
    async (updates = {}) => {
      const result = await repoUpsertEmergencyFund(localUserId, {
        ...(updates || {}),
        updatedAt: new Date().toISOString(),
      });

      await refreshData();
      return result;
    },
    [localUserId, refreshData]
  );

  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeIncomes = Array.isArray(incomes) ? incomes : [];
  const safeWallets = Array.isArray(wallets) ? wallets : [];
  const safeBudgets = Array.isArray(budgets) ? budgets : [];
  const safeWalletTransactions = Array.isArray(walletTransactions)
    ? walletTransactions
    : [];
  const safeTransfers = Array.isArray(transfers) ? transfers : [];
  const safeSavingsGoals = Array.isArray(savingsGoals)
    ? savingsGoals.filter((goal) => !goal?.deletedAt && !goal?.deleted_at)
    : [];
  const safeEmergencyFund = emergencyFund || null;

  const totalExpenses = useMemo(
    () =>
      safeExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0),
    [safeExpenses]
  );

  const totalIncome = useMemo(() => {
    return safeWalletTransactions
      .filter((transaction) =>
        FINANCE_INCOME_TYPES.has(
          String(transaction?.type || "").trim().toLowerCase()
        )
      )
      .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
  }, [safeWalletTransactions]);

  const totalWalletBalance = useMemo(
    () =>
      safeWallets.reduce((sum, wallet) => {
        const value =
          wallet.derived_balance ??
          wallet.balance ??
          wallet.current_balance ??
          wallet.wallet_balance ??
          wallet.starting_balance ??
          0;

        return sum + toNumber(value);
      }, 0),
    [safeWallets]
  );

  const retentionRate = useMemo(() => {
    if (totalIncome <= 0) return 0;
    return ((totalIncome - totalExpenses) / totalIncome) * 100;
  }, [totalExpenses, totalIncome]);

  return {
    loading,
    refreshing,
    error,

    expenses: safeExpenses,
    incomes: safeIncomes,
    wallets: safeWallets,
    budgets: safeBudgets,
    walletTransactions: safeWalletTransactions,
    transfers: safeTransfers,
    savingsGoals: safeSavingsGoals,
    emergencyFund: safeEmergencyFund,

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
    addMoney,
    updateWalletTransaction,
    deleteWalletTransaction,
    deleteIncome,
    transferBetweenWallets,

    addBudget,
    updateBudget,
    deleteBudget,
    upsertBudget,

    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,

    updateEmergencyFund,
  };
}

export { useFinancialData };
export default useFinancialData;
