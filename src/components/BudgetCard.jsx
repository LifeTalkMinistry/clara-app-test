import useBudgetCardLogic from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";
import BudgetActionModal from "@/components/financial-carousel/cards/budget/modal/BudgetActionModal";
import BudgetCardContent from "@/components/financial-carousel/cards/budget/ui/BudgetCardContent";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";

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
  onResetBudget,
}) {
  const {
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
    planIsComplete,
    status,
    message,
    remainingAmountColor,
    monthKey,
    badgeLabel,
  } = useBudgetCardLogic({
    activeBudget,
    budgetCategories,
    declaredBudget,
    unallocatedAmount,
    isComplete,
  });

  return (
    <>
      <BudgetActionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        activeBudget={activeBudget}
        financeActionLoading={financeActionLoading}
        onSaveBudget={onSaveBudget}
        onResetBudget={onResetBudget}
      />

      <FinanceCardShell
        cardKey="budget"
        expanded={expanded}
        ringClass={status.ring}
        roundedClass="rounded-3xl"
        shadowClass="shadow-[0_22px_60px_rgba(0,0,0,0.38),0_0_34px_rgba(0,255,220,0.09),0_0_48px_rgba(126,34,206,0.10)]"
      >
        <BudgetCardContent
          expanded={expanded}
          onToggleDetails={onToggleDetails}
          financeActionLoading={financeActionLoading}
          onSaveBudget={onSaveBudget}
          onEditBudgetCategory={onEditBudgetCategory}
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
          openBudgetModal={() => setShowModal(true)}
        />
      </FinanceCardShell>
    </>
  );
}
