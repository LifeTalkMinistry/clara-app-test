import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  calculateCycleRequiredRunway,
  calculateMeansScoreState,
  MEANS_CYCLE_BASELINE_VERSION,
  resolveMeansCycleBaselineState,
  stableMeansPlanFingerprint,
} from "../src/lib/clara-means-cycle-baseline.js";

const CYCLE = { start: "2026-08-25", end: "2026-09-10" };

function plan(amount, id = "primary") {
  return stableMeansPlanFingerprint({
    cycleStart: CYCLE.start,
    cycleEnd: CYCLE.end,
    routine: [],
    schedule: [{ id, date: "2026-09-01", amount }],
    debt: [],
    savings: [],
  });
}

function freshBaseline({ amount, assumedSpent = 0, fingerprint = plan(amount) }) {
  return resolveMeansCycleBaselineState({
    stored: null,
    cycleStart: CYCLE.start,
    cycleEnd: CYCLE.end,
    planFingerprint: fingerprint,
    requiredRunway: amount,
    assumedSpent,
  }).baseline;
}

function sameCycle({ baseline, amount, fingerprint = baseline.planFingerprint, assumedSpent = 0 }) {
  return resolveMeansCycleBaselineState({
    stored: baseline,
    cycleStart: CYCLE.start,
    cycleEnd: CYCLE.end,
    planFingerprint: fingerprint,
    requiredRunway: amount,
    assumedSpent,
  });
}

function score(financialRunway, baseline) {
  return calculateMeansScoreState({
    financialRunway,
    requiredRunway: baseline.requiredRunway,
  }).score;
}

test("new cycle 100 is the complete plan and ignores wallet/income/assumed-spent context", () => {
  const fullCycleRequirement = calculateCycleRequiredRunway({
    income: 15100,
    availableNow: 7388,
    upcoming: 10403,
  });
  assert.equal(fullCycleRequirement, 10403);

  const baseline = freshBaseline({ amount: fullCycleRequirement, assumedSpent: 280 });
  assert.equal(MEANS_CYCLE_BASELINE_VERSION, 6);
  assert.equal(baseline.requiredRunway, 10403);
  assert.equal(baseline.planRequiredRunway, 10403);
});

test("spending is a reality event and cannot move same-cycle 100", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const afterSpend = sameCycle({ baseline, amount: 10000 });

  assert.equal(afterSpend.shouldPersist, false);
  assert.equal(afterSpend.reason, "cycle_anchor_locked");
  assert.equal(afterSpend.baseline.requiredRunway, 10000);
  assert.equal(score(15000, baseline), 150);
  assert.equal(score(13000, afterSpend.baseline), 130);
});

test("paying debt lowers the numerator but cannot shrink the full-cycle plan", () => {
  const fingerprint = plan(10403, "same-full-cycle-plan");
  const baseline = freshBaseline({ amount: 10403, fingerprint });
  const afterPayment = sameCycle({
    baseline,
    amount: 10403,
    fingerprint,
    assumedSpent: 280,
  });

  assert.equal(afterPayment.shouldPersist, false);
  assert.equal(afterPayment.reason, "cycle_anchor_locked");
  assert.equal(afterPayment.baseline.requiredRunway, 10403);
  assert.equal(score(7388, baseline), 71);
  assert.equal(score(5569, afterPayment.baseline), 54);
});

test("completion, date progression, and reload cannot remove planned amounts from 100", () => {
  const fingerprint = plan(10000, "stable-cycle-plan");
  const baseline = freshBaseline({ amount: 10000, fingerprint });
  const reloaded = JSON.parse(JSON.stringify(baseline));
  const later = sameCycle({
    baseline: reloaded,
    amount: 10000,
    fingerprint,
    assumedSpent: 5000,
  });

  assert.equal(later.shouldPersist, false);
  assert.equal(later.reason, "cycle_anchor_locked");
  assert.equal(later.baseline.requiredRunway, 10000);
});

test("adding a new obligation mid-cycle applies only the explicit planning delta", () => {
  const baseline = freshBaseline({ amount: 10000, fingerprint: plan(10000, "before") });
  const amended = sameCycle({
    baseline,
    amount: 12000,
    fingerprint: plan(12000, "after-add"),
  });

  assert.equal(amended.shouldPersist, true);
  assert.equal(amended.reason, "plan_delta_applied");
  assert.equal(amended.baseline.requiredRunway, 12000);
  assert.equal(amended.baseline.planRequiredRunway, 12000);
});

test("editing a planned amount 500 to 800 adds exactly 300 to 100", () => {
  const baseline = freshBaseline({ amount: 10000, fingerprint: plan(10000, "before-edit") });
  const amended = sameCycle({
    baseline,
    amount: 10300,
    fingerprint: plan(10300, "after-edit"),
  });

  assert.equal(amended.reason, "plan_delta_applied");
  assert.equal(amended.baseline.requiredRunway, 10300);
});

test("intentionally cancelling a future 1,000 commitment subtracts exactly 1,000 from 100", () => {
  const baseline = freshBaseline({ amount: 10000, fingerprint: plan(10000, "before-delete") });
  const amended = sameCycle({
    baseline,
    amount: 9000,
    fingerprint: plan(9000, "after-delete"),
  });

  assert.equal(amended.reason, "plan_delta_applied");
  assert.equal(amended.baseline.requiredRunway, 9000);
});

test("successive planning edits accumulate from the already-amended cycle anchor", () => {
  const baseline = freshBaseline({ amount: 10000, fingerprint: plan(10000, "p0") });
  const plus2000 = sameCycle({
    baseline,
    amount: 12000,
    fingerprint: plan(12000, "p1"),
  }).baseline;
  const plus300 = sameCycle({
    baseline: plus2000,
    amount: 12300,
    fingerprint: plan(12300, "p2"),
  }).baseline;
  const minus1000 = sameCycle({
    baseline: plus300,
    amount: 11300,
    fingerprint: plan(11300, "p3"),
  }).baseline;

  assert.equal(plus2000.requiredRunway, 12000);
  assert.equal(plus300.requiredRunway, 12300);
  assert.equal(minus1000.requiredRunway, 11300);
});

test("a genuine new pay cycle establishes a new 100 instead of applying a same-cycle delta", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const nextCycle = resolveMeansCycleBaselineState({
    stored: baseline,
    cycleStart: "2026-09-10",
    cycleEnd: "2026-09-25",
    planFingerprint: stableMeansPlanFingerprint({ cycle: "b", amount: 12000 }),
    requiredRunway: 12000,
    assumedSpent: 900,
  });

  assert.equal(nextCycle.shouldPersist, true);
  assert.equal(nextCycle.reason, "new_cycle_or_stale_baseline");
  assert.equal(nextCycle.baseline.requiredRunway, 12000);
});

test("malformed v5 3,401 anchor migrates from the supplied complete plan, not remaining commitments", () => {
  const migrated = resolveMeansCycleBaselineState({
    stored: {
      version: 5,
      requiredRunway: 3401,
      cycleStart: CYCLE.start,
      cycleEnd: CYCLE.end,
      planFingerprint: plan(3401, "bad-v5"),
    },
    cycleStart: CYCLE.start,
    cycleEnd: CYCLE.end,
    planFingerprint: plan(10403, "complete-cycle-plan"),
    requiredRunway: 10403,
    assumedSpent: 280,
  });

  assert.equal(migrated.shouldPersist, true);
  assert.equal(migrated.reason, "new_cycle_or_stale_baseline");
  assert.equal(migrated.baseline.requiredRunway, 10403);
  assert.notEqual(migrated.baseline.requiredRunway, 3401);
});

test("runtime builds denominator from complete cycle plan and keeps Upcoming presentation separate", async () => {
  const runtime = await readFile(new URL("../src/runtime/installClaraOrbGreeting.js", import.meta.url), "utf8");
  const debtStore = await readFile(new URL("../src/lib/debtObligationStore.js", import.meta.url), "utf8");

  assert.match(runtime, /clara:means-cycle-baseline:v6/);
  assert.match(runtime, /fullCycleRoutineAmount/);
  assert.match(runtime, /fullCycleScheduledAmount/);
  assert.match(runtime, /fullCycleDebtObligationAmount/);
  assert.match(runtime, /fullCycleSavingsGoalAmount/);
  assert.match(runtime, /const fullCyclePlannedRequirement\s*=/);
  assert.match(runtime, /getDebtObligationPlanRecords\(owner\)/);
  assert.match(debtStore, /export async function getDebtObligationPlanRecords/);
  assert.doesNotMatch(runtime, /plannedDebtPaidInsideCycle/);
  assert.doesNotMatch(runtime, /readDebtPaymentHistory/);
});

test("Money Schedule current day is not subtracted twice from the cycle view", async () => {
  const runtime = await readFile(new URL("../src/runtime/installClaraOrbGreeting.js", import.meta.url), "utf8");

  assert.match(runtime, /const moneyScheduleUpcoming = rawMoneyScheduleUpcoming;/);
  assert.doesNotMatch(runtime, /rawMoneyScheduleUpcoming\s*-\s*assumedToday/);
});

test("financial context update wiring remains intact", async () => {
  const runtime = await readFile(new URL("../src/runtime/installClaraOrbGreeting.js", import.meta.url), "utf8");
  const scheduleRepository = await readFile(new URL("../src/lib/clara-money-schedule-repository.js", import.meta.url), "utf8");

  assert.match(runtime, /FINANCE_DATA_UPDATED_EVENT/);
  assert.match(runtime, /INCOME_HUB_UPDATED_EVENT/);
  assert.match(runtime, /DEBT_OBLIGATIONS_UPDATED_EVENT/);
  assert.match(runtime, /CLARA_MONEY_ROUTINE_UPDATED_EVENT/);
  assert.match(runtime, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
  assert.match(scheduleRepository, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
});
