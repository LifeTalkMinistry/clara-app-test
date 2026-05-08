import { useEffect } from "react";

export default function useDashboardOnlineStatusNotice({
  setFinanceNotice,
  loadDashboardData,
}) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleOffline = () => {
      setFinanceNotice({
        message: "You’re offline. CLARA is using saved data.",
        type: "success",
      });
    };

    const handleOnline = () => {
      setFinanceNotice({
        message: "You’re back online. CLARA is syncing saved data.",
        type: "success",
      });
      loadDashboardData({ background: true });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [loadDashboardData, setFinanceNotice]);
}
