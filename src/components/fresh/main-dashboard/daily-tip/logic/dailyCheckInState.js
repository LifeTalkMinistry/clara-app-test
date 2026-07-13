import {
  getChallengeTimeZone,
  getEligibleDayBoundaryHour,
  isValidDateKey,
} from "../../../../../lib/challenge-schedule.js";
import {
  createDailyCheckInEvent,
  deriveChallengeState,
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
  const checkInEvents = completedToday
    ? [createDailyCheckInEvent({ userId: normalizeUserId(userId), eligibleDay: todayKey })]
    : [];
  return normalizeState(
    {
      ...state,
      challengeStartDay: todayKey,
      cycleStartedAt: todayKey,
      checkInEvents,
    },
    userId,
    todayKey,
  );
}

function resolveChallengeStart(value, history) {
  if (Boolean(value?.completedThirtyDays)) {
    if (isValidDateKey(value?.challengeStartDay)) return value.challengeStartDay;
    if (history.completedDates.length >= 30) {
      return history.completedDates[Math.max(0, history.completedDates.length - 30)];
    }
  }

  if (history.currentStreak > 0 && isValidDateKey(history.cycleStartedAt)) {
    return history.cycleStartedAt;
  }

  return null;
}

export function normalizeState(value, userId, todayKey) {
  const resolvedUserId = normalizeUserId(userId || value?.userId);
  const history = reconcileCheckInHistory(value || {}, todayKey, resolvedUserId);
  const challengeStartDay = resolveChallengeStart(value || {}, history);
  const challenge = deriveChallengeState({
    state: {
      ...(value || {}),
      challengeStartDay,
      cycleStartedAt: challengeStartDay,
      completedDates: history.completedDates,
    },
    todayKey,
  });
  const completedThirtyDays = Boolean(value?.completedThirtyDays) || challenge.completedThirtyDays;
  const nowIso = new Date().toISOString();
  const completedThirtyDaysAt =
    typeof value?.completedThirtyDaysAt === "string"
      ? value.completedThirtyDaysAt
      : completedThirtyDays
        ? nowIso
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

    challengeStartDay: challenge.challengeStartDay,
    cycleStartedAt: challenge.challengeStartDay,
    challengeCurrentDay: challenge.challengeCurrentDay,
    challengeEndDay: challenge.challengeEndDay,
    challengeStatus: challenge.challengeStatus,
    completedCheckInDays: challenge.completedCheckInDays,

    currentStreak: history.currentStreak,
    longestStreak: history.longestStreak,
    lifetimeCheckIns: history.lifetimeCheckIns,
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
