import { useEffect } from "react";

const OFFLINE_NOTICE_MESSAGE = "You’re offline. CLARA is using saved data.";

export default function useDashboardOnlineStatusNotice({
  setFinanceNotice,
  loadDashboardData,
}) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleOffline = () => {
      setFinanceNotice({
        message: OFFLINE_NOTICE_MESSAGE,
        type: "success",
      });
    };

    const handleOnline = () => {
      // Reconnection sync is intentionally silent. Clear only the notice that
      // this hook created while offline, then let the dashboard refresh in the
      // background without exposing a syncing/loading state to the user.
      setFinanceNotice((currentNotice) =>
        currentNotice?.message === OFFLINE_NOTICE_MESSAGE ? null : currentNotice
      );
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
