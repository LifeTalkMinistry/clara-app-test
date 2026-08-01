import { getBackendAccountId } from "../lib/clara-account-identity";
import { getStoredBackendUser } from "../lib/clara-backend-client";
import {
  LOCAL_FINANCE_PRIVATE_STORES,
  LOCAL_FINANCE_STORES,
  openLocalFinanceDb,
} from "../lib/localFinanceStore";
import { getActiveLocalVaultId } from "../lib/localVaultIdentity";
import { listLocalVaultMetadata } from "../lib/localVaultMetadata";

const INSTALL_FLAG = "__claraEmergencyLocalFinanceRecoveryInstalled";
const JOURNAL_PREFIX = "clara_emergency_finance_recovery_v1:";
const CORE_FINANCE_STORES = new Set([
  LOCAL_FINANCE_STORES.expenses,
  LOCAL_FINANCE_STORES.wallets,
  LOCAL_FINANCE_STORES.walletTransactions,
  LOCAL_FINANCE_STORES.transfers,
  LOCAL_FINANCE_STORES.budgets,
  LOCAL_FINANCE_STORES.savingsGoals,
  LOCAL_FINANCE_STORES.emergencyFund,
]);

function text(value) {
  return String(value ?? "").trim();
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function transactionToPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () =>
      reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error || new Error("IndexedDB transaction aborted."));
  });
}

function journalKey(accountId) {
  return `${JOURNAL_PREFIX}${accountId}`;
}

function readJournal(accountId) {
  try {
    return JSON.parse(window.localStorage.getItem(journalKey(accountId)) || "null");
  } catch {
    return null;
  }
}

function writeJournal(accountId, value) {
  try {
    window.localStorage.setItem(journalKey(accountId), JSON.stringify(value));
  } catch {
    // Recovery remains complete even when localStorage is unavailable.
  }
}

async function readAllPrivateRecords() {
  const db = await openLocalFinanceDb();
  const transaction = db.transaction(LOCAL_FINANCE_PRIVATE_STORES, "readonly");
  const entries = [];

  for (const storeName of LOCAL_FINANCE_PRIVATE_STORES) {
    const records = await requestToPromise(
      transaction.objectStore(storeName).getAll()
    );
    for (const record of records || []) {
      if (!record?.id || !text(record.localUserId)) continue;
      entries.push({ storeName, record });
    }
  }

  return entries;
}

function summarizeByVault(entries) {
  const summaries = new Map();
  for (const entry of entries) {
    const vaultId = text(entry.record?.localUserId);
    if (!vaultId) continue;
    if (!summaries.has(vaultId)) {
      summaries.set(vaultId, {
        vaultId,
        total: 0,
        core: 0,
        newestAt: 0,
      });
    }
    const summary = summaries.get(vaultId);
    if (!entry.record?.deletedAt) {
      summary.total += 1;
      if (CORE_FINANCE_STORES.has(entry.storeName)) summary.core += 1;
    }
    const updatedAt = Date.parse(
      entry.record?.updatedAt ||
        entry.record?.updated_at ||
        entry.record?.createdAt ||
        ""
    );
    if (Number.isFinite(updatedAt)) summary.newestAt = Math.max(summary.newestAt, updatedAt);
  }
  return summaries;
}

async function accountCandidateVaultIds(accountId) {
  const candidates = new Set([accountId]);
  try {
    const metadata = await listLocalVaultMetadata();
    for (const vault of metadata || []) {
      if (text(vault?.accountUserId) === accountId && text(vault?.vaultId)) {
        candidates.add(text(vault.vaultId));
      }
    }
  } catch {
    // The raw account-ID partition is still checked even when metadata is damaged.
  }
  return candidates;
}

async function moveVaultRecords({ donorVaultId, activeVaultId, entries }) {
  const donorEntries = entries.filter(
    (entry) => text(entry.record?.localUserId) === donorVaultId
  );
  if (!donorEntries.length) return { moved: 0, byStore: {} };

  const db = await openLocalFinanceDb();
  const transaction = db.transaction(LOCAL_FINANCE_PRIVATE_STORES, "readwrite");
  const done = transactionToPromise(transaction);
  const byStore = {};

  for (const entry of donorEntries) {
    const store = transaction.objectStore(entry.storeName);
    store.put({
      ...entry.record,
      localUserId: activeVaultId,
      syncStatus: entry.record?.deletedAt ? "local_deleted" : "local_only",
      source: "emergency_local_recovery",
      updatedAt:
        entry.record?.updatedAt ||
        entry.record?.updated_at ||
        new Date().toISOString(),
    });
    byStore[entry.storeName] = (byStore[entry.storeName] || 0) + 1;
  }

  await done;
  return { moved: donorEntries.length, byStore };
}

function notifyRecovered(detail) {
  if (typeof window === "undefined") return;
  [
    "clara-finance-updated",
    "clara:finance-data-updated",
    "clara-local-finance-updated",
    "clara-income-hub-updated",
    "clara:debt-obligations-updated",
    "clara:investment-updated",
  ].forEach((eventName) => {
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: { ...detail, source: "emergency_local_recovery" },
      })
    );
  });
}

export async function runEmergencyLocalFinanceRecovery() {
  if (typeof window === "undefined" || !window.indexedDB) {
    return { state: "unavailable" };
  }

  const backendUser = getStoredBackendUser();
  const accountId = text(getBackendAccountId(backendUser));
  const activeVaultId = text(getActiveLocalVaultId());
  if (!accountId || !activeVaultId) return { state: "no_identity" };

  const prior = readJournal(accountId);
  if (prior?.activeVaultId === activeVaultId && prior?.state === "recovered") {
    return prior;
  }

  const entries = await readAllPrivateRecords();
  const summaries = summarizeByVault(entries);
  const activeSummary = summaries.get(activeVaultId) || {
    vaultId: activeVaultId,
    total: 0,
    core: 0,
    newestAt: 0,
  };

  // Never overwrite a vault that still contains meaningful financial records.
  if (activeSummary.core > 0) {
    const result = {
      state: "active_data_present",
      accountId,
      activeVaultId,
      activeCoreRecords: activeSummary.core,
      checkedAt: new Date().toISOString(),
    };
    writeJournal(accountId, result);
    return result;
  }

  const candidateIds = await accountCandidateVaultIds(accountId);
  candidateIds.delete(activeVaultId);
  const donors = [...candidateIds]
    .map((vaultId) => summaries.get(vaultId))
    .filter((summary) => summary?.core > 0)
    .sort((left, right) => {
      if (right.core !== left.core) return right.core - left.core;
      if (right.total !== left.total) return right.total - left.total;
      return right.newestAt - left.newestAt;
    });

  if (!donors.length) {
    const result = {
      state: "no_local_donor",
      accountId,
      activeVaultId,
      checkedAt: new Date().toISOString(),
    };
    writeJournal(accountId, result);
    return result;
  }

  // Automatic recovery is allowed only when the best donor is unambiguous.
  const best = donors[0];
  const second = donors[1];
  if (
    second &&
    second.core === best.core &&
    second.total === best.total &&
    second.newestAt === best.newestAt
  ) {
    const result = {
      state: "ambiguous_local_donors",
      accountId,
      activeVaultId,
      donorVaultIds: donors.map((item) => item.vaultId),
      checkedAt: new Date().toISOString(),
    };
    writeJournal(accountId, result);
    return result;
  }

  const moved = await moveVaultRecords({
    donorVaultId: best.vaultId,
    activeVaultId,
    entries,
  });
  const result = {
    state: "recovered",
    accountId,
    activeVaultId,
    donorVaultId: best.vaultId,
    moved: moved.moved,
    byStore: moved.byStore,
    recoveredAt: new Date().toISOString(),
  };
  writeJournal(accountId, result);
  notifyRecovered(result);
  window.setTimeout(() => window.location.reload(), 400);
  return result;
}

export function installEmergencyLocalFinanceRecovery() {
  if (typeof window === "undefined" || window[INSTALL_FLAG]) return;
  window[INSTALL_FLAG] = true;
  window.setTimeout(() => {
    runEmergencyLocalFinanceRecovery().catch((error) => {
      console.error("[CLARA Recovery] Local finance recovery failed", error);
    });
  }, 1_200);
}

installEmergencyLocalFinanceRecovery();
