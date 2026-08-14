import { parseDate } from "./clara-buy-check-income-runway-engine.js";
import { readScheduleEventsForAI } from "./clara-schedule-ai-context.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const clean = (value = "") => String(value ?? "").replace(/\s+/g, " ").trim();
const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

function suppliedScheduleValue(context = {}) {
  const sources = [
    context.scheduleEvents,
    context.scheduleContext,
    context.schedule,
    context.upcomingSchedule,
    context.dashboardCardsLiveSnapshot?.schedule,
  ];
  return sources.find(Boolean) || null;
}

function rawSchedule(context = {}) {
  const user = context.user || context.authUser || context.profile?.user || null;

  // Buy Check runs in the browser before the Gemini request. When an active
  // user exists, refresh their exact schedule storage at decision time instead
  // of trusting a React snapshot that may have been created before the event
  // was saved.
  if (user && typeof window !== "undefined" && window.localStorage) {
    return {
      events: readScheduleEventsForAI({ user }),
      connected: true,
      source: "active_user_schedule_storage",
    };
  }

  const value = suppliedScheduleValue(context);
  const directEvents = readScheduleEventsForAI({ scheduleEvents: value });
  if (directEvents.length) {
    return {
      events: directEvents,
      connected: value?.connected !== false,
      source: clean(value?.source || "schedule_context"),
    };
  }

  if (Array.isArray(value)) return { events: [], connected: true, source: "array" };
  if (value && typeof value === "object") {
    return {
      events: [],
      connected: value.connected !== false,
      source: clean(value.source || "schedule_context"),
    };
  }

  return { events: [], connected: false, source: "unavailable" };
}

function impactRows(event = {}) {
  if (Array.isArray(event.impactBreakdown)) return event.impactBreakdown.filter(Boolean);
  if (Array.isArray(event.impact_breakdown)) return event.impact_breakdown.filter(Boolean);
  return [];
}

function eventDirection(event = {}, type = "") {
  const rows = impactRows(event);
  const value = clean(event.direction || rows[0]?.direction || (String(type).toLowerCase() === "payday" ? "in" : "out")).toLowerCase();
  return value === "in" ? "in" : "out";
}

function eventHasMoneyImpact(event = {}, type = "", amount = 0) {
  const rows = impactRows(event);
  const sourceText = `${event.title || event.name || ""} ${event.note || event.description || ""}`.toLowerCase();
  const normalizedType = String(type || "").toLowerCase();
  return Boolean(
    event.affectsMoney === true ||
      event.affects_money === true ||
      rows.length ||
      amount > 0 ||
      ["bill", "payday", "money"].includes(normalizedType) ||
      /\b(bill|rent|due|payment|salary|payday|tuition|fee|cost)\b/i.test(sourceText)
  );
}

function eventPendingAmount(event = {}) {
  const rows = impactRows(event);
  return Boolean(
    event.pendingAmount === true ||
      event.pending_amount === true ||
      rows.some((row) => row?.pendingAmount === true || row?.pending_amount === true)
  );
}

function normalizeEvent(event = {}, index = 0) {
  const date = parseDate(event.date || event.start || event.startDate || event.start_date || event.dueDate || event.due_date);
  if (!date) return null;
  const title = clean(event.title || event.name || event.label || event.type || "Upcoming event");
  const source = clean(event.source || "schedule");
  const userConfirmed = event.userConfirmed === true || event.user_confirmed === true || event.confirmed === true;
  if (/seeded|demo|sample/i.test(source) && !userConfirmed) return null;
  if (["sample-bill", "sample-payday", "sample-reset", "sample-checkin"].includes(String(event.id || "").toLowerCase()) && !userConfirmed) return null;

  const type = clean(event.type || event.category || "Personal");
  const amount = Math.max(0, toNumber(event.amount ?? event.cost ?? event.moneyImpact ?? event.money_impact ?? event.expectedAmount ?? event.expected_amount));
  const direction = eventDirection(event, type);
  const hasMoneyImpact = eventHasMoneyImpact(event, type, amount);
  const pendingAmount = eventPendingAmount(event);

  return {
    id: clean(event.id || `${date.toISOString()}:${title}:${index}`),
    title,
    type,
    date: date.toISOString(),
    amount,
    direction,
    hasMoneyImpact,
    pendingAmount,
    note: clean(event.note || event.description),
    source,
    userConfirmed,
  };
}

function dedupeEvents(events = []) {
  const seen = new Set();
  return events.filter((event) => {
    const key = event.id || `${event.title.toLowerCase()}:${event.date.slice(0, 10)}:${event.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function analyzeCalendarImpact(context = {}, incomeRunway = {}, options = {}) {
  const now = parseDate(options.now) || new Date();
  const schedule = rawSchedule(context);
  const events = dedupeEvents(schedule.events.map(normalizeEvent).filter(Boolean))
    .filter((event) => new Date(event.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    .sort((left, right) => new Date(left.date) - new Date(right.date));
  const reliableIncomeDate = ["high", "medium"].includes(incomeRunway.confidence) ? parseDate(incomeRunway.estimatedNextIncomeDate) : null;
  const horizon = reliableIncomeDate || new Date(now.getTime() + 14 * DAY_MS);
  const eventsBeforeNextIncome = events.filter((event) => new Date(event.date) <= horizon);
  const moneyOutEvents = eventsBeforeNextIncome.filter((event) => event.hasMoneyImpact && event.direction !== "in");
  const moneyInEvents = eventsBeforeNextIncome.filter((event) => event.hasMoneyImpact && event.direction === "in");
  const knownCostEvents = moneyOutEvents.filter((event) => event.amount > 0);
  const unknownCostEvents = moneyOutEvents.filter((event) => event.amount <= 0);
  const knownIncomeEvents = moneyInEvents.filter((event) => event.amount > 0);
  const unknownIncomeEvents = moneyInEvents.filter((event) => event.amount <= 0);

  return {
    connected: schedule.connected,
    source: schedule.source,
    upcomingEvents: events.slice(0, 10),
    eventsBeforeNextIncome,
    knownCostEvents,
    knownMoneyImpactTotal: knownCostEvents.reduce((sum, event) => sum + event.amount, 0),
    unknownCostEvents,
    knownIncomeEvents,
    knownMoneyInTotal: knownIncomeEvents.reduce((sum, event) => sum + event.amount, 0),
    unknownIncomeEvents,
    nextRelevantEvent: eventsBeforeNextIncome[0] || null,
    horizonDate: horizon.toISOString(),
    horizonBasis: reliableIncomeDate ? "next_reliable_income" : "fourteen_day_fallback",
  };
}

export { analyzeCalendarImpact, normalizeEvent };
