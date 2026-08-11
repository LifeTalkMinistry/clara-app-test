import { PieChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useBudgetCardLogic from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";
import BudgetCardContent from "@/components/financial-carousel/cards/budget/ui/BudgetCardContent";
import FinanceCardSetupEmptyState from "@/components/financial-carousel/shared/FinanceCardSetupEmptyState";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";

const BUDGET_GLOW_LAYERS = [];

function EmptyBudgetState({ expanded = false, onToggleDetails, onSetup }) {
  return (
    <FinanceCardSetupEmptyState
      title="Budget"
      info="Set up a budget first. Once it exists, CLARA will show your available balance, spending status, and budget diagnostics here."
      cta="Set up my budget"
      Icon={PieChart}
      iconClass="border-blue-100/[0.13] bg-[#0A2D67]/[0.72] text-blue-100/82"
      buttonClass="border-yellow-100/[0.15] bg-[linear-gradient(135deg,rgba(0,56,168,0.28),rgba(16,49,108,0.44)_58%,rgba(252,209,22,0.06))] text-yellow-100/92 hover:border-yellow-100/[0.26] hover:brightness-110"
      detailKey="budget"
      expanded={expanded}
      onSetup={onSetup}
      onToggleDetails={onToggleDetails}
      collapsedLabel="View budget details"
      expandedLabel="Hide budget details"
    />
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
