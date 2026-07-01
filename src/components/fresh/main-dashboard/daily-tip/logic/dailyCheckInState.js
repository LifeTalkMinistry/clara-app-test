import { addLocalDays, getChallengeTimeZone } from "@/lib/challenge-schedule";
import {
  calculateLongestStreak,
  isDateKey,
  reconcileCheckInHistory,
} from "./dailyCheckInEngine";
import { normalizeBubble } from "./dailyCheckInBubbles";

export function normalizeUserId(userId) {
  return String(userId || "").trim() || "guest";
}

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

export function normalizeState(value, userId, todayKey) {
  const base = createEmptyState(userId);
  const history = reconcileCheckInHistory(value, todayKey);
  const currentStreak = history.currentStreak;
  const longestStreak = Math.max(
    currentStreak,
    calculateLongestStreak(history.completedDates),
    Number.isFinite(Number(value?.longestStreak))
      ? Math.max(0, Math.floor(Number(value.longestStreak)))
      : 0,
  );

  return {
    ...base,
    currentStreak,
    longestStreak,
    lifetimeCheckIns: Math.max(
      history.completedDates.length,
      Number.isFinite(Number(value?.lifetimeCheckIns))
        ? Math.max(0, Math.floor(Number(value.lifetimeCheckIns)))
        : 0,
    ),
    cycleStartedAt:
      currentStreak > 0 && isDateKey(value?.cycleStartedAt)
        ? value.cycleStartedAt
        : currentStreak > 0 && history.lastCheckInDate
          ? addLocalDays(history.lastCheckInDate, -(currentStreak - 1))
          : null,
    lastCheckInDate: history.lastCheckInDate,
    completedDates: history.completedDates,
    completedThirtyDays: Boolean(value?.completedThirtyDays) || longestStreak >= 30,
    completedThirtyDaysAt:
      typeof value?.completedThirtyDaysAt === "string" ? value.completedThirtyDaysAt : null,
    lastResetAt: typeof value?.lastResetAt === "string" ? value.lastResetAt : null,
    pendingBubble: normalizeBubble(value?.pendingBubble),
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : null,
  };
}
