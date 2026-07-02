import { parseDate } from "./clara-buy-check-income-runway-engine.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const clean = (value = "") => String(value ?? "").replace(/\s+/g, " ").trim();
const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

function rawSchedule(context = {}) {
  const sources = [context.scheduleEvents, context.scheduleContext, context.schedule, context.upcomingSchedule, context.dashboardCardsLiveSnapshot?.schedule];
  const value = sources.find(Boolean);
  if (Array.isArray(value)) return { events: value, connected: true, source: "array" };
  if (value && typeof value === "object") {
    const events = [
      ...(Array.isArray(value.upcomingEvents) ? value.upcomingEvents : []),
      ...(Array.isArray(value.moneyImpactEvents) ? value.moneyImpactEvents : []),
      ...(Array.isArray(value.events) ? value.events : []),
    ];
    return { events, connected: value.connected !== false, source: clean(value.source || "schedule_context") };
  }
  return { events: [], connected: false, source: "unavailable" };
}

function normalizeEvent(event = {}, index = 0) {
  const date = parseDate(event.date || event.start || event.startDate || event.start_date || event.dueDate || event.due_date);
  if (!date) return null;
  const title = clean(event.title || event.name || event.label || event.type || "Upcoming event");
  const source = clean(event.source || "schedule");
  const userConfirmed = event.userConfirmed === true || event.user_confirmed === true || event.confirmed === true;
  if (/seeded|demo|sample/i.test(source) && !userConfirmed) return null;
  return {
    id: clean(event.id || `${date.toISOString()}:${title}:${index}`),
    title,
    type: clean(event.type || event.category || "Personal"),
    date: date.toISOString(),
    amount: Math.max(0, toNumber(event.amount ?? event.cost ?? event.moneyImpact ?? event.money_impact ?? event.expectedAmount ?? event.expected_amount)),
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
  const knownCostEvents = eventsBeforeNextIncome.filter((event) => event.amount > 0);
  const unknownCostEvents = eventsBeforeNextIncome.filter((event) => event.amount <= 0);
  return {
    connected: schedule.connected,
    source: schedule.source,
    upcomingEvents: events.slice(0, 10),
    eventsBeforeNextIncome,
    knownCostEvents,
    knownMoneyImpactTotal: knownCostEvents.reduce((sum, event) => sum + event.amount, 0),
    unknownCostEvents,
    nextRelevantEvent: eventsBeforeNextIncome[0] || null,
    horizonDate: horizon.toISOString(),
    horizonBasis: reliableIncomeDate ? "next_reliable_income" : "fourteen_day_fallback",
  };
}

export { analyzeCalendarImpact, normalizeEvent };
