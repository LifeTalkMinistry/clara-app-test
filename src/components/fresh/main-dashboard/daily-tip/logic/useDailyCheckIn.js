import { useCallback, useEffect, useMemo, useState } from "react";

const CHECK_IN_STORAGE_KEY = "clara_daily_check_in_v1";
const MAX_VISIBLE_DAYS = 30;

export default function useDailyCheckIn({ simulationMode = false } = {}) {
  const todayKey = useMemo(() => getTodayKey(), []);
  const [checkInState, setCheckInState] = useState(() =>
    simulationMode ? createSimulationCheckInState(todayKey) : readCheckInState(todayKey)
  );

  useEffect(() => {
    if (simulationMode) {
      setCheckInState(createSimulationCheckInState(todayKey));
      return undefined;
    }

    const syncCheckInState = () => setCheckInState(readCheckInState(todayKey));

    syncCheckInState();

    if (typeof window === "undefined") return undefined;

    window.addEventListener("storage", syncCheckInState);
    return () => window.removeEventListener("storage", syncCheckInState);
  }, [simulationMode, todayKey]);

  const completedDates = useMemo(
    () => normalizeCompletedDates(checkInState.completedDates),
    [checkInState.completedDates]
  );
  const checkedInToday = completedDates.includes(todayKey);
  const totalCompleted = Math.min(completedDates.length, MAX_VISIBLE_DAYS);
  const challengeDay = checkedInToday
    ? Math.min(Math.max(totalCompleted, 1), MAX_VISIBLE_DAYS)
    : Math.min(totalCompleted + 1, MAX_VISIBLE_DAYS);
  const currentStreak = useMemo(
    () => calculateCurrentStreak(completedDates, todayKey),
    [completedDates, todayKey]
  );

  const checkInToday = useCallback(() => {
    if (simulationMode) {
      const nextState = createSimulationCheckInState(todayKey, true);
      setCheckInState(nextState);
      return nextState;
    }

    let nextState = null;

    setCheckInState((currentState) => {
      const latestStoredState = readCheckInState(todayKey);
      const baseState = latestStoredState || normalizeCheckInState(currentState, todayKey);
      const baseCompletedDates = normalizeCompletedDates(baseState.completedDates);

      if (baseCompletedDates.includes(todayKey)) {
        nextState = {
          ...baseState,
          completedDates: baseCompletedDates,
          lastCheckInDate: todayKey,
        };
        return nextState;
      }

      const completedDatesWithToday = normalizeCompletedDates([...baseCompletedDates, todayKey]);
      nextState = {
        startedAt: baseState.startedAt || completedDatesWithToday[0] || todayKey,
        completedDates: completedDatesWithToday,
        lastCheckInDate: todayKey,
      };

      writeCheckInState(nextState);
      return nextState;
    });

    return nextState;
  }, [simulationMode, todayKey]);

  return {
    todayKey,
    checkedInToday,
    completedDates,
    totalCompleted,
    challengeDay,
    currentStreak,
    checkInToday,
  };
}

function createSimulationCheckInState(todayKey, completedToday = false) {
  return {
    startedAt: todayKey,
    completedDates: completedToday ? [todayKey] : [],
    lastCheckInDate: completedToday ? todayKey : null,
  };
}

function readCheckInState(todayKey) {
  const stored = safeGet(CHECK_IN_STORAGE_KEY);
  return normalizeCheckInState(safeParse(stored), todayKey);
}

function writeCheckInState(state) {
  safeSet(CHECK_IN_STORAGE_KEY, JSON.stringify(state));
}

function normalizeCheckInState(value, todayKey) {
  const completedDates = normalizeCompletedDates(value?.completedDates);
  const startedAt = isDateKey(value?.startedAt)
    ? value.startedAt
    : completedDates[0] || todayKey;
  const lastCheckInDate = isDateKey(value?.lastCheckInDate)
    ? value.lastCheckInDate
    : completedDates[completedDates.length - 1] || null;

  return {
    startedAt,
    completedDates,
    lastCheckInDate,
  };
}

function normalizeCompletedDates(value) {
  if (!Array.isArray(value)) return [];

  return [...new Set(value.filter(isDateKey))].sort();
}

function calculateCurrentStreak(completedDates, todayKey) {
  const completedDateSet = new Set(completedDates);
  const streakEndDate = completedDateSet.has(todayKey) ? todayKey : shiftDateKey(todayKey, -1);
  let cursor = streakEndDate;
  let streak = 0;

  while (completedDateSet.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return streak;
}

function shiftDateKey(dateKey, dayOffset) {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;

  date.setDate(date.getDate() + dayOffset);
  return formatDateKey(date);
}

function getTodayKey() {
  return formatDateKey(new Date());
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function parseDateKey(value) {
  if (!isDateKey(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
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
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Keep the card working even if storage is blocked.
  }
}

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
