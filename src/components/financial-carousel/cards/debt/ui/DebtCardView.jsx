import ObligationDebt from "@/components/ObligationDebt";
import { toggleExpandedFinanceCard } from "../../../shared/financeCardExpansion";

const DETAIL_KEY = "debtObligations";

export default function DebtCardView({
  item,
  selectedDashboardTheme,
  expandedFinanceCard,
  toggleFinanceDetails,
  financeCardController,
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
    <div className="h-full min-h-[inherit] flex flex-col">
      <ObligationDebt
        item={item}
        user={financeCardController?.user || null}
        theme={selectedDashboardTheme}
        expanded={isExpanded}
        onToggleDetails={handleToggle}
      />
    </div>
  );
}
