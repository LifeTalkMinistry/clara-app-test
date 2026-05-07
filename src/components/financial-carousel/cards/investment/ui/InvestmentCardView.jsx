import InvestmentCard from "@/components/InvestmentCard";

export default function InvestmentCardView({
  item,
  selectedDashboardTheme,
  expandedFinanceCard,
  toggleFinanceDetails,
}) {
  return (
    <div className="clara-finance-bubble-card-shell clara-finance-bubble-investment-shell h-full min-h-[inherit] flex flex-col">
      <InvestmentCard
        item={item}
        theme={selectedDashboardTheme}
        expanded={expandedFinanceCard === "investmentFund"}
        onToggleDetails={() => toggleFinanceDetails?.("investmentFund")}
      />
    </div>
  );
}
