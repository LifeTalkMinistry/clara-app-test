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
      text: "text-emerald-300",
      badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
      bar: "from-emerald-400 via-lime-300 to-cyan-300",
      ring: "shadow-[0_0_24px_rgba(52,211,153,0.16)]",
    };
  }

  if (progress <= 80) {
    return {
      label: "Watching",
      text: "text-amber-300",
      badge: "bg-amber-500/15 text-amber-300 border border-amber-400/25",
      bar: "from-amber-400 via-yellow-300 to-orange-300",
      ring: "shadow-[0_0_24px_rgba(251,191,36,0.14)]",
    };
  }

  if (progress < 100) {
    return {
      label: "Tight",
      text: "text-orange-300",
      badge: "bg-orange-500/15 text-orange-300 border border-orange-400/25",
      bar: "from-orange-400 via-amber-300 to-yellow-300",
      ring: "shadow-[0_0_24px_rgba(251,146,60,0.14)]",
    };
  }

  return {
    label: "Maxed",
    text: "text-rose-300",
    badge: "bg-rose-500/15 text-rose-300 border border-rose-400/25",
    bar: "from-rose-400 via-pink-300 to-fuchsia-300",
    ring: "shadow-[0_0_24px_rgba(244,63,94,0.14)]",
  };
}

export function getRemainingAmountColor(progress, isLight) {
  if (progress < 60) {
    return isLight
      ? "text-emerald-700 drop-shadow-[0_0_10px_rgba(16,185,129,0.12)]"
      : "text-emerald-200 drop-shadow-[0_0_12px_rgba(52,211,153,0.18)]";
  }

  if (progress <= 85) {
    return isLight
      ? "text-amber-700 drop-shadow-[0_0_10px_rgba(245,158,11,0.12)]"
      : "text-amber-200 drop-shadow-[0_0_12px_rgba(251,191,36,0.18)]";
  }

  return isLight
    ? "text-rose-700 drop-shadow-[0_0_10px_rgba(244,63,94,0.12)]"
    : "text-rose-200 drop-shadow-[0_0_12px_rgba(244,63,94,0.18)]";
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

export function getBudgetThemeClasses(theme) {
  const isLight = theme?.isLight === true;
  const tone = theme?.monthTone || theme?.moneyTone || "gold";

  const surfaces = isLight
    ? {
        gold: "bg-[linear-gradient(135deg,rgba(255,251,235,0.98),rgba(255,247,237,0.95),rgba(254,249,195,0.92))]",
        blue: "bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(224,231,255,0.95),rgba(219,234,254,0.92))]",
        teal: "bg-[linear-gradient(135deg,rgba(240,253,250,0.98),rgba(236,254,255,0.95),rgba(207,250,254,0.92))]",
        emerald: "bg-[linear-gradient(135deg,rgba(240,253,244,0.98),rgba(236,253,245,0.95),rgba(220,252,231,0.92))]",
      }
    : {
        gold: "bg-[linear-gradient(135deg,rgba(24,15,6,0.98),rgba(42,26,10,0.96),rgba(18,11,8,0.98))]",
        blue: "bg-[linear-gradient(135deg,rgba(10,20,54,0.98),rgba(18,44,112,0.94),rgba(10,18,40,0.98))]",
        teal: "bg-[linear-gradient(135deg,rgba(7,24,44,0.98),rgba(7,39,53,0.95),rgba(8,21,31,0.98))]",
        emerald: "bg-[linear-gradient(135deg,rgba(7,25,24,0.98),rgba(7,31,40,0.95),rgba(5,18,29,0.98))]",
      };

  const overlays = isLight
    ? {
        gold: "bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(253,224,71,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.16)_100%)]",
        blue: "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(147,197,253,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.16)_100%)]",
        teal: "bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(125,211,252,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.16)_100%)]",
        emerald: "bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(134,239,172,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.16)_100%)]",
      }
    : {
        gold: "bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(253,224,71,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]",
        blue: "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(147,197,253,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]",
        teal: "bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(125,211,252,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]",
        emerald: "bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(134,239,172,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]",
      };

  const iconShells = isLight
    ? {
        gold: "border-amber-300/40 bg-amber-500/12 shadow-[0_0_18px_rgba(245,158,11,0.10)]",
        blue: "border-blue-300/40 bg-blue-500/10 shadow-[0_0_18px_rgba(59,130,246,0.10)]",
        teal: "border-teal-300/40 bg-teal-500/10 shadow-[0_0_18px_rgba(20,184,166,0.10)]",
        emerald: "border-emerald-300/40 bg-emerald-500/10 shadow-[0_0_18px_rgba(16,185,129,0.10)]",
      }
    : {
        gold: "border-amber-400/20 bg-amber-500/10 shadow-[0_0_18px_rgba(245,158,11,0.12)]",
        blue: "border-blue-400/20 bg-blue-500/10 shadow-[0_0_18px_rgba(59,130,246,0.12)]",
        teal: "border-teal-400/20 bg-teal-500/10 shadow-[0_0_18px_rgba(20,184,166,0.12)]",
        emerald: "border-emerald-400/20 bg-emerald-500/10 shadow-[0_0_18px_rgba(16,185,129,0.12)]",
      };

  const iconColors = isLight
    ? { gold: "text-amber-700", blue: "text-blue-700", teal: "text-teal-700", emerald: "text-emerald-700" }
    : { gold: "text-amber-300", blue: "text-blue-300", teal: "text-teal-300", emerald: "text-emerald-300" };

  return {
    isLight,
    surface: surfaces[tone] || surfaces.emerald,
    overlay: overlays[tone] || overlays.emerald,
    iconShell: iconShells[tone] || iconShells.emerald,
    iconColor: iconColors[tone] || iconColors.emerald,
    glass: isLight ? "border-slate-300/45 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]" : "border-white/10 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
    border: isLight ? "border-slate-300/45" : "border-white/10",
    title: isLight ? "text-slate-900" : "text-white",
    body: isLight ? "text-slate-700" : "text-white/82",
    muted: isLight ? "text-slate-500" : "text-white/60",
  };
}

export default function useBudgetCardLogic({
  activeBudget = null,
  budgetCategories = [],
  declaredBudget = 0,
  unallocatedAmount = 0,
  isComplete = false,
  theme = null,
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

  const decoratedCategories = useMemo(
    () =>
      categories.map((item) => {
        const categoryAllocated = safeNumber(item?.allocated ?? item?.allocated_amount);
        const categorySpent = safeNumber(item?.spent ?? item?.spent_amount);
        const categoryRemaining = Math.max(categoryAllocated - categorySpent, 0);
        const categoryProgress = categoryAllocated > 0 ? Math.min(100, (categorySpent / categoryAllocated) * 100) : 0;
        return {
          ...item,
          categoryAllocated,
          categorySpent,
          categoryRemaining,
          categoryProgress,
        };
      }),
    [categories]
  );

  const declared = safeNumber(
    declaredBudget || activeBudget?.declared_budget || activeBudget?.declared_amount || activeBudget?.monthly_budget_amount
  );

  const allocated = safeNumber(
    activeBudget?.allocated_amount ??
      activeBudget?.allocated_total ??
      activeBudget?.total_budget ??
      categories.reduce((sum, item) => sum + safeNumber(item?.allocated ?? item?.allocated_amount), 0)
  );

  const spent = safeNumber(
    activeBudget?.spent ??
      activeBudget?.spent_amount ??
      activeBudget?.total_spent ??
      categories.reduce((sum, item) => sum + safeNumber(item?.spent ?? item?.spent_amount), 0)
  );

  const remaining = Math.max(safeNumber(activeBudget?.remaining ?? activeBudget?.remaining_amount ?? allocated - spent), 0);
  const unallocated = Math.max(safeNumber(unallocatedAmount ?? activeBudget?.unallocated_amount ?? declared - allocated), 0);

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
  const themeClasses = getBudgetThemeClasses(theme);
  const remainingAmountColor = getRemainingAmountColor(progress, themeClasses.isLight);
  const monthKey = activeBudget?.month || new Date().toISOString().slice(0, 7);
  const badgeLabel = normalizedBudgetStatus === "active" ? "Active" : normalizedBudgetStatus === "draft" ? "Draft" : "No Plan";

  return {
    fmt,
    safeNumber,
    getBudgetThemeClasses,
    allocated,
    badgeLabel,
    categories: decoratedCategories,
    declared,
    hasCategories,
    hasDeclaredBudget,
    message,
    monthKey,
    normalizedBudgetStatus,
    planIsComplete,
    progress,
    remaining,
    remainingAmountColor,
    setShowModal,
    showModal,
    spent,
    status,
    themeClasses,
    unallocated,
  };
}
