import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClaraPurchaseMetricImpact,
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
  planRequirements: [
    {
      requirementKey: "money-schedule:event-1:2026-08-30",
      sourceType: "money_schedule",
      sourceId: "event-1",
      date: "2026-08-30",
      plannedAmount: 3000,
      remainingAmount: 3000,
      kind: "money_schedule",
    },
    {
      requirementKey: "debt:debt-1:2026-09-01",
      sourceType: "debt",
      sourceId: "debt-1",
      date: "2026-09-01",
      plannedAmount: 3000,
      remainingAmount: 3000,
      kind: "debt",
    },
  ],
};

test("TEST A — ₱2,000 unplanned", () => {
  const impact = simulateMeansPurchaseImpact({ snapshot, purchasePrice: 2000 });
  assert.equal(impact.availableAfterPurchase, 13000);
  assert.equal(impact.remainingPlannedSpendingAfterPurchase, 10000);
  assert.equal(impact.projectedWallBill, 3000);
  assert.equal(impact.projectedScoreAfterPurchase, 130);
});

test("TEST B — ₱5,000 unplanned", () => {
  const impact = simulateMeansPurchaseImpact({ snapshot, purchasePrice: 5000 });
  assert.equal(impact.availableAfterPurchase, 10000);
  assert.equal(impact.remainingPlannedSpendingAfterPurchase, 10000);
  assert.equal(impact.projectedWallBill, 0);
  assert.equal(impact.projectedScoreAfterPurchase, 100);
});

test("TEST C — ₱7,000 unplanned remains negative-capable", () => {
  const impact = simulateMeansPurchaseImpact({ snapshot, purchasePrice: 7000 });
  assert.equal(impact.availableAfterPurchase, 8000);
  assert.equal(impact.remainingPlannedSpendingAfterPurchase, 10000);
  assert.equal(impact.projectedWallBill, -2000);
  assert.equal(impact.projectedScoreAfterPurchase, 80);
});

test("TEST D — full canonical planned match preserves Wall Bill and score", () => {
  const impact = buildClaraPurchaseMetricImpact({
    snapshot,
    purchasePrice: 3000,
    item: "Internet bill",
    plannedCandidates: [{
      label: "Internet bill",
      amount: 3000,
      matchScore: 1,
      source: "money_schedule_event",
      sourceType: "money_schedule",
      sourceId: "event-1",
      targetDate: "2026-08-30",
      requirementKey: "money-schedule:event-1:2026-08-30",
    }],
  });
  assert.equal(impact.authoritativePlannedMatch, true);
  assert.equal(impact.requirementKey, "money-schedule:event-1:2026-08-30");
  assert.equal(impact.matchedPlannedAmount, 3000);
  assert.equal(impact.unmatchedAmount, 0);
  assert.equal(impact.availableAfterPurchase, 12000);
  assert.equal(impact.remainingPlannedSpendingAfterPurchase, 7000);
  assert.equal(impact.projectedWallBill, 5000);
  assert.equal(impact.projectedScoreAfterPurchase, 150);
});

test("TEST E — partial canonical match protects only requirement remainder", () => {
  const impact = buildClaraPurchaseMetricImpact({
    snapshot,
    purchasePrice: 4000,
    item: "Internet bill plus extra",
    plannedCandidates: [{
      label: "Internet bill",
      amount: 3000,
      matchScore: 1,
      source: "money_schedule_event",
      sourceType: "money_schedule",
      sourceId: "event-1",
      targetDate: "2026-08-30",
      requirementKey: "money-schedule:event-1:2026-08-30",
    }],
  });
  assert.equal(impact.matchedPlannedAmount, 3000);
  assert.equal(impact.unmatchedAmount, 1000);
  assert.equal(impact.availableAfterPurchase, 11000);
  assert.equal(impact.remainingPlannedSpendingAfterPurchase, 7000);
  assert.equal(impact.projectedWallBill, 4000);
  assert.equal(impact.projectedScoreAfterPurchase, 140);
});

test("TEST F — fuzzy lookalike without canonical identity stays unplanned", () => {
  const impact = buildClaraPurchaseMetricImpact({
    snapshot,
    purchasePrice: 2000,
    item: "Internet bill lookalike",
    plannedCandidates: [{
      label: "Internet bill",
      amount: 3000,
      matchScore: 0.94,
      source: "money_schedule_event",
      sourceType: "money_schedule",
      sourceId: "wrong-event",
      targetDate: "2026-08-30",
      requirementKey: "money-schedule:wrong-event:2026-08-30",
    }],
  });
  assert.equal(impact.authoritativePlannedMatch, false);
  assert.equal(impact.requirementKey, null);
  assert.equal(impact.matchedPlannedAmount, 0);
  assert.equal(impact.unmatchedAmount, 2000);
  assert.equal(impact.projectedWallBill, 3000);
  assert.equal(impact.projectedScoreAfterPurchase, 130);
});

test("TEST G — canonical Debt / Obligation requirement uses the same matcher law", () => {
  const impact = buildClaraPurchaseMetricImpact({
    snapshot,
    purchasePrice: 3000,
    item: "Loan payment",
    plannedCandidates: [{
      label: "Loan payment",
      amount: 3000,
      matchScore: 1,
      source: "debt_obligation",
      sourceType: "debt",
      sourceId: "debt-1",
      targetDate: "2026-09-01",
      requirementKey: "debt:debt-1:2026-09-01",
    }],
  });
  assert.equal(impact.authoritativePlannedMatch, true);
  assert.equal(impact.requirementKey, "debt:debt-1:2026-09-01");
  assert.equal(impact.matchedPlannedAmount, 3000);
  assert.equal(impact.unmatchedAmount, 0);
  assert.equal(impact.projectedWallBill, 5000);
  assert.equal(impact.projectedScoreAfterPurchase, 150);
});

test("matched amount is never authoritative without a requirement key", () => {
  const impact = simulateMeansPurchaseImpact({
    snapshot,
    purchasePrice: 1000,
    matchedPlannedAmount: 1000,
    alreadyAccountedAmount: 1000,
    authoritativePlannedMatch: true,
    requirementKey: null,
  });
  assert.equal(impact.authoritativePlannedMatch, false);
  assert.equal(impact.matchedPlannedAmount, 0);
  assert.equal(impact.unmatchedAmount, 1000);
  assert.equal(impact.projectedScoreAfterPurchase, 140);
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

test("rolling Means preview cannot jump from upcoming-limited 98 back to isolated current-cycle 395", () => {
  const cycle100Anchor = 2497 / 3.05;
  const rollingSnapshot = {
    ...snapshot,
    score: 98,
    wallBill: 2497,
    scoreRoom: 2497,
    projectedRoom: 2497,
    availableNow: 3317,
    availableWalletMoney: 3317,
    remainingPlannedSpending: 820,
    upcoming: 820,
    cycle100Anchor,
    requiredRunway: cycle100Anchor,
    currentCycleMeansScore: 405,
    currentCycleRawMeansScore: 405,
    meansScoreLimitingWindow: "upcoming",
    upcomingCycleResolved: true,
    upcomingCycleRequirement: 15820,
    lowestExpectedIncome: 13000,
    upcomingCoverageScore: 98,
  };

  const impact = simulateMeansPurchaseImpact({
    snapshot: rollingSnapshot,
    purchasePrice: 100,
  });

  assert.equal(impact.currentScore, 98);
  assert.equal(impact.projectedWallBill, 2397);
  assert.equal(impact.projectedScoreAfterPurchase, 97);
  assert.equal(impact.projectedMeansLimitingWindow, "upcoming");
  assert.ok(Number(impact.projectedCurrentCycleRawScore) > 300);
  assert.ok(Number(impact.projectedUpcomingCoverageRawScore) < 100);
});

test("rolling Means preview preserves 98 for a fully matched current-cycle payment", () => {
  const cycle100Anchor = 2497 / 3.05;
  const rollingSnapshot = {
    ...snapshot,
    score: 98,
    wallBill: 2497,
    scoreRoom: 2497,
    projectedRoom: 2497,
    availableNow: 3317,
    availableWalletMoney: 3317,
    remainingPlannedSpending: 820,
    upcoming: 820,
    cycle100Anchor,
    requiredRunway: cycle100Anchor,
    currentCycleMeansScore: 405,
    currentCycleRawMeansScore: 405,
    meansScoreLimitingWindow: "upcoming",
    upcomingCycleResolved: true,
    upcomingCycleRequirement: 15820,
    lowestExpectedIncome: 13000,
    upcomingCoverageScore: 98,
  };

  const impact = simulateMeansPurchaseImpact({
    snapshot: rollingSnapshot,
    purchasePrice: 100,
    matchedPlannedAmount: 100,
    alreadyAccountedAmount: 100,
    authoritativePlannedMatch: true,
    requirementKey: "money-schedule:event-1:2026-08-30",
  });

  assert.equal(impact.projectedWallBill, 2497);
  assert.equal(impact.projectedScoreAfterPurchase, 98);
  assert.equal(impact.scoreChange, 0);
});


const productionUpcomingLimited127Snapshot = {
  score: 127,
  meansScoreLimitingWindow: "upcoming",
  cycle100Anchor: 820,
  requiredRunway: 820,
  wallBill: 2497,
  scoreRoom: 2497,
  currentRealRoom: 2497,
  availableNow: 3317,
  availableWalletMoney: 3317,
  remainingPlannedSpending: 820,
  upcoming: 820,
  currentCycleMeansScore: 405,
  currentCycleRawMeansScore: 100 + ((2497 / 820) * 100),
  upcomingCycleResolved: true,
  upcomingCycleRequirement: 12170,
  lowestExpectedIncome: 13000,
  upcomingCoverageRawScore: (15497 / 12170) * 100,
  upcomingCoverageScore: 127,
};

test("production 127 upcoming-limited projection keeps the canonical upcoming authority", () => {
  assert.equal(Math.round((15497 / 12170) * 100), 127);
  const cases = [
    [1000, 119],
    [2000, 111],
    [3000, 103],
    [4000, 94],
    [5000, 86],
    [2436, 107],
    [2437, 107],
    [2438, 107],
    [2900, 104],
    [2999, 103],
    [3000, 103],
    [3001, 103],
    [3100, 102],
  ];

  assert.equal(productionUpcomingLimited127Snapshot.score, 127);
  assert.equal(productionUpcomingLimited127Snapshot.meansScoreLimitingWindow, "upcoming");
  for (const [purchasePrice, expectedScore] of cases) {
    const impact = simulateMeansPurchaseImpact({
      snapshot: productionUpcomingLimited127Snapshot,
      purchasePrice,
    });
    assert.equal(
      impact.projectedScoreAfterPurchase,
      expectedScore,
      `unexpected projected score for ₱${purchasePrice}`,
    );
    assert.equal(impact.projectedMeansLimitingWindow, "upcoming");
    assert.equal(impact.projectedRawScore, impact.projectedUpcomingCoverageRawScore);
  }

  const threeThousand = simulateMeansPurchaseImpact({
    snapshot: productionUpcomingLimited127Snapshot,
    purchasePrice: 3000,
  });
  assert.equal(Math.round(threeThousand.projectedCurrentCycleRawScore), 39);
  assert.equal(Math.round(threeThousand.projectedUpcomingCoverageRawScore), 103);
  assert.equal(threeThousand.projectedScoreAfterPurchase, 103);
});

test("upcoming-limited preview does not mutate the canonical snapshot", () => {
  const candidate = structuredClone(productionUpcomingLimited127Snapshot);
  const before = structuredClone(candidate);
  simulateMeansPurchaseImpact({ snapshot: candidate, purchasePrice: 3000 });
  assert.deepEqual(candidate, before);
});

test("canonical current-window preview remains current-window authoritative", () => {
  const currentLimited = {
    ...productionUpcomingLimited127Snapshot,
    score: 405,
    meansScoreLimitingWindow: "current",
  };
  const impact = simulateMeansPurchaseImpact({
    snapshot: currentLimited,
    purchasePrice: 3000,
  });
  assert.equal(Math.round(impact.projectedCurrentCycleRawScore), 39);
  assert.equal(Math.round(impact.projectedUpcomingCoverageRawScore), 103);
  assert.equal(impact.projectedScoreAfterPurchase, 39);
  assert.equal(impact.projectedMeansLimitingWindow, "current");
});

test("unresolved canonical Means snapshot does not fabricate upcoming authority", () => {
  const unresolvedUpcoming = {
    ...productionUpcomingLimited127Snapshot,
    score: null,
    meansScoreLimitingWindow: "upcoming",
    upcomingCycleResolved: false,
    upcomingCycleRequirement: 0,
  };
  const impact = simulateMeansPurchaseImpact({
    snapshot: unresolvedUpcoming,
    purchasePrice: 1000,
  });
  assert.equal(impact.projectedUpcomingCoverageRawScore, null);
  assert.equal(impact.projectedRawScore, null);
  assert.equal(impact.projectedScoreAfterPurchase, null);
  assert.equal(impact.projectedMeansLimitingWindow, "upcoming");
});
