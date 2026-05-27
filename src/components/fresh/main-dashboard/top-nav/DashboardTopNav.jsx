import dashboardTopNavVisual from "@/assets/dashboard-card-visuals/dashboard-topnav-super-clean.png";

const TOP_NAV_ASSET_VERSION = "super-clean-20260527";

const claraBrandNavPanelStyle = {
  background: "transparent",
  borderColor: "transparent",
  boxShadow: "0 14px 34px rgba(0,0,0,0.22)",
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
            src={`${dashboardTopNavVisual}?v=${TOP_NAV_ASSET_VERSION}`}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-fill opacity-100"
            draggable="false"
          />

          <div className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] ring-1 ring-inset ring-cyan-100/[0.04]" />

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
