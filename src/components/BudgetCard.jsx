import { useNavigate } from "react-router-dom";
import useBudgetCardLogic from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";
import BudgetCardContent from "@/components/financial-carousel/cards/budget/ui/BudgetCardContent";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";

const BUDGET_GLOW_LAYERS = [];

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
      </FinanceCardShell>
    </div>
  );
}
