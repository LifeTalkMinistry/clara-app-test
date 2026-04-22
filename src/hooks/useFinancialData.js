import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getWalletBalance } from "@/utils/financialEngine";

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

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const normalizePlanningStatus = (value) => {
  const normalized = String(value || "planned").trim().toLowerCase();
  return ["planned", "unplanned", "undocumented"].includes(normalized)
    ? normalized
    : "planned";
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
        wallets: (w || []).map((wallet) => {
          const balance = getWalletBalance(wallet, wt || [], t || []);
          return {
            ...wallet,
            balance,
            derived_balance: balance,
          };
        }),
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

    const updated = toNumber(wallet?.derived_balance ?? wallet?.balance) + toNumber(amountChange);

    const { error } = await supabase
      .from("wallets")
      .update({ balance: updated, updated_at: new Date().toISOString() })
      .eq("id", walletId);

    if (error) throw error;
  };

  const insertWalletTransaction = async (payload) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from("wallet_transactions").insert([
      {
        id: payload.id || generateId(),
        wallet_id: payload.wallet_id ? String(payload.wallet_id) : null,
        amount: toNumber(payload.amount),
        type: payload.type,
        category: payload.category || null,
        need_type: payload.need_type || null,
        planning_status: payload.planning_status || null,
        unplanned_reason: payload.unplanned_reason || null,
        expense_id: payload.expense_id || null,
        transfer_group_id: payload.transfer_group_id || null,
        related_wallet_id: payload.related_wallet_id || null,
        source_type: payload.source_type || null,
        tag: payload.tag || null,
        notes: payload.notes || "",
        created_at: payload.created_at || now,
        updated_at: now,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      },
    ]);

    if (error) throw error;
  };

  const addExpense = async (expense) => {
    const amount = toNumber(expense.amount);
    const planningStatus = normalizePlanningStatus(expense.planning_status);

    if (planningStatus === "unplanned" && !String(expense.unplanned_reason || "").trim()) {
      throw new Error("Reason is required for unplanned expenses.");
    }

    const payload = {
      ...expense,
      id: expense.id || generateId(),
      user_id: user?.id || null,
      user_email: user?.email || null,
      created_by: user?.email || null,
      amount,
      date: getSafeDate(expense.date),
      planning_status: planningStatus,
      unplanned_reason:
        planningStatus === "unplanned"
          ? String(expense.unplanned_reason || "").trim()
          : null,
    };

    const { error } = await supabase.from("expenses").insert([payload]);
    if (error) throw error;

    if (expense.wallet_id) {
      await updateWalletBalance(expense.wallet_id, -amount);
      await insertWalletTransaction({
        wallet_id: expense.wallet_id,
        amount,
        type: "expense",
        category: expense.category,
        need_type: expense.need_type,
        planning_status: planningStatus,
        unplanned_reason: payload.unplanned_reason,
        expense_id: payload.id,
        notes: expense.notes,
        created_at: payload.date,
      });
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

    if (updates.planning_status !== undefined) {
      normalizedUpdates.planning_status = normalizePlanningStatus(updates.planning_status);
    }

    const nextPlanningStatus =
      normalizedUpdates.planning_status || oldExpense?.planning_status || "planned";

    if (nextPlanningStatus === "unplanned") {
      const reason = String(
        normalizedUpdates.unplanned_reason ?? oldExpense?.unplanned_reason ?? ""
      ).trim();
      if (!reason) throw new Error("Reason is required for unplanned expenses.");
      normalizedUpdates.unplanned_reason = reason;
    } else if (updates.planning_status !== undefined) {
      normalizedUpdates.unplanned_reason = null;
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

    const linkedTxn = walletTransactions.find(
      (txn) =>
        String(txn?.expense_id || "") === String(id) ||
        (String(txn?.type || "").toLowerCase() === "expense" &&
          String(txn?.wallet_id || "") === String(oldExpense?.wallet_id || "") &&
          toNumber(txn?.amount) === toNumber(oldExpense?.amount))
    );

    const txnPayload = {
      wallet_id: nextWalletId,
      amount: nextAmount,
      category: normalizedUpdates.category ?? oldExpense?.category,
      need_type: normalizedUpdates.need_type ?? oldExpense?.need_type,
      planning_status: nextPlanningStatus,
      unplanned_reason:
        nextPlanningStatus === "unplanned"
          ? normalizedUpdates.unplanned_reason ?? oldExpense?.unplanned_reason
          : null,
      notes: normalizedUpdates.notes ?? oldExpense?.notes ?? "",
      updated_at: new Date().toISOString(),
    };

    if (linkedTxn?.id) {
      const { error: txnError } = await supabase
        .from("wallet_transactions")
        .update(txnPayload)
        .eq("id", linkedTxn.id);

      if (txnError) throw txnError;
    } else if (nextWalletId) {
      await insertWalletTransaction({
        ...txnPayload,
        type: "expense",
        expense_id: id,
        created_at: normalizedUpdates.date || oldExpense?.date || new Date().toISOString(),
      });
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

    const linkedTxn = walletTransactions.find(
      (txn) =>
        String(txn?.expense_id || "") === String(id) ||
        (String(txn?.type || "").toLowerCase() === "expense" &&
          String(txn?.wallet_id || "") === String(expense?.wallet_id || "") &&
          toNumber(txn?.amount) === toNumber(expense?.amount))
    );

    if (linkedTxn?.id) {
      const { error: txnError } = await supabase
        .from("wallet_transactions")
        .delete()
        .eq("id", linkedTxn.id);

      if (txnError) throw txnError;
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
      await insertWalletTransaction({
        wallet_id: income.wallet_id,
        amount,
        type: "income",
        source_type: income.source_type || income.source,
        tag: income.tag,
        notes: income.notes,
        created_at: getSafeDate(income.date),
      });
    }

    await loadAll();
  };

  const transferBetweenWallets = async ({ from_wallet_id, to_wallet_id, amount, notes = "" }) => {
    const parsedAmount = toNumber(amount);
    const fromWallet = wallets.find((w) => String(w.id) === String(from_wallet_id));
    const toWallet = wallets.find((w) => String(w.id) === String(to_wallet_id));

    if (!fromWallet || !toWallet) throw new Error("Wallet not found.");
    if (String(fromWallet.id) === String(toWallet.id)) {
      throw new Error("Source and destination wallets must be different.");
    }
    if (parsedAmount <= 0) throw new Error("Enter a valid transfer amount.");

    const fromBalance = toNumber(fromWallet.balance ?? fromWallet.current_balance);
    const toBalance = toNumber(toWallet.balance ?? toWallet.current_balance);

    if (fromBalance < parsedAmount) {
      throw new Error("Insufficient balance in source wallet.");
    }

    const transferGroupId = generateId();

    await supabase
      .from("wallets")
      .update({ balance: fromBalance - parsedAmount, updated_at: new Date().toISOString() })
      .eq("id", fromWallet.id)
      .throwOnError();

    await supabase
      .from("wallets")
      .update({ balance: toBalance + parsedAmount, updated_at: new Date().toISOString() })
      .eq("id", toWallet.id)
      .throwOnError();

    await insertWalletTransaction({
      wallet_id: fromWallet.id,
      amount: parsedAmount,
      type: "transfer_out",
      transfer_group_id: transferGroupId,
      related_wallet_id: toWallet.id,
      notes,
    });

    await insertWalletTransaction({
      wallet_id: toWallet.id,
      amount: parsedAmount,
      type: "transfer_in",
      transfer_group_id: transferGroupId,
      related_wallet_id: fromWallet.id,
      notes,
    });

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
    transferBetweenWallets,
  };
}
