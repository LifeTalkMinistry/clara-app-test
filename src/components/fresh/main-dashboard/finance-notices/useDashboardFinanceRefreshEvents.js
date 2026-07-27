import { useEffect } from "react";
import { ensureClaraBudgetCommandCenterAutoRun } from "@/lib/clara-budget-command-center";

const DASHBOARD_FINANCE_REFRESH_EVENTS = [
  "clara-expenses-updated",
  "clara-wallet-transactions-updated",
  "clara-budgets-updated",
  "clara-savings-goals-updated",
  "clara-emergency-fund-updated",
  "clara-transfers-updated",
];

export default function useDashboardFinanceRefreshEvents({
  user,
  scheduleRefresh,
}) {
  useEffect(() => {
    ensureClaraBudgetCommandCenterAutoRun();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!user?.id && !user?.email) return undefined;

    const handleFinanceMutation = () => {
      // Granular local mutations only need IndexedDB to be reread. The generic
      // clara-finance-updated event is already owned by useFinancialData, and
      // including it here created a second dashboard/cache writer.
      scheduleRefresh({ financeOnly: true });
    };

    DASHBOARD_FINANCE_REFRESH_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleFinanceMutation);
    });

    return () => {
      DASHBOARD_FINANCE_REFRESH_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleFinanceMutation);
      });
    };
  }, [scheduleRefresh, user?.email, user?.id]);
}
