import assert from "node:assert/strict";
import test from "node:test";

import {
  MEANS_CYCLE_BASELINE_VERSION,
  calculateMeansScoreState,
  resolveAdaptiveMeansBaselineState,
} from "../src/lib/clara-means-cycle-baseline.js";

const CYCLE = { start: "2026-08-25", end: "2026-09-10" };

function occurrence(id, date, amount, extra = {}) {
  return { id, date, amount, kind: "money_schedule", ...extra };
}

function resolve({ stored = null, today = "2026-08-28", occurrences = [], extra = 0, carry = 0 } = {}) {
  return resolveAdaptiveMeansBaselineState({
    stored,
    cycleStart: CYCLE.start,
    cycleEnd: CYCLE.end,
    today,
    occurrences,
    extraCurrentCycleActual: extra,
    carriedObligations: carry,
  });
}

function score(effectiveCurrentMoney, requiredRunway) {
  return calculateMeansScoreState({ effectiveCurrentMoney, requiredRunway }).score;
}

test("v6 remains the adaptive protected baseline schema", () => {
  assert.equal(MEANS_CYCLE_BASELINE_VERSION, 6);
});

test("incomplete setup does not freeze 100 before financial context exists", () => {
  const empty = resolve({ occurrences: [] });
  assert.equal(empty.requiredRunway, 0);

  const withContext = resolve({
    stored: empty.baseline,
    occurrences: [occurrence("future-plan", "2026-09-01", 8000)],
  });
  assert.equal(withContext.requiredRunway, 8000);
  assert.equal(score(12000, withContext.requiredRunway), 150);
});

test("adding a future requirement immediately lowers the Means Score", () => {
  const first = resolve({
    occurrences: [occurrence("base", "2026-09-01", 8000)],
  });
  assert.equal(score(12000, first.requiredRunway), 150);

  const changed = resolve({
    stored: first.baseline,
    occurrences: [
      occurrence("base", "2026-09-01", 8000),
      occurrence("new", "2026-09-05", 1000),
    ],
  });
  assert.equal(changed.requiredRunway, 9000);
  assert.equal(score(12000, changed.requiredRunway), 133);
});

test("deleting a future requirement immediately raises the Means Score", () => {
  const first = resolve({
    occurrences: [
      occurrence("base", "2026-09-01", 8000),
      occurrence("future", "2026-09-05", 1000),
    ],
  });
  const changed = resolve({
    stored: first.baseline,
    occurrences: [occurrence("base", "2026-09-01", 8000)],
  });
  assert.equal(changed.requiredRunway, 8000);
  assert.equal(score(12000, changed.requiredRunway), 150);
});

test("today and past requirements are protected against later edit or delete", () => {
  const initial = resolve({
    today: "2026-08-28",
    occurrences: [occurrence("today", "2026-08-28", 1000)],
  });
  assert.equal(initial.requiredRunway, 1000);

  const edited = resolve({
    stored: initial.baseline,
    today: "2026-08-29",
    occurrences: [occurrence("today", "2026-08-28", 200)],
  });
  assert.equal(edited.requiredRunway, 1000);

  const deleted = resolve({
    stored: edited.baseline,
    today: "2026-08-30",
    occurrences: [],
  });
  assert.equal(deleted.requiredRunway, 1000);
});

test("planned debt payment never shrinks or expands its protected baseline contribution", () => {
  const planned = resolve({
    occurrences: [occurrence("debt:bike:2026-08-28", "2026-08-28", 1000, { kind: "debt" })],
  });
  const partial = resolve({
    stored: planned.baseline,
    occurrences: [
      occurrence("debt:bike:2026-08-28", "2026-08-28", 1000, {
        kind: "debt",
        actualPaid: 400,
      }),
    ],
  });
  const overpaid = resolve({
    stored: partial.baseline,
    occurrences: [
      occurrence("debt:bike:2026-08-28", "2026-08-28", 1000, {
        kind: "debt",
        actualPaid: 1400,
      }),
    ],
  });

  assert.equal(planned.requiredRunway, 1000);
  assert.equal(partial.requiredRunway, 1000);
  assert.equal(overpaid.requiredRunway, 1000);
  assert.equal(score(12000, planned.requiredRunway), 1200);
  assert.equal(score(10600, overpaid.requiredRunway), 1060);
});

test("future-cycle actual payments and overdue carry cannot enter the current 100", () => {
  const state = resolve({
    occurrences: [occurrence("plan", "2026-09-01", 8000)],
    extra: 750,
    carry: 500,
  });
  assert.equal(state.requiredRunway, 8000);
  assert.equal(state.extraCurrentCycleActual, 750);
  assert.equal(state.carriedObligations, 500);
  assert.equal(state.ignoredNonPlanBaselineInputs, 1250);
});

test("negative effective current money produces a negative Means Score", () => {
  const result = calculateMeansScoreState({
    effectiveCurrentMoney: -1000,
    requiredRunway: 10000,
  });
  assert.equal(result.score, -10);
  assert.equal(result.effectiveCurrentMoney, -1000);
  assert.equal(result.scoreRoom, -11000);
});

test("a genuinely new pay cycle does not inherit the prior cycle protected map", () => {
  const current = resolve({
    occurrences: [occurrence("old", "2026-08-28", 10000)],
  });
  const next = resolveAdaptiveMeansBaselineState({
    stored: current.baseline,
    cycleStart: "2026-09-10",
    cycleEnd: "2026-09-25",
    today: "2026-09-10",
    occurrences: [occurrence("new", "2026-09-12", 12000)],
  });
  assert.equal(next.requiredRunway, 12000);
  assert.deepEqual(next.protectedOccurrences, {});
});

test("obsolete v1-v5 scalar locks are ignored instead of leaking into v6", () => {
  const state = resolve({
    stored: {
      version: 5,
      cycleStart: CYCLE.start,
      cycleEnd: CYCLE.end,
      requiredRunway: 99999,
      assumedSpentAtLock: 5000,
    },
    occurrences: [occurrence("current-plan", "2026-09-01", 8000)],
  });
  assert.equal(state.requiredRunway, 8000);
  assert.equal(state.baseline.version, 6);
});
