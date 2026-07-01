import { addLocalDays, getLocalDateKey } from "@/lib/challenge-schedule";
import {
  calculateActiveStreak,
  calculateLongestStreak,
  isDateKey,
  normalizeDates,
} from "./dailyCheckInEngine";
import { createEmptyState, normalizeState, normalizeUserId } from "./dailyCheckInState";

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

export function writeState(userId, value, reason) {
  const resolvedUserId = normalizeUserId(userId);
  const state = normalizeState(value, resolvedUserId, getLocalDateKey());
  memoryStateByUser.set(resolvedUserId, state);
  safeSet(storageKey(resolvedUserId), JSON.stringify(state));

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(UPDATE_EVENT, {
        detail: { userId: resolvedUserId, state, reason },
      }),
    );
  }
  return state;
}

function migrateLegacyState(userId, todayKey) {
  if (userId === "guest") return null;
  const migrationOwner = safeGet(MIGRATION_OWNER_KEY);
  if (migrationOwner && migrationOwner !== userId) return null;

  const legacyState = safeParse(safeGet(LEGACY_KEY));
  if (!legacyState) return null;

  const completedDates = normalizeDates(legacyState.completedDates);
  const currentStreak = calculateActiveStreak(completedDates, todayKey);
  const longestStreak = calculateLongestStreak(completedDates);
  const latestDate = completedDates[completedDates.length - 1] || null;
  const lastCheckInDate = currentStreak > 0
    ? isDateKey(legacyState.lastCheckInDate)
      ? legacyState.lastCheckInDate
      : latestDate
    : null;
  const migratedState = normalizeState(
    {
      ...createEmptyState(userId),
      currentStreak,
      longestStreak,
      lifetimeCheckIns: completedDates.length,
      cycleStartedAt:
        currentStreak > 0 && lastCheckInDate
          ? addLocalDays(lastCheckInDate, -(currentStreak - 1))
          : null,
      lastCheckInDate,
      completedDates,
      completedThirtyDays: longestStreak >= 30,
      updatedAt: new Date().toISOString(),
    },
    userId,
    todayKey,
  );

  memoryStateByUser.set(userId, migratedState);
  if (safeSet(storageKey(userId), JSON.stringify(migratedState))) {
    safeSet(MIGRATION_OWNER_KEY, userId);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(UPDATE_EVENT, {
        detail: { userId, state: migratedState, reason: "migration" },
      }),
    );
  }
  return migratedState;
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
    return true;
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
