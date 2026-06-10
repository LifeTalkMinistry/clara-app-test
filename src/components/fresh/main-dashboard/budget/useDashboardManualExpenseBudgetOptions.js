import { useMemo } from "react";
import {
  firstValidNumber,
  getBudgetListTitle,
  getBudgetNeedType,
  getPHMonthKey,
  normalizeLower,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";
import {
  doesBudgetRowBelongToCycle,
  isBudgetHeader,
  isBudgetRowInactive,
  selectDashboardBudgetHeaders,
} from "@/lib/clara-budget-cycle-authority";

export default function useDashboardManualExpenseBudgetOptions({
  budgets = [],
  budgetCycleHeader = null,
  user = null,
} = {}) {
  return useMemo(() => {
    const currentMonthKey = getPHMonthKey();
    const selectedHeaders = selectDashboardBudgetHeaders({
      budgets,
      currentMonthKey,
      user,
    });
    const resolvedCycleHeader = budgetCycleHeader || selectedHeaders.budgetCycleHeader;
    const seen = new Set();
    const options = (Array.isArray(budgets) ? budgets : [])
      .filter((budget) => {
        const month = normalizeString(
          budget?.month || budget?.budget_month || budget?.month_key
        );

        return (
          !isBudgetHeader(budget) &&
          !isBudgetRowInactive(budget) &&
          (!month || month === currentMonthKey) &&
          doesBudgetRowBelongToCycle(budget, resolvedCycleHeader)
        );
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
      .sort((left, right) =>
        left.sortOrder - right.sortOrder || left.title.localeCompare(right.title)
      );

    Object.defineProperties(options, {
      budgetCycleHeader: {
        value: resolvedCycleHeader || null,
        enumerable: false,
      },
      monthlyBudgetHeader: {
        value: selectedHeaders.monthlyBudgetHeader || null,
        enumerable: false,
      },
    });

    return options;
  }, [budgetCycleHeader, budgets, user]);
}
