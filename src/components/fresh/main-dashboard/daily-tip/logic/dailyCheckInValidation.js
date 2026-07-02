import { addLocalDays, getLocalDateKey } from "../../../../../lib/challenge-schedule.js";
import { createBubble, higherPriorityBubble } from "./dailyCheckInBubbles.js";
import { calculateStreakEndingAtDate } from "./dailyCheckInEngine.js";
import { normalizeState } from "./dailyCheckInState.js";

export function validateState(value, userId, todayKey) {
  const state = normalizeState(value, userId, todayKey);
  const latestCompletedDate = state.lastCheckInDate;
  if (!latestCompletedDate) return { state, changed: false, reason: "validation" };

  const yesterdayKey = addLocalDays(todayKey, -1);
  if (state.completedDates.includes(todayKey) || state.completedDates.includes(yesterdayKey)) {
    return { state, changed: false, reason: "validation" };
  }

  if (state.lastResetForDate === latestCompletedDate) {
    return { state, changed: false, reason: "validation" };
  }

  const previousStreak = calculateStreakEndingAtDate(state.completedDates, latestCompletedDate);
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
        longestStreak: Math.max(state.longestStreak, previousStreak),
        lastResetAt: nowIso,
        lastResetForDate: latestCompletedDate,
        pendingBubble: higherPriorityBubble(state.pendingBubble, resetBubble),
        updatedAt: nowIso,
      },
      userId,
      todayKey,
    ),
  };
}

export function millisecondsUntilNextManilaMidnight(now = new Date()) {
  const tomorrowKey = addLocalDays(getLocalDateKey(now), 1);
  return Math.max(1000, Date.parse(`${tomorrowKey}T00:00:00+08:00`) - now.getTime() + 1000);
}
