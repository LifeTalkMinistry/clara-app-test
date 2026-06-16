import {
  buildNotificationContract,
  isNotificationEventAllowed,
} from "@/lib/notifications/notificationRegistry";
import { createNotification } from "@/lib/notifications/localNotificationRepository";
import { getZonedDateParts } from "@/lib/notifications/notificationPreferences";

const SCHEDULE_STORAGE_PREFIX = "clara_schedule_events_v2";
const MONEY_KEYWORDS = /\b(bill|rent|payment|payday|salary|due|fee|tuition)\b/i;
const NINE_AM = 9 * 60;

function cleanUserId(userId, user) {
  return String(
    userId ||
      user?.id ||
      user?.email ||
      "guest"
  ).trim() || "guest";
}

function scheduleStorageKey(userId) {
  return `${SCHEDULE_STORAGE_PREFIX}_${cleanUserId(userId)}`;
}

function safeJsonArray(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readLatestScheduleEvents(exactKey) {
  if (typeof window === "undefined" || !window.localStorage) return [];

  try {
    let fallback = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || key === exactKey || !key.startsWith(`${SCHEDULE_STORAGE_PREFIX}_`)) continue;

      const parsed = safeJsonArray(window.localStorage.getItem(key));
      if (parsed.length) fallback = parsed;
    }

    return fallback;
  } catch {
    return [];
  }
}

function readScheduleEvents(userId) {
  if (typeof window === "undefined" || !window.localStorage) return [];

  const exactKey = scheduleStorageKey(userId);

  try {
    const exact = safeJsonArray(window.localStorage.getItem(exactKey));
    if (exact.length) return exact;
    return readLatestScheduleEvents(exactKey);
  } catch {
    return [];
  }
}

function cleanString(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeDateKey(value) {
  const raw = cleanString(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function normalizeTime(value) {
  const match = cleanString(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "";

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return "";
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return "";

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function timeToMinutes(value) {
  const time = normalizeTime(value);
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function normalizeAmount(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(cleanString(value).replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Math.max(normalizeAmount(value), 0));
}

function isSampleEvent(event) {
  const id = cleanString(event?.id).toLowerCase();
  const title = cleanString(event?.title).toLowerCase();
  return id.startsWith("sample-") || title.includes("lifeos check-in");
}

function normalizeEvent(event) {
  if (!event || typeof event !== "object" || isSampleEvent(event)) return null;

  const id = cleanString(event.id);
  const title = cleanString(event.title);
  const date = normalizeDateKey(event.date);
  if (!id || !title || !date) return null;

  return {
    id,
    title,
    date,
    time: normalizeTime(event.time),
    type: cleanString(event.type),
    amount: normalizeAmount(event.amount),
    note: cleanString(event.note),
  };
}

function addDateKeyDays(dateKey, days) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  if (!year || !month || !day) return "";

  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function hasMoneyImpact(event) {
  const type = cleanString(event?.type).toLowerCase();
  const text = `${event?.title || ""} ${event?.note || ""}`;

  return Boolean(
    normalizeAmount(event?.amount) > 0 ||
      type === "bill" ||
      type === "payday" ||
      MONEY_KEYWORDS.test(text)
  );
}

async function createScheduleNotification({ userId, preferences, eventType, dedupeKey, title, body, event, reminderKind }) {
  if (!isNotificationEventAllowed(eventType, preferences)) return null;

  const result = await createNotification(
    buildNotificationContract({
      eventType,
      dedupeKey,
      title,
      body,
      userId,
      destination: "/dashboard",
      metadata: {
        eventId: event.id,
        date: event.date,
        time: event.time,
        type: event.type,
        amount: event.amount || undefined,
        reminderKind,
      },
    })
  );

  return result.created ? result.notification : null;
}

export async function evaluateScheduleNotifications({ userId, preferences = {}, user = null } = {}) {
  const cleanId = cleanUserId(userId, user);
  if (!cleanId) return [];
  if (preferences.scheduleAndCalendar === false) return [];

  let zoned;
  try {
    zoned = getZonedDateParts(preferences.timezone);
  } catch {
    zoned = getZonedDateParts();
  }

  const todayKey = zoned.dateKey;
  const tomorrowKey = addDateKeyDays(todayKey, 1);
  const events = readScheduleEvents(cleanId)
    .map(normalizeEvent)
    .filter(Boolean)
    .filter((event) => event.date >= todayKey)
    .sort((left, right) => `${left.date} ${left.time || "99:99"}`.localeCompare(`${right.date} ${right.time || "99:99"}`));

  const created = [];

  for (const event of events) {
    if (event.date === tomorrowKey) {
      const notification = await createScheduleNotification({
        userId: cleanId,
        preferences,
        eventType: "schedule_event_upcoming",
        dedupeKey: `schedule_event_upcoming:${event.id}:${event.date}:1day`,
        title: "Upcoming schedule tomorrow",
        body: `${event.title} is scheduled tomorrow. Prepare before it affects your plans.`,
        event,
        reminderKind: "tomorrow",
      });
      if (notification) created.push(notification);
    }

    const shouldCreateTodayReminder = event.date === todayKey && (!event.time || zoned.minutes >= NINE_AM);
    if (shouldCreateTodayReminder) {
      const notification = await createScheduleNotification({
        userId: cleanId,
        preferences,
        eventType: "schedule_event_today",
        dedupeKey: `schedule_event_today:${event.id}:${event.date}`,
        title: "Schedule today",
        body: `${event.title} is on your calendar today.`,
        event,
        reminderKind: "today",
      });
      if (notification) created.push(notification);
    }

    if (hasMoneyImpact(event)) {
      const amountText = event.amount > 0
        ? `${money(event.amount)} may be involved for ${event.title}. Prepare before optional spending.`
        : `${event.title} may affect your money. Prepare before optional spending.`;
      const notification = await createScheduleNotification({
        userId: cleanId,
        preferences,
        eventType: "schedule_money_event_due",
        dedupeKey: `schedule_money_event_due:${event.id}:${event.date}`,
        title: "Money-impact schedule coming",
        body: amountText,
        event,
        reminderKind: "money_impact",
      });
      if (notification) created.push(notification);
    }
  }

  return created;
}
