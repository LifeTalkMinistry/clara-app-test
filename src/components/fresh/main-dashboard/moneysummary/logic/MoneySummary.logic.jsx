import MoneySummaryUI from "../ui/MoneySummary.ui.jsx";

const formatCurrency = (value) => {
  const number = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(number) ? number : 0);
};

const getStatusText = ({ loading = false, isRefreshing = false } = {}) => {
  if (loading) return "Loading your money summary";
  if (isRefreshing) return "Refreshing safely in the background";
  return "Synced with your offline-first finance data";
};

export default function MoneySummaryLogic({
  walletMoney = 0,
  totalExpenses = 0,
  loading = false,
  isRefreshing = false,
}) {
  const moneyLeftValue = formatCurrency(walletMoney);
  const totalExpenseValue = formatCurrency(totalExpenses);
  const statusText = getStatusText({ loading, isRefreshing });

  return (
    <MoneySummaryUI
      walletMoney={walletMoney}
      totalExpenses={totalExpenses}
      loading={loading}
      isRefreshing={isRefreshing}
      moneyLeftValue={moneyLeftValue}
      totalExpenseValue={totalExpenseValue}
      statusText={statusText}
    />
  );
}
