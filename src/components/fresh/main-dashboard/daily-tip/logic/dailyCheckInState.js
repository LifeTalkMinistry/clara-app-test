import {
  getChallengeTimeZone,
  getEligibleDayBoundaryHour,
  isRealDateKey,
} from "../../../../../lib/challenge-schedule.js";
import {
  reconcileCheckInHistory,
} from "./dailyCheckInEngine.js";
import { normalizeBubble } from "./dailyCheckInBubbles.js";

export const normalizeUserId = (userId) => String(userId || "").trim() || "guest";

export function createEmptyState(userId) {
  return {
    version: 3,
    userId: normalizeUserId(userId),
    timezone: getChallengeTimeZone(),
    eligibleDayBoundaryHour: getEligibleDayBoundaryHour(),

    challengeStartDay: null,
    challengeCurrentDay: 0,
    challengeEndDay: null,
    challengeStatus: "not_started",
    completedCheckInDays: 0,

    currentStreak: 0,
    longestStreak: 0,
    lifetimeCheckIns: 0,
    cycleStartedAt: null,
    lastCheckInDay: null,
    lastCheckInDate: null,
    streakStatus: "not_started",

    checkInEvents: [],

    completedDates: [],
    completedThirtyDays: false,
    completedThirtyDaysAt: null,

    lastResetAt: null,
    lastResetForDay: null,
    lastResetForDate: null,
    pendingBubble: null,
    updatedAt: null,
  };
}

export function createSimulationState(userId, todayKey, completedToday = false) {
  const state = createEmptyState(userId);
  if (!completedToday) {
    return {
      ...state,
      challengeStartDay: todayKey,
      cycleStartedAt: todayKey,
      challengeCurrentDay: 1,
      challengeEndDay: todayKey,
      challengeStatus: "active",
    };
  }

  return normalizeState(
    {
      ...state,
      challengeStartDay: todayKey,
      cycleStartedAt: todayKey,
      checkInEvents: [
        {
          eventId: `daily_check_in:${normalizeUserId(userId)}:${todayKey}`,
          userId: normalizeUserId(userId),
          eventType: "daily_check_in",
          eligibleDay: todayKey,
          clientOccurredAt: new Date().toISOString(),
          timezone: getChallengeTimeZone(),
          source: "daily_check_in_card_flip",
          createdAt: new Date().toISOString(),
        },
      ],
    },
    userId,
    todayKey,
  );
}

export function normalizeState(value, userId, todayKey) {
  const resolvedUserId = normalizeUserId(userId || value?.userId);
  const history = reconcileCheckInHistory(value || {}, todayKey, resolvedUserId);
  const storedLifetime = Number.isFinite(Number(value?.lifetimeCheckIns))
    ? Math.max(0, Math.floor(Number(value.lifetimeCheckIns)))
    : 0;
  const completedThirtyDays = Boolean(value?.completedThirtyDays) || history.completedThirtyDays;
  const completedThirtyDaysAt =
    typeof value?.completedThirtyDaysAt === "string"
      ? value.completedThirtyDaysAt
      : completedThirtyDays && history.challengeStatus === "completed"
        ? new Date().toISOString()
        : null;
  const lastResetForDay =
    typeof value?.lastResetForDay === "string"
      ? value.lastResetForDay
      : typeof value?.lastResetForDate === "string"
        ? value.lastResetForDate
        : null;

  return {
    ...createEmptyState(resolvedUserId),
    userId: resolvedUserId,
    challengeStartDay: isRealDateKey(history.challengeStartDay) ? history.challengeStartDay : null,
    cycleStartedAt: isRealDateKey(history.challengeStartDay) ? history.challengeStartDay : null,
    challengeCurrentDay: history.challengeCurrentDay,
    challengeEndDay: isRealDateKey(history.challengeEndDay) ? history.challengeEndDay : null,
    challengeStatus: history.challengeStatus,
    completedCheckInDays: history.completedCheckInDays,

    currentStreak: history.currentStreak,
    longestStreak: history.longestStreak,
    lifetimeCheckIns: Math.max(history.lifetimeCheckIns, storedLifetime),
    lastCheckInDay: history.lastCheckInDay,
    lastCheckInDate: history.lastCheckInDay,
    streakStatus:
      history.currentStreak > 0
        ? "active"
        : history.lastCheckInDay
          ? "reset"
          : "not_started",

    checkInEvents: history.checkInEvents,
    completedDates: history.completedDates,

    completedThirtyDays,
    completedThirtyDaysAt,
    lastResetAt: typeof value?.lastResetAt === "string" ? value.lastResetAt : null,
    lastResetForDay,
    lastResetForDate: lastResetForDay,
    pendingBubble: normalizeBubble(value?.pendingBubble),
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : null,
  };
}