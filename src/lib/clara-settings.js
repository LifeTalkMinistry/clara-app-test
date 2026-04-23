const SETTINGS_STORAGE_PREFIX = "clara_settings_";

export const CLARA_VOICE_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

export function getSettingsStorageKey(userId) {
  return `${SETTINGS_STORAGE_PREFIX}${userId || "guest"}`;
}

export function createDefaultClaraSettings() {
  return {
    notifications: {
      dailyReminders: true,
      productUpdates: true,
      coachingAlerts: true,
    },
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

export function normalizeClaraSettings(value = {}) {
  const defaults = createDefaultClaraSettings();
  return {
    notifications: {
      ...defaults.notifications,
      ...(value.notifications || {}),
    },
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
  if (typeof window === "undefined") return createDefaultClaraSettings();

  try {
    const raw = window.localStorage.getItem(getSettingsStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return normalizeClaraSettings(parsed);
  } catch (error) {
    console.error("Failed to read CLARA settings:", error);
    return createDefaultClaraSettings();
  }
}

export function saveClaraSettings(userId, nextValue) {
  if (typeof window === "undefined" || !userId) return;

  try {
    const normalized = normalizeClaraSettings(nextValue);
    window.localStorage.setItem(
      getSettingsStorageKey(userId),
      JSON.stringify(normalized)
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
  const next = normalizeClaraSettings({
    ...current,
    ai: {
      ...current.ai,
      voice,
    },
  });
  saveClaraSettings(userId, next);
  return next.ai.voice;
}
