import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const budgetCard = readFileSync(
  new URL("../src/components/BudgetCard.jsx", import.meta.url),
  "utf8",
);

test("Complete Budget participates in expanded Budget layout instead of absolute positioning", () => {
  assert.match(budgetCard, /data-budget-completion-footer="true"/);
  assert.match(budgetCard, /className="flex shrink-0 justify-center px-4 pb-4 pt-2"/);
  assert.match(budgetCard, /max-w-\[252px\]/);
  assert.match(budgetCard, /rounded-\[18px\]/);
  assert.match(budgetCard, /bg-\[linear-gradient\(135deg/);
  assert.match(budgetCard, /<div className="flex h-full min-h-0 flex-col">/);
  assert.match(budgetCard, /<div className="min-h-0 flex-1">\{budgetContent\}<\/div>/);
  assert.doesNotMatch(budgetCard, /absolute right-6 top-6/);
  assert.doesNotMatch(budgetCard, /position:\s*absolute/);
  assert.doesNotMatch(budgetCard, /data-budget-completion-footer="true"[\s\S]*?z-\d+/);
});
