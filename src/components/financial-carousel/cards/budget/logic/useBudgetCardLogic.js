import { useMemo, useState } from "react";

const PH_TIME_ZONE = "Asia/Manila";
const PHP_CURRENCY_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-PH", {
  timeZone: PH_TIME_ZONE,
  month: "short",
  year: "numeric",
});

export const fmt = (n) => PHP_CURRENCY_FORMATTER.format(Number(n || 0));

export const safeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const hasValue = (value) => value !== null && value !== undefined && value !== "";

const hasResetBoundary = (activeBudget = {}) => Boolean(
  activeBudget?.reset_start_at ||
    activeBudget?.tracking_started_at ||
    activeBudget?.tracking_start_date
);

const isProtectedBudgetCommitment = (item = {}) =>
  item?.isProtectedCommitment === true || item?.is_protected_commitment === true;

const readBudgetCategories = (activeBudget = {}) => {
  if (Array.isArray(activeBudget?.budgetDisplayCategories)) return activeBudget.budgetDisplayCategories;
  if (Array.isArray(activeBudget?.budget_display_categories)) return activeBudget.budget_display_categories;
  if (Array.isArray(activeBudget?.displayCategories)) return activeBudget.displayCategories;
  if (Array.isArray(activeBudget?.display_categories)) return activeBudget.display_categories;
  if (Array.isArray(activeBudget?.categories)) return activeBudget.categories;

  return [];
};

function getPHMonthKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  });
  return formatter.format(date);
}

function getCycleLabel(activeBudget = {}) {
  const raw = String(
    activeBudget?.budget_cycle ||
      activeBudget?.cycle_type ||
      activeBudget?.budget_rhythm ||
      activeBudget?.period_type ||
      "monthly"
  ).toLowerCase();

  if (raw.includes("week") && !raw.includes("bi")) return "Weekly";
  if (raw.includes("bi") || raw.includes("2")) return "Bi-weekly";
  if (raw.includes("custom")) return "Custom";
  return "Monthly";
}

function getCycleDisplayLabel(activeBudget = {}, monthKey = "") {
  const explicitStart = activeBudget?.cycle_start || activeBudget?.period_start || activeBudget?.reset_start_at;
  const explicitEnd = activeBudget?.cycle_end || activeBudget?.period_end;

  if (explicitStart && explicitEnd) return `${String(explicitStart).slice(0, 10)} - ${String(explicitEnd).slice(0, 10)}`;
  if (explicitStart) return `Since ${String(explicitStart).slice(0, 10)}`;

  const date = monthKey ? new Date(`${monthKey}-01T00:00:00`) : new Date();
  return Number.isNaN(date.getTime()) ? "" : MONTH_FORMATTER.format(date);
}

function getCategoryRisk(category) {
  const allocated = safeNumber(category?.allocated ?? category?.allocated_amount);
  const spent = safeNumber(category?.spent ?? category?.spent_amount ?? category?.used);
  const progress = allocated > 0 ? Math.min(999, (spent / allocated) * 100) : 0;

  if (progress >= 100) return { level: 4, label: "Limit reached", tone: "rose" };
  if (progress >= 85) return { level: 3, label: "Danger", tone: "orange" };
  if (progress >= 60) return { level: 2, label: "Watch", tone: "amber" };
  return { level: 1, label: "Healthy", tone: "emerald" };
}

export function getBudgetStatus(progress) {
  if (progress <= 50) {
    return {
      label: "Healthy",
      text: "text-emerald-200",
      badge: "bg-emerald-400/15 text-emerald-100 border border-emerald-300/25",
      bar: "from-emerald-300 via-teal-300 to-cyan-300",
      ring: "shadow-[0_0_26px_rgba(0,255,220,0.12)]",
    };
  }

  if (progress <= 80) {
    return {
      label: "Watching",
      text: "text-amber-200",
      badge: "bg-amber-400/15 text-amber-100 border border-amber-300/25",
      bar: "from-amber-300 via-yellow-300 to-orange-300",
      ring: "shadow-[0_0_26px_rgba(251,191,36,0.12)]",
    };
  }

  if (progress < 100) {
    return {
      label: "Tight",
      text: "text-orange-200",
      badge: "bg-orange-400/15 text-orange-100 border border-orange-300/25",
      bar: "from-orange-300 via-amber-300 to-yellow-300",
      ring: "shadow-[0_0_26px_rgba(251,146,60,0.12)]",
    };
  }

  return {
    label: "Maxed",
    text: "text-rose-200",
    badge: "bg-rose-400/15 text-rose-100 border border-rose-300/25",
    bar: "from-rose-300 via-pink-300 to-fuchsia-300",
    ring: "shadow-[0_0_26px_rgba(244,63,94,0.12)]",
  };
}

export function getRemainingAmountColor(progress) {
  if (progress < 60) return "text-emerald-200 drop-shadow-[0_0_10px_rgba(52,211,153,0.18)]";
  if (progress <= 85) return "text-amber-200 drop-shadow-[0_0_10px_rgba(251,191,36,0.18)]";
  return "text-rose-200 drop-shadow-[0_0_10px_rgba(244,63,94,0.18)]";
}

export function getBudgetMessage(hasDeclaredBudget, hasCategories, progress, remaining) {
  if (!hasDeclaredBudget) return "Declare this cycle's spending amount first.";
  if (!hasCategories) return "Now distribute your declared budget into categories.";
  if (remaining <= 0) return "You've fully used this cycle's allocated budget.";
  if (progress <= 50) return "You still have strong room left this cycle.";
  if (progress <= 80) return "You're doing fine. Just stay intentional from here.";
  if (progress < 100) return "You're close to the limit. Spend carefully now.";
  return "This budget cycle is already fully consumed.";
}

function buildBudgetPace({ activeBudget, monthKey, declared, spent, remaining }) {
  const cycleLabel = getCycleLabel(activeBudget);
  const cycleDisplayLabel = getCycleDisplayLabel(activeBudget, monthKey);
  const paceRatio = declared > 0 ? Math.min(999, (spent / declared) * 100) : 0;

  return {
    cycleLabel,
    cycleDisplayLabel,
    cycleRange: null,
    totalDays: 0,
    elapsedDays: 0,
    daysLeft: 0,
    safeDailyPace: remaining,
    paceRatio,
    label: paceRatio > 100 ? "Watch pace" : "Sustainable",
    message: paceRatio > 100 ? "You are ahead of your planned spending pace." : "Your current pace is sustainable for this cycle.",
    tone: paceRatio > 100 ? "border-amber-300/20 bg-amber-400/10 text-amber-50" : "border-emerald-300/18 bg-emerald-400/10 text-emerald-50",
    valueTone: paceRatio > 100 ? "text-amber-200" : "text-emerald-200",
  };
}

export default function useBudgetCardLogic({
  activeBudget = null,
  budgetCategories = [],
  declaredBudget = 0,
  unallocatedAmount = 0,
  isComplete = false,
} = {}) {
  const [showModal, setShowModal] = useState(false);

  const rawCategories = useMemo(
    () => (Array.isArray(budgetCategories) && budgetCategories.length ? budgetCategories : readBudgetCategories(activeBudget)),
    [activeBudget, budgetCategories]
  );

  const categories = useMemo(() => {
    return [...rawCategories]
      .map((item) => ({ ...item, risk: getCategoryRisk(item) }))
      .sort((a, b) => {
        const aProtected = isProtectedBudgetCommitment(a);
        const bProtected = isProtectedBudgetCommitment(b);

        if (aProtected !== bProtected) return aProtected ? -1 : 1;
        if (aProtected && bProtected) return 0;

        const aAllocated = safeNumber(a?.allocated ?? a?.allocated_amount);
        const bAllocated = safeNumber(b?.allocated ?? b?.allocated_amount);
        const aSpent = safeNumber(a?.spent ?? a?.spent_amount ?? a?.used);
        const bSpent = safeNumber(b?.spent ?? b?.spent_amount ?? b?.used);
        const aPct = aAllocated > 0 ? aSpent / aAllocated : 0;
        const bPct = bAllocated > 0 ? bSpent / bAllocated : 0;

        return bPct - aPct || bSpent - aSpent;
      });
  }, [rawCategories]);

  const categorySpent = categories.reduce(
    (sum, item) => sum + safeNumber(item?.spent ?? item?.spent_amount ?? item?.used),
    0
  );
  const plannedBreakdownSpent =
    safeNumber(activeBudget?.planned_spent ?? activeBudget?.plannedSpent) +
    safeNumber(activeBudget?.unplanned_spent ?? activeBudget?.unplannedSpent) +
    safeNumber(activeBudget?.undocumented_spent ?? activeBudget?.undocumentedSpent);
  const activeBudgetSpent = hasResetBoundary(activeBudget)
    ? Math.max(plannedBreakdownSpent, categorySpent)
    : Math.max(
        safeNumber(activeBudget?.spent),
        safeNumber(activeBudget?.spent_amount),
        safeNumber(activeBudget?.spent_total),
        safeNumber(activeBudget?.total_spent),
        safeNumber(activeBudget?.totalSpent),
        plannedBreakdownSpent,
        categorySpent
      );

  const declared = safeNumber(
    declaredBudget ||
      activeBudget?.declared_budget ||
      activeBudget?.declared_amount ||
      activeBudget?.monthly_budget_amount
  );
  const allocated = categories.length > 0
    ? categories.reduce((sum, item) => sum + safeNumber(item?.allocated ?? item?.allocated_amount), 0)
    : safeNumber(activeBudget?.allocated ?? activeBudget?.allocated_amount ?? activeBudget?.allocated_total ?? activeBudget?.totalAllocated);
  const spent = activeBudgetSpent;
  const protectedCommitments = safeNumber(
    activeBudget?.totalProtectedCommitments ??
      activeBudget?.protected_commitments_total ??
      activeBudget?.protectedBudgetCommitments?.totalProtectedCommitments ??
      activeBudget?.protected_budget_commitments?.totalProtectedCommitments ??
      activeBudget?.protected_budget_commitments?.total_protected_commitments
  );
  const protectedRowsTotal = categories.reduce(
    (sum, item) => isProtectedBudgetCommitment(item) ? sum + safeNumber(item?.allocated ?? item?.allocated_amount) : sum,
    0
  );
  const protectedReserved = Math.max(protectedCommitments, protectedRowsTotal);
  const explicitRemaining = safeNumber(
    activeBudget?.remaining ?? activeBudget?.remaining_amount ?? activeBudget?.amount_left ?? activeBudget?.totalRemaining
  );
  const hasExplicitRemaining = hasValue(activeBudget?.remaining) || hasValue(activeBudget?.remaining_amount) || hasValue(activeBudget?.amount_left) || hasValue(activeBudget?.totalRemaining);
  const remaining = protectedReserved > 0
    ? Math.max(declared - spent - protectedReserved, 0)
    : hasExplicitRemaining
      ? Math.max(explicitRemaining, 0)
      : Math.max(declared - spent, 0);
  const unallocated = Math.max(
    safeNumber(unallocatedAmount ?? activeBudget?.unallocated_amount ?? activeBudget?.unallocated ?? activeBudget?.unallocated_balance ?? activeBudget?.unallocatedBalance ?? declared - allocated),
    0
  );
  const progress = declared > 0
    ? Math.min(100, (spent / declared) * 100)
    : allocated > 0
      ? Math.min(100, (spent / allocated) * 100)
      : 0;
  const hasDeclaredBudget = declared > 0;
  const hasCategories = categories.length > 0 && allocated > 0;
  const planIsComplete =
    isComplete === true ||
    activeBudget?.is_complete === true ||
    (hasDeclaredBudget && unallocated === 0 && allocated === declared);
  const normalizedBudgetStatus = hasDeclaredBudget ? (planIsComplete ? "active" : "draft") : "empty";
  const status = getBudgetStatus(progress);
  const message = getBudgetMessage(hasDeclaredBudget, hasCategories, progress, remaining);
  const remainingAmountColor = getRemainingAmountColor(progress);
  const monthKey = activeBudget?.month || activeBudget?.month_key || getPHMonthKey();
  const budgetPace = buildBudgetPace({ activeBudget, monthKey, declared, spent, remaining });
  const badgeLabel = normalizedBudgetStatus === "active" ? "Active" : normalizedBudgetStatus === "draft" ? "Draft" : "No Plan";

  return {
    showModal,
    setShowModal,
    categories,
    declared,
    allocated,
    spent,
    remaining,
    unallocated,
    progress,
    hasDeclaredBudget,
    hasCategories,
    planIsComplete,
    normalizedBudgetStatus,
    status,
    message,
    remainingAmountColor,
    monthKey,
    badgeLabel,
    budgetPace,
  };
}
