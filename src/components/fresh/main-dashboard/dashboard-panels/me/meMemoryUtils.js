export const MEMORY_KEY = "clara_behavioral_memory_v1";

export function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function readMemory() {
  if (typeof window === "undefined") return { version: 2, updatedAt: "", items: {} };
  try {
    const data = JSON.parse(localStorage.getItem(MEMORY_KEY) || "{}");
    return {
      version: data.version || 2,
      updatedAt: data.updatedAt || "",
      items: data.items || {},
    };
  } catch {
    return { version: 2, updatedAt: "", items: {} };
  }
}

export function dateLabel(value) {
  if (!value) return "Not yet calibrated";
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Recently updated";
  }
}
