import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const finance = readFileSync(new URL("../src/hooks/useFinancialData.js", import.meta.url), "utf8");
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
