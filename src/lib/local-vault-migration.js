import {
  LOCAL_FINANCE_PRIVATE_STORES,
  LOCAL_FINANCE_STORES,
  openLocalFinanceDb,
} from "./localFinanceStore.js";

const MIGRATION_MARKER_KEY = "clara_local_vault_migration_v2";
const KNOWN_TEMPORARY_IDS = ["local-dev-user", "local-user"];

function storage() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

function parse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function transactionResult(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () =>
      reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error || new Error("IndexedDB transaction aborted."));
  });
}

function markerKey(sourceId, targetId) {
  return `${MIGRATION_MARKER_KEY}:${sourceId}->${targetId}`;
}

export async function summarizeVaults(db) {
  const counts = new Map();
  const updatedAt = new Map();
  const stores = LOCAL_FINANCE_PRIVATE_STORES.filter((name) =>
    db.objectStoreNames.contains(name)
  );
  if (!stores.length) return { counts, updatedAt };

  const transaction = db.transaction(stores, "readonly");
  const transactionDone = transactionResult(transaction);
  const recordGroups = await Promise.all(
    stores.map((name) => requestResult(transaction.objectStore(name).getAll()))
  );
  await transactionDone;

  for (const records of recordGroups) {
    for (const record of records || []) {
      const id = String(record?.localUserId || "").trim();
      if (!id) continue;
      counts.set(id, (counts.get(id) || 0) + 1);
      const timestamp = Date.parse(record?.updatedAt || record?.createdAt || "") || 0;
      updatedAt.set(id, Math.max(updatedAt.get(id) || 0, timestamp));
    }
  }
  return { counts, updatedAt };
}

async function readVaultMetadata(db, vaultId) {
  if (!db.objectStoreNames.contains(LOCAL_FINANCE_STORES.metadata)) return null;
  const transaction = db.transaction(LOCAL_FINANCE_STORES.metadata, "readonly");
  const record = await requestResult(
    transaction.objectStore(LOCAL_FINANCE_STORES.metadata).get(`metadata:${vaultId}`)
  );
  return record?.metadata || null;
}

async function resolveLegacyCandidate(db, targetId) {
  const { counts } = await summarizeVaults(db);
  for (const id of KNOWN_TEMPORARY_IDS) {
    if (id === targetId || (counts.get(id) || 0) === 0) continue;
    const metadata = await readVaultMetadata(db, id);
    if (String(metadata?.accountUserId || "").trim()) continue;
    if (metadata?.linkStatus === "linked") continue;
    return { id, source: `known_temporary_${id}` };
  }
  return null;
}

export function getLocalVaultMigrationMarker(targetId = "", sourceId = "") {
  const target = String(targetId || "").trim();
  const source = String(sourceId || "").trim();
  if (target && source) return parse(storage()?.getItem(markerKey(source, target)));
  return parse(storage()?.getItem(MIGRATION_MARKER_KEY));
}

function migrateTransaction(db, storeNames, fromUserId, toUserId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, "readwrite");
    const recordCounts = {};
    let failed = false;

    const fail = (error) => {
      if (failed) return;
      failed = true;
      try {
        transaction.abort();
      } catch {
        // The transaction may already be aborting.
      }
      reject(error || new Error("CLARA vault migration failed."));
    };

    transaction.oncomplete = () => {
      if (!failed) resolve(recordCounts);
    };
    transaction.onerror = () =>
      fail(transaction.error || new Error("CLARA vault migration failed."));
    transaction.onabort = () =>
      fail(transaction.error || new Error("CLARA vault migration aborted."));

    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      const readRequest = store.getAll();
      readRequest.onerror = () =>
        fail(readRequest.error || new Error(`Could not read ${storeName}.`));
      readRequest.onsuccess = () => {
        let count = 0;
        for (const record of readRequest.result || []) {
          if (String(record?.localUserId || "").trim() !== fromUserId) continue;
          const writeRequest = store.put({ ...record, localUserId: toUserId });
          writeRequest.onerror = () =>
            fail(writeRequest.error || new Error(`Could not migrate a record in ${storeName}.`));
          count += 1;
        }
        if (count > 0) recordCounts[storeName] = count;
      };
    }
  });
}

export async function migrateLocalVaultOwnership(targetLocalUserId) {
  const targetId = String(targetLocalUserId || "").trim();
  if (!targetId) throw new Error("A target local vault ID is required.");

  if (typeof indexedDB === "undefined") {
    return {
      status: "skipped",
      reason: "indexeddb_unavailable",
      activeUserId: targetId,
      recordCounts: {},
    };
  }

  const db = await openLocalFinanceDb();
  const candidate = await resolveLegacyCandidate(db, targetId);
  if (!candidate) {
    return {
      status: "completed",
      fromUserId: null,
      toUserId: targetId,
      activeUserId: targetId,
      recordCounts: {},
      reason: "no_explicit_legacy_vault",
    };
  }

  const scopedMarkerKey = markerKey(candidate.id, targetId);
  const existingMarker = parse(storage()?.getItem(scopedMarkerKey));
  if (existingMarker?.status === "completed") {
    return { ...existingMarker, activeUserId: targetId, alreadyCompleted: true };
  }

  const sourceMetadata = await readVaultMetadata(db, candidate.id);
  if (String(sourceMetadata?.accountUserId || "").trim() || sourceMetadata?.linkStatus === "linked") {
    return {
      status: "skipped",
      reason: "legacy_source_is_account_linked",
      fromUserId: candidate.id,
      toUserId: targetId,
      activeUserId: targetId,
      recordCounts: {},
    };
  }

  const storeNames = [
    ...LOCAL_FINANCE_PRIVATE_STORES.filter((name) => db.objectStoreNames.contains(name)),
    ...(db.objectStoreNames.contains(LOCAL_FINANCE_STORES.metadata)
      ? [LOCAL_FINANCE_STORES.metadata]
      : []),
  ];

  try {
    const recordCounts = await migrateTransaction(db, storeNames, candidate.id, targetId);
    const completed = {
      status: "completed",
      fromUserId: candidate.id,
      toUserId: targetId,
      source: candidate.source,
      migratedAt: new Date().toISOString(),
      recordCounts,
    };
    storage()?.setItem(scopedMarkerKey, JSON.stringify(completed));
    console.info("[CLARA Vault Migration] explicit legacy migration completed", completed);
    return { ...completed, activeUserId: targetId };
  } catch (error) {
    console.error("[CLARA Vault Migration] migration failed; legacy data preserved", {
      fromUserId: candidate.id,
      toUserId: targetId,
      message: error?.message || String(error),
    });
    return {
      status: "failed",
      fromUserId: candidate.id,
      toUserId: targetId,
      activeUserId: targetId,
      recordCounts: {},
      error,
    };
  }
}

export { MIGRATION_MARKER_KEY };
