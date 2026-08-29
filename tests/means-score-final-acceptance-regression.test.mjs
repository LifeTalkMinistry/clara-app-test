import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  MEANS_CYCLE_BASELINE_VERSION,
  calculateMeansScoreState,
  matchMeansOutflowToRequirement,
  resolveAdaptiveMeansBaselineState,
} from "../src/lib/clara-means-cycle-baseline.js";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

const cycleStart = "2026-08-29";
const cycleEnd = "2026-09-12";
const today = "2026-08-29";

const occurrence = (id, date, amount, kind = "money_schedule", actualPaid = 0) => ({
  id,
  requirementKey: id,
  sourceId: id,
  sourceType: kind,
  date,
  amount,
  kind,
  actualPaid,
});

function resolve({ occurrences = [], stored = null } = {}) {
  return resolveAdaptiveMeansBaselineState({
    stored,
    cycleStart,
    cycleEnd,
    today,
    occurrences,
  });
}

function score(wallet, remainingPlan, anchor) {
  return calculateMeansScoreState({
    availableWalletMoney: wallet,
    remainingPlannedSpending: remainingPlan,
    cycle100Anchor: anchor,
  });
}

test("01 V7 is the active Means baseline schema", () => {
  assert.equal(MEANS_CYCLE_BASELINE_VERSION, 7);
});

test("02 fresh cycle with no recognized plan has an explicit no-anchor state", () => {
  const state = resolve();
  assert.equal(state.cycle100Anchor, 0);
  assert.equal(state.anchorState, "no_anchor");
  assert.equal(score(5000, 0, 0).score, null);
});

test("03 first complete recognized plan establishes the fixed Cycle 100 Anchor", () => {
  const state = resolve({ occurrences: [occurrence("rent", "2026-09-01", 10000)] });
  assert.equal(state.cycle100Anchor, 10000);
  assert.equal(state.remainingPlannedSpending, 10000);
});

test("04 Wall Bill zero scores exactly 100", () => {
  const state = score(10000, 10000, 10000);
  assert.equal(state.wallBill, 0);
  assert.equal(state.score, 100);
});

test("05 short by 2000 scores 80 without clamping", () => {
  const state = score(8000, 10000, 10000);
  assert.equal(state.wallBill, -2000);
  assert.equal(state.score, 80);
});

test("06 later future plan addition increases Remaining Plan but never resizes the anchor", () => {
  const before = resolve({ occurrences: [occurrence("rent", "2026-09-01", 10000)] });
  const after = resolve({
    stored: before.baseline,
    occurrences: [
      occurrence("rent", "2026-09-01", 10000),
      occurrence("food", "2026-09-04", 5000),
    ],
  });
  assert.equal(after.cycle100Anchor, 10000);
  assert.equal(after.remainingPlannedSpending, 15000);
});

test("07 legitimate future plan reduction raises room without resizing the anchor", () => {
  const before = resolve({
    occurrences: [
      occurrence("rent", "2026-09-01", 10000),
      occurrence("food", "2026-09-04", 5000),
    ],
  });
  const after = resolve({
    stored: before.baseline,
    occurrences: [occurrence("rent", "2026-09-01", 9000)],
  });
  assert.equal(after.cycle100Anchor, 15000);
  assert.equal(after.remainingPlannedSpending, 9000);
});

test("08 today's protected requirement cannot be rewritten after the financial day begins", () => {
  const before = resolve({ occurrences: [occurrence("today", today, 3000)] });
  const after = resolve({ stored: before.baseline, occurrences: [occurrence("today", today, 9000)] });
  assert.equal(after.cycle100Anchor, 3000);
  assert.equal(after.remainingPlannedSpending, 3000);
});

test("09 an unfulfilled requirement remains after its due date passes", () => {
  const before = resolve({ occurrences: [occurrence("today", today, 3000)] });
  const after = resolveAdaptiveMeansBaselineState({
    stored: before.baseline,
    cycleStart,
    cycleEnd,
    today: "2026-08-30",
    occurrences: [],
  });
  assert.equal(after.remainingPlannedSpending, 3000);
});

test("10 time passage alone never creates synthetic spending", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /const today = financialDateKey\(now\)/);
  assert.match(authority, /const assumedSpent = 0/);
  assert.match(authority, /const effectiveCurrentMoney = availableNow/);
});

test("11 unplanned spending lowers Wall Bill and score", () => {
  const before = score(15000, 10000, 10000);
  const after = score(13000, 10000, 10000);
  assert.equal(before.score, 150);
  assert.equal(after.wallBill, 3000);
  assert.equal(after.score, 130);
});

test("12 matched planned spending lowers Wallet and Remaining Plan together", () => {
  const before = score(13000, 10000, 10000);
  const after = score(10000, 7000, 10000);
  assert.equal(before.wallBill, 3000);
  assert.equal(after.wallBill, 3000);
  assert.equal(after.score, 130);
});

test("13 partial matched payment protects only the actual matched amount", () => {
  const match = matchMeansOutflowToRequirement({
    actualOutflowAmount: 1500,
    requirementKey: "plan:rent",
    requirement: { requirementKey: "plan:rent", remainingAmount: 2000 },
  });
  assert.equal(match.matchedPlannedAmount, 1500);
  assert.equal(match.unmatchedAmount, 0);
  assert.equal(match.remainingAmountAfterEvent, 500);
});

test("14 overflow is explicit and cannot silently roll into another requirement", () => {
  const match = matchMeansOutflowToRequirement({
    actualOutflowAmount: 2500,
    requirementKey: "plan:rent",
    requirement: { requirementKey: "plan:rent", remainingAmount: 2000 },
  });
  assert.equal(match.matchedPlannedAmount, 2000);
  assert.equal(match.unmatchedAmount, 500);
});

test("15 stable requirement identity is mandatory for fulfillment", () => {
  const match = matchMeansOutflowToRequirement({
    actualOutflowAmount: 500,
    requirementKey: "",
    requirement: { requirementKey: "plan:rent", remainingAmount: 2000 },
  });
  assert.equal(match.matchedPlannedAmount, 0);
  assert.equal(match.unmatchedAmount, 500);
});

test("16 adding actual Wallet money raises Means without rewriting the anchor", () => {
  assert.equal(score(10000, 10000, 10000).score, 100);
  assert.equal(score(12000, 10000, 10000).score, 120);
});

test("17 Savings Goal protection remains a Wallet semantic, not a Plan Spending requirement", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /getSavingsGoals/);
  assert.match(authority, /savingsProtected/);
  assert.doesNotMatch(authority, /kind:\s*["']savings_goal["']/);
});

test("18 Emergency Fund protection remains a Wallet semantic, not a Plan Spending requirement", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /getEmergencyFund/);
  assert.match(authority, /emergencyProtected/);
  assert.doesNotMatch(authority, /kind:\s*["']emergency_fund["']/);
});

test("19 Money Lent remains unavailable to Means without becoming Plan Spending", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /isMoneyLentWallet/);
  assert.match(authority, /moneyLentUnavailable/);
});

test("20 debt actualPaid reduces Remaining Plan but not Cycle 100 Anchor", () => {
  const planned = resolve({ occurrences: [occurrence("debt:a:2026-09-05", "2026-09-05", 5000, "debt")] });
  const partial = resolve({
    stored: planned.baseline,
    occurrences: [occurrence("debt:a:2026-09-05", "2026-09-05", 5000, "debt", 1500)],
  });
  assert.equal(partial.cycle100Anchor, 5000);
  assert.equal(partial.remainingPlannedSpending, 3500);
});

test("21 multiple debt payments aggregate by occurrence identity", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /cumulativeActualForOccurrence/);
  assert.match(authority, /paymentDueDate\(payment\) === dueDate/);
});

test("22 debt payment owner keeps due-date, debt and Wallet identities", async () => {
  const payment = await source("../src/lib/debtPaymentRepository.js");
  assert.match(payment, /dueDate/);
  assert.match(payment, /debtId|debt_id/);
  assert.match(payment, /walletId|wallet_id/);
});

test("23 overpayment cannot push Remaining Planned Spending below zero", () => {
  const planned = resolve({ occurrences: [occurrence("debt:a", "2026-09-05", 5000, "debt")] });
  const paid = resolve({
    stored: planned.baseline,
    occurrences: [occurrence("debt:a", "2026-09-05", 5000, "debt", 9000)],
  });
  assert.equal(paid.cycle100Anchor, 5000);
  assert.equal(paid.remainingPlannedSpending, 0);
});

test("24 current authority has no future-actual or carried-debt anchor inputs", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.doesNotMatch(authority, /currentCycleFutureDebtActual/);
  assert.doesNotMatch(authority, /confirmedCarriedDebt/);
  assert.match(authority, /extraCurrentCycleActual:\s*0/);
  assert.match(authority, /carriedObligations:\s*0/);
});

test("25 genuine cycle rollover creates a genuinely new anchor", () => {
  const previous = resolve({ occurrences: [occurrence("old", "2026-09-01", 3000)] });
  const next = resolveAdaptiveMeansBaselineState({
    stored: previous.baseline,
    cycleStart: "2026-09-12",
    cycleEnd: "2026-09-26",
    today: "2026-09-12",
    occurrences: [occurrence("new", "2026-09-15", 7000)],
  });
  assert.equal(next.cycle100Anchor, 7000);
  assert.equal(next.remainingPlannedSpending, 7000);
});

test("26 negative Wall Bill is allowed to produce a negative Means Score", () => {
  const state = score(-2500, 10000, 10000);
  assert.equal(state.wallBill, -12500);
  assert.equal(state.score, -25);
});

test("27 same-cycle legacy V6 evidence is preserved but not reinterpreted as a V7 anchor", () => {
  const state = resolve({
    stored: {
      version: 6,
      cycleStart,
      cycleEnd,
      requiredRunway: 9999,
      protectedOccurrences: {},
    },
    occurrences: [occurrence("plan", "2026-09-01", 8000)],
  });
  assert.equal(state.cycle100Anchor, 0);
  assert.equal(state.remainingPlannedSpending, 8000);
  assert.equal(state.anchorState, "migration_unresolved");
  assert.equal(state.shouldPersist, false);
});

test("28 runtime uses one canonical Means authority and no duplicate display formula", async () => {
  const runtime = await source("../src/runtime/installClaraOrbGreeting.js");
  assert.match(runtime, /buildCanonicalMeansSnapshot/);
  assert.doesNotMatch(runtime, /function calculateMeansScore/);
  assert.match(runtime, /snapshot\?\.wallBill/);
});

test("29 canonical snapshot exposes the five V7 financial truths", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /availableWalletMoney/);
  assert.match(authority, /cycle100Anchor/);
  assert.match(authority, /remainingPlannedSpending/);
  assert.match(authority, /wallBill: scoreState\.wallBill/);
  assert.match(authority, /meansScore: scoreState\.score/);
});

test("30 Buy Check preview uses the same Wall Bill event law", async () => {
  const preview = await source("../src/lib/clara-buy-check-metric-impact.js");
  assert.match(preview, /remainingPlannedSpendingAfterPurchase/);
  assert.match(preview, /projectedWallBill/);
  assert.match(preview, /100 \+ \(\(projectedWallBill \/ cycle100Anchor\) \* 100\)/);
});
