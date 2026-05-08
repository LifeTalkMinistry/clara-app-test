import { forwardRef } from "react";

const DashboardContentArea = forwardRef(function DashboardContentArea(
  {
    children,
    className = "",
    dashboardScale,
  },
  ref
) {
  const scaleClassName = dashboardScale?.content || "";

  return (
    <div ref={ref} className={`${scaleClassName} ${className}`.trim()}>
      {children}
    </div>
  );
});

export default DashboardContentArea;
