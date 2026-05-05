import MoneyLeftUi from "@/components/fresh/main-dashboard/moneysummary/MoneyLeftUi.jsx";
import useDashboardFinancials from "../hooks/useDashboardFinancials";

export default function DashboardMoneySection() {
  const {
    walletMoney,
    totalExpenses,
    loading,
  } = useDashboardFinancials();

  return (
    <MoneyLeftUi
      walletMoney={walletMoney}
      totalExpenses={totalExpenses}
      loading={loading}
    />
  );
}
