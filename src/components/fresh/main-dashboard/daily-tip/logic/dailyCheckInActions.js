import { higherPriorityBubble, createBubble, selectMilestone } from "./dailyCheckInBubbles.js";
import { normalizeDates } from "./dailyCheckInEngine.js";
import { normalizeState } from "./dailyCheckInState.js";

export function prepareDailyCheckIn(value, userId, todayKey) {
  const baseState = normalizeState(value, userId, todayKey);
  if (baseState.completedDates.includes(todayKey)) {
    return buildResult("already_checked_in", baseState);
  }

  const completedDates = normalizeDates(
    [...baseState.completedDates, todayKey],
    todayKey,
  );
  const nowIso = new Date().toISOString();
  const derivedState = normalizeState(
    {
      ...baseState,
      completedDates,
      lifetimeCheckIns: Math.max(
        completedDates.length,
        baseState.lifetimeCheckIns + 1,
      ),
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
        baseState.completedThirtyDays || derivedState.currentStreak >= 30,
      completedThirtyDaysAt:
        derivedState.currentStreak >= 30 && !baseState.completedThirtyDaysAt
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

  return buildResult("prepared", nextState, milestoneType, milestoneBubble, baseState);
}

export function performDailyCheckIn({ value, userId, todayKey, persist }) {
  const prepared = prepareDailyCheckIn(value, userId, todayKey);
  if (prepared.status === "already_checked_in") return prepared;

  try {
    const persistenceResult = persist(prepared.state);
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
) {
  return {
    status,
    currentStreak: state.currentStreak,
    longestStreak: state.longestStreak,
    milestoneType,
    bubbleEvent,
    state,
    baseState,
  };
}
