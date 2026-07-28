import EmergencyFundCard from "@/components/EmergencyFundCard";
import { toggleExpandedFinanceCard } from "../../../shared/financeCardExpansion";

const DETAIL_KEY = "emergency";

export default function EmergencyFundCardView({
  data = {},
  selectedDashboardTheme,
  expandedFinanceCard,
  toggleFinanceDetails,
  onQuickExpense,
  onSurvivalSaved,
  onCreateWallet,
  startClaraAiLongPress,
  endClaraAiLongPress,
  handleClaraAiOrbClickCapture,
  financeCardController,
}) {
  const isExpanded = expandedFinanceCard === DETAIL_KEY;

  const handleEmergencyToggle = () => {
    toggleExpandedFinanceCard({
      detailKey: DETAIL_KEY,
      isExpanded,
      toggleFinanceDetails,
    });
  };

  return (
    <div
      className="h-full min-h-[inherit]"
      onMouseDownCapture={startClaraAiLongPress}
      onMouseUpCapture={endClaraAiLongPress}
      onMouseLeave={endClaraAiLongPress}
      onTouchStartCapture={startClaraAiLongPress}
      onTouchEndCapture={endClaraAiLongPress}
      onTouchCancelCapture={endClaraAiLongPress}
      onClickCapture={(event) => {
        handleClaraAiOrbClickCapture?.(event);
      }}
    >
      <EmergencyFundCard
        user={financeCardController?.user || null}
        emergencyFund={financeCardController?.emergencyFund ?? data.emergencyFund ?? null}
        wallets={financeCardController?.wallets || []}
        updateEmergencyFund={financeCardController?.updateEmergencyFund}
        addExpense={financeCardController?.addExpense}
        deleteExpense={financeCardController?.deleteExpense}
        transferBetweenWallets={financeCardController?.transferBetweenWallets}
        refreshData={financeCardController?.refreshData}
        correctEmergencyFundBalance={financeCardController?.correctEmergencyFundBalance}
        survivalExpense={data.survivalExpense}
        theme={selectedDashboardTheme}
        expanded={isExpanded}
        onToggleDetails={handleEmergencyToggle}
        onQuickExpense={onQuickExpense}
        onSurvivalSaved={onSurvivalSaved}
        onCreateWallet={onCreateWallet}
      />
    </div>
  );
}
