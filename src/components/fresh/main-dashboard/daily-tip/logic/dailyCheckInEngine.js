import {
  addLocalDays,
  compareDateKeys,
  daysBetweenDateKeys,
  getChallengeTimeZone,
  isRealDateKey,
} from "../../../../../lib/challenge-schedule.js";

export const MAX_VISIBLE_DAYS = 30;
export const DAILY_CHECK_IN_EVENT_TYPE = "daily_check_in";
export const DAILY_CHECK_IN_SOURCE = "daily_check_in_card_flip";
export const MIGRATION_SOURCE = "legacy_v2_migration";

export function isDateKey(value) {
  return isRealDateKey(value);
}

export function normalizeDates(value, todayKey = null) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isDateKey))]
    .filter((dateKey) => !todayKey || compareDateKeys(dateKey, todayKey) <= 0)
    .sort(compareDateKeys);
}

export function eventIdFor(userId, eligibleDay) {
  const safeUserId = String(userId || "").trim().replace(/[^a-zA-Z0-9_.:-]/g, "_") || "guest";
  return `${DAILY_CHECK_IN_EVENT_TYPE}:${safeUserId}:${eligibleDay}`;
}

export function normalizeCheckInEvents(events, userId, todayKey = null) {
  if (!Array.isArray(events)) return [];
  const byId = new Map();

  events.forEach((event) => {
    const eligibleDay = event?.eligibleDay;
    if (!isDateKey(eligibleDay)) return;
    if (todayKey && compareDateKeys(eligibleDay, todayKey) > 0) return;

    const normalizedUserId = userId || event?.userId || "guest";
    const normalized = {
      eventId: event?.eventId || eventIdFor(normalizedUserId, eligibleDay),
      userId: normalizedUserId,
      eventType: DAILY_CHECK_IN_EVENT_TYPE,
      eligibleDay,
      clientOccurredAt:
        typeof event?.clientOccurredAt === "string" ? event.clientOccurredAt : null,
      timezone: getChallengeTimeZone(),
      source:
        typeof event?.source === "string" && event.source
          ? event.source
          : DAILY_CHECK_IN_SOURCE,
      createdAt: typeof event?.createdAt === "string" ? event.createdAt : null,
    };
    byId.set(eventIdFor(normalizedUserId, eligibleDay), normalized);
  });

  return [...byId.values()].sort((a, b) => compareDateKeys(a.eligibleDay, b.eligibleDay));
}

export function eventsFromDates(completedDates, userId, source = MIGRATION_SOURCE) {
  return normalizeDates(completedDates).map((eligibleDay) => ({
    eventId: eventIdFor(userId, eligibleDay),
    userId,
    eventType: DAILY_CHECK_IN_EVENT_TYPE,
    eligibleDay,
    clientOccurredAt: `${eligibleDay}T06:00:00+08:00`,
    timezone: getChallengeTimeZone(),
    source,
    createdAt: new Date().toISOString(),
  }));
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
  challengeStartDay = null,
  completedThirtyDays = false,
}) {
  const normalizedEvents = normalizeCheckInEvents(checkInEvents, null, todayKey);
  const completedDates = normalizeDates(normalizedEvents.map((event) => event.eligibleDay), todayKey);
  const lastCheckInDay = completedDates[completedDates.length - 1] || null;
  const currentStreak = calculateActiveStreak(completedDates, todayKey);
  const calculatedLongestStreak = calculateLongestStreak(completedDates);
  const validStoredLongest = Number.isFinite(Number(storedLongestStreak))
    ? Math.max(0, Math.floor(Number(storedLongestStreak)))
    : 0;
  const validStoredLifetime = Number.isFinite(Number(storedLifetimeCheckIns))
    ? Math.max(0, Math.floor(Number(storedLifetimeCheckIns)))
    : 0;

  const startDay = isDateKey(challengeStartDay)
    ? challengeStartDay
    : lastCheckInDay
      ? lastCheckInDay
      : null;
  const challengeEndDay = startDay ? addLocalDays(startDay, MAX_VISIBLE_DAYS - 1) : null;
  const challengeCurrentDay = startDay
    ? Math.max(1, Math.min(MAX_VISIBLE_DAYS, daysBetweenDateKeys(startDay, todayKey) + 1))
    : 0;
  const reachedCalendarEnd =
    Boolean(startDay) && compareDateKeys(todayKey, challengeEndDay) >= 0;
  const challengeStatus = startDay
    ? completedThirtyDays || reachedCalendarEnd
      ? "completed"
      : "active"
    : "not_started";

  const completedCheckInDays =
    startDay && challengeEndDay
      ? completedDates.filter(
          (day) => compareDateKeys(day, startDay) >= 0 && compareDateKeys(day, challengeEndDay) <= 0,
        ).length
      : 0;

  return {
    checkInEvents: normalizedEvents,
    completedDates,
    currentStreak,
    longestStreak: Math.max(calculatedLongestStreak, validStoredLongest),
    lifetimeCheckIns: Math.max(completedDates.length, validStoredLifetime),
    lastCheckInDay,
    lastCheckInDate: lastCheckInDay,
    challengeStartDay: startDay,
    challengeCurrentDay,
    challengeEndDay,
    challengeStatus,
    completedCheckInDays,
    completedThirtyDays: completedThirtyDays || challengeStatus === "completed",
  };
}

export function deriveCheckInStateFromDates({
  completedDates,
  todayKey,
  storedLongestStreak = 0,
}) {
  return deriveCheckInStateFromEvents({
    checkInEvents: eventsFromDates(completedDates, "guest"),
    todayKey,
    storedLongestStreak,
  });
}

export function reconcileCheckInHistory(value, todayKey, userId = null) {
  const resolvedUserId = userId || value?.userId || "guest";
  const legacyDates = normalizeDates(
    [
      ...(Array.isArray(value?.completedDates) ? value.completedDates : []),
      ...(isDateKey(value?.lastCheckInDate) ? [value.lastCheckInDate] : []),
      ...(isDateKey(value?.lastCheckInDay) ? [value.lastCheckInDay] : []),
    ],
    todayKey,
  );
  const eventHistory = normalizeCheckInEvents(value?.checkInEvents, resolvedUserId, todayKey);
  const events = normalizeCheckInEvents(
    [...eventHistory, ...eventsFromDates(legacyDates, resolvedUserId)],
    resolvedUserId,
    todayKey,
  );

  return deriveCheckInStateFromEvents({
    checkInEvents: events,
    todayKey,
    storedLongestStreak: value?.longestStreak,
    storedLifetimeCheckIns: value?.lifetimeCheckIns,
    challengeStartDay: value?.challengeStartDay || value?.cycleStartedAt || null,
    completedThirtyDays: Boolean(value?.completedThirtyDays),
  });
}

export function deriveChallengeMetrics(state, todayKey, maxVisibleDays = MAX_VISIBLE_DAYS) {
  const completedDates = normalizeDates(
    state.completedDates ||
      normalizeCheckInEvents(state.checkInEvents, state.userId, todayKey).map((event) => event.eligibleDay),
    todayKey,
  );
  const checkedInToday = completedDates.includes(todayKey);
  const challengeDay = Math.max(0, Math.min(maxVisibleDays, Number(state.challengeCurrentDay || 0)));
  const challengeProgress = Math.max(0, Math.min(maxVisibleDays, Number(state.completedCheckInDays || 0)));

  const challengeStartDay = isDateKey(state.challengeStartDay) ? state.challengeStartDay : null;
  const challengeEndDay = isDateKey(state.challengeEndDay)
    ? state.challengeEndDay
    : challengeStartDay
      ? addLocalDays(challengeStartDay, maxVisibleDays - 1)
      : null;
  const completedDateSet = new Set(completedDates);

  const challengeDots = Array.from({ length: maxVisibleDays }).map((_, index) => {
    const dateKey = challengeStartDay ? addLocalDays(challengeStartDay, index) : null;
    const completed = Boolean(dateKey && completedDateSet.has(dateKey));
    const current =
      Boolean(dateKey) &&
      compareDateKeys(dateKey, todayKey) === 0 &&
      state.challengeStatus !== "not_started";
    const future = Boolean(dateKey && compareDateKeys(dateKey, todayKey) > 0);
    const outsideWindow = Boolean(challengeEndDay && dateKey && compareDateKeys(dateKey, challengeEndDay) > 0);

    return {
      dayNumber: index + 1,
      dateKey,
      completed,
      current: current && !completed,
      future: future || outsideWindow || !challengeStartDay,
    };
  });

  return { checkedInToday, challengeProgress, challengeDay, challengeDots };
}