const BASELINE_VERSION = 5;
const CURRENT_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v5";
const LEGACY_BASELINE_STORAGE_PREFIXES = [
  "clara:means-cycle-baseline:v3",
  "clara:means-cycle-baseline:v2",
  "clara:means-cycle-baseline:v1",
];

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

function parseStoredBaseline(value) {
  try {
    const parsed = JSON.parse(String(value || "null"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function sameCycle(left, right) {
  return Boolean(
    left &&
      right &&
      left.cycleStart === right.cycleStart &&
      left.cycleEnd === right.cycleEnd
  );
}

function isMalformedMidCycleV5Anchor(value) {
  return Boolean(
    value &&
      Number(value.version) === BASELINE_VERSION &&
      Number.isFinite(Number(value.requiredRunway)) &&
      Number(value.requiredRunway) >= 0 &&
      finiteNonNegative(value.assumedSpentAtLock) > 0 &&
      String(value.refreshReason || "") === "new_cycle_or_stale_baseline" &&
      !value.restoredFromLegacyFixedAnchor
  );
}

function isLegacyFixedCycleAnchor(candidate, current) {
  const version = Number(candidate?.version);
  return Boolean(
    candidate &&
      [1, 2, 3].includes(version) &&
      sameCycle(candidate, current) &&
      Number.isFinite(Number(candidate.requiredRunway)) &&
      Number(candidate.requiredRunway) > Number(current.requiredRunway)
  );
}

// Once a pay cycle starts, the user's personal 100 stays fixed until the next pay cycle.
// A completed commitment, debt payment, plan fingerprint change, reload, or date progression
// must never make CLARA replace that ruler with today's remaining commitments.
//
// This migration is deliberately narrow: it never derives 100 from wallet balances,
// transactions, paid debt, completed commitments, or current remaining commitments. It only
// restores a previously stored fixed-cycle anchor for the exact same owner and pay-cycle dates.
export function repairMalformedMeansBaselineStorage(storage) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
    return 0;
  }

  let keys = [];
  try {
    const length = Math.max(0, Number(storage.length || 0));
    for (let index = 0; index < length; index += 1) {
      const key = storage.key(index);
      if (typeof key === "string") keys.push(key);
    }
  } catch {
    return 0;
  }

  const currentPrefix = `${CURRENT_BASELINE_STORAGE_PREFIX}:`;
  let repaired = 0;

  for (const key of keys) {
    if (!key.startsWith(currentPrefix)) continue;

    const current = parseStoredBaseline(storage.getItem(key));
    if (!isMalformedMidCycleV5Anchor(current)) continue;

    const suffix = key.slice(currentPrefix.length);
    let legacy = null;
    let legacyPrefix = "";

    for (const prefix of LEGACY_BASELINE_STORAGE_PREFIXES) {
      const candidate = parseStoredBaseline(storage.getItem(`${prefix}:${suffix}`));
      if (!isLegacyFixedCycleAnchor(candidate, current)) continue;
      legacy = candidate;
      legacyPrefix = prefix;
      break;
    }

    if (!legacy) continue;

    try {
      storage.setItem(
        key,
        JSON.stringify({
          ...current,
          requiredRunway: finiteNonNegative(legacy.requiredRunway),
          restoredFromLegacyFixedAnchor: true,
          restoredFromVersion: Number(legacy.version),
          restoredFromStoragePrefix: legacyPrefix,
          restoredPreviousV5RequiredRunway: finiteNonNegative(current.requiredRunway),
          restoredAt: new Date().toISOString(),
          refreshReason: "restored_pre_v4_fixed_cycle_anchor",
        })
      );
      repaired += 1;
    } catch {
      // Keep the current score available if browser storage is temporarily unavailable.
    }
  }

  return repaired;
}

function repairBrowserMeansBaselineStorage() {
  if (typeof window === "undefined") return;
  try {
    repairMalformedMeansBaselineStorage(window.localStorage);
  } catch {
    // Storage access can be blocked by browser privacy settings; Means still renders normally.
  }
}

repairBrowserMeansBaselineStorage();

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
        planFingerprint: stored.planFingerprint || planFingerprint,
      },
      shouldPersist: false,
      reason: "cycle_anchor_locked",
    };
  }

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
