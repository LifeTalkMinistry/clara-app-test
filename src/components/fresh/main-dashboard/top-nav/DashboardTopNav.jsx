const claraBrandNavPanelStyle = {
  background:
    "linear-gradient(135deg, rgba(3, 11, 38, 0.97) 0%, rgba(4, 32, 83, 0.95) 40%, rgba(20, 20, 74, 0.97) 68%, rgba(48, 27, 105, 0.95) 100%)",
  borderColor: "rgba(95, 220, 255, 0.32)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(111,75,255,0.14), 0 16px 38px rgba(0,0,0,0.36), 0 0 24px rgba(0,211,255,0.10), 0 0 34px rgba(118,61,255,0.10)",
};

const claraBrandNavGlowStyle = {
  background:
    "linear-gradient(115deg, rgba(0,240,255,0.09), transparent 36%, rgba(58,125,255,0.07) 62%, rgba(148,72,255,0.10) 100%)",
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
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={claraBrandNavGlowStyle}
          />
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.09)_18%,transparent_35%,transparent_66%,rgba(255,255,255,0.055)_84%,transparent_100%)] opacity-55" />
          <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/45 to-transparent" />
          <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-200/18 to-transparent" />

          <div className="relative flex items-stretch justify-between gap-1 sm:gap-1.5">
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
                ? "border border-cyan-100/[0.18] bg-[linear-gradient(135deg,rgba(0,221,255,0.20),rgba(46,132,255,0.16)_58%,rgba(127,75,255,0.14))] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_18px_rgba(0,216,255,0.14),0_0_24px_rgba(111,75,255,0.09)]"
                : "border border-transparent bg-transparent hover:border-cyan-100/[0.12] hover:bg-white/[0.045]";
              const iconShellClass = isActive
                ? "border-cyan-100/34 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),rgba(0,213,255,0.14)_48%,rgba(107,78,255,0.14))] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_0_18px_rgba(0,229,255,0.18)]"
                : "border-cyan-100/22 bg-white/[0.065] text-cyan-50/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_7px_18px_rgba(0,0,0,0.16)] group-hover:border-cyan-100/32 group-hover:bg-white/[0.09] group-hover:text-white group-hover:shadow-[0_0_18px_rgba(0,213,255,0.10)]";
              const labelClass = isActive
                ? "text-white drop-shadow-[0_0_6px_rgba(0,213,255,0.16)]"
                : "text-cyan-50/78 group-hover:text-white";

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
                      <div className="pointer-events-none absolute inset-0 rounded-[16px] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),transparent_68%)] opacity-0 transition duration-200 group-hover:opacity-100" />

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
                    <div className="pointer-events-none mx-0.5 hidden h-10 w-px shrink-0 self-center bg-gradient-to-b from-transparent via-cyan-100/10 to-transparent sm:block" />
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
