import assert from "node:assert/strict";
import {
  buildCanonicalWalletState,
  getWalletSpendableBalance,
  isMoneyLentWallet,
} from "../src/lib/clara-wallet-money-semantics.js";

const wallets = [
  { id: "cash", name: "Cash", type: "cash", balance: 4000 },
  { id: "lent", name: "Rica", type: "money_lent", balance: 2256 },
];

assert.equal(isMoneyLentWallet(wallets[1]), true);
assert.equal(getWalletSpendableBalance(wallets[1]), 0);

const state = buildCanonicalWalletState({ wallets });
assert.equal(state.walletTotals.currentBalance, 6256);
assert.equal(state.walletTotals.spendableBalance, 4000);
assert.equal(state.walletTotals.moneyLentUnavailableAmount, 2256);
assert.equal(state.wallets.find((wallet) => wallet.id === "lent")?.spendabilityStatus, "blocked");
assert.equal(state.wallets.find((wallet) => wallet.id === "lent")?.spendableBalance, 0);

const financialDataSource = await import("node:fs/promises").then((fs) => fs.readFile("src/hooks/useFinancialData.js", "utf8"));
assert.match(financialDataSource, /totalWalletBalance: walletTotals\.spendableBalance/);
assert.match(financialDataSource, /totalOwnedWalletBalance: walletTotals\.currentBalance/);

const assistantSource = await import("node:fs/promises").then((fs) => fs.readFile("src/components/fresh/main-dashboard/assistant/useDashboardClaraAssistantContext.js", "utf8"));
assert.match(assistantSource, /availableMoney: availableWalletTotal/);
assert.match(assistantSource, /totalOwnedWalletBalance: ownedWalletTotal/);

console.log("Money Lent unavailable regression passed");
