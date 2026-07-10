const STORAGE_KEY = "clara_free_buy_check_usage_v1";
const STORAGE_VERSION = 1;
export const FREE_BUY_CHECKS_PER_DAY = 1;

let memoryState = { version: STORAGE_VERSION, users: {} };

function clean(value) {
  return String(value || "").trim();
}

function resolveStorage(storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readState(storage) {
  const activeStorage = resolveStorage(storage);

  try {
    const parsed = JSON.parse(activeStorage?.getItem?.(STORAGE_KEY) || "null");
    if (parsed?.version === STORAGE_VERSION && parsed?.users && typeof parsed.users === "object") {
      memoryState = parsed;
      return parsed;
    }
  } catch {
    // Fall back to the in-memory copy when browser storage is unavailable.
  }

  return memoryState;
}

function writeState(state, storage) {
  memoryState = state;
  const activeStorage = resolveStorage(storage);

  try {
    activeStorage?.setItem?.(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The in-memory copy still enforces the limit for the current app session.
  }
}

export function getManilaBuyCheckDayKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const part = (type) => parts.find((entry) => entry.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function getFreeBuyCheckUsage(userId, { now = new Date(), storage = null } = {}) {
  const safeUserId = clean(userId) || "local-user";
  const dayKey = getManilaBuyCheckDayKey(now);
  const state = readState(storage);
  const saved = state.users?.[safeUserId];
  const isCurrentDay = saved?.dayKey === dayKey;
  const count = isCurrentDay ? Math.max(0, Number(saved?.count) || 0) : 0;

  return {
    userId: safeUserId,
    dayKey,
    count,
    limit: FREE_BUY_CHECKS_PER_DAY,
    remaining: Math.max(0, FREE_BUY_CHECKS_PER_DAY - count),
    available: count < FREE_BUY_CHECKS_PER_DAY,
    completedSessionIds: isCurrentDay && Array.isArray(saved?.completedSessionIds)
      ? saved.completedSessionIds.filter(Boolean)
      : [],
  };
}

export function canUseFreeBuyCheckToday(userId, options = {}) {
  return getFreeBuyCheckUsage(userId, options).available;
}

export function recordFreeBuyCheckCompletion(
  userId,
  sessionId,
  { now = new Date(), storage = null } = {}
) {
  const safeUserId = clean(userId) || "local-user";
  const safeSessionId = clean(sessionId) || `completed-${Date.now()}`;
  const usage = getFreeBuyCheckUsage(safeUserId, { now, storage });

  if (usage.completedSessionIds.includes(safeSessionId)) return usage;

  const state = readState(storage);
  const nextSessions = [...usage.completedSessionIds, safeSessionId].slice(-10);
  const nextCount = Math.min(FREE_BUY_CHECKS_PER_DAY, usage.count + 1);
  const nextState = {
    version: STORAGE_VERSION,
    users: {
      ...(state.users || {}),
      [safeUserId]: {
        dayKey: usage.dayKey,
        count: nextCount,
        completedSessionIds: nextSessions,
        updatedAt: (now instanceof Date ? now : new Date(now)).toISOString(),
      },
    },
  };

  writeState(nextState, storage);
  return getFreeBuyCheckUsage(safeUserId, { now, storage });
}

export function resetFreeBuyCheckUsageForTests(storage = null) {
  memoryState = { version: STORAGE_VERSION, users: {} };
  const activeStorage = resolveStorage(storage);

  try {
    activeStorage?.removeItem?.(STORAGE_KEY);
  } catch {
    // Test helper only.
  }
}
