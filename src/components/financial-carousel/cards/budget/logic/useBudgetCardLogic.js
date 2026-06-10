import { useMemo, useState } from "react";

const PH_TIME_ZONE = "Asia/Manila";

const PH_DATE_KEY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: PH_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const PHP_CURRENCY_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatDateKeyInPH(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const parts = PH_DATE_KEY_FORMATTER.formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  return year && month && day ? `${year}-${month}-${day}` : "";
}

function getPHMonthKey(value = new Date()) {
  return formatDateKeyInPH(value).slice(0, 7);
}

export const fmt = (n) =>
  PHP_CURRENCY_FORMATTER.format(Number(n || 0));

export const safeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

function toDateOnly(value) {
  if (!value) return "";

  const raw = String(value).trim();
  const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnly) return dateOnly[1];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10);

  return formatDateKeyInPH(parsed);
}

function todayKey() {
  return formatDateKeyInPH(new Date());
}

function daysBetween(start, end) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.floor((endDate - startDate) / 86400000);
}

function getMonthRange(monthKey = "") {
  const safeMonth = /^\d{4}-\d{2}$/.test(monthKey)
    ? monthKey
    : getPHMonthKey();
  const [year, month] = safeMonth.split("-").map(Number);
  const start = `${safeMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${safeMonth}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function getCycleRange(activeBudget, monthKey) {
  const fallback = getMonthRange(monthKey);
  const start = toDateOnly(
    activeBudget?.reset_start_at ||
      activeBudget?.tracking_started_at ||
      activeBudget?.tracking_start_date ||
      activeBudget?.cycle_start ||
      activeBudget?.budget_cycle_start ||
      activeBudget?.period_start ||
      activeBudget?.range_start ||
      activeBudget?.monthRange?.start
  );
  const end = toDateOnly(
    activeBudget?.cycle_end ||
      activeBudget?.budget_cycle_end ||
      activeBudget?.period_end ||
      activeBudget?.range_end ||
      activeBudget?.monthRange?.end
  );

  return {
    start: start || fallback.start,
    end: end || fallback.end,
  };
}

function hasResetBoundary(activeBudget = {}) {
  return Boolean(
    activeBudget?.reset_start_at ||
      activeBudget?.tracking_started_at ||
      activeBudget?.tracking_start_date
  );
}

function getCycleLabel(activeBudget) {
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

function getPaceState({ declared, spent, remaining, activeBudget, monthKey }) {
  const cycleRange = getCycleRange(activeBudget, monthKey);
  const today = todayKey();
  const totalDays = Math.max(daysBetween(cycleRange.start, cycleRange.end) + 1, 1);
  const elapsedDays = Math.min(
    Math.max(daysBetween(cycleRange.start, today) + 1, 1),
    totalDays
  );
  const daysLeft = Math.max(daysBetween(today, cycleRange.end) + 1, 1);
  const expectedSpend = declared > 0 ? (declared * elapsedDays) / totalDays : 0;
  const paceRatio = expectedSpend > 0 ? (spent / expectedSpend) * 100 : 0;
  const safeDailyPace = remaining > 0 ? remaining / daysLeft : 0;
  const cycleLabel = getCycleLabel(activeBudget);

  if (declared <= 0) {
    return {
      cycleLabel,
      cycleRange,
      totalDays,
      elapsedDays,
      daysLeft,
      safeDailyPace,
      paceRatio,
      label: "No plan yet",
      message: "Declare a budget to see your safe daily pace.",
      tone: "border-white/10 bg-white/[0.04] text-white/70",
      valueTone: "text-white/80",
    };
  }

  if (paceRatio > 120) {
    return {
      cycleLabel,
      cycleRange,
      totalDays,
      elapsedDays,
      daysLeft,
      safeDailyPace,
      paceRatio,
      label: "Fast pace",
      message: "You are spending faster than this cycle allows.",
      tone: "border-rose-300/20 bg-rose-500/10 text-rose-50",
      valueTone: "text-rose-200",
    };
  }

  if (paceRatio > 100) {
    return {
      cycleLabel,
      cycleRange,
      totalDays,
      elapsedDays,
      daysLeft,
      safeDailyPace,
      paceRatio,
      label: "Slightly fast",
      message: "You are a little ahead of your planned spending pace.",
      tone: "border-amber-300/20 bg-amber-400/10 text-amber-50",
      valueTone: "text-amber-200",
    };
  }

  return {
    cycleLabel,
    cycleRange,
    totalDays,
    elapsedDays,
    daysLeft,
    safeDailyPace,
    paceRatio,
    label: "Sustainable",
    message: "Your current pace is sustainable for this cycle.",
    tone: "border-emerald-300/18 bg-emerald-400/10 text-emerald-50",
    valueTone: "text-emerald-200",
  };
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
  if (progress < 60) {
    return "text-emerald-200 drop-shadow-[0_0_10px_rgba(52,211,153,0.18)]";
  }

  if (progress <= 85) {
    return "text-amber-200 drop-shadow-[0_0_10px_rgba(251,191,36,0.18)]";
  }

  return "text-rose-200 drop-shadow-[0_0_10px_rgba(244,63,94,0.18)]";
}

export function getBudgetMessage(hasDeclaredBudget, hasCategories, progress, remaining) {
  if (!hasDeclaredBudget) return "Declare this cycle’s spending amount first.";
  if (!hasCategories) return "Now distribute your declared budget into categories.";
  if (remaining <= 0) return "You’ve fully used this cycle’s allocated budget.";
  if (progress <= 50) return "You still have strong room left this cycle.";
  if (progress <= 80) return "You’re doing fine. Just stay intentional from here.";
  if (progress < 100) return "You’re close to the limit. Spend carefully now.";
  return "This budget cycle is already fully consumed.";
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
    () =>
      Array.isArray(budgetCategories)
        ? budgetCategories
        : Array.isArray(activeBudget?.categories)
          ? activeBudget.categories
          : [],
    [activeBudget?.categories, budgetCategories]
  );

  const categories = useMemo(() => {
    return [...rawCategories]
      .map((item) => ({
        ...item,
        risk: getCategoryRisk(item),
      }))
      .sort((a, b) => {
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
  const plannedBreakdownSpent = safeNumber(activeBudget?.planned_spent) +
    safeNumber(activeBudget?.plannedSpent) +
    safeNumber(activeBudget?.unplanned_spent) +
    safeNumber(activeBudget?.unplannedSpent) +
    safeNumber(activeBudget?.undocumented_spent) +
    safeNumber(activeBudget?.undocumentedSpent);
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

  const categoryAllocatedTotal = categories.reduce(
    (sum, item) => sum + safeNumber(item?.allocated ?? item?.allocated_amount),
    0
  );
  const explicitAllocated = safeNumber(
    activeBudget?.allocated ??
      activeBudget?.allocated_amount ??
      activeBudget?.allocated_total ??
      activeBudget?.totalAllocated
  );
  const allocated = categories.length > 0 ? categoryAllocatedTotal : explicitAllocated;

  const spent = activeBudgetSpent;

  const remaining = Math.max(declared - spent, 0);

  const unallocated = Math.max(
    safeNumber(unallocatedAmount ?? activeBudget?.unallocated_amount ?? activeBudget?.unallocated ?? activeBudget?.unallocated_balance ?? activeBudget?.unallocatedBalance ?? declared - allocated),
    0
  );

  const progress = useMemo(
    () => (declared > 0 ? Math.min(100, (spent / declared) * 100) : allocated > 0 ? Math.min(100, (spent / allocated) * 100) : 0),
    [spent, allocated, declared]
  );

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
  const budgetPace = getPaceState({ declared, spent, remaining, activeBudget, monthKey });
  const badgeLabel =
    normalizedBudgetStatus === "active"
      ? "Active"
      : normalizedBudgetStatus === "draft"
        ? "Draft"
        : "No Plan";

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
