import { useNavigate } from "react-router-dom";
import useBudgetCardLogic from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";
import BudgetCardContent from "@/components/financial-carousel/cards/budget/ui/BudgetCardContent";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";

const BUDGET_GLOW_LAYERS = [
  "pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_45%,rgba(0,0,0,0.14)_100%)]",
];

const BUDGET_CLEAN_CARD_CSS = `
  .clara-finance-bubble-card.clara-finance-bubble-budget {
    border-color: rgba(103, 232, 249, 0.14) !important;
    background: linear-gradient(135deg, #062638 0%, #071430 48%, #171342 100%) !important;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.08),
      0 22px 55px rgba(0,0,0,0.36),
      0 0 22px rgba(0,232,255,0.05),
      0 0 34px rgba(128,70,255,0.06) !important;
  }

  .clara-finance-bubble-card.clara-finance-bubble-budget::before,
  .clara-finance-bubble-card.clara-finance-bubble-budget::after,
  .clara-performance-mode .clara-finance-bubble-card.clara-finance-bubble-budget::before,
  .clara-performance-mode .clara-finance-bubble-card.clara-finance-bubble-budget::after {
    width: 0 !important;
    height: 0 !important;
    opacity: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .clara-performance-mode .clara-finance-bubble-card.clara-finance-bubble-budget > .pointer-events-none.absolute {
    opacity: 1 !important;
    background: linear-gradient(180deg, rgba(255,255,255,0.04), transparent 45%, rgba(0,0,0,0.14)) !important;
  }
`;

export default function BudgetCard({
  activeBudget = null,
  budgetCategories = [],
  declaredBudget = 0,
  unallocatedAmount = 0,
  isComplete = false,
  unplannedSpent = 0,
  undocumentedSpent = 0,
  expanded = false,
  onToggleDetails,
  financeActionLoading = false,
  onSaveBudget,
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

  const openBudgetPlanPage = () => {
    navigate("/budget-plan");
  };

  const openBudgetCategoryOnPlanPage = (item) => {
    const id = item?.id || item?.key || item?.budget?.id || null;

    navigate("/budget-plan", {
      state: id ? { editCategoryId: String(id) } : undefined,
    });
  };

  return (
    <>
      <style>{BUDGET_CLEAN_CARD_CSS}</style>

      <FinanceCardShell
        cardKey="budget"
        expanded={expanded}
        ringClass={status.ring}
        roundedClass="rounded-3xl"
        glowLayerClassNames={BUDGET_GLOW_LAYERS}
        surfaceClassName="!border-cyan-300/[0.14] !bg-[linear-gradient(135deg,#062638_0%,#071430_48%,#171342_100%)]"
        shadowClass="shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_55px_rgba(0,0,0,0.36),0_0_22px_rgba(0,232,255,0.05),0_0_34px_rgba(128,70,255,0.06)]"
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
          status={status}
          message={message}
          remainingAmountColor={remainingAmountColor}
          monthKey={monthKey}
          badgeLabel={badgeLabel}
          budgetPace={budgetPace}
          openBudgetModal={openBudgetPlanPage}
        />
      </FinanceCardShell>
    </>
  );
}
