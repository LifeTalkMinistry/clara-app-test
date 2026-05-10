import { useMemo } from "react";
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
    budget?.cycle_start ||
      budget?.budget_cycle_start ||
      budget?.period_start ||
      budget?.range_start ||
      budget?.tracking_start_date
  );
}

function getCycleEnd(budget) {
  return toDateOnly(
    budget?.cycle_end || budget?.budget_cycle_end || budget?.period_end || budget?.range_end
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
    budget?.budget_cycle || budget?.cycle_type || budget?.budget_rhythm || budget?.period_type || "monthly"
  );
}

function getBudgetCycleLabel(budget) {
  const type = getBudgetCycleType(budget);
  if (type === "weekly") return "Weekly";
  if (type === "biweekly" || type === "bi-weekly" || type === "2 weeks") return "Bi-weekly";
  if (type === "custom") return "Custom";
  return "Monthly";
}

export default function useDashboardMonthlyBudgetHeader({ budgets = [] } = {}) {
  const monthlyBudgetHeader = useMemo(() => {
    const currentMonthKey = getPHMonthKey();
    const currentDate = todayKey();
    const candidates = (Array.isArray(budgets) ? budgets : []).filter((budget) => {
      const month = normalizeString(
        budget?.month || budget?.budget_month || budget?.month_key
      );
      const isCurrentMonth = !month || month === currentMonthKey;
      const status = normalizeLower(budget?.status);
      const isActive = budget?.is_active !== false && budget?.active !== false;
      const isHeader =
        budget?.is_plan_header === true ||
        budget?.plan_type === "monthly_budget" ||
        normalizeLower(budget?.category) === "__monthly_budget__" ||
        normalizeLower(budget?.budget_category) === "__monthly_budget__" ||
        normalizeLower(budget?.type) === "monthly_budget";

      return (
        isCurrentMonth &&
        isActive &&
        !["inactive", "archived", "deleted", "closed"].includes(status) &&
        isHeader
      );
    });

    return (
      candidates.find((budget) => isInsideCycle(budget, currentDate)) ||
      candidates.find((budget) => normalizeLower(budget?.status) === "active") ||
      candidates[0] ||
      null
    );
  }, [budgets]);

  const declaredMonthlyBudgetAmount = useMemo(() => {
    return firstValidNumber(
      monthlyBudgetHeader?.declared_amount,
      monthlyBudgetHeader?.declared_budget,
      monthlyBudgetHeader?.monthly_budget_amount,
      monthlyBudgetHeader?.total_declared_budget,
      monthlyBudgetHeader?.total_budget,
      monthlyBudgetHeader?.budget_amount,
      monthlyBudgetHeader?.amount
    );
  }, [monthlyBudgetHeader]);

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

  return {
    monthlyBudgetHeader,
    declaredMonthlyBudgetAmount,
    budgetCycle,
  };
}
