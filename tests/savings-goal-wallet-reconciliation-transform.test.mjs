import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { transformSavingsGoalsManagedBalance } from "../src/build/savingsGoalManagedBalanceTransform.js";
import { transformSavingsGoalWalletReconciliation } from "../src/build/savingsGoalWalletReconciliationTransform.js";

const source = fs.readFileSync("src/pages/SavingsGoalsIntegrated.jsx", "utf8");
const managedSource = transformSavingsGoalsManagedBalance(source);

test("Savings Goals can reconcile the protected amount with the assigned wallet", () => {
  const transformed = transformSavingsGoalWalletReconciliation(managedSource);

  assert.match(transformed, /Reconcile Savings & Wallet/);
  assert.match(transformed, /The wallet balance is correct/);
  assert.match(transformed, /The savings amount is correct/);
  assert.match(transformed, /Both records need correction/);
  assert.match(transformed, /\["wallet_correct", "savings_correct", "both"\]/);
  assert.match(transformed, /handleReconcileSavingsWallet/);
  assert.match(transformed, /source_type: "savings_wallet_reconciliation"/);
  assert.match(transformed, /tag: "historical_wallet_correction"/);
  assert.match(transformed, /Historical wallet money added and protected savings preserved/);
  assert.match(transformed, /wallet_sync_prompt_decision: "reconciled"/);
  assert.match(transformed, /deleteWalletTransaction\(walletCorrectionTransactionId\)/);
  assert.match(transformed, /It will not transfer money out of the old wallet/);
});

test("wallet reconciliation runs only after managed Savings controls", () => {
  assert.throws(
    () => transformSavingsGoalWalletReconciliation(source),
    /Missing source contract/,
  );
});
