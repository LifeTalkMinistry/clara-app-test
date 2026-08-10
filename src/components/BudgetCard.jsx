import { useNavigate } from "react-router-dom";
import useBudgetCardLogic from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";
import BudgetCardContent from "@/components/financial-carousel/cards/budget/ui/BudgetCardContent";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";

const BUDGET_GLOW_LAYERS = [];

// Temporary ownership-proof treatment requested for the live carousel.
// If the Budget card shown on Home turns this exact blue, this component is
// confirmed as the renderer we should continue refining.
const BUDGET_PLAIN_BLUE_TEST_STYLES = `
.clara-finance-bubble-budget {
  background: #0067d9 !important;
  background-image: none !important;
  border-color: rgba(191, 219, 254, 0.34) !important;
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.32) !important;
}

.clara-finance-slide-surface:has(.clara-finance-bubble-budget) {
  background: #0067d9 !important;
  background-image: none !important;
  border-color: rgba(191, 219, 254, 0.28) !important;
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.30) !important;
}

.clara-finance-bubble-budget [class*="bg-teal-"],
.clara-finance-bubble-budget [class*="bg-cyan-"],
.clara-finance-bubble-budget [class*="bg-violet-"],
.clara-finance-bubble-budget [class*="bg-purple-"],
.clara-finance-bubble-budget [class*="bg-indigo-"] {
  background-color: transparent !important;
  background-image: none !important;
}
`;

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
      <style>{BUDGET_PLAIN_BLUE_TEST_STYLES}</style>
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
