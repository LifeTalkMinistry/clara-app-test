import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/pages/MonthlyBudgetPlan.jsx", import.meta.url),
  "utf8",
);

test("fully paid debt commitments render as completed history instead of editable full-price rows", () => {
  assert.match(source, /function isFulfilledDebtRow/);
  assert.match(source, /already expensed this cycle/);
  assert.match(source, />Paid</);
  assert.match(source, /remaining to pay/);
  assert.match(source, /already paid in full and expensed for this cycle/);
  assert.match(source, /stays in this cycle as completed history/);
});
