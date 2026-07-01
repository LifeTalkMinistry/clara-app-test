import {
  addLocalDays,
  compareDateKeys,
} from "../../../../../lib/challenge-schedule.js";

export function isDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeDates(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isDateKey))].sort(compareDateKeys);
}

export function calculateActiveStreak(completedDates, todayKey) {
  const dateSet = new Set(normalizeDates(completedDates));
  let cursor = dateSet.has(todayKey) ? todayKey : addLocalDays(todayKey, -1);
  let streak = 0;

  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }

  return streak;
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

export function reconcileCheckInHistory(value, todayKey) {
  let completedDates = normalizeDates(value?.completedDates);
  const hasStoredLastCheckInDate = Object.prototype.hasOwnProperty.call(
    value || {},
    "lastCheckInDate",
  );
  const explicitLastCheckInDate = isDateKey(value?.lastCheckInDate)
    ? value.lastCheckInDate
    : null;

  // Older builds stored the streak counter and the date list separately. If one
  // write completed without the other, the two fields could drift and the card
  // could repeatedly fall back to Day 2. Repair that split record first.
  if (explicitLastCheckInDate && !completedDates.includes(explicitLastCheckInDate)) {
    completedDates = normalizeDates([...completedDates, explicitLastCheckInDate]);
  }

  const latestCompletedDate = completedDates[completedDates.length - 1] || null;
  const lastCheckInDate = explicitLastCheckInDate
    ? latestCompletedDate || explicitLastCheckInDate
    : hasStoredLastCheckInDate
      ? null
      : latestCompletedDate;
  const activeStreak = calculateActiveStreak(completedDates, todayKey);
  const storedCurrentStreak = Number.isFinite(Number(value?.currentStreak))
    ? Math.max(0, Math.floor(Number(value.currentStreak)))
    : 0;

  return {
    completedDates,
    lastCheckInDate,
    activeStreak,
    // Active consecutive dates are authoritative. When the streak is already
    // overdue, retain the old value long enough for validateState to create the
    // reset event and preserve the previous longest streak.
    currentStreak: activeStreak > 0 ? activeStreak : storedCurrentStreak,
  };
}
