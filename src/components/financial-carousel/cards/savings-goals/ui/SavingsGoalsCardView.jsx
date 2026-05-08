import SavingsCard from "@/components/SavingsCard";
import { stopCapturedDetailsToggle } from "../../../shared/financeCardInteraction";

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
        if (stopCapturedDetailsToggle(event)) {
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
