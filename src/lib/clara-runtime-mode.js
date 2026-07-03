import { Capacitor } from "@capacitor/core";

export const CLARA_RUNTIME_MODES = Object.freeze({
  LOCAL_BETA: "local_beta",
  CLOUD: "cloud",
});

const VALID_RUNTIME_MODES = new Set(Object.values(CLARA_RUNTIME_MODES));

function getExplicitRuntimeMode() {
  const value = String(import.meta.env?.VITE_CLARA_RUNTIME_MODE || "")
    .trim()
    .toLowerCase();

  return VALID_RUNTIME_MODES.has(value) ? value : "";
}

function isNativeAndroid() {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

export function getClaraRuntimeMode() {
  const explicitMode = getExplicitRuntimeMode();
  if (explicitMode) return explicitMode;

  return isNativeAndroid()
    ? CLARA_RUNTIME_MODES.LOCAL_BETA
    : CLARA_RUNTIME_MODES.CLOUD;
}

export function isLocalBetaMode() {
  return getClaraRuntimeMode() === CLARA_RUNTIME_MODES.LOCAL_BETA;
}

export function isCloudMode() {
  return getClaraRuntimeMode() === CLARA_RUNTIME_MODES.CLOUD;
}

export function logClaraRuntimeMode() {
  const mode = getClaraRuntimeMode();
  console.info("[CLARA Runtime] resolved runtime mode", { mode });
  return mode;
}
