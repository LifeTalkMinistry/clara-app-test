import { useEffect, useRef, useState } from "react";
import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getBackendAccountId } from "@/lib/clara-account-identity";
import {
  CLARA_MANUAL_ONLINE_SYNC_REQUEST_EVENT,
  CLARA_ONLINE_SYNC_POLICY_EVENT,
  isOnlineSyncPaused,
  resumeOnlineSync,
} from "@/lib/cloud-sync-policy";
import {
  CLARA_STORAGE_MODE_EVENT,
  CLARA_STORAGE_MODES,
  getClaraStorageMode,
} from "@/lib/clara-storage-mode";
import {
  getActiveClaraStorageMode,
  refreshClaraStorageModeFromServer,
  syncFinanceForActiveMode,
} from "@/lib/strict-storage-mode-policy";
import {
  CLARA_SERVER_FINANCE_EVENT_SOURCE,
  isApplyingServerFinanceState,
} from "@/lib/server-finance-sync";

const SYNC_EVENTS = [
  "clara:finance-data-updated",
  "clara-finance-updated",
  "clara-local-finance-updated",
  "clara-income-hub-updated",
  "clara-local-profile-updated",
  "clara-local-setup-profile-updated",
];

function networkIsOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export default function CloudVaultSyncBridge() {
  const { user, authReady } = useAuth();
  const accountId = getBackendAccountId(user);
  const timerRef = useRef(null);
  const userRef = useRef(user);
  const [syncPaused, setSyncPaused] = useState(() => isOnlineSyncPaused());
  const [storageMode, setStorageMode] = useState(() =>
    getActiveClaraStorageMode(user)
  );
  const [networkOffline, setNetworkOffline] = useState(() => networkIsOffline());
  const [serverUnavailable, setServerUnavailable] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [connectionError, setConnectionError] = useState("");

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    setStorageMode(
      accountId
        ? getClaraStorageMode(accountId)
        : CLARA_STORAGE_MODES.LOCAL_ONLY
    );
  }, [accountId]);

  useEffect(() => {
    if (!authReady || !accountId || networkIsOffline()) return undefined;
    let active = true;

    refreshClaraStorageModeFromServer(user)
      .then((mode) => {
        if (active) setStorageMode(mode);
      })
      .catch(() => {
        // Keep the last account-scoped mode. A temporary server failure must not
        // silently downgrade an Online Sync account to Device-Only.
      });

    return () => {
      active = false;
    };
  }, [accountId, authReady, user]);

  useEffect(() => {
    const handlePolicyChange = () => setSyncPaused(isOnlineSyncPaused());
    const handleStorageModeChange = (event) => {
      const eventAccountId = String(event?.detail?.accountId || "");
      if (eventAccountId && eventAccountId !== String(accountId || "")) return;
      setStorageMode(
        event?.detail?.mode ||
          (accountId
            ? getClaraStorageMode(accountId)
            : CLARA_STORAGE_MODES.LOCAL_ONLY)
      );
    };
    const handleOnline = () => {
      setNetworkOffline(false);
      setServerUnavailable(false);
      setConnectionError("");
    };
    const handleOffline = () => {
      setNetworkOffline(true);
      setConnectionError("This device is still offline. Turn on Wi-Fi or mobile data, then try again.");
    };

    window.addEventListener(CLARA_ONLINE_SYNC_POLICY_EVENT, handlePolicyChange);
    window.addEventListener(CLARA_STORAGE_MODE_EVENT, handleStorageModeChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener(CLARA_ONLINE_SYNC_POLICY_EVENT, handlePolicyChange);
      window.removeEventListener(CLARA_STORAGE_MODE_EVENT, handleStorageModeChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [accountId]);

  useEffect(() => {
    if (!authReady || !accountId) return undefined;

    const runSync = ({ forcePull = false } = {}) =>
      syncFinanceForActiveMode({ user: userRef.current, forcePull })
        .then((result) => {
          if (result?.state === "synced") {
            setServerUnavailable(false);
            setNetworkOffline(false);
            setConnectionError("");
            if (forcePull) resumeOnlineSync();
          } else if (result?.offline) {
            setServerUnavailable(true);
            setConnectionError(
              "Your internet is on, but CLARA could not reach the sync server. Please try again."
            );
          }
          return result;
        })
        .catch((error) => {
          if (
            error?.code === "ONLINE_SYNC_REQUIRES_INTERNET" ||
            networkIsOffline()
          ) {
            setNetworkOffline(true);
            setConnectionError(
              "This device is still offline. Turn on Wi-Fi or mobile data, then try again."
            );
          } else {
            setServerUnavailable(true);
            setConnectionError(
              error?.message ||
                "CLARA could not reach the sync server. Please try again."
            );
          }
          throw error;
        });

    const handleManualSync = (event) => {
      if (isApplyingServerFinanceState()) return;
      if (storageMode !== CLARA_STORAGE_MODES.ONLINE_SYNC) return;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      runSync({ forcePull: Boolean(event?.detail?.forcePull) }).catch(() => {});
    };

    window.addEventListener(CLARA_MANUAL_ONLINE_SYNC_REQUEST_EVENT, handleManualSync);

    if (
      storageMode !== CLARA_STORAGE_MODES.ONLINE_SYNC ||
      syncPaused ||
      networkOffline
    ) {
      // Device-Only mode never installs upload listeners. A freshly reset device
      // also remains isolated until the user explicitly chooses Online Sync.
      return () => {
        window.removeEventListener(
          CLARA_MANUAL_ONLINE_SYNC_REQUEST_EVENT,
          handleManualSync
        );
      };
    }

    const scheduleSync = ({ immediate = false, forcePull = false } = {}) => {
      if (isApplyingServerFinanceState()) return;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const delay = immediate ? 0 : 1_500;
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        runSync({ forcePull }).catch(() => {});
      }, delay);
    };

    const handleDataChange = (event) => {
      if (event?.detail?.source === CLARA_SERVER_FINANCE_EVENT_SOURCE) return;
      scheduleSync();
    };
    const handleOnline = () => scheduleSync({ immediate: true });

    SYNC_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, handleDataChange)
    );
    window.addEventListener("online", handleOnline);
    scheduleSync({ immediate: true });

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      window.removeEventListener(
        CLARA_MANUAL_ONLINE_SYNC_REQUEST_EVENT,
        handleManualSync
      );
      SYNC_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, handleDataChange)
      );
      window.removeEventListener("online", handleOnline);
    };
  }, [accountId, authReady, networkOffline, storageMode, syncPaused]);

  const onlineWorkspaceBlocked = Boolean(
    accountId &&
      storageMode === CLARA_STORAGE_MODES.ONLINE_SYNC &&
      (networkOffline || serverUnavailable)
  );

  if (!onlineWorkspaceBlocked) return null;

  const retryConnection = async () => {
    if (retrying) return;
    setRetrying(true);
    setConnectionError("");

    const stillOffline = networkIsOffline();
    setNetworkOffline(stillOffline);

    try {
      if (stillOffline) {
        setConnectionError(
          "This device is still offline. Turn on Wi-Fi or mobile data, then try again."
        );
        return;
      }

      // Reconnect directly through the active finance-sync service. Do not make
      // this button depend on the legacy cloud-vault status endpoint; that endpoint
      // can fail even when the real finance sync service is reachable.
      const result = await syncFinanceForActiveMode({
        user: userRef.current,
        forcePull: true,
      });

      if (result?.state === "synced") {
        setServerUnavailable(false);
        setNetworkOffline(false);
        setConnectionError("");
        resumeOnlineSync();
        return;
      }

      if (result?.needsBootstrap) {
        setServerUnavailable(true);
        setConnectionError(
          "Your Online Sync workspace has not been initialized yet. Open Settings, then Move & Restore Data to choose which data should be saved online."
        );
        return;
      }

      if (result?.offline) {
        setServerUnavailable(true);
        setConnectionError(
          "Your internet is on, but CLARA could not reach the sync server. Please try again."
        );
        return;
      }

      setServerUnavailable(true);
      setConnectionError("CLARA could not verify your online workspace. Please try again.");
    } catch (error) {
      if (
        error?.code === "ONLINE_SYNC_REQUIRES_INTERNET" ||
        networkIsOffline()
      ) {
        setNetworkOffline(true);
        setConnectionError(
          "This device is still offline. Turn on Wi-Fi or mobile data, then try again."
        );
      } else {
        setServerUnavailable(true);
        setConnectionError(
          error?.message ||
            "CLARA could not reach the sync server. Please try again."
        );
      }
    } finally {
      setRetrying(false);
    }
  };

  const gateTitle = networkOffline
    ? "Internet connection required"
    : "CLARA sync server unavailable";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#020817] px-5 text-white">
      <div className="w-full max-w-md rounded-[30px] border border-cyan-300/15 bg-white/[0.055] p-6 text-center shadow-[0_30px_90px_rgba(0,0,0,.55)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
          {networkOffline ? <CloudOff size={28} /> : <Wifi size={28} />}
        </div>
        <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200/70">
          Online Sync Mode
        </p>
        <h1 className="mt-2 text-2xl font-black">{gateTitle}</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/60">
          This CLARA workspace belongs to your online account. Reconnect before
          viewing or changing financial data so every update stays protected and
          consistent across your authorized devices.
        </p>
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-left text-xs font-semibold leading-5 text-white/52">
          No offline financial changes are allowed in Online Sync Mode. Your saved
          online data remains untouched while CLARA is disconnected.
        </div>
        {connectionError ? (
          <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-left text-xs font-semibold leading-5 text-amber-100">
            {connectionError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={retryConnection}
          disabled={retrying}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-55"
        >
          <RefreshCw size={17} className={retrying ? "animate-spin" : ""} />
          {retrying ? "Checking connection..." : "Reconnect and open CLARA"}
        </button>
      </div>
    </div>
  );
}
