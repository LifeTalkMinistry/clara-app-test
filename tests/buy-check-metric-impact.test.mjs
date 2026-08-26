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
  availableNow: 9000,
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
  assert.equal(impact.projectedRoomAfterPurchase, 4000);
  const line = formatClaraMetricImpactLine(impact);
  assert.equal(line, "That ₱1,000 would bring your Means Score from 150 down to 140.");
  assert.doesNotMatch(line, /Means impact|New pressure|→|\(−/);
});

test("fully accounted purchase is metric-neutral", () => {
  const impact = simulateMeansPurchaseImpact({
    snapshot,
    purchasePrice: 1000,
    alreadyAccountedAmount: 1000,
    impactSource: "money_schedule_routine",
  });
  assert.equal(impact.projectedScoreAfterPurchase, 150);
  assert.equal(impact.scoreChange, 0);
  assert.equal(impact.incrementalImpact, 0);
  assert.match(formatClaraMetricImpactLine(impact), /already planned ₱1,000 for this in Money Schedule/);
});

test("only overspend above the planned amount creates new pressure", () => {
  const impact = simulateMeansPurchaseImpact({
    snapshot,
    purchasePrice: 1300,
    alreadyAccountedAmount: 1000,
    impactSource: "money_schedule_routine",
  });
  assert.equal(impact.incrementalImpact, 300);
  assert.equal(impact.projectedScoreAfterPurchase, 147);
  assert.equal(impact.projectedRoomAfterPurchase, 4700);
});

test("spending below plan creates room instead of another penalty", () => {
  const impact = simulateMeansPurchaseImpact({
    snapshot,
    purchasePrice: 800,
    alreadyAccountedAmount: 1000,
    impactSource: "money_schedule_routine",
  });
  assert.equal(impact.incrementalImpact, -200);
  assert.equal(impact.projectedScoreAfterPurchase, 152);
  assert.equal(impact.projectedRoomAfterPurchase, 5200);
  assert.match(formatClaraMetricImpactLine(impact), /₱200 under plan/);
});

test("crossing 100 is detected from the projected canonical score", () => {
  const tight = { ...snapshot, score: 105, scoreRoom: 500, projectedRoom: 500 };
  const impact = simulateMeansPurchaseImpact({ snapshot: tight, purchasePrice: 700 });
  assert.equal(impact.projectedScoreAfterPurchase, 98);
  assert.equal(impact.crossesProtectionLine, true);
});
