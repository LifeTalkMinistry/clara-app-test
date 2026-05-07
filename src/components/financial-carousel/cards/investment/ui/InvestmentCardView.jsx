import InvestmentCard from "@/components/InvestmentCard";

export default function InvestmentCardView({
  item,
  selectedDashboardTheme,
  expandedFinanceCard,
  toggleFinanceDetails,
}) {
  const isExpanded = expandedFinanceCard === "investmentFund";

  const handleInvestmentToggle = () => {
    if (isExpanded) {
      toggleFinanceDetails?.("investmentFund");
      return;
    }

    toggleFinanceDetails?.("investmentFund", {
      autoExpand: true,
      forceOpen: true,
    });
  };

  return (
    <div
      className="clara-finance-bubble-card-shell clara-finance-bubble-investment-shell h-full min-h-[inherit] flex flex-col"
      onClickCapture={(event) => {
        const button = event.target?.closest?.("button");
        const label = String(button?.textContent || "").toLowerCase();

        if (
          label.includes("show details") ||
          label.includes("hide details")
        ) {
          event.preventDefault();
          event.stopPropagation();
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
