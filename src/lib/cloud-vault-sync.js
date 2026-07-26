import {
  deleteCloudVaultSnapshot,
  fetchCloudVaultStatus,
  setCloudVaultStorageMode,
  uploadCloudVaultSnapshot,
} from "./cloud-vault-client";
import { getBackendAccountId } from "./clara-account-identity";
import {
  buildClaraCloudVaultSnapshot,
  getClaraSyncDeviceId,
  mergeClaraCloudSnapshots,
  normalizeAuthenticatedCloudSnapshot,
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

function normalizeAuthenticatedRemote(remote, user) {
  if (!remote?.snapshot) return remote;
  const accountId = getBackendAccountId(user);
  return {
    ...remote,
    snapshot: normalizeAuthenticatedCloudSnapshot(remote.snapshot, accountId),
  };
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

    const latestRemote = normalizeAuthenticatedRemote(
      await fetchCloudVaultStatus({ includeSnapshot: true }),
      user
    );
    if (!latestRemote?.snapshot) throw error;
    const latestLocal = await buildClaraCloudVaultSnapshot({ user, profile });
    const latestRemoteForLocal = rebaseSnapshotVault(
      latestRemote.snapshot,
      latestLocal.source_vault_id
    );
    const merged = mergeClaraCloudSnapshots(latestLocal, latestRemoteForLocal);

    suppressSyncEventsUntil = Date.now() + 3_000;
    await restoreClaraCloudSnapshot(merged, { user, replaceExisting: true });

    return uploadCloudVaultSnapshot({
      snapshot: merged,
      baseRevision: Number(latestRemote.revision || 0),
      deviceId: getClaraSyncDeviceId(),
    });
  }
}

async function uploadAuthoritativeWithConflictRecovery({ user, snapshot, baseRevision }) {
  try {
    return await uploadCloudVaultSnapshot({
      snapshot,
      baseRevision,
      deviceId: getClaraSyncDeviceId(),
    });
  } catch (error) {
    if (error?.code !== "CLOUD_VAULT_REVISION_CONFLICT") throw error;

    const latestRemote = normalizeAuthenticatedRemote(
      await fetchCloudVaultStatus({ includeSnapshot: true }),
      user
    );

    return uploadCloudVaultSnapshot({
      snapshot,
      baseRevision: Number(latestRemote?.revision || 0),
      deviceId: getClaraSyncDeviceId(),
    });
  }
}

async function restoreRemoteAsSource({ remote, localSnapshot, user, accountId }) {
  if (!remote?.snapshot) {
    throw new Error("There is no protected Online Sync copy to restore.");
  }

  const remoteSnapshotForLocal = rebaseSnapshotVault(
    remote.snapshot,
    localSnapshot.source_vault_id
  );

  suppressSyncEventsUntil = Date.now() + 3_000;
  await restoreClaraCloudSnapshot(remoteSnapshotForLocal, {
    user,
    replaceExisting: true,
  });

  const result = {
    ...remote,
    state: "synced",
    direction: "downloaded",
    sourceDeviceId: remote.sourceDeviceId || remote.snapshot?.source_device_id || null,
  };
  dispatchSyncStatus({ accountId, ...result });
  return result;
}

async function performSync({
  user,
  profile,
  preferRemote = false,
  authoritativeLocal = false,
} = {}) {
  const accountId = getBackendAccountId(user);
  if (!accountId) return { storageMode: CLARA_STORAGE_MODES.LOCAL_ONLY };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { storageMode: getClaraStorageMode(accountId), offline: true };
  }

  dispatchSyncStatus({ accountId, state: "syncing" });
  const remote = normalizeAuthenticatedRemote(
    await fetchCloudVaultStatus({ includeSnapshot: true }),
    user
  );
  const mode = saveClaraStorageMode(accountId, remote.storageMode);

  if (mode !== CLARA_STORAGE_MODES.ONLINE_SYNC) {
    const result = { ...remote, storageMode: mode, state: "local_only" };
    dispatchSyncStatus({ accountId, ...result });
    return result;
  }

  const localSnapshot = await buildClaraCloudVaultSnapshot({ user, profile });

  if (!remote.snapshot) {
    const uploaded = authoritativeLocal
      ? await uploadAuthoritativeWithConflictRecovery({
          user,
          snapshot: localSnapshot,
          baseRevision: Number(remote.revision || 0),
        })
      : await uploadWithConflictRecovery({
          user,
          profile,
          snapshot: localSnapshot,
          baseRevision: Number(remote.revision || 0),
        });
    const result = {
      ...uploaded,
      state: "synced",
      direction: authoritativeLocal ? "uploaded_authoritative" : "uploaded",
    };
    dispatchSyncStatus({ accountId, ...result });
    return result;
  }

  if (authoritativeLocal) {
    const uploaded = await uploadAuthoritativeWithConflictRecovery({
      user,
      snapshot: localSnapshot,
      baseRevision: Number(remote.revision || 0),
    });
    const result = {
      ...uploaded,
      state: "synced",
      direction: "uploaded_authoritative",
    };
    dispatchSyncStatus({ accountId, ...result });
    return result;
  }

  if (preferRemote) {
    return restoreRemoteAsSource({ remote, localSnapshot, user, accountId });
  }

  const remoteSnapshotForLocal = rebaseSnapshotVault(
    remote.snapshot,
    localSnapshot.source_vault_id
  );

  if (cloudSnapshotsMatch(localSnapshot, remoteSnapshotForLocal)) {
    const result = { ...remote, state: "synced", direction: "unchanged" };
    dispatchSyncStatus({ accountId, ...result });
    return result;
  }

  const merged = mergeClaraCloudSnapshots(remoteSnapshotForLocal, localSnapshot);

  suppressSyncEventsUntil = Date.now() + 3_000;
  await restoreClaraCloudSnapshot(merged, { user, replaceExisting: true });
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
        accountId: getBackendAccountId(context.user),
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

export async function restoreClaraCloudVaultFromServer({ user, profile } = {}) {
  return syncClaraCloudVault({
    user,
    profile,
    force: true,
    preferRemote: true,
  });
}

export async function enableClaraOnlineSync({ user, profile } = {}) {
  const accountId = getBackendAccountId(user);
  if (!accountId) throw new Error("Sign in before enabling Online Sync.");
  await setCloudVaultStorageMode(CLARA_STORAGE_MODES.ONLINE_SYNC);
  saveClaraStorageMode(accountId, CLARA_STORAGE_MODES.ONLINE_SYNC);
  return syncClaraCloudVault({ user, profile, force: true, preferRemote: true });
}

export async function enableClaraLocalOnly({ user } = {}) {
  const accountId = getBackendAccountId(user);
  if (!accountId) throw new Error("Sign in before changing CLARA storage mode.");
  const result = await deleteCloudVaultSnapshot();
  saveClaraStorageMode(accountId, CLARA_STORAGE_MODES.LOCAL_ONLY);
  dispatchSyncStatus({ accountId, ...result, state: "local_only" });
  return result;
}

export async function refreshClaraStorageMode(user) {
  const accountId = getBackendAccountId(user);
  if (!accountId) return CLARA_STORAGE_MODES.LOCAL_ONLY;
  const status = await fetchCloudVaultStatus();
  return saveClaraStorageMode(accountId, status.storageMode);
}
