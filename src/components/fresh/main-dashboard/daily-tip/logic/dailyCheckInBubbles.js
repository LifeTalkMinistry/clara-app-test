const PRIORITY = {
  streak_30_completed: 5,
  streak_reset: 4,
  streak_14_day: 3,
  streak_7_day: 2,
  new_longest_streak: 1,
};

export function selectMilestone({ nextStreak, previousLongest, completedThirtyDays, hasResetHistory }) {
  if (nextStreak === 30 && !completedThirtyDays) return "streak_30_completed";
  if (nextStreak === 14) return "streak_14_day";
  if (nextStreak === 7) return "streak_7_day";
  if (hasResetHistory && previousLongest > 0 && nextStreak > previousLongest) return "new_longest_streak";
  return null;
}

export function createBubble(type, streakCount, dateKey) {
  return {
    id: `${type}:${dateKey}:${streakCount}:${Date.now()}`,
    type,
    previousStreak: streakCount,
    streakCount,
    createdAt: new Date().toISOString(),
  };
}

export function normalizeBubble(value) {
  if (!value || !PRIORITY[value.type] || typeof value.id !== "string") return null;
  return {
    id: value.id,
    type: value.type,
    previousStreak: Math.max(0, Number(value.previousStreak) || 0),
    streakCount: Math.max(0, Number(value.streakCount) || 0),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
  };
}

export function higherPriorityBubble(currentValue, candidateValue) {
  const current = normalizeBubble(currentValue);
  const candidate = normalizeBubble(candidateValue);
  if (!current) return candidate;
  if (!candidate) return current;
  return PRIORITY[candidate.type] > PRIORITY[current.type] ? candidate : current;
}
