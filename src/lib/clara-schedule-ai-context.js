const SCHEDULE_STORAGE_PREFIX = "clara_schedule_events_v2";
const LEGACY_SCHEDULE_STORAGE_KEY = "clara_lifeos_schedule_events_v1";

function cleanText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9₱.,\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUserKey(user = {}) {
  return String(user?.id || user?.email || "guest").trim() || "guest";
}

function getScheduleStorageKey(user = {}) {
  return `${SCHEDULE_STORAGE_PREFIX}_${normalizeUserKey(user)}`;
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
    const keys = Object.keys(window.localStorage)
      .filter((key) => key.startsWith(`${SCHEDULE_STORAGE_PREFIX}_`))
      .sort();

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

  const exactUserEvents = user ? readJsonArray(getScheduleStorageKey(user)) : [];
  if (exactUserEvents.length) return exactUserEvents;

  const latestEvents = readLatestScheduleArray();
  if (latestEvents.length) return latestEvents;

  return readJsonArray(LEGACY_SCHEDULE_STORAGE_KEY);
}

function parseScheduleDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const parts = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = parts
    ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
    : new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatScheduleDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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

function eventHasMoneyImpact(event = {}) {
  const type = cleanText(event.type);
  const text = cleanText(`${event.title || event.name || ""} ${event.note || event.description || ""}`);
  return toNumber(event.amount) !== null || ["bill", "payday", "money"].includes(type) || /bill|rent|due|payment|payday|salary|loan|debt|tuition|doctor|dentist|medical|medicine|treatment|transport|coverage|out of pocket/.test(text);
}

function normalizeScheduleEvent(event = {}, today = new Date()) {
  const parsedDate = parseScheduleDate(event.date || event.dueDate || event.startDate || event.when);
  if (!parsedDate) return null;

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const eventStart = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  const daysUntil = Math.round((eventStart.getTime() - todayStart.getTime()) / 86400000);
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
    daysUntil,
    hasMoneyImpact: eventHasMoneyImpact({ ...event, amount }),
    raw: event,
  };
}

function summarizeType(event = {}) {
  const type = String(event.type || "Personal").trim() || "Personal";
  if (event.hasMoneyImpact && !/money|impact|bill|payday/i.test(type)) return `${type} / Money impact`;
  return event.hasMoneyImpact ? `${type} / Money impact` : type;
}

function formatScheduleItem(event, index) {
  const lines = [
    `${index + 1}. ${event.title}`,
    `   Date: ${event.dateLabel}${event.time ? ` • ${event.time}` : ""}`,
    `   Type: ${summarizeType(event)}`,
  ];

  if (event.amountText) lines.push(`   Estimated impact: ${event.amountText}`);
  if (event.note) lines.push(`   Note: ${event.note}`);

  return lines.join("\n");
}

export function getScheduleContextForAI(context = {}) {
  const user = context.user || context.authUser || context.profile?.user || null;
  const rawEvents = readScheduleEventsForAI({
    user,
    scheduleEvents: context.scheduleEvents || context.schedule_events || context.calendarEvents || context.events,
  });

  const today = new Date();
  const upcomingItems = rawEvents
    .map((event) => normalizeScheduleEvent(event, today))
    .filter(Boolean)
    .filter((event) => event.daysUntil >= 0)
    .sort((a, b) => `${a.date} ${a.time || "99:99"}`.localeCompare(`${b.date} ${b.time || "99:99"}`));

  const upcomingMoneyItems = upcomingItems.filter((event) => event.hasMoneyImpact);

  return {
    upcomingItems,
    upcomingMoneyItems,
    nextItem: upcomingItems[0] || null,
    nextMoneyItem: upcomingMoneyItems[0] || null,
    hasUpcomingItems: upcomingItems.length > 0,
    hasMoneyImpact: upcomingMoneyItems.length > 0,
    totalEstimatedImpact: upcomingMoneyItems.reduce((sum, event) => sum + (event.amount || 0), 0),
    promptText: upcomingItems.length
      ? `SCHEDULE CONTEXT:\nUpcoming schedule items:\n${upcomingItems.slice(0, 8).map(formatScheduleItem).join("\n")}`
      : "SCHEDULE CONTEXT:\nNo upcoming schedule items are loaded from the Schedule page.",
  };
}

export function shouldIncludeScheduleContext(message = "", context = {}) {
  const text = cleanText(message);
  const schedule = getScheduleContextForAI(context);
  const hasPurchaseAmount = /(?:₱|php\s*)?\d+(?:\.\d{1,2})?/i.test(String(message || ""));
  const explicitScheduleIntent = /\b(schedule|appointment|calendar|upcoming|coming up|planned|plan|commitment|event|reminder|pressure|financially affect|prepare for|what should i prepare|payday advice)\b/.test(text);
  const spendingDecisionIntent = /\b(before i spend|should i buy|can i afford|afford|spending decision|spend|buy|purchase|order|pay|anything i should remember|remember first)\b/.test(text);

  return explicitScheduleIntent || spendingDecisionIntent || (hasPurchaseAmount && schedule.hasMoneyImpact);
}

export function buildSchedulePromptBlock(message = "", context = {}) {
  if (!shouldIncludeScheduleContext(message, context)) {
    return "SCHEDULE CONTEXT:\nNot included because the current message does not ask about schedule, appointments, commitments, or spending affected by future plans.";
  }

  return getScheduleContextForAI(context).promptText;
}

function firstScheduleSentence(event) {
  if (!event) return "You do not have upcoming schedule items loaded from the Schedule page.";
  const impact = event.amountText ? ` with an estimated impact of ${event.amountText}` : "";
  return `You have ${event.title} on ${event.dateLabel}${impact}.`;
}

export function buildScheduleDirectReply(message = "", context = {}) {
  const text = cleanText(message);
  const schedule = getScheduleContextForAI(context);
  const amountMatch = String(message || "").replace(/,/g, "").match(/(?:₱|php\s*)?(\d+(?:\.\d{1,2})?)/i);
  const purchaseAmount = amountMatch ? money(Number(amountMatch[1])) : "";
  const asksSchedule = /\b(schedule|appointment|calendar|upcoming|coming up|planned|commitment|event|reminder|what should i prepare|prepare for)\b/.test(text);
  const asksPressure = /\b(pressure|financially affect|financial pressure|payday advice)\b/.test(text);
  const spendingDecision = /\b(before i spend|should i buy|can i afford|afford|spending decision|spend|buy|purchase|order|pay|anything i should remember|remember first)\b/.test(text);

  if (asksPressure) {
    if (!schedule.upcomingMoneyItems.length) return "I do not see upcoming money-impact schedule items loaded from your Schedule page right now.";
    const next = schedule.nextMoneyItem;
    return `${firstScheduleSentence(next)} That is your nearest upcoming financial pressure, so protect that money before optional spending.`;
  }

  if (asksSchedule) {
    if (!schedule.upcomingItems.length) return "I do not see upcoming schedule items loaded from your Schedule page right now.";
    const next = schedule.nextItem;
    const extra = schedule.upcomingItems.length > 1 ? ` You also have ${schedule.upcomingItems.length - 1} more upcoming schedule item${schedule.upcomingItems.length - 1 === 1 ? "" : "s"}.` : "";
    return `${firstScheduleSentence(next)}${extra}`;
  }

  if (spendingDecision && schedule.nextMoneyItem) {
    const next = schedule.nextMoneyItem;
    const opening = purchaseAmount ? `Before spending ${purchaseAmount}, remember this first.` : "Before spending, remember this first.";
    return `${opening} ${firstScheduleSentence(next)} Make sure that money is protected first, then check if the purchase still fits your wallet and budget.`;
  }

  return "";
}
