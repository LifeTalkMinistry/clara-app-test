import { Home, MessageCircle, Settings } from "lucide-react";

const NAV_ITEMS = [
  {
    key: "home",
    label: "Home",
    icon: Home,
  },
  {
    key: "feed",
    label: "Feed",
    icon: Home,
  },
  {
    key: "messages",
    label: "Message",
    icon: MessageCircle,
  },
  {
    key: "settings",
    label: "Setting",
    icon: Settings,
  },
];

export default function DashboardTopNav({
  activePanel,
  onSelectPanel,
  dashboardScale,
}) {
  return (
    <div className={dashboardScale.headerOuter}>
      <div className={`grid grid-cols-4 border border-white/10 bg-white/[0.05] backdrop-blur-xl ${dashboardScale.headerPanel}`}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectPanel?.(item.key)}
              className={`flex flex-col items-center justify-center transition-all duration-200 ${dashboardScale.headerItem} ${
                isActive
                  ? "bg-cyan-400/20 text-white shadow-[0_0_20px_rgba(34,211,238,0.18)]"
                  : "text-white/82 hover:bg-white/[0.04]"
              }`}
            >
              <div
                className={`flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] ${dashboardScale.headerIcon}`}
              >
                <Icon className={dashboardScale.headerIconSvg} />
              </div>

              <span className={`font-semibold ${dashboardScale.headerLabel}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
