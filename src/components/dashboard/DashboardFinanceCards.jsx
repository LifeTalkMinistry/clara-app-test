import { memo } from "react";
import { compareDashboardSectionProps } from "./dashboardMemoUtils";

function DashboardFinanceCards({ children, className = "", ...props }) {
  return (
    <section className={className} data-clara-dashboard-section="finance-cards" {...props}>
      {children}
    </section>
  );
}

export default memo(DashboardFinanceCards, compareDashboardSectionProps);
