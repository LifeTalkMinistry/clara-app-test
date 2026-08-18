import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const budgetCard = readSource("src/components/BudgetCard.jsx");
const budgetContent = readSource(
  "src/components/financial-carousel/cards/budget/ui/BudgetCardContent.jsx",
);

test("active exhausted budgets expose completion independently of repository readiness", () => {
  assert.match(
    budgetCard,
    /const completionVisible = Boolean\(hasDeclaredBudget && hasActivePlan\)/,
  );
  assert.match(
    budgetCard,
    /const isExhausted = completionVisible && remaining <= 0/,
  );
  assert.match(budgetCard, /const completionAction = completionVisible \? \(/);
  assert.match(budgetCard, /Budget exhausted/);
  assert.match(budgetCard, /Complete budget/);
  assert.doesNotMatch(budgetCard, /expanded && canCompleteBudget \? \(/);
  assert.doesNotMatch(budgetCard, /absolute right-7 top-\[30px\]/);
});

test("completion action lives in the expanded budget flow before the details toggle", () => {
  assert.match(budgetContent, /completionAction = null/);
  assert.match(
    budgetContent,
    /\{completionAction\}\s*<ExpandButtonRow expanded=\{expanded\}/,
  );
});
