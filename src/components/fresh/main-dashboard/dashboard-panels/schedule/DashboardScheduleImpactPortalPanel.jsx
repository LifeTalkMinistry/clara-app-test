import React, { useEffect, useState } from "react";
import useUserRole from "@/hooks/useUserRole";
import { syncFinancialCardSchedulesIntoCalendar } from "./financialCardScheduleIntegration";
import DashboardScheduleManualPanel from "./DashboardScheduleManualPanel.jsx";
import "./DashboardSchedulePremium.css";
import "./DashboardScheduleVisibilityFix.css";

const FINANCIAL_CARD_SCHEDULE_UPDATE_EVENTS = [
  "clara-finance-updated",
  "clara:finance-data-updated",
  "clara-local-finance-updated",
  "clara:debt-obligations-updated",
];

export default function DashboardScheduleImpactPortalPanel(props) {
  const { user } = useUserRole() || {};
  const [financialProjectionEpoch, setFinancialProjectionEpoch] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let cancelled = false;
    let requestRevision = 0;

    const refreshFinancialCardDates = async () => {
      const revision = ++requestRevision;

      try {
        await syncFinancialCardSchedulesIntoCalendar(user);
        if (cancelled || revision !== requestRevision) return;

        // The Calendar owns an in-memory snapshot. Remount after every successful
        // Savings Goal / Debt projection refresh so the newly derived dates render.
        setFinancialProjectionEpoch((current) => current + 1);
      } catch (error) {
        if (cancelled || revision !== requestRevision) return;
        console.warn(
          "CLARA Savings Goal / Debt calendar projection could not be refreshed:",
          error
        );
      }
    };

    const queueRefresh = () => {
      window.setTimeout(refreshFinancialCardDates, 0);
    };

    refreshFinancialCardDates();
    FINANCIAL_CARD_SCHEDULE_UPDATE_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, queueRefresh);
    });

    return () => {
      cancelled = true;
      FINANCIAL_CARD_SCHEDULE_UPDATE_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, queueRefresh);
      });
    };
  }, [user?.id, user?.email]);

  return (
    <DashboardScheduleManualPanel
      {...props}
      key={`financial-card-schedule-entry-${user?.id || user?.email || "local"}-${financialProjectionEpoch}`}
    />
  );
}
