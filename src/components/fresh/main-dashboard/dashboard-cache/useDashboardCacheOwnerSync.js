import { useEffect } from "react";
import { createEmptyDashboardCache } from "@/components/fresh/main-dashboard/dashboard-cache/dashboardCacheFactory";
import { hasDashboardFinanceContent } from "@/components/fresh/main-dashboard/finance-content/dashboardFinanceContent";

export default function useDashboardCacheOwnerSync({
  cacheKey,
  initialCache,
  financeDataLoading = false,
  hasLoadedDashboardRef,
  hydrateFromCache,
  getDashboardPageCache,
  setDashboardPageCache,
  setGuardChecked,
  setLoading,
} = {}) {
  useEffect(() => {
    const currentDashboardCache =
      typeof getDashboardPageCache === "function" ? getDashboardPageCache() : null;

    if (!cacheKey) {
      const emptyCache = createEmptyDashboardCache();
      if (typeof setDashboardPageCache === "function") {
        setDashboardPageCache(emptyCache);
      }
      hydrateFromCache(emptyCache);
      return;
    }

    if (currentDashboardCache?.loaded && currentDashboardCache?.key === cacheKey) {
      hydrateFromCache(currentDashboardCache);
      return;
    }

    if (hasLoadedDashboardRef?.current !== undefined) {
      hasLoadedDashboardRef.current = false;
    }

    setGuardChecked(false);
    setLoading(!hasDashboardFinanceContent(initialCache) && financeDataLoading);
  }, [
    cacheKey,
    financeDataLoading,
    getDashboardPageCache,
    hasLoadedDashboardRef,
    hydrateFromCache,
    initialCache,
    setDashboardPageCache,
    setGuardChecked,
    setLoading,
  ]);
}
