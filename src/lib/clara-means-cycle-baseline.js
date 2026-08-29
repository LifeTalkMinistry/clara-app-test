export const MEANS_CYCLE_BASELINE_VERSION = 6;
export const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v6";
export const MEANS_CROSS_CHECK_ANCHOR_STORAGE_PREFIX = "clara:means-cross-check-anchor:v1";

const money = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const signedMoney = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const text = (value) => String(value ?? "").trim();
const dateKey = (value) => text(value).slice(0, 10);

function occurrenceId(value = {}, index = 0) {
  return text(value.id || value.occurrenceId || value.occurrence_id) ||
    `${text(value.kind || "requirement")}:${dateKey(value.date)}:${index}`;
}

function normalizedOccurrence(value = {}, index = 0) {
  const id = occurrenceId(value, index);
  const date = dateKey(value.date || value.dueDate || value.due_date);
  if (!id || !date) return null;
  return {
    ...value,
    id,
    date,
    amount: money(value.amount),
    actualPaid: money(value.actualPaid ?? value.actual_paid),
    kind: text(value.kind || "requirement") || "requirement",
  };
}

function normalizedProtectedMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value).reduce((result, [id, entry]) => {
    const normalized = normalizedOccurrence({ ...(entry || {}), id });
    if (!normalized) return result;
    result[id] = {
      id,
      date: normalized.date,
      amount: normalized.amount,
      kind: normalized.kind,
    };
    return result;
  }, {});
}

export function meansCycleBaselineStorageKey(ownerId, cycleStart, cycleEnd) {
  const owner = encodeURIComponent(text(ownerId) || "local-user");
  return `${MEANS_CYCLE_BASELINE_STORAGE_PREFIX}:${owner}:${dateKey(cycleStart)}:${dateKey(cycleEnd)}`;
}

export function meansCrossCheckAnchorStorageKey(ownerId) {
  const owner = encodeURIComponent(text(ownerId) || "local-user");
  return `${MEANS_CROSS_CHECK_ANCHOR_STORAGE_PREFIX}:${owner}`;
}

export function parseMeansBaseline(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Governing Means baseline lifecycle:
 * - today/past occurrences are protected at the planned amount first observed for that day
 * - future occurrences are recalculated from the current legitimate plan
 * - actual spending/payment never expands, shrinks, or reconstructs the denominator
 * - protected occurrences remain represented even if later deleted from the live plan
 *
 * extraCurrentCycleActual and carriedObligations remain accepted only for backwards-compatible
 * diagnostics. They are intentionally excluded from requiredRunway because realized money and
 * out-of-cycle carry are not current-cycle planned requirements under the Means authority.
 *
 * Old v1-v5 scalar locks are intentionally ignored. They mixed obsolete product rules
 * (including globally frozen same-cycle totals and stale Savings/Emergency/Lent effects)
 * and cannot be trusted as a migration source for v6.
 */
export function resolveAdaptiveMeansBaselineState({
  stored = null,
  cycleStart = "",
  cycleEnd = "",
  today = "",
  occurrences = [],
  extraCurrentCycleActual = 0,
  carriedObligations = 0,
} = {}) {
  const start = dateKey(cycleStart);
  const end = dateKey(cycleEnd);
  const currentDay = dateKey(today);
  const sameCycle = Boolean(
    stored &&
      Number(stored.version) === MEANS_CYCLE_BASELINE_VERSION &&
      dateKey(stored.cycleStart) === start &&
      dateKey(stored.cycleEnd) === end
  );
  const protectedOccurrences = sameCycle
    ? normalizedProtectedMap(stored.protectedOccurrences)
    : {};

  const live = (Array.isArray(occurrences) ? occurrences : [])
    .map(normalizedOccurrence)
    .filter(Boolean)
    .filter((entry) => entry.date >= start && entry.date < end);
  const liveIds = new Set(live.map((entry) => entry.id));
  const contributions = [];

  live.forEach((entry) => {
    const protectedNow = Boolean(currentDay && entry.date <= currentDay);
    if (protectedNow && !protectedOccurrences[entry.id]) {
      protectedOccurrences[entry.id] = {
        id: entry.id,
        date: entry.date,
        amount: entry.amount,
        kind: entry.kind,
      };
    }

    const protectedEntry = protectedOccurrences[entry.id];
    const plannedAmount = protectedEntry ? money(protectedEntry.amount) : entry.amount;

    contributions.push({
      id: entry.id,
      date: entry.date,
      kind: entry.kind,
      protected: Boolean(protectedEntry),
      plannedAmount,
      actualPaid: entry.actualPaid,
      amount: plannedAmount,
    });
  });

  // A protected today/past item survives a later edit/delete. Future deleted items do not.
  Object.values(protectedOccurrences).forEach((entry) => {
    if (liveIds.has(entry.id)) return;
    if (!currentDay || entry.date > currentDay) return;
    if (entry.date < start || entry.date >= end) return;
    contributions.push({
      id: entry.id,
      date: entry.date,
      kind: entry.kind,
      protected: true,
      plannedAmount: money(entry.amount),
      actualPaid: 0,
      amount: money(entry.amount),
      retainedAfterPlanMutation: true,
    });
  });

  const plannedRequired = contributions.reduce((sum, entry) => sum + money(entry.amount), 0);
  const ignoredActualOutsidePlan = money(extraCurrentCycleActual);
  const ignoredCarriedObligations = money(carriedObligations);
  const requiredRunway = plannedRequired;
  const next = {
    version: MEANS_CYCLE_BASELINE_VERSION,
    cycleStart: start,
    cycleEnd: end,
    protectedThrough: currentDay,
    protectedOccurrences,
    requiredRunway,
    updatedAt: new Date().toISOString(),
  };

  return {
    baseline: next,
    requiredRunway,
    protectedOccurrences,
    contributions,
    plannedRequired,
    extraCurrentCycleActual: ignoredActualOutsidePlan,
    carriedObligations: ignoredCarriedObligations,
    ignoredNonPlanBaselineInputs: ignoredActualOutsidePlan + ignoredCarriedObligations,
    shouldPersist: true,
  };
}

export function calculateMeansScoreState({
  effectiveCurrentMoney = 0,
  requiredRunway = 0,
} = {}) {
  const effective = signedMoney(effectiveCurrentMoney);
  const required = money(requiredRunway);
  const score = required > 0
    ? Math.round((effective / required) * 100)
    : effective > 0
      ? 100
      : 0;

  return {
    score,
    effectiveCurrentMoney: effective,
    requiredRunway: required,
    scoreRoom: effective - required,
    fullyCovered: required > 0 && effective >= required,
    coverageState: required > 0 ? "scored" : "no_requirements",
  };
}

// Kept as a small compatibility helper for callers/tests that need requirement sanitizing.
export function calculateCycleRequiredRunway({ upcoming = 0 } = {}) {
  return money(upcoming);
}
