import { getEligibleDayKey } from "../../../../../lib/challenge-schedule.js";
import { higherPriorityBubble } from "./dailyCheckInBubbles.js";
import { normalizeCheckInEvents } from "./dailyCheckInEngine.js";
import { createEmptyState, normalizeState, normalizeUserId } from "./dailyCheckInState.js";

export const LEGACY_KEY = "clara_daily_check_in_v1";
export const UPDATE_EVENT = "clara:daily-check-in-updated";
const V2_STORAGE_PREFIX = "clara_daily_check_in_v2:";
const STORAGE_PREFIX = "clara_daily_check_in_v3:";
const MIGRATION_OWNER_KEY = "clara_daily_check_in_v1_migrated_to";
const V3_MIGRATION_PREFIX = "clara_daily_check_in_v3_migrated:";
const memoryStateByUser = new Map();

export function storageKey(userId) {
  return `${STORAGE_PREFIX}${normalizeUserId(userId)}`;
}

export function legacyStorageKey(userId) {
  return `${V2_STORAGE_PREFIX}${normalizeUserId(userId)}`;
}

export function loadState(userId, todayKey) {
  const resolvedUserId = normalizeUserId(userId);
  const rawStored = safeGet(storageKey(resolvedUserId));
  const stored = safeParse(rawStored);
  if (stored) {
    const normalized = normalizeState(stored, resolvedUserId, todayKey);
    persistNormalizedSnapshot(resolvedUserId, rawStored, normalized);
    memoryStateByUser.set(resolvedUserId, normalized);
    return normalized;
  }

  const migrated = migrateV2State(resolvedUserId, todayKey) || migrateLegacyState(resolvedUserId, todayKey);
  if (migrated) return migrated;

  const memoryState = memoryStateByUser.get(resolvedUserId);
  if (memoryState) return normalizeState(memoryState, resolvedUserId, todayKey);

  const emptyState = createEmptyState(resolvedUserId);
  memoryStateByUser.set(resolvedUserId, emptyState);
  return emptyState;
}

function persistNormalizedSnapshot(userId, rawStored, normalizedState) {
  // State can be loaded during React initialization, so repair storage quietly.
  const normalizedSerialized = JSON.stringify(normalizedState);
  if (rawStored === normalizedSerialized) return;

  if (!safeSet(storageKey(userId), normalizedSerialized)) {
    console.warn("[CLARA Daily Check-In] Unable to persist a normalized state snapshot.");
  }
}

export function writeState(userId, value, reason, todayKey = getEligibleDayKey(), expectedEvent = null) {
  const resolvedUserId = normalizeUserId(userId);
  const previousState = loadPreviousValidState(resolvedUserId, todayKey);
  const state = normalizeState(value, resolvedUserId, todayKey);
  const serialized = JSON.stringify(state);
  const persisted = safeSet(storageKey(resolvedUserId), serialized);

  if (!persisted) {
    console.error("[CLARA Daily Check-In] Local persistence failed.", { reason });
    return { ok: false, state: previousState || state };
  }

  const verified = safeParse(safeGet(storageKey(resolvedUserId)));
  const verifiedState = verified ? normalizeState(verified, resolvedUserId, todayKey) : null;
  const expectedEventVerified = !expectedEvent
    || verifiedState?.checkInEvents?.some(
      (event) =>
        event.eventId === expectedEvent.eventId &&
        event.eligibleDay === expectedEvent.eligibleDay,
    );

  if (!verifiedState || !expectedEventVerified) {
    console.error("[CLARA Daily Check-In] Local persistence read-back verification failed.", {
      reason,
    });
    return { ok: false, state: previousState || state };
  }

  memoryStateByUser.set(resolvedUserId, verifiedState);
  dispatchUpdate(resolvedUserId, verifiedState, reason);
  return { ok: true, state: verifiedState };
}

function loadPreviousValidState(userId, todayKey) {
  const stored = safeParse(safeGet(storageKey(userId)));
  return stored ? normalizeState(stored, userId, todayKey) : memoryStateByUser.get(userId) || null;
}

export function clearDailyCheckInState(userId) {
  const resolvedUserId = normalizeUserId(userId);
  safeRemove(storageKey(resolvedUserId));
  safeRemove(legacyStorageKey(resolvedUserId));
  safeRemove(LEGACY_KEY);
  safeRemove(MIGRATION_OWNER_KEY);
  safeRemove(`${V3_MIGRATION_PREFIX}${resolvedUserId}`);
  memoryStateByUser.delete(resolvedUserId);
  const emptyState = createEmptyState(resolvedUserId);
  dispatchUpdate(resolvedUserId, emptyState, "reset");
  return emptyState;
}

export function migrateSessionIdentityState(sourceUserId, destinationUserId, todayKey) {
  const sourceId = normalizeUserId(sourceUserId);
  const destinationId = normalizeUserId(destinationUserId);
  const destinationState = loadState(destinationId, todayKey);

  if (sourceId === destinationId || destinationId === "guest") {
    return { ok: true, migrated: false, state: destinationState };
  }

  const sourceRaw = safeParse(safeGet(storageKey(sourceId))) || safeParse(safeGet(legacyStorageKey(sourceId)));
  if (!sourceRaw) {
    return { ok: true, migrated: false, state: destinationState };
  }

  const sourceState = normalizeState(sourceRaw, sourceId, todayKey);
  const checkInEvents = normalizeCheckInEvents(
    [...destinationState.checkInEvents, ...sourceState.checkInEvents],
    destinationId,
    todayKey,
  );
  const mergedState = normalizeState(
    {
      ...destinationState,
      checkInEvents,
      challengeStartDay: destinationState.challengeStartDay || sourceState.challengeStartDay,
      longestStreak: Math.max(destinationState.longestStreak, sourceState.longestStreak),
      lifetimeCheckIns: Math.max(
        checkInEvents.length,
        destinationState.lifetimeCheckIns,
        sourceState.lifetimeCheckIns,
      ),
      completedThirtyDays:
        destinationState.completedThirtyDays || sourceState.completedThirtyDays,
      completedThirtyDaysAt:
        destinationState.completedThirtyDaysAt || sourceState.completedThirtyDaysAt,
      lastResetAt: latestIso(destinationState.lastResetAt, sourceState.lastResetAt),
      lastResetForDay:
        destinationState.lastResetForDay || sourceState.lastResetForDay,
      pendingBubble: higherPriorityBubble(
        destinationState.pendingBubble,
        sourceState.pendingBubble,
      ),
      updatedAt: new Date().toISOString(),
    },
    destinationId,
    todayKey,
  );

  const writeResult = writeState(destinationId, mergedState, "identity_migration", todayKey);
  if (!writeResult.ok) {
    return { ok: false, migrated: false, state: destinationState };
  }

  if (!safeRemove(storageKey(sourceId))) {
    console.error("[CLARA Daily Check-In] Temporary identity cleanup failed.");
  }
  safeRemove(legacyStorageKey(sourceId));
  memoryStateByUser.delete(sourceId);

  return { ok: true, migrated: true, state: writeResult.state };
}

function migrateV2State(userId, todayKey) {
  if (safeGet(`${V3_MIGRATION_PREFIX}${userId}`) && safeGet(storageKey(userId))) return null;
  const v2State = safeParse(safeGet(legacyStorageKey(userId)));
  if (!v2State) return null;

  const migratedState = normalizeState(
    {
      ...v2State,
      version: 3,
      userId,
      checkInEvents: [
        ...(Array.isArray(v2State.checkInEvents) ? v2State.checkInEvents : []),
      ],
      challengeStartDay:
        v2State.challengeStartDay ||
        v2State.cycleStartedAt ||
        v2State.lastCheckInDay ||
        v2State.lastCheckInDate ||
        null,
      updatedAt: new Date().toISOString(),
    },
    userId,
    todayKey,
  );

  const writeResult = writeState(userId, migratedState, "v2_migration", todayKey);
  if (!writeResult.ok) return migratedState;
  safeSet(`${V3_MIGRATION_PREFIX}${userId}`, new Date().toISOString());
  return writeResult.state;
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

function dispatchUpdate(userId, state, reason) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(UPDATE_EVENT, {
        detail: { userId, state, reason },
      }),
    );
  } catch {
    console.warn("[CLARA Daily Check-In] Local update notification failed.", {
      reason,
    });
  }
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
