import { getRecurrenceOccurrences, toLocalDateKey } from "./recurringCashFlowRepository.js";
import { buildCanonicalStableIncomeTimingSource } from "./stableIncomeTimingAuthority.js";

export const INCOME_SCHEDULE_ID_PREFIX = "income-schedule-";
export const STABLE_INCOME_CALENDAR_SOURCE = "income_hub_stable_source";

const cleanText = (value) => String(value || "").trim();

function cleanMoney(value) {
  const amount = Number(
    String(value ?? "")
      .replace(/php/gi, "")
      .replace(/[₱,\s]/g, "")
  );
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function stableMinimumAmount(source = {}) {
  if (cleanText(source?.stability).toLowerCase() !== "stable") return 0;
  return cleanMoney(
    source?.minimumStableIncome ??
      source?.minimum_stable_income ??
      source?.minimumExpectedIncome ??
      source?.minimum_expected_income ??
      source?.expectedAmount ??
      source?.expected_amount
  );
}

export function getIncomeScheduleProjectionRange(year = new Date().getFullYear()) {
  const safeYear = Number.isFinite(Number(year)) ? Number(year) : new Date().getFullYear();
  return {
    start: toLocalDateKey(new Date(safeYear, 0, 1)),
    end: toLocalDateKey(new Date(safeYear, 11, 31)),
  };
}

export function isStableIncomeScheduleProjection(event = {}) {
  const id = cleanText(event?.id);
  const source = cleanText(event?.source).toLowerCase();
  return id.startsWith(INCOME_SCHEDULE_ID_PREFIX) || source === STABLE_INCOME_CALENDAR_SOURCE;
}

export function buildStableIncomeScheduleProjection(
  incomeSources = [],
  { year = new Date().getFullYear(), start, end } = {}
) {
  const range = start && end ? { start, end } : getIncomeScheduleProjectionRange(year);
  const sources = Array.isArray(incomeSources) ? incomeSources : [];

  return sources.flatMap((source) => {
    const canonicalSource = buildCanonicalStableIncomeTimingSource(source);
    if (!canonicalSource) return [];

    const sourceId = cleanText(canonicalSource.id);
    const sourceName =
      cleanText(canonicalSource.name || canonicalSource.title) || "Expected income";
    const recurrence =
      canonicalSource.incomeRecurrence || canonicalSource.income_recurrence || null;

    if (!sourceId || !recurrence) return [];

    const minimumAmount = stableMinimumAmount(canonicalSource);

    return getRecurrenceOccurrences(recurrence, range.start, range.end, {
      kind: "income",
    }).map((date) => ({
      id: `${INCOME_SCHEDULE_ID_PREFIX}${sourceId}-${date}`,
      title: sourceName,
      date,
      time: "",
      type: "Payday",
      amount: minimumAmount > 0 ? minimumAmount : "",
      direction: "in",
      note:
        minimumAmount > 0
          ? `At least ₱${minimumAmount.toLocaleString("en-PH", {
              maximumFractionDigits: 2,
            })} is expected from ${sourceName}. This is an expected payday only; actual received money remains owned by Income Hub.`
          : `Expected income from ${sourceName}. This is an expected payday only; actual received money remains owned by Income Hub.`,
      impactBreakdown:
        minimumAmount > 0
          ? [
              {
                direction: "in",
                amount: minimumAmount,
                source: "stable_income_minimum",
              },
            ]
          : [
              {
                direction: "in",
                pendingAmount: true,
                source: "income_timing",
              },
            ],
      source: STABLE_INCOME_CALENDAR_SOURCE,
      incomeSourceId: sourceId,
      income_source_id: sourceId,
      derived: true,
      editable: false,
    }));
  });
}

export function mergeScheduleEventsForRender(persistedEvents = [], projectedIncomeEvents = []) {
  const persisted = Array.isArray(persistedEvents) ? persistedEvents : [];
  const projected = Array.isArray(projectedIncomeEvents) ? projectedIncomeEvents : [];
  const merged = [
    ...persisted.filter((event) => !isStableIncomeScheduleProjection(event)),
    ...projected.filter(Boolean),
  ];
  const seenIds = new Set();

  return merged.filter((event) => {
    const id = cleanText(event?.id);
    if (!id) return false;
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
}
