import { buildBudgetMetadata } from "./clara-buy-check-budget-engine.js";
import { parseDate } from "./clara-buy-check-income-runway-engine.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const clean = (value = "") => String(value ?? "").replace(/\s+/g, " ").trim();
const normalize = (value = "") => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

function obligationAmount(record = {}) {
  return Math.max(0, toNumber(record.monthlyDebt ?? record.monthlyPayment ?? record.monthly_payment ?? record.payment ?? record.amountDue ?? record.amount_due ?? record.dueAmount ?? record.due_amount ?? record.amount));
}

function nextMonthlyDue(rawDate, now) {
  const parsed = parseDate(rawDate);
  if (!parsed) return null;
  if (parsed >= now) return parsed;
  const day = parsed.getDate();
  let candidate = new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0, 0);
  if (candidate < now) candidate = new Date(now.getFullYear(), now.getMonth() + 1, day, 12, 0, 0, 0);
  return candidate;
}

function normalizeObligation(record = {}, index = 0, now = new Date()) {
  const amount = obligationAmount(record);
  if (amount <= 0) return null;
  const dueDate = nextMonthlyDue(record.dueDate || record.due_date, now);
  const title = clean(record.title || record.name || record.lender || record.creditor || record.label || "Debt obligation");
  return {
    id: clean(record.id || `obligation:${title}:${index}`),
    title,
    amount,
    dueDate: dueDate?.toISOString() || null,
    type: clean(record.debtType || record.type || "obligation"),
    source: clean(record.source || "debt_obligation_store"),
    raw: record,
  };
}

function budgetProtectionFor(obligation, budgets = []) {
  const directId = clean(obligation.raw.budgetId || obligation.raw.budget_id);
  if (directId) {
    const direct = budgets.find((budget) => budget.id === directId);
    if (direct && direct.preRemaining >= obligation.amount) return { protected: true, confidence: "high", budgetId: direct.id, budgetTitle: direct.title, matchType: "direct_id" };
  }
  const title = normalize(obligation.title);
  const titleTokens = new Set(title.split(" ").filter((token) => token.length >= 3));
  const candidates = budgets.map((budget) => {
    const budgetText = normalize(`${budget.title} ${budget.family}`);
    const overlap = [...titleTokens].filter((token) => budgetText.includes(token)).length;
    const debtCategory = /debt|loan|installment|rent|mortgage|tuition|utility|bill/.test(`${title} ${budgetText}`);
    return { budget, overlap, debtCategory };
  }).filter((entry) => (entry.overlap > 0 || entry.debtCategory) && entry.budget.preRemaining >= obligation.amount)
    .sort((left, right) => right.overlap - left.overlap || right.budget.preRemaining - left.budget.preRemaining);
  const match = candidates[0];
  if (!match) return { protected: false, confidence: "none", budgetId: "", budgetTitle: "", matchType: "none" };
  return {
    protected: true,
    confidence: match.overlap > 0 ? "medium" : "low",
    budgetId: match.budget.id,
    budgetTitle: match.budget.title,
    matchType: match.overlap > 0 ? "normalized_title" : "category",
  };
}

function analyzeObligations(context = {}, incomeRunway = {}, options = {}) {
  const now = parseDate(options.now) || new Date();
  const horizon = ["high", "medium"].includes(incomeRunway.confidence) && incomeRunway.estimatedNextIncomeDate
    ? parseDate(incomeRunway.estimatedNextIncomeDate)
    : new Date(now.getTime() + 14 * DAY_MS);
  const budgets = buildBudgetMetadata(Array.isArray(context.budgets) ? context.budgets : [], "other", now);
  const records = (Array.isArray(context.debtObligations) ? context.debtObligations : [])
    .map((record, index) => normalizeObligation(record, index, now))
    .filter(Boolean)
    .map((record) => ({ ...record, budgetProtection: budgetProtectionFor(record, budgets) }));
  const dueBeforeNextIncome = records.filter((record) => record.dueDate && new Date(record.dueDate) <= horizon);
  const totalDueBeforeNextIncome = dueBeforeNextIncome.reduce((sum, record) => sum + record.amount, 0);
  const alreadyProtectedByBudget = dueBeforeNextIncome.filter((record) => record.budgetProtection.protected).reduce((sum, record) => sum + record.amount, 0);
  const stillUnfunded = Math.max(0, totalDueBeforeNextIncome - alreadyProtectedByBudget);
  const availableAfterPurchase = Number.isFinite(options.availableAfterPurchase) ? options.availableAfterPurchase : null;
  return {
    connected: Array.isArray(context.debtObligations),
    records,
    dueBeforeNextIncome,
    totalDueBeforeNextIncome,
    monthlyCommitmentTotal: records.reduce((sum, record) => sum + record.amount, 0),
    alreadyProtectedByBudget,
    stillUnfunded,
    nearestDueObligation: dueBeforeNextIncome[0] || null,
    conflictAfterPurchase: availableAfterPurchase !== null ? availableAfterPurchase < totalDueBeforeNextIncome : false,
    horizonDate: horizon?.toISOString() || null,
    horizonBasis: ["high", "medium"].includes(incomeRunway.confidence) ? "next_reliable_income" : "fourteen_day_fallback",
  };
}

export { analyzeObligations, normalizeObligation };
