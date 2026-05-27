import { forwardRef } from "react";

const DEFAULT_DASHBOARD_SHELL_CLASS =
  "relative flex min-h-0 w-full flex-1 flex-col overflow-hidden";

const CLARA_AMBIENT_DASHBOARD_BACKGROUND = {
  background:
    "radial-gradient(circle at 18% 18%, rgba(0, 232, 255, 0.18), transparent 30%), radial-gradient(circle at 48% 34%, rgba(35, 115, 255, 0.16), transparent 38%), radial-gradient(circle at 82% 78%, rgba(128, 70, 255, 0.20), transparent 42%), radial-gradient(circle at 55% 92%, rgba(67, 56, 202, 0.18), transparent 34%), linear-gradient(145deg, #020617 0%, #03102f 42%, #070625 72%, #12062d 100%)",
  boxShadow:
    "inset 0 0 120px rgba(0, 0, 0, 0.45), inset 0 0 80px rgba(0, 213, 255, 0.04), inset 0 0 100px rgba(124, 58, 237, 0.05)",
};

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
  return (
    <Component
      ref={ref}
      className={`${baseClassName} ${className}`.trim()}
      style={{ ...CLARA_AMBIENT_DASHBOARD_BACKGROUND, ...style }}
    >
      {children}
    </Component>
  );
});

export default DashboardShell;
