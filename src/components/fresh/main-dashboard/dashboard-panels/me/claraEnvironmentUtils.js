export const ENVIRONMENT_SIGNAL_KEY = "clara_behavioral_memory_v1";

export function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function readEnvironmentSignals() {
  if (typeof window === "undefined") {
    return { version: 2, updatedAt: "", items: {} };
  }

  try {
    const data = JSON.parse(localStorage.getItem(ENVIRONMENT_SIGNAL_KEY) || "{}");
    return {
      version: data.version || 2,
      updatedAt: data.updatedAt || "",
      items: data.items || {},
    };
  } catch {
    return { version: 2, updatedAt: "", items: {} };
  }
}

export function countEnvironmentSignals(snapshot) {
  return Object.values(snapshot?.items || {}).filter((item) => clean(item?.value)).length;
}
