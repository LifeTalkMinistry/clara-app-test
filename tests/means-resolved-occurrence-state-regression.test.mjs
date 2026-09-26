import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { resolveAdaptiveMeansBaselineState } from "../src/lib/clara-means-cycle-baseline.js";

// User-declared Pay or Skip resolves the current debt occurrence without resizing Cycle 100.
const cycleStart = "2026-09-01";
const cycleEnd = "2026-10-01";

function occurrence({
  id = "debt:test:2026-09-10",
  date = "2026-09-10",
  amount = 1100,
  actualPaid = 0,
  waivedAmount = 0,
  kind = "debt",
} = {}) {
  return {
    id,
    requirementKey: id,
    sourceId: "test",
    sourceType: kind,
    kind,
    date,
    amount,
    actualPaid,
    waivedAmount,
  };
}

test("paid protected requirement stays resolved after its live source disappears", () => {
  const planned = resolveAdaptiveMeansBaselineState({
    cycleStart,
    cycleEnd,
    today: "2026-09-10",
    occurrences: [occurrence()],
  });
  assert.equal(planned.remainingPlannedSpending, 1100);
  assert.equal(planned.cycle100Anchor, 1100);

  const paid = resolveAdaptiveMeansBaselineState({
    stored: planned.baseline,
    cycleStart,
    cycleEnd,
    today: "2026-09-11",
    occurrences: [occurrence({ actualPaid: 1100 })],
  });
  assert.equal(paid.remainingPlannedSpending, 0);
  assert.equal(paid.cycle100Anchor, 1100);
  assert.equal(
    paid.baseline.protectedOccurrences["debt:test:2026-09-10"].fulfilledAmount,
    1100
  );

  const sourceRemoved = resolveAdaptiveMeansBaselineState({
    stored: paid.baseline,
    cycleStart,
    cycleEnd,
    today: "2026-09-12",
    occurrences: [],
  });
  assert.equal(sourceRemoved.cycle100Anchor, 1100);
  assert.equal(sourceRemoved.remainingPlannedSpending, 0);
  assert.equal(sourceRemoved.requirements[0].retainedAfterPlanMutation, true);
  assert.equal(sourceRemoved.requirements[0].remainingAmount, 0);
  assert.equal(sourceRemoved.requirements[0].actualPaid, 1100);
});

test("skipped protected requirement stays waived after its live source disappears", () => {
  const planned = resolveAdaptiveMeansBaselineState({
    cycleStart,
    cycleEnd,
    today: "2026-09-10",
    occurrences: [occurrence()],
  });

  const skipped = resolveAdaptiveMeansBaselineState({
    stored: planned.baseline,
    cycleStart,
    cycleEnd,
    today: "2026-09-11",
    occurrences: [occurrence({ waivedAmount: 1100 })],
  });
  assert.equal(skipped.remainingPlannedSpending, 0);
  assert.equal(skipped.cycle100Anchor, 1100);
  assert.equal(
    skipped.baseline.protectedOccurrences["debt:test:2026-09-10"].waivedAmount,
    1100
  );

  const sourceRemoved = resolveAdaptiveMeansBaselineState({
    stored: skipped.baseline,
    cycleStart,
    cycleEnd,
    today: "2026-09-12",
    occurrences: [],
  });
  assert.equal(sourceRemoved.cycle100Anchor, 1100);
  assert.equal(sourceRemoved.remainingPlannedSpending, 0);
  assert.equal(sourceRemoved.requirements[0].remainingAmount, 0);
  assert.equal(sourceRemoved.requirements[0].waivedAmount, 1100);
});

test("Means debt builder consumes canonical paid and skipped occurrence truth", async () => {
  const authority = await readFile(
    new URL("../src/lib/clara-means-authority.js", import.meta.url),
    "utf8"
  );

  assert.match(
    authority,
    /import \{ isDebtOccurrencePaid, isDebtOccurrenceSkipped \} from "@\/lib\/debtOccurrenceState";/
  );
  assert.match(authority, /isDebtOccurrencePaid\(record, dueDate, planned\)/);
  assert.match(authority, /isDebtOccurrenceSkipped\(record, dueDate\)/);
  assert.match(authority, /const actualPaid = cumulativeActualForOccurrence\(record, dueDate\)/);
  assert.match(authority, /const resolvedUnpaidRemainder =/);
  assert.match(authority, /waivedAmount: skipped \? planned : resolvedUnpaidRemainder/);
});

test("declared partial debt payment preserves actual paid truth while closing the cycle remainder", () => {
  const resolved = resolveAdaptiveMeansBaselineState({
    cycleStart,
    cycleEnd,
    today: "2026-09-10",
    occurrences: [occurrence({ amount: 1500, actualPaid: 1000, waivedAmount: 500 })],
  });

  assert.equal(resolved.cycle100Anchor, 1500);
  assert.equal(resolved.remainingPlannedSpending, 0);
  assert.equal(resolved.requirements[0].actualPaid, 1000);
  assert.equal(resolved.requirements[0].waivedAmount, 500);
  assert.equal(resolved.requirements[0].remainingAmount, 0);
});
