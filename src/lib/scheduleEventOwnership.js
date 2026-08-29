import { financialDateKey, normalizeFinancialDateKey } from "./clara-financial-day.js";
import { isFinancialCardScheduleProjection } from "./financialCardScheduleProjection.js";
import { isStableIncomeScheduleProjection } from "./stableIncomeScheduleProjection.js";

const cleanText = (value) => String(value ?? "").trim();

function calendarCreationTimestamp(event = {}) {
  const id = cleanText(event?.id);
  const timestampPrefix = id.match(/^(\d{12,})-/)?.[1];
  if (!timestampPrefix) return null;
  const timestamp = Number(timestampPrefix);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

export function isRetroactiveCalendarPlanCreation(event = {}) {
  const scheduledDate = normalizeFinancialDateKey(event?.date);
  const creationTimestamp = calendarCreationTimestamp(event);
  if (!scheduledDate || !creationTimestamp) return false;

  const creationDate = financialDateKey(new Date(creationTimestamp));
  return Boolean(creationDate && scheduledDate < creationDate);
}

export function isDerivedScheduleProjection(event = {}) {
  return (
    isStableIncomeScheduleProjection(event) ||
    isFinancialCardScheduleProjection(event)
  );
}

export function isScheduleOwnedEvent(event = {}) {
  return Boolean(
    cleanText(event?.id) &&
      cleanText(event?.title) &&
      cleanText(event?.date) &&
      !isDerivedScheduleProjection(event) &&
      !isRetroactiveCalendarPlanCreation(event)
  );
}

export function filterScheduleOwnedEvents(events = []) {
  return (Array.isArray(events) ? events : []).filter(isScheduleOwnedEvent);
}

export function mergeScheduleEventCollections(...collections) {
  const merged = collections.flatMap((collection) =>
    Array.isArray(collection) ? collection.filter(Boolean) : []
  );
  const seenIds = new Set();

  return merged.filter((event) => {
    const id = cleanText(event?.id);
    if (!id || seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
}
