import ObligationDebt from "@/components/ObligationDebt";
import { toggleExpandedFinanceCard } from "../../../shared/financeCardExpansion";
import { stopCapturedDetailsToggle } from "../../../shared/financeCardInteraction";

const DETAIL_KEY = "debtObligations";

export default function DebtCardView({
  item,
  selectedDashboardTheme,
  expandedFinanceCard,
  toggleFinanceDetails,
}) {
  const isExpanded = expandedFinanceCard === DETAIL_KEY;

  const handleToggle = () => {
    toggleExpandedFinanceCard({
      detailKey: DETAIL_KEY,
      isExpanded,
      toggleFinanceDetails,
    });
  };

  return (
    <div
      className="h-full min-h-[inherit] flex flex-col"
      onClickCapture={(event) => {
        if (stopCapturedDetailsToggle(event)) {
          handleToggle();
        }
      }}
    >
      <ObligationDebt
        item={item}
        theme={selectedDashboardTheme}
        expanded={isExpanded}
        onToggleDetails={handleToggle}
      />
    </div>
  );
}
