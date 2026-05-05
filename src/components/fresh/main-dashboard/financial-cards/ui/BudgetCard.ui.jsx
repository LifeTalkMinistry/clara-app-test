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

export default function BudgetCardUI({
  activeBudget,
  budgetCategories,
  declaredBudget,
  unallocatedAmount,
  budgetStatus,
  isComplete,
  unplannedSpent,
  undocumentedSpent,
  remainingAmount,
  amountLeft,
  spentAmount,
  totalSpent,
  expanded,
  onToggleDetails,
  financeActionLoading,
  onSaveBudget,
  onEditBudgetCategory,
  onDeleteBudgetCategory,
  onResetBudget,
  theme,
  budgetLogic,
}) {
  const {
    fmt,
    safeNumber,
    getBudgetThemeClasses,
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
    status,
    message,
    themeClasses,
    remainingAmountColor,
    monthKey,
    badgeLabel,
  } = budgetLogic;

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

    const hasDeclaredBudget =
      safeNumber(
        activeBudget?.declared_budget ?? activeBudget?.declared_amount
      ) > 0;

    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="theme-modal-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div>
              <p className={`text-base font-semibold ${themeClasses.title}`}>
                Budget Actions
              </p>
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
              {hasDeclaredBudget
                ? "Add Category"
                : "Declare Monthly Budget"}
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

      <div className={`relative mb-3 overflow-hidden rounded-3xl border shadow-2xl transition-all duration-200 ${themeClasses.border} ${status.ring}`}>
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

          <button
            type="button"
            onClick={onToggleDetails}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5 text-sm text-white/85 backdrop-blur-sm transition hover:bg-white/10"
          >
            <span className="font-medium">
              {expanded ? "Hide details" : "Show details"}
            </span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </>
  );
}
