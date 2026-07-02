import { getChallengeTimeZone } from "../../../../../lib/challenge-schedule.js";
import { reconcileCheckInHistory } from "./dailyCheckInEngine.js";
import { normalizeBubble } from "./dailyCheckInBubbles.js";

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
    lastResetForDate: null,
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
  const storedLifetime = Number.isFinite(Number(value?.lifetimeCheckIns))
    ? Math.max(0, Math.floor(Number(value.lifetimeCheckIns)))
    : 0;

  return {
    ...createEmptyState(userId),
    currentStreak: history.currentStreak,
    longestStreak: history.longestStreak,
    lifetimeCheckIns: Math.max(history.completedDates.length, storedLifetime),
    cycleStartedAt: history.cycleStartedAt,
    lastCheckInDate: history.lastCheckInDate,
    completedDates: history.completedDates,
    completedThirtyDays: Boolean(value?.completedThirtyDays) || history.longestStreak >= 30,
    completedThirtyDaysAt:
      typeof value?.completedThirtyDaysAt === "string" ? value.completedThirtyDaysAt : null,
    lastResetAt: typeof value?.lastResetAt === "string" ? value.lastResetAt : null,
    lastResetForDate:
      typeof value?.lastResetForDate === "string" ? value.lastResetForDate : null,
    pendingBubble: normalizeBubble(value?.pendingBubble),
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : null,
  };
}
