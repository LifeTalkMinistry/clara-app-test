import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getWalletCurrentBalance,
  getWalletMoneySemantics,
  getWalletSpendableBalance,
  syncWalletProtectedAllocations,
} from "../src/lib/clara-wallet-money-semantics.js";
import { getWalletOptions } from "../src/lib/clara-buy-check-wallet-engine.js";
import { buildHomeSpendableMoneyProjection } from "../src/lib/clara-home-spendable-money.js";
import { getWalletBalance } from "../src/utils/financialEngine.js";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const gcash = { id: "gcash", name: "GCash Wallet", balance: 2177.28 };
const emergencyFund = {
  savedAmount: 400,
  storageWalletId: "gcash",
  storageWalletName: "GCash Wallet",
};
const savingsGoals = [
  { id: "goal-1", wallet_id: "gcash", saved_amount: 297.28, status: "active" },
];

test("1 - Current Balance is the persisted wallet balance", () => {
  assert.equal(getWalletCurrentBalance(gcash), 2177.28);
});

test("2 - protected funds lower Spendable without mutating Current Balance", () => {
  const original = structuredClone(gcash);
  const semantics = getWalletMoneySemantics({
    wallet: gcash,
    emergencyFund,
    savingsGoals,
    wallets: [gcash],
  });

  assert.equal(semantics.currentBalance, 2177.28);
  assert.equal(semantics.emergencyProtectedAmount, 400);
  assert.equal(semantics.savingsProtectedAmount, 297.28);
  assert.equal(semantics.totalProtectedAmount, 697.28);
  assert.equal(semantics.spendableBalance, 1480);
  assert.deepEqual(gcash, original);
});

test("3 - expense persistence represents exactly one subtraction", () => {
  const wallet = {
    id: "gcash",
    balance: 1480.28,
    updated_at: "2026-08-19T00:00:00.000Z",
  };
  const transactions = [
    {
      wallet_id: "gcash",
      type: "expense",
      amount: 697,
      source: "local",
      syncStatus: "local_only",
      created_at: "2026-08-19T00:00:00.000Z",
      updated_at: "2026-08-19T00:00:00.000Z",
    },
  ];

  assert.equal(getWalletBalance(wallet, transactions), 1480.28);
});

test("4 - protected money plus expense recalculates Spendable separately", () => {
  const postExpenseWallet = { ...gcash, balance: 1677.28 };
  const semantics = getWalletMoneySemantics({
    wallet: postExpenseWallet,
    emergencyFund,
    savingsGoals,
    wallets: [postExpenseWallet],
  });

  assert.equal(semantics.currentBalance, 1677.28);
  assert.equal(semantics.totalProtectedAmount, 697.28);
  assert.equal(semantics.spendableBalance, 980);
  assert.equal(postExpenseWallet.balance, 1677.28);
});

test("5 - Add Funds changes Current Balance while protection stays derived", () => {
  const fundedWallet = { ...gcash, balance: 2677.28 };
  const semantics = getWalletMoneySemantics({
    wallet: fundedWallet,
    emergencyFund,
    savingsGoals,
    wallets: [fundedWallet],
  });

  assert.equal(semantics.currentBalance, 2677.28);
  assert.equal(semantics.spendableBalance, 1980);
});

test("6 - transfer changes Current Balances and recalculates Spendable independently", () => {
  const source = { id: "a", balance: 4500 };
  const destination = { id: "b", balance: 1500 };
  const sourceEmergency = { savedAmount: 1000, storageWalletId: "a" };

  const sourceSemantics = getWalletMoneySemantics({
    wallet: source,
    emergencyFund: sourceEmergency,
    wallets: [source, destination],
  });
  const destinationSemantics = getWalletMoneySemantics({
    wallet: destination,
    emergencyFund: sourceEmergency,
    wallets: [source, destination],
  });

  assert.equal(sourceSemantics.currentBalance, 4500);
  assert.equal(sourceSemantics.spendableBalance, 3500);
  assert.equal(destinationSemantics.currentBalance, 1500);
  assert.equal(destinationSemantics.spendableBalance, 1500);
});

test("7 - Savings Goal protection never lowers Current Balance", () => {
  const semantics = getWalletMoneySemantics({
    wallet: gcash,
    savingsGoals,
    wallets: [gcash],
  });

  assert.equal(semantics.currentBalance, 2177.28);
  assert.equal(semantics.savingsProtectedAmount, 297.28);
  assert.equal(semantics.spendableBalance, 1880);
});

test("8 - Emergency Fund protection never lowers Current Balance", () => {
  const semantics = getWalletMoneySemantics({
    wallet: gcash,
    emergencyFund,
    wallets: [gcash],
  });

  assert.equal(semantics.currentBalance, 2177.28);
  assert.equal(semantics.emergencyProtectedAmount, 400);
  assert.equal(semantics.spendableBalance, 1777.28);
});

test("9 - combined protection has one explicit hierarchy", () => {
  const wallet = { id: "main", balance: 5000 };
  const emergency = { savedAmount: 1000, storageWalletId: "main" };
  const goals = [{ id: "goal", wallet_id: "main", saved_amount: 500 }];
  const semantics = getWalletMoneySemantics({
    wallet,
    emergencyFund: emergency,
    savingsGoals: goals,
    wallets: [wallet],
  });

  assert.equal(semantics.currentBalance, 5000);
  assert.equal(semantics.totalProtectedAmount, 1500);
  assert.equal(semantics.spendableBalance, 3500);
});

test("10 - Money Left toggle is React-owned and runtime cannot rewrite the amount DOM", () => {
  const home = readSource("src/components/community/CommunityHomeFinancialCarousel.jsx");
  const runtime = readSource("src/runtime/installMoneyLeftAfterBudgetToggle.js");

  assert.match(home, /moneyLeftMode/);
  assert.match(home, /displayedMoneyLeft/);
  assert.match(home, /data-clara-after-budget-active/);
  assert.match(home, /onClick=.*setMoneyLeftMode/s);
  assert.doesNotMatch(runtime, /MONEY_AMOUNT_SELECTOR/);
  assert.doesNotMatch(runtime, /amountNode\.textContent\s*=/);
  assert.doesNotMatch(runtime, /MutationObserver/);
  assert.doesNotMatch(runtime, /querySelector\([^)]*money-left[^)]*h2/i);
});

test("11 - refresh-style recomputation never changes the source wallet", () => {
  const sourceWallet = { ...gcash };
  const first = syncWalletProtectedAllocations({
    rows: [sourceWallet],
    allWallets: [sourceWallet],
    emergencyFund,
    savingsGoals,
  })[0];
  const second = syncWalletProtectedAllocations({
    rows: [sourceWallet],
    allWallets: [sourceWallet],
    emergencyFund,
    savingsGoals,
  })[0];

  assert.equal(first.balance, 2177.28);
  assert.equal(second.balance, 2177.28);
  assert.equal(first.spendableBalance, 1480);
  assert.equal(second.spendableBalance, 1480);
  assert.equal(sourceWallet.balance, 2177.28);
});

test("12 - app restart rebuilds Current, Spendable, and Projected independently", () => {
  const hydrated = JSON.parse(
    JSON.stringify({ wallet: gcash, emergencyFund, savingsGoals })
  );
  const semantics = getWalletMoneySemantics({
    wallet: hydrated.wallet,
    emergencyFund: hydrated.emergencyFund,
    savingsGoals: hydrated.savingsGoals,
    wallets: [hydrated.wallet],
  });
  const projection = buildHomeSpendableMoneyProjection({
    spendableWalletBalance: semantics.spendableBalance,
    remainingBudget: 500,
    monthlyObligationPressure: 200,
    debtBudgetRemaining: 50,
  });

  assert.equal(semantics.currentBalance, 2177.28);
  assert.equal(semantics.spendableBalance, 1480);
  assert.equal(projection.projectedSpendableMoney, 830);
});

test("deleted Savings Goals are not treated as active protection", () => {
  const deletedGoal = {
    id: "deleted-goal",
    wallet_id: "gcash",
    saved_amount: 697.28,
    deletedAt: "2026-08-19T00:00:00.000Z",
  };
  const semantics = getWalletMoneySemantics({
    wallet: gcash,
    savingsGoals: [deletedGoal],
    wallets: [gcash],
  });

  assert.equal(semantics.savingsProtectedAmount, 0);
  assert.equal(semantics.spendableBalance, 2177.28);
});

test("unlinked Emergency Fund data cannot silently protect an unrelated wallet", () => {
  const semantics = getWalletMoneySemantics({
    wallet: gcash,
    emergencyFund: { savedAmount: 697.28, storageWalletId: "other-wallet" },
    wallets: [gcash],
  });

  assert.equal(semantics.emergencyProtectedAmount, 0);
  assert.equal(getWalletSpendableBalance({ ...gcash, ...semantics }), 2177.28);
});

test("Log Expense excludes a wallet when Emergency Fund and Savings Goal protect its full balance", () => {
  const wallet = { id: "maya", name: "Maya Wallet", balance: 1000 };
  const options = getWalletOptions(
    {
      wallets: [wallet],
      emergencyFund: { savedAmount: 700, storageWalletId: "maya" },
      savingsGoals: [{ id: "goal", wallet_id: "maya", saved_amount: 300, status: "active" }],
    },
    20
  );

  assert.deepEqual(options, []);
});

test("Log Expense only uses the legitimate spendable remainder of a protected wallet", () => {
  const wallet = { id: "maya", name: "Maya Wallet", balance: 1000 };
  const context = {
    wallets: [wallet],
    emergencyFund: { savedAmount: 800, storageWalletId: "maya" },
    savingsGoals: [],
  };

  assert.deepEqual(getWalletOptions(context, 150), [
    { id: "maya", name: "Maya Wallet", balance: 200, enough: true },
  ]);
  assert.deepEqual(getWalletOptions(context, 250), [
    { id: "maya", name: "Maya Wallet", balance: 200, enough: false },
  ]);
});
