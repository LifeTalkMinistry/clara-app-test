const SETTINGS_STORAGE_PREFIX = "clara_settings_";

export const CLARA_VOICE_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

export const CLARA_VISUAL_MODE_STORAGE_KEY = "clara_visual_mode";
export const CLARA_VISUAL_MODES = {
  PREMIUM: "premium",
  PERFORMANCE: "performance",
};

export function getSettingsStorageKey(userId) {
  return `${SETTINGS_STORAGE_PREFIX}${userId || "guest"}`;
}

export function normalizeVisualMode(value) {
  return value === CLARA_VISUAL_MODES.PERFORMANCE
    ? CLARA_VISUAL_MODES.PERFORMANCE
    : CLARA_VISUAL_MODES.PREMIUM;
}

export function getVisualModeFromSettings(settings) {
  return normalizeVisualMode(settings?.preferences?.visualMode);
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
      visualMode: CLARA_VISUAL_MODES.PREMIUM,
    },
    ai: {
      voice: "female",
    },
  };
}

export function normalizeClaraSettings(value = {}) {
  const defaults = createDefaultClaraSettings();
  const preferences = {
    ...defaults.preferences,
    ...(value.preferences || {}),
  };

  preferences.visualMode = normalizeVisualMode(preferences.visualMode);

  return {
    notifications: {
      ...defaults.notifications,
      ...(value.notifications || {}),
    },
    privacy: {
      ...defaults.privacy,
      ...(value.privacy || {}),
    },
    preferences,
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

export function readStoredVisualMode(userId = null) {
  if (typeof window === "undefined") return CLARA_VISUAL_MODES.PREMIUM;

  try {
    const userSettings = userId ? readClaraSettings(userId) : null;
    const fromUserSettings = userSettings?.preferences?.visualMode;
    const globalFallback = window.localStorage.getItem(CLARA_VISUAL_MODE_STORAGE_KEY);
    return normalizeVisualMode(fromUserSettings || globalFallback);
  } catch (error) {
    console.error("Failed to read CLARA visual mode:", error);
    return CLARA_VISUAL_MODES.PREMIUM;
  }
}

export function applyClaraVisualMode(mode) {
  if (typeof document === "undefined") return CLARA_VISUAL_MODES.PREMIUM;

  const normalized = normalizeVisualMode(mode);
  const root = document.documentElement;
  const body = document.body;

  root.classList.toggle("clara-performance-mode", normalized === CLARA_VISUAL_MODES.PERFORMANCE);
  root.classList.toggle("clara-premium-mode", normalized !== CLARA_VISUAL_MODES.PERFORMANCE);
  body?.classList?.toggle("clara-performance-mode", normalized === CLARA_VISUAL_MODES.PERFORMANCE);
  body?.classList?.toggle("clara-premium-mode", normalized !== CLARA_VISUAL_MODES.PERFORMANCE);
  root.dataset.claraVisualMode = normalized;
  if (body) body.dataset.claraVisualMode = normalized;

  return normalized;
}

export function setStoredVisualMode(userId, mode) {
  if (typeof window === "undefined") return normalizeVisualMode(mode);

  const normalized = normalizeVisualMode(mode);

  try {
    window.localStorage.setItem(CLARA_VISUAL_MODE_STORAGE_KEY, normalized);

    if (userId) {
      const current = readClaraSettings(userId);
      const next = normalizeClaraSettings({
        ...current,
        preferences: {
          ...current.preferences,
          visualMode: normalized,
        },
      });
      window.localStorage.setItem(getSettingsStorageKey(userId), JSON.stringify(next));
    }

    applyClaraVisualMode(normalized);
    window.dispatchEvent(
      new CustomEvent("clara-visual-mode-updated", {
        detail: {
          userId,
          visualMode: normalized,
          performanceMode: normalized === CLARA_VISUAL_MODES.PERFORMANCE,
        },
      })
    );
  } catch (error) {
    console.error("Failed to save CLARA visual mode:", error);
  }

  return normalized;
}

export function saveClaraSettings(userId, nextValue) {
  if (typeof window === "undefined" || !userId) return;

  try {
    const normalized = normalizeClaraSettings(nextValue);
    window.localStorage.setItem(
      getSettingsStorageKey(userId),
      JSON.stringify(normalized)
    );

    const visualMode = getVisualModeFromSettings(normalized);
    window.localStorage.setItem(CLARA_VISUAL_MODE_STORAGE_KEY, visualMode);
    applyClaraVisualMode(visualMode);

    window.dispatchEvent(
      new CustomEvent("clara-settings-updated", {
        detail: {
          userId,
          settings: normalized,
        },
      })
    );
    window.dispatchEvent(
      new CustomEvent("clara-visual-mode-updated", {
        detail: {
          userId,
          visualMode,
          performanceMode: visualMode === CLARA_VISUAL_MODES.PERFORMANCE,
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
