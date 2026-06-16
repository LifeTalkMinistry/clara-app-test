const SCHEDULE_STORAGE_PREFIX = "clara_schedule_events_v2_";
const SCHEDULE_UPDATE_EVENT = "clara:schedule-events-updated";
const FINANCE_UPDATE_EVENT = "clara:finance-data-updated";
const INSTALLED_FLAG = "__claraScheduleNotificationRuntimeBridgeInstalled";
const MONEY_KEYWORDS = /\b(bill|rent|payment|payday|salary|due|fee|tuition)\b/i;

let notifyRuntimeTimer = null;

function safeParseEvents(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cleanString(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanMoney(value) {
  const parsed = Number(cleanString(value).replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isScheduleKey(key) {
  return typeof key === "string" && key.startsWith(SCHEDULE_STORAGE_PREFIX);
}

function userIdFromScheduleKey(key) {
  return cleanString(key).slice(SCHEDULE_STORAGE_PREFIX.length) || "guest";
}

function isSampleEvent(event) {
  const id = cleanString(event?.id).toLowerCase();
  const title = cleanString(event?.title).toLowerCase();
  return id.startsWith("sample-") || title.includes("lifeos check-in");
}

function isMoneyEvent(event) {
  const type = cleanString(event?.type).toLowerCase();
  const text = `${event?.title || ""} ${event?.note || ""}`;

  return Boolean(
    cleanMoney(event?.amount) > 0 ||
      type === "bill" ||
      type === "payday" ||
      MONEY_KEYWORDS.test(text)
  );
}

function eventSignature(event) {
  return JSON.stringify({
    id: cleanString(event?.id),
    title: cleanString(event?.title),
    date: cleanString(event?.date),
    time: cleanString(event?.time),
    type: cleanString(event?.type),
    amount: cleanString(event?.amount),
    note: cleanString(event?.note),
  });
}

function findChangedEvents(previousEvents, nextEvents) {
  const previousById = new Map();
  previousEvents.forEach((event) => {
    const id = cleanString(event?.id);
    if (id) previousById.set(id, eventSignature(event));
  });

  return nextEvents.filter((event) => {
    const id = cleanString(event?.id);
    if (!id || !cleanString(event?.title) || !cleanString(event?.date) || isSampleEvent(event)) return false;
    return previousById.get(id) !== eventSignature(event);
  });
}

function dispatchScheduleUpdated(key, events) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(SCHEDULE_UPDATE_EVENT, {
      detail: {
        userId: userIdFromScheduleKey(key),
        count: events.length,
      },
    })
  );
}

function notifyExistingRuntime(reason = "schedule") {
  if (typeof window === "undefined") return;

  if (notifyRuntimeTimer) window.clearTimeout(notifyRuntimeTimer);
  notifyRuntimeTimer = window.setTimeout(() => {
    notifyRuntimeTimer = null;
    window.dispatchEvent(
      new CustomEvent(FINANCE_UPDATE_EVENT, {
        detail: { source: reason },
      })
    );
  }, 250);
}

function parseScheduleDateTime(dateKey, time = "09:00", dayOffset = 0) {
  const [year, month, day] = cleanString(dateKey).split("-").map(Number);
  const [hour = 9, minute = 0] = cleanString(time || "09:00").split(":").map(Number);

  if (!year || !month || !day) return null;
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  const date = new Date(year, month - 1, day + dayOffset, hour, minute, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function scheduleFutureDate({ event, at, title, body, tag, eventType }) {
  if (!at || at <= new Date()) return;

  import("@/lib/notifications/deviceNotifications")
    .then(({ scheduleNativeCalendarNotification }) => {
      if (typeof scheduleNativeCalendarNotification !== "function") return null;
      return scheduleNativeCalendarNotification({
        id: `${event.id}:${tag}`,
        title,
        body,
        at,
        url: "#/dashboard",
        tag,
        eventType,
      });
    })
    .catch((error) => {
      console.warn("CLARA schedule native reminder scheduling failed:", error);
    });
}

function scheduleNativeRemindersForEvent(event) {
  const id = cleanString(event?.id);
  const title = cleanString(event?.title);
  const date = cleanString(event?.date);
  const time = cleanString(event?.time);

  if (!id || !title || !date || isSampleEvent(event)) return;

  if (time) {
    const eventTime = parseScheduleDateTime(date, time, 0);
    if (eventTime) {
      scheduleFutureDate({
        event: { ...event, id },
        at: new Date(eventTime.getTime() - 60 * 60 * 1000),
        title: "Upcoming schedule soon",
        body: `${title} starts in about 1 hour.`,
        tag: `schedule:${id}:${date}:1hour`,
        eventType: "schedule_event_upcoming",
      });
      scheduleFutureDate({
        event: { ...event, id },
        at: eventTime,
        title: "Schedule now",
        body: `${title} is on your calendar now.`,
        tag: `schedule:${id}:${date}:time`,
        eventType: "schedule_event_today",
      });
    }
  } else {
    scheduleFutureDate({
      event: { ...event, id },
      at: parseScheduleDateTime(date, "09:00", 0),
      title: "Schedule today",
      body: `${title} is on your calendar today.`,
      tag: `schedule:${id}:${date}:0900`,
      eventType: "schedule_event_today",
    });
  }

  if (isMoneyEvent(event)) {
    scheduleFutureDate({
      event: { ...event, id },
      at: parseScheduleDateTime(date, "09:00", -1),
      title: "Money-impact schedule coming",
      body: cleanMoney(event.amount) > 0
        ? `₱${cleanMoney(event.amount).toLocaleString()} may be involved for ${title}. Prepare before optional spending.`
        : `${title} may affect your money. Prepare before optional spending.`,
      tag: `schedule:${id}:${date}:money`,
      eventType: "schedule_money_event_due",
    });
  }
}

function installScheduleStorageBridge() {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (window[INSTALLED_FLAG]) return;

  window[INSTALLED_FLAG] = true;

  const originalSetItem = window.localStorage.setItem.bind(window.localStorage);

  window.localStorage.setItem = (key, value) => {
    const scheduleKey = isScheduleKey(key);
    const previousEvents = scheduleKey ? safeParseEvents(window.localStorage.getItem(key)) : [];

    originalSetItem(key, value);

    if (!scheduleKey) return;

    const nextEvents = safeParseEvents(value);
    dispatchScheduleUpdated(key, nextEvents);
    notifyExistingRuntime("schedule");

    findChangedEvents(previousEvents, nextEvents).forEach(scheduleNativeRemindersForEvent);
  };

  window.addEventListener(SCHEDULE_UPDATE_EVENT, () => notifyExistingRuntime("schedule-event"));
}

installScheduleStorageBridge();
