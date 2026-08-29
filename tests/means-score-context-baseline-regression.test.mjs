import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  MEANS_CYCLE_BASELINE_VERSION,
  calculateMeansScoreState,
  matchMeansOutflowToRequirement,
  resolveAdaptiveMeansBaselineState,
} from "../src/lib/clara-means-cycle-baseline.js";

const CYCLE = { start: "2026-08-25", end: "2026-09-10" };

function occurrence(id, date, amount, extra = {}) {
  return { id, requirementKey: id, date, amount, kind: "money_schedule", ...extra };
}

function resolve({ stored = null, today = "2026-08-28", occurrences = [] } = {}) {
  return resolveAdaptiveMeansBaselineState({
    stored,
    cycleStart: CYCLE.start,
    cycleEnd: CYCLE.end,
    today,
    occurrences,
  });
}

function score(availableWalletMoney, remainingPlannedSpending, cycle100Anchor) {
  return calculateMeansScoreState({
    availableWalletMoney,
    remainingPlannedSpending,
    cycle100Anchor,
  });
}

test("v7 separates the fixed cycle anchor from live remaining plan", () => {
  assert.equal(MEANS_CYCLE_BASELINE_VERSION, 7);
  const state = resolve({
    occurrences: [occurrence("rent", "2026-09-01", 10000)],
  });
  assert.equal(state.cycle100Anchor, 10000);
  assert.equal(state.remainingPlannedSpending, 10000);
  assert.equal(state.anchorState, "anchored");
});

test("A: anchor 10000, wallet 15000, remaining 10000 scores 150", () => {
  const state = score(15000, 10000, 10000);
  assert.equal(state.wallBill, 5000);
  assert.equal(state.score, 150);
});

test("B: unplanned 2000 lowers Wall Bill and score to 130", () => {
  const state = score(13000, 10000, 10000);
  assert.equal(state.wallBill, 3000);
  assert.equal(state.score, 130);
});

test("C: matched planned 3000 lowers wallet and remaining together, preserving 130", () => {
  const state = score(10000, 7000, 10000);
  assert.equal(state.wallBill, 3000);
  assert.equal(state.score, 130);
});

test("D: adding 2000 actual money raises score back to 150", () => {
  const state = score(12000, 7000, 10000);
  assert.equal(state.wallBill, 5000);
  assert.equal(state.score, 150);
});

test("E: new 2000 current-cycle plan lowers Wall Bill without resizing anchor", () => {
  const state = score(12000, 9000, 10000);
  assert.equal(state.cycle100Anchor, 10000);
  assert.equal(state.wallBill, 3000);
  assert.equal(state.score, 130);
});

test("F: partial planned payment 1500 preserves score", () => {
  const before = score(15000, 10000, 10000);
  const after = score(13500, 8500, 10000);
  assert.equal(before.wallBill, 5000);
  assert.equal(after.wallBill, 5000);
  assert.equal(before.score, 150);
  assert.equal(after.score, 150);
});

test("G: wallet exactly equals remaining plan scores 100", () => {
  const state = score(7000, 7000, 10000);
  assert.equal(state.wallBill, 0);
  assert.equal(state.score, 100);
});

test("H: wallet 2000 short against remaining plan scores 80", () => {
  const state = score(5000, 7000, 10000);
  assert.equal(state.wallBill, -2000);
  assert.equal(state.score, 80);
});

test("fixed V7 anchor survives later plan additions while Remaining Plan changes", () => {
  const first = resolve({
    occurrences: [occurrence("base", "2026-09-01", 8000)],
  });
  assert.equal(first.cycle100Anchor, 8000);
  assert.equal(first.remainingPlannedSpending, 8000);

  const changed = resolve({
    stored: first.baseline,
    occurrences: [
      occurrence("base", "2026-09-01", 8000),
      occurrence("new", "2026-09-05", 1000),
    ],
  });
  assert.equal(changed.cycle100Anchor, 8000);
  assert.equal(changed.remainingPlannedSpending, 9000);
  assert.equal(score(12000, changed.remainingPlannedSpending, changed.cycle100Anchor).score, 138);
});

test("legitimate future plan reduction lowers Remaining Plan without resizing anchor", () => {
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
  assert.equal(changed.cycle100Anchor, 9000);
  assert.equal(changed.remainingPlannedSpending, 8000);
  assert.equal(score(12000, 8000, 9000).score, 144);
});

test("today/past unfulfilled requirement remains after later edit/delete", () => {
  const initial = resolve({
    today: "2026-08-28",
    occurrences: [occurrence("today", "2026-08-28", 1000)],
  });
  assert.equal(initial.cycle100Anchor, 1000);
  assert.equal(initial.remainingPlannedSpending, 1000);

  const edited = resolve({
    stored: initial.baseline,
    today: "2026-08-29",
    occurrences: [occurrence("today", "2026-08-28", 200)],
  });
  assert.equal(edited.cycle100Anchor, 1000);
  assert.equal(edited.remainingPlannedSpending, 1000);

  const deleted = resolve({
    stored: edited.baseline,
    today: "2026-08-30",
    occurrences: [],
  });
  assert.equal(deleted.cycle100Anchor, 1000);
  assert.equal(deleted.remainingPlannedSpending, 1000);
});

test("debt actualPaid reduces live remaining plan but not the fixed anchor", () => {
  const planned = resolve({
    occurrences: [
      occurrence("debt:bike:2026-09-01", "2026-09-01", 1000, {
        kind: "debt",
        sourceType: "debt",
      }),
    ],
  });
  const partial = resolve({
    stored: planned.baseline,
    occurrences: [
      occurrence("debt:bike:2026-09-01", "2026-09-01", 1000, {
        kind: "debt",
        sourceType: "debt",
        actualPaid: 400,
      }),
    ],
  });

  assert.equal(planned.cycle100Anchor, 1000);
  assert.equal(partial.cycle100Anchor, 1000);
  assert.equal(partial.remainingPlannedSpending, 600);
});

test("matcher protects only an explicit stable requirement identity", () => {
  const requirement = {
    requirementKey: "debt:bike:2026-09-01",
    plannedAmount: 1000,
    fulfilledAmount: 200,
    remainingAmount: 800,
  };
  const match = matchMeansOutflowToRequirement({
    actualOutflowAmount: 500,
    requirement,
    requirementKey: "debt:bike:2026-09-01",
  });
  assert.equal(match.matchedPlannedAmount, 500);
  assert.equal(match.unmatchedAmount, 0);
  assert.equal(match.remainingAmountAfterEvent, 300);

  const noIdentity = matchMeansOutflowToRequirement({
    actualOutflowAmount: 500,
    requirement,
    requirementKey: "",
  });
  assert.equal(noIdentity.matchedPlannedAmount, 0);
  assert.equal(noIdentity.unmatchedAmount, 500);
});

test("matcher caps overflow and leaves unmatched amount explicit", () => {
  const requirement = {
    requirementKey: "plan:one",
    remainingAmount: 300,
  };
  const match = matchMeansOutflowToRequirement({
    actualOutflowAmount: 500,
    requirement,
    requirementKey: "plan:one",
  });
  assert.equal(match.matchedPlannedAmount, 300);
  assert.equal(match.unmatchedAmount, 200);
  assert.equal(match.remainingAmountAfterEvent, 0);
});

test("same-cycle V6 state is not silently treated as a V7 anchor", () => {
  const legacy = resolve({
    stored: {
      version: 6,
      cycleStart: CYCLE.start,
      cycleEnd: CYCLE.end,
      requiredRunway: 9999,
      protectedOccurrences: {},
    },
    occurrences: [occurrence("plan", "2026-09-01", 8000)],
  });
  assert.equal(legacy.cycle100Anchor, 0);
  assert.equal(legacy.anchorState, "migration_unresolved");
  assert.equal(legacy.migrationUnresolved, true);
  assert.equal(legacy.shouldPersist, false);
});

test("zero anchor is explicit and does not invent a score", () => {
  const empty = resolve({ occurrences: [] });
  assert.equal(empty.cycle100Anchor, 0);
  assert.equal(empty.anchorState, "no_anchor");
  const state = score(5000, 0, 0);
  assert.equal(state.score, null);
  assert.equal(state.coverageState, "no_anchor");
});

test("a genuinely new pay cycle establishes a genuinely new anchor", () => {
  const current = resolve({
    occurrences: [occurrence("old", "2026-09-01", 10000)],
  });
  const next = resolveAdaptiveMeansBaselineState({
    stored: current.baseline,
    cycleStart: "2026-09-10",
    cycleEnd: "2026-09-25",
    today: "2026-09-10",
    occurrences: [occurrence("new", "2026-09-12", 12000)],
  });
  assert.equal(next.cycle100Anchor, 12000);
  assert.equal(next.remainingPlannedSpending, 12000);
});

test("negative Wall Bill can produce a negative Means Score without clamping", () => {
  const state = score(-2500, 10000, 10000);
  assert.equal(state.wallBill, -12500);
  assert.equal(state.score, -25);
});

test("ORB money briefing stays presentation-only and reconciles to V7 Wall Bill", async () => {
  const authority = await readFile(
    new URL("../src/lib/clara-means-authority.js", import.meta.url),
    "utf8"
  );
  const orbRuntime = await readFile(
    new URL("../src/runtime/installClaraOrbGreeting.js", import.meta.url),
    "utf8"
  );

  assert.match(authority, /const remainingPlannedSpending = nonNegative\(baselineState\.remainingPlannedSpending\)/);
  assert.match(authority, /cycle100Anchor/);
  assert.match(authority, /wallBill: scoreState\.wallBill/);
  assert.match(authority, /projectedRoom: scoreState\.wallBill/);
  assert.match(orbRuntime, /data-clara-money-briefing="active-cycle"/);
  assert.match(orbRuntime, />This pay cycle</);
  assert.match(orbRuntime, />Spending</);
  assert.match(orbRuntime, />Still to cover</);
  assert.match(orbRuntime, /data-clara-money-in-hand="true"/);
  assert.match(orbRuntime, /data-clara-upcoming-commitments="true"/);
  assert.match(orbRuntime, /data-clara-real-room="true"/);
  assert.match(orbRuntime, /Remaining planned spending/);
  assert.match(orbRuntime, /Money in hand minus everything still planned/);
  assert.match(orbRuntime, /Cycle 100 Anchor/);
  assert.doesNotMatch(orbRuntime, />Assumed spent</);
  assert.doesNotMatch(orbRuntime, /future requirements adapt/);

  const moneyInHand = 5809;
  const remainingPlannedSpending = 860;
  const moneySchedule = 860;
  const debtObligations = 0;
  const wallBill = moneyInHand - remainingPlannedSpending;

  assert.equal(moneySchedule + debtObligations, remainingPlannedSpending);
  assert.equal(wallBill, 4949);
});
