const claraBrandNavPanelStyle = {
  background:
    "radial-gradient(circle at 9% 0%, rgba(0, 232, 255, 0.34), transparent 30%), radial-gradient(circle at 72% 0%, rgba(49, 132, 255, 0.24), transparent 34%), radial-gradient(circle at 100% 72%, rgba(139, 65, 255, 0.34), transparent 42%), linear-gradient(135deg, rgba(3, 11, 38, 0.96) 0%, rgba(4, 32, 83, 0.94) 40%, rgba(20, 20, 74, 0.96) 68%, rgba(48, 27, 105, 0.94) 100%)",
  borderColor: "rgba(95, 220, 255, 0.38)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(111,75,255,0.18), 0 18px 44px rgba(0,0,0,0.38), 0 0 30px rgba(0,211,255,0.16), 0 0 42px rgba(118,61,255,0.13)",
};

const claraBrandNavGlowStyle = {
  background:
    "linear-gradient(115deg, rgba(0,240,255,0.13), transparent 34%, rgba(58,125,255,0.10) 58%, rgba(148,72,255,0.14) 100%)",
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
          <div className="pointer-events-none absolute -left-10 -top-12 h-28 w-28 rounded-full bg-cyan-300/[0.20] blur-2xl" />
          <div className="pointer-events-none absolute -right-10 -bottom-14 h-32 w-32 rounded-full bg-violet-500/[0.18] blur-2xl" />
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.16)_17%,transparent_34%,transparent_62%,rgba(255,255,255,0.08)_84%,transparent_100%)] opacity-70" />
          <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/55 to-transparent" />
          <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-200/24 to-transparent" />

          <div className="relative flex items-stretch justify-between gap-1 sm:gap-1.5">
            {headerQuickActions.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeDashboardPanel === item.key;
              const pillGlow =
                item.key === "schedule"
                  ? "shadow-[0_0_12px_rgba(34,211,238,0.22)]"
                  : item.key === "settings"
                    ? "shadow-[0_0_12px_rgba(139,92,246,0.20)]"
                    : "shadow-[0_0_12px_rgba(59,130,246,0.18)]";
              const itemBaseClass = isActive
                ? "border border-cyan-100/[0.22] bg-[linear-gradient(135deg,rgba(0,221,255,0.26),rgba(46,132,255,0.20)_58%,rgba(127,75,255,0.18))] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_0_24px_rgba(0,216,255,0.22),0_0_34px_rgba(111,75,255,0.13)]"
                : "border border-transparent bg-transparent hover:border-cyan-100/[0.12] hover:bg-white/[0.055]";
              const iconShellClass = isActive
                ? "border-cyan-100/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.20),rgba(0,213,255,0.16)_48%,rgba(107,78,255,0.18))] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_0_22px_rgba(0,229,255,0.24)]"
                : "border-cyan-100/24 bg-white/[0.075] text-cyan-50/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_7px_18px_rgba(0,0,0,0.18)] group-hover:border-cyan-100/34 group-hover:bg-white/[0.10] group-hover:text-white group-hover:shadow-[0_0_22px_rgba(0,213,255,0.13)]";
              const labelClass = isActive
                ? "text-white drop-shadow-[0_0_8px_rgba(0,213,255,0.22)]"
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
                      {isActive ? (
                        <>
                          <div className="pointer-events-none absolute -left-6 -top-8 h-20 w-20 rounded-full bg-cyan-300/[0.18] blur-xl" />
                          <div className="pointer-events-none absolute -right-7 bottom-0 h-20 w-20 rounded-full bg-violet-500/[0.16] blur-xl" />
                        </>
                      ) : (
                        <div className="pointer-events-none absolute inset-0 rounded-[16px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.075),transparent_55%)] opacity-0 transition duration-200 group-hover:opacity-100" />
                      )}

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
                          <span className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full border border-cyan-100/40 bg-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.70),0_4px_10px_rgba(0,0,0,0.22)]" />
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
                    <div className="pointer-events-none mx-0.5 hidden h-10 w-px shrink-0 self-center bg-gradient-to-b from-transparent via-cyan-100/12 to-transparent sm:block" />
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
