import { Link } from "react-router-dom";

export default function DashboardPanelShell({
  title,
  subtitle,
  icon: Icon,
  viewAllTo,
  viewAllLabel = "View full page",
  onBack,
  children,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-[28px] border border-white/15 bg-white/[0.05] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white">
            <Icon className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">{title}</p>
            <p className="truncate text-xs text-white/55">{subtitle}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {viewAllTo ? (
            <Link
              to={viewAllTo}
              className="rounded-full border border-white/15 bg-white/8 px-3 py-2 text-[11px] font-semibold text-white/75 transition hover:bg-white/12"
            >
              {viewAllLabel}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-white/15 bg-white/8 px-3 py-2 text-[11px] font-semibold text-white/75 transition hover:bg-white/12"
          >
            Home
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}
