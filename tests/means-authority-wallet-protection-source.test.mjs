import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Means reads canonical Wallet protection sources before calculating available money", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /getEmergencyFund/);
  assert.match(authority, /getSavingsGoals/);
  assert.match(authority, /getWalletProtectedAmounts/);
  assert.match(authority, /availableContribution = balance - nonNegative\(protectedAmounts\.totalProtectedAmount\)/);
});

test("Money Lent and explicit reserve containers cannot enter available Wallet money", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /if \(isMoneyLentWallet\(wallet\)\)/);
  assert.match(authority, /moneyLentUnavailable/);
  assert.match(authority, /wallet\?\.isEmergencyReserveWallet \|\| wallet\?\.protected_reserve/);
});

test("Means score numerator is actual available Wallet money with no elapsed-plan subtraction", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /const assumedSpent = 0/);
  assert.match(authority, /const effectiveCurrentMoney = availableNow/);
  assert.doesNotMatch(authority, /availableNow\s*-\s*assumedSpent/);
});
