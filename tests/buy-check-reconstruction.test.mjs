import test from "node:test";
import assert from "node:assert/strict";
import { analyzeIncomeRunway } from "../src/lib/clara-buy-check-income-runway-engine.js";
import { analyzeCalendarImpact } from "../src/lib/clara-buy-check-calendar-engine.js";
import { analyzeObligations } from "../src/lib/clara-buy-check-obligation-engine.js";
import { analyzeGoalProtection } from "../src/lib/clara-buy-check-goal-protection-engine.js";
import { analyzeLifeStageContext } from "../src/lib/clara-buy-check-life-stage-engine.js";
import { calculateBuyCheckDiagnosis, validateBuyCheckDiagnosis } from "../src/lib/clara-buy-check-decision-core.js";

const now = "2026-07-02T00:00:00.000Z";
const income = (date, amount = 10000, source = "Salary") => ({ id: `${source}-${date}`, date, amount, incomeSourceName: source });

function coveredPkg(overrides = {}) {
  return {
    purchase: { item: "Food", amount: 500, price: 500, category: "Food" },
    wallet: { wallets: [{ id: "cash" }], spendableTotal: 10000, largestEligibleWallet: 10000, individualWalletCanFund: true, combinedEnough: true, protectedMoneyNeeded: false },
    budget: { status: "full", selectedBudget: { title: "Food", remaining: 5000 }, safeMaximum: 5000, confidence: "high" },
    obligations: { conflictAfterPurchase: false, dueBeforeNextIncome: [] },
    emergencyFund: { wouldRequireWithdrawal: false, wouldBeAffected: false },
    savingsGoals: { wouldRequireWithdrawal: false, wouldBeAffected: false },
    calendar: { knownMoneyImpactTotal: 0, unknownCostEvents: [] },
    lifeStage: { relevance: "neutral" },
    behavior: { repeatedImpulseRisk: "none" },
    safety: { safeToSpendBeforePurchase: 10000, safeToSpendAfterPurchase: 9500, survivalReserve: 0 },
    incomeRunway: { confidence: "high", daysUntilNextIncome: 8 },
    contextSignals: { protectedMoneyRisk: "none", upcomingObligationRisk: "none", repeatedImpulseRisk: "none" },
    ...overrides,
  };
}

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

test("one income record does not invent a payday", () => {
  const result = analyzeIncomeRunway({ incomeHubSnapshot: { connected: true, timeline: [income("2026-06-30T00:00:00.000Z")] } }, { now });
  assert.equal(result.confidence, "low");
  assert.equal(result.estimatedNextIncomeDate, null);
  assert.equal(result.daysUntilNextIncome, null);
});

test("irregular income intervals remain low confidence", () => {
  const result = analyzeIncomeRunway({ incomeHubSnapshot: { connected: true, timeline: [
    income("2026-04-01T00:00:00.000Z"),
    income("2026-04-08T00:00:00.000Z"),
    income("2026-05-12T00:00:00.000Z"),
    income("2026-06-30T00:00:00.000Z"),
  ] } }, { now });
  assert.equal(result.confidence, "low");
  assert.equal(result.estimatedNextIncomeDate, null);
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

test("unknown calendar cost creates a warning without a fabricated deduction", () => {
  const result = analyzeCalendarImpact({ scheduleEvents: {
    connected: true,
    source: "schedule_storage",
    upcomingEvents: [{ id: "church", title: "Church event", date: "2026-07-06", amount: "", source: "schedule_storage" }],
  } }, { confidence: "none", estimatedNextIncomeDate: null }, { now });
  assert.equal(result.unknownCostEvents.length, 1);
  assert.equal(result.knownMoneyImpactTotal, 0);
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

test("working student context supports school purchases and cautions discretionary ones", () => {
  const supportive = analyzeLifeStageContext({ lifeStageContext: { hasProfile: true, lifeStage: "Working Student", dominantPressure: "Tuition pressure" } }, { item: "School books", category: "Education" });
  const conflicting = analyzeLifeStageContext({ lifeStageContext: { hasProfile: true, lifeStage: "Working Student", dominantPressure: "Tuition pressure" } }, { item: "Gaming console", category: "Entertainment" });
  assert.equal(supportive.relevance, "supportive");
  assert.equal(conflicting.relevance, "conflicting");
});

test("obligation conflict outranks a missing budget match", () => {
  const diagnosis = calculateBuyCheckDiagnosis(coveredPkg({
    budget: { status: "no_match", selectedBudget: null, confidence: "medium" },
    obligations: { conflictAfterPurchase: true, nearestDueObligation: { title: "Rent", amount: 5000, dueDate: "2026-07-05" }, dueBeforeNextIncome: [{ title: "Rent", amount: 5000 }] },
  }));
  assert.equal(diagnosis.decision, "DO NOT BUY");
  assert.equal(diagnosis.reasonCode, "UPCOMING_OBLIGATION_CONFLICT");
});

test("protected money requirement overrides full budget coverage", () => {
  const diagnosis = calculateBuyCheckDiagnosis(coveredPkg({
    wallet: { wallets: [{ id: "emergency" }], spendableTotal: 500, largestEligibleWallet: 500, individualWalletCanFund: true, combinedEnough: true, protectedMoneyNeeded: true },
  }));
  assert.equal(diagnosis.decision, "DO NOT BUY");
  assert.equal(diagnosis.reasonCode, "PROTECTED_MONEY_REQUIRED");
});

test("negative safe-to-spend overrides budget approval", () => {
  const diagnosis = calculateBuyCheckDiagnosis(coveredPkg({ safety: { safeToSpendBeforePurchase: 300, safeToSpendAfterPurchase: -200, survivalReserve: 0 } }));
  assert.equal(diagnosis.decision, "DO NOT BUY");
  assert.equal(diagnosis.reasonCode, "NEGATIVE_SAFE_TO_SPEND");
});

test("fully safe verified context produces BUY", () => {
  const diagnosis = calculateBuyCheckDiagnosis(coveredPkg());
  assert.equal(diagnosis.decision, "BUY");
  assert.equal(diagnosis.userFacingDecision, "SAFE TO BUY");
});

test("decision-risk validation supports DO NOT BUY only at high risk", () => {
  assert.equal(validateBuyCheckDiagnosis({ decision: "DO NOT BUY", risk: "Low", saferMove: "Wait." }), null);
  assert.equal(validateBuyCheckDiagnosis({ decision: "DO NOT BUY", risk: "High", saferMove: "Wait." }).decision, "DO NOT BUY");
});
