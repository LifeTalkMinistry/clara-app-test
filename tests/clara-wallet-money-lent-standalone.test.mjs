import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const walletOverlay = readFileSync(
  new URL("../src/components/fresh/main-dashboard/assistant/ClaraWalletOverlayV2.jsx", import.meta.url),
  "utf8"
);

test("Money Lent creation offers wallet-backed and standalone origins", () => {
  assert.equal(walletOverlay.includes('setPhase("lent_origin")'), true);
  assert.equal(walletOverlay.includes('selectLentOrigin("wallet")'), true);
  assert.equal(walletOverlay.includes('selectLentOrigin("standalone")'), true);
  assert.equal(walletOverlay.includes("Standalone Money Lent · Don’t deduct another wallet"), true);
});

test("standalone Money Lent declares a receivable without deducting another wallet", () => {
  assert.equal(walletOverlay.includes('const isStandaloneLent = draftLentOrigin === "standalone";'), true);
  assert.equal(walletOverlay.includes('balance: isStandaloneLent ? draftLentAmount : 0'), true);
  assert.equal(walletOverlay.includes('receivable_origin: "standalone"'), true);
  assert.equal(walletOverlay.includes('declared_existing_receivable: true'), true);
  assert.equal(walletOverlay.includes('source: isStandaloneLent'), true);
});

test("existing wallet-backed Money Lent transfer remains intact", () => {
  assert.equal(walletOverlay.includes('if (!isStandaloneLent) {'), true);
  assert.equal(walletOverlay.includes("await transferBetweenWallets"), true);
  assert.equal(walletOverlay.includes("from_wallet_id: selectedLentSourceWallet.id"), true);
  assert.equal(walletOverlay.includes("to_wallet_id: lentWalletId"), true);
});
