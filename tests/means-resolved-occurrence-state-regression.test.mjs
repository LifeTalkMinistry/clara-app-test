import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { resolveAdaptiveMeansBaselineState } from "../src/lib/clara-means-cycle-baseline.js";
import {
  getDebtOccurrencePaidAmount,
  getPaidDebtOccurrenceDates,
  isDebtOccurrencePaid,
} from "../src/lib/debtOccurrenceState.js";

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

  assert.match(authority, /getDebtOccurrencePaidAmount/);
  assert.match(authority, /getDebtOccurrencePayments/);
  assert.match(authority, /isDebtOccurrencePaid/);
  assert.match(authority, /isDebtOccurrenceSkipped/);
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

test("legacy payment written to a future period is reconciled to the latest due occurrence at payment time", () => {
  const paidAt = "2026-09-26T02:00:00.000Z";
  const record = {
    id: "tithe-2",
    title: "2nd Cut off Tithes",
    recordKind: "debt_obligation",
    obligationMode: "recurring",
    monthlyPayment: 1500,
    dueDay: 25,
    status: "active",
    createdAt: "2026-08-01T00:00:00.000Z",
    paymentHistory: [
      {
        id: "legacy-payment",
        amount: 1500,
        dueDate: "2026-10-25",
        paidAt,
        source: "legacy_mark_paid",
      },
    ],
    paidOccurrences: ["2026-10-25"],
    lastPaidOccurrenceDate: "2026-10-25",
    lastPaidAt: paidAt,
  };

  assert.deepEqual(getPaidDebtOccurrenceDates(record), ["2026-09-25"]);
  assert.equal(isDebtOccurrencePaid(record, "2026-09-25", 1500), true);
  assert.equal(isDebtOccurrencePaid(record, "2026-10-25", 1500), false);
  assert.equal(getDebtOccurrencePaidAmount(record, "2026-09-25"), 1500);
  assert.equal(getDebtOccurrencePaidAmount(record, "2026-10-25"), 0);
});
