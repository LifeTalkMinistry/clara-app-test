import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildHomeSpendableMoneyProjection } from "../src/lib/clara-home-spendable-money.js";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("Home spendable projection reserves protected-wallet-adjusted budget and unpaid obligations", () => {
  const result = buildHomeSpendableMoneyProjection({
    spendableWalletBalance: 8912.5,
    remainingBudget: 3200,
    monthlyObligationPressure: 1500,
    debtBudgetRemaining: 0,
  });

  assert.equal(result.debtReserveOutsideBudget, 1500);
  assert.equal(result.projectedSpendableMoney, 4212.5);
});

test("debt already reserved inside the active budget is not deducted twice", () => {
  const result = buildHomeSpendableMoneyProjection({
    spendableWalletBalance: 9000,
    remainingBudget: 4000,
    monthlyObligationPressure: 1500,
    debtBudgetRemaining: 1000,
  });

  assert.equal(result.debtReserveOutsideBudget, 500);
  assert.equal(result.projectedSpendableMoney, 4500);
});

test("paid or completed obligation pressure of zero adds no extra debt reserve", () => {
  const result = buildHomeSpendableMoneyProjection({
    spendableWalletBalance: 7000,
    remainingBudget: 2500,
    monthlyObligationPressure: 0,
    debtBudgetRemaining: 0,
  });

  assert.equal(result.debtReserveOutsideBudget, 0);
  assert.equal(result.projectedSpendableMoney, 4500);
});

test("Home projection uses shared wallet semantics and React-owned Money Left mode", () => {
  const communityHome = readSource(
    "src/components/community/CommunityHomeFinancialCarousel.jsx"
  );
  const runtime = readSource(
    "src/runtime/installMoneyLeftAfterBudgetToggle.js"
  );

  assert.match(communityHome, /getTotalWalletSpendableBalance/);
  assert.match(communityHome, /monthlyObligationPressure/);
  assert.match(communityHome, /getDebtBudgetRemaining/);
  assert.match(communityHome, /buildHomeSpendableMoneyProjection/);
  assert.match(communityHome, /moneyLeftMode/);
  assert.match(communityHome, /displayedMoneyLeft/);
  assert.match(communityHome, /data-clara-after-budget-active/);
  assert.doesNotMatch(runtime, /MONEY_AMOUNT_SELECTOR/);
  assert.doesNotMatch(runtime, /amountNode\.textContent\s*=/);
  assert.doesNotMatch(runtime, /MutationObserver/);
});
