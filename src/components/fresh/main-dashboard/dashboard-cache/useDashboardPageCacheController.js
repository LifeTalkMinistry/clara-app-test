import { useCallback, useRef } from "react";
import { createEmptyDashboardCache } from "@/components/fresh/main-dashboard/dashboard-cache/dashboardCacheFactory";

let dashboardPageCache = createEmptyDashboardCache();
let dashboardPageInFlight = null;

function hasUsableInitialFinanceCache(initialCache) {
  return Boolean(
    initialCache.loaded ||
      initialCache.offlineReady ||
      (Array.isArray(initialCache.wallets) && initialCache.wallets.length > 0) ||
      (Array.isArray(initialCache.expenses) && initialCache.expenses.length > 0) ||
      (Array.isArray(initialCache.budgets) && initialCache.budgets.length > 0) ||
      (Array.isArray(initialCache.savingsGoals) && initialCache.savingsGoals.length > 0) ||
      initialCache.emergencyFund
  );
}

export default function useDashboardPageCacheController({ cacheKey = null } = {}) {
  const hasLoadedDashboardRef = useRef(false);

  const initialCache =
    dashboardPageCache.loaded && dashboardPageCache.key === cacheKey
      ? dashboardPageCache
      : createEmptyDashboardCache(cacheKey);

  const hasInitialFinanceCache = hasUsableInitialFinanceCache(initialCache);

  const updateDashboardFinanceCache = useCallback((nextFinanceCache) => {
    dashboardPageCache = {
      ...dashboardPageCache,
      ...nextFinanceCache,
    };
  }, []);

  const getDashboardPageCache = useCallback(() => dashboardPageCache, []);

  const setDashboardPageCache = useCallback((nextCache) => {
    dashboardPageCache = nextCache;
  }, []);

  const getDashboardPageInFlight = useCallback(() => dashboardPageInFlight, []);

  const setDashboardPageInFlight = useCallback((nextInFlight) => {
    dashboardPageInFlight = nextInFlight;
  }, []);

  const clearDashboardPageInFlight = useCallback((ownerKey) => {
    if (dashboardPageInFlight?.key === ownerKey) dashboardPageInFlight = null;
  }, []);

  return {
    initialCache,
    hasInitialFinanceCache,
    hasLoadedDashboardRef,
    updateDashboardFinanceCache,
    getDashboardPageCache,
    setDashboardPageCache,
    getDashboardPageInFlight,
    setDashboardPageInFlight,
    clearDashboardPageInFlight,
  };
}
