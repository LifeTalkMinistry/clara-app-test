import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  completeMonthlyBudgetCycle,
  resetMonthlyBudgetCycle,
} from "../src/lib/clara-budget-cycle-reset.js";
import {
  buildBudgetCompletionSnapshot,
  buildReusableBudgetDraft,
  getCompletedBudgetHistory,
} from "../src/lib/clara-budget-history.js";
import { normalizeCarouselBudgetPlan } from "../src/components/financial-carousel/logic/financeCarouselDataHelpersCore.js";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const listItems = readSource("src/components/fresh/main-dashboard/budget/useDashboardManualExpenseBudgetListItems.js");
const actions = readSource("src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlersCore.js");
const budgetLogic = readSource("src/components/financial-carousel/cards/budget/logic/useBudgetCardLogicCore.js");
const budgetEngine = readSource("src/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetPlanEngine.js");
const carouselCore = readSource("src/components/financial-carousel/logic/financeCarouselDataHelpersCore.js");
const formProgress = readSource("src/components/fresh/main-dashboard/budget/useDashboardBudgetFormProgress.js");
const budgetCard = readSource("src/components/BudgetCard.jsx");
const budgetCardView = readSource("src/components/financial-carousel/cards/budget/ui/BudgetCardView.jsx");
const carouselItemCard = readSource("src/components/financial-carousel/ui/CarouselItemCard.jsx");
const communityHomeFinancialCarousel = readSource("src/components/community/CommunityHomeFinancialCarousel.jsx");
const setupEmptyState = readSource("src/components/financial-carousel/shared/FinanceCardSetupEmptyState.jsx");

test("protected Manual Log selections use explicit selected-budget ownership", () => {
  assert.doesNotMatch(listItems, /installProtectedFindBridge|Object\.defineProperty\(options, "find"/);
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

test("completion preserves history, stores a snapshot, and closes the live plan", async () => {
  const updates = [];
  const budgets = [
    {
      id: "aug-header",
      is_plan_header: true,
      plan_type: "monthly_budget",
      status: "active",
      is_active: true,
      month: "2026-08",
      cycle_start: "2026-08-01",
      cycle_end: "2026-08-31",
      declared_budget: 10500,
    },
    {
      id: "food",
      plan_type: "budget_category",
      status: "active",
      is_active: true,
      month: "2026-08",
      cycle_start: "2026-08-01",
      allocated_amount: 6000,
    },
    {
      id: "transport",
      plan_type: "budget_category",
      status: "active",
      is_active: true,
      month: "2026-08",
      cycle_start: "2026-08-01",
      allocated_amount: 4500,
    },
    {
      id: "july-history",
      plan_type: "budget_category",
      status: "closed",
      is_active: false,
      month: "2026-07",
      cycle_start: "2026-07-01",
      cycle_end: "2026-07-31",
    },
  ];
  const completionSnapshot = buildBudgetCompletionSnapshot({
    header: budgets[0],
    categories: [
      { id: "food", title: "Food", allocated: 6000, spent: 5200 },
      { id: "transport", title: "Transport", allocated: 4500, spent: 4100 },
    ],
    declared: 10500,
    allocated: 10500,
    spent: 9300,
    remaining: 1200,
  });

  const result = await completeMonthlyBudgetCycle({
    budgets,
    headerHint: {
      month: "2026-08",
      cycle_start: "2026-08-01",
      cycle_end: "2026-08-31",
    },
    completionSnapshot,
    updateBudget: async (id, patch) => {
      updates.push({ id, patch });
      return { id, ...patch };
    },
  });

  assert.deepEqual(updates.map((entry) => entry.id), ["food", "transport", "aug-header"]);
  assert.ok(updates.every((entry) => entry.patch.status === "closed"));
  assert.ok(updates.every((entry) => entry.patch.completion_status === "completed"));
  assert.ok(updates.every((entry) => entry.patch.is_active === false));
  assert.ok(updates.every((entry) => entry.patch.active === false));
  assert.ok(updates.every((entry) => entry.patch.completed_at));
  assert.ok(updates.every((entry) => !("cycle_start" in entry.patch)));
  assert.ok(updates.every((entry) => !("cycle_end" in entry.patch)));
  assert.equal(result.completedHeaderId, "aug-header");
  assert.deepEqual(result.closedCategoryIds, ["food", "transport"]);
  assert.equal(updates.at(-1).patch.completion_snapshot.spent, 9300);
  assert.equal(updates.at(-1).patch.completion_snapshot.categories.length, 2);
  assert.equal(updates.at(-1).patch.completion_snapshot.completedAt, result.completedAt);
});

test("completion prefers the authoritative header ID and does not cross-complete a same-month plan", async () => {
  const updates = [];
  const budgets = [
    {
      id: "target-header",
      is_plan_header: true,
      plan_type: "monthly_budget",
      status: "active",
      is_active: true,
      month: "2026-08",
      setup_draft_id: "draft-target",
      cycle_start: "2026-08-01",
      updated_at: "2026-08-18T10:00:00.000Z",
    },
    {
      id: "other-header",
      is_plan_header: true,
      plan_type: "monthly_budget",
      status: "active",
      is_active: true,
      month: "2026-08",
      setup_draft_id: "draft-other",
      cycle_start: "2026-08-15",
      updated_at: "2026-08-19T10:00:00.000Z",
    },
    {
      id: "target-food",
      plan_type: "budget_category",
      status: "active",
      is_active: true,
      month: "2026-08",
      setup_draft_id: "draft-target",
      cycle_start: "2026-08-01",
    },
    {
      id: "other-food",
      plan_type: "budget_category",
      status: "active",
      is_active: true,
      month: "2026-08",
      setup_draft_id: "draft-other",
      cycle_start: "2026-08-15",
    },
  ];

  const result = await completeMonthlyBudgetCycle({
    budgets,
    headerHint: budgets[0],
    completionSnapshot: { version: 1, headerId: "target-header", spent: 3200 },
    updateBudget: async (id, patch) => {
      updates.push({ id, patch });
      return { id, ...patch };
    },
  });

  assert.equal(result.completedHeaderId, "target-header");
  assert.deepEqual(updates.map((entry) => entry.id), ["target-food", "target-header"]);
  assert.equal(updates.some((entry) => entry.id === "other-header"), false);
  assert.equal(updates.some((entry) => entry.id === "other-food"), false);
});

test("a stale authoritative header ID cannot silently fall back to another same-month budget", async () => {
  const updates = [];
  const budgets = [
    {
      id: "real-header",
      is_plan_header: true,
      plan_type: "monthly_budget",
      status: "active",
      is_active: true,
      month: "2026-08",
      cycle_start: "2026-08-01",
    },
  ];

  await assert.rejects(
    completeMonthlyBudgetCycle({
      budgets,
      headerHint: { id: "stale-header", month: "2026-08" },
      updateBudget: async (id, patch) => {
        updates.push({ id, patch });
      },
    }),
    /No active budget was found to complete/,
  );
  assert.deepEqual(updates, []);
});

test("legacy month-only declared-total budgets can still complete", async () => {
  const updates = [];
  const budgets = [
    {
      id: "legacy-header",
      is_plan_header: true,
      plan_type: "monthly_budget",
      status: "active",
      is_active: true,
      month: "2026-08",
      declared_budget: 3200,
    },
    {
      id: "legacy-food",
      plan_type: "budget_category",
      status: "active",
      is_active: true,
      month: "2026-08",
      allocated_amount: 3200,
    },
  ];

  const result = await completeMonthlyBudgetCycle({
    budgets,
    headerHint: { month: "2026-08" },
    completionSnapshot: { version: 1, declared: 3200, spent: 3200, remaining: 0 },
    updateBudget: async (id, patch) => {
      updates.push({ id, patch });
      return { id, ...patch };
    },
  });

  assert.equal(result.completedHeaderId, "legacy-header");
  assert.deepEqual(updates.map((entry) => entry.id), ["legacy-food", "legacy-header"]);
  assert.equal(updates.at(-1).patch.completion_snapshot.remaining, 0);
});

test("completed history can seed a fresh draft without reopening debts or stale protected targets", () => {
  const completedAt = "2026-08-19T01:00:00.000Z";
  const history = getCompletedBudgetHistory([
    {
      id: "aug-header",
      is_plan_header: true,
      plan_type: "monthly_budget",
      status: "closed",
      is_active: false,
      active: false,
      completion_status: "completed",
      completed_at: completedAt,
      completion_snapshot: {
        version: 1,
        title: "Monthly Spending Plan",
        cycleStart: "2026-08-01",
        cycleEnd: "2026-08-31",
        declared: 12000,
        spent: 9800,
        categories: [
          { key: "food", title: "Food", allocated: 5000, spent: 4200 },
          {
            key: "protected-emergency-fund",
            title: "Emergency Fund",
            allocated: 2000,
            spent: 1000,
            isProtectedCommitment: true,
            protectedType: "emergency_fund",
          },
          {
            key: "protected-savings-goal-live",
            title: "Laptop",
            allocated: 1500,
            isProtectedCommitment: true,
            protectedType: "savings_goal",
            sourceSavingsGoalId: "goal-live",
          },
          {
            key: "protected-savings-goal-old",
            title: "Old Goal",
            allocated: 500,
            isProtectedCommitment: true,
            protectedType: "savings_goal",
            sourceSavingsGoalId: "goal-old",
          },
          {
            key: "debt-loan-1",
            title: "Loan",
            allocated: 3000,
            isCommitment: true,
            commitmentType: "debt",
            sourceDebtId: "loan-1",
          },
        ],
      },
    },
  ]);

  assert.equal(history.length, 1);
  const reuse = buildReusableBudgetDraft(history[0], {
    savingsGoals: [
      { id: "goal-live", status: "active" },
      { id: "goal-old", status: "completed" },
    ],
    emergencyFund: { status: "active", target_amount: 10000 },
  });

  assert.equal(reuse.reusedItemCount, 1);
  assert.equal(reuse.reusedProtectedCount, 2);
  assert.equal(reuse.omittedDebtCount, 1);
  assert.equal(reuse.hasReusableStructure, true);
  assert.equal(reuse.draft.items[0].title, "Food");
  assert.equal(reuse.draft.items[0].amount, 5000);
  assert.equal(reuse.draft.includeEmergencyFund, true);
  assert.equal(reuse.draft.emergencyFundAmount, 2000);
  assert.deepEqual(reuse.draft.selectedSavingsGoalIds, ["goal-live"]);
  assert.equal(reuse.draft.savingsGoalAmounts["goal-live"], 1500);
  assert.deepEqual(reuse.draft.selectedDebtIds, []);
  assert.equal(reuse.draft.reusedFromBudgetId, "aug-header");
});

test("Budget card requests completion while Home owns persisted lifecycle authority", () => {
  assert.match(communityHomeFinancialCarousel, /completeMonthlyBudgetCycle/);
  assert.match(communityHomeFinancialCarousel, /buildBudgetCompletionSnapshot/);
  assert.match(communityHomeFinancialCarousel, /header: monthlyBudgetHeader/);
  assert.doesNotMatch(budgetCard, /completeMonthlyBudgetCycle/);
  assert.doesNotMatch(budgetCard, /buildBudgetCompletionSnapshot/);
  assert.match(budgetCard, /Weekly Money Check/);
  assert.match(budgetCard, /startWeeklyMoneyCheckSession/);
  assert.match(budgetCard, /saveWeeklyMoneyCheckWeekday/);
  assert.doesNotMatch(budgetCard, /data-budget-completion-action/);
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
