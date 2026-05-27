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
    <div className={`relative z-30 shrink-0 ${dashboardScale.headerOuter}`}>
      <div className="mx-auto w-full max-w-[430px] overflow-visible">
        <div
          className={`relative w-full overflow-hidden border backdrop-blur-2xl ${dashboardScale.headerPanel}`}
          style={themeQuickActionPanelStyle}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={themeQuickActionGlowStyle}
          />
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(11,148,156,0.22)_0%,rgba(13,43,85,0.28)_44%,rgba(74,42,142,0.30)_100%)]" />
          <div className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full bg-cyan-300/[0.14] blur-[54px]" />
          <div className="pointer-events-none absolute -right-14 -bottom-20 h-48 w-48 rounded-full bg-violet-400/[0.18] blur-[58px]" />
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.105),transparent_38%,rgba(0,0,0,0.16))]" />
          <div className="pointer-events-none absolute inset-[1px] rounded-[calc(1.5rem-1px)] border border-white/[0.055]" />
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-200/20 to-transparent" />

          <div className="relative grid grid-cols-4 gap-1.5 sm:gap-2">
            {headerQuickActions.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeDashboardPanel === item.key;
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

              const activeItemClass = themeIsLight
                ? "border-emerald-400/35 bg-white/78 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.90),0_12px_28px_rgba(15,23,42,0.12),0_0_24px_rgba(20,184,166,0.14)]"
                : "border-emerald-100/20 bg-[linear-gradient(135deg,rgba(20,184,166,0.20)_0%,rgba(13,41,80,0.36)_48%,rgba(91,46,154,0.34)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_30px_rgba(45,212,191,0.14),0_14px_28px_rgba(0,0,0,0.22)]";

              const inactiveItemClass = themeIsLight
                ? "border-transparent text-slate-700 hover:border-slate-300/40 hover:bg-white/48 hover:text-slate-950"
                : "border-transparent text-white/76 hover:border-white/[0.09] hover:bg-white/[0.055] hover:text-white";

              const activeIconClass = themeIsLight
                ? "border-emerald-400/40 bg-emerald-500/12 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_0_24px_rgba(16,185,129,0.16)]"
                : "border-emerald-100/30 bg-emerald-300/[0.17] text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_24px_rgba(94,234,212,0.24)]";

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => openDashboardPanel(item.key)}
                  className="group relative flex min-w-0"
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div
                    className={`relative flex w-full flex-col items-center justify-center overflow-hidden border transition duration-200 hover:-translate-y-[1px] active:scale-[0.985] ${dashboardScale.headerItem} ${isActive ? activeItemClass : `${inactiveItemClass} ${themeQuickActionBaseClass}`} ${isActive ? "clara-theme-nav-pill-active" : ""}`}
                  >
                    {isActive ? (
                      <>
                        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_24%_18%,rgba(125,255,218,0.20),transparent_42%),radial-gradient(circle_at_82%_74%,rgba(168,85,247,0.22),transparent_48%)]" />
                        <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-emerald-100/45 to-transparent" />
                        <div className="pointer-events-none absolute bottom-1.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-emerald-200/75 shadow-[0_0_14px_rgba(110,231,183,0.52)]" />
                      </>
                    ) : (
                      <div className={`pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition duration-200 group-hover:opacity-100 ${themeIsLight ? "bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.14),transparent_58%)]" : "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_58%)]"}`} />
                    )}

                    <div
                      className={`relative flex shrink-0 items-center justify-center rounded-full border transition duration-200 ${dashboardScale.headerIcon} ${isActive ? activeIconClass : `${themeQuickActionIconShellClass} ${iconHoverGlow}`}`}
                    >
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

                    <span
                      className={`relative max-w-full shrink-0 truncate leading-none transition ${dashboardScale.headerLabel} ${isActive ? "font-black tracking-[-0.01em]" : `font-semibold ${themeSecondaryTextClass}`}`}
                    >
                      {item.label}
                    </span>
                  </div>

                  {index < headerQuickActions.length - 1 ? (
                    <div className={`pointer-events-none absolute -right-1 top-1/2 hidden h-9 w-px -translate-y-1/2 bg-gradient-to-b from-transparent ${themeDividerClass} to-transparent sm:block`} />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
