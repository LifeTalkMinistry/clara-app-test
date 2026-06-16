import BudgetCard from "@/components/BudgetCard";

const budgetCardRhythmClassName = [
  "h-full min-h-[inherit] flex flex-col",
  "[&_[data-finance-card='budget'][data-expanded='false']>div.relative.z-10>div.relative.flex>div:first-child]:block",
  "[&_[data-finance-card='budget'][data-expanded='false']>div.relative.z-10>div.relative.flex>div:first-child]:flex-none",
].join(" ");

export default function BudgetCardView({
  data = {},
  selectedDashboardTheme,
  expandedFinanceCard,
  toggleFinanceDetails,
  financeActionLoading,
  onSaveBudget,
  onEditBudgetCategory,
  onDeleteBudgetCategory,
  onResetBudget,
}) {
  return (
    <div className={budgetCardRhythmClassName}>
      <BudgetCard
        activeBudget={data.activeBudget}
        budgetCategories={data.budgetCategories}
        declaredBudget={data.declaredBudget}
        unallocatedAmount={data.unallocatedAmount}
        budgetStatus={data.budgetStatus}
        isComplete={data.isComplete}
        unplannedSpent={data.unplannedSpent}
        undocumentedSpent={data.undocumentedSpent}
        unplannedItems={data.unplannedItems}
        undocumentedItems={data.undocumentedItems}
        outsidePlanItems={data.outsidePlanItems}
        remainingAmount={data.remainingAmount}
        amountLeft={data.amountLeft}
        spentAmount={data.spentAmount}
        totalSpent={data.totalSpent}
        theme={selectedDashboardTheme}
        expanded={expandedFinanceCard === "budgets"}
        onToggleDetails={() => toggleFinanceDetails?.("budgets")}
        financeActionLoading={financeActionLoading}
        onSaveBudget={onSaveBudget}
        onEditBudgetCategory={onEditBudgetCategory}
        onDeleteBudgetCategory={onDeleteBudgetCategory}
        onResetBudget={onResetBudget}
      />
    </div>
  );
}
