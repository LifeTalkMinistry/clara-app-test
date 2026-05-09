import { useMemo } from "react";
import {
  firstValidNumber,
  getBudgetListTitle,
  getBudgetNeedType,
  getPHMonthKey,
  normalizeLower,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardManualExpenseBudgetOptions({ budgets = [] } = {}) {
  return useMemo(() => {
    const currentMonthKey = getPHMonthKey();
    const seen = new Set();

    return (Array.isArray(budgets) ? budgets : [])
      .filter((budget) => {
        const month = normalizeString(
          budget?.month || budget?.budget_month || budget?.month_key
        );
        const status = normalizeLower(budget?.status);
        const isActive = budget?.is_active !== false && budget?.active !== false;
        const isClosed = ["inactive", "archived", "deleted", "closed"].includes(status);
        const isHeader =
          budget?.is_plan_header === true ||
          budget?.plan_type === "monthly_budget" ||
          normalizeLower(budget?.category) === "__monthly_budget__" ||
          normalizeLower(budget?.budget_category) === "__monthly_budget__" ||
          normalizeLower(budget?.type) === "monthly_budget";

        return !isHeader && isActive && !isClosed && (!month || month === currentMonthKey);
      })
      .map((budget, index) => {
        const title = getBudgetListTitle(budget);
        const keySource =
          budget?.id ||
          budget?.section_key ||
          budget?.category ||
          budget?.budget_category ||
          title;

        return {
          key: String(keySource),
          id: budget?.id || null,
          title,
          needType: getBudgetNeedType(budget),
          allocated: firstValidNumber(
            budget?.allocated_amount,
            budget?.budget_amount,
            budget?.total_budget,
            budget?.amount,
            budget?.budget
          ),
          month: normalizeString(
            budget?.month || budget?.budget_month || budget?.month_key || currentMonthKey
          ),
          sortOrder: firstValidNumber(
            budget?.sort_order,
            budget?.display_order,
            budget?.position,
            index
          ),
          budget,
        };
      })
      .filter((item) => {
        const signature = normalizeLower(item.title);
        if (!signature || signature === "monthly spending plan" || seen.has(signature)) {
          return false;
        }
        seen.add(signature);
        return true;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  }, [budgets]);
}
