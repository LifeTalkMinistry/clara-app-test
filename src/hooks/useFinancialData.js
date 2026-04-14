import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

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

const getSafeDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
};

const normalizeString = (value) => String(value ?? "").trim().toLowerCase();

const isOwnedByUser = (item, user) => {
  if (!user || !item) return false;

  const userId = String(user?.id ?? "").trim();
  const userEmail = normalizeString(user?.email);

  const itemIds = [item?.user_id, item?.owner_id, item?.profile_id]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);

  const itemEmails = [
    item?.created_by,
    item?.user_email,
    item?.owner_email,
    item?.email,
  ]
    .map(normalizeString)
    .filter(Boolean);

  if (userId && itemIds.includes(userId)) return true;
  if (userEmail && itemEmails.includes(userEmail)) return true;

  return false;
};

const safeSelect = async (table, user) => {
  if (!user?.id && !user?.email) return [];

  const { data, error } = await supabase.from(table).select("*");

  if (error) {
    console.warn(`Failed loading ${table}`, error);
    return [];
  }

  return (data || []).filter((item) => isOwnedByUser(item, user));
};

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
let financialDataInFlight = null;

export default function useFinancialData(user) {
  const userId = user?.id || null;
  const userEmail = user?.email || null;
  const cacheKey = userId || userEmail || null;
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
  const hasLoadedRef = useRef(false);
  const refreshTimeoutRef = useRef(null);

  const hydrateFromCache = useCallback((nextCache) => {
    setExpenses(nextCache.expenses);
    setIncomes(nextCache.incomes);
    setWallets(nextCache.wallets);
    setBudgets(nextCache.budgets);
    setWalletTransactions(nextCache.walletTransactions);
    setTransfers(nextCache.transfers);
    hasLoadedRef.current = nextCache.loaded;
    setLoading(!nextCache.loaded);
  }, []);

  useEffect(() => {
    if (!cacheKey) {
      const emptyCache = createEmptyFinancialCache();
      financialDataCache = emptyCache;
      hydrateFromCache(emptyCache);
      return;
    }

    if (financialDataCache.loaded && financialDataCache.key === cacheKey) {
      hydrateFromCache(financialDataCache);
      return;
    }

    hasLoadedRef.current = false;
    setLoading(true);
  }, [cacheKey, hydrateFromCache]);

  const loadAll = useCallback(async ({ background = false } = {}) => {
    const currentUser = { id: userId, email: userEmail };

    if (!currentUser.id && !currentUser.email) {
      const emptyCache = createEmptyFinancialCache();
      financialDataCache = emptyCache;
      hydrateFromCache(emptyCache);
      return;
    }

    if (financialDataInFlight?.key === cacheKey) {
      return financialDataInFlight.promise;
    }

    if (!hasLoadedRef.current && !background) {
      setLoading(true);
    }

    const promise = (async () => {
      const [e, w, b, wt, t] = await Promise.all([
        safeSelect("expenses", currentUser),
        safeSelect("wallets", currentUser),
        safeSelect("budgets", currentUser),
        safeSelect("wallet_transactions", currentUser),
        safeSelect("transfers", currentUser),
      ]);

      const nextCache = {
        key: cacheKey,
        loaded: true,
        expenses: e || [],
        incomes: [], // no incomes table in your current schema
        wallets: w || [],
        budgets: b || [],
        walletTransactions: wt || [],
        transfers: t || [],
      };

      financialDataCache = nextCache;
      hydrateFromCache(nextCache);
      return nextCache;
    })()
      .catch((err) => {
      console.error("loadAll error:", err);
      throw err;
    })
      .finally(() => {
        if (financialDataInFlight?.key === cacheKey) {
          financialDataInFlight = null;
        }
      setLoading(false);
      });

    financialDataInFlight = {
      key: cacheKey,
      promise,
    };

    return promise;
  }, [cacheKey, hydrateFromCache, userEmail, userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!userId && !userEmail) return;

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        loadAll({ background: true });
      }, 150);
    };

    const channel = supabase
      .channel(`finance-${userId || userEmail}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_transactions" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transfers" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budgets" },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [userEmail, userId, loadAll]);

  const refreshData = useCallback(
    (options) => loadAll(options),
    [loadAll]
  );

  const updateWalletBalance = async (walletId, amountChange) => {
    const wallet = wallets.find((w) => String(w.id) === String(walletId));
    if (!wallet) return;

    const current =
      wallet.balance ??
      wallet.current_balance ??
      wallet.wallet_balance ??
      wallet.starting_balance ??
      0;

    const updated = toNumber(current) + toNumber(amountChange);

    const { error } = await supabase
      .from("wallets")
      .update({ balance: updated })
      .eq("id", walletId);

    if (error) throw error;
  };

  const addExpense = async (expense) => {
    const amount = toNumber(expense.amount);

    const payload = {
      ...expense,
      user_id: user?.id || null,
      user_email: user?.email || null,
      created_by: user?.email || null,
      amount,
      date: getSafeDate(expense.date),
    };

    const { error } = await supabase.from("expenses").insert([payload]);
    if (error) throw error;

    if (expense.wallet_id) {
      await updateWalletBalance(expense.wallet_id, -amount);
    }

    await loadAll();
  };

  const updateExpense = async (id, updates) => {
    const oldExpense = expenses.find((e) => String(e.id) === String(id));

    const normalizedUpdates = { ...updates };

    if (updates.amount !== undefined) {
      normalizedUpdates.amount = toNumber(updates.amount);
    }

    if (updates.date !== undefined) {
      normalizedUpdates.date = getSafeDate(updates.date);
    }

    const { error } = await supabase
      .from("expenses")
      .update(normalizedUpdates)
      .eq("id", id);

    if (error) throw error;

    if (oldExpense?.wallet_id) {
      await updateWalletBalance(oldExpense.wallet_id, toNumber(oldExpense.amount));
    }

    const nextWalletId = normalizedUpdates.wallet_id ?? oldExpense?.wallet_id;
    const nextAmount =
      normalizedUpdates.amount !== undefined
        ? toNumber(normalizedUpdates.amount)
        : toNumber(oldExpense?.amount);

    if (nextWalletId) {
      await updateWalletBalance(nextWalletId, -nextAmount);
    }

    await loadAll();
  };

  const deleteExpense = async (id) => {
    const expense = expenses.find((e) => String(e.id) === String(id));

    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;

    if (expense?.wallet_id) {
      await updateWalletBalance(expense.wallet_id, toNumber(expense.amount));
    }

    await loadAll();
  };

  const addWallet = async (wallet) => {
    const starting = toNumber(wallet.balance ?? wallet.starting_balance ?? 0);

    const { error } = await supabase.from("wallets").insert([
      {
        ...wallet,
        balance: starting,
        starting_balance: starting,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      },
    ]);

    if (error) throw error;
    await loadAll();
  };

  const updateWallet = async (id, updates) => {
    const normalizedUpdates = { ...updates };

    if (updates.balance !== undefined) {
      normalizedUpdates.balance = toNumber(updates.balance);
    }

    if (updates.starting_balance !== undefined) {
      normalizedUpdates.starting_balance = toNumber(updates.starting_balance);
    }

    const { error } = await supabase
      .from("wallets")
      .update(normalizedUpdates)
      .eq("id", id);

    if (error) throw error;

    await loadAll();
  };

  const deleteWallet = async (id) => {
    const { error } = await supabase.from("wallets").delete().eq("id", id);
    if (error) throw error;

    await loadAll();
  };

  const addIncome = async (income) => {
    const amount = toNumber(income.amount);

    if (income.wallet_id) {
      await updateWalletBalance(income.wallet_id, amount);
    }

    await loadAll();
  };

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + toNumber(e.amount), 0),
    [expenses]
  );

  const totalIncome = useMemo(() => {
    return walletTransactions
      .filter((t) => {
        const type = String(t?.type || "").trim().toLowerCase();
        return type === "income" || type === "add";
      })
      .reduce((sum, t) => sum + toNumber(t.amount), 0);
  }, [walletTransactions]);

  const totalWalletBalance = useMemo(
    () =>
      wallets.reduce((sum, w) => {
        const value =
          w.balance ??
          w.current_balance ??
          w.wallet_balance ??
          w.starting_balance ??
          0;

        return sum + toNumber(value);
      }, 0),
    [wallets]
  );

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
    refreshData,
    addExpense,
    updateExpense,
    deleteExpense,
    addWallet,
    updateWallet,
    deleteWallet,
    addIncome,
  };
}
