import LearningHub from "@/components/fresh/main-dashboard/learning-hub/LearningHub";

export default function DashboardBillboard({ show = true }) {
  if (!show) return null;

  return <LearningHub />;
}
