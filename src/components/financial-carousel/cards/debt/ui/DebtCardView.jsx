import ObligationDebt from "@/components/ObligationDebt";

export default function DebtCardView({
  item,
  selectedDashboardTheme,
}) {
  return (
    <div className="clara-finance-bubble-card-shell clara-finance-bubble-debt-shell h-full min-h-[inherit] flex flex-col">
      <ObligationDebt
        item={item}
        theme={selectedDashboardTheme}
      />
    </div>
  );
}
