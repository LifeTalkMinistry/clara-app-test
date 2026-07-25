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

function formatDueDate(value) {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(value);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function recurringBillSubtitle(item, matchingCategory) {
  const candidates = [
    matchingCategory?.budget,
    matchingCategory,
    item?.budget,
    item,
  ].filter(Boolean);
  const record = candidates.find(
    (candidate) =>
      candidate.isRecurringBillOccurrence === true ||
      candidate.is_recurring_bill_occurrence === true
  );
  if (!record) return "";
  const dueDate = record.occurrenceDueDate || record.occurrence_due_date;
  const estimated = record.estimated === true;
  return `${estimated ? "Estimated" : "Bill"}${dueDate ? ` · Due ${formatDueDate(dueDate)}` : ""} · Auto-added`;
}

function installProtectedFindBridge(options, protectedOptions) {
  if (!Array.isArray(options) || !Array.isArray(protectedOptions)) return;

  const nativeFind = Array.prototype.find;
  const currentFind = options.find;
  const currentProtectedOptions = Array.isArray(currentFind?.__claraProtectedOptions)
    ? currentFind.__claraProtectedOptions
    : [];
  const mergedProtectedOptions = [...currentProtectedOptions];

  protectedOptions.forEach((option) => {
    const key = String(option?.key || "");
    const existingIndex = mergedProtectedOptions.findIndex(
      (item) => String(item?.key || "") === key
    );
    if (existingIndex >= 0) mergedProtectedOptions[existingIndex] = option;
    else mergedProtectedOptions.push(option);
  });

  const bridgedFind = function bridgedFind(predicate, thisArg) {
    const direct = nativeFind.call(this, predicate, thisArg);
    if (direct !== undefined) return direct;
    return nativeFind.call(bridgedFind.__claraProtectedOptions, predicate, thisArg);
  };
  bridgedFind.__claraProtectedOptions = mergedProtectedOptions;

  try {
    Object.defineProperty(options, "find", {
      configurable: true,
      writable: true,
      enumerable: false,
      value: bridgedFind,
    });
  } catch {
    // Manual Log can still display protected rows even if the compatibility bridge cannot be installed.
  }
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
      const billSubtitle = recurringBillSubtitle(item, matchingCategory);

      return {
        key: item.key,
        id: item.id || null,
        title: item.title,
        subtitle: billSubtitle || getHealthText({ allocated, spent, remaining, safeFmt }),
        tone: getHealthTone({ allocated, spent }),
        allocated,
        spent,
        remaining,
        needType: item.needType || item.need_type || item?.budget?.need_type || "need",
        disabled: !hasCompletedBudgetPlan,
        budget: item.budget || item,
      };
    });

    const plannedKeys = new Set(plannedItems.map((item) => String(item?.key || "")));
    const plannedTitles = new Set(plannedItems.map((item) => normalizeLower(item?.title)));
    const displayRows = Array.isArray(safeMonthlyBudgetPlan.budgetDisplayCategories)
      ? safeMonthlyBudgetPlan.budgetDisplayCategories
      : Array.isArray(safeMonthlyBudgetPlan.budget_display_categories)
        ? safeMonthlyBudgetPlan.budget_display_categories
        : [];

    const protectedItems = displayRows
      .filter(
        (row) =>
          row?.isProtectedCommitment === true ||
          row?.is_protected_commitment === true
      )
      .filter((row) => {
        const key = String(row?.key || row?.id || "");
        const title = normalizeLower(row?.title || row?.name || row?.category);
        return !(key && plannedKeys.has(key)) && !(title && plannedTitles.has(title));
      })
      .map((row) => {
        const allocated = firstValidNumber(row?.allocated, row?.allocated_amount);
        const spent = firstValidNumber(row?.spent, row?.spent_amount, row?.used);
        const remaining = Math.max(firstValidNumber(row?.remaining, allocated - spent), 0);
        const protectionType = normalizeLower(row?.protectionType || row?.protection_type);
        const key = String(row?.key || row?.id || row?.title);

        return {
          key,
          id: row?.id || key,
          title: row?.title || row?.name || "Protected money",
          subtitle: `${safeFmt(remaining)} left • protected`,
          tone: protectionType === "savings" ? "violet" : "cyan",
          allocated,
          spent,
          remaining,
          needType: "other",
          disabled: !hasCompletedBudgetPlan,
          isProtectedCommitment: true,
          protectionType,
          budget: {
            ...row,
            key,
            linked_target_type: protectionType || row?.linked_target_type || null,
            linkedTargetType: protectionType || row?.linkedTargetType || null,
          },
        };
      });

    // Compatibility bridge for the legacy Manual Log save handler: it still resolves
    // selections through manualExpenseBudgetOptions.find(). Extend only `find`, rather
    // than adding synthetic rows to the array, so the budget engine's map/reduce logic
    // never double-counts protected money.
    installProtectedFindBridge(safeBudgetOptions, protectedItems);

    return [
      ...protectedItems,
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
