import {
  buildContextPackage,
  clean,
  money,
  safeList,
  safeRecord,
  signedMoney,
  toNumber,
} from "./clara-buy-check-budget-intelligence.js";
import { requestGeminiJson } from "./clara-gemini-json-utils.js";

const VALID_DECISIONS = new Set(["BUY", "WAIT", "PAUSE"]);
const VALID_CONFIDENCE = new Set(["high", "medium", "low"]);
const USER_FACING_DECISIONS = Object.freeze({
  BUY: "SAFE TO BUY",
  WAIT: "BETTER TO WAIT",
  PAUSE: "PAUSE FOR NOW",
});

function compactRecord(value) {
  const source = safeRecord(value);
  return Object.fromEntries(
    Object.entries(source).filter(([, entry]) => entry !== undefined && entry !== null && entry !== ""),
  );
}

function trimText(value = "", max = 320) {
  return clean(value).slice(0, max);
}

function buildDecisionRelevantContext(pkgValue = {}) {
  const pkg = safeRecord(pkgValue);
  const purchase = safeRecord(pkg.purchase);
  const wallet = safeRecord(pkg.wallet);
  const budget = safeRecord(pkg.budget);
  const income = safeRecord(pkg.incomeRunway);
  const obligations = safeRecord(pkg.obligations);
  const emergencyFund = safeRecord(pkg.emergencyFund);
  const savingsGoals = safeRecord(pkg.savingsGoals);
  const calendar = safeRecord(pkg.calendar);
  const behavior = safeRecord(pkg.behavior);
  const lifeStage = safeRecord(pkg.lifeStage);
  const safety = safeRecord(pkg.safety);
  const price = toNumber(purchase.price ?? purchase.amount);
  const spendable = toNumber(wallet.spendableTotal ?? pkg.finance?.spendableTotal);
  const selectedBudget = safeRecord(budget.selectedBudget || budget.matchingBudget || pkg.finance?.matchingBudget);
  const highestPriorityGoal = safeRecord(savingsGoals.highestPriorityGoal);
  const nearestObligation = safeRecord(obligations.nearestDueObligation);

  const context = {
    purchase: compactRecord({
      item: trimText(purchase.item, 120),
      price,
      reason: trimText(purchase.reason, 360),
      category: trimText(purchase.category || purchase.categoryLabel, 100),
      planningStatus: trimText(purchase.planningStatus, 80),
      urgency: trimText(purchase.urgency, 80),
    }),
    liquidity: compactRecord({
      spendableWalletMoney: spendable,
      largestEligibleWallet: toNumber(wallet.largestEligibleWallet ?? wallet.largestEligibleBalance),
      moneyAfterPurchase: spendable - price,
      walletFundingStatus: trimText(wallet.walletFundingStatus, 100),
      protectedMoneyNeeded: Boolean(wallet.protectedMoneyNeeded),
      protectedTotal: toNumber(wallet.protectedTotal),
      reservedAmount: toNumber(wallet.reservedAmount),
    }),
    budget: compactRecord({
      status: trimText(budget.status, 80),
      confidence: trimText(budget.confidence, 40),
      title: trimText(selectedBudget.title, 120),
      remainingBefore: toNumber(budget.remainingBefore ?? selectedBudget.remaining),
      remainingAfter: toNumber(budget.remainingAfter ?? selectedBudget.remainingAfter),
      shortfall: toNumber(budget.shortfall),
      walletShortfall: toNumber(budget.walletShortfall),
      walletFundingStatus: trimText(budget.walletFundingStatus, 100),
    }),
    incomeTiming: compactRecord({
      connected: Boolean(income.connected),
      estimatedNextIncomeDate: income.estimatedNextIncomeDate || null,
      daysUntilNextIncome: Number.isFinite(Number(income.daysUntilNextIncome)) ? Number(income.daysUntilNextIncome) : null,
      confidence: trimText(income.confidence, 40),
      sourceName: trimText(income.sourceName, 120),
    }),
    obligations: compactRecord({
      connected: Boolean(obligations.connected),
      totalDueBeforeNextIncome: toNumber(obligations.totalDueBeforeNextIncome),
      conflictAfterPurchase: Boolean(obligations.conflictAfterPurchase),
      nearestDueTitle: trimText(nearestObligation.title, 120),
      nearestDueAmount: toNumber(nearestObligation.amount),
      nearestDueDate: nearestObligation.dueDate || nearestObligation.date || null,
    }),
    emergencyFund: emergencyFund.configured ? compactRecord({
      savedAmount: toNumber(emergencyFund.savedAmount),
      targetAmount: toNumber(emergencyFund.targetAmount),
      stillRequiredThisCycle: toNumber(emergencyFund.stillRequiredThisCycle),
      targetComplete: Boolean(emergencyFund.targetComplete),
      wouldBeAffected: Boolean(emergencyFund.wouldBeAffected),
      wouldRequireWithdrawal: Boolean(emergencyFund.wouldRequireWithdrawal),
    }) : null,
    savingsGoals: safeList(savingsGoals.records).length ? compactRecord({
      activeGoalCount: safeList(savingsGoals.records).length,
      stillRequiredThisCycle: toNumber(savingsGoals.stillRequiredThisCycle),
      highestPriorityGoal: trimText(highestPriorityGoal.name, 120),
      highestPrioritySavedAmount: toNumber(highestPriorityGoal.savedAmount),
      highestPriorityTargetAmount: toNumber(highestPriorityGoal.targetAmount),
      wouldBeAffected: Boolean(savingsGoals.wouldBeAffected),
      wouldRequireWithdrawal: Boolean(savingsGoals.wouldRequireWithdrawal),
    }) : null,
    safety: compactRecord({
      commitmentsBeforeNextIncome: toNumber(safety.commitmentsBeforeNextIncome),
      safeToSpendBeforePurchase: toNumber(safety.safeToSpendBeforePurchase),
      safeToSpendAfterPurchase: toNumber(safety.safeToSpendAfterPurchase),
      survivalReserve: toNumber(safety.survivalReserve),
      dataConfidence: trimText(safety.dataConfidence, 40),
    }),
  };

  if (calendar.connected && (toNumber(calendar.knownMoneyImpactTotal) > 0 || safeList(calendar.unknownCostEvents).length)) {
    context.calendar = compactRecord({
      knownMoneyImpactTotal: toNumber(calendar.knownMoneyImpactTotal),
      unknownCostEventCount: safeList(calendar.unknownCostEvents).length,
      horizonBasis: trimText(calendar.horizonBasis, 80),
      upcomingEvents: safeList(calendar.upcomingEvents).slice(0, 4).map((event) => compactRecord({
        title: trimText(event?.title, 100),
        date: event?.date || null,
        amount: toNumber(event?.amount),
      })),
    });
  }

  if (safeList(behavior.recentPatterns).length) {
    context.recentSpendingBehavior = {
      summary: trimText(behavior.memorySummary, 280),
      repeatedImpulseRisk: trimText(behavior.repeatedImpulseRisk, 40),
    };
  }

  if (lifeStage.hasProfile && lifeStage.relevance && lifeStage.relevance !== "neutral") {
    context.lifeStage = compactRecord({
      stage: trimText(lifeStage.stage, 100),
      relevance: trimText(lifeStage.relevance, 60),
      dominantPressures: safeList(lifeStage.dominantPressures).slice(0, 2).map((value) => trimText(value, 140)),
    });
  }

  return context;
}

function pushFact(list, id, label, value, unit = "text") {
  if (value === undefined || value === null || value === "") return;
  if (unit === "PHP" && !Number.isFinite(Number(value))) return;
  list.push({ id, label, value, unit });
}

function buildVerifiedFactCatalog(contextValue = {}) {
  const context = safeRecord(contextValue);
  const facts = [];
  pushFact(facts, "purchase_item", "Purchase item", context.purchase?.item);
  pushFact(facts, "purchase_price", "Purchase price", context.purchase?.price, "PHP");
  pushFact(facts, "purchase_reason", "Purchase reason", context.purchase?.reason);
  pushFact(facts, "spendable_wallet_money", "Spendable wallet money", context.liquidity?.spendableWalletMoney, "PHP");
  pushFact(facts, "money_after_purchase", "Spendable wallet money after purchase", context.liquidity?.moneyAfterPurchase, "PHP");
  pushFact(facts, "wallet_funding_status", "Wallet funding status", context.liquidity?.walletFundingStatus);
  pushFact(facts, "budget_status", "Budget status", context.budget?.status);
  pushFact(facts, "budget_remaining_before", "Relevant budget remaining before purchase", context.budget?.remainingBefore, "PHP");
  pushFact(facts, "budget_remaining_after", "Relevant budget remaining after purchase", context.budget?.remainingAfter, "PHP");
  pushFact(facts, "budget_shortfall", "Relevant budget shortfall", context.budget?.shortfall, "PHP");
  pushFact(facts, "days_until_next_income", "Days until next expected income", context.incomeTiming?.daysUntilNextIncome, "days");
  pushFact(facts, "income_timing_confidence", "Income timing confidence", context.incomeTiming?.confidence);
  pushFact(facts, "obligations_before_next_income", "Obligations due before next income", context.obligations?.totalDueBeforeNextIncome, "PHP");
  pushFact(facts, "nearest_obligation_amount", "Nearest obligation amount", context.obligations?.nearestDueAmount, "PHP");
  pushFact(facts, "emergency_fund_saved", "Emergency fund saved", context.emergencyFund?.savedAmount, "PHP");
  pushFact(facts, "emergency_fund_target", "Emergency fund target", context.emergencyFund?.targetAmount, "PHP");
  pushFact(facts, "emergency_fund_remaining_this_cycle", "Emergency fund contribution still planned this cycle", context.emergencyFund?.stillRequiredThisCycle, "PHP");
  pushFact(facts, "savings_remaining_this_cycle", "Savings contributions still planned this cycle", context.savingsGoals?.stillRequiredThisCycle, "PHP");
  pushFact(facts, "calendar_known_costs", "Known upcoming calendar costs", context.calendar?.knownMoneyImpactTotal, "PHP");
  pushFact(facts, "safe_to_spend_before_purchase", "Safe-to-spend money before purchase", context.safety?.safeToSpendBeforePurchase, "PHP");
  pushFact(facts, "safe_to_spend_after_purchase", "Safe-to-spend money after purchase", context.safety?.safeToSpendAfterPurchase, "PHP");
  pushFact(facts, "financial_data_confidence", "Financial data confidence", context.safety?.dataConfidence);
  return facts;
}

function buildDecisionPrompt({ decisionContext, factCatalog }) {
  return `You are CLARA, an economist-informed personal spending decision expert inside Ask Before You Spend.

Your job is to decide whether this purchase is financially wise right now.

Authority boundary:
- CLARA local application data owns what is financially true.
- You own the economic interpretation and final spending recommendation.
- Never invent, alter, estimate, round, or replace financial facts that are not supplied below.
- Local calculations such as wallet balances, budget remaining, money after purchase, obligations, income timing, goal progress, and safe-to-spend figures are verified evidence, not verdicts.

Decision meanings:
BUY = the purchase appears financially reasonable now.
WAIT = the purchase may be reasonable, but timing or tradeoffs make waiting smarter.
PAUSE = the purchase creates meaningful financial pressure, or important information is missing for a responsible recommendation.

Reason contextually. Consider only what is relevant, including affordability, liquidity, budget impact, upcoming income, obligations, emergency resilience, savings goals, opportunity cost, purchase necessity, timing, and reasonable alternatives.

Do not be permanently anti-spending. A strong financial position can justify BUY.
Do not let raw affordability alone force BUY when timing or obligations make WAIT wiser.
If material information is missing, identify the gap instead of guessing.

VERIFIED CLARA CONTEXT
${JSON.stringify(decisionContext, null, 2)}

ALLOWED VERIFIED FACT IDS
${JSON.stringify(factCatalog, null, 2)}

Output rules:
- Return valid JSON only.
- decision must be exactly BUY, WAIT, or PAUSE.
- confidence must be high, medium, or low.
- factsUsed must contain only ids from ALLOWED VERIFIED FACT IDS.
- Never cite an amount or fact that is not supplied.
- Prefer not to repeat peso amounts in headline, summary, reasoning, mainTradeoff, or saferAlternative. CLARA's UI renders authoritative numbers directly from local data.
- If you do mention a peso amount, it must exactly match a supplied verified PHP fact.
- missingImportantInformation must list only genuine decision-relevant gaps.

Return exactly this shape:
{
  "decision": "BUY | WAIT | PAUSE",
  "confidence": "high | medium | low",
  "headline": "short recommendation headline",
  "summary": "one or two user-facing sentences",
  "reasoning": "clear explanation of why this decision follows from the verified facts",
  "mainTradeoff": "the most important economic tradeoff",
  "saferAlternative": "the better or safer move, if any",
  "factsUsed": ["verified_fact_id"],
  "missingImportantInformation": []
}`;
}

function allowedMoneyValues(factCatalog = []) {
  return factCatalog
    .filter((fact) => fact?.unit === "PHP" && Number.isFinite(Number(fact?.value)))
    .map((fact) => Number(fact.value));
}

function hasUnsupportedPesoAmount(text = "", factCatalog = []) {
  const allowed = allowedMoneyValues(factCatalog);
  const matches = String(text || "").matchAll(/₱\s*(-?[\d,]+(?:\.\d+)?)/g);
  for (const match of matches) {
    const amount = Number(String(match[1] || "").replace(/,/g, ""));
    if (!Number.isFinite(amount)) continue;
    const known = allowed.some((value) => Math.abs(value - amount) < 0.01);
    if (!known) return true;
  }
  return false;
}

function normalizeDecisionResponse(value, factCatalog = []) {
  const source = safeRecord(value);
  const decision = clean(source.decision).toUpperCase();
  const confidence = clean(source.confidence).toLowerCase();
  const headline = trimText(source.headline, 120);
  const summary = trimText(source.summary, 520);
  const reasoning = trimText(source.reasoning, 1000);
  const mainTradeoff = trimText(source.mainTradeoff, 420);
  const saferAlternative = trimText(source.saferAlternative, 420);
  const allowedFactIds = new Set(factCatalog.map((fact) => fact.id));
  const factsUsed = safeList(source.factsUsed)
    .map((entry) => clean(entry))
    .filter((entry) => allowedFactIds.has(entry))
    .filter((entry, index, list) => list.indexOf(entry) === index)
    .slice(0, 10);
  const missingImportantInformation = safeList(source.missingImportantInformation)
    .map((entry) => trimText(entry, 220))
    .filter(Boolean)
    .slice(0, 6);

  if (!VALID_DECISIONS.has(decision)) {
    throw new Error("CLARA spending decision returned an invalid decision.");
  }
  if (!VALID_CONFIDENCE.has(confidence)) {
    throw new Error("CLARA spending decision returned an invalid confidence.");
  }
  if (!headline || !summary || !reasoning || !mainTradeoff || !saferAlternative) {
    throw new Error("CLARA spending decision returned an incomplete structured result.");
  }
  if (!factsUsed.length) {
    throw new Error("CLARA spending decision did not cite any verified facts.");
  }

  const narrative = [headline, summary, reasoning, mainTradeoff, saferAlternative].join(" ");
  if (hasUnsupportedPesoAmount(narrative, factCatalog)) {
    throw new Error("CLARA spending decision referenced an unverified money amount.");
  }

  return {
    decision,
    confidence,
    headline,
    summary,
    reasoning,
    mainTradeoff,
    saferAlternative,
    factsUsed,
    missingImportantInformation,
  };
}

function dateLabel(value) {
  if (!value) return "Unconfirmed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unconfirmed";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

function buildBudgetDetailCard(pkg) {
  const budget = safeRecord(pkg.budget);
  const selected = safeRecord(budget.selectedBudget || budget.matchingBudget);
  const price = toNumber(pkg.purchase?.price ?? pkg.purchase?.amount);

  if (!selected.title) {
    return {
      eyebrow: "05 / BUDGET",
      title: "Budget check",
      stat: budget.status === "no_budget" ? "No active budget" : "No matching budget",
      body: budget.status === "no_budget"
        ? "No active budget is configured for this purchase check."
        : "CLARA did not find an active budget that clearly owns this purchase.",
      note: `Purchase amount: ${money(price)}.`,
    };
  }

  return {
    eyebrow: "05 / BUDGET",
    title: `${selected.title} budget`,
    stat: money(budget.remainingBefore ?? selected.remaining),
    body: `The recorded budget status is ${clean(budget.status || "unconfirmed")}. ${money(budget.remainingAfter)} would remain in this budget after the purchase.`,
    note: budget.shortfall > 0 ? `Recorded shortfall: ${money(budget.shortfall)}.` : "No recorded budget shortfall for this purchase.",
  };
}

function buildDetailCards(pkg, decision) {
  const cards = [];
  const price = toNumber(pkg.purchase?.price ?? pkg.purchase?.amount);
  const spendable = toNumber(pkg.wallet?.spendableTotal ?? pkg.finance?.spendableTotal);
  const safeAfter = Number(pkg.safety?.safeToSpendAfterPurchase);

  cards.push({
    eyebrow: "01 / DECISION SUMMARY",
    title: USER_FACING_DECISIONS[decision.decision],
    stat: `Confidence: ${decision.confidence}`,
    body: decision.reasoning,
    note: `Better move: ${decision.saferAlternative}`,
    final: true,
    decision: decision.decision,
  });

  if (pkg.incomeRunway?.connected) {
    cards.push({
      eyebrow: "02 / INCOME RUNWAY",
      title: pkg.incomeRunway.estimatedNextIncomeDate ? "Next income estimate" : "Income timing unavailable",
      stat: Number.isFinite(Number(pkg.incomeRunway.daysUntilNextIncome))
        ? `${Number(pkg.incomeRunway.daysUntilNextIncome)} day${Number(pkg.incomeRunway.daysUntilNextIncome) === 1 ? "" : "s"}`
        : "Unconfirmed",
      body: pkg.incomeRunway.estimatedNextIncomeDate
        ? `${pkg.incomeRunway.sourceName || "Your income"} is estimated around ${dateLabel(pkg.incomeRunway.estimatedNextIncomeDate)}.`
        : "CLARA could not confirm a reliable next-income date from the available history.",
      note: `Confidence: ${pkg.incomeRunway.confidence || "none"}.`,
    });
  }

  cards.push({
    eyebrow: "03 / WALLET LIQUIDITY",
    title: "Spendable money",
    stat: money(spendable),
    body: `${signedMoney(spendable - price)} would remain across spendable wallets after the purchase.`,
    note: `Largest eligible wallet: ${money(pkg.wallet?.largestEligibleWallet ?? pkg.finance?.largestEligibleBalance)}.`,
  });

  if (pkg.safety && Number.isFinite(safeAfter)) {
    cards.push({
      eyebrow: "04 / SAFE TO SPEND",
      title: "After protected commitments",
      stat: signedMoney(safeAfter),
      body: `${money(pkg.safety.commitmentsBeforeNextIncome)} is recorded for commitments before the next income window.`,
      note: `Data confidence: ${pkg.safety.dataConfidence || "low"}.`,
    });
  }

  cards.push(buildBudgetDetailCard(pkg));

  if (pkg.obligations?.connected) {
    cards.push({
      eyebrow: "06 / DEBT & OBLIGATIONS",
      title: pkg.obligations.nearestDueObligation?.title || "Recorded obligations",
      stat: money(pkg.obligations.totalDueBeforeNextIncome),
      body: safeList(pkg.obligations.dueBeforeNextIncome).length
        ? `${safeList(pkg.obligations.dueBeforeNextIncome).length} recorded obligation${safeList(pkg.obligations.dueBeforeNextIncome).length === 1 ? " is" : "s are"} due inside the current decision window.`
        : "No recorded debt obligation is due inside the current decision window.",
      note: pkg.obligations.conflictAfterPurchase ? "The local context marks an obligation conflict after purchase." : "No recorded post-purchase obligation conflict.",
    });
  }

  if (pkg.emergencyFund?.configured) {
    cards.push({
      eyebrow: "07 / EMERGENCY FUND",
      title: pkg.emergencyFund.targetComplete ? "Target completed" : "Emergency protection",
      stat: money(pkg.emergencyFund.savedAmount),
      body: `${money(pkg.emergencyFund.stillRequiredThisCycle)} remains in the recorded contribution for this cycle.`,
      note: pkg.emergencyFund.wouldBeAffected ? "The current context marks this commitment as affected." : "The recorded commitment remains protected.",
    });
  }

  if (safeList(pkg.savingsGoals?.records).length) {
    cards.push({
      eyebrow: "08 / SAVINGS GOALS",
      title: pkg.savingsGoals.highestPriorityGoal?.name || "Savings goals",
      stat: money(pkg.savingsGoals.stillRequiredThisCycle),
      body: "This is the remaining recorded contribution across active goals for the current cycle.",
      note: pkg.savingsGoals.wouldBeAffected ? "The current context marks goal progress as affected." : "Recorded goal commitments remain protected.",
    });
  }

  if (pkg.calendar?.connected && (toNumber(pkg.calendar.knownMoneyImpactTotal) > 0 || safeList(pkg.calendar.unknownCostEvents).length)) {
    cards.push({
      eyebrow: "09 / CALENDAR",
      title: pkg.calendar.nextRelevantEvent?.title || "Upcoming events",
      stat: money(pkg.calendar.knownMoneyImpactTotal),
      body: safeList(pkg.calendar.unknownCostEvents).length
        ? `${safeList(pkg.calendar.unknownCostEvents).length} upcoming event${safeList(pkg.calendar.unknownCostEvents).length === 1 ? " has" : "s have"} no recorded cost.`
        : "Known event costs inside the decision window are included in the local context.",
      note: `Window basis: ${pkg.calendar.horizonBasis === "next_reliable_income" ? "before next reliable income" : "next 14 days"}.`,
    });
  }

  if (safeList(pkg.behavior?.recentPatterns).length) {
    cards.push({
      eyebrow: "10 / SPENDING PATTERN",
      title: "Saved pattern signal",
      stat: pkg.behavior.repeatedImpulseRisk === "present" ? "Caution" : "Checked",
      body: pkg.behavior.memorySummary,
      note: "Behavioral context can inform Gemini but cannot replace verified financial facts.",
    });
  }

  cards.push({
    eyebrow: "11 / MAIN TRADEOFF",
    title: "What matters most",
    stat: decision.decision,
    body: decision.mainTradeoff,
    note: `Purchase amount: ${money(price)}.`,
  });

  return cards;
}

function buildResult(pkg, aiDecision, model, decisionContext, factCatalog) {
  const decision = aiDecision.decision;
  const safeAfter = Number(pkg.safety?.safeToSpendAfterPurchase);
  const spendableAfter = toNumber(pkg.wallet?.spendableTotal ?? pkg.finance?.spendableTotal) - toNumber(pkg.purchase?.price ?? pkg.purchase?.amount);
  const impactValue = Number.isFinite(safeAfter) ? signedMoney(safeAfter) : signedMoney(spendableAfter);
  const impactLabel = Number.isFinite(safeAfter)
    ? (safeAfter >= 0 ? "Safe money left after purchase" : "Safe money shortage after purchase")
    : "Spendable wallet money after purchase";
  const risk = decision === "BUY" ? "Low" : decision === "WAIT" ? "Medium" : "High";
  const result = {
    ...aiDecision,
    decision,
    userFacingDecision: USER_FACING_DECISIONS[decision],
    risk,
    reasonCode: `GEMINI_${decision}`,
    explanation: aiDecision.summary,
    saferMove: aiDecision.saferAlternative,
    explanationSource: "gemini",
    decisionSource: "gemini",
    model,
    impact: {
      value: Number.isFinite(safeAfter) ? safeAfter : spendableAfter,
      formattedValue: impactValue,
      label: impactLabel,
    },
    contextPackage: pkg,
    decisionContext,
    verifiedFactCatalog: factCatalog,
  };

  result.dominantFinding = {
    decision,
    risk,
    title: aiDecision.headline,
    explanation: aiDecision.reasoning,
    saferMove: aiDecision.saferAlternative,
  };
  result.summaryCard = {
    eyebrow: "BUY CHECK",
    verdict: USER_FACING_DECISIONS[decision],
    explanation: aiDecision.summary,
    impactValue,
    impactLabel,
    informationLabel: "Why this result?",
  };
  const detailCards = buildDetailCards(pkg, aiDecision);
  result.detailCards = detailCards;
  result.cards = detailCards;
  return result;
}

export async function runClaraSpendingDecision(flow, context) {
  const contextPackage = buildContextPackage(flow, context);
  const decisionContext = buildDecisionRelevantContext(contextPackage);
  const factCatalog = buildVerifiedFactCatalog(decisionContext);

  const { json, model } = await requestGeminiJson({
    prompt: buildDecisionPrompt({ decisionContext, factCatalog }),
    temperature: 0.2,
    maxOutputTokens: 650,
    timeoutMs: 15000,
    label: "CLARA Buy Check spending decision",
  });

  const aiDecision = normalizeDecisionResponse(json, factCatalog);
  return buildResult(contextPackage, aiDecision, model, decisionContext, factCatalog);
}

export {
  buildDecisionRelevantContext,
  buildDecisionPrompt,
  buildVerifiedFactCatalog,
  normalizeDecisionResponse,
};
