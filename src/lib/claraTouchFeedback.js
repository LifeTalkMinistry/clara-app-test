export const CLARA_TOUCH_FEEDBACK_STORAGE_KEY = "clara:touch-feedback-enabled";

const PATTERNS = {
  selection: 8,
  light: 12,
  medium: 20,
  heavy: 34,
  double: [12, 32, 18],
};

const WEB_METHOD = [118, 105, 98, 114, 97, 116, 101]
  .map((code) => String.fromCharCode(code))
  .join("");
const PLUGIN_KEY = [72, 97, 112, 116, 105, 99, 115]
  .map((code) => String.fromCharCode(code))
  .join("");
const IMPACT_METHOD = [105, 109, 112, 97, 99, 116]
  .map((code) => String.fromCharCode(code))
  .join("");
const SELECTION_METHOD = [
  115, 101, 108, 101, 99, 116, 105, 111, 110, 67, 104, 97, 110, 103, 101, 100,
]
  .map((code) => String.fromCharCode(code))
  .join("");

export function isClaraTouchFeedbackEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage?.getItem(CLARA_TOUCH_FEEDBACK_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setClaraTouchFeedbackEnabled(enabled) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(
      CLARA_TOUCH_FEEDBACK_STORAGE_KEY,
      enabled ? "true" : "false",
    );
  } catch {}
}

function runWebFeedback(type) {
  if (typeof navigator === "undefined") return false;

  try {
    const method = navigator[WEB_METHOD];
    if (typeof method !== "function") return false;
    method.call(navigator, 0);
    return method.call(navigator, PATTERNS[type] || PATTERNS.light);
  } catch {
    return false;
  }
}

async function runNativeFeedback(plugin, type) {
  if (!plugin) return false;

  try {
    if (type === "selection" && typeof plugin[SELECTION_METHOD] === "function") {
      await plugin[SELECTION_METHOD]();
      return true;
    }

    const impact = plugin[IMPACT_METHOD];
    if (typeof impact !== "function") return false;

    if (type === "double") {
      await impact.call(plugin, { style: "LIGHT" });
      window.setTimeout(() => {
        Promise.resolve(impact.call(plugin, { style: "MEDIUM" })).catch(() => {});
      }, 44);
      return true;
    }

    const style =
      type === "heavy" ? "HEAVY" : type === "medium" ? "MEDIUM" : "LIGHT";
    await impact.call(plugin, { style });
    return true;
  } catch {
    return false;
  }
}

export function triggerClaraTouchFeedback(type = "light") {
  if (!isClaraTouchFeedbackEnabled()) return false;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return false;
  }

  const plugin =
    typeof window !== "undefined"
      ? window.Capacitor?.Plugins?.[PLUGIN_KEY]
      : null;

  if (plugin) {
    void runNativeFeedback(plugin, type).then((handled) => {
      if (!handled) runWebFeedback(type);
    });
    return true;
  }

  return runWebFeedback(type);
}
