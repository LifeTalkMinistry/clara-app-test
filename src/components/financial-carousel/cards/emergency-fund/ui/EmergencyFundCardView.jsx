import EmergencyFundCard from "@/components/EmergencyFundCard";
import { stopCapturedDetailsToggle } from "../../../shared/financeCardInteraction";

export default function EmergencyFundCardView({
  data = {},
  selectedDashboardTheme,
  expandedFinanceCard,
  toggleFinanceDetails,
  onQuickExpense,
  onSurvivalSaved,
  startClaraAiLongPress,
  endClaraAiLongPress,
  handleClaraAiOrbClickCapture,
}) {
  const isExpanded = expandedFinanceCard === "emergency";

  const handleEmergencyToggle = () => {
    if (isExpanded) {
      toggleFinanceDetails?.("emergency");
      return;
    }

    toggleFinanceDetails?.("emergency", {
      autoExpand: true,
      forceOpen: true,
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
      />
    </div>
  );
}
