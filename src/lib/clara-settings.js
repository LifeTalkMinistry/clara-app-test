import {
  notificationPreferencesToLegacySettings,
  persistNotificationPreferences,
  readNotificationPreferences,
} from "@/lib/notifications/notificationPreferences";

const SETTINGS_STORAGE_PREFIX = "clara_settings_";

export const CLARA_VOICE_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

export function getSettingsStorageKey(userId) {
  return `${SETTINGS_STORAGE_PREFIX}${userId || "guest"}`;
}

export function createDefaultClaraSettings(userId = null) {
  return {
    notifications: notificationPreferencesToLegacySettings(
      readNotificationPreferences(userId)
    ),
    privacy: {
      analyticsSharing: true,
      showCommunityProfile: true,
      privateMode: false,
    },
    preferences: {
      compactMode: false,
      reduceMotion: false,
      appearance: "system",
    },
    ai: {
      voice: "female",
    },
  };
}

export function normalizeClaraSettings(value = {}, userId = null) {
  const defaults = createDefaultClaraSettings(userId);
  return {
    notifications: notificationPreferencesToLegacySettings(
      readNotificationPreferences(userId)
    ),
    privacy: {
      ...defaults.privacy,
      ...(value.privacy || {}),
    },
    preferences: {
      ...defaults.preferences,
      ...(value.preferences || {}),
    },
    ai: {
      ...defaults.ai,
      ...(value.ai || {}),
    },
  };
}

export function readClaraSettings(userId) {
  if (typeof window === "undefined") return createDefaultClaraSettings(userId);

  try {
    const raw = window.localStorage.getItem(getSettingsStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};

    if (parsed?.notifications && typeof parsed.notifications === "object") {
      const currentPreferences = readNotificationPreferences(userId);
      const hasLegacyOverrides = Object.keys(parsed.notifications).length > 0;
      if (hasLegacyOverrides) {
        persistNotificationPreferences(userId, {
          ...currentPreferences,
          ...parsed.notifications,
        });
      }
    }

    return normalizeClaraSettings(parsed, userId);
  } catch (error) {
    console.error("Failed to read CLARA settings:", error);
    return createDefaultClaraSettings(userId);
  }
}

export function saveClaraSettings(userId, nextValue) {
  if (typeof window === "undefined" || !userId) return;

  try {
    if (nextValue?.notifications && typeof nextValue.notifications === "object") {
      persistNotificationPreferences(userId, {
        ...readNotificationPreferences(userId),
        ...nextValue.notifications,
      });
    }

    const normalized = normalizeClaraSettings(nextValue, userId);
    window.localStorage.setItem(
      getSettingsStorageKey(userId),
      JSON.stringify({
        privacy: normalized.privacy,
        preferences: normalized.preferences,
        ai: normalized.ai,
      })
    );
    window.dispatchEvent(
      new CustomEvent("clara-settings-updated", {
        detail: {
          userId,
          settings: normalized,
        },
      })
    );
  } catch (error) {
    console.error("Failed to save CLARA settings:", error);
  }
}

export function getStoredClaraVoice(userId) {
  return readClaraSettings(userId)?.ai?.voice || "female";
}

export function setStoredClaraVoice(userId, voice) {
  const current = readClaraSettings(userId);
  const next = normalizeClaraSettings(
    {
      ...current,
      ai: {
        ...current.ai,
        voice,
      },
    },
    userId
  );
  saveClaraSettings(userId, next);
  return next.ai.voice;
}
