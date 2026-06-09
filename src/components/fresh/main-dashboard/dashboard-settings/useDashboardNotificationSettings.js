import { useEffect, useState } from "react";
import { readStoredNotificationSettings } from "@/components/fresh/main-dashboard/dashboard-settings/dashboardRuntimeSettings";

export default function useDashboardNotificationSettings(userId) {
  const [notificationSettings, setNotificationSettings] = useState(() =>
    readStoredNotificationSettings(userId)
  );

  useEffect(() => {
    setNotificationSettings(readStoredNotificationSettings(userId));
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;

    const syncNotificationSettings = (event) => {
      const eventUserId = String(event?.detail?.userId || "").trim();
      if (eventUserId && eventUserId !== String(userId || "guest")) return;
      if (document.visibilityState && document.visibilityState === "hidden") return;
      setNotificationSettings(readStoredNotificationSettings(userId));
    };

    window.addEventListener("storage", syncNotificationSettings);
    window.addEventListener("focus", syncNotificationSettings);
    window.addEventListener("clara:notification-preferences-updated", syncNotificationSettings);
    window.addEventListener("clara-settings-updated", syncNotificationSettings);
    document.addEventListener("visibilitychange", syncNotificationSettings);

    return () => {
      window.removeEventListener("storage", syncNotificationSettings);
      window.removeEventListener("focus", syncNotificationSettings);
      window.removeEventListener("clara:notification-preferences-updated", syncNotificationSettings);
      window.removeEventListener("clara-settings-updated", syncNotificationSettings);
      document.removeEventListener("visibilitychange", syncNotificationSettings);
    };
  }, [userId]);

  return [notificationSettings, setNotificationSettings];
}
