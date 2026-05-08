import { useEffect } from "react";

export default function useDashboardInitialLoad(loadDashboardData) {
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);
}
