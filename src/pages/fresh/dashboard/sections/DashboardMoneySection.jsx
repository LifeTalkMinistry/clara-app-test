import MoneySummaryLogic from "@/components/fresh/main-dashboard/moneysummary/logic/MoneySummary.logic.jsx";
import useDashboardFinancials from "../hooks/useDashboardFinancials";

export default function DashboardMoneySection() {
  const {
    walletMoney,
    totalExpenses,
    loading,
  } = useDashboardFinancials();

  return (
    <MoneySummaryLogic
      walletMoney={walletMoney}
      totalExpenses={totalExpenses}
      loading={loading}
    />
  );
}
