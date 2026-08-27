const BASELINE_VERSION = 3;

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

// The user's personal 100 is a fixed full-cycle Means anchor.
// It is calculated from the cycle's predicted/declared financial requirement,
// then locked for that cycle so the passage of time cannot manufacture points.
export function calculateCycleRequiredRunway({
  income = 0,
  availableNow = 0,
  upcoming = 0,
} = {}) {
  const normalizedIncome = finiteNonNegative(income);
  const normalizedAvailable = finiteNonNegative(availableNow);
  const normalizedUpcoming = finiteNonNegative(upcoming);
  const projectedRoom = normalizedAvailable - normalizedUpcoming;
  return Math.max(0, normalizedIncome - projectedRoom);
}

export function resolveMeansCycleBaselineState({
  stored = null,
  cycleStart = "",
  cycleEnd = "",
  planFingerprint = "",
  requiredRunway = 0,
  assumedSpent = 0,
} = {}) {
  const normalizedRequired = finiteNonNegative(requiredRunway);
  const normalizedAssumed = finiteNonNegative(assumedSpent);
  const validStored = Boolean(
    stored &&
      Number(stored.version) === BASELINE_VERSION &&
      stored.cycleStart === cycleStart &&
      stored.cycleEnd === cycleEnd &&
      stored.planFingerprint === planFingerprint &&
      Number.isFinite(Number(stored.requiredRunway)) &&
      Number(stored.requiredRunway) >= 0
  );

  if (validStored) {
    return {
      baseline: {
        version: BASELINE_VERSION,
        requiredRunway: finiteNonNegative(stored.requiredRunway),
        assumedSpentAtLock: finiteNonNegative(stored.assumedSpentAtLock),
        cycleStart,
        cycleEnd,
        planFingerprint,
      },
      shouldPersist: false,
      reason: "plan_unchanged",
    };
  }

  const sameV3Cycle = Boolean(
    stored &&
      Number(stored.version) === BASELINE_VERSION &&
      stored.cycleStart === cycleStart &&
      stored.cycleEnd === cycleEnd
  );

  return {
    baseline: {
      version: BASELINE_VERSION,
      requiredRunway: normalizedRequired,
      assumedSpentAtLock: normalizedAssumed,
      cycleStart,
      cycleEnd,
      planFingerprint,
    },
    shouldPersist: true,
    reason: sameV3Cycle ? "plan_changed" : "new_cycle_or_stale_baseline",
  };
}

// Means Score is intentionally simple once the cycle anchor exists:
// current financial capacity / fixed full-cycle Means × 100.
// Upcoming commitments and elapsed days are context, not a moving denominator.
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
