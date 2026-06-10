import test from "node:test";
import assert from "node:assert/strict";
import {
  getBudgetCycleRange,
  isExpenseInBudgetCycle,
  selectDashboardBudgetHeaders,
} from "../src/lib/clara-budget-cycle-authority.js";
import { buildDashboardMonthlyBudgetPlan } from "../src/lib/clara-budget-plan-calculator.js";
import { resetMonthlyBudgetCycle } from "../src/lib/clara-budget-cycle-reset.js";

const month = "2026-06";
const resetAt = "2026-06-10T04:00:00.000Z";

function header(overrides = {}) {
  return {
    id: "header-active",
    is_plan_header: true,
    plan_type: "monthly_budget",
    category: "__monthly_budget__",
    month,
    is_active: true,
    active: true,
    status: "active",
    is_complete: true,
    created_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

test("a draft reset marker is cycle authority but not an active plan", () => {
  const old = header({
    id: "old",
    status: "archived",
    is_active: false,
    active: false,
  });
  const reset = header({
    id: "reset",
    status: "draft",
    is_complete: false,
    reset_start_at: resetAt,
    reset_at: resetAt,
  });

  const result = selectDashboardBudgetHeaders({ budgets: [old, reset], currentMonthKey: month });
  assert.equal(result.budgetCycleHeader.id, "reset");
  assert.equal(result.monthlyBudgetHeader, null);
});

test("newest repeated reset wins and archived markers are ignored", () => {
  const first = header({
    id: "first-reset",
    status: "archived",
    is_complete: false,
    is_active: false,
    active: false,
    reset_start_at: "2026-06-10T03:00:00.000Z",
  });
  const second = header({
    id: "second-reset",
    status: "draft",
    is_complete: false,
    reset_start_at: resetAt,
  });

  const result = selectDashboardBudgetHeaders({ budgets: [first, second], currentMonthKey: month });
  assert.equal(result.budgetCycleHeader.id, "second-reset");
});

test("exact reset timestamps exclude same-day pre-reset records and include post-reset records", () => {
  const range = getBudgetCycleRange(
    header({ status: "draft", is_complete: false, reset_start_at: resetAt })
  );

  assert.equal(
    isExpenseInBudgetCycle({ created_at: "2026-06-10T03:59:59.999Z" }, range),
    false
  );
  assert.equal(
    isExpenseInBudgetCycle({ created_at: "2026-06-10T04:00:00.000Z" }, range),
    true
  );
  assert.equal(
    isExpenseInBudgetCycle({ created_at: "2026-06-10T12:30:00+08:00" }, range),
    true
  );
});

test("all budget metrics and documentation items use only active-cycle expenses", () => {
  const resetHeader = header({
    id: "reset",
    status: "draft",
    is_complete: false,
    reset_start_at: resetAt,
  });
  const expenses = [
    {
      id: "old-planned",
      amount: 320,
      planning_status: "planned",
      category: "Food",
      created_at: "2026-06-10T03:00:00.000Z",
    },
    {
      id: "old-unplanned",
      amount: 100,
      planning_status: "unplanned",
      category: "Unplanned Spending",
      created_at: "2026-06-10T03:30:00.000Z",
    },
    {
      id: "new-unplanned",
      amount: 500,
      planning_status: "unplanned",
      category: "Unplanned Spending",
      created_at: "2026-06-10T04:30:00.000Z",
    },
    {
      id: "new-undocumented",
      amount: 50,
      planning_status: "undocumented",
      category: "Undocumented Spending",
      created_at: "2026-06-10T05:00:00.000Z",
    },
  ];

  const plan = buildDashboardMonthlyBudgetPlan({
    budgetCycleHeader: resetHeader,
    monthlyBudgetHeader: null,
    declaredMonthlyBudgetAmount: 0,
    manualExpenseBudgetOptions: [],
    expenses,
  });

  assert.deepEqual(
    plan.activeCycleExpenses.map((expense) => expense.id),
    ["new-unplanned", "new-undocumented"]
  );
  assert.equal(plan.plannedSpent, 0);
  assert.equal(plan.unplannedSpent, 500);
  assert.equal(plan.undocumentedSpent, 50);
  assert.equal(plan.outsidePlanSpent, 550);
  assert.equal(plan.totalSpent, 550);
  assert.equal(plan.outsidePlanItems.length, 2);
  assert.equal(plan.categories.length, 0);
  assert.equal(plan.declaredBudget, 0);
  assert.equal(plan.progress, 0);
});

test("category totals exclude pre-reset transactions", () => {
  const resetHeader = header({
    id: "active-reset-cycle",
    reset_start_at: resetAt,
    declared_amount: 1000,
  });
  const foodBudget = {
    id: "food",
    title: "Food",
    allocated: 1000,
    budget: {
      id: "food",
      title: "Food",
      category: "Food",
      month,
      reset_start_at: resetAt,
      created_at: "2026-06-10T04:00:01.000Z",
    },
  };

  const plan = buildDashboardMonthlyBudgetPlan({
    budgetCycleHeader: resetHeader,
    monthlyBudgetHeader: resetHeader,
    declaredMonthlyBudgetAmount: 1000,
    manualExpenseBudgetOptions: [foodBudget],
    expenses: [
      {
        amount: 320,
        planning_status: "planned",
        category: "Food",
        created_at: "2026-06-10T03:00:00.000Z",
      },
      {
        amount: 200,
        planning_status: "planned",
        category: "Food",
        created_at: "2026-06-10T05:00:00.000Z",
      },
    ],
  });

  assert.equal(plan.categories[0].spent, 200);
  assert.equal(plan.plannedSpent, 200);
  assert.equal(plan.totalSpent, 200);
  assert.equal(plan.remaining, 800);
  assert.equal(plan.usedPercentage, 20);
});

test("reset persists the new marker before archiving old rows and preserves history", async () => {
  const calls = [];
  const oldHeader = header({ id: "old-header" });
  const oldCategory = {
    id: "old-food",
    month,
    category: "Food",
    is_active: true,
    active: true,
    status: "active",
  };

  const result = await resetMonthlyBudgetCycle({
    budgets: [oldHeader, oldCategory],
    headerPayload: header({
      id: undefined,
      status: "draft",
      is_complete: false,
      reset_start_at: resetAt,
    }),
    categoryPayloads: [],
    addBudget: async (payload) => {
      calls.push(["add", payload]);
      return { ...payload, id: "new-header" };
    },
    updateBudget: async (id, patch) => {
      calls.push(["update", id, patch]);
      return { id, ...patch };
    },
  });

  assert.equal(calls[0][0], "add");
  assert.equal(calls[1][0], "update");
  assert.equal(calls[1][1], "old-header");
  assert.equal(calls[2][1], "old-food");
  assert.equal(result.newHeader.id, "new-header");
  assert.deepEqual(result.archivedCategoryIds, ["old-food"]);
});

test("a failed marker insert does not archive the current budget", async () => {
  const updates = [];
  await assert.rejects(
    resetMonthlyBudgetCycle({
      budgets: [header({ id: "old-header" })],
      headerPayload: header({ status: "draft", is_complete: false }),
      addBudget: async () => {
        throw new Error("insert failed");
      },
      updateBudget: async (...args) => {
        updates.push(args);
      },
    }),
    /insert failed/
  );
  assert.equal(updates.length, 0);
});
