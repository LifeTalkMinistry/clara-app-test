export const MEANS_CYCLE_BASELINE_VERSION = 7;
export const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v7";
export const LEGACY_MEANS_CYCLE_BASELINE_V6_STORAGE_PREFIX = "clara:means-cycle-baseline:v6";
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
  return text(
    value.requirementKey ||
      value.requirement_key ||
      value.id ||
      value.occurrenceId ||
      value.occurrence_id
  ) || `${text(value.kind || "requirement")}:${dateKey(value.date)}:${index}`;
}

function normalizedOccurrence(value = {}, index = 0) {
  const id = occurrenceId(value, index);
  const date = dateKey(value.date || value.dueDate || value.due_date);
  if (!id || !date) return null;

  const plannedAmount = money(value.plannedAmount ?? value.planned_amount ?? value.amount);
  const fulfilledAmount = money(
    value.fulfilledAmount ??
      value.fulfilled_amount ??
      value.actualPaid ??
      value.actual_paid
  );
  const fulfilledBeforeCycle = money(
    value.fulfilledBeforeCycle ??
      value.fulfilled_before_cycle ??
      value.actualPaidBeforeCycle ??
      value.actual_paid_before_cycle
  );
  const kind = text(value.kind || value.sourceType || value.source_type || "requirement") ||
    "requirement";

  return {
    ...value,
    id,
    requirementKey: id,
    date,
    plannedAmount,
    fulfilledAmount,
    fulfilledBeforeCycle,
    actualPaid: fulfilledAmount,
    amount: plannedAmount,
    kind,
    sourceType: text(value.sourceType || value.source_type || kind) || kind,
    sourceId: text(
      value.sourceId ||
        value.source_id ||
        value.debtId ||
        value.debt_id ||
        value.scheduleId ||
        value.schedule_id ||
        id
    ) || id,
  };
}

function normalizedProtectedMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value).reduce((result, [id, entry]) => {
    const normalized = normalizedOccurrence({ ...(entry || {}), id });
    if (!normalized) return result;
    result[id] = {
      id,
      requirementKey: id,
      date: normalized.date,
      amount: normalized.plannedAmount,
      plannedAmount: normalized.plannedAmount,
      kind: normalized.kind,
      sourceType: normalized.sourceType,
      sourceId: normalized.sourceId,
    };
    return result;
  }, {});
}

function sameCycle(stored, start, end) {
  return Boolean(
    stored &&
      dateKey(stored.cycleStart) === start &&
      dateKey(stored.cycleEnd) === end
  );
}

export function meansCycleBaselineStorageKey(ownerId, cycleStart, cycleEnd) {
  const owner = encodeURIComponent(text(ownerId) || "local-user");
  return `${MEANS_CYCLE_BASELINE_STORAGE_PREFIX}:${owner}:${dateKey(cycleStart)}:${dateKey(cycleEnd)}`;
}

export function legacyMeansCycleBaselineV6StorageKey(ownerId, cycleStart, cycleEnd) {
  const owner = encodeURIComponent(text(ownerId) || "local-user");
  return `${LEGACY_MEANS_CYCLE_BASELINE_V6_STORAGE_PREFIX}:${owner}:${dateKey(cycleStart)}:${dateKey(cycleEnd)}`;
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

function buildRequirements({
  occurrences = [],
  protectedOccurrences = {},
  cycleStart = "",
  cycleEnd = "",
  today = "",
} = {}) {
  const start = dateKey(cycleStart);
  const end = dateKey(cycleEnd);
  const currentDay = dateKey(today);
  const protectedMap = normalizedProtectedMap(protectedOccurrences);
  const live = (Array.isArray(occurrences) ? occurrences : [])
    .map(normalizedOccurrence)
    .filter(Boolean)
    .filter((entry) => entry.date >= start && entry.date < end);
  const liveIds = new Set(live.map((entry) => entry.id));
  const requirements = [];

  live.forEach((entry) => {
    const protectedNow = Boolean(currentDay && entry.date <= currentDay);
    if (protectedNow && !protectedMap[entry.id]) {
      protectedMap[entry.id] = {
        id: entry.id,
        requirementKey: entry.id,
        date: entry.date,
        amount: entry.plannedAmount,
        plannedAmount: entry.plannedAmount,
        kind: entry.kind,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
      };
    }

    const protectedEntry = protectedMap[entry.id];
    const plannedAmount = protectedEntry
      ? money(protectedEntry.plannedAmount ?? protectedEntry.amount)
      : entry.plannedAmount;
    const fulfilledAmount = Math.min(entry.fulfilledAmount, plannedAmount);
    const fulfilledBeforeCycle = Math.min(entry.fulfilledBeforeCycle, plannedAmount);
    const remainingAmount = Math.max(plannedAmount - fulfilledAmount, 0);
    const anchorAmount = Math.max(plannedAmount - fulfilledBeforeCycle, 0);

    requirements.push({
      requirementKey: entry.id,
      id: entry.id,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      cycleStart: start,
      cycleEnd: end,
      date: entry.date,
      kind: entry.kind,
      protected: Boolean(protectedEntry),
      plannedAmount,
      fulfilledAmount,
      fulfilledBeforeCycle,
      remainingAmount,
      anchorAmount,
      actualPaid: fulfilledAmount,
      amount: remainingAmount,
    });
  });

  // Once a requirement reaches today/past it remains represented while unfulfilled,
  // even if the live plan is later edited or removed. Future deletions remain legitimate.
  Object.values(protectedMap).forEach((entry) => {
    if (liveIds.has(entry.id)) return;
    if (!currentDay || entry.date > currentDay) return;
    if (entry.date < start || entry.date >= end) return;
    const plannedAmount = money(entry.plannedAmount ?? entry.amount);
    requirements.push({
      requirementKey: entry.id,
      id: entry.id,
      sourceType: text(entry.sourceType || entry.kind || "requirement") || "requirement",
      sourceId: text(entry.sourceId || entry.id) || entry.id,
      cycleStart: start,
      cycleEnd: end,
      date: entry.date,
      kind: text(entry.kind || "requirement") || "requirement",
      protected: true,
      plannedAmount,
      fulfilledAmount: 0,
      fulfilledBeforeCycle: 0,
      remainingAmount: plannedAmount,
      anchorAmount: plannedAmount,
      actualPaid: 0,
      amount: plannedAmount,
      retainedAfterPlanMutation: true,
    });
  });

  return { requirements, protectedOccurrences: protectedMap };
}

/**
 * V7 separates two financial truths that v6 incorrectly conflated:
 * - cycle100Anchor: immutable score ruler for the active cycle
 * - remainingPlannedSpending: live unfulfilled recognized plan
 *
 * The exported function name is retained so existing callers can migrate atomically,
 * but its semantics are now the fixed-anchor V7 authority.
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
  const sameStoredCycle = sameCycle(stored, start, end);
  const storedVersion = sameStoredCycle ? Number(stored?.version || 0) : 0;
  const sameV7Cycle = sameStoredCycle && storedVersion === MEANS_CYCLE_BASELINE_VERSION;
  const legacySameCycle = sameStoredCycle && storedVersion > 0 && !sameV7Cycle;

  const protectedSeed = sameStoredCycle ? stored?.protectedOccurrences : {};
  const { requirements, protectedOccurrences } = buildRequirements({
    occurrences,
    protectedOccurrences: protectedSeed,
    cycleStart: start,
    cycleEnd: end,
    today: currentDay,
  });

  const plannedRequired = requirements.reduce(
    (sum, entry) => sum + money(entry.plannedAmount),
    0
  );
  const remainingPlannedSpending = requirements.reduce(
    (sum, entry) => sum + money(entry.remainingAmount),
    0
  );
  const reconstructableInitialPlan = requirements.reduce(
    (sum, entry) => sum + money(entry.anchorAmount),
    0
  );

  const ignoredActualOutsidePlan = money(extraCurrentCycleActual);
  const ignoredCarriedObligations = money(carriedObligations);

  if (legacySameCycle) {
    return {
      baseline: stored,
      cycle100Anchor: 0,
      requiredRunway: 0,
      remainingPlannedSpending,
      requirements,
      contributions: requirements,
      protectedOccurrences,
      plannedRequired,
      reconstructableInitialPlan,
      extraCurrentCycleActual: ignoredActualOutsidePlan,
      carriedObligations: ignoredCarriedObligations,
      ignoredNonPlanBaselineInputs: ignoredActualOutsidePlan + ignoredCarriedObligations,
      anchorState: "migration_unresolved",
      migrationUnresolved: true,
      legacyVersion: storedVersion,
      shouldPersist: false,
    };
  }

  const storedAnchor = sameV7Cycle ? money(stored?.cycle100Anchor) : 0;
  const cycle100Anchor = sameV7Cycle ? storedAnchor : reconstructableInitialPlan;
  const anchorState = cycle100Anchor > 0 ? "anchored" : "no_anchor";
  const shouldPersist = sameV7Cycle || cycle100Anchor > 0;

  const next = {
    version: MEANS_CYCLE_BASELINE_VERSION,
    cycleStart: start,
    cycleEnd: end,
    protectedThrough: currentDay,
    protectedOccurrences,
    cycle100Anchor,
    anchorState,
    anchorEstablishedAt:
      sameV7Cycle && text(stored?.anchorEstablishedAt)
        ? stored.anchorEstablishedAt
        : cycle100Anchor > 0
          ? new Date().toISOString()
          : null,
    anchorRequirements:
      sameV7Cycle && Array.isArray(stored?.anchorRequirements)
        ? stored.anchorRequirements
        : requirements.map((entry) => ({
            requirementKey: entry.requirementKey,
            sourceType: entry.sourceType,
            sourceId: entry.sourceId,
            date: entry.date,
            amount: entry.anchorAmount,
          })),
    updatedAt: new Date().toISOString(),
  };

  return {
    baseline: next,
    cycle100Anchor,
    // Compatibility alias only. V7 callers must prefer cycle100Anchor.
    requiredRunway: cycle100Anchor,
    remainingPlannedSpending,
    requirements,
    contributions: requirements,
    protectedOccurrences,
    plannedRequired,
    reconstructableInitialPlan,
    extraCurrentCycleActual: ignoredActualOutsidePlan,
    carriedObligations: ignoredCarriedObligations,
    ignoredNonPlanBaselineInputs: ignoredActualOutsidePlan + ignoredCarriedObligations,
    anchorState,
    migrationUnresolved: false,
    legacyVersion: 0,
    shouldPersist,
  };
}

export function calculateMeansScoreState({
  availableWalletMoney,
  remainingPlannedSpending,
  cycle100Anchor,
  // Legacy aliases are accepted only so callers can migrate without a split authority.
  effectiveCurrentMoney,
  requiredRunway,
} = {}) {
  const available = signedMoney(
    availableWalletMoney ?? effectiveCurrentMoney ?? 0
  );
  const anchor = money(cycle100Anchor ?? requiredRunway ?? 0);
  const remaining = money(
    remainingPlannedSpending ?? anchor
  );
  const wallBill = available - remaining;
  const rawScore = anchor > 0
    ? 100 + ((wallBill / anchor) * 100)
    : null;
  const score = rawScore == null ? null : Math.round(rawScore);

  return {
    score,
    rawScore,
    meansScore: score,
    availableWalletMoney: available,
    effectiveCurrentMoney: available,
    remainingPlannedSpending: remaining,
    cycle100Anchor: anchor,
    requiredRunway: anchor,
    wallBill,
    scoreRoom: wallBill,
    fullyCovered: wallBill >= 0,
    coverageState: anchor > 0 ? "scored" : "no_anchor",
    anchorResolved: anchor > 0,
  };
}

/**
 * Authoritative event matcher for a single explicit planned requirement.
 * A caller must provide stable requirement identity; planning_status by itself is not enough.
 */
export function matchMeansOutflowToRequirement({
  actualOutflowAmount = 0,
  requirement = null,
  requirementKey = "",
} = {}) {
  const actual = money(actualOutflowAmount);
  const expectedKey = text(requirementKey);
  const targetKey = text(requirement?.requirementKey || requirement?.requirement_key || requirement?.id);
  const remainingBefore = money(
    requirement?.remainingAmount ??
      requirement?.remaining_amount ??
      Math.max(
        money(requirement?.plannedAmount ?? requirement?.planned_amount ?? requirement?.amount) -
          money(requirement?.fulfilledAmount ?? requirement?.fulfilled_amount ?? requirement?.actualPaid),
        0
      )
  );
  const identityMatches = Boolean(expectedKey && targetKey && expectedKey === targetKey);
  const matchedPlannedAmount = identityMatches
    ? Math.min(actual, remainingBefore)
    : 0;
  const unmatchedAmount = Math.max(actual - matchedPlannedAmount, 0);

  return {
    actualOutflowAmount: actual,
    matchedPlannedAmount,
    unmatchedAmount,
    matchedRequirementKey: matchedPlannedAmount > 0 ? targetKey : null,
    remainingAmountBeforeEvent: remainingBefore,
    remainingAmountAfterEvent: Math.max(remainingBefore - matchedPlannedAmount, 0),
  };
}

// Compatibility helper for callers/tests that only need non-negative requirement sanitizing.
export function calculateCycleRequiredRunway({ upcoming = 0 } = {}) {
  return money(upcoming);
}
