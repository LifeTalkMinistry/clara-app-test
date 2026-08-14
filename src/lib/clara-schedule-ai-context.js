const SCHEDULE_STORAGE_PREFIX = "clara_schedule_events_v2";
const NO_UPCOMING_CONTEXT = "No upcoming CLARA Schedule page items are saved.";

export const SCHEDULE_BRAIN_EMERGENCY_FALLBACK = "I can see your Schedule data, but I couldn't generate the full schedule answer right now. Please try again.";

function cleanText(value = "") {
  return String(value || "").toLowerCase().replace(/[^a-z0-9₱.,\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function readJsonArray(key) {
  if (typeof window === "undefined" || !window.localStorage || !key) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function extractScheduleArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  const combined = [
    ...(Array.isArray(value.upcomingEvents) ? value.upcomingEvents : []),
    ...(Array.isArray(value.events) ? value.events : []),
    ...(Array.isArray(value.moneyImpactEvents) ? value.moneyImpactEvents : []),
  ];

  const seen = new Set();
  return combined.filter((event, index) => {
    if (!event || typeof event !== "object") return false;
    const key = String(event.id || `${event.date || ""}:${event.title || event.name || ""}:${index}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isSyntheticScheduleEvent(event = {}) {
  if (event?.userConfirmed === true || event?.user_confirmed === true || event?.confirmed === true) return false;
  const id = String(event?.id || "").toLowerCase();
  const source = String(event?.source || "").toLowerCase();
  return ["sample-bill", "sample-payday", "sample-reset", "sample-checkin"].includes(id) || /seeded|demo|sample/.test(source);
}

function cleanScheduleEvents(events = []) {
  return extractScheduleArray(events).filter((event) => !isSyntheticScheduleEvent(event));
}

export function readScheduleEventsForAI({ user = null, scheduleEvents = null } = {}) {
  const suppliedEvents = cleanScheduleEvents(scheduleEvents);
  const userId = String(user?.id || user?.email || "").trim();

  // In the live browser, an authenticated user's exact storage key is the
  // schedule source of truth. Never scan another user's schedule key as a
  // fallback just because the active user has no saved events.
  if (userId && typeof window !== "undefined" && window.localStorage) {
    return cleanScheduleEvents(readJsonArray(`${SCHEDULE_STORAGE_PREFIX}_${userId}`));
  }

  // Tests, non-browser callers, and explicit callers may provide a verified
  // schedule array/object directly. Do not guess from unrelated storage keys.
  return suppliedEvents;
}

function parseScheduleDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parts = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatScheduleDate(date) {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value).replace(/php/gi, "").replace(/[₱,\s]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value) {
  const number = toNumber(value);
  return number === null ? "" : `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function impactRows(event = {}) {
  return Array.isArray(event.impactBreakdown)
    ? event.impactBreakdown.filter((row) => row && typeof row === "object")
    : Array.isArray(event.impact_breakdown)
      ? event.impact_breakdown.filter((row) => row && typeof row === "object")
      : [];
}

function scheduleDirection(event = {}) {
  const rows = impactRows(event);
  const type = cleanText(event.type);
  return cleanText(event.direction || rows[0]?.direction || (type === "payday" ? "in" : "out")) || "out";
}

function hasMoneyImpact(event = {}) {
  const type = cleanText(event.type);
  const titleAndNote = cleanText(`${event.title || event.name || ""} ${event.note || event.description || ""}`);
  const rows = impactRows(event);
  const amount = toNumber(event.amount ?? event.estimatedImpact ?? event.impactAmount ?? event.cost);
  return Boolean(
    event.affectsMoney === true ||
      event.affects_money === true ||
      rows.length ||
      amount !== null ||
      ["bill", "payday", "money"].includes(type) ||
      /bill|rent|due|salary|tuition|transport|cost|fee/.test(titleAndNote)
  );
}

function normalizeScheduleEvent(event = {}, today = new Date()) {
  const parsedDate = parseScheduleDate(event.date || event.dueDate || event.startDate || event.when);
  if (!parsedDate) return null;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const eventStart = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  const amount = toNumber(event.amount ?? event.estimatedImpact ?? event.impactAmount ?? event.cost);
  const rows = impactRows(event);
  const direction = scheduleDirection(event);
  return {
    id: event.id || `${event.date || dateKey(parsedDate)}-${event.title || event.name || "schedule"}`,
    title: String(event.title || event.name || "Schedule item").trim(),
    date: dateKey(parsedDate),
    dateLabel: formatScheduleDate(parsedDate),
    time: String(event.time || event.startTime || "").trim(),
    type: String(event.type || "Personal").trim(),
    amount,
    amountText: amount === null ? "" : money(amount),
    note: String(event.note || event.description || "").trim(),
    daysUntil: Math.round((eventStart.getTime() - todayStart.getTime()) / 86400000),
    hasMoneyImpact: hasMoneyImpact(event),
    direction,
    pendingAmount: Boolean(event.pendingAmount || event.pending_amount || rows.some((row) => row.pendingAmount === true || row.pending_amount === true)),
    raw: event,
  };
}

function formatScheduleItem(event, index) {
  const lines = [`${index + 1}. ${event.title}`, `   Date: ${event.date} (${event.dateLabel}${event.time ? ` • ${event.time}` : ""})`, `   Type: ${event.type}`];
  if (event.amountText) lines.push(`   Estimated impact: ${event.direction === "in" ? "+" : "-"}${event.amountText}`);
  if (event.pendingAmount) lines.push("   Estimated impact: amount pending");
  if (event.note) lines.push(`   Note: ${event.note}`);
  return lines.join("\n");
}

export function getScheduleContextForAI(context = {}) {
  const user = context.user || context.authUser || context.profile?.user || null;
  const rawEvents = readScheduleEventsForAI({ user, scheduleEvents: context.scheduleEvents || context.schedule_events || context.calendarEvents || context.events });
  const today = new Date();
  const upcomingItems = rawEvents.map((event) => normalizeScheduleEvent(event, today)).filter(Boolean).filter((event) => event.daysUntil >= 0).sort((a, b) => `${a.date} ${a.time || "99:99"}`.localeCompare(`${b.date} ${b.time || "99:99"}`));
  const upcomingMoneyItems = upcomingItems.filter((event) => event.hasMoneyImpact);
  const upcomingMoneyOutItems = upcomingMoneyItems.filter((event) => event.direction !== "in");
  return {
    upcomingItems,
    upcomingMoneyItems,
    nextItem: upcomingItems[0] || null,
    nextMoneyItem: upcomingMoneyItems[0] || null,
    hasUpcomingItems: upcomingItems.length > 0,
    hasMoneyImpact: upcomingMoneyItems.length > 0,
    totalEstimatedImpact: upcomingMoneyOutItems.reduce((sum, event) => sum + (event.amount || 0), 0),
    promptText: upcomingItems.length ? `SCHEDULE CONTEXT:\nUpcoming CLARA Schedule page items:\n${upcomingItems.slice(0, 8).map(formatScheduleItem).join("\n")}` : `SCHEDULE CONTEXT:\n${NO_UPCOMING_CONTEXT}`,
  };
}

export function shouldIncludeScheduleContext(message = "", context = {}) {
  const text = cleanText(message);
  const schedule = getScheduleContextForAI(context);
  const hasAmount = /(?:₱|php\s*)?\d+(?:\.\d{1,2})?/i.test(String(message || ""));
  const scheduleIntent = /\b(schedules?|appointments?|calendars?|upcoming|coming up|planned|plans?|commitments?|events?|reminders?|prepare for|money for|payday advice)\b/.test(text) || /\bwhat'?s next\b/.test(text);
  return scheduleIntent || (hasAmount && schedule.hasMoneyImpact);
}

export function buildSchedulePromptBlock(message = "", context = {}) {
  if (!shouldIncludeScheduleContext(message, context)) return "SCHEDULE CONTEXT:\nNot included for this message.";
  return getScheduleContextForAI(context).promptText;
}

export function buildScheduleEmergencyFallbackReply() {
  return SCHEDULE_BRAIN_EMERGENCY_FALLBACK;
}
