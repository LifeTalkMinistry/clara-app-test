import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildCanonicalWalletState } from "../src/lib/clara-wallet-money-semantics.js";

const wallets = [
  { id: "cash", name: "Cash", balance: 5000 },
  { id: "bank", name: "Bank", balance: 4000 },
  { id: "lent", name: "Rica", type: "money_lent", balance: 1000 },
];
const emergencyFund = { savedAmount: 2000, storageWalletId: "bank" };
const savingsGoals = [{ id: "goal", wallet_id: "cash", saved_amount: 1500, status: "active" }];

const state = buildCanonicalWalletState({ wallets, emergencyFund, savingsGoals });
assert.equal(state.walletTotals.currentBalance, 10000);
assert.equal(state.walletTotals.emergencyProtectedAmount, 2000);
assert.equal(state.walletTotals.savingsProtectedAmount, 1500);
assert.equal(state.walletTotals.moneyLentUnavailableAmount, 1000);
assert.equal(state.walletTotals.spendableBalance, 5500);

const source = await readFile("src/runtime/installClaraOrbGreeting.js", "utf8");
assert.match(source, /buildCanonicalWalletState/);
assert.match(source, /getEmergencyFund/);
assert.match(source, /walletTotals\.spendableBalance/);
assert.match(source, />Money in hand</);
assert.match(source, /Emergency Fund · protected/);
assert.match(source, /Savings · protected/);

console.log("Means canonical spendable regression passed");
