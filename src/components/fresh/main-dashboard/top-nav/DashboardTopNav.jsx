import dashboardTopNavVisual from "@/assets/dashboard-card-visuals/daily-tip-lightbulb.png";

const claraBrandNavPanelStyle = {
  background:
    "linear-gradient(135deg, rgba(3, 11, 38, 0.72) 0%, rgba(4, 32, 83, 0.64) 40%, rgba(20, 20, 74, 0.68) 68%, rgba(48, 27, 105, 0.62) 100%)",
  borderColor: "rgba(95, 220, 255, 0.24)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(111,75,255,0.12), 0 16px 38px rgba(0,0,0,0.32), 0 0 24px rgba(0,211,255,0.08), 0 0 34px rgba(118,61,255,0.08)",
};

const claraBrandNavGlowStyle = {
  background:
    "linear-gradient(115deg, rgba(0,240,255,0.06), transparent 36%, rgba(58,125,255,0.05) 62%, rgba(148,72,255,0.08) 100%)",
};

export default function DashboardTopNav({
  dashboardScale,
  headerQuickActions = [],
  activeDashboardPanel,
  openDashboardPanel,
}) {
  return (
    <div className={`relative z-30 shrink-0 ${dashboardScale.headerOuter}`}>
      <div className="mx-auto w-full max-w-[430px] overflow-visible">
        <div
          className={`relative w-full overflow-hidden border backdrop-blur-2xl ${dashboardScale.headerPanel}`}
          style={claraBrandNavPanelStyle}
        >
          <img
            src={dashboardTopNavVisual}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-fill opacity-95"
            draggable="false"
          />
          <div className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] bg-[linear-gradient(135deg,rgba(2,6,23,0.04),rgba(2,6,23,0.12)_48%,rgba(2,6,23,0.06))]" />
          <div
            className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit]"
            style={claraBrandNavGlowStyle}
          />
          <div className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.035)_18%,transparent_35%,transparent_66%,rgba(255,255,255,0.03)_84%,transparent_100%)] opacity-45" />
          <div className="pointer-events-none absolute inset-x-7 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-cyan-100/35 to-transparent" />
          <div className="pointer-events-none absolute inset-x-8 bottom-0 z-[1] h-px bg-gradient-to-r from-transparent via-violet-200/14 to-transparent" />

          <div className="relative z-10 flex items-stretch justify-between gap-1 sm:gap-1.5">
            {headerQuickActions.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeDashboardPanel === item.key;
              const pillGlow =
                item.key === "schedule"
                  ? "shadow-[0_0_12px_rgba(34,211,238,0.18)]"
                  : item.key === "settings"
                    ? "shadow-[0_0_12px_rgba(139,92,246,0.16)]"
                    : "shadow-[0_0_12px_rgba(59,130,246,0.14)]";
              const itemBaseClass = isActive
                ? "border border-cyan-100/[0.12] bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_12px_rgba(0,216,255,0.08)]"
                : "border border-transparent bg-transparent hover:border-cyan-100/[0.10] hover:bg-white/[0.035]";
              const iconShellClass = isActive
                ? "border-cyan-100/24 bg-white/[0.045] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_14px_rgba(0,229,255,0.10)]"
                : "border-cyan-100/12 bg-white/[0.025] text-cyan-50/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_7px_18px_rgba(0,0,0,0.10)] group-hover:border-cyan-100/22 group-hover:bg-white/[0.055] group-hover:text-white";
              const labelClass = isActive
                ? "text-white drop-shadow-[0_0_6px_rgba(0,213,255,0.12)]"
                : "text-cyan-50/72 group-hover:text-white";

              return (
                <div key={item.key} className="flex flex-1 items-stretch">
                  <button
                    type="button"
                    onClick={() => openDashboardPanel(item.key)}
                    className="group flex flex-1"
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <div
                      className={`relative flex w-full flex-col items-center justify-center overflow-hidden transition duration-200 hover:-translate-y-[1px] active:scale-[0.985] ${dashboardScale.headerItem} ${itemBaseClass}`}
                    >
                      <div className="pointer-events-none absolute inset-0 rounded-[16px] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),transparent_68%)] opacity-0 transition duration-200 group-hover:opacity-100" />

                      <div
                        className={`relative flex shrink-0 items-center justify-center rounded-full border transition duration-200 ${dashboardScale.headerIcon} ${iconShellClass}`}
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
                          <span className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full border border-cyan-100/40 bg-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.55),0_4px_10px_rgba(0,0,0,0.22)]" />
                        ) : null}
                      </div>

                      <span
                        className={`relative max-w-full shrink-0 truncate font-semibold leading-none transition duration-200 ${dashboardScale.headerLabel} ${labelClass}`}
                      >
                        {item.label}
                      </span>
                    </div>
                  </button>

                  {index < headerQuickActions.length - 1 ? (
                    <div className="pointer-events-none mx-0.5 hidden h-10 w-px shrink-0 self-center bg-gradient-to-b from-transparent via-cyan-100/8 to-transparent sm:block" />
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
