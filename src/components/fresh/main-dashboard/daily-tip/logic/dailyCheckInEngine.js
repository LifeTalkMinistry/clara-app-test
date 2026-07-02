import {
  addLocalDays,
  compareDateKeys,
} from "../../../../../lib/challenge-schedule.js";

export const MAX_VISIBLE_DAYS = 30;

export function isDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeDates(value, todayKey = null) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isDateKey))]
    .filter((dateKey) => !todayKey || compareDateKeys(dateKey, todayKey) <= 0)
    .sort(compareDateKeys);
}

export function calculateStreakEndingAtDate(completedDates, endDateKey) {
  if (!isDateKey(endDateKey)) return 0;
  const dateSet = new Set(normalizeDates(completedDates));
  let cursor = endDateKey;
  let streak = 0;
  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }
  return streak;
}

export function calculateActiveStreak(completedDates, todayKey) {
  const normalizedDates = normalizeDates(completedDates, todayKey);
  const dateSet = new Set(normalizedDates);
  const yesterdayKey = addLocalDays(todayKey, -1);
  const activeEndDate = dateSet.has(todayKey)
    ? todayKey
    : dateSet.has(yesterdayKey)
      ? yesterdayKey
      : null;
  return activeEndDate ? calculateStreakEndingAtDate(normalizedDates, activeEndDate) : 0;
}

export function calculateLongestStreak(completedDates) {
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

export function deriveCheckInStateFromDates({
  completedDates,
  todayKey,
  storedLongestStreak = 0,
}) {
  const normalizedDates = normalizeDates(completedDates, todayKey);
  const lastCheckInDate = normalizedDates[normalizedDates.length - 1] || null;
  const currentStreak = calculateActiveStreak(normalizedDates, todayKey);
  const activeEndDate = normalizedDates.includes(todayKey)
    ? todayKey
    : normalizedDates.includes(addLocalDays(todayKey, -1))
      ? addLocalDays(todayKey, -1)
      : null;
  const calculatedLongestStreak = calculateLongestStreak(normalizedDates);
  const validStoredLongest = Number.isFinite(Number(storedLongestStreak))
    ? Math.max(0, Math.floor(Number(storedLongestStreak)))
    : 0;

  return {
    completedDates: normalizedDates,
    currentStreak,
    lastCheckInDate,
    cycleStartedAt:
      currentStreak > 0 && activeEndDate
        ? addLocalDays(activeEndDate, -(currentStreak - 1))
        : null,
    calculatedLongestStreak,
    longestStreak: Math.max(calculatedLongestStreak, validStoredLongest),
  };
}

export function reconcileCheckInHistory(value, todayKey) {
  let completedDates = normalizeDates(value?.completedDates, todayKey);
  const verifiedLastCheckInDate =
    isDateKey(value?.lastCheckInDate) && compareDateKeys(value.lastCheckInDate, todayKey) <= 0
      ? value.lastCheckInDate
      : null;
  if (verifiedLastCheckInDate && !completedDates.includes(verifiedLastCheckInDate)) {
    completedDates = normalizeDates([...completedDates, verifiedLastCheckInDate], todayKey);
  }
  return deriveCheckInStateFromDates({
    completedDates,
    todayKey,
    storedLongestStreak: value?.longestStreak,
  });
}

export function deriveChallengeMetrics(state, todayKey, maxVisibleDays = MAX_VISIBLE_DAYS) {
  const checkedInToday = state.completedDates.includes(todayKey);
  const challengeProgress = Math.min(state.currentStreak, maxVisibleDays);
  const challengeDay =
    state.currentStreak >= maxVisibleDays
      ? maxVisibleDays
      : checkedInToday
        ? Math.max(1, state.currentStreak)
        : Math.min(maxVisibleDays, state.currentStreak + 1);
  return { checkedInToday, challengeProgress, challengeDay };
}
