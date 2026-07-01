import {
  clean,
  safeList,
  safeRecord,
  toNumber,
} from "@/lib/clara-buy-check-budget-core";
import { analyzeBuyCheckBudgetCoverage } from "@/lib/clara-buy-check-budget-engine";
import { normalizeExpenseCategory } from "@/lib/clara-buy-check-category-engine";
import { getWalletBreakdown, getWalletOptions } from "@/lib/clara-buy-check-wallet-engine";

const PH_TIME_ZONE = "Asia/Manila";
const isRecord = (value) => Boolean(value && typeof value === "object" && !Array.isArray(value));

function signedMoney(value = 0) {
  const amount = toNumber(value);
  return `${amount < 0 ? "-" : ""}₱${Math.abs(amount).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function remainingOrShortfall(value = 0) {
  const amount = toNumber(value);
  return amount >= 0
    ? `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })} remaining`
    : `₱${Math.abs(amount).toLocaleString("en-PH", { maximumFractionDigits: 0 })} short`;
}

function scheduleItems(contextValue) {
  const context = safeRecord(contextValue);
  const raw = context.scheduleContext || context.schedule || context.upcomingSchedule || safeRecord(context.dashboardCardsLiveSnapshot).schedule || [];
  if (Array.isArray(raw)) return raw.filter(Boolean).slice(0, 8);
  const schedule = safeRecord(raw);
  return [...(Array.isArray(schedule.upcomingEvents) ? schedule.upcomingEvents : []), ...(Array.isArray(schedule.moneyImpactEvents) ? schedule.moneyImpactEvents : [])].filter(Boolean).slice(0, 8);
}

function memorySummary(contextValue) {
  const context = safeRecord(contextValue);
  const source = context.memoryContext || context.fullMemoryContext || context.claraMemoryContext || context.aiFinancialMemory || null;
  if (!source) return "No strong saved spending pattern was available.";
  if (typeof source === "string") return clean(source).slice(0, 280);
  const memory = safeRecord(source);
  const records = safeList(memory.memoryCabinets).flatMap((cabinet) => safeList(cabinet.records));
  const candidates = [...records, ...safeList(memory.profileMemoryNotes)];
  const selected = candidates.find((record) => /payday|impulse|shopping|trigger|spending|discipline|emergency|goal/i.test(`${record.summary || ""} ${Array.isArray(record.signals) ? record.signals.join(" ") : ""}`)) || candidates[0];
  return clean(selected?.summary || (Array.isArray(selected?.signals) ? selected.signals.join(" ") : "") || "No strong saved spending pattern was available.").slice(0, 280);
}

function amountFromRecord(value) {
  const record = safeRecord(value);
  return Math.max(0, toNumber(record.amount ?? record.cost ?? record.fee ?? record.payment ?? record.moneyImpact ?? record.money_impact ?? record.expectedAmount ?? record.expected_amount ?? 0));
}

function dateFromRecord(value) {
  const record = safeRecord(value);
  const raw = record.date || record.start || record.startDate || record.start_date || record.dueDate || record.due_date;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildContextSignals({ assessment, schedule, memory, emergencyFund, savingsGoals }) {
  const now = Date.now();
  const nextSevenDays = now + 7 * 24 * 60 * 60 * 1000;
  const obligation = schedule.map((event) => ({ event, amount: amountFromRecord(event), date: dateFromRecord(event) }))
    .filter((entry) => entry.amount > 0 && entry.date && entry.date.getTime() >= now && entry.date.getTime() <= nextSevenDays)
    .sort((left, right) => left.date - right.date)[0] || null;
  const upcomingObligationRisk = obligation && toNumber(assessment.spendableAfter) < obligation.amount ? "critical" : obligation ? "present" : "none";
  const repeatedImpulseRisk = /impulse|regret|tempt|payday|overspend|unplanned/i.test(memory) ? "present" : "none";
  const protectedMoneyRisk = assessment.protectedMoneyNeeded ? "critical" : assessment.walletBreakdown?.reservedAmount > 0 ? "protected" : "none";
  return {
    budgetCoverageRisk: assessment.status,
    individualWalletFundingRisk: assessment.walletFundingStatus,
    protectedMoneyRisk,
    upcomingObligationRisk,
    emergencyFundRisk: emergencyFund && assessment.protectedMoneyNeeded ? "affected" : "not_affected",
    savingsGoalRisk: savingsGoals.length && assessment.protectedMoneyNeeded ? "affected" : "not_affected",
    repeatedImpulseRisk,
    paydayTimingRisk: "not_measured",
    dataConfidence: assessment.dataConfidence,
    upcomingObligation: obligation ? {
      title: clean(obligation.event.title || obligation.event.name || obligation.event.type || "Upcoming obligation"),
      amount: obligation.amount,
      date: obligation.date.toISOString(),
    } : null,
  };
}

function buildContextPackage(flowValue, contextValue) {
  const flow = safeRecord(flowValue);
  const context = safeRecord(contextValue);
  const savingsGoals = safeList(context.savingsGoals);
  const emergencyFund = isRecord(context.emergencyFund) ? context.emergencyFund : null;
  const schedule = scheduleItems(context);
  const memory = memorySummary(context);
  const budgetAssessment = analyzeBuyCheckBudgetCoverage(flow.item, flow.price, context, flow.reason);
  const selectedBudget = budgetAssessment.selectedBudget;
  const wallet = getWalletBreakdown(context, flow.price);
  const contextSignals = buildContextSignals({ assessment: budgetAssessment, schedule, memory, emergencyFund, savingsGoals });
  return {
    purchase: {
      item: clean(flow.item),
      price: toNumber(flow.price),
      reason: clean(flow.reason),
      planningStatus: budgetAssessment.status === "full" ? "planned" : flow.planningStatus || "unplanned",
      category: budgetAssessment.purchaseCategory,
      categoryKey: budgetAssessment.purchaseCategoryKey,
    },
    finance: {
      spendableWallets: wallet.eligibleFundingWallets.map((entry) => ({ id: entry.id, name: entry.name, grossBalance: entry.grossBalance, reservedBalance: entry.reservedBalance, spendableBalance: entry.spendableBalance })),
      protectedWallets: wallet.wallets.filter((entry) => entry.protected).map((entry) => ({ id: entry.id, name: entry.name, balance: entry.grossBalance, protectionReason: entry.protectionReason })),
      spendableTotal: wallet.spendableTotal,
      largestEligibleBalance: wallet.largestEligibleBalance,
      fundingWalletCount: wallet.fundingWalletCount,
      reservedAmount: wallet.reservedAmount,
      protectedTotal: wallet.protectedTotal,
      matchingBudget: selectedBudget ? {
        id: selectedBudget.id,
        title: selectedBudget.title,
        flexible: selectedBudget.flexible,
        matchType: selectedBudget.matchType,
        limit: selectedBudget.limit,
        spent: selectedBudget.spent,
        effectiveSpent: selectedBudget.effectiveSpent,
        spentSource: selectedBudget.spentSource,
        dataConfidence: selectedBudget.dataConfidence,
        remaining: selectedBudget.remaining,
        remainingAfter: budgetAssessment.remainingAfter,
        safeMaximum: budgetAssessment.safeMaximum,
        shortfall: budgetAssessment.shortfall,
        rangeStart: selectedBudget.rangeStart,
        rangeEnd: selectedBudget.rangeEnd,
      } : null,
      budgetAssessment: {
        status: budgetAssessment.status,
        dataConfidence: budgetAssessment.dataConfidence,
        scannedBudgetCount: budgetAssessment.scannedBudgetCount,
        matchedBudgetCount: budgetAssessment.matchedBudgetCount,
        flexibleBudgetCount: budgetAssessment.flexibleBudgetCount,
        shortfall: budgetAssessment.shortfall,
        safeMaximum: budgetAssessment.safeMaximum,
        walletShortfall: budgetAssessment.walletShortfall,
        combinedWalletShortfall: budgetAssessment.combinedWalletShortfall,
        walletFundingStatus: budgetAssessment.walletFundingStatus,
        protectedMoneyNeeded: budgetAssessment.protectedMoneyNeeded,
        spendableAfter: budgetAssessment.spendableAfter,
        candidates: budgetAssessment.candidates.slice(0, 6),
      },
      savingsGoals: savingsGoals.slice(0, 4),
      emergencyFund,
    },
    schedule,
    meProfile: context.meProfileContext || context.lifeProfile || safeRecord(context.user).user_metadata || null,
    memory,
    contextSignals,
  };
}

function getPHDateString(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PH_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

function normalizeNeedType(reason = "", category = "") {
  const text = `${reason} ${category}`.toLowerCase();
  if (/health|medical|medicine|doctor|work|job|school|study|replacement|replace|broken|repair|lost/.test(text)) return "need";
  if (/savings|goal|invest/.test(text)) return "savings";
  return "want";
}

function saveLocalList(key, payload) {
  try {
    const current = JSON.parse(window.localStorage.getItem(key) || "[]");
    const list = Array.isArray(current) ? current : [];
    list.unshift(payload);
    window.localStorage.setItem(key, JSON.stringify(list.slice(0, 30)));
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}

function dispatchFinanceUpdates() {
  if (typeof window === "undefined") return;
  ["clara-expenses-updated", "clara-finance-updated", "clara-wallets-updated", "clara-wallet-transactions-updated", "clara-local-finance-updated"].forEach((name) => window.dispatchEvent(new Event(name)));
}

export {
  budgetCoverageFromAssessment,
  clean,
  confirmationText,
  createDecisionState,
  createInitialState,
  createMessage,
  money,
  parsePrice,
  priceStepMessage,
  safeList,
  safeRecord,
  toNumber,
} from "@/lib/clara-buy-check-budget-core";
export { analyzeBuyCheckBudgetCoverage } from "@/lib/clara-buy-check-budget-engine";
export { normalizeExpenseCategory } from "@/lib/clara-buy-check-category-engine";
export { getWalletOptions } from "@/lib/clara-buy-check-wallet-engine";
export {
  buildContextPackage,
  buildContextSignals,
  getPHDateString,
  normalizeNeedType,
  saveLocalList,
  dispatchFinanceUpdates,
  remainingOrShortfall,
  signedMoney,
};
