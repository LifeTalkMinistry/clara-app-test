import { useEffect } from "react";
import { ensureClaraBudgetCommandCenterAutoRun } from "@/lib/clara-budget-command-center";

const DASHBOARD_FINANCE_REFRESH_EVENTS = [
  "clara-expenses-updated",
  "clara-finance-updated",
  "clara-wallets-updated",
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

    DASHBOARD_FINANCE_REFRESH_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, scheduleRefresh);
    });

    return () => {
      DASHBOARD_FINANCE_REFRESH_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, scheduleRefresh);
      });
    };
  }, [scheduleRefresh, user?.email, user?.id]);
}
