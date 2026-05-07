import ObligationDebt from "@/components/ObligationDebt";

export default function DebtCardView({
  item,
  selectedDashboardTheme,
  expandedFinanceCard,
  toggleFinanceDetails,
}) {
  return (
    <div className="clara-finance-bubble-card-shell clara-finance-bubble-debt-shell h-full min-h-[inherit] flex flex-col">
      <ObligationDebt
        item={item}
        theme={selectedDashboardTheme}
        expanded={expandedFinanceCard === "debtObligations"}
        onToggleDetails={() => toggleFinanceDetails?.("debtObligations")}
      />
    </div>
  );
}
