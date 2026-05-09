import { useMemo } from "react";
import { firstValidNumber } from "@/utils/dashboard/dashboardHelpers";

const formatAmount = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })}`;

export default function useDashboardManualExpenseBudgetListItems({
  manualExpenseBudgetOptions = [],
  monthlyBudgetPlan = null,
  fmt,
} = {}) {
  return useMemo(() => {
    const safeBudgetOptions = Array.isArray(manualExpenseBudgetOptions)
      ? manualExpenseBudgetOptions
      : [];
    const safeMonthlyBudgetPlan = monthlyBudgetPlan || {};
    const safeFmt = typeof fmt === "function" ? fmt : formatAmount;

    const declaredBudget = firstValidNumber(
      safeMonthlyBudgetPlan.declared_budget,
      safeMonthlyBudgetPlan.declaredBudget,
      safeMonthlyBudgetPlan.declaredAmount
    );
    const unallocated = firstValidNumber(
      safeMonthlyBudgetPlan.unallocated,
      safeMonthlyBudgetPlan.unallocated_balance,
      safeMonthlyBudgetPlan.unallocatedBalance
    );
    const hasCompletedBudgetPlan =
      safeMonthlyBudgetPlan.is_complete === true ||
      safeMonthlyBudgetPlan.isComplete === true ||
      (declaredBudget > 0 && unallocated <= 0 && safeBudgetOptions.length > 0);

    const plannedItems = safeBudgetOptions.map((item) => {
      const allocated = firstValidNumber(item?.allocated);

      return {
        key: item.key,
        id: item.id || null,
        title: item.title,
        subtitle: allocated > 0 ? `${safeFmt(allocated)} allocated` : "Planned budget list",
        tone: "emerald",
        disabled: !hasCompletedBudgetPlan,
        budget: item.budget || item,
      };
    });

    return [
      ...plannedItems,
      {
        key: "__unplanned__",
        title: "Unplanned Spending",
        subtitle: "Outside your active budget",
        tone: "amber",
        disabled: false,
      },
      {
        key: "__undocumented__",
        title: "Undocumented Spending",
        subtitle: "Record now, clarify later",
        tone: "cyan",
        disabled: false,
      },
    ];
  }, [fmt, manualExpenseBudgetOptions, monthlyBudgetPlan]);
}
