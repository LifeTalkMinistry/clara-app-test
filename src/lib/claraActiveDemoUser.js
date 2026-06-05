const ACTIVE_CURRENT_STATE_KEY = "CLARA_ACTIVE_CURRENT_STATE_V1";

function readActiveCurrentState() {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(window.localStorage?.getItem(ACTIVE_CURRENT_STATE_KEY) || "null");
    if (!parsed || parsed.mode !== "current_state") return null;
    if (parsed.dataBoundary !== "temporary_demo_playground") return null;
    if (!parsed.localUserId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getActiveDemoLocalUserId() {
  const activeState = readActiveCurrentState();
  const localUserId = String(activeState?.localUserId || "").trim();
  return localUserId || null;
}

export function resolveFinanceLocalUserId(user, fallback = "local-user") {
  const demoLocalUserId = getActiveDemoLocalUserId();
  if (demoLocalUserId) return demoLocalUserId;

  const value = user?.id || user?.email || fallback;
  return String(value || fallback).trim() || fallback;
}
