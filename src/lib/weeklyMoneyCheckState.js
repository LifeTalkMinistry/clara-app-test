import { getRecurringCashFlowOwnerId, toLocalDateKey } from "@/lib/recurringCashFlowRepository";

const SCHEDULE_STORAGE_PREFIX = "clara_schedule_events_v2";
const LEGACY_SCHEDULE_STORAGE_KEY = "clara_lifeos_schedule_events_v1";
const SESSION_STORAGE_PREFIX = "clara_weekly_money_check_v1";

export const WEEKLY_MONEY_CHECK_UPDATED_EVENT = "clara:weekly-money-check-updated";
export const WEEKLY_MONEY_CHECK_SOURCE = "weekly_money_check";

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

function getSessionStorageKey(user) {
  return `${SESSION_STORAGE_PREFIX}_${getRecurringCashFlowOwnerId(user)}`;
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

function normalizeProgress(session = {}) {
  const checkedWallets = Math.max(0, Number(session.checkedWallets ?? session.checked_wallets) || 0);
  const totalWallets = Math.max(0, Number(session.totalWallets ?? session.total_wallets) || 0);
  return { checkedWallets, totalWallets };
}

export function deriveWeeklyMoneyCheckState({
  events = [],
  session = null,
  referenceDate = new Date(),
} = {}) {
  const status = cleanText(session?.status).toLowerCase();
  const completedAt = session?.completedAt || session?.completed_at || "";
  const startedAt = session?.startedAt || session?.started_at || "";
  const { checkedWallets, totalWallets } = normalizeProgress(session || {});

  if (status === "completed" && sameLocalWeek(completedAt, referenceDate)) {
    return {
      key: "completed",
      session,
      scheduledEvent: getNextScheduledEvent(events, referenceDate),
      checkedWallets,
      totalWallets,
    };
  }

  if (status === "in_progress" && sameLocalWeek(startedAt || new Date().toISOString(), referenceDate)) {
    return {
      key: "in_progress",
      session,
      scheduledEvent: getNextScheduledEvent(events, referenceDate),
      checkedWallets,
      totalWallets,
    };
  }

  const scheduledEvent = getNextScheduledEvent(events, referenceDate);
  if (!scheduledEvent) {
    return { key: "setup", session, scheduledEvent: null, checkedWallets, totalWallets };
  }

  if (cleanText(scheduledEvent.date) === toLocalDateKey(referenceDate)) {
    return { key: "ready", session, scheduledEvent, checkedWallets, totalWallets };
  }

  return { key: "waiting", session, scheduledEvent, checkedWallets, totalWallets };
}

export function readWeeklyMoneyCheckState(user, referenceDate = new Date()) {
  return deriveWeeklyMoneyCheckState({
    events: readScheduleEvents(user),
    session: readSession(user),
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
