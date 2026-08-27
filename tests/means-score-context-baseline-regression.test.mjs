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

function score({ financialRunway, upcoming, baseline }) {
  return calculateMeansScoreState({
    financialRunway,
    upcoming,
    requiredRunway: baseline?.requiredRunway,
    assumedSpent: 0,
    assumedSpentAtLock: baseline?.assumedSpentAtLock,
  }).score;
}

test("remaining required runway is the live 100 line", () => {
  const requiredRunway = calculateCycleRequiredRunway({
    income: 15100,
    availableNow: 7388,
    upcoming: 3191,
  });

  assert.equal(requiredRunway, 3191);
  assert.equal(
    calculateMeansScoreState({ financialRunway: 3191, upcoming: 3191 }).score,
    100
  );

  const state = calculateMeansScoreState({
    financialRunway: 7388,
    upcoming: 3191,
  });

  assert.equal(state.scoreRoom, 4197);
  assert.equal(state.score, 232);
});

test("a legacy locked baseline cannot override the current remaining requirement", () => {
  const baseline = freshBaseline({ amount: 10903 });
  assert.equal(score({ financialRunway: 7388, upcoming: 3191, baseline }), 232);
});

test("adding more authoritative remaining context lowers the score immediately", () => {
  const baseline8000 = freshBaseline({ amount: 8000 });
  assert.equal(score({ financialRunway: 12000, upcoming: 8000, baseline: baseline8000 }), 150);

  const fingerprint9000 = plan(9000);
  const refreshed = resolveMeansCycleBaselineState({
    stored: baseline8000,
    cycleStart: baseline8000.cycleStart,
    cycleEnd: baseline8000.cycleEnd,
    planFingerprint: fingerprint9000,
    requiredRunway: 9000,
    assumedSpent: 0,
  });

  assert.equal(refreshed.baseline.requiredRunway, 9000);
  assert.equal(score({ financialRunway: 12000, upcoming: 9000, baseline: refreshed.baseline }), 133);
});

test("removing future requirements raises the score", () => {
  const baseline = freshBaseline({ amount: 9000 });
  assert.equal(score({ financialRunway: 12000, upcoming: 9000, baseline }), 133);
  assert.equal(score({ financialRunway: 12000, upcoming: 8000, baseline }), 150);
});

test("realizing a planned payment recalculates against what is still required", () => {
  const baseline = freshBaseline({ amount: 8000 });
  const before = score({ financialRunway: 12000, upcoming: 8000, baseline });
  const after = score({ financialRunway: 11000, upcoming: 7000, baseline });

  assert.equal(before, 150);
  assert.equal(after, 157);
  assert.ok(after > before);
});

test("an unplanned expense lowers Means Score when required runway is unchanged", () => {
  const baseline = freshBaseline({ amount: 8000 });
  const before = score({ financialRunway: 12000, upcoming: 8000, baseline });
  const after = score({ financialRunway: 10000, upcoming: 8000, baseline });
  assert.equal(before, 150);
  assert.equal(after, 125);
  assert.ok(after < before);
});

test("zero remaining requirement has a safe finite fallback", () => {
  assert.equal(calculateMeansScoreState({ financialRunway: 12000, upcoming: 0 }).score, 100);
  assert.equal(calculateMeansScoreState({ financialRunway: 0, upcoming: 0 }).score, 0);
});

test("stored baseline compatibility remains intact while no longer controlling the live score", () => {
  const oldV2 = {
    version: 2,
    cycleStart: "2026-08-10",
    cycleEnd: "2026-08-25",
    requiredRunway: 3000,
    assumedSpentAtLock: 0,
    planFingerprint: plan(3000),
  };
  const nextFingerprint = plan(6000, "next-cycle");
  const next = resolveMeansCycleBaselineState({
    stored: oldV2,
    cycleStart: "2026-08-25",
    cycleEnd: "2026-09-10",
    planFingerprint: nextFingerprint,
    requiredRunway: 6000,
    assumedSpent: 0,
  });

  assert.equal(next.reason, "new_cycle_or_stale_baseline");
  assert.equal(next.baseline.requiredRunway, 6000);
  assert.equal(next.baseline.version, 3);
  assert.equal(score({ financialRunway: 12000, upcoming: 6000, baseline: next.baseline }), 200);
});

test("runtime/store wiring refreshes Means for all financial context sources", async () => {
  const runtime = await readFile(new URL("../src/runtime/installClaraOrbGreeting.js", import.meta.url), "utf8");
  const scheduleRepository = await readFile(new URL("../src/lib/clara-money-schedule-repository.js", import.meta.url), "utf8");
  const schedulePanel = await readFile(
    new URL("../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanel.jsx", import.meta.url),
    "utf8"
  );

  assert.match(runtime, /clara:means-cycle-baseline:v3/);
  assert.match(runtime, /FINANCE_DATA_UPDATED_EVENT/);
  assert.match(runtime, /INCOME_HUB_UPDATED_EVENT/);
  assert.match(runtime, /DEBT_OBLIGATIONS_UPDATED_EVENT/);
  assert.match(runtime, /CLARA_MONEY_ROUTINE_UPDATED_EVENT/);
  assert.match(runtime, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
  assert.match(runtime, /"clara:schedule:create-event"/);
  assert.match(scheduleRepository, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
  assert.match(schedulePanel, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
});
