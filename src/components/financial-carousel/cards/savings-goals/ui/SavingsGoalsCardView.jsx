import SavingsCardRefined from "@/components/SavingsCardRefined";
import { toggleExpandedFinanceCard } from "../../../shared/financeCardExpansion";
import { stopCapturedDetailsToggle } from "../../../shared/financeCardInteraction";

const DETAIL_KEY = "savings";

export default function SavingsGoalsCardView({
  data = {},
  selectedDashboardTheme,
  expandedFinanceCard,
  toggleFinanceDetails,
}) {
  const isExpanded = expandedFinanceCard === DETAIL_KEY;

  const handleSavingsToggle = () => {
    toggleExpandedFinanceCard({
      detailKey: DETAIL_KEY,
      isExpanded,
      toggleFinanceDetails,
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
      <SavingsCardRefined
        savingsGoals={data.savingsGoals}
        totalSavingsSaved={data.totalSavingsSaved}
        totalSavingsTarget={data.totalSavingsTarget}
        primarySavingsGoal={data.primarySavingsGoal}
        theme={selectedDashboardTheme}
        expanded={isExpanded}
        onToggleDetails={handleSavingsToggle}
      />
    </div>
  );
}
