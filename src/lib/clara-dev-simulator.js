export const CLARA_DEV_IDENTITY_KEY = "clara_dev_identity_override_v1";
export const CLARA_DEV_IDENTITY_EVENT = "clara-dev-identity-changed";

export const DEV_IDENTITY_SCENARIOS = [];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitDevIdentityChange(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLARA_DEV_IDENTITY_EVENT, { detail }));
}

export function getDevIdentityScenarios() {
  return DEV_IDENTITY_SCENARIOS;
}

export function getDevIdentityScenario() {
  return null;
}

export function readClaraDevIdentityOverride() {
  if (canUseStorage()) {
    window.localStorage.removeItem(CLARA_DEV_IDENTITY_KEY);
  }
  return null;
}

export function writeClaraDevIdentityOverride() {
  clearClaraDevIdentityOverride();
  return null;
}

export function clearClaraDevIdentityOverride() {
  if (canUseStorage()) {
    window.localStorage.removeItem(CLARA_DEV_IDENTITY_KEY);
  }
  emitDevIdentityChange(null);
}

export function reloadForDevIdentityChange() {
  if (typeof window === "undefined") return;
  window.setTimeout(() => window.location.reload(), 180);
}
