import { ChevronDown, Edit3, Plus } from "lucide-react";
import BudgetHeader from "@/components/financial-carousel/cards/budget/ui/BudgetHeader";
import BudgetSummaryStats from "@/components/financial-carousel/cards/budget/ui/BudgetSummaryStats";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardExpandedPanel from "@/components/financial-carousel/shared/FinanceCardExpandedPanel";
import BudgetCategoryItem from "@/components/financial-carousel/cards/budget/ui/BudgetCategoryItem";
import { fmt } from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";

const expandButtonClass =
  "border-white/[0.07] bg-black/[0.16] py-3 font-medium text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-sm";

// existing functions unchanged
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

export default function BudgetCardContent(props) {
  const {
    expanded = false,
    onToggleDetails,
    declared = 0,
    remaining = 0,
    spent = 0,
    allocated = 0,
    unallocated = 0,
    progress = 0,
    status,
    message,
    remainingAmountColor,
    hasDeclaredBudget = false,
    planIsComplete = false,
    monthKey,
    badgeLabel,
  } = props;

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

  return <div className="p-4 text-white">Expanded budget panel</div>;
}
