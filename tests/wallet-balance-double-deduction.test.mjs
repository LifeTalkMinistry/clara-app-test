import test from "node:test";
import assert from "node:assert/strict";
import { getWalletBalance, getTotalBalance } from "../src/utils/financialEngine.js";

test("local atomic expense is not applied twice when created_at is later than wallet updated_at", () => {
  const wallet = {
    id: "gcash",
    balance: 1280.28,
    updated_at: "2026-08-18T20:31:00.000Z",
  };

  const transactions = [
    {
      id: "wallet_transaction_expense_697",
      wallet_id: "gcash",
      amount: 697,
      type: "expense",
      created_at: "2026-08-19T00:00:00.000Z",
      updated_at: "2026-08-18T20:31:00.000Z",
      source: "local",
      syncStatus: "local_only",
    },
  ];

  assert.equal(getWalletBalance(wallet, transactions), 1280.28);
  assert.equal(
    getTotalBalance({ wallets: [wallet], walletTransactions: transactions }),
    1280.28,
  );
});

test("a genuinely later local wallet transaction is still applied", () => {
  const wallet = {
    id: "gcash",
    balance: 1280.28,
    updated_at: "2026-08-18T20:31:00.000Z",
  };

  const transactions = [
    {
      wallet_id: "gcash",
      amount: 50,
      type: "expense",
      created_at: "2026-08-19T00:00:00.000Z",
      updated_at: "2026-08-18T20:32:00.000Z",
      source: "local",
      syncStatus: "local_only",
    },
  ];

  assert.equal(getWalletBalance(wallet, transactions), 1230.28);
});

test("non-local transactions continue using their chronological created_at", () => {
  const wallet = {
    id: "gcash",
    balance: 1280.28,
    updated_at: "2026-08-18T20:31:00.000Z",
  };

  const transactions = [
    {
      wallet_id: "gcash",
      amount: 50,
      type: "expense",
      created_at: "2026-08-18T20:32:00.000Z",
      updated_at: "2026-08-18T20:30:00.000Z",
      source: "remote",
      syncStatus: "synced",
    },
  ];

  assert.equal(getWalletBalance(wallet, transactions), 1230.28);
});
