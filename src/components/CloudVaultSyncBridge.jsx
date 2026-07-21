import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
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
  const timerRef = useRef(null);
  const contextRef = useRef({ user, profile });

  useEffect(() => {
    contextRef.current = { user, profile };
  }, [profile, user]);

  useEffect(() => {
    if (!authReady || !user?.id) return undefined;

    const scheduleSync = ({ immediate = false, force = false } = {}) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const delay = immediate ? 0 : 2_500;
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        const context = contextRef.current;
        if (
          getClaraStorageMode(context.user?.id) !==
            CLARA_STORAGE_MODES.ONLINE_SYNC &&
          !force
        ) {
          return;
        }
        syncClaraCloudVault({ ...context, force }).catch(() => {
          // The Settings screen receives the detailed sync error event.
        });
      }, delay);
    };

    const handleDataChange = () => scheduleSync();
    const handleStorageModeChange = (event) => {
      if (
        String(event?.detail?.accountId || "") === String(user.id) &&
        event?.detail?.mode === CLARA_STORAGE_MODES.ONLINE_SYNC
      ) {
        scheduleSync({ immediate: true, force: true });
      }
    };
    const handleOnline = () => scheduleSync({ immediate: true, force: true });

    SYNC_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, handleDataChange)
    );
    window.addEventListener(CLARA_STORAGE_MODE_EVENT, handleStorageModeChange);
    window.addEventListener("online", handleOnline);

    scheduleSync({ immediate: true, force: true });

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      SYNC_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, handleDataChange)
      );
      window.removeEventListener(CLARA_STORAGE_MODE_EVENT, handleStorageModeChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [authReady, user?.id]);

  return null;
}
