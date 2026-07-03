import { LOCAL_FINANCE_PRIVATE_STORES, getLocalRecordsByUser } from "../localFinanceStore.js";
import { LEGACY_LOCAL_VAULT_ID, ensureActiveLocalVaultId, getActiveLocalVaultId } from "../localVaultIdentity.js";
import { getActiveVaultMetadata, markVaultLinked, markVaultLinkFailed, markVaultLinking } from "../localVaultMetadata.js";

const clean = (value) => String(value ?? "").trim();

function linkError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function readLocalVaultSnapshot(vaultId) {
  const id = clean(vaultId);
  if (!id) throw linkError("A local vault is required.", "VAULT_MISSING");

  const entries = await Promise.all(
    LOCAL_FINANCE_PRIVATE_STORES.map(async (storeName) => {
      const rows = await getLocalRecordsByUser(storeName, {
        localUserId: id,
        includeDeleted: true,
      });
      const records = Array.isArray(rows) ? rows : [];
      const activeIds = records.filter((row) => !row?.deletedAt && !row?.deleted_at).map((row) => clean(row?.id)).filter(Boolean).sort();
      const deletedIds = records.filter((row) => row?.deletedAt || row?.deleted_at).map((row) => clean(row?.id)).filter(Boolean).sort();
      return [storeName, { active: activeIds.length, deleted: deletedIds.length, activeIds, deletedIds }];
    })
  );

  return Object.fromEntries(entries);
}

export function snapshotsMatch(before = {}, after = {}) {
  return JSON.stringify(before) === JSON.stringify(after);
}

const defaultAdapters = {
  getActiveVaultId: () => getActiveLocalVaultId() || ensureActiveLocalVaultId(),
  getMetadata: getActiveVaultMetadata,
  markLinking: markVaultLinking,
  markLinked: markVaultLinked,
  markFailed: markVaultLinkFailed,
  readSnapshot: readLocalVaultSnapshot,
  dispatchLinked(detail) {
    if (typeof window === "undefined") return;
    ["clara:local-vault-link-updated", "clara-finance-updated", "clara:finance-data-updated"].forEach((name) => {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    });
  },
};

export async function linkLocalVaultToAccountWithAdapters(input = {}, adapters = defaultAdapters) {
  const accountUserId = clean(input.accountUserId);
  const accountEmail = clean(input.accountEmail).toLowerCase();
  if (!accountUserId || accountUserId === LEGACY_LOCAL_VAULT_ID) {
    throw linkError("A genuine authenticated CLARA account is required.", "INVALID_ACCOUNT_ID");
  }

  const vaultId = clean(await adapters.getActiveVaultId());
  if (!vaultId) throw linkError("No active local vault was found.", "VAULT_MISSING");

  const metadata = await adapters.getMetadata(vaultId);
  const linkedAccountId = clean(metadata?.accountUserId);
  if (metadata?.linkStatus === "linked" && linkedAccountId && linkedAccountId !== accountUserId) {
    throw linkError("This local vault is already linked to a different CLARA account.", "VAULT_ACCOUNT_CONFLICT");
  }

  const before = await adapters.readSnapshot(vaultId);
  if (metadata?.linkStatus === "linked" && linkedAccountId === accountUserId) {
    const after = await adapters.readSnapshot(vaultId);
    if (!snapshotsMatch(before, after)) throw linkError("Local record verification failed.", "VAULT_VERIFICATION_FAILED");
    return { ok: true, idempotent: true, vaultId, accountUserId, accountEmail: accountEmail || metadata?.accountEmail || null, linkedAt: metadata?.linkedAt || null, recordCounts: after };
  }

  await adapters.markLinking({ accountUserId, accountEmail }, vaultId);
  try {
    const after = await adapters.readSnapshot(vaultId);
    if (!snapshotsMatch(before, after)) throw linkError("Local record verification failed.", "VAULT_VERIFICATION_FAILED");

    const linkedAt = new Date().toISOString();
    await adapters.markLinked({ accountUserId, accountEmail, linkedAt }, vaultId);
    const result = { ok: true, idempotent: false, vaultId, accountUserId, accountEmail: accountEmail || null, linkedAt, recordCounts: after };
    adapters.dispatchLinked?.(result);
    console.info("[CLARA Account Linking] Local vault linked.", { vaultId, storeCount: Object.keys(after).length });
    return result;
  } catch (error) {
    await adapters.markFailed({ accountUserId, accountEmail, errorCode: error?.code, message: error?.message }, vaultId);
    console.warn("[CLARA Account Linking] Link failed; local records were preserved.", { vaultId, code: error?.code || "ACCOUNT_LINK_FAILED" });
    throw error;
  }
}

export function linkLocalVaultToAccount(input = {}) {
  return linkLocalVaultToAccountWithAdapters(input, defaultAdapters);
}
