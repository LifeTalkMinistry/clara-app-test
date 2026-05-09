import { useMemo } from "react";
import {
  firstValidNumber,
  getPHMonthKey,
  normalizeLower,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardMonthlyBudgetHeader({ budgets = [] } = {}) {
  const monthlyBudgetHeader = useMemo(() => {
    const currentMonthKey = getPHMonthKey();

    return (
      (Array.isArray(budgets) ? budgets : []).find((budget) => {
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
      }) || null
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

  return {
    monthlyBudgetHeader,
    declaredMonthlyBudgetAmount,
  };
}
