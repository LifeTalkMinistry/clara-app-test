import { clean, money, safeRecord, toNumber } from "./clara-buy-check-budget-core.js";

const VALID_RISK = Object.freeze({
  BUY: new Set(["Low"]),
  "BUY WITH CAP": new Set(["Medium"]),
  REDUCE: new Set(["Medium", "High"]),
  WAIT: new Set(["High"]),
  PAUSE: new Set(["Medium", "High"]),
});

function normalizeDecision(value = "") {
  return clean(value).toUpperCase().replace(/_/g, " ");
}

function validateBuyCheckDiagnosis(value) {
  const result = safeRecord(value);
  const decision = normalizeDecision(result.decision);
  const risk = clean(result.risk);
  const saferMove = clean(result.saferMove);
  const explanation = clean(result.explanation);
  if (!VALID_RISK[decision]?.has(risk) || !saferMove) return null;
  return { ...result, decision, risk, saferMove, explanation };
}

function calculateBuyCheckDiagnosis(pkg) {
  const price = toNumber(pkg.purchase.price);
  const spendable = toNumber(pkg.finance.spendableTotal);
  const largestWallet = toNumber(pkg.finance.largestEligibleBalance);
  const budget = pkg.finance.matchingBudget;
  const assessment = pkg.finance.budgetAssessment || {};
  const signals = pkg.contextSignals || {};

  if (!price || !Number.isFinite(price)) {
    return {
      decision: "PAUSE",
      risk: "High",
      reasonCode: "INVALID_PURCHASE_AMOUNT",
      explanation: "CLARA could not measure this purchase safely because the amount is missing or invalid.",
      saferMove: "Enter a valid purchase amount before deciding.",
    };
  }

  if (assessment.dataConfidence === "low" && assessment.status !== "no_match") {
    return {
      decision: "PAUSE",
      risk: "High",
      reasonCode: "LOW_DATA_CONFIDENCE",
      explanation: "The available wallet or budget data is too incomplete for a reliable approval.",
      saferMove: "Refresh your wallet and budget records before buying.",
    };
  }

  if (assessment.protectedMoneyNeeded || signals.protectedMoneyRisk === "critical") {
    return {
      decision: "WAIT",
      risk: "High",
      reasonCode: "PROTECTED_MONEY_REQUIRED",
      explanation: "This purchase would depend on money that CLARA treats as protected or reserved.",
      saferMove: "Wait or fund the purchase from a separate spendable wallet without touching protected money.",
    };
  }

  if (assessment.status === "wallet_shortfall") {
    if (assessment.walletFundingStatus === "combined_only") {
      return {
        decision: "WAIT",
        risk: "High",
        reasonCode: "NO_SINGLE_WALLET_CAN_FUND",
        explanation: "You have enough across your wallets, but no single eligible wallet can currently fund the complete purchase.",
        saferMove: "Consolidate the money into one spendable wallet or wait.",
      };
    }
    return {
      decision: "WAIT",
      risk: "High",
      reasonCode: "ELIGIBLE_WALLET_SHORTFALL",
      explanation: `Your largest eligible wallet is ${money(Math.max(0, price - largestWallet))} short of this purchase.`,
      saferMove: "Wait until one spendable wallet can fund the full purchase.",
    };
  }

  if (assessment.status === "exhausted") {
    return {
      decision: "WAIT",
      risk: "High",
      reasonCode: "BUDGET_EXHAUSTED",
      explanation: `${budget?.title || "The matched budget"} has no remaining amount for this purchase.`,
      saferMove: "Wait until the budget is replenished or deliberately revise the budget first.",
    };
  }

  if (assessment.status === "partial") {
    const safeMaximum = Math.max(0, Math.min(toNumber(assessment.safeMaximum), largestWallet));
    return {
      decision: "REDUCE",
      risk: safeMaximum > 0 ? "Medium" : "High",
      reasonCode: "PARTIAL_BUDGET_COVERAGE",
      explanation: `${budget?.title || "The matched budget"} can only cover ${money(safeMaximum)} of this ${money(price)} purchase.`,
      saferMove: safeMaximum > 0 ? `Reduce the purchase to ${money(safeMaximum)} or below.` : "Wait until the budget has money available again.",
    };
  }

  if (assessment.status === "no_match") {
    return {
      decision: "PAUSE",
      risk: price > Math.max(1, spendable) * 0.25 ? "High" : "Medium",
      reasonCode: "NO_MATCHING_BUDGET",
      explanation: "CLARA could not find a valid active budget that owns this purchase.",
      saferMove: "Create or assign a budget for this purchase before spending.",
    };
  }

  if (signals.upcomingObligationRisk === "critical") {
    const obligation = signals.upcomingObligation;
    return {
      decision: "WAIT",
      risk: "High",
      reasonCode: "UPCOMING_OBLIGATION_CONFLICT",
      explanation: `${obligation?.title || "A near-term obligation"} needs ${money(obligation?.amount)}, and this purchase would leave too little spendable money for it.`,
      saferMove: "Protect the upcoming obligation first, then run Buy Check again.",
    };
  }

  const remaining = toNumber(budget?.remaining);
  const budgetUtilization = remaining > 0 ? price / remaining : 1;
  const spendableUtilization = spendable > 0 ? price / spendable : 1;
  const mediumRisk = budgetUtilization >= 0.75 || spendableUtilization > 0.25 || signals.repeatedImpulseRisk === "present";

  if (mediumRisk) {
    return {
      decision: "BUY WITH CAP",
      risk: "Medium",
      reasonCode: "COVERED_HIGH_UTILIZATION",
      explanation: `The purchase is covered, but it uses a large share of your ${budget?.title || "matched"} budget or spendable money.`,
      saferMove: `Do not spend more than ${money(price)}, and log the exact amount immediately.`,
    };
  }

  return {
    decision: "BUY",
    risk: "Low",
    reasonCode: "COVERED_LOW_RISK",
    explanation: `The purchase is covered by ${budget?.title || "the matched budget"}, and one eligible wallet can fund it without using protected money.`,
    saferMove: "Log the expense immediately so the remaining wallet and budget amounts stay accurate.",
  };
}

export {
  VALID_RISK,
  calculateBuyCheckDiagnosis,
  normalizeDecision,
  validateBuyCheckDiagnosis,
};
