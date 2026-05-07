import useBudgetCardLogic from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";
import BudgetActionModal from "@/components/financial-carousel/cards/budget/modal/BudgetActionModal";
import BudgetCardContent from "@/components/financial-carousel/cards/budget/ui/BudgetCardContent";

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

      <div
        className={`clara-finance-bubble-card clara-finance-bubble-budget relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border border-cyan-100/20 bg-[linear-gradient(135deg,rgba(6,48,66,0.96),rgba(7,20,48,0.94)_48%,rgba(37,13,74,0.94))] shadow-[0_22px_60px_rgba(0,0,0,0.38),0_0_34px_rgba(0,255,220,0.09),0_0_48px_rgba(126,34,206,0.10)] backdrop-blur-2xl transition-all duration-200 ${status.ring}`}
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
      </div>
    </>
  );
}
