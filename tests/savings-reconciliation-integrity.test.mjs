import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isSavingsGoalActive,
  isSavingsGoalCompleted,
} from "../src/lib/savingsGoalLifecycle.js";
import { getWalletMoneySemantics } from "../src/lib/clara-wallet-money-semantics.js";

const finance = readFileSync(new URL("../src/hooks/useFinancialDataBase.js", import.meta.url), "utf8");
const savings = readFileSync(new URL("../src/pages/SavingsGoalsIntegrated.jsx", import.meta.url), "utf8");

test("Savings reconciliation corrections do not inflate earned income", () => {
  assert.match(finance, /NON_EARNED_INCOME_SOURCE_TYPES/);
  assert.match(finance, /historical_wallet_correction/);
  assert.match(finance, /safeWalletTransactions\.filter\(isEarnedIncomeTransaction\)/);
  assert.match(finance, /safeIncomes\.reduce/);
});

test("Savings reconciliation requires explicit real balances", () => {
  assert.match(savings, /Enter both the actual wallet balance and the actual saved amount/);
  assert.match(savings, /reconciliationBothValuesMissing/);
  assert.match(savings, /min="0" step="0\.01"/);
});

test("downward wallet corrections create auditable neutral activity", () => {
  assert.match(savings, /type: "balance_correction"/);
  assert.match(savings, /insertWalletTransaction/);
  assert.match(savings, /previous_balance/);
  assert.match(savings, /next_balance/);
});

test("rollback failures surface a repair-required state", () => {
  assert.match(savings, /repairError\.repairRequired = true/);
  assert.match(savings, /Automatic rollback did not fully finish/);
  assert.match(savings, /reconciliationRepairRequired/);
});

test("new zero-funded Savings Goal remains active", () => {
  const goal = { target_amount: 5000, saved_amount: 0, status: "active" };
  assert.equal(isSavingsGoalActive(goal), true);
  assert.equal(isSavingsGoalCompleted(goal), false);
});

test("partially funded Savings Goal remains active", () => {
  const goal = { target_amount: 5000, saved_amount: 2000, status: "active" };
  assert.equal(isSavingsGoalActive(goal), true);
});

test("legacy consumed Savings Goal is inactive only with completion evidence", () => {
  const goal = {
    id: "church-expansion",
    title: "Church Expansion",
    target_amount: 5000,
    saved_amount: 0,
    savingsActivityLog: [{ type: "use", amount: 5000 }],
  };

  assert.equal(isSavingsGoalCompleted(goal), true);
  assert.equal(isSavingsGoalActive(goal), false);
});

test("modern completed Savings Goal is inactive", () => {
  const goal = {
    target_amount: 5000,
    saved_amount: 0,
    status: "completed",
    completion_status: "completed",
    completedAt: "2026-08-25T00:00:00.000Z",
  };

  assert.equal(isSavingsGoalCompleted(goal), true);
  assert.equal(isSavingsGoalActive(goal), false);
});

test("completed Savings Goal cannot protect wallet money", () => {
  const wallet = { id: "gcash", balance: 5000 };
  const completedGoal = {
    id: "church-expansion",
    wallet_id: "gcash",
    target_amount: 5000,
    saved_amount: 5000,
    status: "completed",
  };

  const semantics = getWalletMoneySemantics({
    wallet,
    wallets: [wallet],
    savingsGoals: [completedGoal],
  });

  assert.equal(semantics.savingsProtectedAmount, 0);
  assert.equal(semantics.spendableBalance, 5000);
});
