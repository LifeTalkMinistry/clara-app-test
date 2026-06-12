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
import {
  updateTransferSafely,
  deleteTransferSafely,
} from "@/lib/financeTransferSafeActions";
import { getEffectiveDemoFinanceLocalUserId } from "@/lib/demo/activeDemoProfile";

const FINANCE_INCOME_TYPES = new Set(["income", "add", "cash_in", "deposit", "opening_balance", "credit"]);
const EXPENSE_STORE = LOCAL_FINANCE_STORES?.expenses || "expenses";
const WALLET_TRANSACTION_STORE = LOCAL_FINANCE_STORES?.walletTransactions || "wallet_transactions";
const FINANCE_UPDATE_EVENTS = [
  "clara-finance-updated",
  "clara:finance-data-updated",
  "clara-local-finance-updated",
];
const EMERGENCY_AMOUNT_KEYS = [
  "protectedBalance",
  "protected_balance",
  "reserveBalance",
  "reserve_balance",
  "savedAmount",
  "saved_amount",
  "currentAmount",
  "current_amount",
  "amount",
  "balance",
  "moneyLeft",
];
const EMERGENCY_ACTIVITY_KEYS = [
  "emergencyActivityLog",
  "emergency_activity_log",
  "activityLog",
  "activity_log",
  "usageLog",
  "usage_log",
];
const EMERGENCY_LINK_KEYS = [
  "emergency_fund_transaction_id",
  "emergencyFundTransactionId",
  "emergency_fund_id",
  "emergencyFundId",
];

const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const num = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(num) ? num : 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const getLocalUserId = (user) => {
  const value = user?.id || user?.email || "local-user";
  const realLocalUserId = String(value || "local-user").trim() || "local-user";
  return getEffectiveDemoFinanceLocalUserId(realLocalUserId);
};

const removeDeletedRows = (rows) => (Array.isArray(rows) ? rows : []).filter((row) => !row?.deletedAt && !row?.deleted_at);
const sortByNewest = (rows) => [...(Array.isArray(rows) ? rows : [])].sort((a, b) => new Date(b?.createdAt || b?.created_at || b?.date || 0).getTime() - new Date(a?.createdAt || a?.created_at || a?.date || 0).getTime());
const sortByOldest = (rows) => [...(Array.isArray(rows) ? rows : [])].sort((a, b) => new Date(a?.createdAt || a?.created_at || a?.date || 0).getTime() - new Date(b?.createdAt || b?.created_at || b?.date || 0).getTime());

const readFirstNumber = (source, keys = []) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return toNumber(value);
  }
  return 0;
};

const readFirstText = (source, keys = []) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return String(value).trim();
  }
  return "";
};

const getEmergencyProtectedAmount = (emergencyFund) => readFirstNumber(emergencyFund, EMERGENCY_AMOUNT_KEYS);
const getEmergencyLinkedWalletId = (emergencyFund) => readFirstText(emergencyFund, ["linkedWalletId", "linked_wallet_id", "reserveWalletId", "reserve_wallet_id", "sourceWalletId", "source_wallet_id", "walletId", "wallet_id", "storageWalletId", "storage_wallet_id"]);
const getEmergencyLinkedWalletName = (emergencyFund) => readFirstText(emergencyFund, ["linkedWalletName", "linked_wallet_name", "reserveWalletName", "reserve_wallet_name", "sourceWalletName", "source_wallet_name", "walletName", "wallet_name", "storageWalletName", "storage_wallet_name"]);

function getEmergencyTransactionText(item = {}) {
  return [
    item?.title,
    item?.name,
    item?.category,
    item?.budget_category,
    item?.budgetCategory,
    item?.reason,
    item?.notes,
    item?.note,
    item?.description,
    item?.type,
    item?.source_type,
    item?.sourceType,
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");
}

function getEmergencyAllocationIds(item = {}, includeOwnId = false) {
  const raw = item?.raw || item || {};
  const keys = includeOwnId ? ["id", ...EMERGENCY_LINK_KEYS] : EMERGENCY_LINK_KEYS;
  return keys
    .map((key) => raw?.[key])
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
    .map((value) => String(value).trim());
}

function isEmergencyFundAllocationRecord(item = {}) {
  const raw = item?.raw || item || {};
  const text = getEmergencyTransactionText(raw);

  return Boolean(
    getEmergencyAllocationIds(raw).length ||
      text.includes("emergency fund allocation") ||
      text.includes("moved to emergency fund") ||
      text.includes("emergency allocation")
  );
}

function isEmergencyAllocationActivity(item = {}) {
  const text = getEmergencyTransactionText(item);
  return Boolean(
    getEmergencyAllocationIds(item, true).length &&
      (text.includes("emergency fund allocation") ||
        text.includes("moved to emergency fund") ||
        text.includes("emergency allocation") ||
        String(item?.type || "").toLowerCase().includes("allocation"))
  );
}

function getEmergencyActivitySource(emergencyFund = {}) {
  for (const key of EMERGENCY_ACTIVITY_KEYS) {
    if (Array.isArray(emergencyFund?.[key])) return emergencyFund[key].filter(Boolean);
  }
  return [];
}

function filterEmergencyActivityLog(log = [], amount, activityId) {
  const safeActivityId = String(activityId || "").trim();
  let removedFallback = false;

  return (Array.isArray(log) ? log : []).filter((item) => {
    if (!item) return false;

    if (
      safeActivityId &&
      (String(item?.id || "") === safeActivityId ||
        String(item?.emergency_fund_transaction_id || "") === safeActivityId ||
        String(item?.emergencyFundTransactionId || "") === safeActivityId)
    ) {
      return false;
    }

    if (!safeActivityId && !removedFallback) {
      const entryAmount = Math.abs(toNumber(item?.amount ?? item?.value ?? item?.total ?? 0));
      const text = getEmergencyTransactionText(item);
      const isAllocationText =
        text.includes("emergency fund allocation") ||
        text.includes("moved to emergency fund") ||
        text.includes("emergency allocation") ||
        String(item?.type || "").toLowerCase().includes("allocation");

      if (entryAmount === amount && isAllocationText) {
        removedFallback = true;
        return false;
      }
    }

    return true;
  });
}

function buildActiveEmergencyAllocationIdSet(rawExpenses = []) {
  const ids = new Set();
  removeDeletedRows(rawExpenses)
    .filter(isEmergencyFundAllocationRecord)
    .forEach((expense) => {
      getEmergencyAllocationIds(expense, true).forEach((id) => ids.add(id));
    });
  return ids;
}

function isOrphanedEmergencyAllocationActivity(item, activeAllocationIds) {
  if (!isEmergencyAllocationActivity(item)) return false;
  const itemIds = getEmergencyAllocationIds(item, true);
  if (!itemIds.length) return false;
  return !itemIds.some((id) => activeAllocationIds.has(id));
}

function removeEmergencyActivityIds(log = [], idsToRemove = new Set()) {
  return (Array.isArray(log) ? log : []).filter((item) => {
    const itemIds = getEmergencyAllocationIds(item, true);
    return !itemIds.some((id) => idsToRemove.has(id));
  });
}

async function repairDeletedEmergencyAllocationOrphans(localUserId, rawEmergencyFund, rawExpenses) {
  if (!rawEmergencyFund) return rawEmergencyFund;

  const primaryActivity = getEmergencyActivitySource(rawEmergencyFund);
  if (!primaryActivity.length) return rawEmergencyFund;

  const activeAllocationIds = buildActiveEmergencyAllocationIdSet(rawExpenses);
  const orphanedAllocations = primaryActivity.filter((item) =>
    isOrphanedEmergencyAllocationActivity(item, activeAllocationIds)
  );

  if (!orphanedAllocations.length) return rawEmergencyFund;

  const orphanedIds = new Set();
  const orphanedAmount = orphanedAllocations.reduce((sum, item) => {
    getEmergencyAllocationIds(item, true).forEach((id) => orphanedIds.add(id));
    return sum + Math.abs(toNumber(item?.amount ?? item?.value ?? item?.total ?? 0));
  }, 0);

  if (!Number.isFinite(orphanedAmount) || orphanedAmount <= 0) return rawEmergencyFund;

  const now = new Date().toISOString();
  const currentEmergencyAmount = getEmergencyProtectedAmount(rawEmergencyFund);
  const nextSaved = Math.max(currentEmergencyAmount - orphanedAmount, 0);
  const nextActivityLogs = EMERGENCY_ACTIVITY_KEYS.reduce((acc, key) => {
    const sourceLog = Array.isArray(rawEmergencyFund?.[key]) ? rawEmergencyFund[key] : primaryActivity;
    acc[key] = removeEmergencyActivityIds(sourceLog, orphanedIds);
    return acc;
  }, {});
  const currentLastTopUp = Math.abs(toNumber(rawEmergencyFund?.lastTopUpAmount ?? rawEmergencyFund?.last_top_up_amount ?? 0));
  const deletedLastTopUp = orphanedAllocations.some(
    (item) => Math.abs(toNumber(item?.amount ?? item?.value ?? item?.total ?? 0)) === currentLastTopUp
  );

  const payload = {
    ...rawEmergencyFund,
    savedAmount: nextSaved,
    saved_amount: nextSaved,
    currentAmount: nextSaved,
    current_amount: nextSaved,
    amount: nextSaved,
    balance: nextSaved,
    moneyLeft: nextSaved,
    protectedBalance: nextSaved,
    protected_balance: nextSaved,
    reserveBalance: nextSaved,
    reserve_balance: nextSaved,
    ...nextActivityLogs,
    lastTopUpAmount: deletedLastTopUp ? null : rawEmergencyFund?.lastTopUpAmount ?? rawEmergencyFund?.last_top_up_amount ?? null,
    last_top_up_amount: deletedLastTopUp ? null : rawEmergencyFund?.last_top_up_amount ?? rawEmergencyFund?.lastTopUpAmount ?? null,
    updatedAt: now,
    updated_at: now,
    emergencyAllocationRepairAt: now,
    emergency_allocation_repair_at: now,
  };

  await repoUpsertEmergencyFund(localUserId, payload);
  dispatchFinanceUpdateEvents();
  return payload;
}

function isEmergencyFundResetPatch(updates = {}) {
  return Boolean(updates?.resetAt || updates?.reset_at);
}

function buildEmergencyFundResetPayload(liveEmergencyFund, now) {
  return {
    ...(liveEmergencyFund || {}),

    savedAmount: 0,
    saved_amount: 0,
    currentAmount: 0,
    current_amount: 0,
    amount: 0,
    balance: 0,
    moneyLeft: 0,

    protectedBalance: 0,
    protected_balance: 0,
    reserveBalance: 0,
    reserve_balance: 0,

    targetAmount: 0,
    target_amount: 0,
    target: 0,
    monthlyTarget: 0,
    monthly_target: 0,

    survivalExpense: 0,
    survival_expense: 0,
    monthlyExpense: 0,
    monthly_expense: 0,
    monthly_survival_expense: 0,

    targetMonths: 3,
    target_months: 3,
    months_target: 3,

    linkedWalletId: null,
    linked_wallet_id: null,
    linkedWalletName: null,
    linked_wallet_name: null,

    reserveWalletId: null,
    reserve_wallet_id: null,
    reserveWalletName: null,
    reserve_wallet_name: null,

    sourceWalletId: null,
    source_wallet_id: null,
    sourceWalletName: null,
    source_wallet_name: null,

    walletId: null,
    wallet_id: null,
    walletName: null,
    wallet_name: null,

    storageWalletId: null,
    storage_wallet_id: null,
    storageWalletName: null,
    storage_wallet_name: null,

    lastTopUpAmount: null,
    last_top_up_amount: null,
    lastTopUpWalletId: null,
    last_top_up_wallet_id: null,

    lastReserveAllocationAt: null,
    last_reserve_allocation_at: null,
    lastReserveTransferAt: null,
    last_reserve_transfer_at: null,

    lastEmergencySpendAmount: null,
    last_emergency_spend_amount: null,
    lastEmergencySpendReason: null,
    last_emergency_spend_reason: null,
    lastEmergencySpendAt: null,
    last_emergency_spend_at: null,

    emergencyActivityLog: [],
    emergency_activity_log: [],
    activityLog: [],
    activity_log: [],
    usageLog: [],
    usage_log: [],

    resetAt: now,
    reset_at: now,
    updatedAt: now,
    updated_at: now,
  };
}

function dispatchFinanceUpdateEvents() {
  if (typeof window === "undefined") return;
  FINANCE_UPDATE_EVENTS.forEach((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName));
  });
}

const getWalletIdentity = (wallet) => String(wallet?.id || wallet?.wallet_id || wallet?.walletId || wallet?.local_id || "").trim();
const getWalletName = (wallet) => String(wallet?.name || wallet?.wallet_name || wallet?.title || wallet?.label || "").trim();

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
  const [financeUserVersion, setFinanceUserVersion] = useState(0);
  const localUserId = useMemo(() => getLocalUserId(user), [user?.id, user?.email, financeUserVersion]);
  const cacheKey = `${localUserId || "local-user"}::finance_data`;
  const hasUsableCache = financialDataCache.loaded && financialDataCache.key === cacheKey;
  const initialCache = hasUsableCache ? financialDataCache : createEmptyFinancialCache(cacheKey);

  const [expenses, setExpenses] = useState(initialCache.expenses || []);
  const [incomes, setIncomes] = useState(initialCache.incomes || []);
  const [wallets, setWallets] = useState(initialCache.wallets || []);
  const [budgets, setBudgets] = useState(initialCache.budgets || []);
  const [walletTransactions, setWalletTransactions] = useState(initialCache.walletTransactions || []);
  const [transfers, setTransfers] = useState(initialCache.transfers || []);
  const [savingsGoals, setSavingsGoals] = useState(initialCache.savingsGoals || []);
  const [emergencyFund, setEmergencyFund] = useState(initialCache.emergencyFund || null);
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
    setWalletTransactions(Array.isArray(nextCache.walletTransactions) ? nextCache.walletTransactions : []);
    setTransfers(Array.isArray(nextCache.transfers) ? nextCache.transfers : []);
    setSavingsGoals(Array.isArray(nextCache.savingsGoals) ? nextCache.savingsGoals : []);
    setEmergencyFund(nextCache.emergencyFund || null);
    setError(nextCache.error || null);
    if (nextCache.loaded) {
      hydratedRef.current = true;
      setLoading(false);
    }
  }, []);

  const buildSafeCache = useCallback(({ rawExpenses, rawWallets, rawWalletTransactions, rawTransfers, rawBudgets, rawSavingsGoals, rawEmergencyFund }) => {
    const safeExpenses = sortByNewest(removeDeletedRows(rawExpenses));
    const safeWalletTransactions = sortByNewest(removeDeletedRows(rawWalletTransactions));
    const safeTransfers = sortByNewest(removeDeletedRows(rawTransfers));
    const safeBudgets = sortByNewest(removeDeletedRows(rawBudgets));
    const safeSavingsGoals = sortByOldest(removeDeletedRows(rawSavingsGoals));
    const emergencyProtectedAmount = getEmergencyProtectedAmount(rawEmergencyFund);
    const emergencyLinkedWalletId = getEmergencyLinkedWalletId(rawEmergencyFund);
    const emergencyLinkedWalletName = getEmergencyLinkedWalletName(rawEmergencyFund);

    const normalizedWallets = sortByOldest(removeDeletedRows(rawWallets)).map((wallet) => {
      const balance = getWalletBalance(wallet, safeWalletTransactions, safeTransfers);
      const walletId = getWalletIdentity(wallet);
      const walletName = getWalletName(wallet);
      const isEmergencyLinkedWallet = emergencyProtectedAmount > 0 && ((emergencyLinkedWalletId && walletId === emergencyLinkedWalletId) || (!emergencyLinkedWalletId && emergencyLinkedWalletName && walletName === emergencyLinkedWalletName));
      const protectedAmount = isEmergencyLinkedWallet ? Math.min(emergencyProtectedAmount, Math.max(balance, 0)) : 0;
      const spendableBalance = Math.max(balance - protectedAmount, 0);
      return {
        ...wallet,
        balance,
        derived_balance: balance,
        emergencyProtectedAmount: protectedAmount,
        emergency_protected_amount: protectedAmount,
        protectedEmergencyAmount: protectedAmount,
        protected_emergency_amount: protectedAmount,
        spendableBalance,
        spendable_balance: spendableBalance,
        walletSpendableBalance: spendableBalance,
        wallet_spendable_balance: spendableBalance,
        hasEmergencyFundAllocation: protectedAmount > 0,
        has_emergency_fund_allocation: protectedAmount > 0,
        emergencyFundLinkedWalletId: protectedAmount > 0 ? emergencyLinkedWalletId || walletId : null,
        emergency_fund_linked_wallet_id: protectedAmount > 0 ? emergencyLinkedWalletId || walletId : null,
        emergencyFundLabel: protectedAmount > 0 ? "Includes Emergency Fund" : "",
        emergency_fund_label: protectedAmount > 0 ? "Includes Emergency Fund" : "",
      };
    });

    const safeIncomes = safeWalletTransactions.filter((transaction) => FINANCE_INCOME_TYPES.has(String(transaction?.type || "").trim().toLowerCase()));
    return { key: cacheKey, loaded: true, hydrated: true, error: null, expenses: safeExpenses, incomes: safeIncomes, wallets: normalizedWallets, budgets: safeBudgets, walletTransactions: safeWalletTransactions, transfers: safeTransfers, savingsGoals: safeSavingsGoals, emergencyFund: rawEmergencyFund || null };
  }, [cacheKey]);

  const loadAll = useCallback(async ({ background = false } = {}) => {
    if (loadingPromiseRef.current) return loadingPromiseRef.current;
    if (mountedRef.current) {
      if (!hydratedRef.current && !background) setLoading(true);
      else setRefreshing(true);
      setError(null);
    }

    const promise = (async () => {
      try {
        const [rawExpenses, rawWallets, rawWalletTransactions, rawTransfers, rawBudgets, rawSavingsGoals, rawEmergencyFund] = await Promise.all([
          getExpenses(localUserId),
          getWallets(localUserId),
          getWalletTransactions(localUserId),
          getTransfers(localUserId),
          getBudgets(localUserId),
          getSavingsGoals(localUserId),
          getEmergencyFund(localUserId),
        ]);
        const nextCache = buildSafeCache({ rawExpenses, rawWallets, rawWalletTransactions, rawTransfers, rawBudgets, rawSavingsGoals, rawEmergencyFund: rawEmergencyFund || null });
        financialDataCache = nextCache;
        hydrateFromCache(nextCache);
        return nextCache;
      } catch (loadError) {
        console.error("CLARA offline finance refresh error:", loadError);
        const fallbackCache = { ...createEmptyFinancialCache(cacheKey), loaded: true, hydrated: true, error: loadError };
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
  }, [buildSafeCache, cacheKey, hydrateFromCache, localUserId]);

  useEffect(() => {
    const bumpFinanceUser = () => {
      financialDataCache = createEmptyFinancialCache();
      setFinanceUserVersion((version) => version + 1);
    };
    const events = ["clara:demo-data-loaded", ...FINANCE_UPDATE_EVENTS, "storage"];
    events.forEach((eventName) => window.addEventListener(eventName, bumpFinanceUser));
    return () => events.forEach((eventName) => window.removeEventListener(eventName, bumpFinanceUser));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const cacheIsForCurrentUser = financialDataCache.loaded && financialDataCache.key === cacheKey;
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

  const refreshData = useCallback(() => loadAll({ background: hydratedRef.current }), [loadAll]);

  const addExpense = useCallback(async (expense) => { const result = await repoAddExpense(localUserId, expense); await refreshData(); return result; }, [localUserId, refreshData]);
  const updateExpense = useCallback(async (id, updates) => { const result = await repoUpdateExpense(localUserId, id, updates); await refreshData(); return result; }, [localUserId, refreshData]);
  const deleteExpenseRecord = useCallback(async (id) => { const result = await repoDeleteExpense(localUserId, id); await refreshData(); return result; }, [localUserId, refreshData]);
  const addWallet = useCallback(async (wallet) => { const result = await repoAddWallet(localUserId, wallet); await refreshData(); return result; }, [localUserId, refreshData]);
  const updateWallet = useCallback(async (id, updates) => { const result = await repoUpdateWallet(localUserId, id, updates); await refreshData(); return result; }, [localUserId, refreshData]);
  const deleteWallet = useCallback(async (id) => { const result = await repoDeleteWallet(localUserId, id); await refreshData(); return result; }, [localUserId, refreshData]);
  const addIncome = useCallback(async (income) => { const result = await repoAddIncome(localUserId, income); await refreshData(); return result; }, [localUserId, refreshData]);
  const addMoney = useCallback(async (income) => { const result = typeof repoAddMoney === "function" ? await repoAddMoney(localUserId, income) : await repoAddIncome(localUserId, income); await refreshData(); return result; }, [localUserId, refreshData]);

  const updateWalletTransaction = useCallback(async (id, updates = {}) => {
    if (!id) throw new Error("Wallet transaction id is required.");
    const existing = await getLocalRecordById(WALLET_TRANSACTION_STORE, id, localUserId);
    if (!existing) throw new Error("Wallet transaction not found for this local user.");
    const now = new Date().toISOString();
    const result = await upsertLocalRecord(WALLET_TRANSACTION_STORE, { ...existing, ...(updates || {}), id: existing.id, localUserId, createdAt: existing.createdAt, updatedAt: now, updated_at: now, syncStatus: updates?.syncStatus || existing.syncStatus || "local_only", source: updates?.source || existing.source || "local" }, localUserId);
    await refreshData();
    return result;
  }, [localUserId, refreshData]);

  const deleteWalletTransaction = useCallback(async (id) => {
    if (!id) throw new Error("Wallet transaction id is required.");
    const result = await softDeleteLocalRecord(WALLET_TRANSACTION_STORE, id, localUserId);
    await refreshData();
    return result;
  }, [localUserId, refreshData]);

  const deleteIncome = useCallback(async (id) => deleteWalletTransaction(id), [deleteWalletTransaction]);
  const transferBetweenWallets = useCallback(async (payload) => { const result = await repoTransferBetweenWallets(localUserId, payload); await refreshData(); return result; }, [localUserId, refreshData]);
  const updateTransfer = useCallback(async (id, updates = {}) => { const result = await updateTransferSafely(localUserId, id, updates); await refreshData(); return result; }, [localUserId, refreshData]);
  const deleteTransfer = useCallback(async (id) => { const result = await deleteTransferSafely(localUserId, id); await refreshData(); return result; }, [localUserId, refreshData]);
  const addBudget = useCallback(async (budget) => { const result = await repoAddBudget(localUserId, budget); await refreshData(); return result; }, [localUserId, refreshData]);
  const updateBudget = useCallback(async (id, updates) => { const result = await repoUpdateBudget(localUserId, id, updates); await refreshData(); return result; }, [localUserId, refreshData]);
  const deleteBudget = useCallback(async (id) => { const result = await repoDeleteBudget(localUserId, id); await refreshData(); return result; }, [localUserId, refreshData]);
  const upsertBudget = useCallback(async (budget) => { const result = await repoUpsertBudget(localUserId, budget); await refreshData(); return result; }, [localUserId, refreshData]);
  const addSavingsGoal = useCallback(async (goal) => { const result = await repoUpsertSavingsGoal(localUserId, { ...(goal || {}), deletedAt: null, deleted_at: null }); await refreshData(); return result; }, [localUserId, refreshData]);
  const updateSavingsGoal = useCallback(async (id, updates = {}) => { const result = await repoUpsertSavingsGoal(localUserId, { ...(updates || {}), id, updatedAt: new Date().toISOString() }); await refreshData(); return result; }, [localUserId, refreshData]);
  const deleteSavingsGoal = useCallback(async (id) => { const now = new Date().toISOString(); const result = await repoUpsertSavingsGoal(localUserId, { id, deletedAt: now, deleted_at: now, updatedAt: now, updated_at: now }); await refreshData(); return result; }, [localUserId, refreshData]);
  const updateEmergencyFund = useCallback(async (updates = {}) => {
    const now = new Date().toISOString();
    const isReset = isEmergencyFundResetPatch(updates);
    const payload = isReset
      ? buildEmergencyFundResetPayload({ ...(emergencyFund || {}), ...(updates || {}) }, now)
      : { ...(updates || {}), updatedAt: now };
    const result = await repoUpsertEmergencyFund(localUserId, payload);
    await refreshData();
    if (isReset) dispatchFinanceUpdateEvents();
    return result;
  }, [emergencyFund, localUserId, refreshData]);

  const deleteEmergencyFundAllocation = useCallback(async (transaction) => {
    const raw = transaction?.raw || transaction || {};
    const lookup = { ...(transaction || {}), ...(raw || {}) };
    const expenseLookup = {
      id: raw?.id,
      rawId: transaction?.rawId,
      transactionId: transaction?.id,
      expense_id: raw?.expense_id ?? transaction?.expense_id,
      expenseId: raw?.expenseId ?? transaction?.expenseId,
      local_id: raw?.local_id ?? transaction?.local_id,
      localId: raw?.localId ?? transaction?.localId,
    };
    const amount = Math.abs(
      toNumber(raw.amount ?? transaction?.amount ?? raw.signedAmount ?? transaction?.signedAmount ?? 0)
    );
    const expenseId = readFirstText(expenseLookup, [
      "id",
      "rawId",
      "transactionId",
      "expense_id",
      "expenseId",
      "local_id",
      "localId",
    ]);
    const activityId = readFirstText(lookup, EMERGENCY_LINK_KEYS);

    if (!expenseId) throw new Error("Emergency Fund allocation is missing its linked expense id.");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Emergency Fund allocation amount is invalid.");

    await deleteExpenseRecord(expenseId);

    const now = new Date().toISOString();
    const liveEmergencyFund = (await getEmergencyFund(localUserId)) || emergencyFund || {};
    const currentEmergencyAmount = getEmergencyProtectedAmount(liveEmergencyFund);
    const nextSaved = Math.max(currentEmergencyAmount - amount, 0);
    const primaryActivity = getEmergencyActivitySource(liveEmergencyFund);
    const nextActivityLogs = EMERGENCY_ACTIVITY_KEYS.reduce((acc, key) => {
      const sourceLog = Array.isArray(liveEmergencyFund?.[key]) ? liveEmergencyFund[key] : primaryActivity;
      acc[key] = filterEmergencyActivityLog(sourceLog, amount, activityId);
      return acc;
    }, {});
    const deletedLastTopUp = Math.abs(toNumber(liveEmergencyFund?.lastTopUpAmount ?? liveEmergencyFund?.last_top_up_amount ?? 0)) === amount;

    const payload = {
      ...liveEmergencyFund,
      savedAmount: nextSaved,
      saved_amount: nextSaved,
      currentAmount: nextSaved,
      current_amount: nextSaved,
      amount: nextSaved,
      balance: nextSaved,
      moneyLeft: nextSaved,
      protectedBalance: nextSaved,
      protected_balance: nextSaved,
      reserveBalance: nextSaved,
      reserve_balance: nextSaved,
      ...nextActivityLogs,
      lastTopUpAmount: deletedLastTopUp ? null : liveEmergencyFund?.lastTopUpAmount ?? liveEmergencyFund?.last_top_up_amount ?? null,
      last_top_up_amount: deletedLastTopUp ? null : liveEmergencyFund?.last_top_up_amount ?? liveEmergencyFund?.lastTopUpAmount ?? null,
      updatedAt: now,
      updated_at: now,
    };

    await repoUpsertEmergencyFund(localUserId, payload);
    await refreshData();
    dispatchFinanceUpdateEvents();

    return {
      deletedExpenseId: expenseId,
      reversedEmergencyAmount: amount,
      nextEmergencySaved: nextSaved,
    };
  }, [deleteExpenseRecord, emergencyFund, localUserId, refreshData]);

  const deleteExpense = useCallback(async (id) => {
    if (!id) throw new Error("Expense id is required.");
    return deleteExpenseRecord(id);
  }, [deleteExpenseRecord]);

  const repairEmergencyFundAllocationBalance = useCallback(async () => {
    const [rawExpenses, liveEmergencyFund] = await Promise.all([
      getExpenses(localUserId),
      getEmergencyFund(localUserId),
    ]);

    if (!liveEmergencyFund) {
      return { repaired: false, reason: "No Emergency Fund record found." };
    }

    const activeAllocations = removeDeletedRows(rawExpenses).filter(isEmergencyFundAllocationRecord);
    const primaryActivity = getEmergencyActivitySource(liveEmergencyFund);
    const allocationActivity = primaryActivity.filter(isEmergencyAllocationActivity);
    const currentEmergencyAmount = getEmergencyProtectedAmount(liveEmergencyFund);
    const hasUnsafeHistory = primaryActivity.some((item) => !isEmergencyAllocationActivity(item));

    if (activeAllocations.length > 0) {
      return { repaired: false, reason: "Active Emergency Fund allocations still exist." };
    }

    if (currentEmergencyAmount <= 0 || !primaryActivity.length || !allocationActivity.length || hasUnsafeHistory) {
      return { repaired: false, reason: "Emergency Fund history is not safe for automatic repair." };
    }

    const activeAllocationIds = buildActiveEmergencyAllocationIdSet(rawExpenses);
    const orphanedAllocations = allocationActivity.filter((item) =>
      isOrphanedEmergencyAllocationActivity(item, activeAllocationIds)
    );

    if (orphanedAllocations.length !== allocationActivity.length) {
      return { repaired: false, reason: "Some allocation activity still matches active expenses." };
    }

    const now = new Date().toISOString();
    const payload = {
      ...liveEmergencyFund,
      savedAmount: 0,
      saved_amount: 0,
      currentAmount: 0,
      current_amount: 0,
      amount: 0,
      balance: 0,
      moneyLeft: 0,
      protectedBalance: 0,
      protected_balance: 0,
      reserveBalance: 0,
      reserve_balance: 0,
      emergencyActivityLog: [],
      emergency_activity_log: [],
      activityLog: [],
      activity_log: [],
      usageLog: [],
      usage_log: [],
      lastTopUpAmount: null,
      last_top_up_amount: null,
      updatedAt: now,
      updated_at: now,
      emergencyAllocationRepairAt: now,
      emergency_allocation_repair_at: now,
    };

    await repoUpsertEmergencyFund(localUserId, payload);
    await refreshData();
    dispatchFinanceUpdateEvents();

    return {
      repaired: true,
      nextEmergencySaved: 0,
      removedActivityCount: orphanedAllocations.length,
    };
  }, [localUserId, refreshData]);

  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeIncomes = Array.isArray(incomes) ? incomes : [];
  const safeWallets = Array.isArray(wallets) ? wallets : [];
  const safeBudgets = Array.isArray(budgets) ? budgets : [];
  const safeWalletTransactions = Array.isArray(walletTransactions) ? walletTransactions : [];
  const safeTransfers = Array.isArray(transfers) ? transfers : [];
  const safeSavingsGoals = Array.isArray(savingsGoals) ? savingsGoals.filter((goal) => !goal?.deletedAt && !goal?.deleted_at) : [];
  const safeEmergencyFund = emergencyFund || null;

  const totalExpenses = useMemo(() => safeExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0), [safeExpenses]);
  const totalIncome = useMemo(() => safeWalletTransactions.filter((transaction) => FINANCE_INCOME_TYPES.has(String(transaction?.type || "").trim().toLowerCase())).reduce((sum, transaction) => sum + toNumber(transaction.amount), 0), [safeWalletTransactions]);
  const totalWalletBalance = useMemo(() => safeWallets.reduce((sum, wallet) => sum + toNumber(wallet.derived_balance ?? wallet.balance ?? wallet.current_balance ?? wallet.wallet_balance ?? wallet.starting_balance ?? 0), 0), [safeWallets]);
  const totalEmergencyProtected = useMemo(() => safeWallets.reduce((sum, wallet) => sum + toNumber(wallet.emergencyProtectedAmount ?? wallet.emergency_protected_amount), 0), [safeWallets]);
  const totalSpendableWalletBalance = useMemo(() => safeWallets.reduce((sum, wallet) => sum + toNumber(wallet.spendableBalance ?? wallet.spendable_balance ?? wallet.walletSpendableBalance ?? wallet.wallet_spendable_balance ?? wallet.derived_balance ?? wallet.balance ?? wallet.current_balance ?? wallet.wallet_balance ?? wallet.starting_balance ?? 0), 0), [safeWallets]);
  const retentionRate = useMemo(() => totalIncome <= 0 ? 0 : ((totalIncome - totalExpenses) / totalIncome) * 100, [totalExpenses, totalIncome]);

  return {
    loading, refreshing, error,
    expenses: safeExpenses, incomes: safeIncomes, wallets: safeWallets, budgets: safeBudgets, walletTransactions: safeWalletTransactions, transfers: safeTransfers, savingsGoals: safeSavingsGoals, emergencyFund: safeEmergencyFund,
    totalExpenses, totalIncome, totalWalletBalance, totalSpendableWalletBalance, totalEmergencyProtected, retentionRate,
    refreshData,
    addExpense, updateExpense, deleteExpense,
    addWallet, updateWallet, deleteWallet,
    addIncome, addMoney, updateWalletTransaction, deleteWalletTransaction, deleteIncome, transferBetweenWallets, updateTransfer, deleteTransfer,
    addBudget, updateBudget, deleteBudget, upsertBudget,
    addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
    updateEmergencyFund, deleteEmergencyFundAllocation, repairEmergencyFundAllocationBalance,
  };
}

export { useFinancialData };
export default useFinancialData;
