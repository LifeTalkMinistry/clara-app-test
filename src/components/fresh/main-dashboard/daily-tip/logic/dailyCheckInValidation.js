import { addLocalDays, compareDateKeys, getLocalDateKey } from "@/lib/challenge-schedule";
import { createBubble, higherPriorityBubble } from "./dailyCheckInBubbles";
import { normalizeState } from "./dailyCheckInState";

export function validateState(value, userId, todayKey) {
  const state = normalizeState(value, userId, todayKey);
  if (!state.lastCheckInDate) return { state, changed: false, reason: "validation" };

  const yesterdayKey = addLocalDays(todayKey, -1);
  if (
    state.completedDates.includes(todayKey) ||
    state.completedDates.includes(yesterdayKey) ||
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

export function millisecondsUntilNextManilaMidnight(now = new Date()) {
  const tomorrowKey = addLocalDays(getLocalDateKey(now), 1);
  return Math.max(1000, Date.parse(`${tomorrowKey}T00:00:00+08:00`) - now.getTime() + 1000);
}
