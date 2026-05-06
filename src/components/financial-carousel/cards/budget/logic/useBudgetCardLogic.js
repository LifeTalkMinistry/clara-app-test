import { useMemo, useState } from "react";

export const fmt = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(n || 0));

export const safeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

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
  if (!hasDeclaredBudget) return "Declare this month’s spending amount first.";
  if (!hasCategories) return "Now distribute your declared budget into categories.";
  if (remaining <= 0) return "You’ve fully used this month’s allocated budget.";
  if (progress <= 50) return "You still have strong room left this month.";
  if (progress <= 80) return "You’re doing fine. Just stay intentional from here.";
  if (progress < 100) return "You’re close to the limit. Spend carefully now.";
  return "This monthly plan is already fully consumed.";
}

export default function useBudgetCardLogic({
  activeBudget = null,
  budgetCategories = [],
  declaredBudget = 0,
  unallocatedAmount = 0,
  isComplete = false,
} = {}) {
  const [showModal, setShowModal] = useState(false);

  const categories = useMemo(
    () =>
      Array.isArray(budgetCategories)
        ? budgetCategories
        : Array.isArray(activeBudget?.categories)
          ? activeBudget.categories
          : [],
    [activeBudget?.categories, budgetCategories]
  );

  const declared = safeNumber(
    declaredBudget ||
      activeBudget?.declared_budget ||
      activeBudget?.declared_amount ||
      activeBudget?.monthly_budget_amount
  );

  const allocated = safeNumber(
    activeBudget?.allocated_amount ??
      activeBudget?.allocated_total ??
      activeBudget?.total_budget ??
      categories.reduce(
        (sum, item) => sum + safeNumber(item?.allocated ?? item?.allocated_amount),
        0
      )
  );

  const spent = safeNumber(
    activeBudget?.spent ??
      activeBudget?.spent_amount ??
      activeBudget?.total_spent ??
      categories.reduce((sum, item) => sum + safeNumber(item?.spent ?? item?.spent_amount), 0)
  );

  const remaining = Math.max(
    safeNumber(activeBudget?.remaining ?? activeBudget?.remaining_amount ?? allocated - spent),
    0
  );

  const unallocated = Math.max(
    safeNumber(unallocatedAmount ?? activeBudget?.unallocated_amount ?? declared - allocated),
    0
  );

  const progress = useMemo(
    () => (allocated > 0 ? Math.min(100, (spent / allocated) * 100) : 0),
    [spent, allocated]
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
  const monthKey = activeBudget?.month || new Date().toISOString().slice(0, 7);
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
  };
}
