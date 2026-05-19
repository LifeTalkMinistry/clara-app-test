import { memo, useCallback, useMemo } from "react";

function NavAction({
  item,
  index,
  isLast,
  isActive,
  onOpen,
  dashboardScale,
  themeQuickActionBaseClass,
  themeQuickActionIconShellClass,
  themeSecondaryTextClass,
  themeDividerClass,
  themeIsLight,
}) {
  const Icon = item.icon;

  const handleClick = useCallback(() => {
    onOpen(item.key);
  }, [item.key, onOpen]);

  const pillGlow = useMemo(() => {
    if (item.key === "feed") return "shadow-[0_0_12px_rgba(59,130,246,0.20)]";
    if (item.key === "task") return "shadow-[0_0_12px_rgba(250,204,21,0.22)]";
    return "";
  }, [item.key]);

  const iconHoverGlow = useMemo(() => {
    if (item.key === "feed") return "group-hover:shadow-[0_0_24px_rgba(59,130,246,0.18)]";
    if (item.key === "task") return "group-hover:shadow-[0_0_24px_rgba(250,204,21,0.18)]";
    if (item.key === "settings") return "group-hover:shadow-[0_0_22px_rgba(255,255,255,0.16)]";
    return "group-hover:shadow-[0_0_22px_rgba(255,255,255,0.10)]";
  }, [item.key]);

  return (
    <div className="flex flex-1 items-stretch" data-clara-nav-item={item.key}>
      <button
        type="button"
        onClick={handleClick}
        className="group flex flex-1"
        aria-label={item.label}
      >
        <div
          className={`clara-top-nav-action relative flex w-full flex-col items-center justify-center transition duration-200 hover:-translate-y-[1px] active:scale-[0.985] ${dashboardScale.headerItem} ${themeQuickActionBaseClass} ${isActive ? "clara-theme-nav-pill-active" : ""}`}
          data-clara-nav-active={isActive ? "true" : "false"}
        >
          <div className={`pointer-events-none absolute inset-0 rounded-[16px] opacity-0 transition duration-200 group-hover:opacity-100 ${themeIsLight ? "bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.12),transparent_55%)]" : "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]"}`} />

          <div className={`clara-top-nav-icon relative flex shrink-0 items-center justify-center rounded-full border transition duration-200 ${dashboardScale.headerIcon} ${themeQuickActionIconShellClass} ${iconHoverGlow}`}>
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

      {!isLast ? (
        <div className={`pointer-events-none mx-0.5 hidden h-10 w-px shrink-0 self-center bg-gradient-to-b from-transparent ${themeDividerClass} to-transparent sm:block`} />
      ) : null}
    </div>
  );
}

const MemoNavAction = memo(NavAction, (previous, next) => (
  previous.item === next.item &&
  previous.index === next.index &&
  previous.isLast === next.isLast &&
  previous.isActive === next.isActive &&
  previous.onOpen === next.onOpen &&
  previous.dashboardScale === next.dashboardScale &&
  previous.themeQuickActionBaseClass === next.themeQuickActionBaseClass &&
  previous.themeQuickActionIconShellClass === next.themeQuickActionIconShellClass &&
  previous.themeSecondaryTextClass === next.themeSecondaryTextClass &&
  previous.themeDividerClass === next.themeDividerClass &&
  previous.themeIsLight === next.themeIsLight
));

function DashboardTopNav({
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
    <div className={`clara-top-nav-stable relative z-30 shrink-0 ${dashboardScale.headerOuter}`} data-clara-top-nav="true">
      <div className="mx-auto w-full max-w-[430px] overflow-visible">
        <div
          className={`clara-top-nav-panel relative w-full overflow-visible border backdrop-blur-xl ${dashboardScale.headerPanel}`}
          style={themeQuickActionPanelStyle}
        >
          <div className="clara-top-nav-glow pointer-events-none absolute inset-0 rounded-[inherit]" style={themeQuickActionGlowStyle} />
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.10] bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.18)_18%,transparent_36%,transparent_64%,rgba(255,255,255,0.10)_82%,transparent_100%)]" />
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          <div className="relative flex items-stretch justify-between gap-1 sm:gap-1.5">
            {headerQuickActions.map((item, index) => (
              <MemoNavAction
                key={item.key}
                item={item}
                index={index}
                isLast={index >= headerQuickActions.length - 1}
                isActive={activeDashboardPanel === item.key}
                onOpen={openDashboardPanel}
                dashboardScale={dashboardScale}
                themeQuickActionBaseClass={themeQuickActionBaseClass}
                themeQuickActionIconShellClass={themeQuickActionIconShellClass}
                themeSecondaryTextClass={themeSecondaryTextClass}
                themeDividerClass={themeDividerClass}
                themeIsLight={themeIsLight}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(DashboardTopNav, (previous, next) => (
  previous.dashboardScale === next.dashboardScale &&
  previous.headerQuickActions === next.headerQuickActions &&
  previous.activeDashboardPanel === next.activeDashboardPanel &&
  previous.openDashboardPanel === next.openDashboardPanel &&
  previous.themeQuickActionPanelStyle === next.themeQuickActionPanelStyle &&
  previous.themeQuickActionGlowStyle === next.themeQuickActionGlowStyle &&
  previous.themeQuickActionBaseClass === next.themeQuickActionBaseClass &&
  previous.themeQuickActionIconShellClass === next.themeQuickActionIconShellClass &&
  previous.themeSecondaryTextClass === next.themeSecondaryTextClass &&
  previous.themeDividerClass === next.themeDividerClass &&
  previous.themeIsLight === next.themeIsLight
));
