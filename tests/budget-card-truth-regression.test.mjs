import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const listItems = readSource("src/components/fresh/main-dashboard/budget/useDashboardManualExpenseBudgetListItems.js");
const dashboard = readSource("src/pages/Dashboard.jsx");
const actions = readSource("src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js");
const budgetLogic = readSource("src/components/financial-carousel/cards/budget/logic/useBudgetCardLogicCore.js");
const budgetEngine = readSource("src/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetPlanEngine.js");
const carouselCore = readSource("src/components/financial-carousel/logic/financeCarouselDataHelpersCore.js");
const formProgress = readSource("src/components/fresh/main-dashboard/budget/useDashboardBudgetFormProgress.js");

test("protected Manual Log selections use explicit selected-budget ownership", () => {
  assert.doesNotMatch(listItems, /installProtectedFindBridge|Object\.defineProperty\(options, "find"/);
  assert.match(dashboard, /manualExpenseBudgetOptions,\s*selectedManualExpenseBudget,\s*monthlyBudgetHeader/);
  assert.match(actions, /isUnplanned \|\| isUndocumented \? null : selectedManualExpenseBudget/);
  assert.match(actions, /budget_category_id: selectedBudgetId \|\| null/);
  assert.match(actions, /budget_list_key: selectedBudgetKey \|\| null/);
  assert.match(actions, /linked_target_type: selectedProtectionType \|\| null/);
});

test("Budget remaining has one actual-spending formula", () => {
  assert.match(budgetEngine, /Math\.max\(declared - spent, 0\)/);
  assert.doesNotMatch(budgetEngine, /declared - spent - protectedCommitmentsTotal/);
  assert.match(carouselCore, /Math\.max\(declaredBudget - spentAmount, 0\)/);
  assert.doesNotMatch(carouselCore, /declaredBudget - spentAmount - protectedCommitmentsAmount/);
  assert.doesNotMatch(budgetLogic, /derivedMode|protectedReserved/);
  assert.match(actions, /const headerRemaining = Math\.max\(declared, 0\)/);
});

test("Budget completion compares currency units instead of floating point amounts", () => {
  assert.match(formProgress, /const declaredUnits = Math\.round\(budgetFormDeclaredAmount \* 100\)/);
  assert.match(formProgress, /coveredUnits === declaredUnits/);
  assert.match(actions, /const projectedAllocatedUnits = Math\.round\(projectedAllocated \* 100\)/);
  assert.match(actions, /projectedAllocatedUnits !== declaredUnits/);
  assert.doesNotMatch(actions, /projectedAllocated !== declaredAmount/);
});

test("Budget unallocated fallback does not force a missing value to zero", () => {
  assert.match(budgetLogic, /unallocatedAmount = undefined/);
  assert.match(budgetLogic, /const unallocatedSource = hasValue\(unallocatedAmount\)/);
});
