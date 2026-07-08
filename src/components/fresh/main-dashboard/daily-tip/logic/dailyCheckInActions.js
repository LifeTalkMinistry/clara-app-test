import { higherPriorityBubble, createBubble, selectMilestone } from "./dailyCheckInBubbles.js";
import {
  DAILY_CHECK_IN_EVENT_TYPE,
  DAILY_CHECK_IN_SOURCE,
  eventIdFor,
  normalizeCheckInEvents,
} from "./dailyCheckInEngine.js";
import { normalizeState } from "./dailyCheckInState.js";
import { getChallengeTimeZone } from "../../../../../lib/challenge-schedule.js";

export function prepareDailyCheckIn(value, userId, todayKey) {
  const baseState = normalizeState(value, userId, todayKey);
  const existingEvent = baseState.checkInEvents.find(
    (event) => event.eventType === DAILY_CHECK_IN_EVENT_TYPE && event.eligibleDay === todayKey,
  );

  if (existingEvent) {
    return buildResult("already_checked_in", baseState);
  }

  const nowIso = new Date().toISOString();
  const nextEvent = {
    eventId: eventIdFor(userId, todayKey),
    userId,
    eventType: DAILY_CHECK_IN_EVENT_TYPE,
    eligibleDay: todayKey,
    clientOccurredAt: nowIso,
    timezone: getChallengeTimeZone(),
    source: DAILY_CHECK_IN_SOURCE,
    createdAt: nowIso,
  };
  const checkInEvents = normalizeCheckInEvents(
    [...baseState.checkInEvents, nextEvent],
    userId,
    todayKey,
  );

  const derivedState = normalizeState(
    {
      ...baseState,
      challengeStartDay: baseState.challengeStartDay || todayKey,
      checkInEvents,
      updatedAt: nowIso,
    },
    userId,
    todayKey,
  );
  const milestoneType = selectMilestone({
    nextStreak: derivedState.currentStreak,
    previousLongest: baseState.longestStreak,
    completedThirtyDays: baseState.completedThirtyDays,
    hasResetHistory: Boolean(baseState.lastResetAt),
  });
  const milestoneBubble = milestoneType
    ? createBubble(milestoneType, derivedState.currentStreak, todayKey)
    : null;
  const nextState = normalizeState(
    {
      ...derivedState,
      completedThirtyDays:
        baseState.completedThirtyDays || derivedState.challengeStatus === "completed",
      completedThirtyDaysAt:
        derivedState.challengeStatus === "completed" && !baseState.completedThirtyDaysAt
          ? nowIso
          : baseState.completedThirtyDaysAt,
      pendingBubble: higherPriorityBubble(
        baseState.pendingBubble,
        milestoneBubble,
      ),
    },
    userId,
    todayKey,
  );

  return buildResult("prepared", nextState, milestoneType, milestoneBubble, baseState, nextEvent);
}

export function performDailyCheckIn({ value, userId, todayKey, persist }) {
  const prepared = prepareDailyCheckIn(value, userId, todayKey);
  if (prepared.status === "already_checked_in") return prepared;

  try {
    const persistenceResult = persist(prepared.state, prepared.event);
    if (!persistenceResult?.ok) {
      return buildResult("storage_error", prepared.baseState);
    }
    return buildResult(
      "completed",
      persistenceResult.state,
      prepared.milestoneType,
      prepared.bubbleEvent,
    );
  } catch {
    return buildResult("storage_error", prepared.baseState);
  }
}

export function buildResult(
  status,
  state,
  milestoneType = null,
  bubbleEvent = null,
  baseState = null,
  event = null,
) {
  return {
    status,
    currentStreak: state.currentStreak,
    longestStreak: state.longestStreak,
    challengeStatus: state.challengeStatus,
    challengeCurrentDay: state.challengeCurrentDay,
    completedCheckInDays: state.completedCheckInDays,
    milestoneType,
    bubbleEvent,
    state,
    baseState,
    event,
  };
}