import { forwardRef } from "react";

const DEFAULT_DASHBOARD_SHELL_CLASS =
  "relative flex min-h-0 w-full flex-1 flex-col overflow-hidden";

const DashboardShell = forwardRef(function DashboardShell(
  {
    children,
    className = "",
    style,
    as: Component = "section",
    baseClassName = DEFAULT_DASHBOARD_SHELL_CLASS,
  },
  ref
) {
  const resolvedClassName = [
    "clara-dashboard-shell",
    baseClassName,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component ref={ref} className={resolvedClassName} style={style}>
      {children}
    </Component>
  );
});

export default DashboardShell;
