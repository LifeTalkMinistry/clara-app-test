import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const planWrapper = readFileSync(
  new URL(
    "../src/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetPlan.js",
    import.meta.url,
  ),
  "utf8",
);
const planEngine = readFileSync(
  new URL(
    "../src/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetPlanEngine.js",
    import.meta.url,
  ),
  "utf8",
);
const financeRepository = readFileSync(
  new URL("../src/lib/financeRepository.js", import.meta.url),
  "utf8",
);
const financeActions = readFileSync(
  new URL(
    "../src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js",
    import.meta.url,
  ),
  "utf8",
);

test("budget runtime keeps the full expense list and lets the cycle boundary decide eligibility", () => {
  assert.doesNotMatch(planWrapper, /budgetExpenseIsolationKey/);
  assert.doesNotMatch(planWrapper, /readBudgetExpenseBaselineKeys/);
  assert.doesNotMatch(planWrapper, /freshSessionExpenses/);
  assert.match(planWrapper, /useDashboardMonthlyBudgetPlanCore\(options\)/);
});

test("budget repository reads and edits do not create a new expense baseline", () => {
  assert.doesNotMatch(financeRepository, /seedFreshBudgetExpenseScope/);
  assert.doesNotMatch(financeRepository, /seedExpenseScope/);
  assert.doesNotMatch(financeRepository, /budget_baseline_expense_keys/);
  assert.match(financeRepository, /decorateFinanceRepository/);
});

test("the budget engine counts planned, unplanned, and undocumented spending from the active cycle", () => {
  assert.match(
    planEngine,
    /source\?\.reset_start_at\s*\|\|\s*source\?\.tracking_started_at\s*\|\|\s*source\?\.tracking_start_date/,
  );
  assert.match(
    planEngine,
    /const activeExpenses = allExpenses\.filter\(\(expense\) => inCycle\(expense, monthRange\)\)/,
  );
  assert.match(planEngine, /expenseStatus\(expense\) === "unplanned"/);
  assert.match(planEngine, /expenseStatus\(expense\) === "undocumented"/);
});

test("editing a budget preserves its original tracking boundary while a brand-new budget starts now", () => {
  assert.match(
    financeActions,
    /if \(monthlyBudgetHeader\?\.id\) \{\s*await updateBudgetData\?\.\(String\(monthlyBudgetHeader\.id\), headerPayload\);/s,
  );
  assert.match(
    financeActions,
    /else \{\s*await addBudgetData\?\.\(\{\s*\.\.\.headerPayload,\s*tracking_start_date: nowIso,/s,
  );
});
