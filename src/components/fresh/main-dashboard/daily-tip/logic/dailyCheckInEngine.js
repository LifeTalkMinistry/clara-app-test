import {
  addLocalDays,
  compareDateKeys,
  daysBetweenDateKeys,
  isValidDateKey,
} from "../../../../../lib/challenge-schedule.js";

export const MAX_VISIBLE_DAYS = 30;
export const EVENT_TYPE = "daily_check_in";
export const EVENT_SOURCE_CARD_FLIP = "daily_check_in_card_flip";
export const EVENT_SOURCE_MIGRATION = "legacy_v2_migration";

export function isDateKey(value) {
  return isValidDateKey(value);
}

export function normalizeDates(value, todayKey = null) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isDateKey))]
    .filter((dateKey) => !todayKey || compareDateKeys(dateKey, todayKey) <= 0)
    .sort(compareDateKeys);
}

export function buildDailyCheckInEventId(userId, eligibleDay) {
  return `daily_check_in:${String(userId || "").trim()}:${eligibleDay}`;
}

export function createDailyCheckInEvent({ userId, eligibleDay, source = EVENT_SOURCE_CARD_FLIP, now = new Date() }) {
  const createdAt = now.toISOString();
  return {
    eventId: buildDailyCheckInEventId(userId, eligibleDay),
    userId: String(userId || "").trim(),
    eventType: EVENT_TYPE,
    eligibleDay,
    clientOccurredAt: createdAt,
    timezone: "Asia/Manila",
    source,
    createdAt,
  };
}

export function normalizeCheckInEvents(value, userId, todayKey = null) {
  const events = Array.isArray(value) ? value : [];
  const byDay = new Map();

  events.forEach((event) => {
    const eligibleDay = event?.eligibleDay;
    if (!isDateKey(eligibleDay)) return;
    if (todayKey && compareDateKeys(eligibleDay, todayKey) > 0) return;
    const eventType = event?.eventType || EVENT_TYPE;
    if (eventType !== EVENT_TYPE) return;
    if (byDay.has(eligibleDay)) return;
    byDay.set(eligibleDay, {
      eventId: event?.eventId || buildDailyCheckInEventId(userId, eligibleDay),
      userId,
      eventType: EVENT_TYPE,
      eligibleDay,
      clientOccurredAt: typeof event?.clientOccurredAt === "string" ? event.clientOccurredAt : null,
      timezone: "Asia/Manila",
      source: typeof event?.source === "string" ? event.source : EVENT_SOURCE_CARD_FLIP,
      createdAt: typeof event?.createdAt === "string" ? event.createdAt : null,
    });
  });

  return [...byDay.values()].sort((left, right) => compareDateKeys(left.eligibleDay, right.eligibleDay));
}

export function eventDays(checkInEvents, todayKey = null) {
  return normalizeDates(checkInEvents.map((event) => event.eligibleDay), todayKey);
}

export function calculateStreakEndingAtDate(completedDates, endDateKey) {
  if (!isDateKey(endDateKey)) return 0;
  const dateSet = new Set(normalizeDates(completedDates));
  let cursor = endDateKey;
  let streak = 0;
  while (cursor && dateSet.has(cursor)) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }
  return streak;
}

export function calculateActiveStreak(completedDates, todayKey) {
  const normalizedDates = normalizeDates(completedDates, todayKey);
  const dateSet = new Set(normalizedDates);
  const yesterdayKey = addLocalDays(todayKey, -1);
  const activeEndDate = dateSet.has(todayKey)
    ? todayKey
    : dateSet.has(yesterdayKey)
      ? yesterdayKey
      : null;
  return activeEndDate ? calculateStreakEndingAtDate(normalizedDates, activeEndDate) : 0;
}

export function calculateLongestStreak(completedDates) {
  let longest = 0;
  let running = 0;
  let previousDate = null;
  normalizeDates(completedDates).forEach((dateKey) => {
    running = previousDate && addLocalDays(previousDate, 1) === dateKey ? running + 1 : 1;
    longest = Math.max(longest, running);
    previousDate = dateKey;
  });
  return longest;
}

export function deriveCheckInStateFromEvents({
  checkInEvents,
  todayKey,
  storedLongestStreak = 0,
  storedLifetimeCheckIns = 0,
}) {
  const completedDates = eventDays(checkInEvents, todayKey);
  const lastCheckInDay = completedDates[completedDates.length - 1] || null;
  const currentStreak = calculateActiveStreak(completedDates, todayKey);
  const activeEndDate = completedDates.includes(todayKey)
    ? todayKey
    : completedDates.includes(addLocalDays(todayKey, -1))
      ? addLocalDays(todayKey, -1)
      : null;
  const calculatedLongestStreak = calculateLongestStreak(completedDates);
  const validStoredLongest = Number.isFinite(Number(storedLongestStreak))
    ? Math.max(0, Math.floor(Number(storedLongestStreak)))
    : 0;
  const validStoredLifetime = Number.isFinite(Number(storedLifetimeCheckIns))
    ? Math.max(0, Math.floor(Number(storedLifetimeCheckIns)))
    : 0;

  return {
    completedDates,
    currentStreak,
    lastCheckInDay,
    lastCheckInDate: lastCheckInDay,
    cycleStartedAt:
      currentStreak > 0 && activeEndDate
        ? addLocalDays(activeEndDate, -(currentStreak - 1))
        : null,
    calculatedLongestStreak,
    longestStreak: Math.max(calculatedLongestStreak, validStoredLongest),
    lifetimeCheckIns: Math.max(completedDates.length, validStoredLifetime),
  };
}

export function deriveCheckInStateFromDates({ completedDates, todayKey, storedLongestStreak = 0 }) {
  const checkInEvents = normalizeDates(completedDates, todayKey).map((eligibleDay) =>
    createDailyCheckInEvent({ userId: "legacy", eligibleDay, source: EVENT_SOURCE_MIGRATION }),
  );
  return deriveCheckInStateFromEvents({ checkInEvents, todayKey, storedLongestStreak });
}

export function reconcileCheckInHistory(value, todayKey, userId = value?.userId || "guest") {
  const legacyDates = normalizeDates(value?.completedDates, todayKey);
  const explicitEvents = normalizeCheckInEvents(value?.checkInEvents, userId, todayKey);
  const explicitDays = new Set(explicitEvents.map((event) => event.eligibleDay));
  const migratedLegacyEvents = legacyDates
    .filter((eligibleDay) => !explicitDays.has(eligibleDay))
    .map((eligibleDay) => createDailyCheckInEvent({ userId, eligibleDay, source: EVENT_SOURCE_MIGRATION }));
  const checkInEvents = normalizeCheckInEvents(
    [...explicitEvents, ...migratedLegacyEvents],
    userId,
    todayKey,
  );

  return {
    checkInEvents,
    ...deriveCheckInStateFromEvents({
      checkInEvents,
      todayKey,
      storedLongestStreak: value?.longestStreak,
      storedLifetimeCheckIns: value?.lifetimeCheckIns,
    }),
  };
}

export function calculateChallengeEndDay(challengeStartDay) {
  return isDateKey(challengeStartDay) ? addLocalDays(challengeStartDay, MAX_VISIBLE_DAYS - 1) : null;
}

export function calculateChallengeCurrentDay(challengeStartDay, todayKey) {
  if (!isDateKey(challengeStartDay) || !isDateKey(todayKey)) return 0;
  const rawDay = daysBetweenDateKeys(challengeStartDay, todayKey) + 1;
  return Math.max(1, Math.min(MAX_VISIBLE_DAYS, rawDay));
}

export function calculateCompletedCheckInDays(completedDates, challengeStartDay, challengeEndDay) {
  if (!isDateKey(challengeStartDay) || !isDateKey(challengeEndDay)) return 0;
  return normalizeDates(completedDates).filter(
    (dateKey) => compareDateKeys(dateKey, challengeStartDay) >= 0 && compareDateKeys(dateKey, challengeEndDay) <= 0,
  ).length;
}

export function deriveChallengeState({ state, todayKey }) {
  const completedDates = normalizeDates(state?.completedDates, todayKey);
  const challengeStartDay = isDateKey(state?.challengeStartDay)
    ? state.challengeStartDay
    : isDateKey(state?.cycleStartedAt)
      ? state.cycleStartedAt
      : isDateKey(state?.lastCheckInDay || state?.lastCheckInDate)
        ? state.lastCheckInDay || state.lastCheckInDate
        : null;

  if (!challengeStartDay) {
    return {
      challengeStartDay: null,
      challengeCurrentDay: 0,
      challengeEndDay: null,
      challengeStatus: "not_started",
      completedCheckInDays: 0,
      completedThirtyDays: Boolean(state?.completedThirtyDays),
      completedThirtyDaysAt: typeof state?.completedThirtyDaysAt === "string" ? state.completedThirtyDaysAt : null,
    };
  }

  const challengeEndDay = calculateChallengeEndDay(challengeStartDay);
  const challengeCurrentDay = calculateChallengeCurrentDay(challengeStartDay, todayKey);
  const completedCheckInDays = calculateCompletedCheckInDays(completedDates, challengeStartDay, challengeEndDay);
  const isCalendarComplete = compareDateKeys(todayKey, challengeEndDay) >= 0;
  const completedThirtyDays = Boolean(state?.completedThirtyDays) || isCalendarComplete;

  return {
    challengeStartDay,
    challengeCurrentDay,
    challengeEndDay,
    challengeStatus: completedThirtyDays ? "completed" : "active",
    completedCheckInDays,
    completedThirtyDays,
    completedThirtyDaysAt:
      completedThirtyDays && typeof state?.completedThirtyDaysAt === "string"
        ? state.completedThirtyDaysAt
        : null,
  };
}

export function deriveChallengeMetrics(state, todayKey, maxVisibleDays = MAX_VISIBLE_DAYS) {
  const completedDates = normalizeDates(state.completedDates, todayKey);
  const checkedInToday = completedDates.includes(todayKey);
  const challengeCurrentDay = Math.min(maxVisibleDays, Math.max(0, Number(state.challengeCurrentDay || 0)));
  const challengeDay = challengeCurrentDay || 1;
  const challengeProgress = Math.min(maxVisibleDays, Math.max(0, Number(state.completedCheckInDays || 0)));
  const challengeStartDay = state.challengeStartDay;
  const challengeDotStates = Array.from({ length: maxVisibleDays }).map((_, index) => {
    const dotDay = challengeStartDay ? addLocalDays(challengeStartDay, index) : null;
    const completed = dotDay ? completedDates.includes(dotDay) : false;
    const dayNumber = index + 1;
    const isToday = Boolean(
      dotDay &&
      challengeCurrentDay === dayNumber &&
      state.challengeStatus !== "completed" &&
      !completed,
    );
    const isPast = Boolean(dotDay && challengeCurrentDay > dayNumber && !completed);
    return {
      dayNumber,
      dateKey: dotDay,
      completed,
      today: isToday,
      pastMissed: isPast,
      future: Boolean(dotDay && challengeCurrentDay < dayNumber),
    };
  });

  return {
    checkedInToday,
    challengeProgress,
    challengeDay,
    challengeCurrentDay,
    challengeDotStates,
  };
}
