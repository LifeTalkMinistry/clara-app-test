import {
  buildContextPackage,
  clean,
  money,
  remainingOrShortfall,
  safeRecord,
  toNumber,
} from "@/lib/clara-buy-check-budget-intelligence";
import {
  getClaraGeminiProxyModelCandidates,
  requestClaraGeminiProxyJson,
} from "@/lib/clara-gemini-proxy-client";
import {
  calculateBuyCheckDiagnosis,
  validateBuyCheckDiagnosis,
} from "@/lib/clara-buy-check-decision-core";

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
  const prompt = `You are CLARA explaining a deterministic Buy Check result. The local financial engine has already made the final decision. You are not allowed to change the decision, risk, money amounts, budget, wallet facts, or safer move.

Final decision: ${diagnosis.decision}
Risk: ${diagnosis.risk}
Reason code: ${diagnosis.reasonCode}
Deterministic explanation: ${diagnosis.explanation}
Deterministic safer move: ${diagnosis.saferMove}

Purchase and verified context:
${JSON.stringify(pkg, null, 2)}

Return valid JSON only:
{
  "explanation": "one or two natural sentences that preserve the verified facts",
  "saferMoveExplanation": "one clear action that preserves the deterministic safer move"
}

Match the user's language, including Taglish when supported by their reason. Do not invent facts, advice, money, urgency, or personal details.`;

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
  const price = toNumber(pkg.purchase.price);
  const budget = pkg.finance.matchingBudget;
  const assessment = pkg.finance.budgetAssessment || {};
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
  return {
    title: "Budget check",
    stat: "No safe match",
    body: `CLARA checked ${assessment.scannedBudgetCount || 0} active budget${assessment.scannedBudgetCount === 1 ? "" : "s"}, but found no budget that safely owns this purchase.`,
    note: "Create or assign a budget before spending so the decision can be measured properly.",
  };
}

function buildReportCards(pkg, diagnosis) {
  const price = toNumber(pkg.purchase.price);
  const spendable = toNumber(pkg.finance.spendableTotal);
  const largestWallet = toNumber(pkg.finance.largestEligibleBalance);
  const budgetCard = buildBuyCheckBudgetCardCopy(pkg);
  const goal = pkg.finance.savingsGoals?.[0] || null;
  const emergency = pkg.finance.emergencyFund;
  return [
    {
      eyebrow: "01 / PURCHASE",
      title: pkg.purchase.item,
      stat: money(price),
      body: `Reason: ${pkg.purchase.reason || "No reason recorded"}. Category: ${pkg.purchase.category}.`,
      note: "What you want to buy and why it matters.",
    },
    {
      eyebrow: "02 / WALLET",
      title: "Spendable money",
      stat: money(spendable),
      body: `${remainingOrShortfall(spendable - price)} across spendable wallets after this purchase. Largest eligible wallet: ${money(largestWallet)}.`,
      note: "Protected and reserved money was excluded.",
    },
    { eyebrow: "03 / BUDGET", ...budgetCard },
    {
      eyebrow: "04 / PROTECTION",
      title: goal?.name || goal?.title || "Goals and emergency fund",
      stat: pkg.finance.reservedAmount > 0 ? money(pkg.finance.reservedAmount) : goal || emergency ? "Protected" : "No record",
      body: pkg.contextSignals?.protectedMoneyRisk === "critical"
        ? "This purchase would require protected or reserved money."
        : "The current decision does not require protected money.",
      note: "Protected progress should not fund ordinary spending.",
    },
    {
      eyebrow: "05 / TIMING & PATTERN",
      title: "Context check",
      stat: pkg.contextSignals?.upcomingObligationRisk === "critical" ? "Conflict found" : "Checked",
      body: `Upcoming obligation risk: ${pkg.contextSignals?.upcomingObligationRisk || "none"}. Pattern signal: ${pkg.memory}`,
      note: "Only supported timing and saved-pattern signals affect the decision.",
    },
    {
      eyebrow: "06 / FINAL DECISION",
      title: diagnosis.decision,
      stat: `Risk: ${diagnosis.risk}`,
      body: diagnosis.explanation,
      note: `Safer move: ${diagnosis.saferMove}`,
      final: true,
      decision: diagnosis.decision,
    },
  ];
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
  return { ...result, contextPackage: pkg, cards: buildReportCards(pkg, result) };
}

export {
  calculateBuyCheckDiagnosis,
  explainBuyCheckDiagnosis,
  validateBuyCheckDiagnosis,
};
