import { memo } from "react";

function DashboardMoneySummary({ children, className = "", ...props }) {
  return (
    <section className={className} data-clara-dashboard-section="money-summary" {...props}>
      {children}
    </section>
  );
}

export default memo(DashboardMoneySummary);
