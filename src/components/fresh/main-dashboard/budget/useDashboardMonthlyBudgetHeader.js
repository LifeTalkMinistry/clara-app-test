import { useMemo } from "react";
import {
  isActiveBudgetHeader,
  isBudgetHeader,
  isInactiveBudgetPlan,
} from "@/lib/clara-budget-plan-truth";
import {
  firstValidNumber,
  getPHMonthKey,
  normalizeLower,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

function toDateOnly(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return normalizeString(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getCycleStart(budget) {
  return toDateOnly(
    budget?.reset_start_at ||
      budget?.tracking_started_at ||
      budget?.tracking_start_date ||
      budget?.cycle_start ||
      budget?.budget_cycle_start ||
      budget?.period_start ||
      budget?.range_start
  );
}

function getCycleEnd(budget) {
  return toDateOnly(
    budget?.cycle_end ||
      budget?.budget_cycle_end ||
      budget?.period_end ||
      budget?.range_end
  );
}

function isInsideCycle(budget, currentDate = todayKey()) {
  const start = getCycleStart(budget);
  const end = getCycleEnd(budget);
  if (!start && !end) return false;
  if (start && currentDate < start) return false;
  if (end && currentDate > end) return false;
  return true;
}

function getBudgetCycleType(budget) {
  return normalizeLower(
    budget?.budget_cycle ||
      budget?.cycle_type ||
      budget?.budget_rhythm ||
      budget?.period_type ||
      "monthly"
  );
}

function getBudgetCycleLabel(budget) {
  const type = getBudgetCycleType(budget);
  if (type === "weekly") return "Weekly";
  if (type === "biweekly" || type === "bi-weekly" || type === "2 weeks") {
    return "Bi-weekly";
  }
  if (type === "custom") return "Custom";
  return "Monthly";
}

function getTimestamp(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function useDashboardMonthlyBudgetHeader({ budgets = [], includeDraft = false } = {}) {
  const monthlyBudgetHeader = useMemo(() => {
    const currentMonthKey = getPHMonthKey();
    const currentDate = todayKey();
    const currentHeaders = (Array.isArray(budgets) ? budgets : [])
      .filter((budget) => {
        const month = normalizeString(
          budget?.month || budget?.budget_month || budget?.month_key
        );
        const isCurrentMonth = !month || month === currentMonthKey;

        return isCurrentMonth && isBudgetHeader(budget) && !isInactiveBudgetPlan(budget);
      })
      .sort(
        (a, b) =>
          getTimestamp(b?.updated_at || b?.created_at) -
          getTimestamp(a?.updated_at || a?.created_at)
      );

    const activeCandidates = currentHeaders.filter(isActiveBudgetHeader);
    const activeHeader =
      activeCandidates.find((budget) => isInsideCycle(budget, currentDate)) ||
      activeCandidates[0] ||
      null;

    if (activeHeader || !includeDraft) return activeHeader;

    const draftCandidates = currentHeaders.filter((budget) => !isActiveBudgetHeader(budget));
    return (
      draftCandidates.find((budget) => isInsideCycle(budget, currentDate)) ||
      draftCandidates[0] ||
      null
    );
  }, [budgets, includeDraft]);

  const declaredMonthlyBudgetAmount = useMemo(() => {
    if (!monthlyBudgetHeader) return 0;
    if (!includeDraft && !isActiveBudgetHeader(monthlyBudgetHeader)) return 0;

    return firstValidNumber(
      monthlyBudgetHeader?.declared_amount,
      monthlyBudgetHeader?.declared_budget,
      monthlyBudgetHeader?.monthly_budget_amount,
      monthlyBudgetHeader?.total_declared_budget,
      monthlyBudgetHeader?.total_budget,
      monthlyBudgetHeader?.budget_amount,
      monthlyBudgetHeader?.amount
    );
  }, [monthlyBudgetHeader, includeDraft]);

  const budgetCycle = useMemo(() => {
    const start = getCycleStart(monthlyBudgetHeader);
    const end = getCycleEnd(monthlyBudgetHeader);

    return {
      type: getBudgetCycleType(monthlyBudgetHeader),
      label: getBudgetCycleLabel(monthlyBudgetHeader),
      start,
      end,
      hasCustomRange: Boolean(start || end),
    };
  }, [monthlyBudgetHeader]);

  const hasActiveBudgetPlan = isActiveBudgetHeader(monthlyBudgetHeader);

  return {
    monthlyBudgetHeader,
    declaredMonthlyBudgetAmount,
    budgetCycle,
    hasActiveBudgetPlan,
    hasDraftBudgetPlan: Boolean(monthlyBudgetHeader) && !hasActiveBudgetPlan,
  };
}
