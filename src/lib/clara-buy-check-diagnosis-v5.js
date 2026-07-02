import {
  buildContextPackage,
  clean,
  money,
  remainingOrShortfall,
  safeRecord,
  signedMoney,
  toNumber,
} from "./clara-buy-check-budget-intelligence.js";
import {
  getClaraGeminiProxyModelCandidates,
  requestClaraGeminiProxyJson,
} from "./clara-gemini-proxy-client.js";
import {
  calculateBuyCheckDiagnosis,
  validateBuyCheckDiagnosis,
} from "./clara-buy-check-decision-core.js";

function parseJsonObject(value = "") {
  const source = String(value || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return safeRecord(JSON.parse(source));
  } catch {
    return null;
  }
}

async function explainBuyCheckDiagnosis({ diagnosis, pkg }) {
  const fallback = {
    explanation: diagnosis.explanation,
    saferMoveExplanation: diagnosis.saferMove,
    source: "deterministic",
  };
  const prompt = `You are CLARA explaining a deterministic Buy Check result. The local financial engine has already made the final decision. You are not allowed to change the decision, risk, money amounts, budget, wallet facts, income timing, obligations, goals, calendar facts, or safer move.

Final decision: ${diagnosis.decision}
User-facing decision: ${diagnosis.userFacingDecision}
Risk: ${diagnosis.risk}
Reason code: ${diagnosis.reasonCode}
Deterministic explanation: ${diagnosis.explanation}
Deterministic safer move: ${diagnosis.saferMove}

Verified context:
${JSON.stringify(pkg, null, 2)}

Return valid JSON only:
{
  "explanation": "one or two natural sentences that preserve every verified fact",
  "saferMoveExplanation": "one clear action that preserves the deterministic safer move"
}

Match the user's language, including Taglish when supported by their reason. Do not invent facts, dates, advice, amounts, urgency, or personal details.`;

  for (const model of getClaraGeminiProxyModelCandidates()) {
    try {
      const raw = await requestClaraGeminiProxyJson({
        prompt,
        model,
        generationConfig: { temperature: 0.2, topP: 0.8, maxOutputTokens: 220 },
      });
      const parsed = parseJsonObject(raw);
      const explanation = clean(parsed?.explanation);
      const saferMoveExplanation = clean(parsed?.saferMoveExplanation);
      if (explanation.length >= 20 && saferMoveExplanation.length >= 10) {
        return { explanation, saferMoveExplanation, source: "ai", model };
      }
    } catch (error) {
      console.warn("[CLARA Buy Check] Dedicated explanation model failed safely.", error);
    }
  }
  return fallback;
}

export function buildBuyCheckBudgetCardCopy(pkg) {
  const price = toNumber(pkg.purchase.price ?? pkg.purchase.amount);
  const budget = pkg.finance?.matchingBudget || pkg.budget?.selectedBudget;
  const assessment = pkg.finance?.budgetAssessment || pkg.budget || {};
  if (assessment.status === "full" && budget) {
    return {
      title: `${budget.title} budget`,
      stat: money(budget.remaining),
      body: `This purchase is covered. You have ${money(budget.remaining)} available, and ${money(budget.remainingAfter)} will remain after buying.`,
      note: `Spending source: ${budget.spentSource || "verified budget data"}.`,
    };
  }
  if (assessment.status === "wallet_shortfall" && budget) {
    return {
      title: `${budget.title} budget`,
      stat: money(budget.remaining),
      body: assessment.walletFundingStatus === "combined_only"
        ? `The budget can cover ${money(price)}, but no single eligible wallet can fund the full purchase.`
        : `The budget can cover ${money(price)}, but the largest eligible wallet is short by ${money(assessment.walletShortfall)}.`,
      note: "A budget allocation is not the same as available money in one payable wallet.",
    };
  }
  if ((assessment.status === "partial" || assessment.status === "exhausted") && budget) {
    return {
      title: `${budget.title} budget`,
      stat: money(budget.remaining),
      body: budget.remaining > 0
        ? `Only ${money(budget.remaining)} remains, so this ${money(price)} purchase is ${money(assessment.shortfall)} over budget.`
        : `This budget is already fully used, so the entire ${money(price)} purchase is outside the current plan.`,
      note: assessment.flexibleBudgetCount > 0
        ? "CLARA also checked available flexible budgets, but none could fully cover the purchase."
        : "No other matched budget could fully cover the purchase.",
    };
  }
  if (assessment.status === "no_budget") {
    return {
      title: "Budget check",
      stat: "No active budget",
      body: "CLARA can check wallet liquidity, but no active budget is configured to verify this purchase.",
      note: "Set up or assign a budget for a complete result.",
    };
  }
  return {
    title: "Budget check",
    stat: "No safe match",
    body: `CLARA checked ${assessment.scannedBudgetCount || 0} active budget${assessment.scannedBudgetCount === 1 ? "" : "s"}, but found no budget that safely owns this purchase.`,
    note: "Create or assign a budget before spending so the decision can be measured properly.",
  };
}

function dateLabel(value) {
  if (!value) return "No reliable date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No reliable date";
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(date);
}

function buildDetailCards(pkg, diagnosis) {
  const cards = [];
  const price = toNumber(pkg.purchase.price ?? pkg.purchase.amount);
  const budgetCard = buildBuyCheckBudgetCardCopy(pkg);
  cards.push({
    eyebrow: "01 / DECISION SUMMARY",
    title: diagnosis.userFacingDecision || diagnosis.decision,
    stat: `Risk: ${diagnosis.risk}`,
    body: diagnosis.explanation,
    note: `Safer move: ${diagnosis.saferMove}`,
    final: true,
    decision: diagnosis.decision,
  });

  if (pkg.incomeRunway?.connected) {
    cards.push({
      eyebrow: "02 / INCOME RUNWAY",
      title: pkg.incomeRunway.estimatedNextIncomeDate ? "Next income estimate" : "Income timing unavailable",
      stat: pkg.incomeRunway.daysUntilNextIncome === null ? "Unconfirmed" : `${pkg.incomeRunway.daysUntilNextIncome} day${pkg.incomeRunway.daysUntilNextIncome === 1 ? "" : "s"}`,
      body: pkg.incomeRunway.estimatedNextIncomeDate
        ? `${pkg.incomeRunway.sourceName || "Your income"} is estimated around ${dateLabel(pkg.incomeRunway.estimatedNextIncomeDate)}.`
        : "CLARA could not confirm a reliable next-income date from the available history.",
      note: `Confidence: ${pkg.incomeRunway.confidence || "none"}.`,
    });
  }

  cards.push({
    eyebrow: "03 / WALLET LIQUIDITY",
    title: "Spendable money",
    stat: money(pkg.wallet?.spendableTotal ?? pkg.finance?.spendableTotal),
    body: `${remainingOrShortfall((pkg.wallet?.spendableTotal ?? pkg.finance?.spendableTotal) - price)} across spendable wallets after this purchase. Largest eligible wallet: ${money(pkg.wallet?.largestEligibleWallet ?? pkg.finance?.largestEligibleBalance)}.`,
    note: "Protected wallets and wallet-level reservations were excluded.",
  });

  if (pkg.safety) {
    cards.push({
      eyebrow: "04 / SAFE TO SPEND",
      title: "After protected commitments",
      stat: signedMoney(pkg.safety.safeToSpendAfterPurchase),
      body: `${money(pkg.safety.commitmentsBeforeNextIncome)} is reserved for recorded commitments before the next income window.`,
      note: `Data confidence: ${pkg.safety.dataConfidence}.`,
    });
  }

  cards.push({ eyebrow: "05 / BUDGET", ...budgetCard });

  if (pkg.obligations?.connected) {
    cards.push({
      eyebrow: "06 / DEBT & OBLIGATIONS",
      title: pkg.obligations.nearestDueObligation?.title || "Recorded obligations",
      stat: money(pkg.obligations.totalDueBeforeNextIncome),
      body: pkg.obligations.dueBeforeNextIncome?.length
        ? `${pkg.obligations.dueBeforeNextIncome.length} recorded obligation${pkg.obligations.dueBeforeNextIncome.length === 1 ? " is" : "s are"} due inside the current decision window.`
        : "No recorded debt obligation is due inside the current decision window.",
      note: `${money(pkg.obligations.alreadyProtectedByBudget)} is linked to matching budget protection.`,
    });
  }

  if (pkg.emergencyFund?.configured) {
    cards.push({
      eyebrow: "07 / EMERGENCY FUND",
      title: pkg.emergencyFund.targetComplete ? "Target completed" : "Emergency protection",
      stat: money(pkg.emergencyFund.savedAmount),
      body: pkg.emergencyFund.stillRequiredThisCycle > 0
        ? `${money(pkg.emergencyFund.stillRequiredThisCycle)} remains in the recorded commitment for this cycle.`
        : "No unfinished emergency fund contribution was detected for this cycle.",
      note: pkg.emergencyFund.wouldBeAffected ? "This purchase would affect the current commitment." : "The current commitment remains protected.",
    });
  }

  if (pkg.savingsGoals?.records?.length) {
    cards.push({
      eyebrow: "08 / SAVINGS GOALS",
      title: pkg.savingsGoals.highestPriorityGoal?.name || "Savings goals",
      stat: money(pkg.savingsGoals.stillRequiredThisCycle),
      body: pkg.savingsGoals.stillRequiredThisCycle > 0
        ? "This is the remaining recorded contribution across active goals for the current cycle."
        : "No unfinished savings contribution was detected for this cycle.",
      note: pkg.savingsGoals.wouldBeAffected ? "The purchase may delay recorded goal progress." : "Recorded goal commitments remain protected.",
    });
  }

  if (pkg.lifeStage?.hasProfile) {
    cards.push({
      eyebrow: "09 / LIFE STAGE",
      title: pkg.lifeStage.stage || "Current context",
      stat: pkg.lifeStage.relevance || "neutral",
      body: pkg.lifeStage.dominantPressures?.length
        ? `Current pressure: ${pkg.lifeStage.dominantPressures[0]}.`
        : "No dominant Life Stage pressure was used to change the financial facts.",
      note: "Life Stage adds context but cannot override verified money data.",
    });
  }

  if (pkg.calendar?.connected && (pkg.calendar.eventsBeforeNextIncome?.length || pkg.calendar.unknownCostEvents?.length)) {
    cards.push({
      eyebrow: "10 / CALENDAR",
      title: pkg.calendar.nextRelevantEvent?.title || "Upcoming events",
      stat: money(pkg.calendar.knownMoneyImpactTotal),
      body: pkg.calendar.unknownCostEvents?.length
        ? `${pkg.calendar.unknownCostEvents.length} upcoming event${pkg.calendar.unknownCostEvents.length === 1 ? " has" : "s have"} no recorded cost.`
        : "Known event costs inside the decision window were included once.",
      note: `Window basis: ${pkg.calendar.horizonBasis === "next_reliable_income" ? "before next reliable income" : "next 14 days"}.`,
    });
  }

  if (pkg.behavior?.recentPatterns?.length) {
    cards.push({
      eyebrow: "11 / SPENDING PATTERN",
      title: "Saved pattern signal",
      stat: pkg.behavior.repeatedImpulseRisk === "present" ? "Caution" : "Checked",
      body: pkg.behavior.memorySummary,
      note: "Behavioral context can increase caution but cannot invent financial facts.",
    });
  }

  cards.push({
    eyebrow: "12 / FINAL CALCULATION",
    title: "Purchase impact",
    stat: diagnosis.impact?.formattedValue || signedMoney(pkg.safety?.safeToSpendAfterPurchase),
    body: diagnosis.impact?.label || "Safe money left after purchase",
    note: `Purchase amount: ${money(price)}.`,
  });

  return cards;
}

export async function diagnoseBuyCheck(flow, context) {
  const pkg = buildContextPackage(flow, context);
  const deterministic = validateBuyCheckDiagnosis(calculateBuyCheckDiagnosis(pkg));
  if (!deterministic) throw new Error("CLARA produced an invalid deterministic Buy Check result.");
  const explanation = await explainBuyCheckDiagnosis({ diagnosis: deterministic, pkg });
  const result = {
    ...deterministic,
    explanation: explanation.explanation || deterministic.explanation,
    saferMove: explanation.saferMoveExplanation || deterministic.saferMove,
    explanationSource: explanation.source,
  };
  result.dominantFinding = {
    ...result.dominantFinding,
    explanation: result.explanation,
  };
  result.summaryCard = {
    eyebrow: "BUY CHECK",
    verdict: result.userFacingDecision || result.decision,
    explanation: result.explanation,
    impactValue: result.impact?.formattedValue || signedMoney(pkg.safety?.safeToSpendAfterPurchase),
    impactLabel: result.impact?.label || "Safe money left after purchase",
    informationLabel: "Why this result?",
  };
  const detailCards = buildDetailCards(pkg, result);
  return { ...result, contextPackage: pkg, detailCards, cards: detailCards };
}

export {
  calculateBuyCheckDiagnosis,
  explainBuyCheckDiagnosis,
  validateBuyCheckDiagnosis,
};
