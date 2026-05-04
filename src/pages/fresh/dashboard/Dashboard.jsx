import DashboardBillboardSection from "./sections/DashboardBillboardSection";
import DashboardCarouselSection from "./sections/DashboardCarouselSection";
import DashboardMoneySection from "./sections/DashboardMoneySection";

export default function Dashboard() {
  return (
    <div className="px-4 pt-4 space-y-4">

      {/* BILLBOARD */}
      <DashboardBillboardSection show={true} />

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
