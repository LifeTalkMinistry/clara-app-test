import { useCallback, useEffect, useRef } from "react";

export default function useDashboardScheduledRefresh({
  loadDashboardData,
  refreshFinancialData,
  delayMs = 350,
}) {
  const refreshTimeoutRef = useRef(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        await refreshFinancialData?.();
      } finally {
        await loadDashboardData({ background: true });
      }
    }, delayMs);
  }, [delayMs, loadDashboardData, refreshFinancialData]);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return scheduleRefresh;
}
