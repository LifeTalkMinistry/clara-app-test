import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildBudgetExpenseBaselineKeys,
  isExpenseFreshForBudget,
  seedFreshBudgetExpenseScope,
} from "../src/lib/budgetExpenseIsolation.js";

const activeHeader = {
  id: "budget-1",
  is_plan_header: true,
  budget_total_mode: "derived_from_items",
  status: "active",
  is_complete: true,
  setup_draft_id: "budget-session-1",
};

test("a fresh budget isolates every expense that already existed when the budget started", () => {
  const priorExpense = {
    id: "expense-before-budget",
    amount: 200,
    planning_status: "unplanned",
    created_at: "2026-07-24T01:00:00.000Z",
  };
  const laterExpense = {
    id: "expense-after-budget",
    amount: 200,
    planning_status: "unplanned",
    created_at: "2026-07-24T01:00:00.000Z",
  };

  const seededHeader = seedFreshBudgetExpenseScope(activeHeader, [priorExpense]);

  assert.equal(seededHeader.budget_expense_scope_initialized, true);
  assert.deepEqual(
    seededHeader.budget_baseline_expense_keys,
    buildBudgetExpenseBaselineKeys([priorExpense]),
  );
  assert.equal(isExpenseFreshForBudget(priorExpense, seededHeader), false);
  assert.equal(isExpenseFreshForBudget(laterExpense, seededHeader), true);
});

test("expense isolation is based on baseline membership, not matching calendar date or clock time", () => {
  const before = { id: "old", amount: 50, date: "2026-07-24" };
  const after = { id: "new", amount: 50, date: "2026-07-24" };
  const seededHeader = seedFreshBudgetExpenseScope(activeHeader, [before]);

  assert.equal(isExpenseFreshForBudget(before, seededHeader), false);
  assert.equal(isExpenseFreshForBudget(after, seededHeader), true);
});

test("budget runtime filters the baseline before legacy cycle classification", () => {
  const planWrapper = readFileSync(
    new URL(
      "../src/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetPlan.js",
      import.meta.url,
    ),
    "utf8",
  );
  const repositoryWrapper = readFileSync(
    new URL("../src/lib/financeRepository.js", import.meta.url),
    "utf8",
  );

  assert.match(planWrapper, /budgetExpenseIsolationKey/);
  assert.match(planWrapper, /freshSessionExpenses/);
  assert.match(repositoryWrapper, /seedExpenseScope/);
  assert.match(repositoryWrapper, /One-time migration for an already-active budget/);
});
