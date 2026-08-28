import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const budgetCard = readFileSync(
  new URL("../src/components/BudgetCard.jsx", import.meta.url),
  "utf8",
);

test("Complete Budget participates in expanded Budget layout instead of absolute positioning", () => {
  assert.match(budgetCard, /Weekly Money Check/);
  assert.match(budgetCard, /Choose your weekly check-in/);
  assert.match(budgetCard, /WeekdayPickerModal/);
  assert.doesNotMatch(budgetCard, /data-budget-completion-footer="true"/);
  assert.doesNotMatch(budgetCard, /data-budget-completion-action="true"/);
});
