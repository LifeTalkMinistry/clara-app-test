import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
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

function score({ financialRunway, upcoming, baseline, realizedPlannedOffset = 0 }) {
  return calculateMeansScoreState({
    financialRunway,
    upcoming,
    requiredRunway: baseline.requiredRunway,
    assumedSpent: 0,
    assumedSpentAtLock: baseline.assumedSpentAtLock,
    realizedPlannedOffset,
  }).score;
}

test("incomplete setup does not freeze Means Score at 100", () => {
  const cycleStart = "2026-08-25";
  const cycleEnd = "2026-09-10";
  const emptyFingerprint = plan(0, "empty");
  const empty = freshBaseline({ amount: 0, cycleStart, cycleEnd, fingerprint: emptyFingerprint });
  assert.equal(score({ financialRunway: 12000, upcoming: 0, baseline: empty }), 100);

  const nextFingerprint = plan(8000);
  const refreshed = resolveMeansCycleBaselineState({
    stored: empty,
    cycleStart,
    cycleEnd,
    planFingerprint: nextFingerprint,
    requiredRunway: 8000,
    assumedSpent: 0,
  });

  assert.equal(refreshed.reason, "plan_changed");
  assert.equal(refreshed.baseline.requiredRunway, 8000);
  assert.equal(score({ financialRunway: 12000, upcoming: 8000, baseline: refreshed.baseline }), 150);
});

test("adding more authoritative context lowers the score immediately", () => {
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

test("deleting future context raises the score again", () => {
  const baseline9000 = freshBaseline({ amount: 9000 });
  const fingerprint8000 = plan(8000);
  const refreshed = resolveMeansCycleBaselineState({
    stored: baseline9000,
    cycleStart: baseline9000.cycleStart,
    cycleEnd: baseline9000.cycleEnd,
    planFingerprint: fingerprint8000,
    requiredRunway: 8000,
    assumedSpent: 0,
  });

  assert.equal(refreshed.baseline.requiredRunway, 8000);
  assert.equal(score({ financialRunway: 12000, upcoming: 8000, baseline: refreshed.baseline }), 150);
});

test("realizing an already-known planned payment keeps the baseline neutral", () => {
  const baseline = freshBaseline({ amount: 8000 });
  const preserved = resolveMeansCycleBaselineState({
    stored: baseline,
    cycleStart: baseline.cycleStart,
    cycleEnd: baseline.cycleEnd,
    planFingerprint: baseline.planFingerprint,
    requiredRunway: 8000,
    assumedSpent: 0,
  });

  assert.equal(preserved.shouldPersist, false);
  assert.equal(score({ financialRunway: 12000, upcoming: 8000, baseline }), 150);
  assert.equal(score({ financialRunway: 11000, upcoming: 7000, baseline: preserved.baseline }), 150);
});

test("an unplanned expense lowers Means Score", () => {
  const baseline = freshBaseline({ amount: 8000 });
  const before = score({ financialRunway: 12000, upcoming: 8000, baseline });
  const after = score({ financialRunway: 10000, upcoming: 8000, baseline });
  assert.equal(before, 150);
  assert.equal(after, 125);
  assert.ok(after < before);
});

test("a new pay cycle resets the baseline and stale v1 data cannot control v2", () => {
  const oldV1 = {
    version: 1,
    cycleStart: "2026-08-10",
    cycleEnd: "2026-08-25",
    requiredRunway: 3000,
    assumedSpentAtLock: 0,
    planFingerprint: plan(3000),
  };
  const nextFingerprint = plan(6000, "next-cycle");
  const next = resolveMeansCycleBaselineState({
    stored: oldV1,
    cycleStart: "2026-08-25",
    cycleEnd: "2026-09-10",
    planFingerprint: nextFingerprint,
    requiredRunway: 6000,
    assumedSpent: 0,
  });

  assert.equal(next.reason, "new_cycle_or_stale_baseline");
  assert.equal(next.baseline.requiredRunway, 6000);
  assert.equal(next.baseline.version, 2);
  assert.equal(score({ financialRunway: 12000, upcoming: 6000, baseline: next.baseline }), 200);
});

test("runtime/store wiring refreshes Means for all financial context sources", async () => {
  const runtime = await readFile(new URL("../src/runtime/installClaraOrbGreeting.js", import.meta.url), "utf8");
  const scheduleRepository = await readFile(new URL("../src/lib/clara-money-schedule-repository.js", import.meta.url), "utf8");
  const schedulePanel = await readFile(
    new URL("../src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanel.jsx", import.meta.url),
    "utf8"
  );

  assert.match(runtime, /clara:means-cycle-baseline:v2/);
  assert.match(runtime, /FINANCE_DATA_UPDATED_EVENT/);
  assert.match(runtime, /INCOME_HUB_UPDATED_EVENT/);
  assert.match(runtime, /DEBT_OBLIGATIONS_UPDATED_EVENT/);
  assert.match(runtime, /CLARA_MONEY_ROUTINE_UPDATED_EVENT/);
  assert.match(runtime, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
  assert.match(runtime, /"clara:schedule:create-event"/);
  assert.match(scheduleRepository, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
  assert.match(schedulePanel, /CLARA_MONEY_SCHEDULE_UPDATED_EVENT/);
});
