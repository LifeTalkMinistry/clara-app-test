import { useState, useEffect, useCallback, useMemo } from "react";
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

// ✅ SAFE TABLE LOADER WITH FALLBACK FILTERS
const safeSelect = async (table, user) => {
  if (!user?.id && !user?.email) return [];

  let data = [];
  let error = null;

  // 1) Try user_id first
  if (user?.id) {
    const res = await supabase.from(table).select("*").eq("user_id", user.id);
    if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
    if (res.error) error = res.error;
  }

  // 2) Try user_email
  if (user?.email) {
    const res = await supabase
      .from(table)
      .select("*")
      .eq("user_email", user.email);

    if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
    if (res.error) error = res.error;
  }

  // 3) Try created_by
  if (user?.email) {
    const res = await supabase
      .from(table)
      .select("*")
      .eq("created_by", user.email);

    if (!res.error && Array.isArray(res.data)) {
      return res.data;
    }
    if (res.error) error = res.error;
  }

  if (error) {
    console.warn(`❌ Failed loading ${table}`, error);
  }

  return data;
};

export default function useFinancialData(user) {
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!user?.id && !user?.email) {
      setExpenses([]);
      setIncomes([]);
      setWallets([]);
      setBudgets([]);
      setWalletTransactions([]);
      setTransfers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [e, i, w, b, wt, t] = await Promise.all([
        safeSelect("expenses", user),
        safeSelect("incomes", user),
        safeSelect("wallets", user),
        safeSelect("budgets", user),
        safeSelect("wallet_transactions", user),
        safeSelect("transfers", user),
      ]);

      setExpenses(e || []);
      setIncomes(i || []);
      setWallets(w || []);
      setBudgets(b || []);
      setWalletTransactions(wt || []);
      setTransfers(t || []);
    } catch (err) {
      console.error("❌ loadAll error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!user?.id && !user?.email) return;

    const channel = supabase
      .channel(`finance-${user?.id || user?.email}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets" },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_transactions" },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transfers" },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budgets" },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incomes" },
        () => loadAll()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadAll]);

  const refreshData = useCallback(() => loadAll(), [loadAll]);

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

    const { error } = await supabase.from("incomes").insert([
      {
        ...income,
        amount,
        date: getSafeDate(income.date),
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      },
    ]);

    if (error) throw error;

    if (income.wallet_id) {
      await updateWalletBalance(income.wallet_id, amount);
    }

    await loadAll();
  };

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + toNumber(e.amount), 0),
    [expenses]
  );

  const totalIncome = useMemo(
    () => incomes.reduce((sum, i) => sum + toNumber(i.amount), 0),
    [incomes]
  );

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