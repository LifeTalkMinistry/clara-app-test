import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getWalletBalance } from "@/utils/financialEngine";
import {
  createFinanceRepository,
  FINANCE_REPOSITORY_MODE_SUPABASE_LEGACY,
} from "@/lib/financeRepository";

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
const normalizeId = (value) => String(value ?? "").trim();

const FINANCE_INCOME_TYPES = new Set([
  "income",
  "add",
  "cash_in",
  "deposit",
  "opening_balance",
  "credit",
]);

const FINANCE_TABLES = ["expenses", "wallets", "wallet_transactions", "transfers", "budgets"];
const PRIMARY_OWNERSHIP_COLUMN = "user_id";

const logFinanceWarning = (...args) => {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
};

const logFinanceError = (...args) => {
  if (import.meta.env.DEV) {
    console.error(...args);
  }
};

const isMissingColumnError = (error) => {
  const message = normalizeString(error?.message || error?.details || error?.hint);
  return (
    error?.code === "PGRST204" ||
    error?.code === "PGRST200" ||
    error?.code === "42703" ||
    message.includes("column") ||
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("unknown")
  );
};

const isMissingTableError = (error) => {
  const message = normalizeString(error?.message || error?.details || error?.hint);
  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    message.includes("relation") ||
    message.includes("table") ||
    message.includes("does not exist") ||
    message.includes("not found")
  );
};

const isOwnedByUser = (item, user) => {
  if (!user || !item) return false;

  const userId = normalizeId(user?.id);
  const userEmail = normalizeString(user?.email);

  const itemIds = [item?.user_id, item?.owner_id, item?.profile_id]
    .map(normalizeId)
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

const hasOwnershipFields = (item) => {
  if (!item) return false;

  return [
    item?.user_id,
    item?.owner_id,
    item?.profile_id,
    item?.created_by,
    item?.user_email,
    item?.owner_email,
    item?.email,
  ].some((value) => normalizeId(value));
};

const filterOwnedRows = (rows, user) => {
  const safeRows = rows || [];
  if (!safeRows.length) return [];

  const ownedRows = safeRows.filter((item) => isOwnedByUser(item, user));
  if (ownedRows.length > 0) return ownedRows;

  const rowsHaveOwnershipData = safeRows.some(hasOwnershipFields);
  if (rowsHaveOwnershipData) return [];

  return safeRows;
};

const createOrderedQuery = (query, orderColumn = "created_at", ascending = false) => {
  if (!orderColumn) return query;
  return query.order(orderColumn, { ascending });
};

const runScopedSelect = async ({ table, column, value, orderColumn, ascending }) => {
  if (!value) {
    return { data: [], error: null, skipped: true };
  }

  try {
    const query = createOrderedQuery(
      supabase.from(table).select("*").eq(column, value),
      orderColumn,
      ascending
    );

    return await query;
  } catch (error) {
    return { data: null, error, skipped: false };
  }
};

const mergeRowsById = (...rowGroups) => {
  const map = new Map();

  rowGroups.flat().forEach((row) => {
    if (!row) return;
    const key = normalizeId(row?.id) || JSON.stringify(row);
    if (!map.has(key)) map.set(key, row);
  });

  return Array.from(map.values());
};

const safeSelect = async (table, user, options = {}) => {
  if (!user?.id && !user?.email) return [];

  const orderColumn = options.orderColumn || "created_at";
  const ascending = options.ascending === true;

  if (user?.id) {
    const primaryResult = await runScopedSelect({
      table,
      column: PRIMARY_OWNERSHIP_COLUMN,
      value: user.id,
      orderColumn,
      ascending,
    });

    if (primaryResult?.error) {
      if (isMissingTableError(primaryResult.error)) return [];

      if (!isMissingColumnError(primaryResult.error)) {
        logFinanceWarning(
          `Primary finance load failed for ${table}. Falling back to legacy ownership lookup.`,
          primaryResult.error
        );
      }
    } else if (!primaryResult?.skipped) {
      return filterOwnedRows(primaryResult.data || [], user);
    }
  }

  const scopedResults = [];
  let sawMissingOwnershipColumn = false;
  let sawUsableOwnershipColumn = false;

  const ownershipQueries = [
    { column: "owner_id", value: user?.id },
    { column: "profile_id", value: user?.id },
    { column: "user_email", value: user?.email },
    { column: "created_by", value: user?.email },
    { column: "owner_email", value: user?.email },
    { column: "email", value: user?.email },
  ];

  for (const lookup of ownershipQueries) {
    if (!lookup.value) continue;

    const { data, error, skipped } = await runScopedSelect({
      table,
      column: lookup.column,
      value: lookup.value,
      orderColumn,
      ascending,
    });

    if (skipped) continue;

    if (error) {
      if (isMissingTableError(error)) return [];
      if (isMissingColumnError(error)) {
        sawMissingOwnershipColumn = true;
        continue;
      }

      logFinanceWarning(`Failed loading ${table} by ${lookup.column}`, error);
      continue;
    }

    sawUsableOwnershipColumn = true;

    if (Array.isArray(data) && data.length > 0) {
      scopedResults.push(...data);
    }
  }

  if (scopedResults.length > 0) {
    return filterOwnedRows(mergeRowsById(scopedResults), user);
  }

  if (sawUsableOwnershipColumn) {
    return [];
  }

  if (!sawMissingOwnershipColumn) {
    return [];
  }

  try {
    const fallbackQuery = createOrderedQuery(
      supabase.from(table).select("*"),
      orderColumn,
      ascending
    );

    const { data, error } = await fallbackQuery;

    if (error) {
      if (isMissingTableError(error)) return [];
      logFinanceWarning(`Failed loading ${table}`, error);
      return [];
    }

    return filterOwnedRows(data || [], user);
  } catch (error) {
    logFinanceWarning(`Failed loading ${table}`, error);
    return [];
  }
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

const safeUpdateById = async (table, id, payload) => {
  const { error } = await supabase.from(table).update(payload).eq("id", id);

  if (!error) return;

  if (payload?.updated_at && isMissingColumnError(error)) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.updated_at;

    const { error: fallbackError } = await supabase
      .from(table)
      .update(fallbackPayload)
      .eq("id", id);

    if (fallbackError) throw fallbackError;
    return;
  }

  throw error;
};

const safeInsert = async (table, payload) => {
  const { error } = await supabase.from(table).insert([payload]);
  if (!error) return;

  if (isMissingColumnError(error)) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.updated_at;
    delete fallbackPayload.user_email;
    delete fallbackPayload.owner_email;
    delete fallbackPayload.owner_id;
    delete fallbackPayload.profile_id;

    const { error: fallbackError } = await supabase.from(table).insert([fallbackPayload]);
    if (fallbackError) throw fallbackError;
    return;
  }

  throw error;
};

const getWalletId = (item) => normalizeId(item?.wallet_id || item?.walletId || item?.wallet);
const getExpenseId = (item) => normalizeId(item?.expense_id || item?.expenseId);
const getRelatedWalletId = (item) =>
  normalizeId(item?.related_wallet_id || item?.relatedWalletId);

const isLinkedToWallets = (item, walletIds) => {
  const walletId = getWalletId(item);
  const relatedWalletId = getRelatedWalletId(item);

  return (
    (walletId && walletIds.has(walletId)) ||
    (relatedWalletId && walletIds.has(relatedWalletId))
  );
};

const isLinkedToExpenses = (item, expenseIds) => {
  const expenseId = getExpenseId(item);
  return expenseId && expenseIds.has(expenseId);
};

const normalizeFinanceRows = ({ user, wallets, expenses, budgets, walletTransactions, transfers }) => {
  const walletIds = new Set((wallets || []).map((wallet) => normalizeId(wallet?.id)).filter(Boolean));
  const expenseIds = new Set((expenses || []).map((expense) => normalizeId(expense?.id)).filter(Boolean));

  const normalizedExpenses = (expenses || []).filter((expense) => {
    if (isOwnedByUser(expense, user)) return true;
    if (isLinkedToWallets(expense, walletIds)) return true;
    if (!hasOwnershipFields(expense)) return true;
    return false;
  });

  const normalizedExpenseIds = new Set(
    normalizedExpenses.map((expense) => normalizeId(expense?.id)).filter(Boolean)
  );

  const normalizedWalletTransactions = (walletTransactions || []).filter((txn) => {
    if (isOwnedByUser(txn, user)) return true;
    if (isLinkedToWallets(txn, walletIds)) return true;
    if (isLinkedToExpenses(txn, normalizedExpenseIds)) return true;
    if (!hasOwnershipFields(txn)) return true;
    return false;
  });

  const normalizedTransfers = (transfers || []).filter((transfer) => {
    if (isOwnedByUser(transfer, user)) return true;
    if (isLinkedToWallets(transfer, walletIds)) return true;
    if (!hasOwnershipFields(transfer)) return true;
    return false;
  });

  const normalizedBudgets = (budgets || []).filter((budget) => {
    if (isOwnedByUser(budget, user)) return true;
    if (!hasOwnershipFields(budget)) return true;
    return false;
  });

  return {
    wallets: wallets || [],
    expenses: normalizedExpenses,
    budgets: normalizedBudgets,
    walletTransactions: normalizedWalletTransactions,
    transfers: normalizedTransfers,
  };
};

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

  const hasLoadedRef = useRef(initialCache.loaded);
  const refreshTimeoutRef = useRef(null);
  const channelRef = useRef(null);
  const mountedRef = useRef(true);

  const hydrateFromCache = useCallback((nextCache) => {
    if (!mountedRef.current) return;

    setExpenses((prev) => (prev === nextCache.expenses ? prev : nextCache.expenses || []));
    setIncomes((prev) => (prev === nextCache.incomes ? prev : nextCache.incomes || []));
    setWallets((prev) => (prev === nextCache.wallets ? prev : nextCache.wallets || []));
    setBudgets((prev) => (prev === nextCache.budgets ? prev : nextCache.budgets || []));
    setWalletTransactions((prev) =>
      prev === nextCache.walletTransactions ? prev : nextCache.walletTransactions || []
    );
    setTransfers((prev) => (prev === nextCache.transfers ? prev : nextCache.transfers || []));
    hasLoadedRef.current = nextCache.loaded;
    setLoading(!nextCache.loaded);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
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

  const loadAll = useCallback(
    async ({ background = false } = {}) => {
      const currentUser = { id: userId, email: userEmail };

      if (!currentUser.id && !currentUser.email) {
        const emptyCache = createEmptyFinancialCache();
        financialDataCache = emptyCache;
        hydrateFromCache(emptyCache);
        return emptyCache;
      }

      if (financialDataInFlight?.key === cacheKey) {
        return financialDataInFlight.promise;
      }

      if (!hasLoadedRef.current && !background) {
        setLoading(true);
      }

      const promise = (async () => {
        const [rawWallets, rawExpenses, rawBudgets, rawWalletTransactions, rawTransfers] =
          await Promise.all([
            safeSelect("wallets", currentUser),
            safeSelect("expenses", currentUser),
            safeSelect("budgets", currentUser),
            safeSelect("wallet_transactions", currentUser),
            safeSelect("transfers", currentUser),
          ]);

        const normalized = normalizeFinanceRows({
          user: currentUser,
          wallets: rawWallets,
          expenses: rawExpenses,
          budgets: rawBudgets,
          walletTransactions: rawWalletTransactions,
          transfers: rawTransfers,
        });

        const nextCache = {
          key: cacheKey,
          loaded: true,
          expenses: normalized.expenses || [],
          incomes: [],
          wallets: (normalized.wallets || []).map((wallet) => {
            const balance = getWalletBalance(
              wallet,
              normalized.walletTransactions || [],
              normalized.transfers || []
            );

            return {
              ...wallet,
              balance,
              derived_balance: balance,
            };
          }),
          budgets: normalized.budgets || [],
          walletTransactions: normalized.walletTransactions || [],
          transfers: normalized.transfers || [],
        };

        financialDataCache = nextCache;
        hydrateFromCache(nextCache);
        return nextCache;
      })()
        .catch((err) => {
          logFinanceError("loadAll error:", err);

          const fallbackCache =
            financialDataCache.key === cacheKey
              ? financialDataCache
              : createEmptyFinancialCache(cacheKey);

          hydrateFromCache({
            ...fallbackCache,
            loaded: true,
          });

          return fallbackCache;
        })
        .finally(() => {
          if (financialDataInFlight?.key === cacheKey) {
            financialDataInFlight = null;
          }

          if (mountedRef.current) {
            setLoading(false);
          }
        });

      financialDataInFlight = {
        key: cacheKey,
        promise,
      };

      return promise;
    },
    [cacheKey, hydrateFromCache, userEmail, userId]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!userId && !userEmail) return undefined;

    let isActive = true;

    const scheduleRefresh = () => {
      if (!isActive) return;

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        if (isActive) {
          loadAll({ background: true });
        }
      }, 350);
    };

    let channel = null;

    try {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const safeUserKey = String(userId || userEmail || "guest").replace(/[^a-zA-Z0-9_-]/g, "_");
      const channelName = `finance-${safeUserKey}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      channel = supabase.channel(channelName);
      channelRef.current = channel;

      FINANCE_TABLES.forEach((table) => {
        try {
          if (userId) {
            channel.on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table,
                filter: `user_id=eq.${userId}`,
              },
              scheduleRefresh
            );
          } else {
            channel.on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table,
              },
              scheduleRefresh
            );
          }
        } catch (error) {
          logFinanceWarning(`Realtime listener skipped for ${table}:`, error);
        }
      });

      channel.subscribe((status, error) => {
        if (error) {
          logFinanceWarning("Financial realtime subscription warning:", error);
        }

        if (status === "CHANNEL_ERROR") {
          logFinanceWarning("Financial realtime channel error. Data will still refresh manually.");
        }
      });
    } catch (error) {
      logFinanceWarning("Financial realtime setup skipped. Data will still load normally.", error);
    }

    return () => {
      isActive = false;

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      if (channel) {
        supabase.removeChannel(channel);
      }

      if (channelRef.current === channel) {
        channelRef.current = null;
      }
    };
  }, [userEmail, userId, loadAll]);

  const refreshData = useCallback((options) => loadAll(options), [loadAll]);

  const updateWalletBalance = async (walletId, amountChange) => {
    const wallet = wallets.find((w) => String(w.id) === String(walletId));
    if (!wallet) return;

    const updated =
      toNumber(wallet?.derived_balance ?? wallet?.balance) + toNumber(amountChange);

    await safeUpdateById("wallets", walletId, {
      balance: updated,
      updated_at: new Date().toISOString(),
    });
  };

  const insertWalletTransaction = async (payload) => {
    const now = new Date().toISOString();

    await safeInsert("wallet_transactions", {
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
      updated_at: payload.updated_at || now,
      user_id: user?.id || null,
      user_email: user?.email || null,
      created_by: user?.email || null,
    });
  };

  const addExpense = async (expense) => {
    const repository = createFinanceRepository({
      mode: FINANCE_REPOSITORY_MODE_SUPABASE_LEGACY,
      supabase,
      user,
      wallets,
      walletTransactions,
      generateId,
      toNumber,
      getSafeDate,
      normalizePlanningStatus,
      safeInsert,
      safeUpdateById,
    });

    await repository.addExpense(user?.id, expense);

    await loadAll();
  };

  const updateExpense = async (id, updates) => {
    const repository = createFinanceRepository({
      mode: FINANCE_REPOSITORY_MODE_SUPABASE_LEGACY,
      supabase,
      user,
      wallets,
      expenses,
      walletTransactions,
      generateId,
      toNumber,
      getSafeDate,
      normalizePlanningStatus,
      safeInsert,
      safeUpdateById,
    });

    await repository.updateExpense(user?.id, id, updates);

    await loadAll();
  };

  const deleteExpense = async (id) => {
    const repository = createFinanceRepository({
      mode: FINANCE_REPOSITORY_MODE_SUPABASE_LEGACY,
      supabase,
      user,
      wallets,
      expenses,
      walletTransactions,
      generateId,
      toNumber,
      getSafeDate,
      normalizePlanningStatus,
      safeInsert,
      safeUpdateById,
    });

    await repository.deleteExpense(user?.id, id);

    await loadAll();
  };

  const addWallet = async (wallet) => {
    const repository = createFinanceRepository({
      mode: FINANCE_REPOSITORY_MODE_SUPABASE_LEGACY,
      supabase,
      user,
      wallets,
      walletTransactions,
      generateId,
      toNumber,
      getSafeDate,
      normalizePlanningStatus,
      safeInsert,
      safeUpdateById,
    });

    await repository.addWallet(user?.id, wallet);

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

    await safeUpdateById("wallets", id, normalizedUpdates);
    await loadAll();
  };

  const deleteWallet = async (id) => {
    const { error } = await supabase.from("wallets").delete().eq("id", id);
    if (error) throw error;

    await loadAll();
  };

  const addIncome = async (income) => {
    const amount = toNumber(income.amount);

    if (amount <= 0) {
      throw new Error("Enter a valid amount.");
    }

    if (!income.wallet_id) {
      throw new Error("Wallet is required to add money.");
    }

    const wallet = wallets.find((w) => String(w.id) === String(income.wallet_id));

    if (!wallet) {
      throw new Error("Wallet not found.");
    }

    const operationTime = new Date().toISOString();
    const currentBalance = toNumber(
      wallet?.derived_balance ?? wallet?.balance ?? wallet?.current_balance
    );
    const nextBalance = currentBalance + amount;

    await safeUpdateById("wallets", wallet.id, {
      balance: nextBalance,
      updated_at: operationTime,
    });

    await insertWalletTransaction({
      wallet_id: wallet.id,
      amount,
      type: "income",
      source_type: income.source_type || income.source,
      tag: income.tag,
      notes: income.notes,
      created_at: operationTime,
      updated_at: operationTime,
    });

    await loadAll();
  };

  const transferBetweenWallets = async ({
    from_wallet_id,
    to_wallet_id,
    amount,
    notes = "",
  }) => {
    const parsedAmount = toNumber(amount);
    const fromWallet = wallets.find((w) => String(w.id) === String(from_wallet_id));
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
      fromWallet?.derived_balance ?? fromWallet?.balance ?? fromWallet?.current_balance
    );

    const toBalance = toNumber(
      toWallet?.derived_balance ?? toWallet?.balance ?? toWallet?.current_balance
    );

    if (fromBalance < parsedAmount) {
      throw new Error("Insufficient balance in source wallet.");
    }

    const operationTime = new Date().toISOString();
    const transferGroupId = generateId();

    const nextFromBalance = fromBalance - parsedAmount;
    const nextToBalance = toBalance + parsedAmount;

    await safeUpdateById("wallets", fromWallet.id, {
      balance: nextFromBalance,
      updated_at: operationTime,
    });

    await safeUpdateById("wallets", toWallet.id, {
      balance: nextToBalance,
      updated_at: operationTime,
    });

    await insertWalletTransaction({
      wallet_id: fromWallet.id,
      amount: parsedAmount,
      type: "transfer_out",
      transfer_group_id: transferGroupId,
      related_wallet_id: toWallet.id,
      notes,
      created_at: operationTime,
      updated_at: operationTime,
    });

    await insertWalletTransaction({
      wallet_id: toWallet.id,
      amount: parsedAmount,
      type: "transfer_in",
      transfer_group_id: transferGroupId,
      related_wallet_id: fromWallet.id,
      notes,
      created_at: operationTime,
      updated_at: operationTime,
    });

    await loadAll();
  };

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + toNumber(e.amount), 0),
    [expenses]
  );

  const totalIncome = useMemo(() => {
    return walletTransactions
      .filter((t) => FINANCE_INCOME_TYPES.has(String(t?.type || "").trim().toLowerCase()))
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
