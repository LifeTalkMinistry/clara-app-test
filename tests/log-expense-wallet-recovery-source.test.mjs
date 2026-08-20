import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const overlaySource = await readFile(
  new URL("../src/components/fresh/main-dashboard/assistant/ClaraLogExpenseOverlayV2.jsx", import.meta.url),
  "utf8"
);
const carouselSource = await readFile(
  new URL("../src/components/financial-carousel/FinancialCarousel.jsx", import.meta.url),
  "utf8"
);
const walletActionEventsSource = await readFile(
  new URL("../src/lib/clara-wallet-action-events.js", import.meta.url),
  "utf8"
);

test("Log Expense offers wallet creation when no wallet exists", () => {
  assert.match(overlaySource, /you don’t have a wallet yet/i);
  assert.match(overlaySource, /Want to create one now\?/i);
  assert.match(overlaySource, />Create a Wallet</);
  assert.match(overlaySource, /requestClaraWalletCreation/);
  assert.doesNotMatch(overlaySource, /Add or fund a wallet first, then come back here/i);
});

test("Log Expense offers wallet funding when wallets exist but none are spendable", () => {
  assert.match(overlaySource, /there isn’t any spendable money available yet/i);
  assert.match(overlaySource, /Add money to \{wallet\.name\}/);
  assert.match(overlaySource, /requestClaraWalletFunding/);
});

test("wallet handoff preserves the unfinished Log Expense conversation", () => {
  assert.match(overlaySource, /walletHandoffActive/);
  assert.match(overlaySource, /z-\[100\]/);
  assert.match(overlaySource, /amount,\n\s*item/);
  assert.match(overlaySource, /data-clara-log-expense-wallet-handoff/);
});

test("Financial Carousel routes recovery requests into existing wallet handlers", () => {
  assert.match(carouselSource, /CLARA_OPEN_CREATE_WALLET_EVENT/);
  assert.match(carouselSource, /CLARA_OPEN_ADD_MONEY_EVENT/);
  assert.match(carouselSource, /onCreateWallet\?\.\(\)/);
  assert.match(carouselSource, /onAddMoney\?\.\(wallet\)/);
});

test("wallet recovery uses a shared event contract", () => {
  assert.match(walletActionEventsSource, /clara:open-create-wallet/);
  assert.match(walletActionEventsSource, /clara:open-add-money/);
  assert.match(walletActionEventsSource, /requestClaraWalletCreation/);
  assert.match(walletActionEventsSource, /requestClaraWalletFunding/);
});
