import { getLocalDateKey } from "../../../../../lib/challenge-schedule.js";
import { higherPriorityBubble } from "./dailyCheckInBubbles.js";
import { normalizeDates } from "./dailyCheckInEngine.js";
import { createEmptyState, normalizeState, normalizeUserId } from "./dailyCheckInState.js";

export const LEGACY_KEY = "clara_daily_check_in_v1";
export const UPDATE_EVENT = "clara:daily-check-in-updated";
const STORAGE_PREFIX = "clara_daily_check_in_v2:";
const MIGRATION_OWNER_KEY = "clara_daily_check_in_v1_migrated_to";
const memoryStateByUser = new Map();

export function storageKey(userId) {
  return `${STORAGE_PREFIX}${normalizeUserId(userId)}`;
}

export function loadState(userId, todayKey) {
  const resolvedUserId = normalizeUserId(userId);
  const stored = safeParse(safeGet(storageKey(resolvedUserId)));
  if (stored) {
    const normalized = normalizeState(stored, resolvedUserId, todayKey);
    memoryStateByUser.set(resolvedUserId, normalized);
    return normalized;
  }

  const memoryState = memoryStateByUser.get(resolvedUserId);
  if (memoryState) return normalizeState(memoryState, resolvedUserId, todayKey);

  const migrated = migrateLegacyState(resolvedUserId, todayKey);
  if (migrated) return migrated;

  const emptyState = createEmptyState(resolvedUserId);
  memoryStateByUser.set(resolvedUserId, emptyState);
  return emptyState;
}

export function writeState(userId, value, reason, todayKey = getLocalDateKey()) {
  const resolvedUserId = normalizeUserId(userId);
  const state = normalizeState(value, resolvedUserId, todayKey);
  const persisted = safeSet(storageKey(resolvedUserId), JSON.stringify(state));

  if (!persisted) {
    console.error("[CLARA Daily Check-In] Local persistence failed.", { reason });
    return { ok: false, state };
  }

  memoryStateByUser.set(resolvedUserId, state);
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent(UPDATE_EVENT, {
          detail: { userId: resolvedUserId, state, reason },
        }),
      );
    } catch {
      console.warn("[CLARA Daily Check-In] Local update notification failed.", {
        reason,
      });
    }
  }
  return { ok: true, state };
}

export function migrateSessionIdentityState(sourceUserId, destinationUserId, todayKey) {
  const sourceId = normalizeUserId(sourceUserId);
  const destinationId = normalizeUserId(destinationUserId);
  const destinationState = loadState(destinationId, todayKey);

  if (sourceId === destinationId || destinationId === "guest") {
    return { ok: true, migrated: false, state: destinationState };
  }

  const sourceRaw = safeParse(safeGet(storageKey(sourceId)));
  if (!sourceRaw) {
    return { ok: true, migrated: false, state: destinationState };
  }

  const sourceState = normalizeState(sourceRaw, sourceId, todayKey);
  const completedDates = normalizeDates(
    [...destinationState.completedDates, ...sourceState.completedDates],
    todayKey,
  );
  const mergedState = normalizeState(
    {
      ...destinationState,
      completedDates,
      longestStreak: Math.max(
        destinationState.longestStreak,
        sourceState.longestStreak,
      ),
      lifetimeCheckIns: Math.max(
        completedDates.length,
        destinationState.lifetimeCheckIns,
        sourceState.lifetimeCheckIns,
      ),
      completedThirtyDays:
        destinationState.completedThirtyDays || sourceState.completedThirtyDays,
      completedThirtyDaysAt:
        destinationState.completedThirtyDaysAt || sourceState.completedThirtyDaysAt,
      lastResetAt: latestIso(destinationState.lastResetAt, sourceState.lastResetAt),
      lastResetForDate:
        destinationState.lastResetForDate || sourceState.lastResetForDate,
      pendingBubble: higherPriorityBubble(
        destinationState.pendingBubble,
        sourceState.pendingBubble,
      ),
      updatedAt: new Date().toISOString(),
    },
    destinationId,
    todayKey,
  );

  const writeResult = writeState(
    destinationId,
    mergedState,
    "identity_migration",
    todayKey,
  );
  if (!writeResult.ok) {
    return { ok: false, migrated: false, state: destinationState };
  }

  if (!safeRemove(storageKey(sourceId))) {
    console.error("[CLARA Daily Check-In] Temporary identity cleanup failed.");
  } else {
    memoryStateByUser.delete(sourceId);
  }

  return { ok: true, migrated: true, state: writeResult.state };
}

function migrateLegacyState(userId, todayKey) {
  if (userId === "guest") return null;
  const migrationOwner = safeGet(MIGRATION_OWNER_KEY);
  if (migrationOwner && migrationOwner !== userId) return null;

  const legacyState = safeParse(safeGet(LEGACY_KEY));
  if (!legacyState) return null;

  const migratedState = normalizeState(
    {
      ...legacyState,
      ...createEmptyState(userId),
      completedDates: legacyState.completedDates,
      lastCheckInDate: legacyState.lastCheckInDate,
      longestStreak: legacyState.longestStreak,
      lifetimeCheckIns: legacyState.lifetimeCheckIns,
      completedThirtyDays: legacyState.completedThirtyDays,
      completedThirtyDaysAt: legacyState.completedThirtyDaysAt,
      lastResetAt: legacyState.lastResetAt,
      pendingBubble: legacyState.pendingBubble,
      updatedAt: new Date().toISOString(),
    },
    userId,
    todayKey,
  );

  const writeResult = writeState(userId, migratedState, "legacy_migration", todayKey);
  if (!writeResult.ok) return migratedState;
  safeSet(MIGRATION_OWNER_KEY, userId);
  return writeResult.state;
}

function latestIso(left, right) {
  if (typeof left !== "string") return typeof right === "string" ? right : null;
  if (typeof right !== "string") return left;
  return left > right ? left : right;
}

function safeGet(key) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return window.localStorage.getItem(key) === value;
  } catch {
    return false;
  }
}

function safeRemove(key) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(key);
    return window.localStorage.getItem(key) === null;
  } catch {
    return false;
  }
}

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
