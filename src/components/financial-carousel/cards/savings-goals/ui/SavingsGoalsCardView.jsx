import SavingsCard from "@/components/SavingsCard";

export default function SavingsGoalsCardView({
  data = {},
  selectedDashboardTheme,
  expandedFinanceCard,
  toggleFinanceDetails,
  financeActionLoading,
  onSaveSavingsGoal,
  onDeleteSavingsGoal,
  onAddSavings,
}) {
  return (
    <div className="clara-finance-bubble-card-shell clara-finance-bubble-savings-shell h-full min-h-[inherit] flex flex-col">
      <SavingsCard
        savingsGoals={data.savingsGoals}
        totalSavingsSaved={data.totalSavingsSaved}
        totalSavingsTarget={data.totalSavingsTarget}
        primarySavingsGoal={data.primarySavingsGoal}
        theme={selectedDashboardTheme}
        expanded={expandedFinanceCard === "savings"}
        onToggleDetails={() => toggleFinanceDetails?.("savings")}
        financeActionLoading={financeActionLoading}
        onSaveSavingsGoal={onSaveSavingsGoal}
        onDeleteSavingsGoal={onDeleteSavingsGoal}
        onAddSavings={onAddSavings}
      />
    </div>
  );
}
