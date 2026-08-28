const BASELINE_VERSION = 4;

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

// The user's personal 100 is the fixed predicted/declared requirement for the cycle.
// Current wallet balance and past actual transactions must never be used to rebuild 100:
// those belong on the available-money side of the score and should only move the score.
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
} = {}) {
  const normalizedRequired = finiteNonNegative(requiredRunway);
  const normalizedAssumed = finiteNonNegative(assumedSpent);

  // Once a cycle has established its personal 100, that measuring stick is immutable
  // until the next pay cycle. Realized spending, paid commitments, schedule progression,
  // or other same-cycle context changes may alter the fingerprint, but must never move 100.
  const validSameCycleBaseline = Boolean(
    stored &&
      Number(stored.version) === BASELINE_VERSION &&
      stored.cycleStart === cycleStart &&
      stored.cycleEnd === cycleEnd &&
      Number.isFinite(Number(stored.requiredRunway)) &&
      Number(stored.requiredRunway) >= 0
  );

  if (validSameCycleBaseline) {
    return {
      baseline: {
        version: BASELINE_VERSION,
        requiredRunway: finiteNonNegative(stored.requiredRunway),
        assumedSpentAtLock: finiteNonNegative(stored.assumedSpentAtLock),
        cycleStart,
        cycleEnd,
        // Preserve the original fingerprint as audit context for the locked anchor.
        planFingerprint: stored.planFingerprint || planFingerprint,
      },
      shouldPersist: false,
      reason: "cycle_anchor_locked",
    };
  }

  // Assumed spent is planned Money Schedule value that has already crossed into the
  // elapsed part of the cycle. It belongs in the fixed cycle requirement, while actual
  // transactions do not. This reconstructs 100 without absorbing previous spending.
  const fullCycleRequiredRunway = normalizedRequired + normalizedAssumed;

  return {
    baseline: {
      version: BASELINE_VERSION,
      requiredRunway: fullCycleRequiredRunway,
      assumedSpentAtLock: normalizedAssumed,
      cycleStart,
      cycleEnd,
      planFingerprint,
    },
    shouldPersist: true,
    reason: "new_cycle_or_stale_baseline",
  };
}

// Means Score is intentionally simple once the cycle anchor exists:
// current financial capacity / fixed full-cycle Means × 100.
// Past actual transactions reduce financial capacity; they never rewrite the anchor.
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
