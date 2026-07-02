import { useEffect, useMemo, useState } from "react";
import useUserRole from "@/hooks/useUserRole";
import {
  firstValidNumber,
  getBudgetListTitle,
  getBudgetNeedType,
  getPHMonthKey,
  getPHMonthRange,
  normalizeLower,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";
import {
  getRecurringBudgetItems,
  getRecurringCashFlowOwnerId,
  RECURRING_CASH_FLOW_UPDATED_EVENT,
  resolveIncomeBasedBudgetPeriod,
} from "@/lib/recurringCashFlowRepository";

function readBudgetRange(header, ownerId) {
  const explicitStart = header?.cycle_start || header?.budget_cycle_start || header?.period_start || header?.range_start || header?.tracking_start_date;
  const explicitEnd = header?.cycle_end || header?.budget_cycle_end || header?.period_end || header?.range_end;
  if (explicitStart && explicitEnd) return { start: explicitStart, end: explicitEnd, source: "budget" };

  const incomePeriod = resolveIncomeBasedBudgetPeriod(ownerId, new Date());
  if (incomePeriod?.start && incomePeriod?.end) return incomePeriod;
  return { ...getPHMonthRange(), source: "existing_budget_period" };
}

export default function useDashboardManualExpenseBudgetOptions({ budgets = [] } = {}) {
  const { user } = useUserRole() || {};
  const ownerId = getRecurringCashFlowOwnerId(user);
  const [recurringTick, setRecurringTick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const refresh = () => setRecurringTick((current) => current + 1);
    window.addEventListener(RECURRING_CASH_FLOW_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(RECURRING_CASH_FLOW_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return useMemo(() => {
    const currentMonthKey = getPHMonthKey();
    const safeBudgets = Array.isArray(budgets) ? budgets : [];
    const seen = new Set();
    const header = safeBudgets.find((budget) => {
      const isHeader =
        budget?.is_plan_header === true ||
        budget?.plan_type === "monthly_budget" ||
        normalizeLower(budget?.category) === "__monthly_budget__" ||
        normalizeLower(budget?.budget_category) === "__monthly_budget__" ||
        normalizeLower(budget?.type) === "monthly_budget";
      const month = normalizeString(budget?.month || budget?.budget_month || budget?.month_key);
      return isHeader && (!month || month === currentMonthKey);
    }) || null;

    const existingOptions = safeBudgets
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
      });

    const period = readBudgetRange(header, ownerId);
    const recurringOptions = getRecurringBudgetItems({
      ownerId,
      budgets: safeBudgets,
      periodStart: period.start,
      periodEnd: period.end,
      budgetId: header?.id || `budget-${currentMonthKey}`,
      monthKey: currentMonthKey,
    });

    return [...recurringOptions, ...existingOptions]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  }, [budgets, ownerId, recurringTick]);
}
