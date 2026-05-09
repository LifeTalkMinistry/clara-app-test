import DashboardModalLayer from "@/components/fresh/main-dashboard/shell/DashboardModalLayer";
import DashboardFinanceModalRenderer from "@/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer";
import DashboardFinanceExpandedSheetLayer from "@/components/fresh/main-dashboard/shell/DashboardFinanceExpandedSheetLayer";
import DashboardProgramOnboardingModal from "@/components/fresh/main-dashboard/onboarding/DashboardProgramOnboardingModal";

export default function DashboardModalStack({
  expandedSheetLayerProps,
  onboardingModalProps,
  financeModalRendererProps,
}) {
  return (
    <DashboardModalLayer>
      <DashboardFinanceExpandedSheetLayer {...expandedSheetLayerProps} />
      <DashboardProgramOnboardingModal {...onboardingModalProps} />
      <DashboardFinanceModalRenderer {...financeModalRendererProps} />
    </DashboardModalLayer>
  );
}
