import { linkLocalVaultToAccount } from "@/lib/accountLinking/linkLocalVaultToAccount";
import { migrateLegacyLocalIdentityStorage } from "@/lib/local-identity-storage-migration";
import { migrateLocalVaultOwnership } from "@/lib/local-vault-migration";

export const ACCOUNT_LINK_TIMEOUT_MS = 3_000;
const BLOCKING_LOCAL_LINK_CODES = new Set([
  "INVALID_ACCOUNT_ID",
  "VAULT_ACCOUNT_CONFLICT",
  "VAULT_CHANGED",
]);

function createTimeoutError(label, timeoutMs) {
  const error = new Error(`${label} did not finish within ${timeoutMs}ms.`);
  error.code = "LOCAL_AUTH_TASK_TIMEOUT";
  error.timeoutMs = timeoutMs;
  return error;
}

export function isBlockingLocalLinkError(error) {
  return BLOCKING_LOCAL_LINK_CODES.has(String(error?.code || ""));
}

export async function waitForLocalAccountLink(input, options = {}) {
  const timeoutMs = Number.isFinite(Number(options.timeoutMs))
    ? Math.max(0, Number(options.timeoutMs))
    : ACCOUNT_LINK_TIMEOUT_MS;
  const task = Promise.resolve().then(() => linkLocalVaultToAccount(input));

  if (timeoutMs === 0) return task;

  let timeoutId = null;
  try {
    return await Promise.race([
      task,
      new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(createTimeoutError("Local account linking", timeoutMs)),
          timeoutMs
        );
      }),
    ]);
  } catch (error) {
    if (isBlockingLocalLinkError(error)) throw error;

    const timedOut = error?.code === "LOCAL_AUTH_TASK_TIMEOUT";
    console.warn(
      timedOut
        ? "[CLARA Auth] local account linking timed out; authentication will continue."
        : "[CLARA Auth] local account linking was unavailable; authentication will continue.",
      {
        code: error?.code || "LOCAL_LINK_UNAVAILABLE",
        message: error?.message || String(error),
        timeoutMs,
      }
    );
    return { ok: false, timedOut, skipped: !timedOut };
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
}

export function runLocalAuthMaintenance(localUserId) {
  return (async () => {
    const vaultMigration = await migrateLocalVaultOwnership(localUserId);
    const identityMigration = await migrateLegacyLocalIdentityStorage(localUserId);
    return { vaultMigration, identityMigration };
  })().catch((error) => {
    console.warn("[CLARA Auth] local startup maintenance was skipped.", {
      errorName: error?.name || "Error",
      message: error?.message || String(error),
    });
    return { status: "failed", error };
  });
}
