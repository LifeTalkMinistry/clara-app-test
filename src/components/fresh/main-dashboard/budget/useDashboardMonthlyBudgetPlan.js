import { useEffect, useMemo, useState } from "react";
import { hasActiveBudgetPlan as resolveActivePlan } from "@/lib/clara-budget-plan-truth";
import {
  firstValidNumber,
  getPHMonthKey,
  getPHMonthRange,
  getTransactionDate,
  normalizeLower,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

const PLANNED_STATUSES = new Set(["planned", "budget_risk", "over_budget"]);
const BUDGET_PROTECTION_STORAGE_KEY = "clara_budget_protection_settings";
const BUDGET_PROTECTION_UPDATED_EVENT = "clara:budget-protection-settings-updated";
const DEFAULT_BUDGET_PROTECTION_SETTINGS = {
  setupCompleted: false,
  includeSavingsGoals: false,
  savingsGoalMode: "none",
  selectedSavingsGoalIds: [],
  savingsContributionMode: "goalMonthly",
  savingsGoalMonthlyAmounts: {},
  includeEmergencyFund: false,
  emergencyFundContributionMode: "fixed",
  emergencyFundMonthlyAmount: 0,
};

const hasTime = (value) => /T\d{2}:\d{2}/.test(String(value || ""));
const toTime = (value) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? null : time;
};
const toEndTime = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnly) {
    const time = new Date(`${dateOnly[1]}T23:59:59.999`).getTime();
    return Number.isNaN(time) ? null : time;
  }
  return toTime(value);
};
const toDateOnly = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match && !hasTime(raw)) return match[1];
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? normalizeString(value).slice(0, 10) : date.toISOString().slice(0, 10);
};
const safeArray = (value) => (Array.isArray(value) ? value : []);
const protectionNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(String(value).replace(/php/gi, "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(numeric) ? numeric : fallback;
};
const normalizeProtectionText = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const categoryLabel = (category = {}) => category.title || category.name || category.category || category.budget_category || category.category_name || "";
const hasProtectedDuplicate = (categories, type) => {
  const terms = type === "emergency" ? ["emergency fund", "emergency"] : ["savings goal", "savings", "save", "goal", "investment"];
  return safeArray(categories).some((category) => {
    const label = normalizeProtectionText(categoryLabel(category));
    return label && terms.some((term) => {
      const normalizedTerm = normalizeProtectionText(term);
      return label === normalizedTerm || label.includes(normalizedTerm) || normalizedTerm.includes(label);
    });
  });
};
const cleanSettings = (settings = {}) => ({
  ...DEFAULT_BUDGET_PROTECTION_SETTINGS,
  ...settings,
  setupCompleted: settings.setupCompleted === true,
  includeSavingsGoals: settings.includeSavingsGoals === true,
  savingsGoalMode: ["none", "selected", "all"].includes(settings.savingsGoalMode) ? settings.savingsGoalMode : "none",
  selectedSavingsGoalIds: safeArray(settings.selectedSavingsGoalIds).map(String).filter(Boolean),
  savingsContributionMode: ["goalMonthly", "fixed", "targetDate"].includes(settings.savingsContributionMode) ? settings.savingsContributionMode : "goalMonthly",
  savingsGoalMonthlyAmounts: settings.savingsGoalMonthlyAmounts && typeof settings.savingsGoalMonthlyAmounts === "object" ? settings.savingsGoalMonthlyAmounts : {},
  includeEmergencyFund: settings.includeEmergencyFund === true,
  emergencyFundContributionMode: ["fixed", "setupTarget", "leftover"].includes(settings.emergencyFundContributionMode) ? settings.emergencyFundContributionMode : "fixed",
  emergencyFundMonthlyAmount: Math.max(0, protectionNumber(settings.emergencyFundMonthlyAmount)),
});
const readBudgetProtectionSettings = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return cleanSettings();
    const raw = window.localStorage.getItem(BUDGET_PROTECTION_STORAGE_KEY);
    return raw ? cleanSettings(JSON.parse(raw)) : cleanSettings();
  } catch {
    return cleanSettings();
  }
};
const goalId = (goal = {}, index = 0) => String(goal.id || goal.goal_id || goal.key || `goal-${index}`);
const goalTitle = (goal = {}, index = 0) => String(goal.title || goal.name || goal.goal_name || `Savings Goal ${index + 1}`);
const goalTarget = (goal = {}) => protectionNumber(goal.target_amount ?? goal.targetAmount ?? goal.goal_amount ?? goal.target ?? goal.goal);
const goalSaved = (goal = {}) => protectionNumber(goal.saved_amount ?? goal.current_amount ?? goal.saved ?? goal.current ?? goal.amount);
const goalMonthly = (goal = {}) => protectionNumber(goal.monthly_contribution ?? goal.monthlyContribution ?? goal.monthly_amount ?? goal.monthlyAmount ?? goal.target_monthly_amount ?? goal.recommended_monthly_amount);
const goalTargetDate = (goal = {}) => goal.target_date || goal.targetDate || goal.deadline || goal.planned_use_date || goal.plannedUseDate || "";
const monthsUntil = (value) => {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  const diff = date.getTime() - Date.now();
  return diff <= 0 ? 1 : Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24 * 30.4375)));
};
const isActiveGoal = (goal = {}) => {
  const status = normalizeProtectionText(goal.status || goal.goal_status || goal.state || "active");
  if (["done", "completed", "complete", "archived", "inactive"].includes(status)) return false;
  const target = goalTarget(goal);
  return target <= 0 || goalSaved(goal) < target;
};
const emergencyConfigured = (emergencyFund) => {
  if (emergencyFund === undefined) return true;
  if (!emergencyFund || typeof emergencyFund !== "object") return false;
  const target = protectionNumber(emergencyFund.target_amount ?? emergencyFund.targetAmount ?? emergencyFund.target ?? emergencyFund.goal_amount);
  const current = protectionNumber(emergencyFund.current_amount ?? emergencyFund.saved_amount ?? emergencyFund.saved ?? emergencyFund.amount);
  const survival = protectionNumber(emergencyFund.monthly_survival_cost ?? emergencyFund.survivalExpense ?? emergencyFund.monthly_expense);
  return target > 0 || current > 0 || survival > 0 || emergencyFund.is_configured === true || emergencyFund.setupCompleted === true;
};
const emergencySetupTargetAmount = (emergencyFund = {}) => {
  const direct = protectionNumber(emergencyFund.monthly_contribution ?? emergencyFund.monthlyContribution ?? emergencyFund.monthly_amount ?? emergencyFund.monthlyAmount ?? emergencyFund.recommended_monthly_amount);
  if (direct > 0) return direct;
  const target = protectionNumber(emergencyFund.target_amount ?? emergencyFund.targetAmount ?? emergencyFund.target ?? emergencyFund.goal_amount);
  const current = protectionNumber(emergencyFund.current_amount ?? emergencyFund.saved_amount ?? emergencyFund.saved ?? emergencyFund.amount);
  const months = monthsUntil(emergencyFund.target_date || emergencyFund.targetDate || emergencyFund.deadline);
  return target > current && months > 0 ? (target - current) / months : 0;
};
function buildProtectedBudgetCommitments(settings, { savingsGoals = [], emergencyFund = undefined, budgetCategories = [] } = {}) {
  const clean = cleanSettings(settings);
  if (!clean.setupCompleted) {
    return {
      savingsGoalsAmount: 0,
      emergencyFundAmount: 0,
      totalProtectedCommitments: 0,
      includedSavingsGoals: [],
      includedEmergencyFund: false,
      emergencyFundFlexible: false,
      setupCompleted: false,
      explanation: ["Budget protection setup is not completed yet, so savings and emergency fund may not be fully reserved."],
    };
  }

  let savingsGoalsAmount = 0;
  let includedSavingsGoals = [];
  const explanation = [];

  if (clean.includeSavingsGoals && clean.savingsGoalMode !== "none") {
    if (hasProtectedDuplicate(budgetCategories, "savings")) {
      explanation.push("Savings protection already appears as a budget category, so CLARA did not deduct it again.");
    } else {
      const activeGoals = safeArray(savingsGoals).filter(isActiveGoal).map((goal, index) => ({ goal, id: goalId(goal, index), title: goalTitle(goal, index) }));
      const selectedIds = new Set(clean.selectedSavingsGoalIds.map(String));
      const selectedGoals = clean.savingsGoalMode === "all" ? activeGoals : activeGoals.filter((item) => selectedIds.has(String(item.id)));
      includedSavingsGoals = selectedGoals.map((item) => {
        const remaining = Math.max(goalTarget(item.goal) - goalSaved(item.goal), 0);
        const months = monthsUntil(goalTargetDate(item.goal));
        const amount = clean.savingsContributionMode === "fixed"
          ? protectionNumber(clean.savingsGoalMonthlyAmounts?.[item.id])
          : clean.savingsContributionMode === "targetDate" && months > 0
            ? remaining / months
            : goalMonthly(item.goal);
        return { id: item.id, title: item.title, amount: Math.max(0, amount), remaining };
      });
      savingsGoalsAmount = includedSavingsGoals.reduce((sum, item) => sum + protectionNumber(item.amount), 0);
      if (!activeGoals.length && clean.savingsContributionMode === "fixed") {
        savingsGoalsAmount = Object.values(clean.savingsGoalMonthlyAmounts || {}).reduce((sum, amount) => sum + protectionNumber(amount), 0);
      }
      explanation.push(savingsGoalsAmount > 0 ? `Savings Goals protected: ₱${savingsGoalsAmount.toLocaleString("en-PH", { maximumFractionDigits: 0 })} reserved.` : "Savings Goals are included, but no monthly contribution amount is available yet.");
    }
  }

  let emergencyFundAmount = 0;
  let includedEmergencyFund = false;
  let emergencyFundFlexible = false;
  if (clean.includeEmergencyFund) {
    includedEmergencyFund = true;
    if (hasProtectedDuplicate(budgetCategories, "emergency")) {
      explanation.push("Emergency Fund already appears as a budget category, so CLARA did not deduct it again.");
    } else if (!emergencyConfigured(emergencyFund)) {
      explanation.push("Emergency Fund not set up yet, so no emergency reserve was deducted.");
    } else if (clean.emergencyFundContributionMode === "leftover") {
      emergencyFundFlexible = true;
      explanation.push("Emergency Fund protection is set to use leftover money after essentials.");
    } else {
      emergencyFundAmount = clean.emergencyFundContributionMode === "setupTarget"
        ? emergencySetupTargetAmount(emergencyFund || {})
        : clean.emergencyFundMonthlyAmount;
      explanation.push(emergencyFundAmount > 0 ? `Emergency Fund protection: ₱${emergencyFundAmount.toLocaleString("en-PH", { maximumFractionDigits: 0 })} reserved.` : "Emergency Fund is included, but no monthly reserve amount is available yet.");
    }
  }

  const totalProtectedCommitments = Math.max(0, savingsGoalsAmount) + Math.max(0, emergencyFundAmount);
  return {
    savingsGoalsAmount: Math.max(0, savingsGoalsAmount),
    emergencyFundAmount: Math.max(0, emergencyFundAmount),
    totalProtectedCommitments,
    includedSavingsGoals,
    includedEmergencyFund,
    emergencyFundFlexible,
    setupCompleted: true,
    explanation: explanation.filter(Boolean),
    settings: clean,
  };
}

function expenseDate(expense = {}, start = "") {
  if (!hasTime(start)) return getTransactionDate(expense);
  return expense.created_at || expense.createdAt || expense.logged_at || expense.spent_at ||
    expense.transaction_date || expense.transactionDate || expense.date || getTransactionDate(expense);
}

function cycleSource(header, options) {
  if (header) return header;
  const option = options.find((item) => {
    const budget = item?.budget || item;
    return Boolean(budget?.reset_start_at || budget?.tracking_started_at ||
      budget?.tracking_start_date || budget?.budget_cycle || budget?.cycle_type ||
      budget?.budget_rhythm || budget?.period_type || budget?.cycle_start ||
      budget?.cycle_end || budget?.period_start || budget?.period_end);
  });
  return option?.budget || option || null;
}

function cycleRange(source) {
  const fallback = getPHMonthRange();
  const start = source?.reset_start_at || source?.tracking_started_at ||
    source?.tracking_start_date || source?.cycle_start || source?.budget_cycle_start ||
    source?.period_start || source?.range_start;
  const end = source?.cycle_end || source?.budget_cycle_end || source?.period_end || source?.range_end;
  return { start: start || fallback.start, end: end || fallback.end, hasTimestampStart: hasTime(start) };
}

function inCycle(expense, range) {
  if (range.hasTimestampStart) {
    const start = toTime(range.start);
    const end = toEndTime(range.end);
    const time = toTime(expenseDate(expense, range.start));
    return !(start !== null && (time === null || time < start)) &&
      !(end !== null && time !== null && time > end);
  }
  const date = toDateOnly(expenseDate(expense, range.start));
  const start = toDateOnly(range.start);
  const end = toDateOnly(range.end);
  return Boolean(date && start && end && date >= start && date <= end);
}

function cycleType(source) {
  const raw = normalizeLower(source?.budget_cycle || source?.cycle_type ||
    source?.budget_rhythm || source?.period_type || "monthly");
  if (raw.includes("week") && !raw.includes("bi")) return "weekly";
  if (raw.includes("bi") || raw.includes("2")) return "biweekly";
  return raw.includes("custom") ? "custom" : "monthly";
}

const cycleLabel = (type) =>
  type === "weekly" ? "Weekly" : type === "biweekly" ? "Bi-weekly" :
    type === "custom" ? "Custom" : "Monthly";

const expenseCategory = (expense = {}) => normalizeString(
  expense.budget_category || expense.expense_category || expense.category || expense.budgetCategory || ""
);
const expenseBudgetId = (expense = {}) => normalizeString(
  expense.budget_category_id || expense.budget_item_id || expense.budget_id || expense.budgetCategoryId || ""
);
function expenseStatus(expense = {}) {
  const status = normalizeLower(expense.planning_status || expense.budget_status ||
    expense.plan_status || expense.budgetStatus || "");
  if (status) return status;
  const category = normalizeLower(expenseCategory(expense));
  if (category.includes("unplanned")) return "unplanned";
  if (category.includes("undocumented")) return "undocumented";
  return "planned";
}

function matchingOption(expense, options) {
  const category = normalizeLower(expenseCategory(expense));
  const budgetId = expenseBudgetId(expense);
  return options.find((item) => {
    const id = normalizeString(item?.id || item?.key || "");
    const title = normalizeLower(item?.title);
    return (id && budgetId && id === budgetId) || (title && category && title === category);
  }) || null;
}

function outsideItem(expense, type, index) {
  const amount = firstValidNumber(expense?.amount, expense?.spent, expense?.value, expense?.total);
  const date = expense?.created_at || expense?.createdAt || expense?.logged_at ||
    expense?.spent_at || expense?.transaction_date || expense?.transactionDate ||
    expense?.date || getTransactionDate(expense);
  return {
    ...expense,
    id: expense?.id || expense?.key || `${type}-${index}-${date || amount}`,
    type,
    status: type,
    planning_status: type,
    title: expense?.title || expense?.name || expense?.merchant || expense?.description ||
      expenseCategory(expense) || (type === "undocumented" ? "Undocumented expense" : "Unplanned expense"),
    category: expenseCategory(expense) || "No category",
    amount,
    date,
    sortTime: toTime(date) || 0,
  };
}

export default function useDashboardMonthlyBudgetPlan({
  manualExpenseBudgetOptions = [],
  expenses = [],
  declaredMonthlyBudgetAmount = 0,
  monthlyBudgetHeader = null,
  savingsGoals = [],
  emergencyFund = null,
} = {}) {
  const [budgetProtectionSettings, setBudgetProtectionSettings] = useState(() => readBudgetProtectionSettings());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncProtectionSettings = () => setBudgetProtectionSettings(readBudgetProtectionSettings());
    window.addEventListener("storage", syncProtectionSettings);
    window.addEventListener(BUDGET_PROTECTION_UPDATED_EVENT, syncProtectionSettings);
    return () => {
      window.removeEventListener("storage", syncProtectionSettings);
      window.removeEventListener(BUDGET_PROTECTION_UPDATED_EVENT, syncProtectionSettings);
    };
  }, []);

  return useMemo(() => {
    const options = Array.isArray(manualExpenseBudgetOptions) ? manualExpenseBudgetOptions : [];
    const allExpenses = Array.isArray(expenses) ? expenses : [];
    const source = cycleSource(monthlyBudgetHeader, options);
    const monthKey = normalizeString(source?.month || source?.budget_month || source?.month_key || getPHMonthKey());
    const monthRange = cycleRange(source);
    const type = cycleType(source);
    const resetStartAt = source?.reset_start_at || source?.tracking_started_at || source?.tracking_start_date || "";
    const activeExpenses = allExpenses.filter((expense) => inCycle(expense, monthRange));

    const rawCategories = options.map((item) => {
      const id = normalizeString(item?.id || item?.key || "");
      const title = normalizeString(item?.title || "");
      const spent = activeExpenses.reduce((sum, expense) => {
        const matches = (id && expenseBudgetId(expense) === id) ||
          normalizeLower(expenseCategory(expense)) === normalizeLower(title);
        return matches && [...PLANNED_STATUSES, "unplanned"].includes(expenseStatus(expense))
          ? sum + firstValidNumber(expense?.amount) : sum;
      }, 0);
      const allocated = firstValidNumber(item?.allocated);
      return {
        ...item,
        allocated,
        spent,
        used: spent,
        remaining: Math.max(allocated - spent, 0),
        pct: allocated > 0 ? Math.min((spent / allocated) * 100, 999) : 0,
      };
    });

    const matchedPlanned = rawCategories.reduce(
      (sum, item) => sum + firstValidNumber(item?.spent, item?.used), 0
    );
    const unmatchedPlanned = activeExpenses.reduce((sum, expense) => {
      if (!PLANNED_STATUSES.has(expenseStatus(expense)) || matchingOption(expense, options)) return sum;
      return sum + firstValidNumber(expense?.amount);
    }, 0);
    const rawUnplannedItems = activeExpenses
      .filter((expense) => expenseStatus(expense) === "unplanned" && !matchingOption(expense, options))
      .map((expense, index) => outsideItem(expense, "unplanned", index));
    const rawUndocumentedItems = activeExpenses
      .filter((expense) => expenseStatus(expense) === "undocumented")
      .map((expense, index) => outsideItem(expense, "undocumented", index));
    const sumAmounts = (items) => items.reduce(
      (sum, expense) => sum + firstValidNumber(expense?.amount), 0
    );
    const rawPlannedSpent = matchedPlanned + unmatchedPlanned;
    const rawUnplannedSpent = sumAmounts(rawUnplannedItems);
    const rawUndocumentedSpent = sumAmounts(rawUndocumentedItems);
    const rawSpent = rawPlannedSpent + rawUnplannedSpent + rawUndocumentedSpent;
    const rawAllocated = rawCategories.reduce(
      (sum, item) => sum + firstValidNumber(item?.allocated), 0
    );
    const rawDeclared = firstValidNumber(declaredMonthlyBudgetAmount);
    const hasActiveBudgetPlan = resolveActivePlan({
      header: monthlyBudgetHeader,
      declaredBudget: rawDeclared,
      fallbackActive: rawDeclared > 0,
    });
    const protectedBudgetCommitments = buildProtectedBudgetCommitments(budgetProtectionSettings, {
      savingsGoals,
      emergencyFund,
      budgetCategories: rawCategories,
    });
    const protectedCommitmentsTotal = hasActiveBudgetPlan || rawDeclared > 0
      ? firstValidNumber(protectedBudgetCommitments.totalProtectedCommitments)
      : 0;

    const declared = hasActiveBudgetPlan ? rawDeclared : 0;
    const allocated = rawAllocated + protectedCommitmentsTotal;
    const plannedSpent = hasActiveBudgetPlan ? rawPlannedSpent : 0;
    const unplannedSpent = hasActiveBudgetPlan ? rawUnplannedSpent : 0;
    const undocumentedSpent = hasActiveBudgetPlan ? rawUndocumentedSpent : 0;
    const spent = hasActiveBudgetPlan ? rawSpent : 0;
    const categories = rawCategories;
    const unplannedItems = hasActiveBudgetPlan ? rawUnplannedItems : [];
    const undocumentedItems = hasActiveBudgetPlan ? rawUndocumentedItems : [];
    const outsidePlanItems = hasActiveBudgetPlan
      ? [...rawUnplannedItems, rawUndocumentedItems].flat().sort(
          (a, b) => firstValidNumber(b?.sortTime) - firstValidNumber(a?.sortTime)
        )
      : [];
    const unallocated = rawDeclared > 0 ? Math.max(rawDeclared - allocated, 0) : 0;
    const remaining = hasActiveBudgetPlan ? Math.max(declared - spent - protectedCommitmentsTotal, 0) : 0;
    const complete = hasActiveBudgetPlan && categories.length > 0 &&
      allocated >= declared && unallocated <= 0;

    return {
      monthKey, month_key: monthKey, month: monthKey, monthRange,
      budget_cycle: type, cycle_type: type, budget_rhythm: type, period_type: type,
      cycle_label: cycleLabel(type), cycle_start: monthRange.start, cycle_end: monthRange.end,
      period_start: monthRange.start, period_end: monthRange.end,
      reset_start_at: resetStartAt || null,
      tracking_started_at: resetStartAt || null,
      tracking_start_date: resetStartAt || null,
      declared_budget: declared, declaredBudget: declared, declaredAmount: declared,
      allocated, allocated_total: allocated, totalAllocated: allocated,
      categoryAllocated: rawAllocated, category_allocated: rawAllocated,
      protectedBudgetCommitments, protected_budget_commitments: protectedBudgetCommitments,
      totalProtectedCommitments: protectedCommitmentsTotal, protected_commitments_total: protectedCommitmentsTotal,
      planned_spent: plannedSpent, plannedSpent,
      unplanned_spent: unplannedSpent, unplannedSpent,
      undocumented_spent: undocumentedSpent, undocumentedSpent,
      unplanned_items: unplannedItems, unplannedItems,
      undocumented_items: undocumentedItems, undocumentedItems,
      outside_plan_items: outsidePlanItems, outsidePlanItems,
      spent, spent_amount: spent, spent_total: spent, total_spent: spent, totalSpent: spent,
      remaining, remaining_amount: remaining, amount_left: remaining, totalRemaining: remaining,
      unallocated, unallocated_balance: unallocated, unallocatedBalance: unallocated,
      categories, categoryRows: categories,
      active_cycle_expense_count: hasActiveBudgetPlan ? activeExpenses.length : 0,
      is_complete: complete, isComplete: complete,
      hasActiveBudgetPlan, has_active_budget_plan: hasActiveBudgetPlan,
      hasDeclaredBudget: hasActiveBudgetPlan,
      hasCategories: hasActiveBudgetPlan && categories.length > 0,
      status: hasActiveBudgetPlan ? "active" : "no_plan",
      normalizedBudgetStatus: hasActiveBudgetPlan ? "active" : "no_plan",
    };
  }, [budgetProtectionSettings, declaredMonthlyBudgetAmount, emergencyFund, expenses, manualExpenseBudgetOptions, monthlyBudgetHeader, savingsGoals]);
}
