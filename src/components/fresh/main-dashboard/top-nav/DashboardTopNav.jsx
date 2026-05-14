export default function DashboardTopNav({
  dashboardScale,
  headerQuickActions = [],
  activeDashboardPanel,
  openDashboardPanel,
  themeQuickActionPanelStyle,
  themeQuickActionGlowStyle,
  themeQuickActionBaseClass = "",
  themeQuickActionIconShellClass = "",
  themeSecondaryTextClass = "",
  themeDividerClass = "via-white/10",
  themeIsLight = false,
}) {
  return (
    <div className={`clara-ai-focus-top-nav relative z-30 shrink-0 ${dashboardScale.headerOuter}`}>
      <div className="mx-auto w-full max-w-[430px] overflow-visible">
        <div
          className={`relative w-full overflow-visible border backdrop-blur-xl ${dashboardScale.headerPanel}`}
          style={themeQuickActionPanelStyle}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={themeQuickActionGlowStyle} />
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.10] bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.18)_18%,transparent_36%,transparent_64%,rgba(255,255,255,0.10)_82%,transparent_100%)]" />
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          <div className="relative flex items-stretch justify-between gap-1 sm:gap-1.5">
            {headerQuickActions.map((item, index) => {
              const Icon = item.icon;
              const pillGlow =
                item.key === "feed"
                  ? "shadow-[0_0_12px_rgba(59,130,246,0.20)]"
                  : item.key === "task"
                    ? "shadow-[0_0_12px_rgba(250,204,21,0.22)]"
                    : "";
              const iconHoverGlow =
                item.key === "feed"
                  ? "group-hover:shadow-[0_0_24px_rgba(59,130,246,0.18)]"
                  : item.key === "task"
                    ? "group-hover:shadow-[0_0_24px_rgba(250,204,21,0.18)]"
                    : item.key === "settings"
                      ? "group-hover:shadow-[0_0_22px_rgba(255,255,255,0.16)]"
                      : "group-hover:shadow-[0_0_22px_rgba(255,255,255,0.10)]";

              return (
                <div key={item.key} className="flex flex-1 items-stretch">
                  <button
                    type="button"
                    onClick={() => openDashboardPanel(item.key)}
                    className="group flex flex-1"
                    aria-label={item.label}
                  >
                    <div className={`relative flex w-full flex-col items-center justify-center transition duration-200 hover:-translate-y-[1px] active:scale-[0.985] ${dashboardScale.headerItem} ${themeQuickActionBaseClass} ${activeDashboardPanel === item.key ? "clara-theme-nav-pill-active" : ""}`}>
                      <div className={`pointer-events-none absolute inset-0 rounded-[16px] opacity-0 transition duration-200 group-hover:opacity-100 ${themeIsLight ? "bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.12),transparent_55%)]" : "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]"}`} />

                      <div className={`relative flex shrink-0 items-center justify-center rounded-full border transition duration-200 ${dashboardScale.headerIcon} ${themeQuickActionIconShellClass} ${iconHoverGlow}`}>
                        <Icon className={dashboardScale.headerIconSvg} />

                        {item.badge?.type === "count" ? (
                          <span
                            className={`absolute -right-1.5 -top-1.5 inline-flex min-w-[16px] items-center justify-center rounded-full border px-1 py-[2px] text-[8px] font-bold leading-none shadow-[0_4px_12px_rgba(0,0,0,0.24)] ${item.badge.className}`}
                          >
                            {item.badge.value}
                          </span>
                        ) : item.badge?.type === "pill" ? (
                          <span
                            className={`absolute -right-2 -top-1.5 inline-flex items-center justify-center rounded-full border px-1.5 py-[2px] text-[8px] font-semibold leading-none ${pillGlow} ${item.badge.className}`}
                          >
                            {item.badge.value}
                          </span>
                        ) : item.badge?.type === "dot" ? (
                          <span
                            className={`absolute right-0 top-0 h-1.5 w-1.5 rounded-full border shadow-[0_0_10px_rgba(56,189,248,0.45),0_4px_10px_rgba(0,0,0,0.22)] ${item.badge.className}`}
                          />
                        ) : null}
                      </div>

                      <span className={`max-w-full shrink-0 truncate font-medium leading-none ${dashboardScale.headerLabel} ${themeSecondaryTextClass}`}>
                        {item.label}
                      </span>
                    </div>
                  </button>

                  {index < headerQuickActions.length - 1 ? (
                    <div className={`pointer-events-none mx-0.5 hidden h-10 w-px shrink-0 self-center bg-gradient-to-b from-transparent ${themeDividerClass} to-transparent sm:block`} />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
