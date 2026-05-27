import dashboardTopNavVisual from "@/assets/dashboard-card-visuals/dashboard-topnav.png";

const claraBrandNavPanelStyle = {
  background:
    "linear-gradient(135deg, rgba(3, 11, 38, 0.72) 0%, rgba(4, 32, 83, 0.64) 40%, rgba(20, 20, 74, 0.68) 68%, rgba(48, 27, 105, 0.62) 100%)",
  borderColor: "rgba(95, 220, 255, 0.18)",
  boxShadow:
    "0 16px 38px rgba(0,0,0,0.26), 0 0 22px rgba(0,211,255,0.06), 0 0 30px rgba(118,61,255,0.06)",
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
            className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-fill opacity-100"
            draggable="false"
          />

          <div className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] ring-1 ring-inset ring-cyan-100/[0.08]" />

          <div className="relative z-10 flex items-stretch justify-between gap-1 sm:gap-1.5">
            {headerQuickActions.map((item, index) => {
              const isActive = activeDashboardPanel === item.key;

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
                      className={`relative flex w-full flex-col items-center justify-center overflow-hidden border border-transparent bg-transparent transition duration-200 active:scale-[0.985] ${dashboardScale.headerItem}`}
                    >
                      <span className="sr-only">{item.label}</span>
                    </div>
                  </button>

                  {index < headerQuickActions.length - 1 ? (
                    <div className="pointer-events-none mx-0.5 hidden h-10 w-px shrink-0 self-center bg-transparent sm:block" />
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
