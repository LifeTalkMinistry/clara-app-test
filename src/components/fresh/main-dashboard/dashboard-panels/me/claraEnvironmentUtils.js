export const ENVIRONMENT_SIGNAL_KEY = "clara_environment_signals_v1";
export const LEGACY_ENVIRONMENT_SIGNAL_KEY = "clara_behavioral_memory_v1";
export const CLARA_ENVIRONMENT_UPDATED = "clara-environment-signals-updated";

export function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function emptySignals() {
  return { version: 3, updatedAt: "", items: {} };
}

function normalizeSignals(data) {
  return {
    version: data?.version || 3,
    updatedAt: data?.updatedAt || "",
    items: data?.items || {},
  };
}

function readStoredSignals(key) {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ? normalizeSignals(value) : null;
  } catch {
    return null;
  }
}

export function readEnvironmentSignals() {
  if (typeof window === "undefined") return emptySignals();

  const current = readStoredSignals(ENVIRONMENT_SIGNAL_KEY);
  if (current) return current;

  const legacy = readStoredSignals(LEGACY_ENVIRONMENT_SIGNAL_KEY);
  if (legacy) {
    const migrated = { ...legacy, version: 3, migratedFrom: LEGACY_ENVIRONMENT_SIGNAL_KEY };
    localStorage.setItem(ENVIRONMENT_SIGNAL_KEY, JSON.stringify(migrated));
    return migrated;
  }

  return emptySignals();
}

export function countEnvironmentSignals(snapshot) {
  return Object.values(snapshot?.items || {}).filter((item) => clean(item?.value)).length;
}

export function notifyEnvironmentUpdated(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLARA_ENVIRONMENT_UPDATED, { detail }));
}
