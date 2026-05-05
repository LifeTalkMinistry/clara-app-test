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

const glassPanel =
  "border border-cyan-100/15 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_24px_rgba(0,255,220,0.045)] backdrop-blur-sm";

const softButton =
  "rounded-xl border border-cyan-100/15 bg-white/[0.055] text-white/85 transition hover:border-cyan-100/25 hover:bg-white/10 hover:text-white disabled:opacity-50";

function getBudgetStatus(progress) {
  if (progress <= 50) {
    return {
      label: "Healthy",
      text: "text-emerald-200",
      badge: "bg-emerald-400/15 text-emerald-100 border border-emerald-300/25",
      bar: "from-emerald-300 via-teal-300 to-cyan-300",
      ring: "shadow-[0_0_34px_rgba(0,255,220,0.14)]",
    };
  }

  if (progress <= 80) {
    return {
      label: "Watching",
      text: "text-amber-200",
      badge: "bg-amber-400/15 text-amber-100 border border-amber-300/25",
      bar: "from-amber-300 via-yellow-300 to-orange-300",
      ring: "shadow-[0_0_34px_rgba(251,191,36,0.14)]",
    };
  }

  if (progress < 100) {
    return {
      label: "Tight",
      text: "text-orange-200",
      badge: "bg-orange-400/15 text-orange-100 border border-orange-300/25",
      bar: "from-orange-300 via-amber-300 to-yellow-300",
      ring: "shadow-[0_0_34px_rgba(251,146,60,0.14)]",
    };
  }

  return {
    label: "Maxed",
    text: "text-rose-200",
    badge: "bg-rose-400/15 text-rose-100 border border-rose-300/25",
    bar: "from-rose-300 via-pink-300 to-fuchsia-300",
    ring: "shadow-[0_0_34px_rgba(244,63,94,0.14)]",
  };
}

function getRemainingAmountColor(progress) {
  if (progress < 60) {
    return "text-emerald-200 drop-shadow-[0_0_12px_rgba(52,211,153,0.20)]";
  }

  if (progress <= 85) {
    return "text-amber-200 drop-shadow-[0_0_12px_rgba(251,191,36,0.20)]";
  }

  return "text-rose-200 drop-shadow-[0_0_12px_rgba(244,63,94,0.20)]";
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
}) {
  if (!open) return null;

  const hasDeclaredBudget =
    safeNumber(activeBudget?.declared_budget ?? activeBudget?.declared_amount) > 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[30px] border border-cyan-200/15 bg-[linear-gradient(135deg,rgba(6,48,66,0.98),rgba(7,20,48,0.96)_48%,rgba(37,13,74,0.96))] text-white shadow-[0_30px_90px_rgba(0,0,0,0.72),0_0_44px_rgba(0,255,220,0.14)]">
        <div className="relative border-b border-white/10 px-5 py-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.10] hover:text-white"
            aria-label="Close budget actions"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="pr-12">
            <div className="mb-3 inline-flex items-center rounded-full border border-cyan-200/15 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-50/85">
              Budget setup
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">Budget Actions</h3>
            <p className="mt-2 text-sm leading-6 text-white/65">Build this month’s spending plan.</p>
          </div>
        </div>

        <div className="space-y-3 px-5 py-5">
          <button
            type="button"
            disabled={financeActionLoading}
            onClick={() => {
              onClose();
              onSaveBudget?.();
            }}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_24px_rgba(0,255,220,0.10)] transition hover:bg-cyan-300/15 disabled:opacity-50"
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
              className={`${softButton} flex min-h-[52px] w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold`}
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

  return (
    <>
      <ActionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        activeBudget={activeBudget}
        financeActionLoading={financeActionLoading}
        onSaveBudget={onSaveBudget}
        onResetBudget={onResetBudget}
      />

      <div
        className={`relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-[30px] border border-cyan-100/20 bg-[linear-gradient(135deg,rgba(6,48,66,0.96),rgba(7,20,48,0.94)_48%,rgba(37,13,74,0.94))] shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_42px_rgba(0,255,220,0.10),0_0_62px_rgba(126,34,206,0.12)] backdrop-blur-2xl transition-all duration-200 ${status.ring}`}
      >
        <div className="pointer-events-none absolute -left-28 -top-32 h-72 w-72 rounded-full bg-cyan-300/25 blur-[86px]" />
        <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-purple-500/25 blur-[92px]" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-blue-500/12 blur-[84px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,255,220,0.30),transparent_34%),radial-gradient(circle_at_top_right,rgba(126,34,206,0.28),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.00)_38%,rgba(255,255,255,0.04)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/12 via-black/8 to-black/26" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.16),rgba(255,255,255,0.04)_35%,transparent_100%)]" />
        <div className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/10" />

        <div className="relative z-10 flex h-full min-h-0 flex-col p-4">
          <div className="flex min-h-0 flex-1 flex-col justify-between">
            <div>
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-white/[0.07] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_22px_rgba(0,255,220,0.12)] backdrop-blur-sm">
                  <PieChart className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-semibold tracking-tight text-white">Budget</p>
                      <p className="mt-0.5 text-[11px] font-medium text-white/78">
                        Monthly spending plan • {monthKey}
                      </p>
                    </div>

                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${status.badge}`}>
                      {badgeLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <p className={`text-[32px] font-bold leading-none ${hasDeclaredBudget ? status.text : "text-white/95"}`}>
                  {fmt(declared)}
                </p>

                <p className={`mt-1.5 text-sm font-bold leading-tight ${remainingAmountColor}`}>
                  {fmt(remaining)} left
                </p>

                <p className="mt-2.5 max-w-[28rem] text-xs font-medium leading-relaxed text-white/82">
                  {message}
                </p>

                <p className="mt-1 text-[11px] text-white/56">
                  {hasDeclaredBudget
                    ? planIsComplete
                      ? "Your monthly budget is fully assigned and ready for planned expense logging."
                      : `${fmt(unallocated)} still unallocated from your declared budget.`
                    : "Your money needs a monthly plan before it disappears."}
                </p>
              </div>

              <div className="mb-3 rounded-2xl border border-cyan-100/15 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-white/75">
                  <span>Monthly progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full border border-cyan-100/15 bg-black/20">
                  <div
                    className={`relative h-full rounded-full bg-gradient-to-r ${status.bar} transition-all duration-500`}
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/25 opacity-50" />
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/70">
                  <span>{fmt(spent)}</span>
                  <span>{fmt(allocated)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleDetails}
              className="flex w-full items-center justify-between rounded-2xl border border-cyan-200/15 bg-white/[0.055] px-3 py-2.5 text-sm text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition hover:border-cyan-200/25 hover:bg-white/10"
            >
              <span className="font-medium">{expanded ? "Hide details" : "Show details"}</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {expanded && (
            <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-cyan-200/15 bg-white/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_22px_rgba(0,255,220,0.04)] backdrop-blur-[2px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="grid grid-cols-2 gap-2 text-center text-sm text-white">
                {[
                  ["Declared", fmt(declared)],
                  ["Spent", fmt(spent)],
                  ["Remaining", fmt(remaining)],
                  ["Categories", categories.length],
                  ["Unallocated", fmt(unallocated)],
                  ["Allocated", fmt(allocated)],
                ].map(([label, value]) => (
                  <div key={label} className={`rounded-2xl px-2.5 py-2.5 ${glassPanel}`}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/58">
                      {label}
                    </p>
                    <p className="text-sm font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-3 py-2.5 shadow-[0_0_18px_rgba(251,191,36,0.08)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100/70">Unplanned</p>
                  <p className="mt-1 text-sm font-bold text-amber-100">{fmt(unplannedSpent)}</p>
                </div>
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2.5 shadow-[0_0_18px_rgba(0,255,220,0.08)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100/70">Undocumented</p>
                  <p className="mt-1 text-sm font-bold text-cyan-100">{fmt(undocumentedSpent)}</p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/90">Monthly Spending Plan</span>
                  <button
                    type="button"
                    onClick={() => onSaveBudget?.()}
                    disabled={financeActionLoading}
                    className="inline-flex items-center gap-1 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-50 transition hover:bg-cyan-300/15 disabled:opacity-50"
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
                      const categoryProgress =
                        categoryAllocated > 0 ? Math.min(100, (categorySpent / categoryAllocated) * 100) : 0;

                      return (
                        <div key={item.key || item.id || item.title} className={`rounded-2xl p-3 ${glassPanel}`}>
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-white">{item.title}</p>
                              <p className="mt-0.5 text-[11px] text-white/55">
                                {fmt(categorySpent)} spent • {fmt(categoryRemaining)} left
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onEditBudgetCategory?.(item)}
                                disabled={financeActionLoading}
                                className={`${softButton} flex h-8 w-8 items-center justify-center`}
                                aria-label={`Edit ${item.title}`}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteBudgetCategory?.(item)}
                                disabled={financeActionLoading}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-300/20 bg-rose-500/10 text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-50"
                                aria-label={`Delete ${item.title}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full border border-cyan-100/15 bg-black/25">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300 transition-all duration-500"
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
                  <div className="rounded-2xl border border-cyan-200/15 bg-cyan-300/10 p-4 shadow-[0_0_20px_rgba(0,255,220,0.07)]">
                    <p className="text-sm font-semibold text-cyan-50">
                      {hasDeclaredBudget ? "Add your budget categories next." : "Create this month’s spending plan."}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-cyan-50/70">
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
                  className="flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_24px_rgba(0,255,220,0.10)] transition hover:bg-cyan-300/15"
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
