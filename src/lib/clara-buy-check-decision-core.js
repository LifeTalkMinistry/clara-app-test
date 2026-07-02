import { clean, money, safeRecord, toNumber } from "./clara-buy-check-budget-core.js";

const VALID_RISK = Object.freeze({
  BUY: new Set(["Low"]),
  "BUY WITH CAP": new Set(["Medium"]),
  REDUCE: new Set(["Medium", "High"]),
  WAIT: new Set(["High"]),
  PAUSE: new Set(["Medium", "High"]),
  "DO NOT BUY": new Set(["High"]),
});

const USER_FACING_DECISIONS = Object.freeze({
  BUY: "SAFE TO BUY",
  "BUY WITH CAP": "BUY WITH CAUTION",
  REDUCE: "REDUCE THE AMOUNT",
  WAIT: "BETTER TO WAIT",
  PAUSE: "NOT ENOUGH INFORMATION YET",
  "DO NOT BUY": "DO NOT BUY RIGHT NOW",
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
  return { ...result, decision, userFacingDecision: result.userFacingDecision || USER_FACING_DECISIONS[decision], risk, saferMove, explanation };
}

function finding({ priority, decision, risk, reasonCode, title, explanation, saferMove, amount = null, date = null, impact = null }) {
  return { priority, decision, risk, reasonCode, title, explanation, saferMove, amount, date, impact };
}

function signedMoney(value = 0) {
  const amount = Number(value) || 0;
  return `${amount < 0 ? "-" : ""}₱${Math.abs(amount).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function impactFor(pkg, findingValue) {
  if (findingValue?.impact) return findingValue.impact;
  const safety = pkg.safety || {};
  const budget = pkg.budget || {};
  if (findingValue?.reasonCode === "PARTIAL_BUDGET_COVERAGE") {
    return { value: toNumber(budget.safeMaximum), formattedValue: money(budget.safeMaximum), label: "Safe maximum purchase amount" };
  }
  if (findingValue?.reasonCode === "NO_MATCHING_BUDGET" || findingValue?.reasonCode === "NO_ACTIVE_BUDGET") {
    return { value: toNumber(safety.safeToSpendAfterPurchase), formattedValue: signedMoney(safety.safeToSpendAfterPurchase), label: "Safe money left after purchase" };
  }
  if (Number.isFinite(Number(safety.safeToSpendAfterPurchase))) {
    return { value: toNumber(safety.safeToSpendAfterPurchase), formattedValue: signedMoney(safety.safeToSpendAfterPurchase), label: safety.safeToSpendAfterPurchase >= 0 ? "Safe money left after purchase" : "Safe money shortage after purchase" };
  }
  return null;
}

function calculateBuyCheckDiagnosis(pkgValue) {
  const pkg = safeRecord(pkgValue);
  const purchase = safeRecord(pkg.purchase);
  const finance = safeRecord(pkg.finance);
  const wallet = Object.keys(safeRecord(pkg.wallet)).length ? safeRecord(pkg.wallet) : {
    spendableTotal: finance.spendableTotal,
    largestEligibleWallet: finance.largestEligibleBalance,
    individualWalletCanFund: toNumber(finance.largestEligibleBalance) >= toNumber(purchase.price),
    combinedEnough: toNumber(finance.spendableTotal) >= toNumber(purchase.price),
    protectedMoneyNeeded: finance.budgetAssessment?.protectedMoneyNeeded,
    wallets: [],
  };
  const budget = Object.keys(safeRecord(pkg.budget)).length ? safeRecord(pkg.budget) : {
    status: finance.budgetAssessment?.status,
    selectedBudget: finance.matchingBudget,
    matchingBudget: finance.matchingBudget,
    safeMaximum: finance.budgetAssessment?.safeMaximum,
    shortfall: finance.budgetAssessment?.shortfall,
    confidence: finance.budgetAssessment?.dataConfidence,
    walletFundingStatus: finance.budgetAssessment?.walletFundingStatus,
    protectedMoneyNeeded: finance.budgetAssessment?.protectedMoneyNeeded,
  };
  const signals = safeRecord(pkg.contextSignals);
  const safety = safeRecord(pkg.safety);
  const obligations = safeRecord(pkg.obligations);
  const emergencyFund = safeRecord(pkg.emergencyFund);
  const savingsGoals = safeRecord(pkg.savingsGoals);
  const calendar = safeRecord(pkg.calendar);
  const lifeStage = safeRecord(pkg.lifeStage);
  const incomeRunway = safeRecord(pkg.incomeRunway);
  const behavior = safeRecord(pkg.behavior);
  const price = toNumber(purchase.amount ?? purchase.price);
  const spendable = toNumber(wallet.spendableTotal ?? finance.spendableTotal);
  const largestWallet = toNumber(wallet.largestEligibleWallet ?? wallet.largestEligibleBalance ?? finance.largestEligibleBalance);
  const matchedBudget = budget.selectedBudget || budget.matchingBudget || finance.matchingBudget;
  const findings = [];

  if (!price || !Number.isFinite(price)) {
    findings.push(finding({ priority: 1, decision: "PAUSE", risk: "High", reasonCode: "INVALID_PURCHASE_AMOUNT", title: "The purchase amount is missing", explanation: "CLARA could not measure this purchase safely because the amount is missing or invalid.", saferMove: "Enter a valid purchase amount before deciding." }));
  }

  const hasWalletRecords = Array.isArray(wallet.wallets) ? wallet.wallets.length > 0 : spendable > 0 || largestWallet > 0;
  if (price > 0 && !hasWalletRecords && spendable <= 0 && largestWallet <= 0) {
    findings.push(finding({ priority: 2, decision: "PAUSE", risk: "High", reasonCode: "NO_PAYABLE_WALLET", title: "No payable wallet is available", explanation: "CLARA could not find an eligible wallet that can be used for this purchase.", saferMove: "Add or refresh a spendable wallet before deciding." }));
  } else if (price > 0 && !Boolean(wallet.individualWalletCanFund ?? largestWallet >= price)) {
    if (Boolean(wallet.combinedEnough ?? spendable >= price)) {
      findings.push(finding({ priority: 2, decision: "WAIT", risk: "High", reasonCode: "NO_SINGLE_WALLET_CAN_FUND", title: "No single wallet can pay the full amount", explanation: "You have enough across your wallets, but no single eligible wallet can currently fund the complete purchase.", saferMove: "Consolidate the money into one spendable wallet or wait.", amount: Math.max(0, price - largestWallet) }));
    } else {
      findings.push(finding({ priority: 2, decision: "WAIT", risk: "High", reasonCode: "ELIGIBLE_WALLET_SHORTFALL", title: "Your spendable wallet is short", explanation: `Your largest eligible wallet is ${money(Math.max(0, price - largestWallet))} short of this purchase.`, saferMove: "Wait until one spendable wallet can fund the full purchase.", amount: Math.max(0, price - largestWallet) }));
    }
  }

  if (Boolean(wallet.protectedMoneyNeeded || budget.protectedMoneyNeeded || signals.protectedMoneyRisk === "critical")) {
    findings.push(finding({ priority: 3, decision: "DO NOT BUY", risk: "High", reasonCode: "PROTECTED_MONEY_REQUIRED", title: "This purchase would use protected money", explanation: "The purchase would depend on money reserved for savings, emergencies, goals, or another protected purpose.", saferMove: "Do not use protected money. Wait or fund the purchase from a separate spendable wallet." }));
  }

  if (obligations.conflictAfterPurchase || signals.upcomingObligationRisk === "critical") {
    const obligation = obligations.nearestDueObligation || signals.upcomingObligation;
    findings.push(finding({ priority: 4, decision: "DO NOT BUY", risk: "High", reasonCode: "UPCOMING_OBLIGATION_CONFLICT", title: `${obligation?.title || "An upcoming obligation"} needs protection`, explanation: `${obligation?.title || "A near-term obligation"} needs ${money(obligation?.amount)}, and this purchase would leave too little spendable money for it.`, saferMove: "Protect the upcoming obligation first, then run Buy Check again.", amount: toNumber(obligation?.amount), date: obligation?.dueDate || obligation?.date || null }));
  }

  if (Number.isFinite(Number(safety.safeToSpendAfterPurchase)) && Number(safety.safeToSpendAfterPurchase) < 0) {
    findings.push(finding({ priority: 5, decision: "DO NOT BUY", risk: "High", reasonCode: "NEGATIVE_SAFE_TO_SPEND", title: "The purchase would create a money shortage", explanation: `After protecting recorded commitments, this purchase would leave a ${money(Math.abs(safety.safeToSpendAfterPurchase))} safe-to-spend shortage.`, saferMove: "Wait, reduce the purchase, or fund the missing amount without touching protected commitments.", amount: Math.abs(toNumber(safety.safeToSpendAfterPurchase)) }));
  }

  if (emergencyFund.wouldRequireWithdrawal || savingsGoals.wouldRequireWithdrawal) {
    findings.push(finding({ priority: 6, decision: "DO NOT BUY", risk: "High", reasonCode: "PROTECTED_GOAL_WITHDRAWAL_REQUIRED", title: "The purchase would require protected savings", explanation: "Buying now would require money already saved for an emergency fund or savings goal.", saferMove: "Do not withdraw protected progress for an ordinary purchase." }));
  }

  const days = Number(incomeRunway.daysUntilNextIncome);
  const runwayUnsafe = Number.isFinite(days) && days > 0 && Number(safety.safeToSpendAfterPurchase) >= 0 && Number(safety.safeToSpendAfterPurchase) < toNumber(safety.survivalReserve);
  if (runwayUnsafe) {
    findings.push(finding({ priority: 7, decision: "WAIT", risk: "High", reasonCode: "UNSAFE_INCOME_RUNWAY", title: `Your remaining money must last ${days} more day${days === 1 ? "" : "s"}`, explanation: "The purchase is technically payable, but it would leave too little safe money before the next reliable income.", saferMove: "Wait until the next income arrives or reduce the purchase amount." }));
  }

  if (emergencyFund.wouldBeAffected && toNumber(emergencyFund.stillRequiredThisCycle) > 0) {
    findings.push(finding({ priority: 9, decision: "WAIT", risk: "High", reasonCode: "EMERGENCY_FUND_COMMITMENT_AT_RISK", title: "Your emergency fund commitment is still due", explanation: `This purchase would interfere with the remaining ${money(emergencyFund.stillRequiredThisCycle)} emergency fund commitment for this cycle.`, saferMove: "Complete the emergency fund commitment first or reduce the purchase.", amount: toNumber(emergencyFund.stillRequiredThisCycle) }));
  }

  if (savingsGoals.wouldBeAffected && toNumber(savingsGoals.stillRequiredThisCycle) > 0) {
    findings.push(finding({ priority: 10, decision: "WAIT", risk: "High", reasonCode: "SAVINGS_COMMITMENT_AT_RISK", title: `${savingsGoals.highestPriorityGoal?.name || "A savings goal"} would be affected`, explanation: "This purchase would reduce money still needed for recorded savings commitments this cycle.", saferMove: "Protect the goal contribution first or reduce the purchase.", amount: toNumber(savingsGoals.stillRequiredThisCycle) }));
  }

  if (budget.status === "exhausted") {
    findings.push(finding({ priority: 11, decision: "WAIT", risk: "High", reasonCode: "BUDGET_EXHAUSTED", title: `${matchedBudget?.title || "The matched budget"} is already used`, explanation: `${matchedBudget?.title || "The matched budget"} has no remaining amount for this purchase.`, saferMove: "Wait until the budget is replenished or deliberately revise the budget first." }));
  }

  if (budget.status === "partial") {
    const safeMaximum = Math.max(0, Math.min(toNumber(budget.safeMaximum), largestWallet));
    findings.push(finding({ priority: 12, decision: "REDUCE", risk: safeMaximum > 0 ? "Medium" : "High", reasonCode: "PARTIAL_BUDGET_COVERAGE", title: "The purchase is only partly covered", explanation: `${matchedBudget?.title || "The matched budget"} can only cover ${money(safeMaximum)} of this ${money(price)} purchase.`, saferMove: safeMaximum > 0 ? `Reduce the purchase to ${money(safeMaximum)} or below.` : "Wait until the budget has money available again.", amount: safeMaximum }));
  }

  if (calendar.knownMoneyImpactTotal > 0 && Number(safety.safeToSpendAfterPurchase) < 0) {
    findings.push(finding({ priority: 13, decision: "WAIT", risk: "High", reasonCode: "CALENDAR_COST_CONFLICT", title: "An upcoming event needs this money", explanation: `Recorded events before the next income need ${money(calendar.knownMoneyImpactTotal)}, and buying now would leave too little safe money.`, saferMove: "Protect the known event costs first, then run Buy Check again.", amount: toNumber(calendar.knownMoneyImpactTotal) }));
  }

  if (budget.status === "no_budget") {
    findings.push(finding({ priority: 14, decision: "PAUSE", risk: price > Math.max(1, spendable) * 0.25 ? "High" : "Medium", reasonCode: "NO_ACTIVE_BUDGET", title: "No active budget can verify this purchase", explanation: "CLARA can check wallet liquidity, but it cannot fully verify purchase safety because no active budget is configured.", saferMove: "Set up or assign a budget before spending." }));
  } else if (budget.status === "no_match") {
    findings.push(finding({ priority: 15, decision: "PAUSE", risk: price > Math.max(1, spendable) * 0.25 ? "High" : "Medium", reasonCode: "NO_MATCHING_BUDGET", title: "This purchase is outside your current budget", explanation: "CLARA checked the active budgets but found no category that safely owns this purchase.", saferMove: "Assign or create a budget for this purchase before spending." }));
  }

  const remaining = toNumber(matchedBudget?.remaining ?? budget.remainingBefore);
  const budgetUtilization = remaining > 0 ? price / remaining : 1;
  const spendableUtilization = spendable > 0 ? price / spendable : 1;
  const safeBefore = toNumber(safety.safeToSpendBeforePurchase || spendable);
  const safeUtilization = safeBefore > 0 ? price / safeBefore : 1;
  if (budget.status === "full" && (budgetUtilization >= 0.75 || spendableUtilization > 0.25 || safeUtilization > 0.25)) {
    findings.push(finding({ priority: 17, decision: "BUY WITH CAP", risk: "Medium", reasonCode: "COVERED_HIGH_UTILIZATION", title: "The purchase is covered but uses a large share", explanation: `The purchase is covered, but it uses a large share of your ${matchedBudget?.title || "matched"} budget or safe-to-spend money.`, saferMove: `Do not spend more than ${money(price)}, and log the exact amount immediately.` }));
  }

  if (["none", "low"].includes(incomeRunway.confidence) || signals.paydayTimingRisk === "uncertain") {
    findings.push(finding({ priority: 19, decision: "BUY WITH CAP", risk: "Medium", reasonCode: "INCOME_TIMING_UNCERTAIN", title: "Your next income date is uncertain", explanation: "CLARA could not confirm a reliable next-income date, so the purchase carries more timing risk.", saferMove: "Keep a larger cash buffer or wait until the next income is confirmed." }));
  }

  if (Array.isArray(calendar.unknownCostEvents) && calendar.unknownCostEvents.length > 0) {
    findings.push(finding({ priority: 20, decision: "BUY WITH CAP", risk: "Medium", reasonCode: "UNKNOWN_CALENDAR_COST", title: "An upcoming event has no recorded cost", explanation: "You have an upcoming event before the next income, but no expected cost is recorded.", saferMove: "Estimate the event cost before committing to this purchase." }));
  }

  if (lifeStage.relevance === "conflicting" || signals.lifeStageRisk === "present") {
    findings.push(finding({ priority: 21, decision: "BUY WITH CAP", risk: "Medium", reasonCode: "LIFE_STAGE_PRIORITY_CONFLICT", title: "The purchase competes with current priorities", explanation: lifeStage.stage ? `Your ${lifeStage.stage} context shows other priorities that should remain protected.` : "Your current financial context shows other priorities that should remain protected.", saferMove: "Confirm that the purchase will not reduce money reserved for those priorities." }));
  }

  if (behavior.repeatedImpulseRisk === "present" || signals.repeatedImpulseRisk === "present") {
    findings.push(finding({ priority: 22, decision: "BUY WITH CAP", risk: "Medium", reasonCode: "REPEATED_IMPULSE_PATTERN", title: "A previous spending pattern adds caution", explanation: "Saved behavior signals suggest this type of decision may be connected to impulse or regret patterns.", saferMove: "Keep the amount capped and avoid adding related purchases." }));
  }

  if (!findings.length) {
    findings.push(finding({ priority: 30, decision: "BUY", risk: "Low", reasonCode: "COVERED_LOW_RISK", title: "The purchase fits your current plan", explanation: `The purchase is covered by ${matchedBudget?.title || "the matched budget"}, and one eligible wallet can fund it without using protected money or recorded commitments.`, saferMove: "Log the expense immediately so the remaining wallet and budget amounts stay accurate." }));
  }

  const sorted = findings.sort((left, right) => left.priority - right.priority);
  const dominant = sorted[0];
  const result = {
    decision: dominant.decision,
    userFacingDecision: USER_FACING_DECISIONS[dominant.decision],
    risk: dominant.risk,
    reasonCode: dominant.reasonCode,
    explanation: dominant.explanation,
    saferMove: dominant.saferMove,
    dominantFinding: { title: dominant.title, explanation: dominant.explanation, amount: dominant.amount, date: dominant.date, reasonCode: dominant.reasonCode },
    supportingFindings: sorted.slice(1).map((item) => ({ title: item.title, explanation: item.explanation, reasonCode: item.reasonCode, risk: item.risk, amount: item.amount, date: item.date })),
  };
  result.impact = impactFor(pkg, dominant);
  return result;
}

export {
  VALID_RISK,
  USER_FACING_DECISIONS,
  calculateBuyCheckDiagnosis,
  normalizeDecision,
  validateBuyCheckDiagnosis,
};
