import {
  buildClaraCloudVaultSnapshot,
  countCloudSnapshotItems,
  prepareCloudSnapshotForRestore,
  validateClaraCloudSnapshot,
} from "./cloud-vault-snapshot";
import { getBackendAccountId } from "./clara-account-identity";
import {
  getVaultMappingForAccount,
  removeVaultMappingForAccount,
  saveVaultMappingForAccount,
} from "./account-vault-directory";
import {
  getActiveLocalVaultId,
  setActiveLocalVaultId,
} from "./localVaultIdentity";
import { createLocalVaultId } from "./local-user-identity";
import {
  LOCAL_FINANCE_PRIVATE_STORES,
  clearLocalUserPrivateData,
  getLocalRecordsByUser,
} from "./localFinanceStore";
import { restoreClaraLocalDataFromFile } from "./local-data-export";

const RECOVERY_DB_NAME = "clara_device_transfer_recovery";
const RECOVERY_DB_VERSION = 1;
const RECOVERY_STORE = "snapshots";
const LAST_TRANSFER_KEY = "clara_last_device_transfer_v1";

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
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted."));
  });
}

async function openRecoveryDb() {
  if (!globalThis?.indexedDB) {
    throw new Error("This device does not support CLARA's protected transfer checkpoint.");
  }

  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(RECOVERY_DB_NAME, RECOVERY_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECOVERY_STORE)) {
        db.createObjectStore(RECOVERY_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open transfer recovery storage."));
    request.onblocked = () => reject(new Error("Close other CLARA tabs before transferring data."));
  });
}

async function saveRecoveryRecord(record) {
  const db = await openRecoveryDb();
  try {
    const tx = db.transaction(RECOVERY_STORE, "readwrite");
    tx.objectStore(RECOVERY_STORE).put(record);
    await transactionToPromise(tx);
  } finally {
    db.close();
  }
  return record;
}

async function getRecoveryRecord(id) {
  const db = await openRecoveryDb();
  try {
    const tx = db.transaction(RECOVERY_STORE, "readonly");
    const value = await requestToPromise(tx.objectStore(RECOVERY_STORE).get(id));
    await transactionToPromise(tx);
    return value || null;
  } finally {
    db.close();
  }
}

function restoreFileLike(prepared) {
  return {
    text: async () => JSON.stringify(prepared),
  };
}

function storageEntries(prepared) {
  return prepared?.data?.localStorage || prepared?.raw?.localStorage || {};
}

function removeTransferredOnlyStorageKeys(transferredKeys = [], recoveryPrepared) {
  const recoveryKeys = new Set(Object.keys(storageEntries(recoveryPrepared)));
  transferredKeys.forEach((key) => {
    if (!recoveryKeys.has(key)) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // The protected recovery restore below remains the source of truth.
      }
    }
  });
}

async function restorePreparedBackup(prepared, { transferredKeys = [] } = {}) {
  removeTransferredOnlyStorageKeys(transferredKeys, prepared);
  return restoreClaraLocalDataFromFile(restoreFileLike(prepared));
}

function normalizeStoreRecords(store) {
  if (Array.isArray(store)) return store;
  if (Array.isArray(store?.records)) return store.records;
  return [];
}

function getFinanceDatabase(snapshot) {
  return (snapshot?.data?.indexedDB?.databases || []).find(
    (database) => database?.name === "clara_local_finance"
  );
}

function storeCount(snapshot, storeName) {
  return normalizeStoreRecords(getFinanceDatabase(snapshot)?.stores?.[storeName]).length;
}

function preferenceRecords(snapshot) {
  return normalizeStoreRecords(
    getFinanceDatabase(snapshot)?.stores?.private_preferences
  );
}

function streakDaysFromSnapshot(snapshot) {
  let best = 0;
  Object.entries(snapshot?.data?.localStorage || {}).forEach(([key, value]) => {
    if (!key.startsWith("clara_daily_check_in_v3:")) return;
    const state = value && typeof value === "object" ? value : null;
    if (!state) return;
    best = Math.max(
      best,
      Array.isArray(state.completedDates) ? state.completedDates.length : 0,
      Array.isArray(state.checkInEvents) ? state.checkInEvents.length : 0,
      Number(state.currentStreak || 0),
      Number(state.longestStreak || 0)
    );
  });
  return Number.isFinite(best) ? best : 0;
}

export function buildDeviceTransferSummary(snapshot) {
  const counts = countCloudSnapshotItems(snapshot);
  const preferences = preferenceRecords(snapshot);
  return {
    total: counts.total,
    budgets: storeCount(snapshot, "budgets"),
    wallets: storeCount(snapshot, "wallets"),
    expenses: storeCount(snapshot, "expenses"),
    savingsGoals: storeCount(snapshot, "savings_goals"),
    emergencyFunds: storeCount(snapshot, "emergency_fund"),
    debts: preferences.filter((record) =>
      /debt|obligation/i.test(
        `${record?.recordKind || ""} ${record?.kind || ""} ${record?.id || ""}`
      )
    ).length,
    streakDays: streakDaysFromSnapshot(snapshot),
  };
}

export async function createDeviceTransferSnapshot({ user, profile } = {}) {
  const snapshot = await buildClaraCloudVaultSnapshot({
    user,
    profile,
    includeDeviceOnly: true,
  });
  return {
    snapshot,
    summary: buildDeviceTransferSummary(snapshot),
  };
}

function expectedFinanceRecordCount(prepared) {
  const database = (prepared?.data?.indexedDB?.databases || []).find(
    (entry) => entry?.name === "clara_local_finance"
  );
  return Object.entries(database?.stores || {}).reduce((total, [storeName, store]) => {
    if (storeName === "metadata") return total;
    return total + normalizeStoreRecords(store).length;
  }, 0);
}

async function actualFinanceRecordCount(localVaultId) {
  let total = 0;
  for (const storeName of LOCAL_FINANCE_PRIVATE_STORES) {
    const records = await getLocalRecordsByUser(storeName, {
      localUserId: localVaultId,
      includeDeleted: true,
    });
    total += Array.isArray(records) ? records.length : 0;
  }
  return total;
}

function writeLastTransferMetadata(metadata) {
  window.localStorage.setItem(LAST_TRANSFER_KEY, JSON.stringify(metadata));
}

function readLastTransferMetadata() {
  try {
    return JSON.parse(window.localStorage.getItem(LAST_TRANSFER_KEY) || "null");
  } catch {
    return null;
  }
}

function switchAccountVault({ accountId, accountEmail, vaultId, previousMapping }) {
  removeVaultMappingForAccount(accountId);
  try {
    saveVaultMappingForAccount({ accountId, accountEmail, vaultId });
    setActiveLocalVaultId(vaultId);
  } catch (error) {
    removeVaultMappingForAccount(accountId);
    if (previousMapping?.vaultId) {
      saveVaultMappingForAccount({
        accountId,
        accountEmail: previousMapping.accountEmail || accountEmail,
        vaultId: previousMapping.vaultId,
      });
      setActiveLocalVaultId(previousMapping.vaultId);
    }
    throw error;
  }
}

export async function importDeviceTransferIntoNewVault(snapshot, { user, profile } = {}) {
  const accountId = text(getBackendAccountId(user));
  const oldVaultId = text(getActiveLocalVaultId());
  if (!accountId || !oldVaultId) {
    throw new Error("CLARA could not identify this account's local vault safely.");
  }

  validateClaraCloudSnapshot(snapshot, accountId);
  const newVaultId = createLocalVaultId();
  const recoveryId = `device-transfer-recovery:${accountId}:${Date.now()}`;
  const recoverySnapshot = await buildClaraCloudVaultSnapshot({
    user,
    profile,
    includeDeviceOnly: true,
  });
  const transferPrepared = prepareCloudSnapshotForRestore(snapshot, {
    accountId,
    targetVaultId: newVaultId,
    includeDeviceOnly: true,
  });
  const recoveryPrepared = prepareCloudSnapshotForRestore(recoverySnapshot, {
    accountId,
    targetVaultId: oldVaultId,
    includeDeviceOnly: true,
  });
  const transferredKeys = Object.keys(storageEntries(transferPrepared));
  const previousMapping = getVaultMappingForAccount(accountId);

  await saveRecoveryRecord({
    id: recoveryId,
    accountId,
    oldVaultId,
    newVaultId,
    createdAt: new Date().toISOString(),
    recoverySnapshot,
    transferredKeys,
    status: "staging",
  });

  try {
    const restoreResult = await restoreClaraLocalDataFromFile(
      restoreFileLike(transferPrepared)
    );
    const restoreErrors = restoreResult?.indexedDB?.errors || [];
    if (restoreErrors.length > 0) {
      throw new Error(`Transfer validation failed: ${restoreErrors[0]}`);
    }

    const expectedRecords = expectedFinanceRecordCount(transferPrepared);
    const actualRecords = await actualFinanceRecordCount(newVaultId);
    if (actualRecords !== expectedRecords) {
      throw new Error(
        `Transfer validation failed. Expected ${expectedRecords} financial records but found ${actualRecords}.`
      );
    }

    switchAccountVault({
      accountId,
      accountEmail: user?.email || null,
      vaultId: newVaultId,
      previousMapping,
    });

    const metadata = {
      recoveryId,
      accountId,
      oldVaultId,
      newVaultId,
      createdAt: new Date().toISOString(),
      transferredKeys,
    };
    writeLastTransferMetadata(metadata);
    await saveRecoveryRecord({
      ...(await getRecoveryRecord(recoveryId)),
      status: "completed",
      completedAt: new Date().toISOString(),
    });

    return {
      oldVaultId,
      newVaultId,
      recoveryId,
      expectedRecords,
      actualRecords,
      restoreResult,
    };
  } catch (error) {
    try {
      await restorePreparedBackup(recoveryPrepared, { transferredKeys });
      await clearLocalUserPrivateData(newVaultId);
      switchAccountVault({
        accountId,
        accountEmail: user?.email || null,
        vaultId: oldVaultId,
        previousMapping: previousMapping || {
          vaultId: oldVaultId,
          accountEmail: user?.email || null,
        },
      });
      await saveRecoveryRecord({
        ...(await getRecoveryRecord(recoveryId)),
        status: "rolled_back_after_failure",
        failedAt: new Date().toISOString(),
        failureMessage: error?.message || "Transfer failed.",
      });
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    throw error;
  }
}

export async function rollbackLastDeviceTransfer({ user } = {}) {
  const metadata = readLastTransferMetadata();
  const accountId = text(getBackendAccountId(user));
  if (!metadata || text(metadata.accountId) !== accountId) {
    throw new Error("No protected CLARA transfer checkpoint is available for this account.");
  }

  const record = await getRecoveryRecord(metadata.recoveryId);
  if (!record?.recoverySnapshot) {
    throw new Error("The previous-device checkpoint could not be found.");
  }

  const previousMapping = getVaultMappingForAccount(accountId);
  const prepared = prepareCloudSnapshotForRestore(record.recoverySnapshot, {
    accountId,
    targetVaultId: record.oldVaultId,
    includeDeviceOnly: true,
  });
  await restorePreparedBackup(prepared, {
    transferredKeys: record.transferredKeys || metadata.transferredKeys || [],
  });
  switchAccountVault({
    accountId,
    accountEmail: user?.email || null,
    vaultId: record.oldVaultId,
    previousMapping,
  });
  await saveRecoveryRecord({
    ...record,
    status: "user_rolled_back",
    rolledBackAt: new Date().toISOString(),
  });
  window.localStorage.removeItem(LAST_TRANSFER_KEY);

  return {
    restoredVaultId: record.oldVaultId,
    retainedTransferredVaultId: record.newVaultId,
  };
}

export function hasLastDeviceTransferRecovery() {
  return Boolean(readLastTransferMetadata()?.recoveryId);
}
