const DB_NAME = "clara-offline-finance";
const DB_VERSION = 1;
const EXPENSE_STORE = "expenses";
const SNAPSHOT_STORE = "snapshots";

const DEFAULT_OWNER_KEY = "guest";

const isBrowser = () => typeof window !== "undefined" && typeof indexedDB !== "undefined";

const safeOwnerKey = (ownerKey) => String(ownerKey || DEFAULT_OWNER_KEY);

const nowIso = () => new Date().toISOString();

const createLocalId = (prefix = "local") => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const clonePlain = (value) => {
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch {
    return value;
  }
};

const parseDateTime = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

const normalizeAmount = (value) => {
  const number = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(number) ? number : 0;
};

const openClaraOfflineDb = () => {
  if (!isBrowser()) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(EXPENSE_STORE)) {
        const expenseStore = db.createObjectStore(EXPENSE_STORE, { keyPath: "local_id" });
        expenseStore.createIndex("ownerKey", "ownerKey", { unique: false });
        expenseStore.createIndex("sync_status", "sync_status", { unique: false });
        expenseStore.createIndex("created_at", "created_at", { unique: false });
      }

      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        db.createObjectStore(SNAPSHOT_STORE, { keyPath: "ownerKey" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open CLARA offline storage."));
  });
};

const runStore = async (storeName, mode, runner) => {
  const db = await openClaraOfflineDb();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    transaction.oncomplete = () => {
      if (!settled) finish(null);
      db.close();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("CLARA offline storage failed."));
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error("CLARA offline storage was interrupted."));
    };

    try {
      runner(store, finish);
    } catch (error) {
      db.close();
      reject(error);
    }
  });
};

const getAllFromStore = async (storeName) => {
  const result = await runStore(storeName, "readonly", (store, finish) => {
    const request = store.getAll();
    request.onsuccess = () => finish(request.result || []);
    request.onerror = () => finish([]);
  });

  return Array.isArray(result) ? result : [];
};

const normalizeLocalExpense = (expense = {}, ownerKey = DEFAULT_OWNER_KEY) => {
  const createdAt = expense.created_at || expense.date || nowIso();
  const localId = expense.local_id || expense.localId || createLocalId("expense");

  return {
    ...clonePlain(expense),
    id: expense.id || localId,
    local_id: localId,
    localId,
    ownerKey: safeOwnerKey(expense.ownerKey || ownerKey),
    amount: normalizeAmount(expense.amount),
    date: expense.date || createdAt,
    created_at: createdAt,
    updated_at: expense.updated_at || createdAt,
    sync_status: expense.sync_status || "pending",
    local_only: expense.local_only !== false,
    pending_sync: expense.pending_sync !== false,
  };
};

export function isClaraOnline() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

export async function saveLocalExpense(expense, ownerKey = DEFAULT_OWNER_KEY) {
  const localExpense = normalizeLocalExpense(expense, ownerKey);

  await runStore(EXPENSE_STORE, "readwrite", (store, finish) => {
    const request = store.put(localExpense);
    request.onsuccess = () => finish(localExpense);
    request.onerror = () => finish(localExpense);
  });

  return localExpense;
}

export async function getLocalExpenses(ownerKey = DEFAULT_OWNER_KEY) {
  const safeKey = safeOwnerKey(ownerKey);
  const expenses = await getAllFromStore(EXPENSE_STORE);

  return expenses
    .filter((expense) => !safeKey || safeOwnerKey(expense.ownerKey) === safeKey)
    .sort((a, b) => parseDateTime(b.created_at || b.date) - parseDateTime(a.created_at || a.date));
}

export async function getPendingExpenses(ownerKey = DEFAULT_OWNER_KEY) {
  const expenses = await getLocalExpenses(ownerKey);
  return expenses.filter((expense) => expense.sync_status !== "synced" && !expense.remote_id);
}

export async function markExpenseSynced(localId, remoteId) {
  if (!localId) return null;

  let updated = null;

  await runStore(EXPENSE_STORE, "readwrite", (store, finish) => {
    const request = store.get(localId);

    request.onsuccess = () => {
      const current = request.result;

      if (!current) {
        finish(null);
        return;
      }

      updated = {
        ...current,
        id: remoteId || current.id,
        remote_id: remoteId || current.remote_id || null,
        sync_status: "synced",
        pending_sync: false,
        local_only: false,
        synced_at: nowIso(),
      };

      const putRequest = store.put(updated);
      putRequest.onsuccess = () => finish(updated);
      putRequest.onerror = () => finish(updated);
    };

    request.onerror = () => finish(null);
  });

  return updated;
}

const stripLocalExpenseFields = (expense = {}) => {
  const {
    local_id,
    localId,
    ownerKey,
    sync_status,
    pending_sync,
    local_only,
    remote_id,
    synced_at,
    wallet_transaction,
    ...payload
  } = expense;

  return {
    ...payload,
    id: remote_id || (String(payload.id || "").startsWith("expense_") ? undefined : payload.id),
    amount: normalizeAmount(payload.amount),
  };
};

export async function syncPendingExpenses(userId, supabaseClient, ownerKey = userId || DEFAULT_OWNER_KEY) {
  if (!userId || !supabaseClient || !isClaraOnline()) {
    return { synced: 0, failed: 0, skipped: true };
  }

  const pendingExpenses = await getPendingExpenses(ownerKey);
  let synced = 0;
  let failed = 0;

  for (const localExpense of pendingExpenses) {
    try {
      const payload = {
        ...stripLocalExpenseFields(localExpense),
        user_id: localExpense.user_id || userId,
      };

      delete payload.id;

      const { data, error } = await supabaseClient
        .from("expenses")
        .insert([payload])
        .select("*")
        .single();

      if (error) throw error;

      const remoteExpenseId = data?.id || null;
      await markExpenseSynced(localExpense.local_id, remoteExpenseId);

      if (localExpense.wallet_transaction && remoteExpenseId) {
        const transactionPayload = {
          ...localExpense.wallet_transaction,
          expense_id: remoteExpenseId,
          user_id: localExpense.wallet_transaction.user_id || userId,
        };

        delete transactionPayload.id;
        delete transactionPayload.local_id;
        delete transactionPayload.local_only;
        delete transactionPayload.pending_sync;
        delete transactionPayload.sync_status;

        await supabaseClient.from("wallet_transactions").insert([transactionPayload]);
      }

      synced += 1;
    } catch (error) {
      console.warn("CLARA offline expense sync failed:", error);
      failed += 1;
    }
  }

  return { synced, failed, skipped: false };
}

export async function saveCachedFinanceSnapshot(snapshot, ownerKey = DEFAULT_OWNER_KEY) {
  const safeKey = safeOwnerKey(ownerKey || snapshot?.key || snapshot?.ownerKey);

  const payload = {
    ownerKey: safeKey,
    snapshot: clonePlain(snapshot || {}),
    cached_at: nowIso(),
  };

  await runStore(SNAPSHOT_STORE, "readwrite", (store, finish) => {
    const request = store.put(payload);
    request.onsuccess = () => finish(payload);
    request.onerror = () => finish(payload);
  });

  return payload.snapshot;
}

export async function getCachedFinanceSnapshot(ownerKey = DEFAULT_OWNER_KEY) {
  const safeKey = safeOwnerKey(ownerKey);

  const cached = await runStore(SNAPSHOT_STORE, "readonly", (store, finish) => {
    const request = store.get(safeKey);
    request.onsuccess = () => finish(request.result || null);
    request.onerror = () => finish(null);
  });

  return cached?.snapshot || null;
}

const getExpenseMergeKey = (expense = {}) => {
  if (expense.remote_id) return `remote:${expense.remote_id}`;
  if (expense.id && !String(expense.id).startsWith("expense_")) return `remote:${expense.id}`;
  if (expense.local_id) return `local:${expense.local_id}`;
  if (expense.localId) return `local:${expense.localId}`;

  const amount = normalizeAmount(expense.amount);
  const date = expense.date || expense.created_at || "";
  const walletId = expense.wallet_id || "";
  const category = expense.category || "";

  return `signature:${amount}:${date}:${walletId}:${category}`;
};

export function mergeRemoteAndLocalFinanceData(remoteData = {}, localData = {}) {
  const remoteExpenses = Array.isArray(remoteData.expenses) ? remoteData.expenses : [];
  const localExpenses = Array.isArray(localData.expenses) ? localData.expenses : [];

  const pendingLocalExpenses = localExpenses.filter(
    (expense) => expense.sync_status !== "synced" || !expense.remote_id
  );

  const expenseMap = new Map();

  remoteExpenses.forEach((expense) => {
    expenseMap.set(getExpenseMergeKey(expense), {
      ...expense,
      local_only: false,
    });
  });

  pendingLocalExpenses.forEach((expense) => {
    const key = getExpenseMergeKey(expense);

    if (!expenseMap.has(key)) {
      expenseMap.set(key, expense);
    }
  });

  const mergedExpenses = Array.from(expenseMap.values()).sort(
    (a, b) => parseDateTime(b.created_at || b.date) - parseDateTime(a.created_at || a.date)
  );

  return {
    ...localData,
    ...remoteData,
    wallets: Array.isArray(remoteData.wallets)
      ? remoteData.wallets
      : Array.isArray(localData.wallets)
        ? localData.wallets
        : [],
    expenses: mergedExpenses,
    budgets: Array.isArray(remoteData.budgets)
      ? remoteData.budgets
      : Array.isArray(localData.budgets)
        ? localData.budgets
        : [],
    savingsGoals: Array.isArray(remoteData.savingsGoals)
      ? remoteData.savingsGoals
      : Array.isArray(localData.savingsGoals)
        ? localData.savingsGoals
        : [],
    walletTransactions: Array.isArray(remoteData.walletTransactions)
      ? remoteData.walletTransactions
      : Array.isArray(localData.walletTransactions)
        ? localData.walletTransactions
        : [],
    pendingExpenses: pendingLocalExpenses,
    offlineReady: Boolean(localData.offlineReady || pendingLocalExpenses.length || localData.cached_at),
  };
}
