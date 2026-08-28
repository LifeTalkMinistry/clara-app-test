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

function freshBaseline({ amount, cycleStart = "2026-08-25", cycleEnd = "2026-09-10", fingerprint = plan(amount) }) {
  return resolveMeansCycleBaselineState({
    stored: null,
    cycleStart,
    cycleEnd,
    planFingerprint: fingerprint,
    requiredRunway: amount,
    assumedSpent: 0,
  }).baseline;
}

function score({ financialRunway, baseline }) {
  return calculateMeansScoreState({
    financialRunway,
    requiredRunway: baseline?.requiredRunway,
  }).score;
}

test("full-cycle Means anchor is plan-owned, not rebuilt from current wallet balance", () => {
  const requiredRunway = calculateCycleRequiredRunway({
    income: 15100,
    availableNow: 7388,
    upcoming: 3121,
  });
  assert.equal(requiredRunway, 3121);

  const baseline = resolveMeansCycleBaselineState({
    stored: null,
    cycleStart: "2026-08-25",
    cycleEnd: "2026-09-10",
    planFingerprint: plan(3121),
    requiredRunway,
    assumedSpent: 280,
  }).baseline;

  assert.equal(baseline.requiredRunway, 3401);
  assert.equal(calculateMeansScoreState({ financialRunway: 7388, requiredRunway: baseline.requiredRunway }).score, 217);
});

test("stale pre-v5 baseline is rebuilt so previous transactions cannot keep a corrupted 100", () => {
  const refreshed = resolveMeansCycleBaselineState({
    stored: {
      version: 4,
      requiredRunway: 7859,
      assumedSpentAtLock: 280,
      cycleStart: "2026-08-25",
      cycleEnd: "2026-09-10",
      planFingerprint: plan(7859, "stale"),
    },
    cycleStart: "2026-08-25",
    cycleEnd: "2026-09-10",
    planFingerprint: plan(3121, "current"),
    requiredRunway: 3121,
    assumedSpent: 280,
  });

  assert.equal(refreshed.shouldPersist, true);
  assert.equal(refreshed.reason, "new_cycle_or_stale_baseline");
  assert.equal(refreshed.baseline.version, 5);
  assert.equal(refreshed.baseline.requiredRunway, 3401);
});

test("time and shrinking upcoming commitments cannot increase the score", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const before = calculateMeansScoreState({
    financialRunway: 20000,
    upcoming: 8000,
    requiredRunway: baseline.requiredRunway,
  });
  const later = calculateMeansScoreState({
    financialRunway: 20000,
    upcoming: 2000,
    requiredRunway: baseline.requiredRunway,
  });
  assert.equal(before.score, 200);
  assert.equal(later.score, 200);
});

test("actual money leaving financial capacity lowers the score against the same anchor", () => {
  const baseline = freshBaseline({ amount: 10000 });
  assert.equal(score({ financialRunway: 20000, baseline }), 200);
  assert.equal(score({ financialRunway: 18000, baseline }), 180);
  assert.equal(score({ financialRunway: 13000, baseline }), 130);
  assert.equal(score({ financialRunway: 9000, baseline }), 90);
});

test("actual money added increases the score against the same anchor", () => {
  const baseline = freshBaseline({ amount: 10000 });
  assert.equal(score({ financialRunway: 10000, baseline }), 100);
  assert.equal(score({ financialRunway: 12000, baseline }), 120);
});

test("unchanged cycle plan preserves the locked Means anchor", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const preserved = resolveMeansCycleBaselineState({
    stored: baseline,
    cycleStart: baseline.cycleStart,
    cycleEnd: baseline.cycleEnd,
    planFingerprint: baseline.planFingerprint,
    requiredRunway: 2000,
    assumedSpent: 5000,
  });
  assert.equal(preserved.shouldPersist, false);
  assert.equal(preserved.reason, "cycle_anchor_locked");
  assert.equal(preserved.baseline.requiredRunway, 10000);
});

test("same-cycle plan/context changes cannot move the fixed 100 anchor", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const preserved = resolveMeansCycleBaselineState({
    stored: baseline,
    cycleStart: baseline.cycleStart,
    cycleEnd: baseline.cycleEnd,
    planFingerprint: plan(12000, "changed"),
    requiredRunway: 12000,
    assumedSpent: 0,
  });
  assert.equal(preserved.shouldPersist, false);
  assert.equal(preserved.reason, "cycle_anchor_locked");
  assert.equal(preserved.baseline.requiredRunway, 10000);
});

test("a new pay cycle establishes a new Means anchor", () => {
  const baseline = freshBaseline({ amount: 10000 });
  const refreshed = resolveMeansCycleBaselineState({
    stored: baseline,
    cycleStart: "2026-09-10",
    cycleEnd: "2026-09-25",
    planFingerprint: plan(12000, "new-cycle"),
    requiredRunway: 12000,
    assumedSpent: 0,
  });
  assert.equal(refreshed.shouldPersist, true);
  assert.equal(refreshed.reason, "new_cycle_or_stale_baseline");
  assert.equal(refreshed.baseline.requiredRunway, 12000);
});

test("runtime/store wiring remains intact for financial context updates", async () => {
  const runtime = await readFile(new URL("../src/runtime/installClaraOrbGreeting.js", import.meta.url), "utf8");
  const scheduleRepository = await readFile(new URL("../src/lib/clara-money-schedule-repository.js", import.meta.url), "utf8");
  const schedulePanel = await readFile(
    new URL("../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanel.jsx", import.meta.url),
    "utf8"
  );

  assert.match(runtime, /clara:means-cycle-baseline:v5/);
  assert.doesNotMatch(runtime, /plannedDebtAlreadyPaid/);
  assert.match(runtime, /FINANCE_DATA_UPDATED_EVENT/);
  assert.match(runtime, /INCOME_HUB_UPDATED_EVENT/);
  assert.match(runtime, /DEBT_OBLIGATIONS_UPDATED_EVENT/);
  assert.match(runtime, /CLARA_MONEY_ROUTINE_UPDATED_EVENT/);
  assert.match(runtime, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
  assert.match(runtime, /"clara:schedule:create-event"/);
  assert.match(scheduleRepository, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
  assert.match(schedulePanel, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
});
