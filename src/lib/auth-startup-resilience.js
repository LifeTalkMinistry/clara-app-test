import { linkLocalVaultToAccount } from "@/lib/accountLinking/linkLocalVaultToAccount";
import { migrateLegacyLocalIdentityStorage } from "@/lib/local-identity-storage-migration";
import { migrateLocalVaultOwnership } from "@/lib/local-vault-migration";

export const ACCOUNT_LINK_TIMEOUT_MS = 3_000;

function createTimeoutError(label, timeoutMs) {
  const error = new Error(`${label} did not finish within ${timeoutMs}ms.`);
  error.code = "LOCAL_AUTH_TASK_TIMEOUT";
  error.timeoutMs = timeoutMs;
  return error;
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
    if (error?.code !== "LOCAL_AUTH_TASK_TIMEOUT") throw error;

    console.warn("[CLARA Auth] local account linking timed out; authentication will continue.", {
      timeoutMs,
    });
    return { ok: false, timedOut: true };
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
