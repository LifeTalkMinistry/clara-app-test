import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  calculateMeansScoreState,
  MEANS_CYCLE_BASELINE_VERSION,
  resolveMeansCycleBaselineState,
  stableMeansPlanFingerprint,
} from "../src/lib/clara-means-cycle-baseline.js";

// Guards the live ORB presentation boundary against a second Means Score authority.
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

function establishBaseline(requiredRunway = 10000) {
  return resolveMeansCycleBaselineState({
    stored: null,
    cycleStart: CYCLE_A.start,
    cycleEnd: CYCLE_A.end,
    planFingerprint: fingerprint("cycle-a", requiredRunway),
    requiredRunway,
    assumedSpent: 0,
  }).baseline;
}

function resolveSameCycle({ stored, requiredRunway, assumedSpent = 0, label = "changed-plan" }) {
  return resolveMeansCycleBaselineState({
    stored,
    cycleStart: CYCLE_A.start,
    cycleEnd: CYCLE_A.end,
    planFingerprint: fingerprint(label, requiredRunway),
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

  assert.equal(MEANS_CYCLE_BASELINE_VERSION, 5);
  assert.equal(baseline.requiredRunway, 10000);
  assert.equal(canonicalScore(15000, baseline), 150);
  assert.equal(canonicalScore(13000, baseline), 130);
  assert.equal(canonicalScore(11000, baseline), 110);
  assert.equal(baseline.requiredRunway, 10000);
});

test("completed commitment cannot shrink the locked same-cycle 100", () => {
  const baseline = establishBaseline(10000);
  const afterCompletion = resolveSameCycle({
    stored: baseline,
    requiredRunway: 7000,
    label: "commitment-completed",
  });

  assert.equal(afterCompletion.shouldPersist, false);
  assert.equal(afterCompletion.reason, "cycle_anchor_locked");
  assert.equal(afterCompletion.baseline.requiredRunway, 10000);
});

test("debt payment lowers available runway without shrinking the locked 100", () => {
  const baseline = establishBaseline(10000);
  const afterDebtPayment = resolveSameCycle({
    stored: baseline,
    requiredRunway: 8000,
    label: "debt-paid",
  });

  assert.equal(afterDebtPayment.baseline.requiredRunway, 10000);
  assert.equal(canonicalScore(15000, baseline), 150);
  assert.equal(canonicalScore(13000, afterDebtPayment.baseline), 130);
});

test("date progression and reload preserve a valid same-cycle v5 100", () => {
  const baseline = establishBaseline(10000);
  const reloadedBaseline = JSON.parse(JSON.stringify(baseline));
  const laterSameCycle = resolveSameCycle({
    stored: reloadedBaseline,
    requiredRunway: 3121,
    assumedSpent: 280,
    label: "later-date-current-remaining-plan",
  });

  assert.equal(laterSameCycle.shouldPersist, false);
  assert.equal(laterSameCycle.reason, "cycle_anchor_locked");
  assert.equal(laterSameCycle.baseline.requiredRunway, 10000);
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

test("production incident uses fixed baseline instead of 3,401 dynamic remaining runway", () => {
  const financialRunway = 7388;
  const upcoming = 3121;
  const assumedSpent = 280;
  const legacyDynamicRequiredRunway = upcoming + assumedSpent;
  const baseline = establishBaseline(10000);

  assert.equal(legacyDynamicRequiredRunway, 3401);
  assert.equal(Math.round((financialRunway / legacyDynamicRequiredRunway) * 100), 217);
  assert.notEqual(baseline.requiredRunway, legacyDynamicRequiredRunway);

  const renderedMeansScore = canonicalScore(financialRunway, baseline);
  assert.equal(renderedMeansScore, 74);
  assert.notEqual(renderedMeansScore, 217);
});

test("stale precomputed orbRunway.meansScore cannot override the canonical ORB score", async () => {
  const orbRunway = {
    financialRunway: 7388,
    meansScore: 217,
  };
  const baseline = establishBaseline(10000);
  const renderedMeansScore = canonicalScore(orbRunway.financialRunway, baseline);

  assert.equal(renderedMeansScore, 74);
  assert.notEqual(renderedMeansScore, orbRunway.meansScore);

  const runtime = await readFile(
    new URL("../src/runtime/installClaraOrbGreeting.js", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(runtime, /orbRunway\.meansScore/);
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
