import { useCallback, useEffect, useRef } from "react";

export default function useDashboardScheduledRefresh({
  loadDashboardData,
  refreshFinancialData,
  delayMs = 350,
}) {
  const refreshTimeoutRef = useRef(null);

  const scheduleRefresh = useCallback(({ financeOnly = false } = {}) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(async () => {
      refreshTimeoutRef.current = null;

      if (financeOnly) {
        // useFinancialData is the single reader for live money records. Its state
        // then flows into the dashboard through useDashboardFinanceStateSync.
        await refreshFinancialData?.();
        return;
      }

      // For broader dashboard/profile refreshes, let any existing dashboard
      // snapshot render first and make the authoritative finance reread the final
      // money-state writer. This prevents an older closure/cache from winning.
      try {
        await loadDashboardData({ background: true });
      } finally {
        await refreshFinancialData?.();
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
