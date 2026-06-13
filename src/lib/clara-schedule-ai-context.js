const SCHEDULE_STORAGE_PREFIX = "clara_schedule_events_v2";
const LEGACY_SCHEDULE_STORAGE_KEY = "clara_lifeos_schedule_events_v1";
const NO_UPCOMING_REPLY = "I don't see upcoming items saved in your CLARA Schedule page yet. Add one in Schedule, then I can check it here.";
const NO_MONEY_REPLY = "I don't see upcoming money-impact items saved in your CLARA Schedule page right now.";

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

function readLatestScheduleArray() {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const keys = Object.keys(window.localStorage).filter((key) => key.startsWith(`${SCHEDULE_STORAGE_PREFIX}_`)).sort();
    for (let index = keys.length - 1; index >= 0; index -= 1) {
      const parsed = readJsonArray(keys[index]);
      if (parsed.length) return parsed;
    }
  } catch {
    return [];
  }
  return [];
}

export function readScheduleEventsForAI({ user = null, scheduleEvents = null } = {}) {
  if (Array.isArray(scheduleEvents)) return scheduleEvents;
  const userId = String(user?.id || user?.email || "guest").trim() || "guest";
  const exactUserEvents = user ? readJsonArray(`${SCHEDULE_STORAGE_PREFIX}_${userId}`) : [];
  if (exactUserEvents.length) return exactUserEvents;
  const latestEvents = readLatestScheduleArray();
  if (latestEvents.length) return latestEvents;
  return readJsonArray(LEGACY_SCHEDULE_STORAGE_KEY);
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

function hasMoneyImpact(event = {}) {
  const type = cleanText(event.type);
  const titleAndNote = cleanText(`${event.title || event.name || ""} ${event.note || event.description || ""}`);
  return toNumber(event.amount) !== null || ["bill", "payday", "money"].includes(type) || /bill|rent|due|salary|tuition|transport|cost|fee/.test(titleAndNote);
}

function normalizeScheduleEvent(event = {}, today = new Date()) {
  const parsedDate = parseScheduleDate(event.date || event.dueDate || event.startDate || event.when);
  if (!parsedDate) return null;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const eventStart = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  const amount = toNumber(event.amount ?? event.estimatedImpact ?? event.impactAmount ?? event.cost);
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
    hasMoneyImpact: hasMoneyImpact({ ...event, amount }),
    raw: event,
  };
}

function formatScheduleItem(event, index) {
  const lines = [`${index + 1}. ${event.title}`, `   Date: ${event.dateLabel}${event.time ? ` • ${event.time}` : ""}`, `   Type: ${event.type}`];
  if (event.amountText) lines.push(`   Estimated impact: ${event.amountText}`);
  if (event.note) lines.push(`   Note: ${event.note}`);
  return lines.join("\n");
}

export function getScheduleContextForAI(context = {}) {
  const user = context.user || context.authUser || context.profile?.user || null;
  const rawEvents = readScheduleEventsForAI({ user, scheduleEvents: context.scheduleEvents || context.schedule_events || context.calendarEvents || context.events });
  const today = new Date();
  const upcomingItems = rawEvents.map((event) => normalizeScheduleEvent(event, today)).filter(Boolean).filter((event) => event.daysUntil >= 0).sort((a, b) => `${a.date} ${a.time || "99:99"}`.localeCompare(`${b.date} ${b.time || "99:99"}`));
  const upcomingMoneyItems = upcomingItems.filter((event) => event.hasMoneyImpact);
  return {
    upcomingItems,
    upcomingMoneyItems,
    nextItem: upcomingItems[0] || null,
    nextMoneyItem: upcomingMoneyItems[0] || null,
    hasUpcomingItems: upcomingItems.length > 0,
    hasMoneyImpact: upcomingMoneyItems.length > 0,
    totalEstimatedImpact: upcomingMoneyItems.reduce((sum, event) => sum + (event.amount || 0), 0),
    promptText: upcomingItems.length ? `SCHEDULE CONTEXT:\nUpcoming CLARA Schedule page items:\n${upcomingItems.slice(0, 8).map(formatScheduleItem).join("\n")}` : `SCHEDULE CONTEXT:\n${NO_UPCOMING_REPLY}`,
  };
}

export function shouldIncludeScheduleContext(message = "", context = {}) {
  const text = cleanText(message);
  const schedule = getScheduleContextForAI(context);
  const hasAmount = /(?:₱|php\s*)?\d+(?:\.\d{1,2})?/i.test(String(message || ""));
  const scheduleIntent = /\b(schedule|appointment|calendar|upcoming|coming up|planned|plan|commitment|event|reminder|prepare for|money for|payday advice)\b/.test(text);
  return scheduleIntent || (hasAmount && schedule.hasMoneyImpact);
}

export function buildSchedulePromptBlock(message = "", context = {}) {
  if (!shouldIncludeScheduleContext(message, context)) return "SCHEDULE CONTEXT:\nNot included for this message.";
  return getScheduleContextForAI(context).promptText;
}

function whenLabel(event = {}) {
  return event.time ? `${event.dateLabel} at ${event.time}` : event.dateLabel;
}

function firstScheduleSentence(event) {
  if (!event) return NO_UPCOMING_REPLY;
  if (event.amountText) return `I checked your CLARA Schedule page. You have ${event.title} on ${whenLabel(event)}. Estimated impact: ${event.amountText}.`;
  if (event.hasMoneyImpact) return `I checked your CLARA Schedule page. You have ${event.title} on ${whenLabel(event)}. This may have a cost, but I don't see an exact amount saved yet.`;
  return `I checked your CLARA Schedule page. You have ${event.title} on ${whenLabel(event)}.`;
}

function moneyPreparationSentence(event) {
  if (!event) return NO_MONEY_REPLY;
  if (event.amountText) return `Yes, your ${event.title} on ${whenLabel(event)} has an estimated money impact of ${event.amountText}. It's worth preparing for it first.`;
  return `Yes, your ${event.title} on ${whenLabel(event)} may have a cost, but I don't see an exact amount saved yet.`;
}

export function buildScheduleDirectReply(message = "", context = {}) {
  const text = cleanText(message);
  const schedule = getScheduleContextForAI(context);
  const asksSchedule = /\b(schedule|appointment|calendar|upcoming|coming up|planned|commitment|event|reminder|what should i prepare|prepare for)\b/.test(text);
  const asksMoney = /\b(prepare money|prepare budget|money for|cost|estimated impact|estimated cost)\b/.test(text);
  const asksPressure = /\b(pressure|financial pressure|payday advice)\b/.test(text);
  if (asksMoney) return moneyPreparationSentence(schedule.nextMoneyItem || schedule.nextItem);
  if (asksPressure) return schedule.upcomingMoneyItems.length ? `${firstScheduleSentence(schedule.nextMoneyItem)} That is your nearest upcoming financial pressure.` : NO_MONEY_REPLY;
  if (asksSchedule) {
    if (!schedule.upcomingItems.length) return NO_UPCOMING_REPLY;
    const extra = schedule.upcomingItems.length > 1 ? ` You also have ${schedule.upcomingItems.length - 1} more upcoming schedule item${schedule.upcomingItems.length - 1 === 1 ? "" : "s"}.` : "";
    return `${firstScheduleSentence(schedule.nextItem)}${extra}`;
  }
  return "";
}
