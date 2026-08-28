const BASELINE_VERSION = 6;

function finiteNonNegative(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;

  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
}

export function stableMeansPlanFingerprint(value) {
  return JSON.stringify(canonicalize(value));
}

// The runtime passes the complete declared/predicted requirement for the whole pay cycle.
// This helper deliberately ignores income, wallet balances, actual spending, and elapsed time.
export function calculateCycleRequiredRunway({ upcoming = 0 } = {}) {
  return finiteNonNegative(upcoming);
}

export function resolveMeansCycleBaselineState({
  stored = null,
  cycleStart = "",
  cycleEnd = "",
  planFingerprint = "",
  requiredRunway = 0,
  assumedSpent = 0,
  legacyRequiredRunway = null,
} = {}) {
  const normalizedRequired = finiteNonNegative(requiredRunway);
  const normalizedAssumed = finiteNonNegative(assumedSpent);
  const normalizedLegacy = finiteNonNegative(legacyRequiredRunway);
  const validSameCycleBaseline = Boolean(
    stored &&
      Number(stored.version) === BASELINE_VERSION &&
      stored.cycleStart === cycleStart &&
      stored.cycleEnd === cycleEnd &&
      Number.isFinite(Number(stored.requiredRunway)) &&
      Number(stored.requiredRunway) >= 0
  );

  if (validSameCycleBaseline) {
    const storedFingerprint = String(stored.planFingerprint || "");
    const currentFingerprint = String(planFingerprint || "");
    const samePlan = storedFingerprint === currentFingerprint;

    if (samePlan) {
      // Reality happened, but the plan did not change. Spending, debt payment, completed
      // commitments, date progression, and reloads must therefore leave 100 untouched.
      return {
        baseline: {
          version: BASELINE_VERSION,
          requiredRunway: finiteNonNegative(stored.requiredRunway),
          planRequiredRunway: finiteNonNegative(
            stored.planRequiredRunway ?? normalizedRequired
          ),
          assumedSpentAtLock: finiteNonNegative(stored.assumedSpentAtLock),
          cycleStart,
          cycleEnd,
          planFingerprint: storedFingerprint,
        },
        shouldPersist: false,
        reason: "cycle_anchor_locked",
      };
    }

    // An actual planning edit is the only same-cycle operation allowed to move 100.
    // Apply exactly the difference between the previous full plan and the new full plan;
    // never rebuild the denominator from whatever commitments merely remain today.
    const previousPlanRequiredRunway = finiteNonNegative(
      stored.planRequiredRunway ?? stored.requiredRunway
    );
    const planDelta = normalizedRequired - previousPlanRequiredRunway;
    const amendedRequiredRunway = Math.max(
      0,
      finiteNonNegative(stored.requiredRunway) + planDelta
    );

    return {
      baseline: {
        version: BASELINE_VERSION,
        requiredRunway: amendedRequiredRunway,
        planRequiredRunway: normalizedRequired,
        assumedSpentAtLock: finiteNonNegative(stored.assumedSpentAtLock),
        cycleStart,
        cycleEnd,
        planFingerprint: currentFingerprint,
      },
      shouldPersist: true,
      reason: "plan_delta_applied",
    };
  }

  // For a cycle CLARA already read before v6, keep that earlier fixed ruler once and attach
  // today's complete plan only as the delta reference. This prevents a mid-cycle migration
  // from pretending today is day one. v4/v5 remaining-commitment anchors are not eligible;
  // the runtime supplies only the earlier preserved cycle anchor when one exists.
  const migratedExistingAnchor = normalizedLegacy > 0;
  const initialRequiredRunway = migratedExistingAnchor
    ? normalizedLegacy
    : normalizedRequired;

  return {
    baseline: {
      version: BASELINE_VERSION,
      requiredRunway: initialRequiredRunway,
      planRequiredRunway: normalizedRequired,
      assumedSpentAtLock: normalizedAssumed,
      cycleStart,
      cycleEnd,
      planFingerprint: String(planFingerprint || ""),
    },
    shouldPersist: true,
    reason: migratedExistingAnchor
      ? "legacy_cycle_anchor_migrated"
      : "new_cycle_or_stale_baseline",
  };
}

// Means Score has one authority once the cycle anchor exists:
// current financial capacity / fixed (or explicitly amended) full-cycle 100 × 100.
export function calculateMeansScoreState({
  financialRunway = 0,
  requiredRunway = 0,
} = {}) {
  const normalizedFinancialRunway = finiteNonNegative(financialRunway);
  const normalizedRequired = finiteNonNegative(requiredRunway);
  const scoreRoom = normalizedFinancialRunway - normalizedRequired;
  const score =
    normalizedRequired > 0
      ? Math.round((normalizedFinancialRunway / normalizedRequired) * 100)
      : normalizedFinancialRunway > 0
        ? 100
        : 0;

  return {
    score,
    fullyCovered: false,
    coverageState: "scored",
    scoreRoom,
    plannedAssumedSinceLock: 0,
  };
}

export const MEANS_CYCLE_BASELINE_VERSION = BASELINE_VERSION;
