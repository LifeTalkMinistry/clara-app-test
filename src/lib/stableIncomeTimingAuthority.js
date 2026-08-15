import {
  getIncomeTimingRecords,
  normalizeRecurrenceRule,
  syncIncomeTimingFromSource,
} from "./recurringCashFlowRepository.js";

const INCOME_RECURRENCES = new Set([
  "weekly",
  "biweekly",
  "twice_monthly",
  "monthly",
  "custom",
]);

const clean = (value) => String(value || "").trim();
const sourceIdOf = (source = {}) =>
  clean(source.id || source.incomeSourceId || source.income_source_id);
const timingSourceIdOf = (timing = {}) =>
  clean(timing.incomeSourceId || timing.income_source_id || timing.id);
const isStable = (source = {}) =>
  clean(source.stability).toLowerCase() === "stable";
const isInactive = (source = {}) =>
  Boolean(
    source.isArchived === true ||
      source.is_archived === true ||
      source.deletedAt ||
      source.deleted_at ||
      source.syncStatus === "local_deleted"
  );

function recurrenceInput(source = {}) {
  return (
    source.incomeRecurrence ||
    source.income_recurrence ||
    source.recurrenceRule ||
    source.recurrence_rule ||
    null
  );
}

function hasValidRecurrence(source = {}) {
  const input = recurrenceInput(source);
  if (!input || typeof input !== "object") return false;
  const type = clean(input.type || input.recurrence || input.frequency).toLowerCase();
  if (!INCOME_RECURRENCES.has(type)) return false;
  if (type !== "custom") return true;
  const dates = input.customDates || input.custom_dates || input.dates;
  return Array.isArray(dates) && dates.some(Boolean);
}

function firstDayOfCalendarYear(dateKey = "") {
  const match = clean(dateKey).match(/^(\d{4})-/);
  return match ? `${match[1]}-01-01` : dateKey;
}

function canonicalRecurrence(source = {}) {
  const recurrence = normalizeRecurrenceRule(recurrenceInput(source) || {}, {
    kind: "income",
    fallbackDate:
      source.expectedStartDate || source.expected_start_date || new Date(),
  });

  // Monthly stable income describes a calendar recurrence, not a transaction
  // that starts only on the day the user configured it. Anchor the recurring
  // rule to the start of that calendar year so Schedule can deterministically
  // reconstruct every legitimate payday in the currently navigable year.
  if (recurrence.type === "monthly" || recurrence.type === "twice_monthly") {
    const startDate = firstDayOfCalendarYear(recurrence.startDate);
    return { ...recurrence, startDate, start_date: startDate };
  }

  return recurrence;
}

export function buildCanonicalStableIncomeTimingSource(source = {}) {
  const sourceId = sourceIdOf(source);
  const recurrenceValid = hasValidRecurrence(source);
  const explicitTimingEnabled =
    source.usualIncomeDateEnabled ?? source.usual_income_date_enabled;
  const timingEnabled =
    explicitTimingEnabled === false
      ? false
      : explicitTimingEnabled === true || recurrenceValid;

  if (
    !sourceId ||
    !isStable(source) ||
    isInactive(source) ||
    !timingEnabled ||
    !recurrenceValid
  ) {
    return null;
  }

  const recurrence = canonicalRecurrence(source);
  const explicitBudgetTiming =
    source.useForBudgetTiming ?? source.use_for_budget_timing;
  const useForBudgetTiming = explicitBudgetTiming !== false;

  return {
    ...source,
    id: sourceId,
    usualIncomeDateEnabled: true,
    usual_income_date_enabled: true,
    incomeRecurrence: recurrence,
    income_recurrence: recurrence,
    useForBudgetTiming,
    use_for_budget_timing: useForBudgetTiming,
  };
}

function recurrenceSignature(value = {}) {
  const recurrence = normalizeRecurrenceRule(value, {
    kind: "income",
    fallbackDate: value?.startDate || value?.start_date || new Date(),
  });
  return JSON.stringify({
    type: recurrence.type,
    startDate: recurrence.startDate,
    dayOfWeek: recurrence.dayOfWeek,
    dayOfMonth: recurrence.dayOfMonth,
    days: recurrence.days,
    customDates: recurrence.customDates,
  });
}

function timingMatchesSource(timing = {}, canonicalSource = {}) {
  return (
    timingSourceIdOf(timing) === sourceIdOf(canonicalSource) &&
    clean(timing.sourceName || timing.source_name) ===
      clean(canonicalSource.name || canonicalSource.title || "Income source") &&
    timing.enabled !== false &&
    timing.active !== false &&
    Boolean(timing.useForBudgetTiming || timing.use_for_budget_timing) ===
      Boolean(
        canonicalSource.useForBudgetTiming ||
          canonicalSource.use_for_budget_timing
      ) &&
    recurrenceSignature(timing.recurrence || timing.recurrence_rule || {}) ===
      recurrenceSignature(
        canonicalSource.incomeRecurrence ||
          canonicalSource.income_recurrence ||
          {}
      )
  );
}

export function removeStableIncomeTimingSource(ownerId, sourceId) {
  const safeSourceId = clean(sourceId);
  if (!safeSourceId) return false;
  const existing = getIncomeTimingRecords(ownerId).find(
    (timing) => timingSourceIdOf(timing) === safeSourceId
  );
  if (!existing) return false;

  syncIncomeTimingFromSource(ownerId, {
    id: safeSourceId,
    stability: "Irregular",
    usualIncomeDateEnabled: false,
    usual_income_date_enabled: false,
    useForBudgetTiming: false,
    use_for_budget_timing: false,
  });
  return true;
}

export function syncStableIncomeTimingSource(ownerId, source = {}) {
  const sourceId = sourceIdOf(source);
  if (!sourceId) return null;

  const canonicalSource = buildCanonicalStableIncomeTimingSource(source);
  if (!canonicalSource) {
    removeStableIncomeTimingSource(ownerId, sourceId);
    return null;
  }

  const existing = getIncomeTimingRecords(ownerId).find(
    (timing) => timingSourceIdOf(timing) === sourceId
  );
  if (existing && timingMatchesSource(existing, canonicalSource)) return existing;

  return syncIncomeTimingFromSource(ownerId, canonicalSource);
}

export function reconcileStableIncomeTimingCache(ownerId, sources = []) {
  const canonicalSources = Array.isArray(sources) ? sources.filter(Boolean) : [];
  const seenSourceIds = new Set();

  canonicalSources.forEach((source) => {
    const sourceId = sourceIdOf(source);
    if (!sourceId) return;
    seenSourceIds.add(sourceId);
    syncStableIncomeTimingSource(ownerId, source);
  });

  getIncomeTimingRecords(ownerId).forEach((timing) => {
    const sourceId = timingSourceIdOf(timing);
    if (sourceId && !seenSourceIds.has(sourceId)) {
      removeStableIncomeTimingSource(ownerId, sourceId);
    }
  });

  return getIncomeTimingRecords(ownerId);
}
