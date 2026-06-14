import { forwardRef } from "react";

const DASHBOARD_CONTENT_BOTTOM_PADDING =
  "max(clamp(20px, 4.6dvh, 34px), calc(env(safe-area-inset-bottom, 0px) + 16px))";

const DashboardContentArea = forwardRef(function DashboardContentArea(
  {
    children,
    className = "",
    dashboardScale,
    style,
  },
  ref
) {
  const scaleClassName = dashboardScale?.content || "";
  const mergedStyle = {
    minHeight: 0,
    boxSizing: "border-box",
    ...style,
    paddingBottom: style?.paddingBottom || DASHBOARD_CONTENT_BOTTOM_PADDING,
  };

  return (
    <div
      ref={ref}
      className={`clara-dashboard-content min-h-0 ${scaleClassName} ${className}`.trim()}
      style={mergedStyle}
    >
      {children}
    </div>
  );
});

export default DashboardContentArea;
