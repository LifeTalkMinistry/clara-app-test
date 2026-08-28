import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  calculateCycleRequiredRunway,
  calculateMeansScoreState,
  resolveMeansCycleBaselineState,
  stableMeansPlanFingerprint,
} from "../src/lib/clara-means-cycle-baseline.js";

function plan(amount, id = "primary") {
  return stableMeansPlanFingerprint({
    routine: [],
    schedule: [{ id, date: "2026-09-01", amount }],
    debt: [],
    savings: [],
  });
}

function freshBaseline({
  amount,
  assumedSpent = 0,
  cycleStart = "2026-08-25",
  cycleEnd = "2026-09-10",
  fingerprint = plan(amount),
}) {
  return resolveMeansCycleBaselineState({
    stored: null,
    cycleStart,
    cycleEnd,
    planFingerprint: fingerprint,
    requiredRunway: amount,
    assumedSpent,
  }).baseline;
}

function preserve({ baseline, plannedRequiredRunway, assumedSpent = 0, fingerprint = baseline.planFingerprint }) {
  return resolveMeansCycleBaselineState({
    stored: baseline,
    cycleStart: baseline.cycleStart,
    cycleEnd: baseline.cycleEnd,
    planFingerprint: fingerprint,
    requiredRunway: plannedRequiredRunway,
    assumedSpent,
  });
}

function score(financialRunway, baseline) {
  return calculateMeansScoreState({
    financialRunway,
    requiredRunway: baseline.requiredRunway,
  }).score;
}

test("new cycle 100 is plan-owned and ignores income/current wallet inputs", () => {
  const plannedRequiredRunway = calculateCycleRequiredRunway({
    income: 15100,
    availableNow: 7388,
    upcoming: 3121,
  });
  assert.equal(plannedRequiredRunway, 3121);

  const baseline = freshBaseline({ amount: plannedRequiredRunway, assumedSpent: 280 });
  assert.equal(baseline.requiredRunway, 3401);
});

test("same-cycle 100 does not change after spending", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const afterSpend = preserve({
    baseline,
    plannedRequiredRunway: 10000,
  });

  assert.equal(afterSpend.shouldPersist, false);
  assert.equal(afterSpend.reason, "cycle_anchor_locked");
  assert.equal(afterSpend.baseline.requiredRunway, 10000);
  assert.equal(score(20000, baseline), 200);
  assert.equal(score(18000, afterSpend.baseline), 180);
});

test("same-cycle 100 does not change after a debt payment", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const afterDebtPayment = preserve({
    baseline,
    // The paid occurrence disappeared from CURRENT remaining commitments.
    plannedRequiredRunway: 8000,
    fingerprint: plan(8000, "after-payment"),
  });

  assert.equal(afterDebtPayment.baseline.requiredRunway, 10000);
  assert.equal(score(15000, baseline), 150);
  assert.equal(score(13000, afterDebtPayment.baseline), 130);
});

test("already-paid debt history cannot inflate or create the 100", async () => {
  const runtime = await readFile(new URL("../src/runtime/installClaraOrbGreeting.js", import.meta.url), "utf8");

  assert.doesNotMatch(runtime, /plannedDebtPaidInsideCycle/);
  assert.doesNotMatch(runtime, /plannedDebtAlreadyPaid/);
  assert.doesNotMatch(runtime, /readDebtPaymentHistory/);
  assert.match(runtime, /const plannedRequiredRunway = calculateCycleRequiredRunway\(\{ upcoming \}\);/);
  assert.doesNotMatch(runtime, /income\s*-\s*\([^\n]*available/);
});

test("removing a completed upcoming obligation cannot increase score by shrinking 100", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const afterCompletion = preserve({
    baseline,
    plannedRequiredRunway: 7000,
    fingerprint: plan(7000, "completed-obligation-removed"),
  });

  assert.equal(afterCompletion.baseline.requiredRunway, 10000);
  assert.equal(score(15000, baseline), 150);
  assert.equal(score(15000, afterCompletion.baseline), 150);
});

test("adding cash raises the score against the same fixed 100", () => {
  const baseline = freshBaseline({ amount: 10000 });
  assert.equal(score(10000, baseline), 100);
  assert.equal(score(12000, baseline), 120);
});

test("spending cash lowers the score against the same fixed 100", () => {
  const baseline = freshBaseline({ amount: 10000 });
  assert.equal(score(20000, baseline), 200);
  assert.equal(score(18000, baseline), 180);
  assert.equal(score(13000, baseline), 130);
  assert.equal(score(9000, baseline), 90);
});

test("same-cycle plan/context changes cannot move the fixed 100", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const changed = preserve({
    baseline,
    plannedRequiredRunway: 12000,
    assumedSpent: 5000,
    fingerprint: plan(12000, "changed"),
  });

  assert.equal(changed.shouldPersist, false);
  assert.equal(changed.reason, "cycle_anchor_locked");
  assert.equal(changed.baseline.requiredRunway, 10000);
});

test("a genuinely new pay cycle establishes a new 100", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const nextCycle = resolveMeansCycleBaselineState({
    stored: baseline,
    cycleStart: "2026-09-10",
    cycleEnd: "2026-09-25",
    planFingerprint: plan(12000, "new-cycle"),
    requiredRunway: 12000,
    assumedSpent: 0,
  });

  assert.equal(nextCycle.shouldPersist, true);
  assert.equal(nextCycle.reason, "new_cycle_or_stale_baseline");
  assert.equal(nextCycle.baseline.requiredRunway, 12000);
});

test("stale baseline migration uses deterministic planned-cycle data, not realized history", () => {
  const migrated = resolveMeansCycleBaselineState({
    stored: {
      version: 4,
      requiredRunway: 7859,
      assumedSpentAtLock: 280,
      cycleStart: "2026-08-25",
      cycleEnd: "2026-09-10",
      planFingerprint: plan(7859, "stale-transaction-inflated"),
      paymentHistory: [{ amount: 5000, paidAt: "2026-08-27" }],
    },
    cycleStart: "2026-08-25",
    cycleEnd: "2026-09-10",
    planFingerprint: plan(3121, "authoritative-current-plan"),
    requiredRunway: 3121,
    assumedSpent: 280,
  });

  assert.equal(migrated.shouldPersist, true);
  assert.equal(migrated.reason, "new_cycle_or_stale_baseline");
  assert.equal(migrated.baseline.requiredRunway, 3401);
  assert.notEqual(migrated.baseline.requiredRunway, 7859);
});

test("runtime/store wiring remains intact for financial context updates", async () => {
  const runtime = await readFile(new URL("../src/runtime/installClaraOrbGreeting.js", import.meta.url), "utf8");
  const scheduleRepository = await readFile(new URL("../src/lib/clara-money-schedule-repository.js", import.meta.url), "utf8");
  const schedulePanel = await readFile(
    new URL("../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanel.jsx", import.meta.url),
    "utf8"
  );

  assert.match(runtime, /clara:means-cycle-baseline:v5/);
  assert.match(runtime, /FINANCE_DATA_UPDATED_EVENT/);
  assert.match(runtime, /INCOME_HUB_UPDATED_EVENT/);
  assert.match(runtime, /DEBT_OBLIGATIONS_UPDATED_EVENT/);
  assert.match(runtime, /CLARA_MONEY_ROUTINE_UPDATED_EVENT/);
  assert.match(runtime, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
  assert.match(runtime, /"clara:schedule:create-event"/);
  assert.match(scheduleRepository, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
  assert.match(schedulePanel, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
});
