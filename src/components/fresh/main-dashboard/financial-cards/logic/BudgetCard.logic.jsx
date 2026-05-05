import useBudgetCardLogic from "../../../../budget-card/hooks/useBudgetCardLogic";
import BudgetCardUI from "../ui/BudgetCard.ui";

export default function BudgetCardLogic({
  activeBudget = null,
  budgetCategories = [],
  declaredBudget = 0,
  unallocatedAmount = 0,
  budgetStatus = "",
  isComplete = false,
  unplannedSpent = 0,
  undocumentedSpent = 0,
  remainingAmount = 0,
  amountLeft = 0,
  spentAmount = 0,
  totalSpent = 0,
  expanded = false,
  onToggleDetails,
  financeActionLoading = false,
  onSaveBudget,
  onEditBudgetCategory,
  onDeleteBudgetCategory,
  onResetBudget,
  theme = null,
}) {
  const logic = useBudgetCardLogic({
    activeBudget,
    budgetCategories,
    declaredBudget,
    unallocatedAmount,
    isComplete,
    theme,
  });

  return (
    <BudgetCardUI
      activeBudget={activeBudget}
      budgetCategories={budgetCategories}
      declaredBudget={declaredBudget}
      unallocatedAmount={unallocatedAmount}
      budgetStatus={budgetStatus}
      isComplete={isComplete}
      unplannedSpent={unplannedSpent}
      undocumentedSpent={undocumentedSpent}
      remainingAmount={remainingAmount}
      amountLeft={amountLeft}
      spentAmount={spentAmount}
      totalSpent={totalSpent}
      expanded={expanded}
      onToggleDetails={onToggleDetails}
      financeActionLoading={financeActionLoading}
      onSaveBudget={onSaveBudget}
      onEditBudgetCategory={onEditBudgetCategory}
      onDeleteBudgetCategory={onDeleteBudgetCategory}
      onResetBudget={onResetBudget}
      theme={theme}
      budgetLogic={logic}
    />
  );
}
