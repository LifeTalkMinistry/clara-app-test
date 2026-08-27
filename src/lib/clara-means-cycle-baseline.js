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

// Means Score 100 is the user's remaining required financial runway from now
// until the next relevant income point. Past income/spending does not stay in
// the denominator after it has already been realized.
export function calculateCycleRequiredRunway({ upcoming = 0 } = {}) {
  return finiteNonNegative(upcoming);
}

// Kept for compatibility with existing stored cycle data. The live Means Score
// no longer uses a locked historical baseline as its measuring stick; it uses
// the current remaining required runway instead.
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

  const sameV2Cycle = Boolean(
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
    reason: sameV2Cycle ? "plan_changed" : "new_cycle_or_stale_baseline",
  };
}

export function calculateMeansScoreState({
  financialRunway = 0,
  upcoming = 0,
} = {}) {
  const normalizedFinancialRunway = finiteNonNegative(financialRunway);
  const currentRequiredRunway = finiteNonNegative(upcoming);
  const fullyCovered = currentRequiredRunway === 0;
  const scoreRoom = normalizedFinancialRunway - currentRequiredRunway;
  const score = fullyCovered
    ? null
    : Math.round((normalizedFinancialRunway / currentRequiredRunway) * 100);

  return {
    score,
    fullyCovered,
    coverageState: fullyCovered ? "fully_covered" : "scored",
    scoreRoom,
    // Retained in the return shape so older callers do not break. Assumed spend
    // is informational now; it is not deducted a second time from live runway.
    plannedAssumedSinceLock: 0,
  };
}

export const MEANS_CYCLE_BASELINE_VERSION = BASELINE_VERSION;
