const BASELINE_VERSION = 2;

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
  requiredRunway = 0,
  assumedSpent = 0,
  assumedSpentAtLock = 0,
  realizedPlannedOffset = 0,
} = {}) {
  const normalizedFinancialRunway = finiteNonNegative(financialRunway);
  const normalizedUpcoming = finiteNonNegative(upcoming);
  const normalizedRequired = finiteNonNegative(requiredRunway);
  const plannedAssumedSinceLock = Math.max(
    0,
    finiteNonNegative(assumedSpent) - finiteNonNegative(assumedSpentAtLock)
  );
  const scoreRoom =
    normalizedFinancialRunway -
    normalizedUpcoming -
    plannedAssumedSinceLock +
    finiteNonNegative(realizedPlannedOffset);
  const score =
    normalizedRequired > 0
      ? Math.round(((normalizedRequired + scoreRoom) / normalizedRequired) * 100)
      : normalizedFinancialRunway > 0
        ? 100
        : 0;

  return { score, scoreRoom, plannedAssumedSinceLock };
}

export const MEANS_CYCLE_BASELINE_VERSION = BASELINE_VERSION;
