import { analyzeBuyCheckBudgetCoverage, buildBudgetMetadata } from "./clara-buy-check-budget-engine.js";
import { inferPurchaseCategory, CATEGORY_LABELS } from "./clara-buy-check-category-engine.js";
import { getWalletBreakdown } from "./clara-buy-check-wallet-engine.js";
import { analyzeIncomeRunway } from "./clara-buy-check-income-runway-engine.js";
import { analyzeObligations } from "./clara-buy-check-obligation-engine.js";
import { analyzeGoalProtection } from "./clara-buy-check-goal-protection-engine.js";
import { analyzeCalendarImpact } from "./clara-buy-check-calendar-engine.js";
import { analyzeLifeStageContext } from "./clara-buy-check-life-stage-engine.js";

const clean = (value = "") => String(value ?? "").replace(/\s+/g, " ").trim();
const safeList = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const safeRecord = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

function normalizePurchase(flow = {}, assessment = {}) {
  const categoryKey = assessment.purchaseCategoryKey || inferPurchaseCategory({ item: flow.item, reason: flow.reason });
  return {
    item: clean(flow.item),
    amount: toNumber(flow.price),
    price: toNumber(flow.price),
    reason: clean(flow.reason),
    categoryKey,
    categoryLabel: assessment.purchaseCategory || CATEGORY_LABELS?.[categoryKey] || "Lifestyle",
    category: assessment.purchaseCategory || CATEGORY_LABELS?.[categoryKey] || "Lifestyle",
    planningStatus: assessment.status === "full" ? "planned" : clean(flow.planningStatus || "unplanned"),
    recurring: Boolean(flow.recurring),
    urgency: clean(flow.urgency || "unknown"),
  };
}

function dedupeCalendarAgainstObligations(calendar, obligations) {
  const obligationKeys = new Set(obligations.dueBeforeNextIncome.map((item) => {
    const day = item.dueDate ? item.dueDate.slice(0, 10) : "";
    return `${item.title.toLowerCase()}:${day}:${Math.round(item.amount)}`;
  }));
  const knownCostEvents = calendar.knownCostEvents.filter((event) => {
    const key = `${event.title.toLowerCase()}:${event.date.slice(0, 10)}:${Math.round(event.amount)}`;
    return !obligationKeys.has(key);
  });
  return {
    ...calendar,
    knownCostEvents,
    knownMoneyImpactTotal: knownCostEvents.reduce((sum, event) => sum + event.amount, 0),
  };
}

function explicitSurvivalReserve(context = {}) {
  return Math.max(0, toNumber(
    context.minimumSurvivalReserve ??
    context.minimum_survival_reserve ??
    context.survivalReserve ??
    context.survival_reserve ??
    context.dashboardSummarySnapshot?.minimumSurvivalReserve ??
    0,
  ));
}

function overallConfidence({ wallet, budget, incomeRunway, obligations, calendar }) {
  if (!wallet.wallets.length || budget.confidence === "low") return "low";
  if (["none", "low"].includes(incomeRunway.confidence)) return "medium";
  if (!obligations.connected || !calendar.connected) return "medium";
  return "high";
}

function buildContextSignals(pkg) {
  const assessment = pkg.budget || pkg.finance?.budgetAssessment || {};
  return {
    budgetCoverageRisk: assessment.status || "no_match",
    individualWalletFundingRisk: assessment.walletFundingStatus || pkg.wallet?.walletFundingStatus || "insufficient",
    protectedMoneyRisk: pkg.wallet?.protectedMoneyNeeded ? "critical" : pkg.wallet?.reservedAmount > 0 || pkg.wallet?.protectedTotal > 0 ? "protected" : "none",
    upcomingObligationRisk: pkg.obligations?.conflictAfterPurchase ? "critical" : pkg.obligations?.dueBeforeNextIncome?.length ? "present" : "none",
    emergencyFundRisk: pkg.emergencyFund?.wouldRequireWithdrawal ? "affected" : pkg.emergencyFund?.wouldBeAffected ? "present" : "not_affected",
    savingsGoalRisk: pkg.savingsGoals?.wouldRequireWithdrawal ? "affected" : pkg.savingsGoals?.wouldBeAffected ? "present" : "not_affected",
    paydayTimingRisk: ["none", "low"].includes(pkg.incomeRunway?.confidence) ? "uncertain" : "measured",
    calendarRisk: pkg.calendar?.knownMoneyImpactTotal > 0 ? "present" : pkg.calendar?.unknownCostEvents?.length ? "unknown_cost" : "none",
    lifeStageRisk: pkg.lifeStage?.relevance === "conflicting" ? "present" : "none",
    dataConfidence: pkg.safety?.dataConfidence || "low",
    upcomingObligation: pkg.obligations?.nearestDueObligation || null,
  };
}

function buildBuyCheckContext(flowValue = {}, contextValue = {}, options = {}) {
  const flow = safeRecord(flowValue);
  const context = safeRecord(contextValue);
  const now = options.now ? new Date(options.now) : new Date();
  const amount = toNumber(flow.price);
  const budgetAssessment = analyzeBuyCheckBudgetCoverage(flow.item, amount, context, flow.reason);
  const activeBudgets = buildBudgetMetadata(safeList(context.budgets), budgetAssessment.purchaseCategoryKey, now);
  const purchase = normalizePurchase(flow, budgetAssessment);
  const walletBreakdown = getWalletBreakdown(context, amount);
  const wallet = {
    wallets: walletBreakdown.wallets,
    selectedEligibleWallets: walletBreakdown.eligibleFundingWallets,
    spendableTotal: walletBreakdown.spendableTotal,
    largestEligibleWallet: walletBreakdown.largestEligibleBalance,
    largestEligibleBalance: walletBreakdown.largestEligibleBalance,
    fundingWalletCount: walletBreakdown.fundingWalletCount,
    reservedAmount: walletBreakdown.reservedAmount,
    protectedTotal: walletBreakdown.protectedTotal,
    technicallyPayable: walletBreakdown.individualEnough,
    individualWalletCanFund: walletBreakdown.individualEnough,
    combinedEnough: walletBreakdown.combinedEnough,
    protectedMoneyNeeded: walletBreakdown.protectedMoneyNeeded,
    walletFundingStatus: walletBreakdown.individualEnough ? "individual_wallet_ready" : walletBreakdown.combinedEnough ? "combined_only" : walletBreakdown.protectedMoneyNeeded ? "protected_money_needed" : "insufficient",
  };
  const budget = {
    activeBudgetCount: activeBudgets.length,
    matchedBudgetCount: budgetAssessment.matchedBudgetCount,
    flexibleBudgetCount: budgetAssessment.flexibleBudgetCount,
    selectedBudget: budgetAssessment.selectedBudget,
    matchingBudget: budgetAssessment.selectedBudget,
    status: activeBudgets.length ? budgetAssessment.status : "no_budget",
    remainingBefore: budgetAssessment.selectedBudget?.remaining || 0,
    remainingAfter: budgetAssessment.remainingAfter,
    safeMaximum: budgetAssessment.safeMaximum,
    shortfall: budgetAssessment.shortfall,
    matchType: budgetAssessment.selectedBudget?.matchType || "none",
    confidence: budgetAssessment.dataConfidence || (activeBudgets.length ? "medium" : "low"),
    walletShortfall: budgetAssessment.walletShortfall,
    combinedWalletShortfall: budgetAssessment.combinedWalletShortfall,
    walletFundingStatus: budgetAssessment.walletFundingStatus,
    protectedMoneyNeeded: budgetAssessment.protectedMoneyNeeded,
    spendableAfter: budgetAssessment.spendableAfter,
    candidates: safeList(budgetAssessment.candidates).slice(0, 6),
    scannedBudgetCount: budgetAssessment.scannedBudgetCount,
  };
  const incomeRunway = analyzeIncomeRunway(context, { now });
  let calendar = analyzeCalendarImpact(context, incomeRunway, { now });
  const liquidMoneyAfterPurchase = wallet.spendableTotal - amount;
  const obligations = analyzeObligations(context, incomeRunway, { now, availableAfterPurchase: liquidMoneyAfterPurchase });
  calendar = dedupeCalendarAgainstObligations(calendar, obligations);
  const preliminaryGoals = analyzeGoalProtection(context, { now, safeAfterPurchase: liquidMoneyAfterPurchase });
  const survivalReserve = explicitSurvivalReserve(context);
  const commitmentsBeforeNextIncome = obligations.totalDueBeforeNextIncome + preliminaryGoals.emergencyFund.stillRequiredThisCycle + preliminaryGoals.savingsGoals.stillRequiredThisCycle + calendar.knownMoneyImpactTotal + survivalReserve;
  const safeToSpendBeforePurchase = wallet.spendableTotal - commitmentsBeforeNextIncome;
  const safeToSpendAfterPurchase = safeToSpendBeforePurchase - amount;
  const goals = analyzeGoalProtection(context, { now, safeAfterPurchase: safeToSpendAfterPurchase });
  goals.emergencyFund.wouldRequireWithdrawal = wallet.protectedMoneyNeeded && goals.emergencyFund.savedAmount > 0;
  goals.savingsGoals.wouldRequireWithdrawal = wallet.protectedMoneyNeeded && goals.savingsGoals.records.some((goal) => goal.savedAmount > 0);
  const lifeStage = analyzeLifeStageContext(context, purchase);
  const safety = {
    liquidMoneyAfterPurchase,
    commitmentsBeforeNextIncome,
    survivalReserve,
    safeToSpendBeforePurchase,
    safeToSpendAfterPurchase,
    bufferDays: incomeRunway.daysUntilNextIncome,
    dataConfidence: "low",
  };
  safety.dataConfidence = overallConfidence({ wallet, budget, incomeRunway, obligations, calendar });

  const pkg = {
    version: "buy-check-context-v2",
    generatedAt: now.toISOString(),
    purchase,
    incomeRunway,
    wallet,
    budget,
    obligations,
    emergencyFund: goals.emergencyFund,
    savingsGoals: goals.savingsGoals,
    calendar,
    lifeStage,
    safety,
    debugConnections: {
      incomeHub: Boolean(context.incomeHubSnapshot?.connected || Array.isArray(context.incomes)),
      wallet: Array.isArray(context.wallets),
      budget: Array.isArray(context.budgets),
      debtObligations: Array.isArray(context.debtObligations),
      emergencyFund: Boolean(context.emergencyFund),
      savingsGoals: Array.isArray(context.savingsGoals),
      lifeStage: lifeStage.connected,
      schedule: calendar.connected,
    },
  };

  pkg.finance = {
    spendableWallets: wallet.selectedEligibleWallets.map((entry) => ({ id: entry.id, name: entry.name, grossBalance: entry.grossBalance, reservedBalance: entry.reservedBalance, spendableBalance: entry.spendableBalance })),
    protectedWallets: wallet.wallets.filter((entry) => entry.protected).map((entry) => ({ id: entry.id, name: entry.name, balance: entry.grossBalance, protectionReason: entry.protectionReason })),
    spendableTotal: wallet.spendableTotal,
    largestEligibleBalance: wallet.largestEligibleWallet,
    fundingWalletCount: wallet.fundingWalletCount,
    reservedAmount: wallet.reservedAmount,
    protectedTotal: wallet.protectedTotal,
    matchingBudget: budget.selectedBudget ? {
      ...budget.selectedBudget,
      remainingAfter: budget.remainingAfter,
      safeMaximum: budget.safeMaximum,
      shortfall: budget.shortfall,
    } : null,
    budgetAssessment: {
      status: budget.status,
      dataConfidence: budget.confidence,
      scannedBudgetCount: budget.scannedBudgetCount,
      matchedBudgetCount: budget.matchedBudgetCount,
      flexibleBudgetCount: budget.flexibleBudgetCount,
      shortfall: budget.shortfall,
      safeMaximum: budget.safeMaximum,
      walletShortfall: budget.walletShortfall,
      combinedWalletShortfall: budget.combinedWalletShortfall,
      walletFundingStatus: budget.walletFundingStatus,
      protectedMoneyNeeded: budget.protectedMoneyNeeded,
      spendableAfter: budget.spendableAfter,
      candidates: budget.candidates,
    },
    savingsGoals: goals.savingsGoals.records,
    emergencyFund: goals.emergencyFund,
  };
  pkg.schedule = calendar.upcomingEvents;
  pkg.meProfile = lifeStage;
  pkg.contextSignals = buildContextSignals(pkg);
  return pkg;
}

export { buildBuyCheckContext, buildBuyCheckContext as buildContextPackage, buildContextSignals };
