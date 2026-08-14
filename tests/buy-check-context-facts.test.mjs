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
import { analyzeIncomeRunway } from "../src/lib/clara-buy-check-income-runway-engine.js";
import { analyzeCalendarImpact } from "../src/lib/clara-buy-check-calendar-engine.js";
import { analyzeObligations } from "../src/lib/clara-buy-check-obligation-engine.js";
import { analyzeGoalProtection } from "../src/lib/clara-buy-check-goal-protection-engine.js";
import { analyzeLifeStageContext } from "../src/lib/clara-buy-check-life-stage-engine.js";
import { readScheduleEventsForAI } from "../src/lib/clara-schedule-ai-context.js";

const now = "2026-07-02T00:00:00.000Z";
const budget = (overrides = {}) => ({
  id: `budget-${Math.random()}`,
  title: "Food",
  amount: 5000,
  start_date: "2000-01-01",
  end_date: "2099-12-31",
  ...overrides,
});
const expense = (overrides = {}) => ({ amount: 1000, category: "food", date: "2026-06-30", ...overrides });
const wallet = (id, balance, extra = {}) => ({ id, name: id, balance, ...extra });
const income = (date, amount = 10000, source = "Salary") => ({ id: `${source}-${date}`, date, amount, incomeSourceName: source });

test("one expense is attributed to only one similar budget", () => {
  const result = analyzeBuyCheckBudgetCoverage("groceries", 500, {
    budgets: [budget({ id: "groceries", title: "Groceries" }), budget({ id: "dining", title: "Dining" })],
    expenses: [expense({ notes: "Groceries for home" })],
    wallets: [wallet("cash", 10000)],
  });
  assert.equal(result.candidates.filter((entry) => entry.spent === 1000).length, 1);
});

test("direct budget id wins", () => {
  const budgets = buildBudgetMetadata(
    [budget({ id: "food" }), budget({ id: "misc", title: "Miscellaneous" })],
    "food",
    new Date("2026-06-30T08:00:00Z"),
  );
  assert.equal(assignExpenseToBudget(expense({ budget_id: "misc" }), budgets).matchType, "direct_id");
});

test("direct normalized budget name wins", () => {
  const budgets = buildBudgetMetadata(
    [budget({ id: "food" }), budget({ id: "misc", title: "Miscellaneous" })],
    "food",
    new Date("2026-06-30T08:00:00Z"),
  );
  assert.equal(assignExpenseToBudget(expense({ budget_name: " miscellaneous " }), budgets).ownerKey, "misc");
});

test("stored spent prevents overstated remaining money", () => {
  const result = analyzeBuyCheckBudgetCoverage("food", 1500, {
    budgets: [budget({ id: "food", spent: 4000 })],
    expenses: [],
    wallets: [wallet("cash", 10000)],
  });
  assert.equal(result.selectedBudget.remaining, 1000);
  assert.equal(result.selectedBudget.spentSource, "stored_budget");
});

test("purchase categories remain evidence, not verdicts", () => {
  assert.equal(inferPurchaseCategory({ item: "bus fare" }), "transport");
  assert.equal(inferPurchaseCategory({ item: "internet bill" }), "utilities");
  assert.equal(inferPurchaseCategory({ item: "laptop", reason: "I need this for school and class" }), "education");
  assert.equal(inferPurchaseCategory({ item: "daily pass", reason: "Kailangan ko sa pamasahe papuntang work" }), "transport");
  assert.notEqual(inferPurchaseCategory({ item: "business laptop" }), "transport");
});

test("date-only budget end date remains active through the Manila day", () => {
  const item = budget({ end_date: "2026-06-30" });
  assert.equal(isBudgetActive(item, new Date("2026-06-30T15:59:59Z")), true);
  assert.equal(isBudgetActive(item, new Date("2026-06-30T16:00:00Z")), false);
});

test("future and expired budgets are excluded from verified context", () => {
  const current = new Date("2026-06-30T08:00:00Z");
  assert.equal(isBudgetActive(budget({ start_date: "2026-07-01", end_date: "2026-07-31" }), current), false);
  assert.equal(isBudgetActive(budget({ start_date: "2026-05-01", end_date: "2026-05-31" }), current), false);
});

test("combined wallets are distinguished from one payable wallet", () => {
  const result = analyzeBuyCheckBudgetCoverage("food", 1000, {
    budgets: [budget({ id: "food" })],
    expenses: [],
    wallets: [wallet("cash", 600), wallet("gcash", 500)],
  });
  assert.equal(result.walletFundingStatus, "combined_only");
});

test("protected wallets and reserved balances are excluded from spendable money", () => {
  const result = getWalletBreakdown({
    wallets: [
      wallet("Emergency Fund", 5000, { is_protected: true }),
      wallet("Bank", 3000, { reserved_amount: 2500 }),
    ],
  }, 1000);
  assert.equal(result.spendableTotal, 500);
  assert.equal(result.protectedTotal, 5000);
  assert.equal(result.reservedAmount, 2500);
});

test("weekly income history produces a high-confidence next-income estimate", () => {
  const result = analyzeIncomeRunway({ incomeHubSnapshot: { connected: true, timeline: [
    income("2026-06-05T00:00:00.000Z"),
    income("2026-06-12T00:00:00.000Z"),
    income("2026-06-19T00:00:00.000Z"),
    income("2026-06-26T00:00:00.000Z"),
  ] } }, { now });
  assert.equal(result.confidence, "high");
  assert.equal(result.daysUntilNextIncome, 1);
  assert.equal(result.estimatedNextIncomeDate.slice(0, 10), "2026-07-03");
});

test("insufficient income history does not invent a payday", () => {
  const result = analyzeIncomeRunway({
    incomeHubSnapshot: { connected: true, timeline: [income("2026-06-30T00:00:00.000Z")] },
  }, { now });
  assert.equal(result.confidence, "low");
  assert.equal(result.estimatedNextIncomeDate, null);
  assert.equal(result.daysUntilNextIncome, null);
});

test("explicit next-income schedule wins over inferred history", () => {
  const result = analyzeIncomeRunway({
    incomeSources: [{ name: "Salary", nextIncomeDate: "2026-07-15", expectedAmount: 12000 }],
    incomeHubSnapshot: { connected: true, timeline: [income("2026-06-30T00:00:00.000Z")] },
  }, { now });
  assert.equal(result.confidence, "high");
  assert.equal(result.estimatedNextIncomeDate.slice(0, 10), "2026-07-15");
});

test("seeded schedule events are ignored unless user confirmed", () => {
  const result = analyzeCalendarImpact({ scheduleEvents: {
    connected: true,
    source: "seeded_schedule_fallback",
    upcomingEvents: [{ id: "sample-bill", title: "Bill protection", date: "2026-07-05", amount: 2000, source: "seeded_schedule_fallback" }],
  } }, { confidence: "none", estimatedNextIncomeDate: null }, { now });
  assert.equal(result.upcomingEvents.length, 0);
  assert.equal(result.knownMoneyImpactTotal, 0);
});

test("pending money-out schedule warns without fabricating a deduction", () => {
  const result = analyzeCalendarImpact({ scheduleEvents: {
    connected: true,
    source: "schedule_storage",
    upcomingEvents: [{
      id: "dental",
      title: "Dental appointment",
      date: "2026-07-06",
      amount: "",
      source: "schedule_storage",
      impactBreakdown: [{ direction: "out", pendingAmount: true, source: "manual" }],
    }],
  } }, { confidence: "none", estimatedNextIncomeDate: null }, { now });
  assert.equal(result.unknownCostEvents.length, 1);
  assert.equal(result.knownMoneyImpactTotal, 0);
});

test("non-money appointment remains visible without becoming an unknown cost", () => {
  const result = analyzeCalendarImpact({ scheduleEvents: {
    connected: true,
    source: "schedule_storage",
    upcomingEvents: [{ id: "meeting", title: "Project meeting", type: "Appointment", date: "2026-07-06", amount: "", impactBreakdown: [] }],
  } }, { confidence: "none", estimatedNextIncomeDate: null }, { now });
  assert.equal(result.upcomingEvents.length, 1);
  assert.equal(result.unknownCostEvents.length, 0);
  assert.equal(result.knownMoneyImpactTotal, 0);
});

test("money-in schedule is not counted as a spending commitment", () => {
  const result = analyzeCalendarImpact({ scheduleEvents: {
    connected: true,
    source: "schedule_storage",
    upcomingEvents: [{
      id: "refund",
      title: "Refund arrives",
      type: "Event",
      date: "2026-07-06",
      amount: 5000,
      impactBreakdown: [{ direction: "in", amount: 5000, source: "manual" }],
    }],
  } }, { confidence: "none", estimatedNextIncomeDate: null }, { now });
  assert.equal(result.knownMoneyImpactTotal, 0);
  assert.equal(result.knownMoneyInTotal, 5000);
  assert.equal(result.knownIncomeEvents.length, 1);
});

test("schedule AI reader uses only the active user's exact storage key", () => {
  const previousWindow = globalThis.window;
  const records = new Map([
    ["clara_schedule_events_v2_user-a", JSON.stringify([
      { id: "sample-bill", title: "Bill protection", date: "2026-07-03" },
      { id: "dental-a", title: "Dental appointment", date: "2026-07-06", amount: "1200" },
    ])],
    ["clara_schedule_events_v2_user-b", JSON.stringify([
      { id: "private-b", title: "Other user's appointment", date: "2026-07-04", amount: "9999" },
    ])],
  ]);

  globalThis.window = {
    localStorage: {
      getItem(key) {
        return records.get(key) || null;
      },
      key(index) {
        return [...records.keys()][index] || null;
      },
      get length() {
        return records.size;
      },
    },
  };

  try {
    const result = readScheduleEventsForAI({ user: { id: "user-a" } });
    assert.deepEqual(result.map((event) => event.id), ["dental-a"]);
    assert.equal(result.some((event) => event.id === "private-b"), false);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("debt due before next income is counted once and linked to its budget", () => {
  const result = analyzeObligations({
    debtObligations: [{ id: "loan", title: "Car Loan", monthlyDebt: 2000, dueDate: "2026-07-05" }],
    budgets: [{ id: "loan-budget", title: "Car Loan", amount: 5000, start_date: "2026-07-01", end_date: "2026-07-31" }],
  }, { confidence: "high", estimatedNextIncomeDate: "2026-07-15T00:00:00.000Z" }, { now, availableAfterPurchase: 8000 });
  assert.equal(result.totalDueBeforeNextIncome, 2000);
  assert.equal(result.alreadyProtectedByBudget, 2000);
  assert.equal(result.stillUnfunded, 0);
});

test("emergency fund contribution is recognized without duplicate commitment", () => {
  const result = analyzeGoalProtection({
    emergencyFund: { saved: 5000, target: 20000, monthlyCommitment: 1000, contributedThisMonth: 200 },
    savingsGoals: [],
    budgets: [{ id: "ef-budget", title: "Emergency Fund", amount: 1000, start_date: "2026-07-01", end_date: "2026-07-31" }],
  }, { now, safeAfterPurchase: 5000 });
  assert.equal(result.emergencyFund.stillRequiredThisCycle, 800);
  assert.equal(result.emergencyFund.contributionBudgeted, true);
});

test("life-stage context remains contextual evidence", () => {
  const supportive = analyzeLifeStageContext(
    { lifeStageContext: { hasProfile: true, lifeStage: "Working Student", dominantPressure: "Tuition pressure" } },
    { item: "School books", category: "Education" },
  );
  const conflicting = analyzeLifeStageContext(
    { lifeStageContext: { hasProfile: true, lifeStage: "Working Student", dominantPressure: "Tuition pressure" } },
    { item: "Gaming console", category: "Entertainment" },
  );
  assert.equal(supportive.relevance, "supportive");
  assert.equal(conflicting.relevance, "conflicting");
});
