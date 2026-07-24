import test from "node:test";
import assert from "node:assert/strict";
import {
  DERIVED_BUDGET_MODE,
  buildDerivedHeaderPayload,
  getCycleWindow,
  isDateInsideCycle,
  isDebtCommitment,
  summarizeBudgetRows,
} from "../src/lib/clara-derived-budget.js";

test("derived total counts regular, protected and debt exactly once", () => {
  const rows = [
    { title: "Food", amount: 4000 },
    { title: "Rent", amount: 6000 },
    {
      title: "Home Credit",
      amount: 2500,
      is_commitment: true,
      commitment_type: "debt",
      source_debt_id: "debt-1",
    },
  ];
  const summary = summarizeBudgetRows(rows, 1000);
  assert.equal(summary.regularTotal, 10000);
  assert.equal(summary.debtTotal, 2500);
  assert.equal(summary.protectedTotal, 1000);
  assert.equal(summary.calculatedTotal, 13500);
  assert.equal(summary.debtItems.length, 1);
  assert.equal(isDebtCommitment(rows[2]), true);
});

test("monthly budget starts on the selected day instead of the first of the calendar month", () => {
  const cycle = getCycleWindow("monthly", "2026-07-24", "");
  assert.equal(cycle.start, "2026-07-24");
  assert.equal(cycle.end, "2026-08-23");
  assert.equal(isDateInsideCycle("2026-07-23", cycle), false);
  assert.equal(isDateInsideCycle("2026-07-24", cycle), true);
  assert.equal(isDateInsideCycle("2026-08-23", cycle), true);
  assert.equal(isDateInsideCycle("2026-08-24", cycle), false);
});

test("derived header caches the calculated total and rolling monthly period", () => {
  const cycle = getCycleWindow("monthly", "2026-07-24", "");
  const header = buildDerivedHeaderPayload({ total: 18500, cycle, done: true, user: { id: "1", email: "a@b.com" } });
  assert.equal(header.budget_total_mode, DERIVED_BUDGET_MODE);
  assert.equal(header.declared_amount, 18500);
  assert.equal(header.total_budget, 18500);
  assert.equal(header.status, "active");
  assert.equal(header.cycle_start, "2026-07-24");
  assert.equal(header.cycle_end, "2026-08-23");
});

test("due date check uses the selected budget period", () => {
  const cycle = getCycleWindow("custom", "2026-07-01", "2026-07-31");
  assert.equal(isDateInsideCycle("2026-07-18", cycle), true);
  assert.equal(isDateInsideCycle("2026-08-18", cycle), false);
});
