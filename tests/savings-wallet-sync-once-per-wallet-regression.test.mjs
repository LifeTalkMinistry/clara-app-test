import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/pages/SavingsGoalsIntegrated.jsx", import.meta.url),
  "utf8",
);

test("wallet balance sync prompt is remembered per assigned wallet", () => {
  assert.match(source, /getWalletSyncHandledWalletId/);
  assert.match(source, /walletSyncHandledForAssignedWallet/);
  assert.match(source, /assignedWalletChanged/);
  assert.match(source, /shouldAskWalletSync/);
  assert.match(source, /wallet_sync_prompt_wallet_id/);
  assert.match(source, /wallet_sync_prompt_decision:\s*"dismissed"/);
  assert.match(source, /wallet_sync_prompt_decision:\s*"accepted"/);
  assert.match(source, /getWalletSyncHandledWalletId\(goal\) === promptWalletId/);
  assert.match(source, /onCancel=\{handleDismissWalletBalanceSync\}/);
});
