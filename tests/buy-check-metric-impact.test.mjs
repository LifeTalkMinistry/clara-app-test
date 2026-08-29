import test from "node:test";
import assert from "node:assert/strict";
import {
  formatClaraMetricImpactLine,
  simulateMeansPurchaseImpact,
} from "../src/lib/clara-buy-check-metric-impact.js";

const snapshot = {
  score: 150,
  requiredRunway: 10000,
  scoreRoom: 5000,
  projectedRoom: 5000,
  availableNow: 15000,
  upcoming: 4000,
  cycleStartDate: "2026-08-25",
  cycleEndDate: "2026-09-10",
};

test("unplanned purchase uses the locked canonical required runway", () => {
  const impact = simulateMeansPurchaseImpact({ snapshot, purchasePrice: 1000 });
  assert.equal(impact.currentScore, 150);
  assert.equal(impact.projectedScoreAfterPurchase, 140);
  assert.equal(impact.scoreChange, -10);
  assert.equal(impact.incrementalImpact, 1000);
  assert.equal(impact.availableAfterPurchase, 14000);
  const line = formatClaraMetricImpactLine(impact);
  assert.equal(line, "That ₱1,000 would bring your Means Score from 150 down to 140.");
});

test("a planned purchase still applies the full actual Wallet outflow", () => {
  const impact = simulateMeansPurchaseImpact({
    snapshot,
    purchasePrice: 1000,
    alreadyAccountedAmount: 1000,
    impactSource: "money_schedule_routine",
  });
  assert.equal(impact.projectedScoreAfterPurchase, 140);
  assert.equal(impact.scoreChange, -10);
  assert.equal(impact.incrementalImpact, 1000);
  assert.equal(impact.upcomingCommitmentsAfterPurchase, snapshot.upcoming);
  assert.match(formatClaraMetricImpactLine(impact), /plan stays in your 100/);
  assert.match(formatClaraMetricImpactLine(impact), /actual ₱1,000 still leaves Wallet/);
});

test("spending above plan does not mutate the baseline and the full actual amount leaves Wallet", () => {
  const impact = simulateMeansPurchaseImpact({
    snapshot,
    purchasePrice: 1300,
    alreadyAccountedAmount: 1000,
    impactSource: "money_schedule_routine",
  });
  assert.equal(impact.incrementalImpact, 1300);
  assert.equal(impact.projectedScoreAfterPurchase, 137);
  assert.equal(impact.availableAfterPurchase, 13700);
  assert.equal(impact.requiredRunway, 10000);
});

test("spending below plan still reduces Wallet by the actual amount", () => {
  const impact = simulateMeansPurchaseImpact({
    snapshot,
    purchasePrice: 800,
    alreadyAccountedAmount: 1000,
    impactSource: "money_schedule_routine",
  });
  assert.equal(impact.incrementalImpact, 800);
  assert.equal(impact.projectedScoreAfterPurchase, 142);
  assert.equal(impact.availableAfterPurchase, 14200);
  assert.equal(impact.requiredRunway, 10000);
});

test("negative available money remains visible in a projected score", () => {
  const tight = {
    ...snapshot,
    score: 5,
    scoreRoom: -9500,
    projectedRoom: -9500,
    availableNow: 500,
  };
  const impact = simulateMeansPurchaseImpact({ snapshot: tight, purchasePrice: 700 });
  assert.equal(impact.availableAfterPurchase, -200);
  assert.equal(impact.projectedScoreAfterPurchase, -2);
});

test("crossing 100 is detected from the projected canonical score", () => {
  const tight = {
    ...snapshot,
    score: 105,
    scoreRoom: 500,
    projectedRoom: 500,
    availableNow: 10500,
  };
  const impact = simulateMeansPurchaseImpact({ snapshot: tight, purchasePrice: 700 });
  assert.equal(impact.projectedScoreAfterPurchase, 98);
  assert.equal(impact.crossesProtectionLine, true);
});
