import TopNav from "@/components/fresh/shared/topnav";
import DashboardBillboardSection from "./sections/DashboardBillboardSection";
import DashboardCarouselSection from "./sections/DashboardCarouselSection";
import DashboardMoneySection from "./sections/DashboardMoneySection";
import useDashboardUIState from "./hooks/useDashboardUIState";
import useDashboardBillboard from "./hooks/useDashboardBillboard";

export default function Dashboard() {
  const { showBillboard } = useDashboardUIState();

  const billboardProps = useDashboardBillboard({
    show: showBillboard,
  });

  return (
    <div className="px-4 pt-2 space-y-4">

      {/* TOP NAV */}
      <TopNav />

      {/* BILLBOARD */}
      <DashboardBillboardSection {...billboardProps} />

      {/* CAROUSEL */}
      <div>
        <DashboardCarouselSection />
      </div>

      {/* MONEY LEFT */}
      <div>
        <DashboardMoneySection />
      </div>

    </div>
  );
}
