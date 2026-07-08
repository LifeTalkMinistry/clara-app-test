export const CLARA_RUNTIME_MODES = Object.freeze({
  LOCAL_ONLY: "local_only",
  // Compatibility alias for existing callers while the local-only migration settles.
  LOCAL_BETA: "local_only",
});

export function getClaraRuntimeMode() {
  return CLARA_RUNTIME_MODES.LOCAL_ONLY;
}

export function isLocalBetaMode() {
  return true;
}

export function isCloudMode() {
  return false;
}

export function logClaraRuntimeMode() {
  const mode = getClaraRuntimeMode();
  console.info("[CLARA Runtime] resolved runtime mode", { mode });
  return mode;
}
