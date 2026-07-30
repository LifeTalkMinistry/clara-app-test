import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/pages/SavingsGoalsIntegrated.jsx", import.meta.url), "utf8");
const vite = readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");

test("Savings Goals reconcile protected money with the assigned wallet", () => {
  assert.match(page, /Reconcile Savings & Wallet/);
  assert.match(page, /The wallet balance is correct/);
  assert.match(page, /The savings amount is correct/);
  assert.match(page, /Both records need correction/);
  assert.match(page, /source_type: "savings_wallet_reconciliation"/);
  assert.match(page, /tag: "historical_wallet_correction"/);
  assert.match(page, /deleteWalletTransaction/);
  assert.match(page, /wallet_sync_prompt_decision: "reconciled"/);
  assert.match(page, /It will not transfer money out of the old wallet/);
});

test("Savings wallet reconciliation is direct source, not a Vite rewrite", () => {
  assert.doesNotMatch(vite, /savingsGoalWalletReconciliationPlugin|savingsGoalWalletReconciliationTransform/);
  assert.equal(existsSync(new URL("../src/build/savingsGoalWalletReconciliationTransform.js", import.meta.url)), false);
});
