export default function DashboardShell({
  children,
  className = "",
  style,
}) {
  return (
    <section
      className={`relative flex min-h-0 w-full flex-1 flex-col overflow-hidden ${className}`.trim()}
      style={style}
    >
      {children}
    </section>
  );
}
