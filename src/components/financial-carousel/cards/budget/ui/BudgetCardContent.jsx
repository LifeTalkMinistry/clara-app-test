import { ChevronDown, Edit3, Plus } from "lucide-react";
import BudgetHeader from "@/components/financial-carousel/cards/budget/ui/BudgetHeader";
import BudgetSummaryStats from "@/components/financial-carousel/cards/budget/ui/BudgetSummaryStats";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardExpandedPanel from "@/components/financial-carousel/shared/FinanceCardExpandedPanel";
import BudgetCategoryItem from "@/components/financial-carousel/cards/budget/ui/BudgetCategoryItem";
import { fmt } from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";

const expandButtonClass =
  "border-white/[0.07] bg-black/[0.16] py-3 font-medium text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-sm";

function getBudgetDriftState({ outsidePlanSpent = 0, spent = 0, declared = 0 }) {
  const safeOutside = Math.max(Number(outsidePlanSpent || 0), 0);
  const safeDeclared = Math.max(Number(declared || 0), 0);
  const safeSpent = Math.max(Number(spent || 0), 0);
  const base = safeDeclared > 0 ? safeDeclared : safeSpent;
  const rate = base > 0 ? Math.min((safeOutside / base) * 100, 999) : 0;

  if (safeOutside <= 0) {
    return {
      rate,
      label: "On track",
      title: "Budget discipline looks clean.",
      message: "No spending outside your plan yet.",
      tone: "border-emerald-300/12 bg-emerald-400/[0.06] text-emerald-50",
      valueTone: "text-emerald-200",
    };
  }

  return {
    rate,
    label: "Watch zone",
    title: "Some spending went outside your plan.",
    message: "Review it or adjust your categories before it becomes a pattern.",
    tone: "border-cyan-300/12 bg-cyan-400/[0.06] text-cyan-50",
    valueTone: "text-cyan-200",
  };
}

function ExpandButtonRow({ expanded, onToggleDetails }) {
  return (
    <div className="shrink-0 border-t border-white/[0.05] pt-2">
      <FinanceCardExpandButton
        detailKey="budgets"
        expanded={expanded}
        onToggleDetails={onToggleDetails}
        collapsedLabel="View budget details"
        expandedLabel="Hide budget details"
        className={expandButtonClass}
      />
    </div>
  );
}

function BudgetSummaryLine({ declared, spent, categoriesCount }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/[0.14] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold leading-relaxed text-white/62">
        <span>
          <span className="text-white/34">Declared</span>{" "}
          <span className="font-black text-white/88">{fmt(declared)}</span>
        </span>
        <span className="text-white/18">•</span>
        <span>
          <span className="text-white/34">Spent</span>{" "}
          <span className="font-black text-white/88">{fmt(spent)}</span>
        </span>
        <span className="text-white/18">•</span>
        <span>
          <span className="text-white/34">Categories</span>{" "}
          <span className="font-black text-white/88">{categoriesCount}</span>
        </span>
      </div>
    </div>
  );
}

function BudgetInsightCard({ driftState, outsidePlanSpent, onAdjust }) {
  return (
    <div className={`rounded-2xl border px-3.5 py-3.5 backdrop-blur-sm ${driftState.tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-black leading-tight text-white/92">
              {driftState.label}
            </p>
            <span className="rounded-full border border-white/[0.06] bg-black/[0.14] px-2 py-0.5 text-[10px] font-black text-white/62">
              {Math.round(driftState.rate)}%
            </span>
          </div>

          <p className="text-[12px] font-semibold leading-5 text-white/66">
            {outsidePlanSpent > 0 ? `${fmt(outsidePlanSpent)} spent outside your plan. ` : ""}
            {driftState.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onAdjust}
          className="shrink-0 rounded-full border border-white/[0.06] bg-black/[0.12] px-3 py-1.5 text-[11px] font-black text-white/82 transition hover:bg-white/[0.05]"
        >
          Adjust
        </button>
      </div>
    </div>
  );
}

function DiagnosticsTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/[0.14] px-2.5 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/34">
        {label}
      </p>
      <p className="whitespace-nowrap text-[13px] font-bold text-white/82">
        {value}
      </p>
    </div>
  );
}

export default function BudgetCardContent(props) {
  const {
    expanded = false,
    onToggleDetails,
    financeActionLoading = false,
    onSaveBudget,
    onEditBudgetCategory,
    onDeleteBudgetCategory,
    categories = [],
    declared = 0,
    allocated = 0,
    spent = 0,
    remaining = 0,
    unallocated = 0,
    progress = 0,
    hasDeclaredBudget = false,
    planIsComplete = false,
    unplannedSpent = 0,
    undocumentedSpent = 0,
    status,
    message,
    remainingAmountColor,
    monthKey,
    badgeLabel,
    openBudgetModal,
  } = props;

  const outsidePlanSpent = Number(unplannedSpent || 0) + Number(undocumentedSpent || 0);
  const driftState = getBudgetDriftState({ outsidePlanSpent, spent, declared });

  if (!expanded) {
    return (
      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden p-4 pb-4">
        <div className="pointer-events-none absolute inset-0 opacity-[0.55]">
          <div className="absolute -left-16 top-[-44px] h-36 w-36 rounded-full bg-cyan-400/[0.08] blur-3xl" />
          <div className="absolute bottom-[-90px] right-[-70px] h-44 w-44 rounded-full bg-violet-500/[0.12] blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_26%,rgba(0,0,0,0.14)_100%)]" />
        </div>

        <div className="relative flex min-h-0 flex-col gap-3">
          <div className="min-h-0 rounded-[26px] border border-white/[0.045] bg-black/[0.08] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-[2px]">
            <BudgetHeader monthKey={monthKey} badgeLabel={badgeLabel} status={status} />

            <div className="mt-1 rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.005)_38%,rgba(0,0,0,0.12)_100%)] p-2.5">
              <BudgetSummaryStats
                declared={declared}
                remaining={remaining}
                spent={spent}
                allocated={allocated}
                unallocated={unallocated}
                progress={progress}
                status={status}
                message={message}
                remainingAmountColor={remainingAmountColor}
                hasDeclaredBudget={hasDeclaredBudget}
                planIsComplete={planIsComplete}
              />
            </div>
          </div>

          <ExpandButtonRow expanded={expanded} onToggleDetails={onToggleDetails} />
        </div>
      </div>
    );
  }

  const quietMetrics = [
    ["Allocated", fmt(allocated)],
    ["Unallocated", fmt(unallocated)],
    ["Unplanned", fmt(unplannedSpent)],
    ["Undocumented", fmt(undocumentedSpent)],
  ];

  return (
    <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 opacity-[0.45]">
        <div className="absolute -left-20 top-[-60px] h-44 w-44 rounded-full bg-cyan-400/[0.07] blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-100px] h-56 w-56 rounded-full bg-violet-500/[0.12] blur-3xl" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col gap-3">
        <div className="shrink-0">
          <p className={`text-[34px] font-black leading-none tracking-[-0.045em] ${hasDeclaredBudget ? remainingAmountColor : "text-white/94"}`}>
            {fmt(remaining)}
          </p>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-white/68">
            Available for this cycle.
          </p>
        </div>

        <ExpandButtonRow expanded={expanded} onToggleDetails={onToggleDetails} />

        <div className="min-h-0 flex-1 overflow-hidden pt-2">
          <FinanceCardExpandedPanel className="h-full overflow-y-auto pr-1">
            <BudgetInsightCard
              driftState={driftState}
              outsidePlanSpent={outsidePlanSpent}
              onAdjust={openBudgetModal}
            />

            <BudgetSummaryLine
              declared={declared}
              spent={spent}
              categoriesCount={categories.length}
            />

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-white/86">Spending Plan</span>
                  <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-white/48">
                    Category limits for this cycle.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSaveBudget?.()}
                  disabled={financeActionLoading}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/[0.06] bg-black/[0.14] px-2.5 py-1 text-[11px] font-semibold text-white/82 transition hover:bg-white/[0.05] disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                  {hasDeclaredBudget ? "Add" : "Start"}
                </button>
              </div>

              {categories.length ? (
                <div className="space-y-2">
                  {categories.map((item) => (
                    <BudgetCategoryItem
                      key={item.key || item.id || item.title}
                      item={item}
                      financeActionLoading={financeActionLoading}
                      onEditBudgetCategory={onEditBudgetCategory}
                      onDeleteBudgetCategory={onDeleteBudgetCategory}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.06] bg-black/[0.12] p-4">
                  <p className="text-sm font-semibold text-white/78">
                    {hasDeclaredBudget
                      ? "Add your budget categories next."
                      : "Create this cycle’s spending plan."}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={openBudgetModal}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-black/[0.14] px-4 py-3 text-sm font-semibold text-white/84 transition hover:bg-white/[0.05]"
            >
              <Edit3 className="h-4 w-4" />
              Manage Budget
            </button>

            <details className="group rounded-2xl border border-white/[0.05] bg-black/[0.12] p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42 outline-none transition group-open:text-white/68">
                <span>Budget diagnostics</span>
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm text-white">
                {quietMetrics.map(([label, value]) => (
                  <DiagnosticsTile key={label} label={label} value={value} />
                ))}
              </div>
            </details>
            <div aria-hidden="true" className="h-3 shrink-0" />
          </FinanceCardExpandedPanel>
        </div>
      </div>
    </div>
  );
}
