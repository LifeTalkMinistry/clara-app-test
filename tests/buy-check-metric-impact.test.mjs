import test from "node:test";
import assert from "node:assert/strict";
import {
  formatClaraMetricImpactLine,
  simulateMeansPurchaseImpact,
} from "../src/lib/clara-buy-check-metric-impact.js";

const snapshot = {
  score: 225,
  requiredRunway: 10000,
  scoreRoom: 5000,
  projectedRoom: 5000,
  availableNow: 9000,
  financialRunway: 9000,
  upcoming: 4000,
  cycleStartDate: "2026-08-25",
  cycleEndDate: "2026-09-10",
};

test("unplanned purchase uses the live remaining required runway", () => {
  const impact = simulateMeansPurchaseImpact({ snapshot, purchasePrice: 1000 });
  assert.equal(impact.currentScore, 225);
  assert.equal(impact.requiredRunway, 4000);
  assert.equal(impact.projectedScoreAfterPurchase, 200);
  assert.equal(impact.scoreChange, -25);
  assert.equal(impact.incrementalImpact, 1000);
  assert.equal(impact.projectedRoomAfterPurchase, 4000);
  const line = formatClaraMetricImpactLine(impact);
  assert.equal(line, "That ₱1,000 would bring your Means Score from 225 down to 200.");
  assert.doesNotMatch(line, /Means impact|New pressure|→|\(−/);
});

test("planned purchase reduces both money and the remaining required runway", () => {
  const impact = simulateMeansPurchaseImpact({
    snapshot,
    purchasePrice: 1000,
    alreadyAccountedAmount: 1000,
    impactSource: "money_schedule_routine",
  });
  assert.equal(impact.upcomingCommitmentsAfterPurchase, 3000);
  assert.equal(impact.projectedScoreAfterPurchase, 267);
  assert.equal(impact.scoreChange, 42);
  assert.equal(impact.incrementalImpact, 0);
  assert.match(formatClaraMetricImpactLine(impact), /already planned ₱1,000 for this in Money Schedule/);
});

test("overspending above plan uses the smaller remaining runway after the planned amount", () => {
  const impact = simulateMeansPurchaseImpact({
    snapshot,
    purchasePrice: 1300,
    alreadyAccountedAmount: 1000,
    impactSource: "money_schedule_routine",
  });
  assert.equal(impact.incrementalImpact, 300);
  assert.equal(impact.upcomingCommitmentsAfterPurchase, 3000);
  assert.equal(impact.projectedScoreAfterPurchase, 257);
  assert.equal(impact.projectedRoomAfterPurchase, 4700);
});

test("spending below plan creates more room against the smaller remaining runway", () => {
  const impact = simulateMeansPurchaseImpact({
    snapshot,
    purchasePrice: 800,
    alreadyAccountedAmount: 1000,
    impactSource: "money_schedule_routine",
  });
  assert.equal(impact.incrementalImpact, -200);
  assert.equal(impact.upcomingCommitmentsAfterPurchase, 3000);
  assert.equal(impact.projectedScoreAfterPurchase, 273);
  assert.equal(impact.projectedRoomAfterPurchase, 5200);
  assert.match(formatClaraMetricImpactLine(impact), /₱200 under plan/);
});

test("crossing 100 is detected from the live runway projection", () => {
  const tight = {
    ...snapshot,
    score: 105,
    availableNow: 4200,
    financialRunway: 4200,
    scoreRoom: 200,
    projectedRoom: 200,
  };
  const impact = simulateMeansPurchaseImpact({ snapshot: tight, purchasePrice: 300 });
  assert.equal(impact.projectedScoreAfterPurchase, 98);
  assert.equal(impact.crossesProtectionLine, true);
});


test("zero remaining runway stays Fully Covered without inventing a numeric score", () => {
  const covered = {
    ...snapshot,
    score: null,
    fullyCovered: true,
    availableNow: 5000,
    financialRunway: 5000,
    upcoming: 0,
  };
  const impact = simulateMeansPurchaseImpact({ snapshot: covered, purchasePrice: 1000 });
  assert.equal(impact.currentScore, null);
  assert.equal(impact.currentStatus, "Fully Covered");
  assert.equal(impact.projectedScoreAfterPurchase, null);
  assert.equal(impact.projectedFullyCovered, true);
  assert.equal(impact.projectedStatus, "Fully Covered");
  assert.match(formatClaraMetricImpactLine(impact), /fully covered/i);
});
