from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASELINE = ROOT / "src/lib/clara-means-cycle-baseline.js"
RUNTIME = ROOT / "src/runtime/installClaraOrbGreeting.js"
TESTS = ROOT / "tests/means-score-context-baseline-regression.test.mjs"

baseline = r'''const BASELINE_VERSION = 6;

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

// The user's personal 100 is captured from the full predicted need at the moment the
// payday cycle establishes its measuring stick. Once captured, wallet movement and
// shrinking remaining commitments must never redefine that 100 inside the same cycle.
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

// v4/v5 temporarily rebuilt 100 from remaining commitments. Recover only older anchors
// that were created under the pre-regression fixed-cycle semantics and are plausibly the
// same full-cycle ruler. This lets affected devices keep the original anchor instead of
// silently replacing it with today's smaller remaining-commitment number.
export function selectLegacyMeansAnchor({
  legacyBaselines = [],
  cycleStart = "",
  cycleEnd = "",
  currentCandidate = 0,
} = {}) {
  const current = finiteNonNegative(currentCandidate);
  if (!(current > 0)) return null;

  const candidates = (Array.isArray(legacyBaselines) ? legacyBaselines : [])
    .filter((item) => item && [2, 3].includes(Number(item.version)))
    .filter((item) => item.cycleStart === cycleStart && item.cycleEnd === cycleEnd)
    .map((item) => ({
      ...item,
      requiredRunway: finiteNonNegative(item.requiredRunway),
    }))
    .filter((item) => item.requiredRunway > 0)
    .filter((item) => {
      const ratio = item.requiredRunway / current;
      return ratio >= 0.9 && ratio <= 1.1;
    })
    .sort((a, b) => {
      // Prefer the v3 full-cycle generation when it survived. Otherwise the older v2
      // cache is the best recoverable pre-regression anchor for the same cycle.
      const versionDelta = Number(b.version) - Number(a.version);
      if (versionDelta) return versionDelta;
      return String(a.refreshedAt || "").localeCompare(String(b.refreshedAt || ""));
    });

  return candidates[0] || null;
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
    reason: "new_cycle_or_stale_baseline",
  };
}

// After 100 is fixed, the score is simply current financial capacity relative to that
// unchanged ruler. Spending lowers the numerator; adding real money raises it.
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
'''
BASELINE.write_text(baseline, encoding="utf-8")

runtime = RUNTIME.read_text(encoding="utf-8")
runtime = runtime.replace(
    '  resolveMeansCycleBaselineState,\n  stableMeansPlanFingerprint,',
    '  resolveMeansCycleBaselineState,\n  selectLegacyMeansAnchor,\n  stableMeansPlanFingerprint,',
    1,
)
runtime = runtime.replace(
    'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v5";',
    'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v6";',
    1,
)

start = runtime.find('function meansCycleBaselineStorageKey(owner, cycleStart, cycleEnd) {')
end = runtime.find('\nfunction realizedBuyCheckMeansOffset', start)
if start < 0 or end < 0:
    raise SystemExit('Means baseline runtime block not found')

runtime_block = r'''function meansCycleBaselineStorageKey(owner, cycleStart, cycleEnd) {
  const ownerKey = encodeURIComponent(String(owner || "local-user").trim() || "local-user");
  return `${MEANS_CYCLE_BASELINE_STORAGE_PREFIX}:${ownerKey}:${cycleStart}:${cycleEnd}`;
}

function legacyMeansCycleBaselineStorageKeys(owner, cycleStart, cycleEnd) {
  const ownerKey = encodeURIComponent(String(owner || "local-user").trim() || "local-user");
  return [2, 3, 4, 5].map(
    (version) => `clara:means-cycle-baseline:v${version}:${ownerKey}:${cycleStart}:${cycleEnd}`
  );
}

function resolveLockedMeansCycleBaseline({
  owner,
  cycleStart,
  cycleEnd,
  upcoming,
  requiredRunwayCandidate,
  assumedSpent,
  debtObligations,
  planFingerprint,
}) {
  // 100 is the full-cycle ruler captured once, not the amount still left to pay today.
  const reconstructedRequiredRunway = Math.max(
    Number(requiredRunwayCandidate || 0),
    Number(upcoming || 0),
    0
  );
  const fallbackState = resolveMeansCycleBaselineState({
    stored: null,
    cycleStart,
    cycleEnd,
    planFingerprint,
    requiredRunway: reconstructedRequiredRunway,
    assumedSpent,
  });

  if (typeof window === "undefined" || !window.localStorage) {
    return fallbackState.baseline;
  }

  const key = meansCycleBaselineStorageKey(owner, cycleStart, cycleEnd);
  let stored = null;
  let migratedLegacy = null;
  try {
    stored = JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    stored = null;
  }

  // Devices that briefly ran the broken v4/v5 reconstruction may still retain the
  // original v2/v3 fixed-cycle cache under its old key. Recover that immutable ruler
  // when it is plausibly the same full-cycle anchor instead of recomputing from today.
  if (!stored) {
    const legacyBaselines = [];
    for (const legacyKey of legacyMeansCycleBaselineStorageKeys(owner, cycleStart, cycleEnd)) {
      try {
        const legacy = JSON.parse(window.localStorage.getItem(legacyKey) || "null");
        if (legacy) legacyBaselines.push(legacy);
      } catch {
        // Ignore malformed legacy cache entries.
      }
    }

    migratedLegacy = selectLegacyMeansAnchor({
      legacyBaselines,
      cycleStart,
      cycleEnd,
      currentCandidate: reconstructedRequiredRunway,
    });

    if (migratedLegacy) {
      stored = {
        version: 6,
        requiredRunway: Number(migratedLegacy.requiredRunway || 0),
        assumedSpentAtLock: Number(migratedLegacy.assumedSpentAtLock || 0),
        cycleStart,
        cycleEnd,
        planFingerprint: migratedLegacy.planFingerprint || planFingerprint,
      };
    }
  }

  const resolved = resolveMeansCycleBaselineState({
    stored,
    cycleStart,
    cycleEnd,
    planFingerprint,
    requiredRunway: reconstructedRequiredRunway,
    assumedSpent,
  });

  if (resolved.shouldPersist || migratedLegacy) {
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          ...resolved.baseline,
          refreshedAt: new Date().toISOString(),
          refreshReason: migratedLegacy ? "legacy_fixed_anchor_recovered" : resolved.reason,
          migratedFromVersion: migratedLegacy ? Number(migratedLegacy.version) : undefined,
        })
      );
    } catch {
      // Means must remain available even if localStorage is temporarily unavailable.
    }
  }

  return resolved.baseline;
}
'''
runtime = runtime[:start] + runtime_block + runtime[end:]
RUNTIME.write_text(runtime, encoding="utf-8")

tests = r'''import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  calculateCycleRequiredRunway,
  calculateMeansScoreState,
  resolveMeansCycleBaselineState,
  selectLegacyMeansAnchor,
  stableMeansPlanFingerprint,
} from "../src/lib/clara-means-cycle-baseline.js";

function plan(amount, id = "primary") {
  return stableMeansPlanFingerprint({
    routine: [],
    schedule: [{ id, date: "2026-09-01", amount }],
    debt: [],
    savings: [],
  });
}

function freshBaseline({ amount, cycleStart = "2026-08-25", cycleEnd = "2026-09-10", fingerprint = plan(amount) }) {
  return resolveMeansCycleBaselineState({
    stored: null,
    cycleStart,
    cycleEnd,
    planFingerprint: fingerprint,
    requiredRunway: amount,
    assumedSpent: 0,
  }).baseline;
}

function score({ financialRunway, baseline }) {
  return calculateMeansScoreState({
    financialRunway,
    requiredRunway: baseline?.requiredRunway,
  }).score;
}

test("full-cycle rule recreates the original 10403 personal 100", () => {
  const requiredRunway = calculateCycleRequiredRunway({
    income: 15100,
    availableNow: 9388,
    upcoming: 4691,
  });
  assert.equal(requiredRunway, 10403);
});

test("fixed 10403 anchor makes current 7388 financial runway score 71", () => {
  const baseline = freshBaseline({ amount: 10403 });
  assert.equal(score({ financialRunway: 7388, baseline }), 71);
});

test("legacy fixed anchor recovery prefers the plausible pre-regression ruler", () => {
  const recovered = selectLegacyMeansAnchor({
    cycleStart: "2026-08-25",
    cycleEnd: "2026-09-10",
    currentCandidate: 10833,
    legacyBaselines: [
      {
        version: 2,
        requiredRunway: 10403,
        cycleStart: "2026-08-25",
        cycleEnd: "2026-09-10",
        refreshedAt: "2026-08-27T07:00:00.000Z",
      },
      {
        version: 4,
        requiredRunway: 7859,
        cycleStart: "2026-08-25",
        cycleEnd: "2026-09-10",
      },
      {
        version: 5,
        requiredRunway: 3401,
        cycleStart: "2026-08-25",
        cycleEnd: "2026-09-10",
      },
    ],
  });
  assert.equal(recovered.requiredRunway, 10403);
});

test("broken remaining-commitment baselines are not accepted as legacy fixed anchors", () => {
  const recovered = selectLegacyMeansAnchor({
    cycleStart: "2026-08-25",
    cycleEnd: "2026-09-10",
    currentCandidate: 10833,
    legacyBaselines: [
      {
        version: 4,
        requiredRunway: 7859,
        cycleStart: "2026-08-25",
        cycleEnd: "2026-09-10",
      },
      {
        version: 5,
        requiredRunway: 3401,
        cycleStart: "2026-08-25",
        cycleEnd: "2026-09-10",
      },
    ],
  });
  assert.equal(recovered, null);
});

test("time and shrinking upcoming commitments cannot move an established 100", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const preserved = resolveMeansCycleBaselineState({
    stored: baseline,
    cycleStart: baseline.cycleStart,
    cycleEnd: baseline.cycleEnd,
    planFingerprint: plan(2000, "later"),
    requiredRunway: 2000,
    assumedSpent: 5000,
  });
  assert.equal(preserved.shouldPersist, false);
  assert.equal(preserved.reason, "cycle_anchor_locked");
  assert.equal(preserved.baseline.requiredRunway, 10000);
});

test("actual money leaving lowers the score against the same anchor", () => {
  const baseline = freshBaseline({ amount: 10000 });
  assert.equal(score({ financialRunway: 20000, baseline }), 200);
  assert.equal(score({ financialRunway: 18000, baseline }), 180);
  assert.equal(score({ financialRunway: 13000, baseline }), 130);
  assert.equal(score({ financialRunway: 9000, baseline }), 90);
});

test("actual money added increases the score against the same anchor", () => {
  const baseline = freshBaseline({ amount: 10000 });
  assert.equal(score({ financialRunway: 10000, baseline }), 100);
  assert.equal(score({ financialRunway: 12000, baseline }), 120);
});

test("a new pay cycle establishes a new fixed full-cycle anchor", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const refreshed = resolveMeansCycleBaselineState({
    stored: baseline,
    cycleStart: "2026-09-10",
    cycleEnd: "2026-09-25",
    planFingerprint: plan(12000, "new-cycle"),
    requiredRunway: 12000,
    assumedSpent: 0,
  });
  assert.equal(refreshed.shouldPersist, true);
  assert.equal(refreshed.reason, "new_cycle_or_stale_baseline");
  assert.equal(refreshed.baseline.requiredRunway, 12000);
  assert.equal(refreshed.baseline.version, 6);
});

test("runtime/store wiring remains intact for financial context updates", async () => {
  const runtime = await readFile(new URL("../src/runtime/installClaraOrbGreeting.js", import.meta.url), "utf8");
  const scheduleRepository = await readFile(new URL("../src/lib/clara-money-schedule-repository.js", import.meta.url), "utf8");
  const schedulePanel = await readFile(
    new URL("../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanel.jsx", import.meta.url),
    "utf8"
  );

  assert.match(runtime, /clara:means-cycle-baseline:v6/);
  assert.match(runtime, /selectLegacyMeansAnchor/);
  assert.match(runtime, /legacy_fixed_anchor_recovered/);
  assert.match(runtime, /FINANCE_DATA_UPDATED_EVENT/);
  assert.match(runtime, /INCOME_HUB_UPDATED_EVENT/);
  assert.match(runtime, /DEBT_OBLIGATIONS_UPDATED_EVENT/);
  assert.match(runtime, /CLARA_MONEY_ROUTINE_UPDATED_EVENT/);
  assert.match(runtime, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
  assert.match(runtime, /"clara:schedule:create-event"/);
  assert.match(scheduleRepository, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
  assert.match(schedulePanel, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
});
'''
TESTS.write_text(tests, encoding="utf-8")

print("Patched Means Score v6: restore fixed full-cycle anchor and recover plausible legacy anchor.")
