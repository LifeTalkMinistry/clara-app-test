import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolveAdaptiveMeansBaselineState } from "../src/lib/clara-means-cycle-baseline.js";

function firstCycleState(actualPaid = 0) {
  return resolveAdaptiveMeansBaselineState({
    cycleStart: "2026-08-25",
    cycleEnd: "2026-09-10",
    today: "2026-08-29",
    occurrences: [
      {
        id: "debt:sample:2026-08-29",
        requirementKey: "debt:sample:2026-08-29",
        kind: "debt",
        sourceType: "debt",
        date: "2026-08-29",
        amount: 1000,
        actualPaid,
      },
    ],
  });
}

test("actual debt payment cannot resize the Cycle 100 Anchor", () => {
  const original = firstCycleState(0);
  assert.equal(original.cycle100Anchor, 1000);

  const partial = resolveAdaptiveMeansBaselineState({
    stored: original.baseline,
    cycleStart: "2026-08-25",
    cycleEnd: "2026-09-10",
    today: "2026-08-29",
    occurrences: [
      {
        id: "debt:sample:2026-08-29",
        requirementKey: "debt:sample:2026-08-29",
        kind: "debt",
        sourceType: "debt",
        date: "2026-08-29",
        amount: 1000,
        actualPaid: 400,
      },
    ],
  });

  assert.equal(partial.cycle100Anchor, 1000);
  assert.equal(partial.remainingPlannedSpending, 600);
});

test("overpayment cannot make Remaining Planned Spending negative or expand the anchor", () => {
  const original = firstCycleState(0);
  const overpaid = resolveAdaptiveMeansBaselineState({
    stored: original.baseline,
    cycleStart: "2026-08-25",
    cycleEnd: "2026-09-10",
    today: "2026-08-29",
    occurrences: [
      {
        id: "debt:sample:2026-08-29",
        requirementKey: "debt:sample:2026-08-29",
        kind: "debt",
        sourceType: "debt",
        date: "2026-08-29",
        amount: 1000,
        actualPaid: 1400,
      },
    ],
  });

  assert.equal(overpaid.cycle100Anchor, 1000);
  assert.equal(overpaid.remainingPlannedSpending, 0);
});

test("current authority contains no future-actual or overdue-carry anchor builder", async () => {
  const authority = await readFile(new URL("../src/lib/clara-means-authority.js", import.meta.url), "utf8");
  assert.doesNotMatch(authority, /currentCycleFutureDebtActual/);
  assert.doesNotMatch(authority, /confirmedCarriedDebt/);
});
