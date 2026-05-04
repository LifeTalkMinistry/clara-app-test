import DashboardBillboardSection from "./sections/DashboardBillboardSection";
import DashboardCarouselSection from "./sections/DashboardCarouselSection";
import DashboardMoneySection from "./sections/DashboardMoneySection";
import useDashboardUIState from "./hooks/useDashboardUIState";

export default function Dashboard() {
  const { showBillboard } = useDashboardUIState();

  return (
    <div className="px-4 pt-4 space-y-4">

      {/* BILLBOARD */}
      <DashboardBillboardSection show={showBillboard} />

      {/* CAROUSEL */}
      <div>
        <DashboardCarouselSection />
      </div>

      {/* MONEY LEFT (REAL UI) */}
      <div>
        <DashboardMoneySection />
      </div>

    </div>
  );
}
