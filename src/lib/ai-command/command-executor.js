import { getStoredBackendUser } from "@/lib/clara-backend-client";

/**
 * Legacy command writer retained only as a compatibility boundary.
 *
 * The active CLARA assistant must perform finance mutations through the
 * offline-first finance repository. This module intentionally does not own a
 * second expense, wallet, transfer, or budget write path.
 */

export async function resolveAuthenticatedUser(user) {
  if (user?.id || user?.email) return user;
  return getStoredBackendUser() || null;
}

export async function executeAICommand(command, context = {}) {
  const user = await resolveAuthenticatedUser(context.user);

  return {
    success: false,
    disabled: true,
    intent: command?.intent || "UNKNOWN",
    user: user ? { id: user.id || null, email: user.email || null } : null,
    errorCode: "LEGACY_WRITER_RETIRED",
    message:
      "This legacy command writer is retired. Use the active CLARA assistant finance-repository flow instead.",
  };
}

export default executeAICommand;
