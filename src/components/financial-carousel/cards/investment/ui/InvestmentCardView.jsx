import InvestmentCard from "@/components/InvestmentCard";
import { toggleExpandedFinanceCard } from "../../../shared/financeCardExpansion";
import { stopCapturedDetailsToggle } from "../../../shared/financeCardInteraction";

const DETAIL_KEY = "investmentFund";

export default function InvestmentCardView({
  item,
  selectedDashboardTheme,
  expandedFinanceCard,
  toggleFinanceDetails,
}) {
  const isExpanded = expandedFinanceCard === DETAIL_KEY;

  const handleInvestmentToggle = () => {
    toggleExpandedFinanceCard({
      detailKey: DETAIL_KEY,
      isExpanded,
      toggleFinanceDetails,
    });
  };

  return (
    <div
      className="clara-finance-bubble-card-shell clara-finance-bubble-investment-shell h-full min-h-[inherit] flex flex-col"
      onClickCapture={(event) => {
        if (stopCapturedDetailsToggle(event)) {
          handleInvestmentToggle();
        }
      }}
    >
      <InvestmentCard
        item={item}
        theme={selectedDashboardTheme}
        expanded={isExpanded}
        onToggleDetails={handleInvestmentToggle}
      />
    </div>
  );
}
