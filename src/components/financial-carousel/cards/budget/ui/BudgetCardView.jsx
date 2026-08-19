import WeeklyMoneyCheckCard from "@/components/WeeklyMoneyCheckCard";

const budgetCardRhythmClassName = "h-full min-h-[inherit] flex flex-col";

export default function BudgetCardView({
  onCompleteBudget,
  financeCardController,
}) {
  return (
    <div className={budgetCardRhythmClassName}>
      <WeeklyMoneyCheckCard
        financeCardController={financeCardController}
        // Keep the legacy callback threaded through this slot until the retired
        // Budget card contract is removed from the carousel controller.
        onCompleteBudget={onCompleteBudget}
      />
    </div>
  );
}
