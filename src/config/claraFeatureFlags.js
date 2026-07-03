const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) return true;
  if (["0", "false", "no", "off", "disabled"].includes(normalized)) return false;
  return fallback;
};

const readEnvFlag = (key, fallback = false) => {
  const envValue = import.meta.env?.[key];
  const runtimeValue =
    typeof window !== "undefined" ? window.__CLARA_FEATURE_FLAGS__?.[key] : undefined;
  return normalizeBoolean(runtimeValue ?? envValue, fallback);
};

export const CLARA_AUTH_ENABLED = readEnvFlag("VITE_CLARA_AUTH_ENABLED", false);
export const CLARA_ACCOUNT_LINKING_ENABLED = readEnvFlag(
  "VITE_CLARA_ACCOUNT_LINKING_ENABLED",
  false
);
export const CLARA_LOCAL_MODE_ENABLED = readEnvFlag(
  "VITE_CLARA_LOCAL_MODE_ENABLED",
  true
);

export function getClaraFeatureFlags() {
  return {
    authEnabled: CLARA_AUTH_ENABLED,
    accountLinkingEnabled: CLARA_ACCOUNT_LINKING_ENABLED,
    localModeEnabled: CLARA_LOCAL_MODE_ENABLED,
  };
}
