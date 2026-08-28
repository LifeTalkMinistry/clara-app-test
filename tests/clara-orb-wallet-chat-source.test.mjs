import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const walletOverlay = readSource(
  "src/components/fresh/main-dashboard/assistant/ClaraWalletOverlayV2.jsx"
);
const environmentOverlay = readSource(
  "src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay.jsx"
);
const commandRouting = readSource(
  "src/runtime/installClaraOrbCommandChatRouting.js"
);

test("Wallet Orb command owns a dedicated CLARA wallet chat mode", () => {
  assert.equal(commandRouting.includes('wallet: "wallet"'), true);
  assert.equal(environmentOverlay.includes('entryMode === "wallet"'), true);
  assert.equal(environmentOverlay.includes("<ClaraWalletOverlay"), true);
  assert.equal(walletOverlay.includes('data-clara-wallet-chat="true"'), true);
});

test("Wallet chat reads canonical protected and spendable wallet semantics", () => {
  assert.equal(walletOverlay.includes("getWalletMoneySemantics"), true);
  assert.equal(walletOverlay.includes("totalProtectedAmount"), true);
  assert.equal(walletOverlay.includes("spendableBalance"), true);
  assert.equal(walletOverlay.includes("Current · Protected · Spendable"), true);
});

test("first Wallet Orb chat pass remains read-only and does not duplicate finance mutations", () => {
  assert.equal(walletOverlay.includes("addWallet"), true);
  assert.equal(walletOverlay.includes("addMoney"), true);
  assert.equal(walletOverlay.includes("transferBetweenWallets"), true);
  assert.equal(walletOverlay.includes("deleteWallet"), true);
  assert.equal(walletOverlay.includes("getWalletMoneySemantics"), true);
  assert.equal(walletOverlay.includes("updateWallet("), false);
  assert.equal(walletOverlay.includes("insertWalletTransaction("), false);
});
