import {
  LOCAL_FINANCE_PRIVATE_STORES,
  LOCAL_FINANCE_STORES,
  openLocalFinanceDb,
} from "@/lib/localFinanceStore";

const MIGRATION_MARKER_KEY = "clara_local_vault_migration_v1";
const ACCESS_SNAPSHOT_LAST_KEY = "clara_access_snapshot_v2:last";
const ACTIVE_MEMORY_USER_KEY = "clara_active_memory_user_id";
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
    request.onerror = () =>
      reject(request.error || new Error("IndexedDB request failed."));
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

function addCandidate(candidates, value, source, priority) {
  const id = String(value || "").trim();
  if (!id || candidates.some((candidate) => candidate.id === id)) return;
  candidates.push({ id, source, priority });
}

async function summarizeVaults(db) {
  const counts = new Map();
  const updatedAt = new Map();
  const stores = LOCAL_FINANCE_PRIVATE_STORES.filter((name) =>
    db.objectStoreNames.contains(name)
  );
  if (!stores.length) return { counts, updatedAt };

  const transaction = db.transaction(stores, "readonly");
  const requests = stores.map((name) =>
    requestResult(transaction.objectStore(name).getAll())
  );
  const recordGroups = await Promise.all(requests);
  await transactionResult(transaction);

  for (const records of recordGroups) {
    for (const record of records) {
      const id = String(record?.localUserId || "").trim();
      if (!id) continue;
      counts.set(id, (counts.get(id) || 0) + 1);
      const timestamp =
        Date.parse(record?.updatedAt || record?.createdAt || "") || 0;
      updatedAt.set(id, Math.max(updatedAt.get(id) || 0, timestamp));
    }
  }
  return { counts, updatedAt };
}

async function resolveLegacyCandidate(db, targetId) {
  const candidates = [];
  const snapshot = parse(storage()?.getItem(ACCESS_SNAPSHOT_LAST_KEY));

  addCandidate(candidates, snapshot?.userId, "last_access_snapshot_user_id", 1);
  addCandidate(candidates, snapshot?.email, "last_access_snapshot_email", 2);
  addCandidate(
    candidates,
    storage()?.getItem(ACTIVE_MEMORY_USER_KEY),
    "active_memory_user",
    3
  );
  KNOWN_TEMPORARY_IDS.forEach((id, index) =>
    addCandidate(candidates, id, `known_temporary_${id}`, 4 + index)
  );

  const { counts, updatedAt } = await summarizeVaults(db);
  [...counts.keys()]
    .sort((a, b) => (updatedAt.get(b) || 0) - (updatedAt.get(a) || 0))
    .forEach((id, index) =>
      addCandidate(candidates, id, "most_recent_populated_vault", 10 + index)
    );

  return (
    candidates
      .filter((candidate) => candidate.id !== targetId)
      .filter((candidate) => (counts.get(candidate.id) || 0) > 0)
      .sort((a, b) => a.priority - b.priority)[0] || null
  );
}

export function getLocalVaultMigrationMarker() {
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
        // It may already be aborting.
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
            fail(
              writeRequest.error ||
                new Error(`Could not migrate a record in ${storeName}.`)
            );
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

  const marker = getLocalVaultMigrationMarker();
  if (marker?.status === "completed" && marker?.toUserId === targetId) {
    return { ...marker, activeUserId: targetId, alreadyCompleted: true };
  }

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
    const completed = {
      status: "completed",
      fromUserId: null,
      toUserId: targetId,
      migratedAt: new Date().toISOString(),
      recordCounts: {},
      reason: "no_legacy_vault",
    };
    storage()?.setItem(MIGRATION_MARKER_KEY, JSON.stringify(completed));
    return { ...completed, activeUserId: targetId };
  }

  const storeNames = [
    ...LOCAL_FINANCE_PRIVATE_STORES.filter((name) =>
      db.objectStoreNames.contains(name)
    ),
    ...(db.objectStoreNames.contains(LOCAL_FINANCE_STORES.metadata)
      ? [LOCAL_FINANCE_STORES.metadata]
      : []),
  ];

  try {
    const recordCounts = await migrateTransaction(
      db,
      storeNames,
      candidate.id,
      targetId
    );
    const completed = {
      status: "completed",
      fromUserId: candidate.id,
      toUserId: targetId,
      source: candidate.source,
      migratedAt: new Date().toISOString(),
      recordCounts,
    };
    storage()?.setItem(MIGRATION_MARKER_KEY, JSON.stringify(completed));
    console.info("[CLARA Vault Migration] migration completed", completed);
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
      activeUserId: candidate.id,
      recordCounts: {},
      error,
    };
  }
}

export { MIGRATION_MARKER_KEY };
