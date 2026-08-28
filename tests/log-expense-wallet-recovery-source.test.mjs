import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const overlaySource = await readFile(
  new URL("../src/components/fresh/main-dashboard/assistant/ClaraLogExpenseOverlayV2.jsx", import.meta.url),
  "utf8"
);
const environmentSource = await readFile(
  new URL("../src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay.jsx", import.meta.url),
  "utf8"
);
const walletSource = await readFile(
  new URL("../src/components/fresh/main-dashboard/assistant/ClaraWalletOverlayV2.jsx", import.meta.url),
  "utf8"
);

test("Log Expense sends no-wallet recovery directly into Wallet chat", () => {
  assert.match(overlaySource, /onOpenWalletChat/);
  assert.match(overlaySource, /intent: "create"/);
  assert.match(overlaySource, />Create a Wallet</);
  assert.doesNotMatch(overlaySource, /requestClaraWalletCreation/);
  assert.doesNotMatch(overlaySource, /requestClaraWalletFunding/);
});

test("Log Expense stays above dashboard floating controls", () => {
  assert.match(overlaySource, /z-\[400\]/);
  assert.match(overlaySource, /touch-manipulation/);
  assert.doesNotMatch(overlaySource, /walletHandoffActive/);
  assert.doesNotMatch(overlaySource, /z-\[100\]/);
});

test("environment switches chat modes without routing to Financial Dashboard", () => {
  assert.match(environmentSource, /setEntryMode\("wallet"\)/);
  assert.match(environmentSource, /walletHandoff/);
  assert.match(environmentSource, /resumeState=\{logExpenseResume\}/);
  assert.match(environmentSource, /returnMode: "log-expense"/);
});

test("Wallet chat owns wallet creation and funding", () => {
  assert.match(walletSource, /addWallet\(localUserId/);
  assert.match(walletSource, /addMoney\(localUserId/);
  assert.match(walletSource, /transferBetweenWallets/);
  assert.match(walletSource, /deleteWallet/);
  assert.match(walletSource, /onWalletReady/);
  assert.match(walletSource, /data-clara-wallet-chat-intent/);
});

test("unfinished expense is restored after Wallet chat", () => {
  assert.match(overlaySource, /I kept \$\{money\(resumedAmount\)\} for \$\{resumedItem\}/);
  assert.match(overlaySource, /Which wallet did you use\?/);
  assert.match(environmentSource, /amount: Number\(detail\?\.amount\)/);
  assert.match(environmentSource, /item: String\(detail\?\.item/);
});

test("Wallet recovery returns after canonical finance state refreshes", () => {
  assert.match(environmentSource, /walletCountBefore/);
  assert.match(environmentSource, /financeRevisionBefore/);
  assert.match(environmentSource, /currentWalletCount > walletCountBefore/);
  assert.match(environmentSource, /currentFinanceRevision > financeRevisionBefore/);
  assert.match(environmentSource, /returnToLogExpense\(\)/);
});
