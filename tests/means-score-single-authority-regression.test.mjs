import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  calculateMeansScoreState,
  MEANS_CYCLE_BASELINE_VERSION,
  resolveMeansCycleBaselineState,
  stableMeansPlanFingerprint,
} from "../src/lib/clara-means-cycle-baseline.js";

const CYCLE_A = {
  start: "2026-08-25",
  end: "2026-09-10",
};

function fingerprint(label, amount) {
  return stableMeansPlanFingerprint({
    cycleStart: CYCLE_A.start,
    cycleEnd: CYCLE_A.end,
    routine: [],
    schedule: [{ id: label, date: "2026-09-01", amount }],
    debt: [],
    savings: [],
  });
}

function establishBaseline(requiredRunway = 10000, planFingerprint = fingerprint("cycle-a", requiredRunway)) {
  return resolveMeansCycleBaselineState({
    stored: null,
    cycleStart: CYCLE_A.start,
    cycleEnd: CYCLE_A.end,
    planFingerprint,
    requiredRunway,
    assumedSpent: 0,
  }).baseline;
}

function resolveSameCycle({ stored, requiredRunway, planFingerprint = stored.planFingerprint, assumedSpent = 0 }) {
  return resolveMeansCycleBaselineState({
    stored,
    cycleStart: CYCLE_A.start,
    cycleEnd: CYCLE_A.end,
    planFingerprint,
    requiredRunway,
    assumedSpent,
  });
}

function canonicalScore(financialRunway, baseline) {
  return calculateMeansScoreState({
    financialRunway,
    requiredRunway: baseline.requiredRunway,
  }).score;
}

test("fixed full-cycle 100 stays constant while spending lowers the numerator", () => {
  const baseline = establishBaseline(10000);

  assert.equal(MEANS_CYCLE_BASELINE_VERSION, 6);
  assert.equal(baseline.requiredRunway, 10000);
  assert.equal(canonicalScore(15000, baseline), 150);
  assert.equal(canonicalScore(13000, baseline), 130);
  assert.equal(canonicalScore(11000, baseline), 110);
});

test("completed commitment cannot shrink same-cycle 100 when the full plan is unchanged", () => {
  const planFingerprint = fingerprint("full-cycle", 10000);
  const baseline = establishBaseline(10000, planFingerprint);
  const afterCompletion = resolveSameCycle({
    stored: baseline,
    requiredRunway: 10000,
    planFingerprint,
  });

  assert.equal(afterCompletion.shouldPersist, false);
  assert.equal(afterCompletion.reason, "cycle_anchor_locked");
  assert.equal(afterCompletion.baseline.requiredRunway, 10000);
});

test("debt payment lowers available runway without shrinking the locked 100", () => {
  const planFingerprint = fingerprint("full-cycle-with-debt", 10403);
  const baseline = establishBaseline(10403, planFingerprint);
  const afterDebtPayment = resolveSameCycle({
    stored: baseline,
    requiredRunway: 10403,
    planFingerprint,
    assumedSpent: 280,
  });

  assert.equal(afterDebtPayment.baseline.requiredRunway, 10403);
  assert.equal(canonicalScore(7388, baseline), 71);
  assert.equal(canonicalScore(5569, afterDebtPayment.baseline), 54);
});

test("date progression and reload preserve same-cycle v6 100", () => {
  const planFingerprint = fingerprint("stable-plan", 10000);
  const baseline = establishBaseline(10000, planFingerprint);
  const reloaded = JSON.parse(JSON.stringify(baseline));
  const later = resolveSameCycle({
    stored: reloaded,
    requiredRunway: 10000,
    planFingerprint,
    assumedSpent: 5000,
  });

  assert.equal(later.shouldPersist, false);
  assert.equal(later.reason, "cycle_anchor_locked");
  assert.equal(later.baseline.requiredRunway, 10000);
});

test("explicit planning additions edits and cancellations move 100 only by their deltas", () => {
  const baseline = establishBaseline(10000, fingerprint("p0", 10000));
  const added = resolveSameCycle({
    stored: baseline,
    requiredRunway: 12000,
    planFingerprint: fingerprint("p1", 12000),
  });
  const edited = resolveSameCycle({
    stored: added.baseline,
    requiredRunway: 12300,
    planFingerprint: fingerprint("p2", 12300),
  });
  const cancelled = resolveSameCycle({
    stored: edited.baseline,
    requiredRunway: 11300,
    planFingerprint: fingerprint("p3", 11300),
  });

  assert.equal(added.reason, "plan_delta_applied");
  assert.equal(added.baseline.requiredRunway, 12000);
  assert.equal(edited.baseline.requiredRunway, 12300);
  assert.equal(cancelled.baseline.requiredRunway, 11300);
});

test("a genuine new pay cycle may establish a different 100", () => {
  const baseline = establishBaseline(10000);
  const nextCycle = resolveMeansCycleBaselineState({
    stored: baseline,
    cycleStart: "2026-09-10",
    cycleEnd: "2026-09-25",
    planFingerprint: stableMeansPlanFingerprint({ cycle: "b", requiredRunway: 12000 }),
    requiredRunway: 12000,
    assumedSpent: 0,
  });

  assert.equal(nextCycle.shouldPersist, true);
  assert.equal(nextCycle.reason, "new_cycle_or_stale_baseline");
  assert.equal(nextCycle.baseline.requiredRunway, 12000);
});

test("first screenshot cannot use 3,401 remaining-runway denominator", () => {
  const financialRunway = 7388;
  const remainingUpcoming = 3121;
  const assumedSpent = 280;
  const dynamicDenominator = remainingUpcoming + assumedSpent;
  const baseline = establishBaseline(10403);

  assert.equal(dynamicDenominator, 3401);
  assert.equal(Math.round((financialRunway / dynamicDenominator) * 100), 217);
  assert.equal(canonicalScore(financialRunway, baseline), 71);
  assert.notEqual(canonicalScore(financialRunway, baseline), 217);
});

test("second screenshot debt payment cannot manufacture 306 points by shrinking denominator", () => {
  const beforeMoney = 7388;
  const afterMoney = 5569;
  const remainingUpcomingAfterPayment = 1540;
  const assumedSpent = 280;
  const dynamicDenominatorAfterPayment = remainingUpcomingAfterPayment + assumedSpent;
  const baseline = establishBaseline(10403);

  assert.equal(dynamicDenominatorAfterPayment, 1820);
  assert.equal(Math.round((afterMoney / dynamicDenominatorAfterPayment) * 100), 306);
  assert.equal(canonicalScore(beforeMoney, baseline), 71);
  assert.equal(canonicalScore(afterMoney, baseline), 54);
  assert.ok(canonicalScore(afterMoney, baseline) < canonicalScore(beforeMoney, baseline));
});

test("stale v5 score state is invalidated by the v6 cycle anchor", () => {
  const migrated = resolveMeansCycleBaselineState({
    stored: {
      version: 5,
      requiredRunway: 1820,
      assumedSpentAtLock: 280,
      cycleStart: CYCLE_A.start,
      cycleEnd: CYCLE_A.end,
      planFingerprint: fingerprint("bad-v5", 1820),
    },
    cycleStart: CYCLE_A.start,
    cycleEnd: CYCLE_A.end,
    planFingerprint: fingerprint("full-cycle", 10403),
    requiredRunway: 10403,
    assumedSpent: 280,
  });

  assert.equal(migrated.shouldPersist, true);
  assert.equal(migrated.baseline.version, 6);
  assert.equal(migrated.baseline.requiredRunway, 10403);
});

test("stale precomputed orbRunway.meansScore cannot override the canonical ORB score", async () => {
  const orbRunway = {
    financialRunway: 7388,
    meansScore: 217,
  };
  const baseline = establishBaseline(10403);
  const renderedMeansScore = canonicalScore(orbRunway.financialRunway, baseline);

  assert.equal(renderedMeansScore, 71);
  assert.notEqual(renderedMeansScore, orbRunway.meansScore);

  const runtime = await readFile(
    new URL("../src/runtime/installClaraOrbGreeting.js", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(runtime, /orbRunway\.meansScore/);
  assert.match(runtime, /clara:means-cycle-baseline:v6/);
  assert.match(runtime, /const fullCyclePlannedRequirement\s*=/);
  assert.match(
    runtime,
    /const requiredRunway = Math\.max\(0, Number\(cycleBaseline\.requiredRunway \|\| 0\)\);/
  );
  assert.match(
    runtime,
    /calculateMeansScoreState\(\{\s*financialRunway,\s*requiredRunway,\s*\}\)/s
  );
  assert.doesNotMatch(runtime, /meansScore\s*\?\?/);
});
