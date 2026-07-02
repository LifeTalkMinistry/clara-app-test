import DashboardModalLayer from "@/components/fresh/main-dashboard/shell/DashboardModalLayer";
import DashboardFinanceModalRenderer from "@/components/fresh/main-dashboard/shell/DashboardFinanceModalRendererWithRecurringBills";
import DashboardFinanceExpandedSheetLayer from "@/components/fresh/main-dashboard/shell/DashboardFinanceExpandedSheetLayer";
import DashboardProgramOnboardingModal from "@/components/fresh/main-dashboard/onboarding/DashboardProgramOnboardingModal";
import EmergencyReserveExpenseGuard from "@/components/fresh/main-dashboard/finance-content/EmergencyReserveExpenseGuard";
import StreakAchievementBubble from "@/components/fresh/main-dashboard/daily-tip/ui/StreakAchievementBubble";

export default function DashboardModalStack({
  expandedSheetLayerProps,
  onboardingModalProps,
  financeModalRendererProps,
}) {
  return (
    <DashboardModalLayer>
      <DashboardFinanceExpandedSheetLayer {...expandedSheetLayerProps} />
      <DashboardProgramOnboardingModal {...onboardingModalProps} />

      <EmergencyReserveExpenseGuard
        financeModal={financeModalRendererProps?.financeModal}
        financeForm={financeModalRendererProps?.financeForm}
        setFinanceForm={financeModalRendererProps?.setFinanceForm}
        wallets={financeModalRendererProps?.wallets}
        fmt={financeModalRendererProps?.fmt}
      />

      <DashboardFinanceModalRenderer {...financeModalRendererProps} />
      <StreakAchievementBubble />
    </DashboardModalLayer>
  );
}
