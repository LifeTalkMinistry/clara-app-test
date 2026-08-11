import { PieChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useBudgetCardLogic from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";
import BudgetCardContent from "@/components/financial-carousel/cards/budget/ui/BudgetCardContent";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";

const BUDGET_GLOW_LAYERS = [];

function EmptyBudgetState({ expanded = false, onToggleDetails, onSetup }) {
  return (
    <div
      className={`relative z-10 flex h-full flex-col overflow-hidden px-4 pb-4 pt-5 ${
        expanded ? "min-h-0" : "min-h-[286px]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.48]">
        <div className="absolute -left-20 top-[-58px] h-40 w-40 rounded-full bg-[#0038A8]/[0.11] blur-3xl" />
        <div className="absolute bottom-[-104px] right-[-82px] h-48 w-48 rounded-full bg-[#CE1126]/[0.08] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_36%,rgba(0,56,168,0.08)_100%)]" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-[28px] border border-blue-100/[0.10] bg-[#061D4D]/[0.56] px-5 py-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
          <div className="w-full max-w-[282px] text-center">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl border border-blue-100/[0.13] bg-[#0A2D67]/[0.72] text-blue-100/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(0,0,0,0.20)]">
              <PieChart className="h-5 w-5" />
            </div>

            <h3 className="mt-4 text-[18px] font-black tracking-[-0.025em] text-white/94">
              Budget
            </h3>

            <button
              type="button"
              onClick={onSetup}
              className="mt-4 flex w-full items-center justify-center rounded-2xl border border-yellow-100/[0.15] bg-[linear-gradient(135deg,rgba(0,56,168,0.28),rgba(16,49,108,0.44)_58%,rgba(252,209,22,0.06))] px-4 py-3.5 text-[14px] font-black text-yellow-100/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_10px_24px_rgba(0,0,0,0.14)] transition hover:border-yellow-100/[0.26] hover:brightness-110 active:scale-[0.99]"
            >
              Set up my budget
            </button>
          </div>
        </div>

        <div className="mt-4 shrink-0 border-t border-blue-200/[0.06] pt-3">
          <FinanceCardExpandButton
            detailKey="budget"
            expanded={expanded}
            onToggleDetails={onToggleDetails}
            collapsedLabel="View budget details"
            expandedLabel="Hide budget details"
            className="border-blue-200/[0.10] bg-[#061D4D]/[0.48] py-3 font-medium text-white/90"
          />
        </div>
      </div>
    </div>
  );
}

export default function BudgetCard({
  activeBudget = null,
  budgetCategories = [],
  declaredBudget = 0,
  unallocatedAmount = undefined,
  isComplete = false,
  unplannedSpent = 0,
  undocumentedSpent = 0,
  unplannedItems = [],
  undocumentedItems = [],
  outsidePlanItems = [],
  expanded = false,
  onToggleDetails,
  financeActionLoading = false,
  onEditBudgetCategory,
  onDeleteBudgetCategory,
}) {
  const navigate = useNavigate();
  const {
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
    remainingAmountColor,
    monthKey,
    badgeLabel,
    budgetPace,
  } = useBudgetCardLogic({
    activeBudget,
    budgetCategories,
    declaredBudget,
    unallocatedAmount,
    isComplete,
  });

  const openBudgetPlanPage = () => navigate("/budget-plan");
  const openBudgetCategoryOnPlanPage = (item) => {
    const id = item?.id || item?.key || item?.budget?.id || null;
    navigate("/budget-plan", {
      state: id ? { editCategoryId: String(id) } : undefined,
    });
  };

  return (
    <div className="flex h-full min-h-[inherit] flex-col rounded-[inherit]">
      <FinanceCardShell
        cardKey="budget"
        expanded={expanded}
        ringClass={status.ring}
        roundedClass="rounded-3xl"
        glowLayerClassNames={BUDGET_GLOW_LAYERS}
      >
        {!hasDeclaredBudget ? (
          <EmptyBudgetState
            expanded={expanded}
            onToggleDetails={onToggleDetails}
            onSetup={openBudgetPlanPage}
          />
        ) : (
          <BudgetCardContent
            expanded={expanded}
            onToggleDetails={onToggleDetails}
            financeActionLoading={financeActionLoading}
            onSaveBudget={openBudgetPlanPage}
            onEditBudgetCategory={openBudgetCategoryOnPlanPage}
            onDeleteBudgetCategory={onDeleteBudgetCategory}
            categories={categories}
            declared={declared}
            allocated={allocated}
            spent={spent}
            remaining={remaining}
            unallocated={unallocated}
            progress={progress}
            hasDeclaredBudget={hasDeclaredBudget}
            planIsComplete={planIsComplete}
            unplannedSpent={unplannedSpent}
            undocumentedSpent={undocumentedSpent}
            unplannedItems={unplannedItems}
            undocumentedItems={undocumentedItems}
            outsidePlanItems={outsidePlanItems}
            status={status}
            message={message}
            remainingAmountColor={remainingAmountColor}
            monthKey={monthKey}
            badgeLabel={badgeLabel}
            budgetPace={budgetPace}
            openBudgetModal={openBudgetPlanPage}
          />
        )}
      </FinanceCardShell>
    </div>
  );
}
