import test from "node:test";
import assert from "node:assert/strict";
import {
  getLinkedSavingsExpenseTotal,
  reconcileSavingsGoalWithLinkedExpenses,
} from "../src/lib/savingsGoalLinkedExpenseRepair.js";

test("Church Expansion linked expenses repair stale savings total", () => {
  const goal = {
    id: "church-expansion",
    title: "Church Expansion",
    target_amount: 5000,
    saved_amount: 1502,
  };
  const expenses = [
    { id: "expense-1", amount: 751, category: "Church Expansion" },
    { id: "expense-2", amount: 1749, category: "Church Expansion" },
  ];

  assert.equal(getLinkedSavingsExpenseTotal(goal, expenses), 2500);
  const repaired = reconcileSavingsGoalWithLinkedExpenses(goal, expenses);
  assert.equal(repaired.saved_amount, 2500);
  assert.equal(repaired.saved, 2500);
  assert.equal(repaired.current_amount, 2500);
});

test("explicit protected savings links are matched by goal id", () => {
  const goal = { id: "goal-1", title: "Goal", saved_amount: 0 };
  const expenses = [
    { amount: 500, budget_list_key: "protected-savings-goal-1" },
    { amount: 300, linked_target_type: "savings", linked_target_id: "goal-1" },
  ];

  assert.equal(getLinkedSavingsExpenseTotal(goal, expenses), 800);
});

test("a recorded savings withdrawal prevents historical contributions from overwriting the current balance", () => {
  const goal = {
    id: "goal-1",
    title: "Goal",
    saved_amount: 1200,
    savingsActivityLog: [{ type: "use", amount: 800 }],
  };
  const expenses = [{ amount: 2000, category: "Goal" }];

  assert.equal(
    reconcileSavingsGoalWithLinkedExpenses(goal, expenses).saved_amount,
    1200,
  );
});
