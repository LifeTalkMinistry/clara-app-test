import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Edit3, X } from "lucide-react";
import BudgetHeader from "@/components/financial-carousel/cards/budget/ui/BudgetHeader";
import BudgetSummaryStats from "@/components/financial-carousel/cards/budget/ui/BudgetSummaryStats";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardExpandedPanel from "@/components/financial-carousel/shared/FinanceCardExpandedPanel";
import BudgetCategoryItem from "@/components/financial-carousel/cards/budget/ui/BudgetCategoryItem";
import { fmt } from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";

const expandButtonClass =
  "border-blue-200/[0.10] bg-[linear-gradient(135deg,rgba(0,56,168,0.22),rgba(9,35,83,0.42)_58%,rgba(252,209,22,0.055))] py-3 font-medium text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_10px_22px_rgba(0,0,0,0.14)] backdrop-blur-sm hover:border-yellow-200/[0.18] hover:bg-[linear-gradient(135deg,rgba(0,56,168,0.30),rgba(9,35,83,0.46)_58%,rgba(252,209,22,0.075))]";

const expandedPanelClass =
  "h-full overflow-y-auto rounded-[24px] border border-blue-200/[0.12] bg-[linear-gradient(145deg,rgba(0,56,168,0.30),rgba(11,43,101,0.58)_52%,rgba(206,17,38,0.12))] p-3.5 pr-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.075),0_14px_30px_rgba(0,0,0,0.16),0_0_24px_rgba(0,56,168,0.08)]";

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
      tone: "border-yellow-200/[0.16] bg-[linear-gradient(135deg,rgba(0,56,168,0.34),rgba(16,58,126,0.30)_52%,rgba(252,209,22,0.075))] text-white",
      valueTone: "text-yellow-200",
    };
  }

  return {
    rate,
    label: "Watch zone",
    title: "Some spending went outside your plan.",
    message: "Review it before it becomes a pattern.",
    tone: "border-red-300/[0.18] bg-[linear-gradient(135deg,rgba(206,17,38,0.20),rgba(0,56,168,0.28)_58%,rgba(252,209,22,0.055))] text-white",
    valueTone: "text-red-200",
  };
}

function readDetailAmount(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const number = Number(String(value || "0").replace(/[₱,\s]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function getDetailTitle(item = {}) {
  return (
    item?.title ||
    item?.name ||
    item?.merchant ||
    item?.description ||
    item?.expense_category ||
    item?.category ||
    "Outside-plan record"
  );
}

function getDetailDate(item = {}) {
  return (
    item?.date ||
    item?.transaction_date ||
    item?.transactionDate ||
    item?.spent_at ||
    item?.created_at ||
    item?.createdAt ||
    item?.logged_at ||
    ""
  );
}

function formatDetailDate(value) {
  if (!value) return "No date recorded";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 16);

  return parsed.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeDriftDetailItem(item = {}, fallbackType = "unplanned", index = 0) {
  const rawType = String(
    item?.type || item?.status || item?.planning_status || fallbackType || "unplanned"
  ).toLowerCase();
  const type = rawType.includes("document") ? "undocumented" : "unplanned";
  const rawDate = getDetailDate(item);
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const parsedTime = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.getTime() : 0;
  const sortTime = Number.isFinite(Number(item?.sortTime))
    ? Number(item.sortTime)
    : parsedTime;

  return {
    id: item?.id || item?.key || `${type}-${index}-${rawDate || getDetailTitle(item)}`,
    type,
    label: type === "undocumented" ? "Undocumented" : "Unplanned",
    title: getDetailTitle(item),
    category: item?.category || item?.expense_category || item?.budget_category || "No category",
    wallet: item?.wallet || item?.wallet_name || item?.source || "",
    note: item?.note || item?.notes || item?.reason || "",
    amount: readDetailAmount(item?.amount ?? item?.spent ?? item?.value ?? item?.total),
    date: rawDate,
    sortTime,
  };
}

function buildDriftDetailItems({ outsidePlanItems = [], unplannedItems = [], undocumentedItems = [] }) {
  const directItems = Array.isArray(outsidePlanItems) ? outsidePlanItems : [];
  const fallbackItems = [
    ...(Array.isArray(unplannedItems) ? unplannedItems : []),
    ...(Array.isArray(undocumentedItems) ? undocumentedItems : []),
  ];
  const sourceItems = directItems.length ? directItems : fallbackItems;

  return sourceItems
    .map((item, index) => normalizeDriftDetailItem(item, item?.type || "unplanned", index))
    .sort((a, b) => b.sortTime - a.sortTime);
}

function ExpandButtonRow({ expanded, onToggleDetails }) {
  return (
    <div className="mt-0.5 shrink-0 border-t border-blue-200/[0.06] pt-3">
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

function BudgetInsightCard({ driftState, outsidePlanSpent, onOpenDetails }) {
  return (
    <button
      type="button"
      onClick={onOpenDetails}
      className={`relative w-full cursor-pointer overflow-hidden rounded-[20px] border px-3.5 py-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.065),0_8px_20px_rgba(0,0,0,0.12)] backdrop-blur-sm transition hover:border-yellow-200/[0.20] hover:brightness-110 active:scale-[0.992] ${driftState.tone}`}
      aria-label="Open unplanned and undocumented budget details"
    >
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-yellow-100/28 to-transparent" />
      <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[#CE1126]/[0.08] blur-3xl" />
      <div className="relative min-w-0">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="text-[13px] font-black leading-tight text-white/94">
              {driftState.label}
            </p>
            <span className="rounded-full border border-yellow-100/[0.13] bg-[#FCD116]/[0.08] px-2 py-0.5 text-[10px] font-black text-yellow-100/82">
              {Math.round(driftState.rate)}%
            </span>
          </div>
          <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.14em] text-white/42">
            Tap To View
          </span>
        </div>

        <p className="text-[12px] font-semibold leading-5 text-white/72">
          {outsidePlanSpent > 0 ? `${fmt(outsidePlanSpent)} spent outside your plan. ` : ""}
          {driftState.message}
        </p>
      </div>
    </button>
  );
}

function DiagnosticsTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-blue-100/[0.08] bg-[#0038A8]/[0.13] px-2.5 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">
        {label}
      </p>
      <p className="whitespace-nowrap text-[13px] font-bold text-white/86">
        {value}
      </p>
    </div>
  );
}

function BudgetDriftDetailsModal({
  items = [],
  onClose,
  unplannedSpent = 0,
  undocumentedSpent = 0,
  outsidePlanSpent = 0,
  cycleDisplayLabel = "",
}) {
  const summaryMetrics = [
    ["Unplanned", fmt(unplannedSpent)],
    ["Undocumented", fmt(undocumentedSpent)],
    ["Outside plan", fmt(outsidePlanSpent)],
  ];

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-start justify-center bg-black/64 px-4 pb-6 pt-[128px] backdrop-blur-md">
      <div className="relative flex h-[calc(100vh-245px)] w-full max-w-[352px] flex-col overflow-hidden rounded-[28px] border border-blue-200/[0.14] bg-[linear-gradient(145deg,rgba(4,36,104,0.985),rgba(10,42,98,0.985)_54%,rgba(88,16,41,0.97))] shadow-[0_24px_80px_rgba(0,0,0,0.58),0_0_42px_rgba(0,56,168,0.12)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(252,209,22,0.10),transparent_34%),radial-gradient(circle_at_90%_100%,rgba(206,17,38,0.16),transparent_44%)]" />
        <div className="relative flex items-start justify-between gap-3 border-b border-white/[0.065] px-4 pb-3.5 pt-4">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-yellow-100/66">
              Budget documentation
            </p>
            <h3 className="mt-1 text-[17px] font-black leading-tight text-white/94">
              Unplanned & undocumented
            </h3>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-white/56">
              Full view of spending outside this cycle’s plan{cycleDisplayLabel ? ` · ${cycleDisplayLabel}` : ""}.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/[0.10] bg-white/[0.06] text-white/72 transition hover:bg-white/[0.10]"
            aria-label="Close budget documentation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3.5">
          <div className="grid grid-cols-3 gap-2">
            {summaryMetrics.map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-blue-100/[0.08] bg-[#0038A8]/[0.14] px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]"
              >
                <p className="text-[8px] font-black uppercase tracking-[0.13em] text-white/40">
                  {label}
                </p>
                <p className="mt-1 truncate text-[11px] font-black text-white/86">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {items.length ? (
            <div className="mt-3.5 space-y-2.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[20px] border border-blue-100/[0.09] bg-[#0038A8]/[0.10] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="rounded-full border border-yellow-100/[0.12] bg-[#FCD116]/[0.07] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-yellow-100/74">
                        {item.label}
                      </span>
                      <p className="mt-2 truncate text-sm font-black text-white/90">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold leading-5 text-white/54">
                        {item.category || "No category"} · {formatDetailDate(item.date)}
                        {item.wallet ? ` · ${item.wallet}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-white/92">
                      {fmt(item.amount)}
                    </p>
                  </div>

                  {item.note ? (
                    <p className="mt-2 rounded-2xl border border-blue-100/[0.07] bg-[#061D4D]/[0.55] px-3 py-2 text-[11px] font-semibold leading-5 text-white/52">
                      {item.note}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3.5 rounded-[22px] border border-blue-100/[0.08] bg-[#0038A8]/[0.12] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
              <p className="text-sm font-black text-white/86">No records to review.</p>
              <p className="mt-1.5 text-xs font-semibold leading-5 text-white/54">
                CLARA does not see any unplanned or undocumented item for this cycle yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function BudgetCardContent(props) {
  const {
    expanded = false,
    onToggleDetails,
    financeActionLoading = false,
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
    unplannedItems = [],
    undocumentedItems = [],
    outsidePlanItems = [],
    status,
    message,
    remainingAmountColor,
    badgeLabel,
    budgetPace,
    openBudgetModal,
  } = props;

  const [showDriftModal, setShowDriftModal] = useState(false);
  const outsidePlanSpent = Number(unplannedSpent || 0) + Number(undocumentedSpent || 0);
  const driftState = getBudgetDriftState({ outsidePlanSpent, spent, declared });
  const cycleLabel = budgetPace?.cycleLabel || "Monthly";
  const cycleDisplayLabel = budgetPace?.cycleDisplayLabel || "";
  const driftDetailItems = buildDriftDetailItems({
    outsidePlanItems,
    unplannedItems,
    undocumentedItems,
  });

  if (!expanded) {
    return (
      <div className="relative z-10 flex h-full min-h-[286px] flex-col overflow-hidden px-4 pb-4 pt-5">
        <div className="pointer-events-none absolute inset-0 opacity-[0.46]">
          <div className="absolute -left-20 top-[-58px] h-40 w-40 rounded-full bg-[#0038A8]/[0.10] blur-3xl" />
          <div className="absolute bottom-[-104px] right-[-82px] h-48 w-48 rounded-full bg-[#CE1126]/[0.08] blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.024),transparent_30%,rgba(0,56,168,0.10)_100%)]" />
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col rounded-[28px] border border-blue-100/[0.05] bg-[#0038A8]/[0.07] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-[2px]">
            <BudgetHeader
              badgeLabel={badgeLabel}
              status={status}
              cycleLabel={cycleLabel}
            />

            <div className="mt-3 rounded-[24px] bg-[linear-gradient(180deg,rgba(0,56,168,0.10),rgba(255,255,255,0.014)_42%,rgba(0,56,168,0.07)_100%)] p-3">
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
    <>
      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
        <div className="pointer-events-none absolute inset-0 opacity-[0.52]">
          <div className="absolute -left-24 top-[-70px] h-48 w-48 rounded-full bg-[#0038A8]/[0.13] blur-3xl" />
          <div className="absolute bottom-[-130px] right-[-110px] h-60 w-60 rounded-full bg-[#CE1126]/[0.10] blur-3xl" />
          <div className="absolute left-[42%] top-[18%] h-28 w-28 rounded-full bg-[#FCD116]/[0.035] blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),transparent_40%,rgba(0,56,168,0.10)_100%)]" />
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col gap-3.5">
          <div className="relative shrink-0 overflow-hidden rounded-[26px] border border-blue-100/[0.13] bg-[linear-gradient(135deg,rgba(0,56,168,0.55),rgba(24,62,130,0.56)_52%,rgba(206,17,38,0.16))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_16px_32px_rgba(0,0,0,0.16),0_0_24px_rgba(0,56,168,0.09)]">
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_18%_22%,rgba(252,209,22,0.11),transparent_42%),radial-gradient(circle_at_88%_80%,rgba(206,17,38,0.13),transparent_50%)]" />
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-yellow-100/36 to-transparent" />

            <div className="relative">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.20em] text-white/46">
                Available balance
              </p>
              <p className={`text-[34px] font-black leading-none tracking-[-0.045em] ${hasDeclaredBudget ? remainingAmountColor : "text-white/95"}`}>
                {fmt(remaining)}
              </p>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-white/72">
                Available for this cycle.
              </p>
            </div>
          </div>

          <ExpandButtonRow expanded={expanded} onToggleDetails={onToggleDetails} />

          <div className="min-h-0 flex-1 overflow-hidden pt-0.5">
            <FinanceCardExpandedPanel className={expandedPanelClass}>
              <BudgetInsightCard
                driftState={driftState}
                outsidePlanSpent={outsidePlanSpent}
                onOpenDetails={() => setShowDriftModal(true)}
              />

              <div>
                {categories.length ? (
                  <div className="space-y-2.5">
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
                  <div className="rounded-[20px] border border-blue-100/[0.09] bg-[#0038A8]/[0.11] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
                    <p className="text-sm font-semibold text-white/80">
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
                className="flex items-center justify-center gap-2 rounded-[20px] border border-yellow-100/[0.14] bg-[linear-gradient(135deg,rgba(0,56,168,0.36),rgba(21,63,132,0.36)_54%,rgba(252,209,22,0.085))] px-4 py-3 text-sm font-black text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_8px_18px_rgba(0,0,0,0.10)] transition hover:border-yellow-100/25 hover:brightness-110"
              >
                <Edit3 className="h-4 w-4 text-yellow-100/86" />
                Manage Plan
              </button>

              <details className="group rounded-[20px] border border-blue-100/[0.08] bg-[#0038A8]/[0.10] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/44 outline-none transition group-open:text-yellow-100/72">
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

      {showDriftModal && (
        <BudgetDriftDetailsModal
          items={driftDetailItems}
          onClose={() => setShowDriftModal(false)}
          unplannedSpent={unplannedSpent}
          undocumentedSpent={undocumentedSpent}
          outsidePlanSpent={outsidePlanSpent}
          cycleDisplayLabel={cycleDisplayLabel}
        />
      )}
    </>
  );
}
