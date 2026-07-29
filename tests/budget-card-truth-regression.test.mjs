import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resetMonthlyBudgetCycle } from "../src/lib/clara-budget-cycle-reset.js";
import { normalizeCarouselBudgetPlan } from "../src/components/financial-carousel/logic/financeCarouselDataHelpersCore.js";

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

test("reset uses the exact reset time instead of the cycle start date", async () => {
  const createdRows = [];

  const result = await resetMonthlyBudgetCycle({
    budgets: [],
    headerPayload: {
      cycle_start: "2026-07-01",
      period_start: "2026-07-01",
      cycle_end: "2026-07-31",
      status: "draft",
    },
    categoryPayloads: [{ title: "Food", cycle_start: "2026-07-01" }],
    addBudget: async (payload) => {
      createdRows.push(payload);
      return payload;
    },
    updateBudget: async () => {},
  });

  const [header, category] = createdRows;
  assert.match(header.reset_start_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.notEqual(header.reset_start_at, header.cycle_start);
  assert.equal(header.tracking_started_at, header.reset_start_at);
  assert.equal(category.reset_start_at, header.reset_start_at);
  assert.equal(result.newHeader.reset_start_at, header.reset_start_at);
});

test("reset archives every live header and category so no legacy total survives", async () => {
  const updatedRows = [];
  const createdRows = [];
  const budgets = [
    {
      id: "newer-draft",
      is_plan_header: true,
      status: "draft",
      is_active: true,
      month: "2026-07",
      setup_draft_id: "draft-new",
    },
    {
      id: "legacy-active",
      is_plan_header: true,
      status: "active",
      is_active: true,
      month: "2026-07",
      declared_budget: 3002,
    },
    {
      id: "food-category",
      plan_type: "budget_category",
      status: "active",
      is_active: true,
      month: "2026-07",
      allocated_amount: 3002,
    },
    {
      id: "legacy-orphan-category",
      plan_type: "budget_category",
      status: "active",
      is_active: true,
      allocated_amount: 500,
    },
    {
      id: "already-archived",
      is_plan_header: true,
      status: "archived",
      is_active: false,
      month: "2026-07",
    },
  ];

  const result = await resetMonthlyBudgetCycle({
    budgets,
    headerPayload: {
      is_plan_header: true,
      plan_type: "monthly_budget",
      month: "2026-07",
      cycle_start: "2026-07-29",
      cycle_end: "2026-08-28",
      declared_budget: 0,
      status: "draft",
    },
    addBudget: async (payload) => {
      createdRows.push(payload);
      return { id: "fresh-header", ...payload };
    },
    updateBudget: async (id, patch) => {
      updatedRows.push({ id, patch });
      return { id, ...patch };
    },
  });

  assert.deepEqual(
    updatedRows.map((entry) => entry.id).sort(),
    ["food-category", "legacy-active", "legacy-orphan-category", "newer-draft"].sort(),
  );
  assert.ok(updatedRows.every((entry) => entry.patch.status === "archived"));
  assert.deepEqual(result.archivedHeaderIds.sort(), ["legacy-active", "newer-draft"].sort());
  assert.deepEqual(result.archivedCategoryIds.sort(), ["food-category", "legacy-orphan-category"].sort());
  assert.equal(createdRows[0].declared_budget, 0);
  assert.deepEqual(createdRows[0].reset_from_budget_ids.sort(), ["legacy-active", "newer-draft"].sort());
});

test("an inactive reset plan cannot leak old watch-zone totals into the budget card", () => {
  const normalized = normalizeCarouselBudgetPlan({
    hasActiveBudgetPlan: false,
    status: "no_plan",
    declared_budget: 0,
    spent: 4202,
    unplanned_spent: 4202,
    undocumented_spent: 800,
    unplanned_items: [{ id: "old-unplanned", amount: 4202 }],
    undocumented_items: [{ id: "old-undocumented", amount: 800 }],
    outside_plan_items: [{ id: "old-outside", amount: 5002 }],
    categories: [{ id: "old-category", title: "Old plan", allocated: 3000, spent: 3000 }],
  });

  assert.equal(normalized.declaredBudget, 0);
  assert.equal(normalized.spentAmount, 0);
  assert.equal(normalized.unplannedSpent, 0);
  assert.equal(normalized.undocumentedSpent, 0);
  assert.deepEqual(normalized.unplannedItems, []);
  assert.deepEqual(normalized.undocumentedItems, []);
  assert.deepEqual(normalized.outsidePlanItems, []);
  assert.deepEqual(normalized.budgetCategories, []);
});
