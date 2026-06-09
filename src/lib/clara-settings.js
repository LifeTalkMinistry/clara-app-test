import {
  notificationPreferencesToLegacySettings,
  readNotificationPreferences,
  updateNotificationPreferences,
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
    const storageKey = getSettingsStorageKey(userId);
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : {};

    if (parsed?.notifications && typeof parsed.notifications === "object") {
      updateNotificationPreferences(userId, parsed.notifications);
      const { notifications: legacyNotifications, ...remainingSettings } = parsed;
      void legacyNotifications;
      window.localStorage.setItem(storageKey, JSON.stringify(remainingSettings));
      return normalizeClaraSettings(remainingSettings, userId);
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
      updateNotificationPreferences(userId, nextValue.notifications);
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
