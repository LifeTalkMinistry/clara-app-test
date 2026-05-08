import { useCallback, useEffect, useState } from "react";
import {
  persistMoneySummaryVisibility,
  readMoneySummaryVisibility,
} from "@/components/fresh/main-dashboard/dashboard-settings/dashboardRuntimeSettings";

export default function useMoneySummaryVisibility(userId) {
  const storageUserId = userId || "guest";

  const [moneySummaryVisible, setMoneySummaryVisible] = useState(() =>
    readMoneySummaryVisibility(storageUserId)
  );

  useEffect(() => {
    setMoneySummaryVisible(readMoneySummaryVisibility(storageUserId));
  }, [storageUserId]);

  const toggleMoneySummaryVisibility = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.nativeEvent?.stopImmediatePropagation?.();

      setMoneySummaryVisible((current) => {
        const nextVisible = !current;
        persistMoneySummaryVisibility(nextVisible, storageUserId);
        return nextVisible;
      });
    },
    [storageUserId]
  );

  return [moneySummaryVisible, toggleMoneySummaryVisibility];
}
