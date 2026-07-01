import {
  CATEGORY_ALIASES,
  CATEGORY_LABELS,
  containsCategoryPhrase,
  includesCategoryAlias,
  inferCategoryKey,
  inferPurchaseCategory,
  normalizeCategoryText,
} from "./clara-buy-check-category-engine.js";
import { getWalletBreakdown } from "./clara-buy-check-wallet-engine.js";

const PH_OFFSET_MS = 8 * 60 * 60 * 1000;
const FLEXIBLE_NAMES = Object.freeze([
  "other", "others", "other expense", "other expenses", "misc", "miscellaneous",
  "random expense", "random expenses", "excess expense", "excess expenses", "extra expense",
  "extra expenses", "extra spending", "flexible spending", "unplanned spending", "unplanned expense",
  "unplanned expenses", "spending allowance", "personal allowance", "wants budget", "want budget",
  "wants", "lifestyle", "discretionary", "discretionary spending", "fun money", "pocket money",
  "spending buffer", "buffer", "general spending",
]);

function clean(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function budgetId(value = {}) {
  return clean(value.id ?? value.budget_id ?? value.budgetId ?? value.uuid ?? "");
}

function budgetTitle(value = {}) {
  return clean(value.title || value.name || value.label || value.display_name || value.displayName || value.category || value.budget_category || "Budget");
}

function budgetSearchText(value = {}) {
  return clean([
    value.title, value.name, value.label, value.display_name, value.displayName,
    value.category, value.budget_category, value.budgetCategory, value.expense_category,
    value.expenseCategory, value.bucket, value.type,
  ].filter(Boolean).join(" "));
}

function budgetLimit(value = {}) {
  return Math.max(0, toNumber(value.limit ?? value.amount ?? value.budget_amount ?? value.allocated ?? value.allocated_amount ?? value.allocatedAmount ?? value.monthly_amount ?? value.total_budget ?? value.totalBudget ?? value.budget ?? value.cap ?? 0));
}

function firstDefinedNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = toNumber(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function budgetStoredSpent(value = {}) {
  const limit = budgetLimit(value);
  const direct = firstDefinedNumber(value.spent, value.spent_amount, value.spentAmount, value.used, value.used_amount, value.usedAmount);
  const remaining = firstDefinedNumber(value.remaining, value.remaining_amount, value.remainingAmount);
  if (direct !== null) return Math.max(0, direct);
  if (remaining !== null && limit > 0) return Math.max(0, limit - Math.max(0, remaining));
  return 0;
}

function isFlexibleBudget(value = {}) {
  return FLEXIBLE_NAMES.some((name) => containsCategoryPhrase(budgetSearchText(value), name));
}

function parsePHBoundaryDate(value, endOfDay = false) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = clean(value);
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly.map(Number);
    const start = Date.UTC(year, month - 1, day) - PH_OFFSET_MS;
    return new Date(start + (endOfDay ? 24 * 60 * 60 * 1000 - 1 : 0));
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function phMonthKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit" }).format(value);
}

function monthRange(key = "") {
  const resolved = /^\d{4}-\d{2}$/.test(clean(key)) ? clean(key) : phMonthKey();
  const [year, month] = resolved.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - PH_OFFSET_MS),
    end: new Date(Date.UTC(year, month, 1) - PH_OFFSET_MS - 1),
  };
}

function budgetRange(value = {}) {
  const startRaw = value.tracking_start_date || value.trackingStartDate || value.range_start || value.rangeStart || value.start_date || value.startDate || value.cycle_start || value.period_start;
  const endRaw = value.tracking_end_date || value.trackingEndDate || value.range_end || value.rangeEnd || value.end_date || value.endDate || value.cycle_end || value.period_end;
  const start = parsePHBoundaryDate(startRaw, false);
  const end = parsePHBoundaryDate(endRaw, true);
  if (start && end && end >= start) return { start, end };
  return monthRange(value.month || value.month_key || phMonthKey());
}

function isBudgetActive(value = {}, now = new Date()) {
  const { start, end } = budgetRange(value);
  return now >= start && now <= end;
}

function expenseDate(value = {}) {
  return parsePHBoundaryDate(value.date || value.spent_at || value.spentAt || value.transaction_date || value.transactionDate || value.created_at || value.createdAt || value.updated_at || value.updatedAt, false);
}

function expenseAmount(value = {}) {
  return Math.abs(toNumber(value.amount ?? value.expense_amount ?? value.total ?? value.value ?? value.price ?? 0));
}

function expenseBudgetId(value = {}) {
  return clean(value.budget_id ?? value.budgetId ?? value.linked_budget_id ?? value.linkedBudgetId ?? "");
}

function expenseBudgetName(value = {}) {
  return clean(value.budget_name || value.budgetName || value.budget_title || value.budgetTitle || "");
}

function expenseSearchText(value = {}) {
  return clean([
    value.category, value.category_name, value.budget_category, value.budgetCategory,
    value.expense_category, value.expenseCategory, value.tag, value.type, value.need_type,
    value.needType, value.title, value.name, value.description, value.notes,
  ].filter(Boolean).join(" "));
}

function budgetFamily(value = {}) {
  return isFlexibleBudget(value) ? "flexible" : inferCategoryKey(budgetSearchText(value));
}

function candidateScore(value, purchaseCategory) {
  const search = budgetSearchText(value);
  const family = budgetFamily(value);
  if ((CATEGORY_ALIASES[purchaseCategory] || []).some((alias) => normalizeCategoryText(search) === normalizeCategoryText(alias))) return 120;
  if (family === purchaseCategory) return 100;
  if (includesCategoryAlias(search, CATEGORY_ALIASES[purchaseCategory] || [])) return 90;
  if (family === "flexible") return 60;
  return 0;
}

function buildBudgetMetadata(rawBudgets, purchaseCategory, now = new Date()) {
  return (Array.isArray(rawBudgets) ? rawBudgets : [])
    .filter((budget) => budget && typeof budget === "object" && budgetLimit(budget) > 0 && isBudgetActive(budget, now))
    .map((budget, index) => {
      const range = budgetRange(budget);
      const id = budgetId(budget);
      const storedSpent = budgetStoredSpent(budget);
      const limit = budgetLimit(budget);
      return {
        raw: budget,
        id,
        ownerKey: id || `budget-index-${index}`,
        index,
        title: budgetTitle(budget),
        family: budgetFamily(budget),
        flexible: isFlexibleBudget(budget),
        limit,
        storedSpent,
        preRemaining: Math.max(0, limit - storedSpent),
        rangeStart: range.start,
        rangeEnd: range.end,
        score: candidateScore(budget, purchaseCategory),
      };
    });
}

function expenseWithinRange(expense, budget) {
  const date = expenseDate(expense);
  return Boolean(date && date >= budget.rangeStart && date <= budget.rangeEnd);
}

function assignExpenseToBudget(expense = {}, budgets = []) {
  const active = budgets.filter((budget) => expenseWithinRange(expense, budget));
  const linkedId = expenseBudgetId(expense);
  if (linkedId) {
    const direct = active.find((budget) => budget.id && budget.id === linkedId);
    if (direct) return { budgetId: direct.id, ownerKey: direct.ownerKey, matchType: "direct_id", confidence: "high" };
  }
  const linkedName = normalizeCategoryText(expenseBudgetName(expense));
  if (linkedName) {
    const direct = active.find((budget) => normalizeCategoryText(budget.title) === linkedName);
    if (direct) return { budgetId: direct.id, ownerKey: direct.ownerKey, matchType: "direct_name", confidence: "high" };
  }

  const text = expenseSearchText(expense);
  const family = inferCategoryKey(text);
  const specific = active.filter((budget) => !budget.flexible && budget.family === family)
    .sort((left, right) => Number(containsCategoryPhrase(text, right.title)) - Number(containsCategoryPhrase(text, left.title)) || right.preRemaining - left.preRemaining || left.index - right.index)[0];
  if (specific) return { budgetId: specific.id, ownerKey: specific.ownerKey, matchType: "specific_category", confidence: "medium" };

  const flexible = active.filter((budget) => budget.flexible)
    .sort((left, right) => right.preRemaining - left.preRemaining || left.index - right.index)[0];
  return flexible ? { budgetId: flexible.id, ownerKey: flexible.ownerKey, matchType: "flexible", confidence: "medium" } : null;
}

function summarizeBudgets(budgets, rawExpenses) {
  const expenses = (Array.isArray(rawExpenses) ? rawExpenses : []).filter((expense) => expense && typeof expense === "object");
  const assignments = expenses.map((expense) => assignExpenseToBudget(expense, budgets));
  return budgets.map((budget) => {
    let reconstructedSpent = 0;
    let directlyLinkedSpent = 0;
    let assignedCount = 0;
    expenses.forEach((expense, index) => {
      const assignment = assignments[index];
      if (!assignment || assignment.ownerKey !== budget.ownerKey) return;
      const amount = expenseAmount(expense);
      reconstructedSpent += amount;
      assignedCount += 1;
      if (["direct_id", "direct_name"].includes(assignment.matchType)) directlyLinkedSpent += amount;
    });
    const effectiveSpent = Math.min(budget.limit, Math.max(budget.storedSpent, reconstructedSpent));
    const spentSource = directlyLinkedSpent > 0 && directlyLinkedSpent >= budget.storedSpent ? "linked_expenses" : budget.storedSpent > 0 ? "stored_budget" : "reconstructed";
    const dataConfidence = spentSource === "reconstructed" && assignedCount === 0 ? "medium" : "high";
    return {
      id: budget.id,
      ownerKey: budget.ownerKey,
      title: budget.title,
      family: budget.family,
      flexible: budget.flexible,
      matchType: budget.flexible ? "flexible" : "specific",
      score: budget.score,
      limit: budget.limit,
      spent: effectiveSpent,
      effectiveSpent,
      storedSpent: budget.storedSpent,
      reconstructedSpent,
      directlyLinkedSpent,
      spentSource,
      dataConfidence,
      remaining: Math.max(0, budget.limit - effectiveSpent),
      rangeStart: budget.rangeStart.toISOString(),
      rangeEnd: budget.rangeEnd.toISOString(),
    };
  });
}

function analyzeBuyCheckBudgetCoverage(item, price, context = {}, reason = "") {
  const amount = toNumber(price);
  const purchaseCategoryKey = inferPurchaseCategory({ item, reason });
  const wallet = getWalletBreakdown(context, amount);
  const metadata = buildBudgetMetadata(context.budgets, purchaseCategoryKey);
  const candidates = summarizeBudgets(metadata, context.expenses)
    .filter((budget) => budget.score > 0)
    .sort((left, right) => right.score - left.score || Number(left.flexible) - Number(right.flexible) || right.remaining - left.remaining);
  const fullBudget = candidates.find((budget) => budget.remaining >= amount) || null;
  const bestPartial = [...candidates].sort((left, right) => right.remaining - left.remaining || right.score - left.score)[0] || null;
  const selectedBudget = fullBudget || bestPartial;

  let status = "no_match";
  if (fullBudget && wallet.individualEnough) status = "full";
  else if (fullBudget) status = "wallet_shortfall";
  else if (bestPartial?.remaining > 0) status = "partial";
  else if (bestPartial) status = "exhausted";

  const walletFundingStatus = wallet.individualEnough ? "individual_wallet_ready" : wallet.combinedEnough ? "combined_only" : wallet.protectedMoneyNeeded ? "protected_money_needed" : "insufficient";
  return {
    status,
    purchaseCategory: CATEGORY_LABELS[purchaseCategoryKey] || "Lifestyle",
    purchaseCategoryKey,
    purchaseAmount: amount,
    spendable: wallet.spendableTotal,
    largestEligibleBalance: wallet.largestEligibleBalance,
    fundingWalletCount: wallet.fundingWalletCount,
    walletFundingStatus,
    walletShortfall: Math.max(0, amount - wallet.largestEligibleBalance),
    combinedWalletShortfall: Math.max(0, amount - wallet.spendableTotal),
    protectedMoneyNeeded: wallet.protectedMoneyNeeded,
    walletBreakdown: wallet,
    selectedBudget,
    candidates,
    scannedBudgetCount: metadata.length,
    matchedBudgetCount: candidates.length,
    flexibleBudgetCount: candidates.filter((budget) => budget.flexible).length,
    shortfall: selectedBudget ? Math.max(0, amount - selectedBudget.remaining) : amount,
    safeMaximum: selectedBudget ? Math.max(0, Math.min(selectedBudget.remaining, wallet.largestEligibleBalance)) : 0,
    remainingAfter: status === "full" && selectedBudget ? selectedBudget.remaining - amount : null,
    spendableAfter: wallet.spendableTotal - amount,
    dataConfidence: selectedBudget?.dataConfidence || (metadata.length ? "medium" : "low"),
  };
}

export {
  FLEXIBLE_NAMES,
  clean,
  toNumber,
  budgetId,
  budgetTitle,
  budgetLimit,
  budgetStoredSpent,
  isFlexibleBudget,
  parsePHBoundaryDate,
  budgetRange,
  isBudgetActive,
  buildBudgetMetadata,
  assignExpenseToBudget,
  analyzeBuyCheckBudgetCoverage,
};
