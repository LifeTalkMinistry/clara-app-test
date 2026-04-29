import { memo } from "react";

function DashboardRecentActivity({ children, className = "", ...props }) {
  return (
    <section className={className} data-clara-dashboard-section="recent-activity" {...props}>
      {children}
    </section>
  );
}

export default memo(DashboardRecentActivity);
