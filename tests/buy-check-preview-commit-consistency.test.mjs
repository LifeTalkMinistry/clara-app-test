import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildClaraPurchaseMetricImpact } from "../src/lib/clara-buy-check-metric-impact.js";
import {
  calculateMeansScoreState,
  resolveAdaptiveMeansBaselineState,
} from "../src/lib/clara-means-cycle-baseline.js";

const cycleStart = "2026-08-30";
const cycleEnd = "2026-09-15";
const today = "2026-08-30";
const requirementKey = "money-schedule:event-commit:2026-09-05";

function occurrence(actualPaid = 0) {
  return {
    id: requirementKey,
    requirementKey,
    sourceId: "event-commit",
    sourceType: "money_schedule",
    date: "2026-09-05",
    amount: 3000,
    kind: "money_schedule",
    actualPaid,
  };
}

function previewSnapshot() {
  return {
    score: 150,
    cycle100Anchor: 10000,
    requiredRunway: 10000,
    availableWalletMoney: 15000,
    remainingPlannedSpending: 10000,
    wallBill: 5000,
    cycleStartDate: cycleStart,
    cycleEndDate: cycleEnd,
    planRequirements: [
      {
        requirementKey,
        sourceType: "money_schedule",
        sourceId: "event-commit",
        date: "2026-09-05",
        plannedAmount: 3000,
        remainingAmount: 3000,
        kind: "money_schedule",
      },
    ],
  };
}

function canonicalRebuildAfterCommit({ purchaseAmount, matchedAmount }) {
  // Seed the fixed V7 ruler from the full original cycle plan. The test includes
  // another 7,000 requirement so the canonical anchor is exactly 10,000.
  const initial = resolveAdaptiveMeansBaselineState({
    stored: null,
    cycleStart,
    cycleEnd,
    today,
    occurrences: [
      occurrence(0),
      {
        id: "other-plan",
        requirementKey: "other-plan",
        sourceId: "other-plan",
        sourceType: "money_schedule",
        date: "2026-09-10",
        amount: 7000,
        kind: "money_schedule",
        actualPaid: 0,
      },
    ],
  });

  const rebuilt = resolveAdaptiveMeansBaselineState({
    stored: initial.baseline,
    cycleStart,
    cycleEnd,
    today,
    occurrences: [
      occurrence(matchedAmount),
      {
        id: "other-plan",
        requirementKey: "other-plan",
        sourceId: "other-plan",
        sourceType: "money_schedule",
        date: "2026-09-10",
        amount: 7000,
        kind: "money_schedule",
        actualPaid: 0,
      },
    ],
  });

  const closing = calculateMeansScoreState({
    availableWalletMoney: 15000 - purchaseAmount,
    remainingPlannedSpending: rebuilt.remainingPlannedSpending,
    cycle100Anchor: rebuilt.cycle100Anchor,
  });

  return { rebuilt, closing };
}

test("full planned preview equals canonical closing state after the same requirement fulfillment", () => {
  const preview = buildClaraPurchaseMetricImpact({
    snapshot: previewSnapshot(),
    purchasePrice: 3000,
    item: "Scheduled payment",
    plannedCandidates: [{
      label: "Scheduled payment",
      amount: 3000,
      matchScore: 1,
      source: "money_schedule_event",
      sourceType: "money_schedule",
      sourceId: "event-commit",
      targetDate: "2026-09-05",
      requirementKey,
    }],
  });

  const { rebuilt, closing } = canonicalRebuildAfterCommit({
    purchaseAmount: 3000,
    matchedAmount: preview.matchedPlannedAmount,
  });

  assert.equal(preview.requirementKey, requirementKey);
  assert.equal(rebuilt.cycle100Anchor, preview.cycle100Anchor);
  assert.equal(rebuilt.remainingPlannedSpending, preview.remainingPlannedSpendingAfterPurchase);
  assert.equal(closing.wallBill, preview.projectedWallBill);
  assert.equal(closing.score, preview.projectedScoreAfterPurchase);
});

test("partial planned preview equals canonical closing state and leaves overflow unprotected", () => {
  const preview = buildClaraPurchaseMetricImpact({
    snapshot: previewSnapshot(),
    purchasePrice: 4000,
    item: "Scheduled payment plus extra",
    plannedCandidates: [{
      label: "Scheduled payment",
      amount: 3000,
      matchScore: 1,
      source: "money_schedule_event",
      sourceType: "money_schedule",
      sourceId: "event-commit",
      targetDate: "2026-09-05",
      requirementKey,
    }],
  });

  const { rebuilt, closing } = canonicalRebuildAfterCommit({
    purchaseAmount: 4000,
    matchedAmount: preview.matchedPlannedAmount,
  });

  assert.equal(preview.matchedPlannedAmount, 3000);
  assert.equal(preview.unmatchedAmount, 1000);
  assert.equal(rebuilt.remainingPlannedSpending, preview.remainingPlannedSpendingAfterPurchase);
  assert.equal(closing.wallBill, preview.projectedWallBill);
  assert.equal(closing.score, preview.projectedScoreAfterPurchase);
});

test("commit path persists canonical identity and routes Debt matches through debt payment authority", async () => {
  const finalization = await readFile(
    new URL("../src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js", import.meta.url),
    "utf8"
  );
  const expenseRepository = await readFile(
    new URL("../src/lib/clara-buy-check-expense-repository.js", import.meta.url),
    "utf8"
  );
  const debtRepository = await readFile(
    new URL("../src/lib/debtPaymentRepository.js", import.meta.url),
    "utf8"
  );

  assert.match(finalization, /hasAuthoritativePlannedMatch/);
  assert.match(finalization, /means_requirement_key: requirementKey/);
  assert.match(finalization, /payDebtObligationFromWallet/);
  assert.match(expenseRepository, /means_requirement_key: payload\.means_requirement_key \|\| null/);
  assert.match(debtRepository, /means_requirement_key: meansRequirementKey \|\| null/);
  assert.match(debtRepository, /paymentHistory/);
});
