import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { getBackendAccountId } from "@/lib/clara-account-identity";
import {
  isApplyingServerFinanceState,
  syncServerFinance,
} from "@/lib/server-finance-sync";

const SYNC_EVENTS = [
  "clara:finance-data-updated",
  "clara-finance-updated",
  "clara-local-finance-updated",
  "clara-income-hub-updated",
  "clara-local-profile-updated",
  "clara-local-setup-profile-updated",
];

export default function CloudVaultSyncBridge() {
  const { user, authReady } = useAuth();
  const accountId = getBackendAccountId(user);
  const timerRef = useRef(null);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!authReady || !accountId) return undefined;

    const scheduleSync = ({ immediate = false, forcePull = false } = {}) => {
      if (isApplyingServerFinanceState()) return;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const delay = immediate ? 0 : 1_500;
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        syncServerFinance({ user: userRef.current, forcePull }).catch(() => {
          // The storage screen listens for the detailed status event.
        });
      }, delay);
    };

    const handleDataChange = () => scheduleSync();
    const handleOnline = () => scheduleSync({ immediate: true });

    SYNC_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, handleDataChange)
    );
    window.addEventListener("online", handleOnline);

    // On a new device this performs a pull-only pass first. The server is always
    // authoritative once the account finance store has been initialized.
    scheduleSync({ immediate: true });

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      SYNC_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, handleDataChange)
      );
      window.removeEventListener("online", handleOnline);
    };
  }, [accountId, authReady]);

  return null;
}
