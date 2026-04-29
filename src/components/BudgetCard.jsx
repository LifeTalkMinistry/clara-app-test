import { useMemo, useState } from "react";
import {
  PieChart,
  RotateCcw,
  Edit3,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  Plus,
} from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(n || 0));

const safeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const getBudgetThemeClasses = (theme) => {
  const isLight = theme?.isLight === true;
  const tone = theme?.monthTone || theme?.moneyTone || "gold";

  const surfaces = isLight
    ? {
        gold:
          "bg-[linear-gradient(135deg,rgba(255,251,235,0.98),rgba(255,247,237,0.95),rgba(254,249,195,0.92))]",
        blue:
          "bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(224,231,255,0.95),rgba(219,234,254,0.92))]",
        teal:
          "bg-[linear-gradient(135deg,rgba(240,253,250,0.98),rgba(236,254,255,0.95),rgba(207,250,254,0.92))]",
        emerald:
          "bg-[linear-gradient(135deg,rgba(240,253,244,0.98),rgba(236,253,245,0.95),rgba(220,252,231,0.92))]",
      }
    : {
        gold:
          "bg-[linear-gradient(135deg,rgba(24,15,6,0.98),rgba(42,26,10,0.96),rgba(18,11,8,0.98))]",
        blue:
          "bg-[linear-gradient(135deg,rgba(10,20,54,0.98),rgba(18,44,112,0.94),rgba(10,18,40,0.98))]",
        teal:
          "bg-[linear-gradient(135deg,rgba(7,24,44,0.98),rgba(7,39,53,0.95),rgba(8,21,31,0.98))]",
        emerald:
          "bg-[linear-gradient(135deg,rgba(7,25,24,0.98),rgba(7,31,40,0.95),rgba(5,18,29,0.98))]",
      };

  const overlays = isLight
    ? {
        gold:
          "bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(253,224,71,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.16)_100%)]",
        blue:
          "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(147,197,253,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.16)_100%)]",
        teal:
          "bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(125,211,252,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.16)_100%)]",
        emerald:
          "bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(134,239,172,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.16)_100%)]",
      }
    : {
        gold:
          "bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(253,224,71,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]",
        blue:
          "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(147,197,253,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]",
        teal:
          "bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(125,211,252,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]",
        emerald:
          "bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(134,239,172,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]",
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
    ? {
        gold: "text-amber-700",
        blue: "text-blue-700",
        teal: "text-teal-700",
        emerald: "text-emerald-700",
      }
    : {
        gold: "text-amber-300",
        blue: "text-blue-300",
        teal: "text-teal-300",
        emerald: "text-emerald-300",
      };

  const glass = isLight
    ? "border-slate-300/45 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
    : "border-white/10 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

  const border = isLight ? "border-slate-300/45" : "border-white/10";
  const title = isLight ? "text-slate-900" : "text-white";
  const body = isLight ? "text-slate-700" : "text-white/82";
  const muted = isLight ? "text-slate-500" : "text-white/60";

  return {
    isLight,
    surface: surfaces[tone] || surfaces.emerald,
    overlay: overlays[tone] || overlays.emerald,
    iconShell: iconShells[tone] || iconShells.emerald,
    iconColor: iconColors[tone] || iconColors.emerald,
    glass,
    border,
    title,
    body,
    muted,
  };
};

function getBudgetStatus(progress) {
  if (progress <= 50) {
    return {
      label: "Healthy",
      text: "text-emerald-300",
      badge:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
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

function getRemainingAmountColor(progress, isLight) {
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

function getBudgetMessage(hasDeclaredBudget, hasCategories, progress, remaining) {
  if (!hasDeclaredBudget) return "Declare this month’s spending amount first.";
  if (!hasCategories) return "Now distribute your declared budget into categories.";
  if (remaining <= 0) return "You’ve fully used this month’s allocated budget.";
  if (progress <= 50) return "You still have strong room left this month.";
  if (progress <= 80) return "You’re doing fine. Just stay intentional from here.";
  if (progress < 100) return "You’re close to the limit. Spend carefully now.";
  return "This monthly plan is already fully consumed.";
}

function ActionModal({
  open,
  onClose,
  activeBudget,
  financeActionLoading,
  onSaveBudget,
  onResetBudget,
  theme,
}) {
  const themeClasses = getBudgetThemeClasses(theme);
  if (!open) return null;

  const hasDeclaredBudget = safeNumber(activeBudget?.declared_budget ?? activeBudget?.declared_amount) > 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="theme-modal-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <p className={`text-base font-semibold ${themeClasses.title}`}>Budget Actions</p>
            <p className={`mt-0.5 text-xs ${themeClasses.muted}`}>
              Build this month’s spending plan
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <button
            type="button"
            disabled={financeActionLoading}
            onClick={() => {
              onClose();
              onSaveBudget?.();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/15 px-4 py-3 text-sm font-semibold text-fuchsia-200 transition hover:bg-fuchsia-500/20 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {hasDeclaredBudget ? "Add Category" : "Declare Monthly Budget"}
          </button>

          {!!activeBudget?.category_count && (
            <button
              type="button"
              disabled={financeActionLoading}
              onClick={() => {
                onClose();
                onResetBudget?.();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Tracking Start
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BudgetCard({
  activeBudget = null,
  budgetCategories = [],
  declaredBudget = 0,
  unallocatedAmount = 0,
  budgetStatus = "",
  isComplete = false,
  unplannedSpent = 0,
  undocumentedSpent = 0,
  expanded = false,
  onToggleDetails,
  financeActionLoading = false,
  onSaveBudget,
  onEditBudgetCategory,
  onDeleteBudgetCategory,
  onResetBudget,
  theme = null,
}) {
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
      categories.reduce((sum, item) => sum + safeNumber(item?.allocated ?? item?.allocated_amount), 0)
  );

  const spent = safeNumber(
    activeBudget?.spent ??
      activeBudget?.spent_amount ??
      activeBudget?.total_spent ??
      categories.reduce((sum, item) => sum + safeNumber(item?.spent ?? item?.spent_amount), 0)
  );

  const remaining = Math.max(
    safeNumber(
      activeBudget?.remaining ??
        activeBudget?.remaining_amount ??
        allocated - spent
    ),
    0
  );

  const unallocated = Math.max(
    safeNumber(
      unallocatedAmount ??
        activeBudget?.unallocated_amount ??
        declared - allocated
    ),
    0
  );

  const progress = useMemo(
    () => (allocated > 0 ? Math.min(100, (spent / allocated) * 100) : 0),
    [spent, allocated]
  );

  const hasDeclaredBudget = declared > 0;
  const hasCategories = categories.length > 0 && allocated > 0;
  const planIsComplete = isComplete === true || activeBudget?.is_complete === true || (hasDeclaredBudget && unallocated === 0 && allocated === declared);
  const normalizedBudgetStatus = hasDeclaredBudget ? (planIsComplete ? "active" : "draft") : "empty";
  const status = getBudgetStatus(progress);
  const message = getBudgetMessage(hasDeclaredBudget, hasCategories, progress, remaining);
  const themeClasses = getBudgetThemeClasses(theme);
  const remainingAmountColor = getRemainingAmountColor(progress, themeClasses.isLight);
  const monthKey = activeBudget?.month || new Date().toISOString().slice(0, 7);
  const badgeLabel = normalizedBudgetStatus === "active" ? "Active" : normalizedBudgetStatus === "draft" ? "Draft" : "No Plan";

  return (
    <>
      <ActionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        activeBudget={activeBudget}
        financeActionLoading={financeActionLoading}
        onSaveBudget={onSaveBudget}
        onResetBudget={onResetBudget}
        theme={theme}
      />

      <div
        className={`relative mb-3 overflow-hidden rounded-3xl border shadow-2xl transition-all duration-200 ${themeClasses.border} ${status.ring}`}
      >
        <div className={`absolute inset-0 ${themeClasses.surface}`} />
        <div className={`pointer-events-none absolute inset-0 ${themeClasses.overlay}`} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/18 to-black/35" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_16%,transparent_38%)]" />

        <div className="relative z-10 p-4">
          <div className="mb-3 flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-sm ${themeClasses.iconShell}`}>
              <PieChart className={`h-4 w-4 ${themeClasses.iconColor}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-base font-semibold tracking-tight ${themeClasses.title}`}>
                    Budget
                  </p>
                  <p className={`mt-0.5 text-[11px] font-medium ${themeClasses.body}`}>
                    Monthly spending plan • {monthKey}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${status.badge}`}
                >
                  {badgeLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <p
              className={`text-[32px] font-bold leading-none ${
                hasDeclaredBudget ? status.text : "text-white/95"
              }`}
            >
              {fmt(declared)}
            </p>

            <p
              className={`mt-1.5 text-sm font-bold leading-tight ${remainingAmountColor}`}
            >
              {fmt(remaining)} left
            </p>

            <p className={`mt-2.5 max-w-[28rem] text-xs font-medium leading-relaxed ${themeClasses.body}`}>
              {message}
            </p>

            <p className={`mt-1 text-[11px] ${themeClasses.muted}`}>
              {hasDeclaredBudget
                ? planIsComplete
                  ? "Your monthly budget is fully assigned and ready for planned expense logging."
                  : `${fmt(unallocated)} still unallocated from your declared budget.`
                : "Your money needs a monthly plan before it disappears."}
            </p>
          </div>

          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-white/75">
              <span>Monthly progress</span>
              <span>{Math.round(progress)}%</span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/20">
              <div
                className={`relative h-full rounded-full bg-gradient-to-r ${status.bar} transition-all duration-500`}
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-40" />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/70">
              <span>{fmt(spent)}</span>
              <span>{fmt(allocated)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleDetails}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5 text-sm text-white/85 backdrop-blur-sm transition hover:bg-white/10"
          >
            <span className="font-medium">
              {expanded ? "Hide details" : "Show details"}
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="grid grid-cols-2 gap-2 text-center text-sm text-white">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Declared
                  </p>
                  <p className={`text-sm font-bold ${themeClasses.title}`}>{fmt(declared)}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Spent
                  </p>
                  <p className={`text-sm font-bold ${themeClasses.title}`}>{fmt(spent)}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Remaining
                  </p>
                  <p className={`text-sm font-bold ${themeClasses.title}`}>
                    {fmt(remaining)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Categories
                  </p>
                  <p className={`text-sm font-bold ${themeClasses.title}`}>
                    {categories.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-2.5 py-2.5">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100/65">
                    Unallocated
                  </p>
                  <p className="text-sm font-bold text-emerald-100">{fmt(unallocated)}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Allocated
                  </p>
                  <p className={`text-sm font-bold ${themeClasses.title}`}>
                    {fmt(allocated)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100/65">
                    Unplanned
                  </p>
                  <p className="mt-1 text-sm font-bold text-amber-100">{fmt(unplannedSpent)}</p>
                </div>
                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100/65">
                    Undocumented
                  </p>
                  <p className="mt-1 text-sm font-bold text-cyan-100">{fmt(undocumentedSpent)}</p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/90">
                    Monthly Spending Plan
                  </span>
                  <button
                    type="button"
                    onClick={() => onSaveBudget?.()}
                    disabled={financeActionLoading}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" />
                    {hasDeclaredBudget ? "Add" : "Start"}
                  </button>
                </div>

                {categories.length ? (
                  <div className="space-y-2">
                    {categories.map((item) => {
                      const categoryAllocated = safeNumber(item.allocated ?? item.allocated_amount);
                      const categorySpent = safeNumber(item.spent ?? item.spent_amount);
                      const categoryRemaining = Math.max(categoryAllocated - categorySpent, 0);
                      const categoryProgress = categoryAllocated > 0 ? Math.min(100, (categorySpent / categoryAllocated) * 100) : 0;

                      return (
                        <div
                          key={item.key || item.id || item.title}
                          className="rounded-2xl border border-white/10 bg-white/[0.045] p-3"
                        >
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-bold ${themeClasses.title}`}>
                                {item.title}
                              </p>
                              <p className="mt-0.5 text-[11px] text-white/55">
                                {fmt(categorySpent)} spent • {fmt(categoryRemaining)} left
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onEditBudgetCategory?.(item)}
                                disabled={financeActionLoading}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                                aria-label={`Edit ${item.title}`}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteBudgetCategory?.(item)}
                                disabled={financeActionLoading}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-300/15 bg-rose-500/10 text-rose-100/80 transition hover:bg-rose-500/15 hover:text-rose-100 disabled:opacity-50"
                                aria-label={`Delete ${item.title}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-black/25">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-sky-300 transition-all duration-500"
                              style={{ width: `${categoryProgress}%` }}
                            />
                          </div>

                          <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-white/55">
                            <span>{Math.round(categoryProgress)}%</span>
                            <span>{fmt(categoryAllocated)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-300/15 bg-emerald-500/10 p-4">
                    <p className="text-sm font-semibold text-emerald-50">
                      {hasDeclaredBudget ? "Add your budget categories next." : "Create this month’s spending plan."}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-emerald-50/70">
                      {hasDeclaredBudget
                        ? "Distribute your declared budget into categories like Bills, Food, Transportation, Family Support, or Personal."
                        : "Start by declaring your total monthly spending amount, then distribute it into categories."}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                >
                  <Edit3 className="h-4 w-4" />
                  Manage Budget
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
