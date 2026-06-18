import { useEffect, useRef } from "react";

export default function useDashboardInitialLoad(loadDashboardData) {
  const hasLoadedRef = useRef(false);
  const latestLoadDashboardDataRef = useRef(loadDashboardData);

  useEffect(() => {
    latestLoadDashboardDataRef.current = loadDashboardData;
  }, [loadDashboardData]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    if (typeof latestLoadDashboardDataRef.current === "function") {
      latestLoadDashboardDataRef.current();
    }
  }, []);
}
