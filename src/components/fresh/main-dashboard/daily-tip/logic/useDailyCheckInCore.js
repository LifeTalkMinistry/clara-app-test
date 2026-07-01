import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addLocalDays, getLocalDateKey } from "@/lib/challenge-schedule";
import {
  createBubble,
  higherPriorityBubble,
  selectMilestone,
} from "./dailyCheckInBubbles";
import { calculateActiveStreak, normalizeDates } from "./dailyCheckInEngine";
import {
  LEGACY_KEY,
  UPDATE_EVENT,
  loadState,
  storageKey,
  writeState,
} from "./dailyCheckInPersistence";
import {
  createEmptyState,
  createSimulationState,
  normalizeState,
  normalizeUserId,
} from "./dailyCheckInState";
import {
  millisecondsUntilNextManilaMidnight,
  validateState,
} from "./dailyCheckInValidation";

const MAX_VISIBLE_DAYS = 30;

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
      const freshTodayKey = getLocalDateKey();
      setTodayKey(freshTodayKey);
      setCheckInState(createSimulationState(resolvedUserId, freshTodayKey));
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
      return buildResult("completed", nextState);
    }

    if (checkInLockRef.current) {
      const current = normalizeState(checkInState, resolvedUserId, freshTodayKey);
      const status = current.completedDates.includes(freshTodayKey)
        ? "already_checked_in"
        : "busy";
      return buildResult(status, current);
    }

    checkInLockRef.current = true;
    try {
      const latestState = loadState(resolvedUserId, freshTodayKey);
      const validation = validateState(latestState, resolvedUserId, freshTodayKey);
      const baseState = validation.state;

      if (baseState.completedDates.includes(freshTodayKey)) {
        const existingState = validation.changed
          ? writeState(resolvedUserId, baseState, validation.reason)
          : baseState;
        setCheckInState(existingState);
        return buildResult("already_checked_in", existingState);
      }

      const completedDates = normalizeDates([...baseState.completedDates, freshTodayKey]);
      const nextStreak = Math.max(1, calculateActiveStreak(completedDates, freshTodayKey));
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
      const nowIso = new Date().toISOString();
      const nextState = normalizeState(
        {
          ...baseState,
          currentStreak: nextStreak,
          longestStreak: Math.max(previousLongest, nextStreak),
          lifetimeCheckIns: completedDates.length,
          cycleStartedAt: addLocalDays(freshTodayKey, -(nextStreak - 1)),
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
      return buildResult("completed", writtenState, milestoneType, milestoneBubble);
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
  const checkedInToday = displayState.completedDates.includes(todayKey);
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

function buildResult(status, state, milestoneType = null, bubbleEvent = null) {
  return {
    status,
    currentStreak: state.currentStreak,
    longestStreak: state.longestStreak,
    milestoneType,
    bubbleEvent,
    state,
  };
}
