import { useCallback, useEffect, useState } from "react";
import {
  persistNotificationPreferences,
  readNotificationPreferences,
} from "@/lib/notifications/notificationPreferences";

export default function useNotificationPreferences(userId) {
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

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("clara:notification-preferences-updated", sync);
    };
  }, [userId]);

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
