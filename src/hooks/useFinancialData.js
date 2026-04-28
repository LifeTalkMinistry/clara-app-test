import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

const normalizePlanningStatus = (value) => {
  const normalized = String(value || "planned").trim().toLowerCase();
  return ["planned", "unplanned", "undocumented"].includes(normalized)
    ? normalized
    : "planned";
};

const FINANCE_INCOME_TYPES = new Set([
  "income",
  "add",
  "cash_in",
  "deposit",
  "opening_balance",
  "credit",
]);

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getOfflineUserKey = (user) =>
  String(user?.id || user?.email || "guest").replace(/[^a-zA-Z0-9_-]/g, "_");

const getStorageKey = (user, table) =>
  `clara_offline_${table}_${getOfflineUserKey(user)}`;

const readJson = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
  } catch (error) {
    console.error("Failed to save offline finance data:", error);
  }
};

const sortByNewest = (rows) =>
  [...(rows || [])].sort((a, b) => {
    const aTime = new Date(a?.created_at || a?.created_date || a?.date || 0).getTime();
    const bTime = new Date(b?.created_at || b?.created_date || b?.date || 0).getTime();
    return bTime - aTime;
  });

const normalizeExpense = (expense, user) => {
  const now = new Date().toISOString();

  return {
    id: expense.id || generateId(),
    amount: toNumber(expense.amount),
    category: expense.category || "Uncategorized",
    description: expense.description || expense.notes || "",
    notes: expense.notes || expense.description || "",
    date: expense.date || expense.created_at || expense.created_date || now,
    created_at: expense.created_at || expense.created_date || now,
    updated_at: expense.updated_at || now,
    wallet_id: expense.wallet_id ? String(expense.wallet_id) : null,
    need_type: expense.need_type || "need",
    planning_status: normalizePlanningStatus(expense.planning_status),
    unplanned_reason: expense.unplanned_reason || null,
    user_id: user?.id || null,
    user_email: user?.email || null,
    created_by: user?.email || null,
    ...expense,
  };
};

const normalizeWallet = (wallet, user) => {
  const starting = toNumber(wallet.balance ?? wallet.starting_balance ?? 0);
  const now = new Date().toISOString();

  return {
    id: wallet.id || generateId(),
    name: wallet.name || "Wallet",
    icon: wallet.icon || "",
    type: wallet.type || "cash",
    balance: starting,
    starting_balance: toNumber(wallet.starting_balance ?? starting),
    created_at: wallet.created_at || wallet.created_date || now,
    updated_at: wallet.updated_at || now,
    user_id: user?.id || null,
    user_email: user?.email || null,
    created_by: user?.email || null,
    ...wallet,
  };
};

const normalizeWalletTransaction = (txn, user) => {
  const now = new Date().toISOString();

  return {
    id: txn.id || generateId(),
    wallet_id: txn.wallet_id ? String(txn.wallet_id) : null,
    amount: toNumber(txn.amount),
    type: txn.type || "transaction",
    category: txn.category || null,
    need_type: txn.need_type || null,
    planning_status: txn.planning_status || null,
    unplanned_reason: txn.unplanned_reason || null,
    expense_id: txn.expense_id || null,
    transfer_group_id: txn.transfer_group_id || null,
    related_wallet_id: txn.related_wallet_id || null,
    source_type: txn.source_type || null,
    source_details: txn.source_details || null,
    tag: txn.tag || null,
    notes: txn.notes || "",
    created_at: txn.created_at || txn.created_date || now,
    updated_at: txn.updated_at || now,
    user_id: user?.id || null,
    user_email: user?.email || null,
    created_by: user?.email || null,
    ...txn,
  };
};

const normalizeTransfer = (transfer, user) => {
  const now = new Date().toISOString();

  return {
    id: transfer.id || generateId(),
    from_wallet_id: transfer.from_wallet_id
      ? String(transfer.from_wallet_id)
      : null,
    to_wallet_id: transfer.to_wallet_id ? String(transfer.to_wallet_id) : null,
    amount: toNumber(transfer.amount),
    notes: transfer.notes || "",
    created_at: transfer.created_at || transfer.created_date || now,
    updated_at: transfer.updated_at || now,
    user_id: user?.id || null,
    user_email: user?.email || null,
    created_by: user?.email || null,
    ...transfer,
  };
};

const normalizeBudget = (budget, user) => {
  const now = new Date().toISOString();

  return {
    id: budget.id || generateId(),
    created_at: budget.created_at || budget.created_date || now,
    updated_at: budget.updated_at || now,
    user_id: user?.id || null,
    user_email: user?.email || null,
    created_by: user?.email || null,
    ...budget,
  };
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

export default function useFinancialData(user) {
  const userId = user?.id || null;
  const userEmail = user?.email || null;
  const cacheKey = userId || userEmail || "guest";

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

  const keys = useMemo(
    () => ({
      expenses: getStorageKey(user, "expenses"),
      wallets: getStorageKey(user, "wallets"),
      budgets: getStorageKey(user, "budgets"),
      walletTransactions: getStorageKey(user, "wallet_transactions"),
      transfers: getStorageKey(user, "transfers"),
    }),
    [user]
  );

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

  const persistAll = useCallback(
    ({
      nextExpenses = expenses,
      nextWallets = wallets,
      nextBudgets = budgets,
      nextWalletTransactions = walletTransactions,
      nextTransfers = transfers,
    }) => {
      const normalizedWallets = (nextWallets || []).map((wallet) => {
        const balance = getWalletBalance(
          wallet,
          nextWalletTransactions || [],
          nextTransfers || []
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
        expenses: sortByNewest(nextExpenses),
        incomes: [],
        wallets: normalizedWallets,
        budgets: nextBudgets || [],
        walletTransactions: sortByNewest(nextWalletTransactions),
        transfers: sortByNewest(nextTransfers),
      };

      writeJson(keys.expenses, nextCache.expenses);
      writeJson(keys.wallets, nextCache.wallets);
      writeJson(keys.budgets, nextCache.budgets);
      writeJson(keys.walletTransactions, nextCache.walletTransactions);
      writeJson(keys.transfers, nextCache.transfers);

      financialDataCache = nextCache;
      hydrateFromCache(nextCache);

      return nextCache;
    },
    [
      budgets,
      cacheKey,
      expenses,
      hydrateFromCache,
      keys.budgets,
      keys.expenses,
      keys.transfers,
      keys.walletTransactions,
      keys.wallets,
      transfers,
      walletTransactions,
      wallets,
    ]
  );

  const loadAll = useCallback(
    async () => {
      setLoading(true);

      try {
        const rawExpenses = readJson(keys.expenses, []).map((expense) =>
          normalizeExpense(expense, user)
        );

        const rawWallets = readJson(keys.wallets, []).map((wallet) =>
          normalizeWallet(wallet, user)
        );

        const rawBudgets = readJson(keys.budgets, []).map((budget) =>
          normalizeBudget(budget, user)
        );

        const rawWalletTransactions = readJson(
          keys.walletTransactions,
          []
        ).map((txn) => normalizeWalletTransaction(txn, user));

        const rawTransfers = readJson(keys.transfers, []).map((transfer) =>
          normalizeTransfer(transfer, user)
        );

        const normalizedWallets = rawWallets.map((wallet) => {
          const balance = getWalletBalance(
            wallet,
            rawWalletTransactions,
            rawTransfers
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
          expenses: sortByNewest(rawExpenses),
          incomes: [],
          wallets: normalizedWallets,
          budgets: rawBudgets,
          walletTransactions: sortByNewest(rawWalletTransactions),
          transfers: sortByNewest(rawTransfers),
        };

        financialDataCache = nextCache;
        hydrateFromCache(nextCache);

        return nextCache;
      } catch (error) {
        console.error("Offline loadAll error:", error);

        const fallbackCache =
          financialDataCache.key === cacheKey
            ? { ...financialDataCache, loaded: true }
            : createEmptyFinancialCache(cacheKey);

        hydrateFromCache(fallbackCache);
        return fallbackCache;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [cacheKey, hydrateFromCache, keys, user]
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refreshData = useCallback(() => loadAll(), [loadAll]);

  const addExpense = async (expense) => {
    const now = new Date().toISOString();
    const walletId = expense.wallet_id ? String(expense.wallet_id) : null;
    const amount = toNumber(expense.amount);

    if (amount <= 0) {
      throw new Error("Enter a valid expense amount.");
    }

    const newExpense = normalizeExpense(
      {
        ...expense,
        id: expense.id || generateId(),
        amount,
        wallet_id: walletId,
        date: expense.date || now,
        created_at: expense.created_at || now,
        updated_at: now,
      },
      user
    );

    const newTransaction = walletId
      ? normalizeWalletTransaction(
          {
            wallet_id: walletId,
            amount,
            type: "expense",
            category: newExpense.category,
            need_type: newExpense.need_type,
            planning_status: newExpense.planning_status,
            unplanned_reason: newExpense.unplanned_reason,
            expense_id: newExpense.id,
            source_type: "Expense",
            source_details: newExpense.description || newExpense.notes || null,
            tag: newExpense.category || null,
            notes: newExpense.notes || newExpense.description || "",
            created_at: now,
            updated_at: now,
          },
          user
        )
      : null;

    persistAll({
      nextExpenses: [newExpense, ...expenses],
      nextWalletTransactions: newTransaction
        ? [newTransaction, ...walletTransactions]
        : walletTransactions,
    });
  };

  const updateExpense = async (id, updates) => {
    const now = new Date().toISOString();

    const nextExpenses = expenses.map((expense) =>
      String(expense.id) === String(id)
        ? normalizeExpense(
            {
              ...expense,
              ...updates,
              amount:
                updates.amount !== undefined
                  ? toNumber(updates.amount)
                  : expense.amount,
              planning_status:
                updates.planning_status !== undefined
                  ? normalizePlanningStatus(updates.planning_status)
                  : expense.planning_status,
              updated_at: now,
            },
            user
          )
        : expense
    );

    const updatedExpense = nextExpenses.find(
      (expense) => String(expense.id) === String(id)
    );

    const nextWalletTransactions = walletTransactions.map((txn) => {
      if (String(txn.expense_id) !== String(id)) return txn;

      return normalizeWalletTransaction(
        {
          ...txn,
          wallet_id: updatedExpense?.wallet_id || txn.wallet_id,
          amount: toNumber(updatedExpense?.amount ?? txn.amount),
          category: updatedExpense?.category || txn.category,
          need_type: updatedExpense?.need_type || txn.need_type,
          planning_status:
            updatedExpense?.planning_status || txn.planning_status,
          unplanned_reason:
            updatedExpense?.unplanned_reason || txn.unplanned_reason,
          source_details:
            updatedExpense?.description || updatedExpense?.notes || null,
          tag: updatedExpense?.category || txn.tag,
          notes:
            updatedExpense?.notes ||
            updatedExpense?.description ||
            txn.notes ||
            "",
          updated_at: now,
        },
        user
      );
    });

    persistAll({
      nextExpenses,
      nextWalletTransactions,
    });
  };

  const deleteExpense = async (id) => {
    const nextExpenses = expenses.filter(
      (expense) => String(expense.id) !== String(id)
    );

    const nextWalletTransactions = walletTransactions.filter(
      (txn) => String(txn.expense_id) !== String(id)
    );

    persistAll({
      nextExpenses,
      nextWalletTransactions,
    });
  };

  const addWallet = async (wallet) => {
    const newWallet = normalizeWallet(
      {
        ...wallet,
        id: wallet.id || generateId(),
        balance: toNumber(wallet.balance ?? wallet.starting_balance ?? 0),
        starting_balance: toNumber(
          wallet.starting_balance ?? wallet.balance ?? 0
        ),
      },
      user
    );

    persistAll({
      nextWallets: [newWallet, ...wallets],
    });
  };

  const updateWallet = async (id, updates) => {
    const now = new Date().toISOString();

    const nextWallets = wallets.map((wallet) => {
      if (String(wallet.id) !== String(id)) return wallet;

      return normalizeWallet(
        {
          ...wallet,
          ...updates,
          balance:
            updates.balance !== undefined
              ? toNumber(updates.balance)
              : wallet.balance,
          starting_balance:
            updates.starting_balance !== undefined
              ? toNumber(updates.starting_balance)
              : wallet.starting_balance,
          updated_at: now,
        },
        user
      );
    });

    persistAll({
      nextWallets,
    });
  };

  const deleteWallet = async (id) => {
    const walletId = String(id);

    const nextWallets = wallets.filter(
      (wallet) => String(wallet.id) !== walletId
    );

    const nextExpenses = expenses.map((expense) =>
      String(expense.wallet_id) === walletId
        ? { ...expense, wallet_id: null }
        : expense
    );

    const nextWalletTransactions = walletTransactions.filter(
      (txn) =>
        String(txn.wallet_id) !== walletId &&
        String(txn.related_wallet_id) !== walletId
    );

    const nextTransfers = transfers.filter(
      (transfer) =>
        String(transfer.from_wallet_id) !== walletId &&
        String(transfer.to_wallet_id) !== walletId
    );

    persistAll({
      nextWallets,
      nextExpenses,
      nextWalletTransactions,
      nextTransfers,
    });
  };

  const addIncome = async (income) => {
    const amount = toNumber(income.amount);

    if (amount <= 0) {
      throw new Error("Enter a valid amount.");
    }

    if (!income.wallet_id) {
      throw new Error("Wallet is required to add money.");
    }

    const wallet = wallets.find(
      (w) => String(w.id) === String(income.wallet_id)
    );

    if (!wallet) {
      throw new Error("Wallet not found.");
    }

    const now = new Date().toISOString();

    const newTransaction = normalizeWalletTransaction(
      {
        wallet_id: wallet.id,
        amount,
        type: "income",
        source_type: income.source_type || income.source || "Income",
        tag: income.tag || null,
        notes: income.notes || "",
        created_at: now,
        updated_at: now,
      },
      user
    );

    persistAll({
      nextWalletTransactions: [newTransaction, ...walletTransactions],
    });
  };

  const transferBetweenWallets = async ({
    from_wallet_id,
    to_wallet_id,
    amount,
    notes = "",
  }) => {
    const parsedAmount = toNumber(amount);
    const fromWallet = wallets.find(
      (w) => String(w.id) === String(from_wallet_id)
    );
    const toWallet = wallets.find((w) => String(w.id) === String(to_wallet_id));

    if (!fromWallet || !toWallet) {
      throw new Error("Wallet not found.");
    }

    if (String(fromWallet.id) === String(toWallet.id)) {
      throw new Error("Source and destination wallets must be different.");
    }

    if (parsedAmount <= 0) {
      throw new Error("Enter a valid transfer amount.");
    }

    const fromBalance = toNumber(
      fromWallet?.derived_balance ??
        fromWallet?.balance ??
        fromWallet?.current_balance
    );

    if (fromBalance < parsedAmount) {
      throw new Error("Insufficient balance in source wallet.");
    }

    const now = new Date().toISOString();
    const transferGroupId = generateId();

    const transferRecord = normalizeTransfer(
      {
        id: transferGroupId,
        from_wallet_id: fromWallet.id,
        to_wallet_id: toWallet.id,
        amount: parsedAmount,
        notes,
        created_at: now,
        updated_at: now,
      },
      user
    );

    const transferOut = normalizeWalletTransaction(
      {
        wallet_id: fromWallet.id,
        amount: parsedAmount,
        type: "transfer_out",
        transfer_group_id: transferGroupId,
        related_wallet_id: toWallet.id,
        notes,
        created_at: now,
        updated_at: now,
      },
      user
    );

    const transferIn = normalizeWalletTransaction(
      {
        wallet_id: toWallet.id,
        amount: parsedAmount,
        type: "transfer_in",
        transfer_group_id: transferGroupId,
        related_wallet_id: fromWallet.id,
        notes,
        created_at: now,
        updated_at: now,
      },
      user
    );

    persistAll({
      nextTransfers: [transferRecord, ...transfers],
      nextWalletTransactions: [
        transferOut,
        transferIn,
        ...walletTransactions,
      ],
    });
  };

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + toNumber(e.amount), 0),
    [expenses]
  );

  const totalIncome = useMemo(() => {
    return walletTransactions
      .filter((t) =>
        FINANCE_INCOME_TYPES.has(String(t?.type || "").trim().toLowerCase())
      )
      .reduce((sum, t) => sum + toNumber(t.amount), 0);
  }, [walletTransactions]);

  const totalWalletBalance = useMemo(
    () =>
      wallets.reduce((sum, w) => {
        const value =
          w.derived_balance ??
          w.balance ??
          w.current_balance ??
          w.wallet_balance ??
          w.starting_balance ??
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
  };
}
