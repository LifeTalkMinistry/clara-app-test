import { isFinancialCardScheduleProjection } from "./financialCardScheduleProjection.js";
import { isStableIncomeScheduleProjection } from "./stableIncomeScheduleProjection.js";

const cleanText = (value) => String(value ?? "").trim();

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
      !isDerivedScheduleProjection(event)
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
