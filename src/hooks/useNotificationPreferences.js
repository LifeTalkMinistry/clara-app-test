import { useCallback, useEffect, useMemo, useState } from "react";
import {
  persistNotificationPreferences,
  readNotificationPreferences,
} from "@/lib/notifications/notificationPreferences";
import { syncNotificationPreferencesToBackend } from "@/lib/push-notifications";
import { ensureActiveLocalVaultId } from "@/lib/localVaultIdentity";

function resolveNotificationOwnerId(requestedUserId) {
  const requested = String(requestedUserId || "").trim();
  const activeVaultId = String(ensureActiveLocalVaultId() || "").trim();

  // AuthContext uses the local vault ID as user.id. Prefer an explicit matching ID,
  // but never let a stale component instance write another account's preferences.
  if (requested && requested === activeVaultId) return requested;
  return activeVaultId || requested || "guest";
}

export default function useNotificationPreferences(requestedUserId = null) {
  const userId = useMemo(
    () => resolveNotificationOwnerId(requestedUserId),
    [requestedUserId]
  );
  const [preferences, setPreferencesState] = useState(() =>
    readNotificationPreferences(userId)
  );

  useEffect(() => {
    setPreferencesState(readNotificationPreferences(userId));
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const sync = (event) => {
      const eventUserId = String(event?.detail?.userId || "").trim();
      if (eventUserId && eventUserId !== String(userId || "guest")) return;
      setPreferencesState(readNotificationPreferences(userId));
    };

    window.addEventListener("storage", sync);
    window.addEventListener("clara:notification-preferences-updated", sync);
    window.addEventListener("clara:active-local-vault-updated", sync);
    window.addEventListener("clara:account-vault-switched", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("clara:notification-preferences-updated", sync);
      window.removeEventListener("clara:active-local-vault-updated", sync);
      window.removeEventListener("clara:account-vault-switched", sync);
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve(syncNotificationPreferencesToBackend(preferences)).catch((error) => {
      if (!cancelled) {
        console.warn("CLARA notification preference cloud sync deferred:", error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [preferences]);

  const savePreferences = useCallback(
    (nextValue) => {
      const resolved =
        typeof nextValue === "function"
          ? nextValue(readNotificationPreferences(userId))
          : nextValue;
      const saved = persistNotificationPreferences(userId, resolved);
      setPreferencesState(saved);
      return saved;
    },
    [userId]
  );

  const updatePreference = useCallback(
    (key, value) =>
      savePreferences((current) => ({
        ...current,
        [key]: typeof value === "function" ? value(current[key]) : value,
      })),
    [savePreferences]
  );

  return {
    userId,
    preferences,
    setPreferences: savePreferences,
    updatePreference,
    reloadPreferences: () => {
      const next = readNotificationPreferences(userId);
      setPreferencesState(next);
      return next;
    },
  };
}
