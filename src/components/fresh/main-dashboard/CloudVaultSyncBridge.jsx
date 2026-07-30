import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getBackendAccountId } from "@/lib/clara-account-identity";
import { CLARA_LIFE_STAGE_UPDATED_EVENT } from "@/life-stage-flow";
import {
  CLARA_MANUAL_ONLINE_SYNC_REQUEST_EVENT,
  CLARA_ONLINE_SYNC_POLICY_EVENT,
  isOnlineSyncPaused,
  resumeOnlineSync,
} from "@/lib/cloud-sync-policy";
import {
  CLARA_SERVER_FINANCE_EVENT_SOURCE,
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
  CLARA_LIFE_STAGE_UPDATED_EVENT,
];

export default function CloudVaultSyncBridge() {
  const { user, authReady } = useAuth();
  const accountId = getBackendAccountId(user);
  const timerRef = useRef(null);
  const userRef = useRef(user);
  const [syncPaused, setSyncPaused] = useState(() => isOnlineSyncPaused());

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const handlePolicyChange = () => setSyncPaused(isOnlineSyncPaused());
    window.addEventListener(CLARA_ONLINE_SYNC_POLICY_EVENT, handlePolicyChange);
    return () => {
      window.removeEventListener(CLARA_ONLINE_SYNC_POLICY_EVENT, handlePolicyChange);
    };
  }, []);

  useEffect(() => {
    if (!authReady || !accountId) return undefined;

    const handleManualSync = (event) => {
      if (isApplyingServerFinanceState()) return;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;

      const forcePull = Boolean(event?.detail?.forcePull);
      syncServerFinance({ user: userRef.current, forcePull })
        .then((result) => {
          if (result?.state === "synced") {
            resumeOnlineSync();
          }
        })
        .catch(() => {
          // The Settings control listens for the detailed sync status event.
        });
    };

    window.addEventListener(CLARA_MANUAL_ONLINE_SYNC_REQUEST_EVENT, handleManualSync);

    if (syncPaused) {
      // A device reset intentionally leaves authentication usable while finance
      // sync is fully paused. No automatic pull or upload is allowed until the
      // user explicitly chooses Sync online data in Settings.
      return () => {
        window.removeEventListener(CLARA_MANUAL_ONLINE_SYNC_REQUEST_EVENT, handleManualSync);
      };
    }

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

    const handleDataChange = (event) => {
      // Server-authoritative cache refreshes are for UI readers only. They must
      // never be interpreted as a new local mutation and uploaded back again.
      if (event?.detail?.source === CLARA_SERVER_FINANCE_EVENT_SOURCE) return;
      scheduleSync();
    };
    const handleOnline = () => scheduleSync({ immediate: true });

    SYNC_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, handleDataChange)
    );
    window.addEventListener("online", handleOnline);

    // Normal devices keep the existing automatic behavior. A freshly reset
    // device reaches this line only after the explicit manual restore succeeds.
    scheduleSync({ immediate: true });

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      window.removeEventListener(CLARA_MANUAL_ONLINE_SYNC_REQUEST_EVENT, handleManualSync);
      SYNC_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, handleDataChange)
      );
      window.removeEventListener("online", handleOnline);
    };
  }, [accountId, authReady, syncPaused]);

  return null;
}
