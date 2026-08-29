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
    transaction.onerror = () =>
      reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error || new Error("IndexedDB transaction aborted."));
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
    request.onerror = () =>
      reject(request.error || new Error("Unable to open transfer recovery storage."));
    request.onblocked = () =>
      reject(new Error("Close other CLARA tabs before transferring data."));
  });
}

async function saveRecoveryRecord(record) {
  const db = await openRecoveryDb();
  try {
    const transaction = db.transaction(RECOVERY_STORE, "readwrite");
    const completed = transactionToPromise(transaction);
    transaction.objectStore(RECOVERY_STORE).put(record);
    await completed;
  } finally {
    db.close();
  }
  return record;
}

async function getRecoveryRecord(id) {
  const db = await openRecoveryDb();
  try {
    const transaction = db.transaction(RECOVERY_STORE, "readonly");
    const completed = transactionToPromise(transaction);
    const value = await requestToPromise(
      transaction.objectStore(RECOVERY_STORE).get(id)
    );
    await completed;
    return value || null;
  } finally {
    db.close();
  }
}

function restoreFileLike(prepared) {
  return { text: async () => JSON.stringify(prepared) };
}

function storageEntries(prepared) {
  return prepared?.data?.localStorage || prepared?.raw?.localStorage || {};
}

function removeTransferredOnlyStorageKeys(transferredKeys = [], recoveryPrepared) {
  const recoveryKeys = new Set(Object.keys(storageEntries(recoveryPrepared)));
  transferredKeys.forEach((key) => {
    if (recoveryKeys.has(key)) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // The protected recovery restore below remains the source of truth.
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

function withoutNotificationDatabase(snapshot) {
  return {
    ...snapshot,
    data: {
      ...(snapshot?.data || {}),
      indexedDB: {
        ...(snapshot?.data?.indexedDB || {}),
        databases: (snapshot?.data?.indexedDB?.databases || []).filter(
          (database) => database?.name !== "clara_local_notifications"
        ),
      },
    },
  };
}

export function buildDeviceTransferSummary(snapshot) {
  const counts = countCloudSnapshotItems(snapshot);
  const preferences = preferenceRecords(snapshot);
  return {
    total: counts.total,
    budgets: storeCount(snapshot, "budgets"),
    wallets: storeCount(snapshot, "wallets"),
    walletTransactions: storeCount(snapshot, "wallet_transactions"),
    transfers: storeCount(snapshot, "transfers"),
    expenses: storeCount(snapshot, "expenses"),
    savingsGoals: storeCount(snapshot, "savings_goals"),
    emergencyFunds: storeCount(snapshot, "emergency_fund"),
    lifeProfiles: storeCount(snapshot, "life_profile"),
    privatePreferences: storeCount(snapshot, "private_preferences"),
    moneySchedule: Object.keys(snapshot?.data?.localStorage || {}).filter(
      (key) =>
        key.startsWith("clara_schedule_events_v2") ||
        key.startsWith("clara_money_schedule_routine_v1")
    ).length,
    debts: preferences.filter((record) =>
      /debt|obligation/i.test(
        `${record?.recordKind || ""} ${record?.kind || ""} ${record?.id || ""}`
      )
    ).length,
    streakDays: streakDaysFromSnapshot(snapshot),
  };
}

export async function createDeviceTransferSnapshot({ user, profile } = {}) {
  const fullSnapshot = await buildClaraCloudVaultSnapshot({
    user,
    profile,
    includeDeviceOnly: true,
    requireCompleteExport: true,
  });
  const snapshot = withoutNotificationDatabase(fullSnapshot);
  return {
    snapshot,
    summary: buildDeviceTransferSummary(snapshot),
  };
}

function rewriteRecordReferences(value, idMap, orderedIds) {
  if (typeof value === "string") {
    if (idMap.has(value)) return idMap.get(value);
    return orderedIds.reduce(
      (result, oldId) => result.split(oldId).join(idMap.get(oldId)),
      value
    );
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteRecordReferences(item, idMap, orderedIds));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        rewriteRecordReferences(item, idMap, orderedIds),
      ])
    );
  }
  return value;
}

function namespaceTransferredFinanceRecordIds(prepared, targetVaultId) {
  const financeDatabase = getFinanceDatabase(prepared);
  if (!financeDatabase) return prepared;

  const records = Object.entries(financeDatabase.stores || {}).flatMap(
    ([storeName, store]) =>
      storeName === "metadata" ? [] : normalizeStoreRecords(store)
  );
  const idMap = new Map(
    records
      .map((record) => text(record?.id))
      .filter(Boolean)
      .map((oldId) => [oldId, `transfer:${targetVaultId}:${oldId}`])
  );
  const orderedIds = [...idMap.keys()].sort(
    (left, right) => right.length - left.length
  );

  return {
    ...prepared,
    data: {
      ...prepared.data,
      indexedDB: {
        ...prepared.data.indexedDB,
        databases: (prepared.data.indexedDB.databases || []).map((database) => {
          if (database.name !== "clara_local_finance") return database;
          return {
            ...database,
            stores: Object.fromEntries(
              Object.entries(database.stores || {}).map(([storeName, store]) => {
                const rewritten = normalizeStoreRecords(store).map((record) =>
                  rewriteRecordReferences(record, idMap, orderedIds)
                );
                return [storeName, { ...store, records: rewritten, count: rewritten.length }];
              })
            ),
          };
        }),
      },
    },
  };
}

function indexedDbOnly(prepared) {
  return {
    ...prepared,
    raw: { localStorage: {}, sessionStorage: {} },
    data: {
      ...prepared.data,
      localStorage: {},
      sessionStorage: {},
    },
  };
}

function storageOnly(prepared) {
  return {
    ...prepared,
    data: {
      ...prepared.data,
      indexedDB: { supported: true, databases: [], errors: [] },
    },
  };
}

function expectedFinanceRecordCount(prepared) {
  const database = getFinanceDatabase(prepared);
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

function stableTransferValue(value) {
  if (Array.isArray(value)) return value.map(stableTransferValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableTransferValue(value[key])])
    );
  }
  return value;
}

function stableTransferJson(value) {
  return JSON.stringify(stableTransferValue(value));
}

async function assertFinanceTransferIntegrity(prepared, localVaultId) {
  const database = getFinanceDatabase(prepared);
  for (const storeName of LOCAL_FINANCE_PRIVATE_STORES) {
    const expected = normalizeStoreRecords(database?.stores?.[storeName]);
    const actual = await getLocalRecordsByUser(storeName, {
      localUserId: localVaultId,
      includeDeleted: true,
    });
    const actualRecords = Array.isArray(actual) ? actual : [];

    if (actualRecords.length !== expected.length) {
      throw new Error(
        `Transfer validation failed in ${storeName}. Expected ${expected.length} records but found ${actualRecords.length}.`
      );
    }

    const actualById = new Map(actualRecords.map((record) => [text(record?.id), record]));
    for (const expectedRecord of expected) {
      const recordId = text(expectedRecord?.id);
      const actualRecord = actualById.get(recordId);
      if (!recordId || !actualRecord) {
        throw new Error(`Transfer validation failed in ${storeName}: a record is missing.`);
      }
      if (stableTransferJson(actualRecord) !== stableTransferJson(expectedRecord)) {
        throw new Error(
          `Transfer validation failed in ${storeName}: record ${recordId} changed during transfer.`
        );
      }
    }
  }
  return true;
}

function storageValueMatches(actual, expected) {
  if (typeof expected === "string") return actual === expected;
  if (actual == null) return false;
  try {
    return stableTransferJson(JSON.parse(actual)) === stableTransferJson(expected);
  } catch {
    return false;
  }
}

function verifyTransferredStorage(prepared) {
  const entries = storageEntries(prepared);
  for (const [key, expected] of Object.entries(entries)) {
    const actual = window.localStorage.getItem(key);
    if (!storageValueMatches(actual, expected)) {
      throw new Error(`Transfer validation failed while verifying ${key}.`);
    }
  }
  return Object.keys(entries).length;
}

function restoreErrors(result) {
  return result?.errors || result?.summary?.restoreErrors || [];
}

function storageRestoreSkipped(result) {
  return (
    (result?.skipped?.localStorage?.length || 0) +
    (result?.skipped?.sessionStorage?.length || 0)
  );
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
  const basePrepared = prepareCloudSnapshotForRestore(snapshot, {
    accountId,
    targetVaultId: newVaultId,
    includeDeviceOnly: true,
  });
  const transferPrepared = namespaceTransferredFinanceRecordIds(
    basePrepared,
    newVaultId
  );
  const recoveryPrepared = prepareCloudSnapshotForRestore(recoverySnapshot, {
    accountId,
    targetVaultId: oldVaultId,
    includeDeviceOnly: true,
  });
  const transferredKeys = Object.keys(storageEntries(transferPrepared));
  const previousMapping = getVaultMappingForAccount(accountId);
  let vaultSwitched = false;
  let storageWriteStarted = false;

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
    const staged = await restoreClaraLocalDataFromFile(
      restoreFileLike(indexedDbOnly(transferPrepared))
    );
    const stagedErrors = restoreErrors(staged);
    if (stagedErrors.length > 0) {
      throw new Error(`Transfer validation failed: ${stagedErrors[0]}`);
    }

    const expectedRecords = expectedFinanceRecordCount(transferPrepared);
    const actualRecords = await actualFinanceRecordCount(newVaultId);
    if (actualRecords !== expectedRecords) {
      throw new Error(
        `Transfer validation failed. Expected ${expectedRecords} financial records but found ${actualRecords}.`
      );
    }
    await assertFinanceTransferIntegrity(transferPrepared, newVaultId);

    switchAccountVault({
      accountId,
      accountEmail: user?.email || null,
      vaultId: newVaultId,
      previousMapping,
    });
    vaultSwitched = true;

    storageWriteStarted = true;
    const storageResult = await restoreClaraLocalDataFromFile(
      restoreFileLike(storageOnly(transferPrepared))
    );
    const finalErrors = restoreErrors(storageResult);
    if (finalErrors.length > 0 || storageRestoreSkipped(storageResult) > 0) {
      throw new Error(
        finalErrors[0] || "Transfer validation failed while applying device settings."
      );
    }
    const verifiedStorageKeys = verifyTransferredStorage(transferPrepared);

    const metadata = {
      recoveryId,
      accountId,
      oldVaultId,
      newVaultId,
      createdAt: new Date().toISOString(),
      transferredKeys,
      verifiedStorageKeys,
      verifiedFinancialRecords: actualRecords,
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
      verifiedStorageKeys,
      restoreResult: storageResult,
    };
  } catch (error) {
    try {
      if (storageWriteStarted) {
        await restorePreparedBackup(recoveryPrepared, { transferredKeys });
      }
      await clearLocalUserPrivateData(newVaultId);
      if (vaultSwitched) {
        switchAccountVault({
          accountId,
          accountEmail: user?.email || null,
          vaultId: oldVaultId,
          previousMapping: previousMapping || {
            vaultId: oldVaultId,
            accountEmail: user?.email || null,
          },
        });
      }
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
