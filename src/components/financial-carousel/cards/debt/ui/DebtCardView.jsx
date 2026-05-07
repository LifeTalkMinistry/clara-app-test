import ObligationDebt from "@/components/ObligationDebt";

export default function DebtCardView({
  item,
  selectedDashboardTheme,
  expandedFinanceCard,
  toggleFinanceDetails,
}) {
  const cardKey = "debtObligations";
  const isExpanded = expandedFinanceCard === cardKey;

  const handleToggle = () => {
    if (isExpanded) {
      toggleFinanceDetails?.(cardKey);
      return;
    }

    toggleFinanceDetails?.(cardKey, {
      autoExpand: true,
      forceOpen: true,
    });
  };

  return (
    <div
      className="clara-finance-bubble-card-shell clara-finance-bubble-debt-shell h-full min-h-[inherit] flex flex-col"
      onClickCapture={(event) => {
        const button = event.target?.closest?.("button");
        const label = String(button?.textContent || "").toLowerCase();

        if (
          label.includes("show details") ||
          label.includes("hide details")
        ) {
          event.preventDefault();
          event.stopPropagation();
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
