import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { getBackendAccountId } from "@/lib/clara-account-identity";
import {
  clearClaraCloudRecoveryPending,
  isClaraCloudRecoveryPending,
} from "@/lib/accountLinking/resolveAccountLocalVault";
import {
  CLARA_STORAGE_MODE_EVENT,
  CLARA_STORAGE_MODES,
  getClaraStorageMode,
} from "@/lib/clara-storage-mode";
import { syncClaraCloudVault } from "@/lib/cloud-vault-sync";

const SYNC_EVENTS = [
  "clara:finance-data-updated",
  "clara-finance-updated",
  "clara-local-finance-updated",
  "clara-local-profile-updated",
  "clara-local-setup-profile-updated",
  "clara:notification-preferences-updated",
  "clara-settings-updated",
  "clara:daily-check-in-updated",
  "clara-data-restored",
];

export default function CloudVaultSyncBridge() {
  const { user, profile, authReady } = useAuth();
  const accountId = getBackendAccountId(user);
  const timerRef = useRef(null);
  const contextRef = useRef({ user, profile });

  useEffect(() => {
    contextRef.current = { user, profile };
  }, [profile, user]);

  useEffect(() => {
    if (!authReady || !accountId) return undefined;

    const scheduleSync = ({
      immediate = false,
      force = false,
      preferRemote = false,
    } = {}) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const delay = immediate ? 0 : 2_500;
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        const context = contextRef.current;
        const activeAccountId = getBackendAccountId(context.user);
        if (
          getClaraStorageMode(activeAccountId) !== CLARA_STORAGE_MODES.ONLINE_SYNC &&
          !force
        ) {
          return;
        }
        syncClaraCloudVault({ ...context, force, preferRemote })
          .then((result) => {
            if (preferRemote && result && !result.suppressed) {
              clearClaraCloudRecoveryPending(activeAccountId);
            }
          })
          .catch(() => {
            // The Settings screen receives the detailed sync error event.
          });
      }, delay);
    };

    const recoveryPending = () => isClaraCloudRecoveryPending(accountId);
    const handleDataChange = () => scheduleSync();
    const handleStorageModeChange = (event) => {
      if (
        String(event?.detail?.accountId || "") === accountId &&
        event?.detail?.mode === CLARA_STORAGE_MODES.ONLINE_SYNC
      ) {
        scheduleSync({
          immediate: true,
          force: true,
          preferRemote: recoveryPending(),
        });
      }
    };
    const handleOnline = () =>
      scheduleSync({
        immediate: true,
        force: true,
        preferRemote: recoveryPending(),
      });

    SYNC_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, handleDataChange)
    );
    window.addEventListener(CLARA_STORAGE_MODE_EVENT, handleStorageModeChange);
    window.addEventListener("online", handleOnline);

    scheduleSync({
      immediate: true,
      force: true,
      preferRemote: recoveryPending(),
    });

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      SYNC_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, handleDataChange)
      );
      window.removeEventListener(CLARA_STORAGE_MODE_EVENT, handleStorageModeChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [accountId, authReady]);

  return null;
}
