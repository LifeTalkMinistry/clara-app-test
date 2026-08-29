import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("already-paid obligation flow is exposed separately from normal Pay now", async () => {
  const card = await source("../src/components/financial-carousel/cards/debt/ui/DebtObligationItem.jsx");

  assert.match(card, /setPaymentMode\("now"\)/);
  assert.match(card, /setPaymentMode\("already_paid"\)/);
  assert.match(card, />\s*Already paid\s*</);
  assert.match(card, /Date actually paid/);
  assert.match(card, /Is this payment already reflected in your current wallet balance\?/);
  assert.match(card, /Yes · don’t deduct again/);
  assert.match(card, /leave Money Left unchanged/);
});

test("already-reflected historical payment cannot deduct the wallet a second time", async () => {
  const payment = await source("../src/lib/debtPaymentRepository.js");

  assert.match(payment, /const walletAlreadyReflectsPayment = Boolean/);
  assert.match(payment, /const deductWallet =[\s\S]*!walletAlreadyReflectsPayment/);
  assert.match(payment, /if \(deductWallet\) \{\s*await tx\.putRaw\(WALLET_STORE, walletRecord\);\s*\}/);
  assert.match(payment, /wallet_balance_effect: deductWallet \? "deducted" : "already_reflected"/);
  assert.match(payment, /CLARA did not deduct it again/);
});

test("normal obligation payment still deducts the selected wallet", async () => {
  const payment = await source("../src/lib/debtPaymentRepository.js");

  assert.match(payment, /balance: currentWalletBalance - paymentAmount/);
  assert.match(payment, /deductWallet: requiresWalletDeduction/);
});

test("historical payment records the real payment date instead of pretending it happened today", async () => {
  const payment = await source("../src/lib/debtPaymentRepository.js");
  const card = await source("../src/components/financial-carousel/cards/debt/ui/DebtObligationItem.jsx");

  assert.match(card, /paidAt: isHistoricalPayment \? paymentDate : null/);
  assert.match(payment, /const actualPaidAt = normalizePaidAt/);
  assert.match(payment, /created_at: actualPaidAt/);
  assert.match(payment, /paidAt: actualPaidAt/);
});
