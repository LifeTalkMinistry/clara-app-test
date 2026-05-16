import DashboardModalLayer from "@/components/fresh/main-dashboard/shell/DashboardModalLayer";
import DashboardFinanceModalRenderer from "@/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer";
import DashboardFinanceExpandedSheetLayer from "@/components/fresh/main-dashboard/shell/DashboardFinanceExpandedSheetLayer";
import DashboardProgramOnboardingModal from "@/components/fresh/main-dashboard/onboarding/DashboardProgramOnboardingModal";
import EmergencyReserveExpenseGuard from "@/components/fresh/main-dashboard/finance-content/EmergencyReserveExpenseGuard";

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
    </DashboardModalLayer>
  );
}
