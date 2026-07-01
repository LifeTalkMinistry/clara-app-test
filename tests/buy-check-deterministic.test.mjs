import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeBuyCheckBudgetCoverage,
  assignExpenseToBudget,
  buildBudgetMetadata,
  isBudgetActive,
} from "../src/lib/clara-buy-check-budget-engine.js";
import { inferPurchaseCategory } from "../src/lib/clara-buy-check-category-engine.js";
import { getWalletBreakdown } from "../src/lib/clara-buy-check-wallet-engine.js";
import {
  calculateBuyCheckDiagnosis,
  validateBuyCheckDiagnosis,
} from "../src/lib/clara-buy-check-decision-core.js";

const budget = (overrides = {}) => ({
  id: `budget-${Math.random()}`,
  title: "Food",
  amount: 5000,
  start_date: "2026-06-01",
  end_date: "2026-07-31",
  ...overrides,
});
const expense = (overrides = {}) => ({ amount: 1000, category: "food", date: "2026-06-30", ...overrides });
const wallet = (id, balance, extra = {}) => ({ id, name: id, balance, ...extra });

function pkg(assessment, signals = {}) {
  return {
    purchase: { price: assessment.purchaseAmount, item: "Item", category: assessment.purchaseCategory },
    finance: {
      spendableTotal: assessment.spendable,
      largestEligibleBalance: assessment.largestEligibleBalance,
      matchingBudget: assessment.selectedBudget,
      budgetAssessment: assessment,
    },
    contextSignals: {
      protectedMoneyRisk: assessment.protectedMoneyNeeded ? "critical" : "none",
      upcomingObligationRisk: "none",
      repeatedImpulseRisk: "none",
      ...signals,
    },
  };
}

test("one expense is attributed to only one similar budget", () => {
  const result = analyzeBuyCheckBudgetCoverage("groceries", 500, {
    budgets: [budget({ id: "groceries", title: "Groceries" }), budget({ id: "dining", title: "Dining" })],
    expenses: [expense({ notes: "Groceries for home" })],
    wallets: [wallet("cash", 10000)],
  });
  assert.equal(result.candidates.filter((entry) => entry.spent === 1000).length, 1);
});

test("direct budget id wins", () => {
  const budgets = buildBudgetMetadata([budget({ id: "food" }), budget({ id: "misc", title: "Miscellaneous" })], "food", new Date("2026-06-30T08:00:00Z"));
  assert.equal(assignExpenseToBudget(expense({ budget_id: "misc" }), budgets).matchType, "direct_id");
});

test("direct normalized budget name wins", () => {
  const budgets = buildBudgetMetadata([budget({ id: "food" }), budget({ id: "misc", title: "Miscellaneous" })], "food", new Date("2026-06-30T08:00:00Z"));
  assert.equal(assignExpenseToBudget(expense({ budget_name: " miscellaneous " }), budgets).ownerKey, "misc");
});

test("one flexible budget receives an unassigned expense", () => {
  const result = analyzeBuyCheckBudgetCoverage("unknown purchase", 500, {
    budgets: [budget({ id: "misc", title: "Miscellaneous" }), budget({ id: "buffer", title: "Spending Buffer" })],
    expenses: [expense({ category: "other", notes: "unknown purchase" })],
    wallets: [wallet("cash", 10000)],
  });
  assert.equal(result.candidates.filter((entry) => entry.spent === 1000).length, 1);
});

test("stored spent prevents overstated remaining money", () => {
  const result = analyzeBuyCheckBudgetCoverage("food", 1500, { budgets: [budget({ id: "food", spent: 4000 })], expenses: [], wallets: [wallet("cash", 10000)] });
  assert.equal(result.selectedBudget.remaining, 1000);
  assert.equal(result.selectedBudget.spentSource, "stored_budget");
});

test("bus fare matches transportation without matching business", () => {
  assert.equal(inferPurchaseCategory({ item: "bus fare" }), "transport");
  assert.notEqual(inferPurchaseCategory({ item: "business laptop" }), "transport");
});

test("internet bill matches utilities", () => assert.equal(inferPurchaseCategory({ item: "internet bill" }), "utilities"));
test("school reason classifies an ambiguous laptop", () => assert.equal(inferPurchaseCategory({ item: "laptop", reason: "I need this for school and class" }), "education"));
test("Taglish reason remains classifiable", () => assert.equal(inferPurchaseCategory({ item: "daily pass", reason: "Kailangan ko sa pamasahe papuntang work" }), "transport"));

test("date-only end date remains active through the Manila day", () => {
  const item = budget({ end_date: "2026-06-30" });
  assert.equal(isBudgetActive(item, new Date("2026-06-30T15:59:59Z")), true);
  assert.equal(isBudgetActive(item, new Date("2026-06-30T16:00:00Z")), false);
});

test("future and expired budgets are excluded", () => {
  const now = new Date("2026-06-30T08:00:00Z");
  assert.equal(isBudgetActive(budget({ start_date: "2026-07-01", end_date: "2026-07-31" }), now), false);
  assert.equal(isBudgetActive(budget({ start_date: "2026-05-01", end_date: "2026-05-31" }), now), false);
});

test("combined wallets are not treated as one payable wallet", () => {
  const result = analyzeBuyCheckBudgetCoverage("food", 1000, { budgets: [budget({ id: "food" })], expenses: [], wallets: [wallet("cash", 600), wallet("gcash", 500)] });
  assert.equal(result.walletFundingStatus, "combined_only");
  assert.equal(calculateBuyCheckDiagnosis(pkg(result)).decision, "WAIT");
});

test("one eligible wallet can fund a covered purchase", () => {
  const result = analyzeBuyCheckBudgetCoverage("food", 500, { budgets: [budget({ id: "food" })], expenses: [], wallets: [wallet("cash", 10000)] });
  assert.equal(result.status, "full");
});

test("protected wallets and reserved balances are excluded", () => {
  const result = getWalletBreakdown({ wallets: [wallet("Emergency Fund", 5000, { is_protected: true }), wallet("Bank", 3000, { reserved_amount: 2500 })] }, 1000);
  assert.equal(result.spendableTotal, 500);
  assert.equal(result.protectedTotal, 5000);
  assert.equal(result.reservedAmount, 2500);
});

test("no matching budget produces PAUSE", () => {
  const result = analyzeBuyCheckBudgetCoverage("shoes", 500, { budgets: [], expenses: [], wallets: [wallet("cash", 5000)] });
  assert.equal(calculateBuyCheckDiagnosis(pkg(result)).decision, "PAUSE");
});

test("exhausted budget produces WAIT", () => {
  const result = analyzeBuyCheckBudgetCoverage("food", 500, { budgets: [budget({ id: "food", spent: 5000 })], expenses: [], wallets: [wallet("cash", 5000)] });
  assert.equal(calculateBuyCheckDiagnosis(pkg(result)).decision, "WAIT");
});

test("partial budget produces REDUCE with exact maximum", () => {
  const result = analyzeBuyCheckBudgetCoverage("food", 1500, { budgets: [budget({ id: "food", spent: 4000 })], expenses: [], wallets: [wallet("cash", 5000)] });
  const decision = calculateBuyCheckDiagnosis(pkg(result));
  assert.equal(decision.decision, "REDUCE");
  assert.match(decision.saferMove, /₱1,000/);
});

test("large covered purchase produces BUY WITH CAP", () => {
  const result = analyzeBuyCheckBudgetCoverage("food", 4000, { budgets: [budget({ id: "food" })], expenses: [], wallets: [wallet("cash", 10000)] });
  assert.equal(calculateBuyCheckDiagnosis(pkg(result)).decision, "BUY WITH CAP");
});

test("safe covered purchase produces BUY", () => {
  const result = analyzeBuyCheckBudgetCoverage("food", 500, { budgets: [budget({ id: "food" })], expenses: [], wallets: [wallet("cash", 10000)] });
  assert.equal(calculateBuyCheckDiagnosis(pkg(result)).decision, "BUY");
});

test("invalid decision-risk combinations are rejected atomically", () => {
  assert.equal(validateBuyCheckDiagnosis({ decision: "WAIT", risk: "Low", saferMove: "Wait." }), null);
  assert.equal(validateBuyCheckDiagnosis({ decision: "BUY", risk: "High", saferMove: "Buy." }), null);
  assert.equal(validateBuyCheckDiagnosis({ decision: "PAUSE", risk: "Low", saferMove: "Pause." }), null);
  assert.equal(validateBuyCheckDiagnosis({ decision: "WAIT", risk: "High", saferMove: "Wait." }).decision, "WAIT");
});
