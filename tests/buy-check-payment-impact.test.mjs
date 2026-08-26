import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClaraBuyCheckPaymentImpact,
  formatClaraBuyCheckPaymentImpactLine,
} from "../src/lib/clara-buy-check-payment-impact.js";

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

test("installment simulation applies only cash due now to the current Means score", () => {
  const impact = buildClaraBuyCheckPaymentImpact({
    purchasePrice: 1500,
    item: "phone",
    paymentStructure: {
      purchaseType: "installment",
      amountDueNow: 1500,
      paymentAmount: 1500,
      remainingPayments: 5,
      totalPayments: 6,
      totalCommitment: 9000,
      frequency: "monthly",
      fees: 0,
    },
    snapshot,
    plannedCandidates: [],
  });

  assert.equal(impact.purchaseType, "installment");
  assert.equal(impact.currentCashImpact, 1500);
  assert.equal(impact.projectedScoreAfterPurchase, 135);
  assert.equal(impact.futureRequiredCommitment, 7500);
  assert.equal(impact.totalCommitment, 9000);
  assert.equal(impact.remainingPayments, 5);
  assert.equal(impact.paymentAmount, 1500);
  assert.equal(impact.futureCommitmentIncludedInCurrentScore, false);
});

test("installment consequence states current score effect and future commitment separately", () => {
  const impact = buildClaraBuyCheckPaymentImpact({
    purchasePrice: 1500,
    item: "phone",
    paymentStructure: {
      purchaseType: "installment",
      amountDueNow: 1500,
      paymentAmount: 1500,
      remainingPayments: 5,
      totalPayments: 6,
      totalCommitment: 9000,
      frequency: "monthly",
      fees: 0,
    },
    snapshot,
    plannedCandidates: [],
  });

  const line = formatClaraBuyCheckPaymentImpactLine(impact);
  assert.equal(
    line,
    "That ₱1,500 would bring your Means Score from 150 down to 135. You’d also be committing to ₱7,500 across 5 future monthly payments of ₱1,500 (₱9,000 total).",
  );
});

test("one-time purchases retain the existing canonical metric behavior", () => {
  const impact = buildClaraBuyCheckPaymentImpact({
    purchasePrice: 1000,
    item: "shirt",
    snapshot,
    plannedCandidates: [],
  });

  assert.equal(impact.purchaseType, "one_time");
  assert.equal(impact.currentCashImpact, 1000);
  assert.equal(impact.futureRequiredCommitment, 0);
  assert.equal(impact.totalCommitment, 1000);
  assert.equal(impact.projectedScoreAfterPurchase, 140);
  assert.equal(
    formatClaraBuyCheckPaymentImpactLine(impact),
    "That ₱1,000 would bring your Means Score from 150 down to 140.",
  );
});
