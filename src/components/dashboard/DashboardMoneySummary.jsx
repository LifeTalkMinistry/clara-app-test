import { memo } from "react";
import { compareDashboardSectionProps } from "./dashboardMemoUtils";

function DashboardMoneySummary({ children, className = "", ...props }) {
  return (
    <section className={className} data-clara-dashboard-section="money-summary" {...props}>
      {children}
    </section>
  );
}

export default memo(DashboardMoneySummary, compareDashboardSectionProps);
