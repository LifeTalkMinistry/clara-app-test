import { addLocalDays, getChallengeTimeZone } from "@/lib/challenge-schedule";
import { calculateLongestStreak, isDateKey, reconcileCheckInHistory } from "./dailyCheckInEngine";
import { normalizeBubble } from "./dailyCheckInBubbles";

export const normalizeUserId = (userId) => String(userId || "").trim() || "guest";

export function createEmptyState(userId) {
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

export function createSimulationState(userId, todayKey, completedToday = false) {
  const state = createEmptyState(userId);
  if (!completedToday) return state;
  return {
    ...state,
    currentStreak: 1,
    longestStreak: 1,
    lifetimeCheckIns: 1,
    cycleStartedAt: todayKey,
    lastCheckInDate: todayKey,
    completedDates: [todayKey],
  };
}

export function normalizeState(value, userId, todayKey) {
  const history = reconcileCheckInHistory(value, todayKey);
  const storedLongest = Number.isFinite(Number(value?.longestStreak))
    ? Math.max(0, Math.floor(Number(value.longestStreak)))
    : 0;
  const currentStreak = history.currentStreak;
  const longestStreak = Math.max(currentStreak, calculateLongestStreak(history.completedDates), storedLongest);
  const storedLifetime = Number.isFinite(Number(value?.lifetimeCheckIns))
    ? Math.max(0, Math.floor(Number(value.lifetimeCheckIns)))
    : 0;
  let cycleStartedAt = null;
  if (currentStreak > 0 && isDateKey(value?.cycleStartedAt)) {
    cycleStartedAt = value.cycleStartedAt;
  } else if (currentStreak > 0 && history.lastCheckInDate) {
    cycleStartedAt = addLocalDays(history.lastCheckInDate, -(currentStreak - 1));
  }
  return {
    ...createEmptyState(userId),
    currentStreak,
    longestStreak,
    lifetimeCheckIns: Math.max(history.completedDates.length, storedLifetime),
    cycleStartedAt,
    lastCheckInDate: history.lastCheckInDate,
    completedDates: history.completedDates,
    completedThirtyDays: Boolean(value?.completedThirtyDays) || longestStreak >= 30,
    completedThirtyDaysAt: typeof value?.completedThirtyDaysAt === "string" ? value.completedThirtyDaysAt : null,
    lastResetAt: typeof value?.lastResetAt === "string" ? value.lastResetAt : null,
    pendingBubble: normalizeBubble(value?.pendingBubble),
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : null,
  };
}
