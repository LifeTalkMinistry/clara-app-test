const CLARA_HAPTICS_STORAGE_KEY = "clara:haptics-enabled";

const WEB_PATTERNS = {
  selection: 8,
  light: 12,
  medium: 22,
  heavy: 35,
  double: [16, 38, 16],
};

function isHapticsEnabled() {
  try {
    return window.localStorage?.getItem(CLARA_HAPTICS_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function getNativeHapticsPlugin() {
  if (typeof window === "undefined") return null;
  return window.Capacitor?.Plugins?.Haptics || null;
}

async function runNativeHaptic(type) {
  const Haptics = getNativeHapticsPlugin();
  if (!Haptics) return false;

  try {
    if (type === "selection" && typeof Haptics.selectionChanged === "function") {
      await Haptics.selectionChanged();
      return true;
    }

    if (type === "double") {
      if (typeof Haptics.impact === "function") {
        await Haptics.impact({ style: "MEDIUM" });
        setTimeout(() => {
          Haptics.impact({ style: "MEDIUM" }).catch?.(() => {});
        }, 55);
        return true;
      }
      return false;
    }

    if (typeof Haptics.impact === "function") {
      const style =
        type === "heavy" ? "HEAVY" : type === "medium" ? "MEDIUM" : "LIGHT";
      await Haptics.impact({ style });
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function runWebHaptic(type) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return false;
  }

  try {
    return navigator.vibrate(WEB_PATTERNS[type] || WEB_PATTERNS.light);
  } catch {
    return false;
  }
}

export function triggerClaraHaptic(type = "light") {
  if (!isHapticsEnabled() || typeof window === "undefined") return false;

  void runNativeHaptic(type).then((handled) => {
    if (!handled) runWebHaptic(type);
  });

  return true;
}

export function setClaraHapticsEnabled(enabled) {
  try {
    window.localStorage?.setItem(CLARA_HAPTICS_STORAGE_KEY, enabled ? "true" : "false");
  } catch {}
}
