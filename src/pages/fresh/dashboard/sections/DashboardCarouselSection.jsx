import FinancialCarousel from "@/components/fresh/main-dashboard/FinancialCarousel";
import useDashboardFinancials from "../hooks/useDashboardFinancials";

export default function DashboardCarouselSection() {
  const financeProps = useDashboardFinancials();

  return <FinancialCarousel {...financeProps} />;
}
