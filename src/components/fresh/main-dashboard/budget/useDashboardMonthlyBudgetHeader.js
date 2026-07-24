import { useMemo } from "react";
import {
  isActiveBudgetHeader,
  isBudgetHeader,
  isInactiveBudgetPlan,
} from "@/lib/clara-budget-plan-truth";
import { getCycleWindow, isDerivedBudgetHeader } from "@/lib/clara-derived-budget";
import {
  firstValidNumber,
  getPHDateKey,
  getPHMonthKey,
  normalizeLower,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

function toDateOnly(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match && !raw.includes("T")) return match[1];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return match?.[1] || normalizeString(value).slice(0, 10);
  return getPHDateKey(parsed);
}

function todayKey() {
  return getPHDateKey();
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

function normalizeDerivedBudgetHeader(budget = {}) {
  if (!isDerivedBudgetHeader(budget)) return budget;

  const hasExplicitTrackingStart = Boolean(
    budget?.reset_start_at || budget?.tracking_started_at || budget?.tracking_start_date,
  );

  const createdAt = budget?.created_at || budget?.createdAt || "";
  const createdStart = toDateOnly(createdAt);

  // A derived budget must never judge transactions that happened before the
  // budget itself existed. Use the exact header creation timestamp as the
  // tracking boundary whenever older records do not already have one.
  let normalized =
    !hasExplicitTrackingStart && createdAt
      ? {
          ...budget,
          tracking_started_at: createdAt,
        }
      : budget;

  if (getBudgetCycleType(normalized) !== "monthly") return normalized;

  const storedStart = toDateOnly(
    normalized?.cycle_start ||
      normalized?.budget_cycle_start ||
      normalized?.period_start ||
      normalized?.range_start,
  );

  // Migration for monthly budgets created before Monthly became a rolling
  // period. Those plans were stored as the first/last day of the calendar
  // month even when the user created the budget later in the month.
  if (!storedStart || !createdStart || createdStart <= storedStart) return normalized;

  const rolling = getCycleWindow("monthly", createdStart, "");
  normalized = {
    ...normalized,
    cycle_start: rolling.start,
    budget_cycle_start: rolling.start,
    period_start: rolling.start,
    cycle_end: rolling.end,
    budget_cycle_end: rolling.end,
    period_end: rolling.end,
  };

  return normalized;
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
      .map(normalizeDerivedBudgetHeader)
      .filter((budget) => {
        const month = normalizeString(
          budget?.month || budget?.budget_month || budget?.month_key
        );
        const isCurrentMonth = !month || month === currentMonthKey;
        const isCurrentRollingCycle = isInsideCycle(budget, currentDate);

        return (
          (isCurrentMonth || isCurrentRollingCycle) &&
          isBudgetHeader(budget) &&
          !isInactiveBudgetPlan(budget)
        );
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
