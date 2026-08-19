import { getRecurringCashFlowOwnerId, toLocalDateKey } from "@/lib/recurringCashFlowRepository";

const SCHEDULE_STORAGE_PREFIX = "clara_schedule_events_v2";
const LEGACY_SCHEDULE_STORAGE_KEY = "clara_lifeos_schedule_events_v1";
const SESSION_STORAGE_PREFIX = "clara_weekly_money_check_v1";
const PREFERENCE_STORAGE_PREFIX = "clara_weekly_money_check_preference_v1";

export const WEEKLY_MONEY_CHECK_UPDATED_EVENT = "clara:weekly-money-check-updated";
export const WEEKLY_MONEY_CHECK_SOURCE = "weekly_money_check";

export const WEEKLY_MONEY_CHECK_DAYS = [
  { value: 0, short: "Sun", label: "Sunday" },
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
];

const CHECK_TITLE_PATTERNS = [
  "weekly money check",
  "weekly money check-in",
  "weekly money check in",
  "budget cross checking",
  "budget cross-check",
  "budget cross check",
  "weekly cross-check",
  "weekly cross check",
  "financial alignment",
];

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeWeekday(value) {
  const weekday = Number(value);
  return Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 ? weekday : null;
}

function getSessionStorageKey(user) {
  return `${SESSION_STORAGE_PREFIX}_${getRecurringCashFlowOwnerId(user)}`;
}

function getPreferenceStorageKey(user) {
  return `${PREFERENCE_STORAGE_PREFIX}_${getRecurringCashFlowOwnerId(user)}`;
}

function getScheduleStorageKeys(user) {
  const ownerId = getRecurringCashFlowOwnerId(user);
  const legacyOwner = cleanText(user?.id || user?.email || "guest") || "guest";
  return [
    `${SCHEDULE_STORAGE_PREFIX}_${ownerId}`,
    `${SCHEDULE_STORAGE_PREFIX}_${legacyOwner}`,
    LEGACY_SCHEDULE_STORAGE_KEY,
  ].filter((value, index, values) => values.indexOf(value) === index);
}

function readScheduleEvents(user) {
  if (typeof window === "undefined" || !window.localStorage) return [];

  for (const key of getScheduleStorageKeys(user)) {
    const events = parseJsonArray(window.localStorage.getItem(key));
    if (events.length > 0) return events;
  }

  return [];
}

function readSession(user) {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return parseJsonObject(window.localStorage.getItem(getSessionStorageKey(user)));
}

export function readWeeklyMoneyCheckPreference(user) {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const stored = parseJsonObject(window.localStorage.getItem(getPreferenceStorageKey(user)));
  const weekday = normalizeWeekday(stored?.weekday);
  return weekday === null ? null : { ...stored, weekday };
}

export function getWeeklyMoneyCheckWeekdayLabel(value) {
  const weekday = normalizeWeekday(value);
  return WEEKLY_MONEY_CHECK_DAYS.find((day) => day.value === weekday)?.label || "";
}

export function saveWeeklyMoneyCheckWeekday(user, value) {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const weekday = normalizeWeekday(value);
  if (weekday === null) return null;

  const next = {
    weekday,
    recurrence: "weekly",
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(getPreferenceStorageKey(user), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(WEEKLY_MONEY_CHECK_UPDATED_EVENT, {
    detail: { type: "weekday_changed", preference: next },
  }));
  return next;
}

export function isWeeklyMoneyCheckEvent(event = {}) {
  const source = cleanText(event.source || event.scheduleSource).toLowerCase();
  if (source === WEEKLY_MONEY_CHECK_SOURCE) return true;

  const title = cleanText(event.title).toLowerCase();
  return CHECK_TITLE_PATTERNS.some((pattern) => title.includes(pattern));
}

function sameLocalWeek(value, referenceDate = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date(referenceDate);
  if (Number.isNaN(date.getTime()) || Number.isNaN(now.getTime())) return false;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return date >= start && date < end;
}

function getNextScheduledEvent(events, referenceDate = new Date()) {
  const todayKey = toLocalDateKey(referenceDate);
  return (Array.isArray(events) ? events : [])
    .filter(isWeeklyMoneyCheckEvent)
    .filter((event) => cleanText(event.date) >= todayKey)
    .sort((a, b) => `${a.date} ${a.time || "99:99"}`.localeCompare(`${b.date} ${b.time || "99:99"}`))[0] || null;
}

export function getNextWeeklyMoneyCheckDateKey(
  weekday,
  referenceDate = new Date(),
  { includeToday = true } = {}
) {
  const normalizedWeekday = normalizeWeekday(weekday);
  if (normalizedWeekday === null) return "";

  const reference = new Date(referenceDate);
  if (Number.isNaN(reference.getTime())) return "";
  reference.setHours(0, 0, 0, 0);

  let offset = (normalizedWeekday - reference.getDay() + 7) % 7;
  if (!includeToday && offset === 0) offset = 7;

  const next = new Date(reference);
  next.setDate(next.getDate() + offset);
  return toLocalDateKey(next);
}

function getPreferenceScheduledEvent(preference, referenceDate, { includeToday = true } = {}) {
  const weekday = normalizeWeekday(preference?.weekday);
  if (weekday === null) return null;

  const date = getNextWeeklyMoneyCheckDateKey(weekday, referenceDate, { includeToday });
  if (!date) return null;

  return {
    id: `weekly-money-check-recurring-${weekday}-${date}`,
    title: "Weekly Money Check",
    date,
    time: "",
    type: "Money",
    note: `Your recurring ${getWeeklyMoneyCheckWeekdayLabel(weekday)} money reflection with CLARA.`,
    source: WEEKLY_MONEY_CHECK_SOURCE,
    recurrence: "weekly",
    weekday,
    derived: true,
    editable: false,
  };
}

function getConfiguredScheduledEvent({
  events,
  preference,
  referenceDate,
  includeToday = true,
}) {
  return (
    getPreferenceScheduledEvent(preference, referenceDate, { includeToday }) ||
    getNextScheduledEvent(events, referenceDate)
  );
}

function getConfiguredWeekday(preference, scheduledEvent) {
  const preferred = normalizeWeekday(preference?.weekday);
  if (preferred !== null) return preferred;

  const dateKey = cleanText(scheduledEvent?.date);
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return Number.isNaN(date.getTime()) ? null : date.getDay();
}

function normalizeProgress(session = {}) {
  const checkedWallets = Math.max(0, Number(session.checkedWallets ?? session.checked_wallets) || 0);
  const totalWallets = Math.max(0, Number(session.totalWallets ?? session.total_wallets) || 0);
  return { checkedWallets, totalWallets };
}

export function deriveWeeklyMoneyCheckState({
  events = [],
  session = null,
  preference = null,
  referenceDate = new Date(),
} = {}) {
  const status = cleanText(session?.status).toLowerCase();
  const completedAt = session?.completedAt || session?.completed_at || "";
  const startedAt = session?.startedAt || session?.started_at || "";
  const { checkedWallets, totalWallets } = normalizeProgress(session || {});

  if (status === "completed" && sameLocalWeek(completedAt, referenceDate)) {
    const scheduledEvent = getConfiguredScheduledEvent({
      events,
      preference,
      referenceDate,
      includeToday: false,
    });
    return {
      key: "completed",
      session,
      preference,
      weekday: getConfiguredWeekday(preference, scheduledEvent),
      scheduledEvent,
      checkedWallets,
      totalWallets,
    };
  }

  if (status === "in_progress" && sameLocalWeek(startedAt || new Date().toISOString(), referenceDate)) {
    const scheduledEvent = getConfiguredScheduledEvent({ events, preference, referenceDate });
    return {
      key: "in_progress",
      session,
      preference,
      weekday: getConfiguredWeekday(preference, scheduledEvent),
      scheduledEvent,
      checkedWallets,
      totalWallets,
    };
  }

  const scheduledEvent = getConfiguredScheduledEvent({ events, preference, referenceDate });
  if (!scheduledEvent) {
    return {
      key: "setup",
      session,
      preference,
      weekday: null,
      scheduledEvent: null,
      checkedWallets,
      totalWallets,
    };
  }

  const weekday = getConfiguredWeekday(preference, scheduledEvent);
  if (cleanText(scheduledEvent.date) === toLocalDateKey(referenceDate)) {
    return {
      key: "ready",
      session,
      preference,
      weekday,
      scheduledEvent,
      checkedWallets,
      totalWallets,
    };
  }

  return {
    key: "waiting",
    session,
    preference,
    weekday,
    scheduledEvent,
    checkedWallets,
    totalWallets,
  };
}

export function readWeeklyMoneyCheckState(user, referenceDate = new Date()) {
  return deriveWeeklyMoneyCheckState({
    events: readScheduleEvents(user),
    session: readSession(user),
    preference: readWeeklyMoneyCheckPreference(user),
    referenceDate,
  });
}

export function startWeeklyMoneyCheckSession(user) {
  if (typeof window === "undefined" || !window.localStorage) return null;

  const current = readSession(user) || {};
  const next = {
    ...current,
    status: "in_progress",
    startedAt: current.startedAt || new Date().toISOString(),
    completedAt: null,
  };

  window.localStorage.setItem(getSessionStorageKey(user), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(WEEKLY_MONEY_CHECK_UPDATED_EVENT, { detail: next }));
  return next;
}
