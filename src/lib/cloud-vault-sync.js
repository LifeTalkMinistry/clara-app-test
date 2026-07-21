import {
  deleteCloudVaultSnapshot,
  fetchCloudVaultStatus,
  setCloudVaultStorageMode,
  uploadCloudVaultSnapshot,
} from "./cloud-vault-client";
import {
  buildClaraCloudVaultSnapshot,
  getClaraSyncDeviceId,
  mergeClaraCloudSnapshots,
  restoreClaraCloudSnapshot,
} from "./cloud-vault-snapshot";
import {
  CLARA_STORAGE_MODES,
  getClaraStorageMode,
  saveClaraStorageMode,
} from "./clara-storage-mode";

export const CLARA_CLOUD_SYNC_STATUS_EVENT = "clara:cloud-sync-status";

let activeSyncPromise = null;
let suppressSyncEventsUntil = 0;

function dispatchSyncStatus(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CLARA_CLOUD_SYNC_STATUS_EVENT, { detail })
  );
}

function normalizeSnapshotForFingerprint(snapshot) {
  const sourceVaultId = String(snapshot?.source_vault_id || "");
  const normalizeValue = (value) => {
    if (typeof value === "string") {
      return sourceVaultId ? value.split(sourceVaultId).join("__vault__") : value;
    }
    if (Array.isArray(value)) return value.map(normalizeValue);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !["created_at", "source_device_id", "source_vault_id"].includes(key))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, normalizeValue(item)])
      );
    }
    return value;
  };
  return JSON.stringify(normalizeValue(snapshot));
}

export function rebaseSnapshotVault(snapshot, targetVaultId) {
  const sourceVaultId = String(snapshot?.source_vault_id || "").trim();
  const target = String(targetVaultId || "").trim();
  if (!snapshot || !sourceVaultId || !target || sourceVaultId === target) {
    return snapshot;
  }

  const rewrite = (value) => {
    if (typeof value === "string") {
      return value.split(sourceVaultId).join(target);
    }
    if (Array.isArray(value)) return value.map(rewrite);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key.split(sourceVaultId).join(target),
          rewrite(item),
        ])
      );
    }
    return value;
  };

  const rebased = rewrite(snapshot);
  return {
    ...rebased,
    source_vault_id: target,
  };
}

export function cloudSnapshotsMatch(first, second) {
  if (!first || !second) return false;
  return normalizeSnapshotForFingerprint(first) === normalizeSnapshotForFingerprint(second);
}

async function uploadWithConflictRecovery({ user, profile, snapshot, baseRevision }) {
  try {
    return await uploadCloudVaultSnapshot({
      snapshot,
      baseRevision,
      deviceId: getClaraSyncDeviceId(),
    });
  } catch (error) {
    if (error?.code !== "CLOUD_VAULT_REVISION_CONFLICT") throw error;

    const latestRemote = await fetchCloudVaultStatus({ includeSnapshot: true });
    if (!latestRemote?.snapshot) throw error;
    const latestLocal = await buildClaraCloudVaultSnapshot({ user, profile });
    const latestRemoteForLocal = rebaseSnapshotVault(
      latestRemote.snapshot,
      latestLocal.source_vault_id
    );
    const merged = mergeClaraCloudSnapshots(latestLocal, latestRemoteForLocal);

    suppressSyncEventsUntil = Date.now() + 3_000;
    await restoreClaraCloudSnapshot(merged, { user });

    return uploadCloudVaultSnapshot({
      snapshot: merged,
      baseRevision: Number(latestRemote.revision || 0),
      deviceId: getClaraSyncDeviceId(),
    });
  }
}

async function performSync({ user, profile, preferRemote = false } = {}) {
  const accountId = String(user?.id || "").trim();
  if (!accountId) return { storageMode: CLARA_STORAGE_MODES.LOCAL_ONLY };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { storageMode: getClaraStorageMode(accountId), offline: true };
  }

  dispatchSyncStatus({ accountId, state: "syncing" });
  const remote = await fetchCloudVaultStatus({ includeSnapshot: true });
  const mode = saveClaraStorageMode(accountId, remote.storageMode);

  if (mode !== CLARA_STORAGE_MODES.ONLINE_SYNC) {
    const result = { ...remote, storageMode: mode, state: "local_only" };
    dispatchSyncStatus({ accountId, ...result });
    return result;
  }

  const localSnapshot = await buildClaraCloudVaultSnapshot({ user, profile });

  if (!remote.snapshot) {
    const uploaded = await uploadWithConflictRecovery({
      user,
      profile,
      snapshot: localSnapshot,
      baseRevision: Number(remote.revision || 0),
    });
    const result = { ...uploaded, state: "synced", direction: "uploaded" };
    dispatchSyncStatus({ accountId, ...result });
    return result;
  }

  const remoteSnapshotForLocal = rebaseSnapshotVault(
    remote.snapshot,
    localSnapshot.source_vault_id
  );

  if (cloudSnapshotsMatch(localSnapshot, remoteSnapshotForLocal) && !preferRemote) {
    const result = { ...remote, state: "synced", direction: "unchanged" };
    dispatchSyncStatus({ accountId, ...result });
    return result;
  }

  const merged = preferRemote
    ? mergeClaraCloudSnapshots(localSnapshot, remoteSnapshotForLocal)
    : mergeClaraCloudSnapshots(remoteSnapshotForLocal, localSnapshot);

  suppressSyncEventsUntil = Date.now() + 3_000;
  await restoreClaraCloudSnapshot(merged, { user });
  const uploaded = await uploadWithConflictRecovery({
    user,
    profile,
    snapshot: merged,
    baseRevision: Number(remote.revision || 0),
  });
  const result = { ...uploaded, state: "synced", direction: "merged" };
  dispatchSyncStatus({ accountId, ...result });
  return result;
}

export function syncClaraCloudVault(context = {}) {
  if (Date.now() < suppressSyncEventsUntil && !context.force) {
    return Promise.resolve({ suppressed: true });
  }
  if (activeSyncPromise) return activeSyncPromise;

  activeSyncPromise = performSync(context)
    .catch((error) => {
      dispatchSyncStatus({
        accountId: String(context.user?.id || ""),
        state: "error",
        error: error?.message || "Online Sync failed.",
        code: error?.code || null,
      });
      throw error;
    })
    .finally(() => {
      activeSyncPromise = null;
    });

  return activeSyncPromise;
}

export async function enableClaraOnlineSync({ user, profile } = {}) {
  const accountId = String(user?.id || "").trim();
  if (!accountId) throw new Error("Sign in before enabling Online Sync.");
  await setCloudVaultStorageMode(CLARA_STORAGE_MODES.ONLINE_SYNC);
  saveClaraStorageMode(accountId, CLARA_STORAGE_MODES.ONLINE_SYNC);
  return syncClaraCloudVault({ user, profile, force: true, preferRemote: true });
}

export async function enableClaraLocalOnly({ user } = {}) {
  const accountId = String(user?.id || "").trim();
  if (!accountId) throw new Error("Sign in before changing CLARA storage mode.");
  const result = await deleteCloudVaultSnapshot();
  saveClaraStorageMode(accountId, CLARA_STORAGE_MODES.LOCAL_ONLY);
  dispatchSyncStatus({ accountId, ...result, state: "local_only" });
  return result;
}

export async function refreshClaraStorageMode(user) {
  const accountId = String(user?.id || "").trim();
  if (!accountId) return CLARA_STORAGE_MODES.LOCAL_ONLY;
  const status = await fetchCloudVaultStatus();
  return saveClaraStorageMode(accountId, status.storageMode);
}
