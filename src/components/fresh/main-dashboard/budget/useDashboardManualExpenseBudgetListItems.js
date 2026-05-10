import { useMemo } from "react";
import { firstValidNumber, normalizeLower } from "@/utils/dashboard/dashboardHelpers";

const formatAmount = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })}`;

function getHealthTone({ allocated = 0, spent = 0 }) {
  if (allocated <= 0) return "neutral";
  const pct = Math.min((spent / allocated) * 100, 999);
  if (pct >= 100) return "rose";
  if (pct >= 65) return "amber";
  return "emerald";
}

function getHealthText({ allocated = 0, spent = 0, remaining = 0, safeFmt }) {
  if (allocated <= 0) return "Planned budget list";
  const pct = Math.min((spent / allocated) * 100, 999);
  if (pct >= 100) return `${safeFmt(remaining)} left • limit reached`;
  if (pct >= 85) return `${safeFmt(remaining)} left • high usage`;
  if (pct >= 65) return `${safeFmt(remaining)} left • watch pace`;
  return `${safeFmt(remaining)} left • healthy pace`;
}

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
    const categoryRows = Array.isArray(safeMonthlyBudgetPlan.categories)
      ? safeMonthlyBudgetPlan.categories
      : [];

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
      const itemId = String(item?.id || item?.key || "");
      const itemTitle = normalizeLower(item?.title);
      const matchingCategory =
        categoryRows.find((category) => {
          const categoryId = String(category?.id || category?.key || "");
          const categoryTitle = normalizeLower(category?.title);
          return (
            (itemId && categoryId && itemId === categoryId) ||
            (itemTitle && categoryTitle && itemTitle === categoryTitle)
          );
        }) || item;

      const allocated = firstValidNumber(matchingCategory?.allocated, item?.allocated);
      const spent = firstValidNumber(matchingCategory?.spent, matchingCategory?.used);
      const remaining = Math.max(firstValidNumber(matchingCategory?.remaining, allocated - spent), 0);

      return {
        key: item.key,
        id: item.id || null,
        title: item.title,
        subtitle: getHealthText({ allocated, spent, remaining, safeFmt }),
        tone: getHealthTone({ allocated, spent }),
        allocated,
        spent,
        remaining,
        disabled: !hasCompletedBudgetPlan,
        budget: item.budget || item,
      };
    });

    return [
      ...plannedItems,
      {
        key: "__unplanned__",
        title: "Unplanned Spending",
        subtitle: "Outside your active plan",
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
