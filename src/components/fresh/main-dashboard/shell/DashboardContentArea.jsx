export default function DashboardContentArea({
  children,
  className = "",
  dashboardScale,
}) {
  const scaleClassName = dashboardScale?.content || "";

  return (
    <div className={`${scaleClassName} ${className}`.trim()}>
      {children}
    </div>
  );
}
