import { useEffect } from "react";
import { normalizeString } from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardProfileUpdateListener({
  setProfileData,
  setNickname,
  scheduleRefresh,
}) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleProfileUpdated = (event) => {
      const updated = event?.detail?.profile || {};

      setProfileData((prev) => ({
        ...(prev || {}),
        ...updated,
      }));

      const nextName = normalizeString(
        updated?.display_name ||
          updated?.nickname ||
          updated?.full_name ||
          ""
      );

      if (nextName) {
        setNickname(nextName);
      }

      scheduleRefresh();
    };

    window.addEventListener("clara-profile-updated", handleProfileUpdated);

    return () => {
      window.removeEventListener("clara-profile-updated", handleProfileUpdated);
    };
  }, [scheduleRefresh, setNickname, setProfileData]);
}
