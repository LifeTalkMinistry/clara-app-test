import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getEligibleDayKey } from "../../../../../lib/challenge-schedule.js";
import { performDailyCheckIn, buildResult } from "./dailyCheckInActions.js";
import { deriveChallengeMetrics } from "./dailyCheckInEngine.js";
import {
  LEGACY_KEY,
  UPDATE_EVENT,
  legacyStorageKey,
  loadState,
  migrateSessionIdentityState,
  storageKey,
  writeState,
} from "./dailyCheckInPersistence.js";
import {
  createEmptyState,
  createSimulationState,
  normalizeState,
  normalizeUserId,
} from "./dailyCheckInState.js";
import {
  millisecondsUntilNextEligibleDay,
  validateState,
} from "./dailyCheckInValidation.js";

export default function useDailyCheckIn({
  userId = "guest",
  simulationMode = false,
  identityReady: identityReadyOverride,
  isTemporaryIdentity: temporaryIdentityOverride,
} = {}) {
  const { user: authUser, profile, loading: authLoading, authReady } = useAuth();
  const resolvedUserId = normalizeUserId(userId);
  const authUserId = authUser?.id ? normalizeUserId(authUser.id) : null;
  const identityMatchesAuth = Boolean(authUserId && authUserId === resolvedUserId);
  const identityReady =
    simulationMode ||
    (typeof identityReadyOverride === "boolean"
      ? identityReadyOverride
      : Boolean(authReady && !authLoading && resolvedUserId !== "guest"));
  const isTemporaryIdentity =
    typeof temporaryIdentityOverride === "boolean"
      ? temporaryIdentityOverride
      : resolvedUserId === "guest" ||
        (identityMatchesAuth &&
          resolvedUserId === "local-dev-user" &&
          profile?.enrollment_source === "local_auth_fallback");
  const [todayKey, setTodayKey] = useState(() => getEligibleDayKey());
  const [checkInState, setCheckInState] = useState(() => {
    const initialTodayKey = getEligibleDayKey();
    if (simulationMode) return createSimulationState(resolvedUserId, initialTodayKey);
    if (!identityReady) return createEmptyState(resolvedUserId);
    return loadState(resolvedUserId, initialTodayKey);
  });
  const checkInLockRef = useRef(false);
  const temporaryIdentityIdsRef = useRef(
    new Set(isTemporaryIdentity || !identityReady ? [resolvedUserId] : []),
  );

  const validateStreak = useCallback(() => {
    const freshTodayKey = getEligibleDayKey();
    setTodayKey(freshTodayKey);

    if (simulationMode) {
      const nextSimulationState = createSimulationState(resolvedUserId, freshTodayKey);
      setCheckInState(nextSimulationState);
      return nextSimulationState;
    }

    if (!identityReady) {
      const unavailableState = createEmptyState(resolvedUserId);
      setCheckInState(unavailableState);
      return unavailableState;
    }

    const latestState = loadState(resolvedUserId, freshTodayKey);
    const validation = validateState(latestState, resolvedUserId, freshTodayKey);
    if (!validation.changed) {
      setCheckInState(validation.state);
      return validation.state;
    }

    const writeResult = writeState(
      resolvedUserId,
      validation.state,
      validation.reason,
      freshTodayKey,
    );
    const nextState = writeResult.ok ? writeResult.state : latestState;
    setCheckInState(nextState);
    return nextState;
  }, [identityReady, resolvedUserId, simulationMode]);

  useEffect(() => {
    const freshTodayKey = getEligibleDayKey();
    setTodayKey(freshTodayKey);

    if (simulationMode) {
      setCheckInState(createSimulationState(resolvedUserId, freshTodayKey));
      return undefined;
    }

    if (isTemporaryIdentity || !identityReady) {
      temporaryIdentityIdsRef.current.add(resolvedUserId);
    }

    if (!identityReady) {
      setCheckInState(createEmptyState(resolvedUserId));
      return undefined;
    }

    if (!isTemporaryIdentity) {
      for (const sourceUserId of [...temporaryIdentityIdsRef.current]) {
        if (sourceUserId === resolvedUserId) {
          temporaryIdentityIdsRef.current.delete(sourceUserId);
          continue;
        }

        const migrationResult = migrateSessionIdentityState(
          sourceUserId,
          resolvedUserId,
          freshTodayKey,
        );
        if (migrationResult.ok) {
          temporaryIdentityIdsRef.current.delete(sourceUserId);
        }
      }
    }

    validateStreak();

    if (typeof window === "undefined") return undefined;

    let eligibleDayTimer = null;
    const scheduleEligibleDayValidation = () => {
      if (eligibleDayTimer) window.clearTimeout(eligibleDayTimer);
      eligibleDayTimer = window.setTimeout(() => {
        validateStreak();
        scheduleEligibleDayValidation();
      }, millisecondsUntilNextEligibleDay());
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") validateStreak();
    };
    const handleStorage = (event) => {
      if (
        event.key &&
        event.key !== storageKey(resolvedUserId) &&
        event.key !== legacyStorageKey(resolvedUserId) &&
        event.key !== LEGACY_KEY
      ) {
        return;
      }
      validateStreak();
    };
    const handleLocalUpdate = (event) => {
      if (normalizeUserId(event?.detail?.userId) !== resolvedUserId) return;
      const eventTodayKey = getEligibleDayKey();
      setTodayKey(eventTodayKey);
      setCheckInState(
        normalizeState(event.detail.state, resolvedUserId, eventTodayKey),
      );
    };

    scheduleEligibleDayValidation();
    window.addEventListener("focus", validateStreak);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(UPDATE_EVENT, handleLocalUpdate);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (eligibleDayTimer) window.clearTimeout(eligibleDayTimer);
      window.removeEventListener("focus", validateStreak);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(UPDATE_EVENT, handleLocalUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    identityReady,
    isTemporaryIdentity,
    resolvedUserId,
    simulationMode,
    validateStreak,
  ]);

  const checkInToday = useCallback(() => {
    const freshTodayKey = getEligibleDayKey();
    setTodayKey(freshTodayKey);

    if (simulationMode) {
      const nextState = createSimulationState(resolvedUserId, freshTodayKey, true);
      setCheckInState(nextState);
      return buildResult("completed", nextState);
    }

    if (!identityReady || isTemporaryIdentity) {
      return buildResult(
        "identity_unavailable",
        createEmptyState(resolvedUserId),
      );
    }

    if (checkInLockRef.current) {
      const current = normalizeState(checkInState, resolvedUserId, freshTodayKey);
      const status = current.checkInEvents.some((event) => event.eligibleDay === freshTodayKey)
        ? "already_checked_in"
        : "busy";
      return buildResult(status, current);
    }

    checkInLockRef.current = true;
    try {
      const latestState = loadState(resolvedUserId, freshTodayKey);
      const validation = validateState(latestState, resolvedUserId, freshTodayKey);
      const result = performDailyCheckIn({
        value: validation.state,
        userId: resolvedUserId,
        todayKey: freshTodayKey,
        persist: (nextState, expectedEvent) =>
          writeState(resolvedUserId, nextState, "check_in", freshTodayKey, expectedEvent),
      });

      if (result.status === "completed" || result.status === "already_checked_in") {
        setCheckInState(result.state);
      } else if (result.status === "storage_error") {
        setCheckInState(latestState);
      }
      return result;
    } finally {
      checkInLockRef.current = false;
    }
  }, [checkInState, identityReady, isTemporaryIdentity, resolvedUserId, simulationMode]);

  const dismissPendingBubble = useCallback(
    (eventId = null) => {
      if (simulationMode || !identityReady) return;
      const freshTodayKey = getEligibleDayKey();
      const latestState = loadState(resolvedUserId, freshTodayKey);
      if (!latestState.pendingBubble) return;
      if (eventId && latestState.pendingBubble.id !== eventId) return;

      const writeResult = writeState(
        resolvedUserId,
        {
          ...latestState,
          pendingBubble: null,
          updatedAt: new Date().toISOString(),
        },
        "bubble_dismissed",
        freshTodayKey,
      );
      if (writeResult.ok) setCheckInState(writeResult.state);
    },
    [identityReady, resolvedUserId, simulationMode],
  );

  const displayState = useMemo(
    () =>
      checkInState.userId === resolvedUserId
        ? normalizeState(checkInState, resolvedUserId, todayKey)
        : createEmptyState(resolvedUserId),
    [checkInState, resolvedUserId, todayKey],
  );
  const { checkedInToday, challengeProgress, challengeDay, challengeDots } =
    deriveChallengeMetrics(displayState, todayKey);

  return {
    todayKey,
    checkedInToday,
    completedDates: displayState.completedDates,
    checkInEvents: displayState.checkInEvents,
    totalCompleted: challengeProgress,
    challengeProgress,
    challengeDay,
    challengeDots,
    challengeStatus: displayState.challengeStatus,
    completedCheckInDays: displayState.completedCheckInDays,
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