import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { getWalletBalance } from "../src/utils/financialEngine.js";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Means uses the same ledger-aware wallet balance engine as the wallet UI", async () => {
  const wallet = {
    id: "cash",
    balance: 12388.28,
    updated_at: "2026-08-29T00:00:00.000Z",
  };
  const transactions = [
    {
      id: "expense-5000",
      wallet_id: "cash",
      type: "expense",
      amount: 5000,
      created_at: "2026-08-29T01:00:00.000Z",
      details: { next_balance: 7388.28 },
    },
  ];

  assert.equal(getWalletBalance(wallet, transactions, []), 7388.28);

  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /getWalletTransactions/);
  assert.match(authority, /getTransfers/);
  assert.match(authority, /getWalletBalance/);
  assert.match(
    authority,
    /calculateMeansAvailableWalletMoney\(\s*wallets,\s*walletTransactions,\s*transfers\s*\)/
  );
  assert.doesNotMatch(authority, /function walletBalance\(/);
});

test("Means ignores deleted wallet ledger records while resolving current money", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");

  assert.match(authority, /function isDeletedFinanceRecord/);
  assert.match(authority, /safeTransactions/);
  assert.match(authority, /safeTransfers/);
  assert.match(authority, /filter\(\(wallet\) => !isDeletedFinanceRecord\(wallet\)\)/);
});
