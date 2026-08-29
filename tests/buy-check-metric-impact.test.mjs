import test from "node:test";
import assert from "node:assert/strict";
import {
  formatClaraMetricImpactLine,
  simulateMeansPurchaseImpact,
} from "../src/lib/clara-buy-check-metric-impact.js";

const snapshot = {
  score: 150,
  cycle100Anchor: 10000,
  requiredRunway: 10000,
  wallBill: 5000,
  scoreRoom: 5000,
  projectedRoom: 5000,
  availableNow: 15000,
  availableWalletMoney: 15000,
  remainingPlannedSpending: 10000,
  upcoming: 10000,
  cycleStartDate: "2026-08-25",
  cycleEndDate: "2026-09-10",
};

test("unplanned purchase lowers Wall Bill and Means Score", () => {
  const impact = simulateMeansPurchaseImpact({ snapshot, purchasePrice: 1000 });
  assert.equal(impact.currentScore, 150);
  assert.equal(impact.matchedPlannedAmount, 0);
  assert.equal(impact.unmatchedAmount, 1000);
  assert.equal(impact.incrementalImpact, 1000);
  assert.equal(impact.availableAfterPurchase, 14000);
  assert.equal(impact.remainingPlannedSpendingAfterPurchase, 10000);
  assert.equal(impact.projectedWallBill, 4000);
  assert.equal(impact.projectedScoreAfterPurchase, 140);
  assert.equal(impact.scoreChange, -10);
  assert.match(formatClaraMetricImpactLine(impact), /outside a confirmed planned requirement/);
});

test("fully matched planned purchase lowers Wallet and Remaining Plan together", () => {
  const impact = simulateMeansPurchaseImpact({
    snapshot,
    purchasePrice: 1000,
    alreadyAccountedAmount: 1000,
    authoritativePlannedMatch: true,
    requirementKey: "money-schedule:event-1:2026-08-30",
    impactSource: "money_schedule_event",
  });
  assert.equal(impact.matchedPlannedAmount, 1000);
  assert.equal(impact.unmatchedAmount, 0);
  assert.equal(impact.incrementalImpact, 0);
  assert.equal(impact.availableAfterPurchase, 14000);
  assert.equal(impact.remainingPlannedSpendingAfterPurchase, 9000);
  assert.equal(impact.projectedWallBill, 5000);
  assert.equal(impact.projectedScoreAfterPurchase, 150);
  assert.equal(impact.scoreChange, 0);
  assert.match(formatClaraMetricImpactLine(impact), /Wallet and Remaining Plan fall together/);
});

test("planned overage protects only the matched portion", () => {
  const impact = simulateMeansPurchaseImpact({
    snapshot,
    purchasePrice: 1300,
    alreadyAccountedAmount: 1000,
    authoritativePlannedMatch: true,
    requirementKey: "money-schedule:event-1:2026-08-30",
  });
  assert.equal(impact.matchedPlannedAmount, 1000);
  assert.equal(impact.unmatchedAmount, 300);
  assert.equal(impact.incrementalImpact, 300);
  assert.equal(impact.availableAfterPurchase, 13700);
  assert.equal(impact.remainingPlannedSpendingAfterPurchase, 9000);
  assert.equal(impact.projectedWallBill, 4700);
  assert.equal(impact.projectedScoreAfterPurchase, 147);
  assert.match(formatClaraMetricImpactLine(impact), /Only the ₱300 outside that match/);
});

test("partial payment below planned amount preserves Wall Bill for actual matched amount", () => {
  const impact = simulateMeansPurchaseImpact({
    snapshot,
    purchasePrice: 800,
    alreadyAccountedAmount: 1000,
    authoritativePlannedMatch: true,
    requirementKey: "money-schedule:event-1:2026-08-30",
  });
  assert.equal(impact.matchedPlannedAmount, 800);
  assert.equal(impact.unmatchedAmount, 0);
  assert.equal(impact.availableAfterPurchase, 14200);
  assert.equal(impact.remainingPlannedSpendingAfterPurchase, 9200);
  assert.equal(impact.projectedWallBill, 5000);
  assert.equal(impact.projectedScoreAfterPurchase, 150);
});

test("fuzzy/accounted hint alone cannot claim planned score protection", () => {
  const impact = simulateMeansPurchaseImpact({
    snapshot,
    purchasePrice: 1000,
    alreadyAccountedAmount: 1000,
    authoritativePlannedMatch: false,
  });
  assert.equal(impact.matchedPlannedAmount, 0);
  assert.equal(impact.unmatchedAmount, 1000);
  assert.equal(impact.projectedScoreAfterPurchase, 140);
});

test("negative Wall Bill remains visible in projected score", () => {
  const tight = {
    ...snapshot,
    score: 5,
    wallBill: -9500,
    scoreRoom: -9500,
    projectedRoom: -9500,
    availableNow: 500,
    availableWalletMoney: 500,
    remainingPlannedSpending: 10000,
  };
  const impact = simulateMeansPurchaseImpact({ snapshot: tight, purchasePrice: 700 });
  assert.equal(impact.availableAfterPurchase, -200);
  assert.equal(impact.projectedWallBill, -10200);
  assert.equal(impact.projectedScoreAfterPurchase, -2);
});

test("crossing 100 is detected from the V7 projected score", () => {
  const tight = {
    ...snapshot,
    score: 105,
    wallBill: 500,
    scoreRoom: 500,
    projectedRoom: 500,
    availableNow: 10500,
    availableWalletMoney: 10500,
    remainingPlannedSpending: 10000,
  };
  const impact = simulateMeansPurchaseImpact({ snapshot: tight, purchasePrice: 700 });
  assert.equal(impact.projectedScoreAfterPurchase, 98);
  assert.equal(impact.crossesProtectionLine, true);
});

test("unresolved zero anchor produces no fabricated projected score", () => {
  const unresolved = {
    ...snapshot,
    score: null,
    cycle100Anchor: 0,
    requiredRunway: 0,
  };
  const impact = simulateMeansPurchaseImpact({ snapshot: unresolved, purchasePrice: 500 });
  assert.equal(impact.projectedScoreAfterPurchase, null);
  assert.equal(impact.projectedRawScore, null);
  assert.match(formatClaraMetricImpactLine(impact), /no resolved 100 anchor/);
});
