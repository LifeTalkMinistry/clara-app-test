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
  const isExpanded = expandedFinanceCard === "savings";

  const handleSavingsToggle = () => {
    if (isExpanded) {
      toggleFinanceDetails?.("savings");
      return;
    }

    toggleFinanceDetails?.("savings", {
      autoExpand: true,
      forceOpen: true,
    });
  };

  return (
    <div
      className="clara-finance-bubble-card-shell clara-finance-bubble-savings-shell h-full min-h-[inherit] flex flex-col"
      onClickCapture={(event) => {
        const button = event.target?.closest?.("button");
        const label = String(button?.textContent || "").toLowerCase();

        if (
          label.includes("show details") ||
          label.includes("hide details")
        ) {
          event.preventDefault();
          event.stopPropagation();
          handleSavingsToggle();
        }
      }}
    >
      <SavingsCard
        savingsGoals={data.savingsGoals}
        totalSavingsSaved={data.totalSavingsSaved}
        totalSavingsTarget={data.totalSavingsTarget}
        primarySavingsGoal={data.primarySavingsGoal}
        theme={selectedDashboardTheme}
        expanded={isExpanded}
        onToggleDetails={handleSavingsToggle}
        financeActionLoading={financeActionLoading}
        onSaveSavingsGoal={onSaveSavingsGoal}
        onDeleteSavingsGoal={onDeleteSavingsGoal}
        onAddSavings={onAddSavings}
      />
    </div>
  );
}
