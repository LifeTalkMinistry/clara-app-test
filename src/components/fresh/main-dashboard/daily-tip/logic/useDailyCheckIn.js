import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addLocalDays,
  compareDateKeys,
  getChallengeTimeZone,
  getLocalDateKey,
} from "@/lib/challenge-schedule";

const LEGACY_KEY = "clara_daily_check_in_v1";
const STORAGE_PREFIX = "clara_daily_check_in_v2:";
const MIGRATION_OWNER_KEY = "clara_daily_check_in_v1_migrated_to";
const UPDATE_EVENT = "clara:daily-check-in-updated";
const MAX_VISIBLE_DAYS = 30;
const memoryStateByUser = new Map();
const BUBBLE_PRIORITY = {
  streak_30_completed: 5,
  streak_reset: 4,
  streak_14_day: 3,
  streak_7_day: 2,
  new_longest_streak: 1,
};

export default function useDailyCheckIn({ userId = "guest", simulationMode = false } = {}) {
  const resolvedUserId = normalizeUserId(userId);
  const [todayKey, setTodayKey] = useState(() => getLocalDateKey());
  const [checkInState, setCheckInState] = useState(() =>
    simulationMode
      ? createSimulationState(resolvedUserId, getLocalDateKey())
      : loadState(resolvedUserId, getLocalDateKey()),
  );
  const checkInLockRef = useRef(false);

  const validateStreak = useCallback(() => {
    const freshTodayKey = getLocalDateKey();
    setTodayKey(freshTodayKey);

    if (simulationMode) {
      const nextSimulationState = createSimulationState(resolvedUserId, freshTodayKey);
      setCheckInState(nextSimulationState);
      return nextSimulationState;
    }

    const latestState = loadState(resolvedUserId, freshTodayKey);
    const validation = validateState(latestState, resolvedUserId, freshTodayKey);
    const nextState = validation.changed
      ? writeState(resolvedUserId, validation.state, validation.reason)
      : validation.state;

    setCheckInState(nextState);
    return nextState;
  }, [resolvedUserId, simulationMode]);

  useEffect(() => {
    if (simulationMode) {
      setTodayKey(getLocalDateKey());
      setCheckInState(createSimulationState(resolvedUserId, getLocalDateKey()));
      return undefined;
    }

    validateStreak();
    if (typeof window === "undefined") return undefined;

    let midnightTimer = null;
    const scheduleMidnightValidation = () => {
      if (midnightTimer) window.clearTimeout(midnightTimer);
      midnightTimer = window.setTimeout(() => {
        validateStreak();
        scheduleMidnightValidation();
      }, millisecondsUntilNextManilaMidnight());
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") validateStreak();
    };
    const handleStorage = (event) => {
      if (event.key && event.key !== storageKey(resolvedUserId) && event.key !== LEGACY_KEY) return;
      validateStreak();
    };
    const handleLocalUpdate = (event) => {
      if (normalizeUserId(event?.detail?.userId) !== resolvedUserId) return;
      const freshTodayKey = getLocalDateKey();
      setTodayKey(freshTodayKey);
      setCheckInState(normalizeState(event.detail.state, resolvedUserId, freshTodayKey));
    };

    scheduleMidnightValidation();
    window.addEventListener("focus", validateStreak);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(UPDATE_EVENT, handleLocalUpdate);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (midnightTimer) window.clearTimeout(midnightTimer);
      window.removeEventListener("focus", validateStreak);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(UPDATE_EVENT, handleLocalUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [resolvedUserId, simulationMode, validateStreak]);

  const checkInToday = useCallback(() => {
    const freshTodayKey = getLocalDateKey();
    setTodayKey(freshTodayKey);

    if (simulationMode) {
      const nextState = createSimulationState(resolvedUserId, freshTodayKey, true);
      setCheckInState(nextState);
      return {
        status: "completed",
        currentStreak: 1,
        longestStreak: 1,
        milestoneType: null,
        bubbleEvent: null,
        state: nextState,
      };
    }

    if (checkInLockRef.current) {
      const current = normalizeState(checkInState, resolvedUserId, freshTodayKey);
      return {
        status: current.lastCheckInDate === freshTodayKey ? "already_checked_in" : "busy",
        currentStreak: current.currentStreak,
        longestStreak: current.longestStreak,
        milestoneType: null,
        bubbleEvent: null,
        state: current,
      };
    }

    checkInLockRef.current = true;
    try {
      const latestState = loadState(resolvedUserId, freshTodayKey);
      const validation = validateState(latestState, resolvedUserId, freshTodayKey);
      const baseState = validation.state;

      if (baseState.lastCheckInDate === freshTodayKey || baseState.completedDates.includes(freshTodayKey)) {
        const existingState = validation.changed
          ? writeState(resolvedUserId, baseState, validation.reason)
          : baseState;
        setCheckInState(existingState);
        return {
          status: "already_checked_in",
          currentStreak: existingState.currentStreak,
          longestStreak: existingState.longestStreak,
          milestoneType: null,
          bubbleEvent: null,
          state: existingState,
        };
      }

      const yesterdayKey = addLocalDays(freshTodayKey, -1);
      const continuesStreak = baseState.lastCheckInDate === yesterdayKey;
      const nextStreak = continuesStreak ? baseState.currentStreak + 1 : 1;
      const previousLongest = baseState.longestStreak;
      const milestoneType = selectMilestone({
        nextStreak,
        previousLongest,
        completedThirtyDays: baseState.completedThirtyDays,
        hasResetHistory: Boolean(baseState.lastResetAt),
      });
      const milestoneBubble = milestoneType
        ? createBubble(milestoneType, nextStreak, freshTodayKey)
        : null;
      const completedDates = normalizeDates([...baseState.completedDates, freshTodayKey]);
      const nowIso = new Date().toISOString();
      const nextState = normalizeState(
        {
          ...baseState,
          currentStreak: nextStreak,
          longestStreak: Math.max(previousLongest, nextStreak),
          lifetimeCheckIns: completedDates.length,
          cycleStartedAt:
            continuesStreak && baseState.cycleStartedAt ? baseState.cycleStartedAt : freshTodayKey,
          lastCheckInDate: freshTodayKey,
          completedDates,
          completedThirtyDays: baseState.completedThirtyDays || nextStreak >= 30,
          completedThirtyDaysAt:
            nextStreak >= 30 && !baseState.completedThirtyDaysAt
              ? nowIso
              : baseState.completedThirtyDaysAt,
          pendingBubble: higherPriorityBubble(baseState.pendingBubble, milestoneBubble),
          updatedAt: nowIso,
        },
        resolvedUserId,
        freshTodayKey,
      );
      const writtenState = writeState(resolvedUserId, nextState, "check_in");
      setCheckInState(writtenState);

      return {
        status: "completed",
        currentStreak: writtenState.currentStreak,
        longestStreak: writtenState.longestStreak,
        milestoneType,
        bubbleEvent: milestoneBubble,
        state: writtenState,
      };
    } finally {
      checkInLockRef.current = false;
    }
  }, [checkInState, resolvedUserId, simulationMode]);

  const dismissPendingBubble = useCallback(
    (eventId = null) => {
      if (simulationMode) return;
      const latestState = loadState(resolvedUserId, getLocalDateKey());
      if (!latestState.pendingBubble) return;
      if (eventId && latestState.pendingBubble.id !== eventId) return;

      const nextState = writeState(
        resolvedUserId,
        {
          ...latestState,
          pendingBubble: null,
          updatedAt: new Date().toISOString(),
        },
        "bubble_dismissed",
      );
      setCheckInState(nextState);
    },
    [resolvedUserId, simulationMode],
  );

  const displayState = useMemo(
    () =>
      checkInState.userId === resolvedUserId
        ? normalizeState(checkInState, resolvedUserId, todayKey)
        : createEmptyState(resolvedUserId),
    [checkInState, resolvedUserId, todayKey],
  );
  const checkedInToday = displayState.lastCheckInDate === todayKey;
  const challengeProgress = Math.min(displayState.currentStreak, MAX_VISIBLE_DAYS);
  const challengeDay =
    displayState.currentStreak >= MAX_VISIBLE_DAYS
      ? MAX_VISIBLE_DAYS
      : checkedInToday
        ? Math.max(1, displayState.currentStreak)
        : Math.min(MAX_VISIBLE_DAYS, displayState.currentStreak + 1);

  return {
    todayKey,
    checkedInToday,
    completedDates: displayState.completedDates,
    totalCompleted: challengeProgress,
    challengeProgress,
    challengeDay,
    currentStreak: displayState.currentStreak,
    longestStreak: displayState.longestStreak,
    lifetimeCheckIns: displayState.lifetimeCheckIns,
    completedThirtyDays: displayState.completedThirtyDays,
    pendingBubble: simulationMode ? null : displayState.pendingBubble,
    checkInToday,
    dismissPendingBubble,
    validateStreak,
  };
}

function validateState(value, userId, todayKey) {
  const state = normalizeState(value, userId, todayKey);
  if (!state.lastCheckInDate) return { state, changed: false, reason: "validation" };

  const yesterdayKey = addLocalDays(todayKey, -1);
  if (
    state.lastCheckInDate === todayKey ||
    state.lastCheckInDate === yesterdayKey ||
    compareDateKeys(state.lastCheckInDate, todayKey) > 0
  ) {
    return { state, changed: false, reason: "validation" };
  }

  const previousStreak = Math.max(0, state.currentStreak);
  const resetBubble = previousStreak > 0
    ? createBubble("streak_reset", previousStreak, todayKey)
    : null;
  const nowIso = new Date().toISOString();

  return {
    changed: true,
    reason: "reset",
    state: normalizeState(
      {
        ...state,
        currentStreak: 0,
        longestStreak: Math.max(state.longestStreak, previousStreak),
        cycleStartedAt: null,
        lastCheckInDate: null,
        lastResetAt: nowIso,
        pendingBubble: higherPriorityBubble(state.pendingBubble, resetBubble),
        updatedAt: nowIso,
      },
      userId,
      todayKey,
    ),
  };
}

function loadState(userId, todayKey) {
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

function writeState(userId, value, reason) {
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
  const lastHistoricalDate = isDateKey(legacyState.lastCheckInDate)
    ? legacyState.lastCheckInDate
    : completedDates[completedDates.length - 1] || null;
  const lastCheckInDate = currentStreak > 0 ? lastHistoricalDate : null;
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

function createEmptyState(userId) {
  return {
    version: 2,
    userId: normalizeUserId(userId),
    timezone: getChallengeTimeZone(),
    currentStreak: 0,
    longestStreak: 0,
    lifetimeCheckIns: 0,
    cycleStartedAt: null,
    lastCheckInDate: null,
    completedDates: [],
    completedThirtyDays: false,
    completedThirtyDaysAt: null,
    lastResetAt: null,
    pendingBubble: null,
    updatedAt: null,
  };
}

function createSimulationState(userId, todayKey, completedToday = false) {
  return {
    ...createEmptyState(userId),
    currentStreak: completedToday ? 1 : 0,
    longestStreak: completedToday ? 1 : 0,
    lifetimeCheckIns: completedToday ? 1 : 0,
    cycleStartedAt: completedToday ? todayKey : null,
    lastCheckInDate: completedToday ? todayKey : null,
    completedDates: completedToday ? [todayKey] : [],
  };
}

function normalizeState(value, userId, todayKey) {
  const base = createEmptyState(userId);
  const completedDates = normalizeDates(value?.completedDates);
  const lastCheckInDate = isDateKey(value?.lastCheckInDate) ? value.lastCheckInDate : null;
  const currentStreak = Number.isFinite(Number(value?.currentStreak))
    ? Math.max(0, Math.floor(Number(value.currentStreak)))
    : calculateActiveStreak(completedDates, todayKey);
  const longestStreak = Math.max(
    currentStreak,
    calculateLongestStreak(completedDates),
    Number.isFinite(Number(value?.longestStreak))
      ? Math.max(0, Math.floor(Number(value.longestStreak)))
      : 0,
  );

  return {
    ...base,
    currentStreak,
    longestStreak,
    lifetimeCheckIns: Math.max(
      completedDates.length,
      Number.isFinite(Number(value?.lifetimeCheckIns))
        ? Math.max(0, Math.floor(Number(value.lifetimeCheckIns)))
        : 0,
    ),
    cycleStartedAt:
      currentStreak > 0 && isDateKey(value?.cycleStartedAt) ? value.cycleStartedAt : null,
    lastCheckInDate,
    completedDates,
    completedThirtyDays: Boolean(value?.completedThirtyDays) || longestStreak >= 30,
    completedThirtyDaysAt:
      typeof value?.completedThirtyDaysAt === "string" ? value.completedThirtyDaysAt : null,
    lastResetAt: typeof value?.lastResetAt === "string" ? value.lastResetAt : null,
    pendingBubble: normalizeBubble(value?.pendingBubble),
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : null,
  };
}

function normalizeDates(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isDateKey))].sort(compareDateKeys);
}

function calculateActiveStreak(completedDates, todayKey) {
  const dateSet = new Set(normalizeDates(completedDates));
  let cursor = dateSet.has(todayKey) ? todayKey : addLocalDays(todayKey, -1);
  let streak = 0;
  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }
  return streak;
}

function calculateLongestStreak(completedDates) {
  let longest = 0;
  let running = 0;
  let previousDate = null;
  normalizeDates(completedDates).forEach((dateKey) => {
    running = previousDate && addLocalDays(previousDate, 1) === dateKey ? running + 1 : 1;
    longest = Math.max(longest, running);
    previousDate = dateKey;
  });
  return longest;
}

function selectMilestone({ nextStreak, previousLongest, completedThirtyDays, hasResetHistory }) {
  if (nextStreak === 30 && !completedThirtyDays) return "streak_30_completed";
  if (nextStreak === 14) return "streak_14_day";
  if (nextStreak === 7) return "streak_7_day";
  if (hasResetHistory && previousLongest > 0 && nextStreak > previousLongest) {
    return "new_longest_streak";
  }
  return null;
}

function createBubble(type, streakCount, dateKey) {
  return {
    id: `${type}:${dateKey}:${streakCount}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    previousStreak: streakCount,
    streakCount,
    createdAt: new Date().toISOString(),
  };
}

function normalizeBubble(value) {
  if (!value || !BUBBLE_PRIORITY[value.type] || typeof value.id !== "string") return null;
  return {
    id: value.id,
    type: value.type,
    previousStreak: Math.max(0, Number(value.previousStreak) || 0),
    streakCount: Math.max(0, Number(value.streakCount) || 0),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
  };
}

function higherPriorityBubble(currentValue, candidateValue) {
  const current = normalizeBubble(currentValue);
  const candidate = normalizeBubble(candidateValue);
  if (!current) return candidate;
  if (!candidate) return current;
  return BUBBLE_PRIORITY[candidate.type] > BUBBLE_PRIORITY[current.type] ? candidate : current;
}

function millisecondsUntilNextManilaMidnight(now = new Date()) {
  const tomorrowKey = addLocalDays(getLocalDateKey(now), 1);
  return Math.max(1000, Date.parse(`${tomorrowKey}T00:00:00+08:00`) - now.getTime() + 1000);
}

function storageKey(userId) {
  return `${STORAGE_PREFIX}${normalizeUserId(userId)}`;
}

function normalizeUserId(userId) {
  return String(userId || "").trim() || "guest";
}

function isDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
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
