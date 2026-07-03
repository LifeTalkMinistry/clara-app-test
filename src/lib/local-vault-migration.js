import {
  LOCAL_FINANCE_PRIVATE_STORES,
  LOCAL_FINANCE_STORES,
  openLocalFinanceDb,
} from "@/lib/localFinanceStore";

const MIGRATION_MARKER_KEY = "clara_local_vault_migration_v1";
const ACCESS_SNAPSHOT_LAST_KEY = "clara_access_snapshot_v2:last";
const ACTIVE_MEMORY_USER_KEY = "clara_active_memory_user_id";
const KNOWN_TEMPORARY_IDS = ["local-dev-user", "local-user"];

function getStorage() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("IndexedDB request failed during CLARA vault migration."));
  });
}

function transactionToPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () =>
      reject(transaction.error || new Error("CLARA vault migration transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error || new Error("CLARA vault migration transaction was aborted."));
  });
}

function addCandidate(list, value, source, priority) {
  const id = String(value || "").trim();
  if (!id || list.some((candidate) => candidate.id === id)) return;
  list.push({ id, source, priority });
}

async function summarizeVaults(db) {
  const counts = new Map();
  const latestUpdatedAt = new Map();
  const stores = LOCAL_FINANCE_PRIVATE_STORES.filter((name) =>
    db.objectStoreNames.contains(name)
  );

  if (!stores.length) return { counts, latestUpdatedAt };

  const transaction = db.transaction(stores, "readonly");
  const pending = stores.map(async (storeName) => {
    const records = await requestToPromise(transaction.objectStore(storeName).getAll());
    records.forEach((record) => {
      const id = String(record?.localUserId || "").trim();
      if (!id) return;
      counts.set(id, (counts.get(id) || 0) + 1);
      const updatedAt = Date.parse(record?.updatedAt || record?.createdAt || "") || 0;
      latestUpdatedAt.set(id, Math.max(latestUpdatedAt.get(id) || 0, updatedAt));
    });
  });

  await Promise.all(pending);
  await transactionToPromise(transaction);
  return { counts, latestUpdatedAt };
}

async function resolveLegacyVaultCandidate(db, targetLocalUserId) {
  const storage = getStorage();
  const candidates = [];
  const snapshot = safeParse(storage?.getItem(ACCESS_SNAPSHOT_LAST_KEY));

  addCandidate(candidates, snapshot?.userId, "last_access_snapshot_user_id", 1);
  addCandidate(candidates, snapshot?.email, "last_access_snapshot_email", 2);
  addCandidate(candidates, storage?.getItem(ACTIVE_MEMORY_USER_KEY), "active_memory_user", 3);
  KNOWN_TEMPORARY_IDS.forEach((id, index) =>
    addCandidate(candidates, id, `known_temporary_${id}`, 4 + index)
  );

  const { counts, latestUpdatedAt } = await summarizeVaults(db);
  [...counts.keys()]
    .sort((a, b) => (latestUpdatedAt.get(b) || 0) - (latestUpdatedAt.get(a) || 0))
    .forEach((id, index) => addCandidate(candidates, id, "most_recent_populated_vault", 10 + index));

  return (
    candidates
      .filter((candidate) => candidate.id !== targetLocalUserId)
      .filter((candidate) => (counts.get(candidate.id) || 0) > 0)
      .sort((a, b) => a.priority - b.priority)[0] || null
  );
}

export function getLocalVaultMigrationMarker() {
  return safeParse(getStorage()?.getItem(MIGRATION_MARKER_KEY));
}

export async function migrateLocalVaultOwnership(targetLocalUserId) {
  const targetId = String(targetLocalUserId || "").trim();
  if (!targetId) throw new Error("A target local vault ID is required.");

  const existingMarker = getLocalVaultMigrationMarker();
  if (existingMarker?.status === "completed" && existingMarker?.toUserId === targetId) {
    return {
      ...existingMarker,
      activeUserId: targetId,
      alreadyCompleted: true,
    };
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
  const candidate = await resolveLegacyVaultCandidate(db, targetId);

  if (!candidate) {
    const marker = {
      status: "completed",
      fromUserId: null,
      toUserId: targetId,
      migratedAt: new Date().toISOString(),
      recordCounts: {},
      reason: "no_legacy_vault",
    };
    getStorage()?.setItem(MIGRATION_MARKER_KEY, JSON.stringify(marker));
    return { ...marker, activeUserId: targetId };
  }

  const storeNames = [
    ...LOCAL_FINANCE_PRIVATE_STORES.filter((name) => db.objectStoreNames.contains(name)),
    ...(db.objectStoreNames.contains(LOCAL_FINANCE_STORES.metadata)
      ? [LOCAL_FINANCE_STORES.metadata]
      : []),
  ];
  const transaction = db.transaction(storeNames, "readwrite");
  const recordCounts = {};

  try {
    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      const records = await requestToPromise(store.getAll());
      let count = 0;

      for (const record of records) {
        if (String(record?.localUserId || "").trim() !== candidate.id) continue;
        await requestToPromise(
          store.put({
            ...record,
            localUserId: targetId,
          })
        );
        count += 1;
      }

      if (count > 0) recordCounts[storeName] = count;
    }

    await transactionToPromise(transaction);

    const marker = {
      status: "completed",
      fromUserId: candidate.id,
      toUserId: targetId,
      source: candidate.source,
      migratedAt: new Date().toISOString(),
      recordCounts,
    };
    getStorage()?.setItem(MIGRATION_MARKER_KEY, JSON.stringify(marker));
    console.info("[CLARA Vault Migration] migration completed", marker);
    return { ...marker, activeUserId: targetId };
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // The transaction may already be aborted.
    }

    console.error("[CLARA Vault Migration] migration failed; preserving legacy vault", {
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
