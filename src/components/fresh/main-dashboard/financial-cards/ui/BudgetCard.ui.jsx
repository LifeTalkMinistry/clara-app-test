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

function ActionModal({
  open,
  onClose,
  activeBudget,
  financeActionLoading,
  onSaveBudget,
  onResetBudget,
  theme,
  budgetLogic,
}) {
  const { safeNumber, getBudgetThemeClasses } = budgetLogic;
  const themeClasses = getBudgetThemeClasses(theme);
  if (!open) return null;

  const hasDeclaredBudget =
    safeNumber(activeBudget?.declared_budget ?? activeBudget?.declared_amount) > 0;

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

export default function BudgetCardUI({
  activeBudget = null,
  budgetCategories = [],
  declaredBudget = 0,
  unallocatedAmount = 0,
  budgetStatus = "",
  isComplete = false,
  unplannedSpent = 0,
  undocumentedSpent = 0,
  remainingAmount = 0,
  amountLeft = 0,
  spentAmount = 0,
  totalSpent = 0,
  expanded = false,
  onToggleDetails,
  financeActionLoading = false,
  onSaveBudget,
  onEditBudgetCategory,
  onDeleteBudgetCategory,
  onResetBudget,
  theme = null,
  budgetLogic,
}) {
  const {
    fmt,
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
    planIsComplete,
    status,
    message,
    themeClasses,
    remainingAmountColor,
    monthKey,
    badgeLabel,
  } = budgetLogic;

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
        budgetLogic={budgetLogic}
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

            <p className={`mt-1.5 text-sm font-bold leading-tight ${remainingAmountColor}`}>
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
                  <p className={`text-sm font-bold ${themeClasses.title}`}>{fmt(remaining)}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Categories
                  </p>
                  <p className={`text-sm font-bold ${themeClasses.title}`}>{categories.length}</p>
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
                  <p className={`text-sm font-bold ${themeClasses.title}`}>{fmt(allocated)}</p>
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
                    {categories.map((item) => (
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
                              {fmt(item.categorySpent)} spent • {fmt(item.categoryRemaining)} left
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
                            style={{ width: `${item.categoryProgress}%` }}
                          />
                        </div>

                        <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-white/55">
                          <span>{Math.round(item.categoryProgress)}%</span>
                          <span>{fmt(item.categoryAllocated)}</span>
                        </div>
                      </div>
                    ))}
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
                  onClick={() => onSaveBudget?.()}
                  disabled={financeActionLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/15 px-4 py-3 text-sm font-semibold text-fuchsia-200 transition hover:bg-fuchsia-500/20 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {hasDeclaredBudget ? "Add Budget Category" : "Declare Monthly Budget"}
                </button>

                {!!activeBudget?.category_count && (
                  <button
                    type="button"
                    onClick={() => onResetBudget?.()}
                    disabled={financeActionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset Tracking Start
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
