import { useMemo, useState } from "react";
import {
  PieChart,
  RotateCcw,
  Edit3,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(n || 0));

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

function getBudgetMessage(hasBudget, progress, remaining) {
  if (!hasBudget) return "Set your first budget so your money gets direction.";
  if (remaining <= 0) return "You’ve fully used this budget. Time to review your plan.";
  if (progress <= 50) return "You still have strong room left this cycle.";
  if (progress <= 80) return "You’re doing fine. Just stay intentional from here.";
  if (progress < 100) return "You’re close to the limit. Spend carefully now.";
  return "This budget is already fully consumed.";
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

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#08111d] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <p className="text-base font-semibold text-white">Budget Actions</p>
            <p className="mt-0.5 text-xs text-white/60">
              Manage your budget setup and tracking cycle
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
            <Edit3 className="h-4 w-4" />
            {activeBudget ? "Edit Budget" : "Create Budget"}
          </button>

          {!!activeBudget && (
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
  expanded = false,
  onToggleDetails,
  financeActionLoading = false,
  onSaveBudget,
  onResetBudget,
}) {
  const [showModal, setShowModal] = useState(false);

  const total = Number(
    activeBudget?.total_budget ??
      activeBudget?.budget ??
      activeBudget?.budget_amount ??
      0
  );

  const spent = Number(
    activeBudget?.spent ??
      activeBudget?.spent_amount ??
      activeBudget?.total_spent ??
      0
  );

  const remaining = Math.max(
    Number(
      activeBudget?.remaining ??
        activeBudget?.remaining_amount ??
        total - spent
    ) || 0,
    0
  );

  const progress = useMemo(
    () => (total > 0 ? Math.min(100, (spent / total) * 100) : 0),
    [spent, total]
  );

  const needsPct = Number(
    activeBudget?.needs_pct ?? activeBudget?.needs_percent ?? 50
  );
  const wantsPct = Number(
    activeBudget?.wants_pct ?? activeBudget?.wants_percent ?? 30
  );
  const otherPct = Number(
    activeBudget?.other_pct ??
      activeBudget?.other_percent ??
      activeBudget?.savings_pct ??
      20
  );

  const hasBudget = !!activeBudget && total > 0;
  const status = getBudgetStatus(progress);
  const message = getBudgetMessage(hasBudget, progress, remaining);

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
        className={`relative mb-3 overflow-hidden rounded-3xl border border-white/10 shadow-2xl transition-all duration-200 ${status.ring}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#14081d] via-[#1b1028] to-[#0a1120]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.02)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/18 to-black/35" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_16%,transparent_38%)]" />

        <div className="relative z-10 p-4">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/10 shadow-[0_0_18px_rgba(217,70,239,0.12)] backdrop-blur-sm">
              <PieChart className="h-4 w-4 text-fuchsia-300" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-semibold tracking-tight text-white">
                    Budget
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-white/75">
                    Stay aligned with your monthly structure
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${status.badge}`}
                >
                  {hasBudget ? status.label : "Not Set"}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <p
              className={`text-[32px] font-bold leading-none ${
                hasBudget ? status.text : "text-white/95"
              }`}
            >
              {fmt(total)}
            </p>

            <p className="mt-2 max-w-[28rem] text-xs font-medium leading-relaxed text-white/82">
              {message}
            </p>

            <p className="mt-1 text-[11px] text-white/60">
              {hasBudget
                ? `${fmt(remaining)} left for this cycle.`
                : "Your money needs a plan before it disappears."}
            </p>
          </div>

          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-white/75">
              <span>Spent progress</span>
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
              <span>{fmt(total)}</span>
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
              <div className="grid grid-cols-3 gap-2 text-center text-sm text-white">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Spent
                  </p>
                  <p className="text-sm font-bold text-white">{fmt(spent)}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Remaining
                  </p>
                  <p className="text-sm font-bold text-white">
                    {fmt(remaining)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Structure
                  </p>
                  <p className="text-sm font-bold text-white">
                    {needsPct}/{wantsPct}/{otherPct}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/90">
                    Allocation
                  </span>
                  <span className="text-[11px] font-semibold text-white/70">
                    Needs / Wants / Other
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2.5 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
                      Needs
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {needsPct}%
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2.5 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
                      Wants
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {wantsPct}%
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2.5 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
                      Other
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {otherPct}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                >
                  <Edit3 className="h-4 w-4" />
                  {activeBudget ? "Edit Budget" : "Create Budget"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}