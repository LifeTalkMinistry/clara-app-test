import EmergencyFundCard from "@/components/EmergencyFundCard";
import { toggleExpandedFinanceCard } from "../../../shared/financeCardExpansion";
import { stopCapturedDetailsToggle } from "../../../shared/financeCardInteraction";

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
      onMouseLeaveCapture={endClaraAiLongPress}
      onTouchStartCapture={startClaraAiLongPress}
      onTouchEndCapture={endClaraAiLongPress}
      onTouchCancelCapture={endClaraAiLongPress}
      onClickCapture={(event) => {
        if (
          typeof handleClaraAiOrbClickCapture === "function" &&
          handleClaraAiOrbClickCapture(event)
        ) {
          return;
        }

        if (stopCapturedDetailsToggle(event)) {
          handleEmergencyToggle();
        }
      }}
    >
      <EmergencyFundCard
        moneyLeft={data.moneyLeft}
        survivalExpense={data.survivalExpense}
        retentionRate={data.retentionRate}
        theme={selectedDashboardTheme}
        expanded={isExpanded}
        onToggleDetails={handleEmergencyToggle}
        canAutoPrompt={data.canAutoPrompt}
        hasSurvivalSetup={data.hasSurvivalSetup}
        onQuickExpense={onQuickExpense}
        onSurvivalSaved={onSurvivalSaved}
        onCreateWallet={onCreateWallet}
      />
    </div>
  );
}
