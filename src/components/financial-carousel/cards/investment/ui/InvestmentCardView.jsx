import InvestmentCard from "@/components/InvestmentCard";

export default function InvestmentCardView({
  item,
  selectedDashboardTheme,
}) {
  return (
    <div className="h-full min-h-[inherit] flex flex-col">
      <InvestmentCard
        item={item}
        theme={selectedDashboardTheme}
      />
    </div>
  );
}
