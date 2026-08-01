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
  "clara-theme-change",
  "clara-behavioral-memory-updated",
  "clara:debt-obligations-updated",
  "clara:investment-updated",
  "clara:investment-plan-updated",
  "clara:syncable-local-storage-changed",
  CLARA_LIFE_STAGE_UPDATED_EVENT,
];

const MUTATION_PREFLIGHT_HOOK = "__claraPrepareServerFinanceMutation";
const FOREGROUND_SYNC_INTERVAL_MS = 60_000;
const PREFLIGHT_FRESH_MS = 2_500;
const DEVICE_ONLY_STORAGE_KEY_PATTERN = /^clara_daily_check_in_/i;
const SERVER_SYNC_METADATA_PREFIXES = [
  "clara_server_finance_sync_v1:",
  "clara_server_finance_shadow_v1:",
];
const NON_SYNCED_STORAGE_KEYS = new Set([
  "clara_backend_access_token_v1",
  "clara_backend_user_v1",
  "clara_backend_user_verified_at_v1",
  "clara_local_vault_id_v1",
  "clara_active_local_vault_v1",
  "clara_account_vault_directory_v1",
  "clara_sync_device_id_v1",
  "clara_online_sync_paused_after_reset_v1",
  "clara_reset_fresh_local_vault_v1",
]);
const SECRET_STORAGE_KEY_PATTERN =
  /(access[_-]?token|refresh[_-]?token|password|jwt|auth[_-]?session|admin[_-]?session)/i;

function normalizeStorageKey(key) {
  return String(key || "").trim();
}

function isSyncableLocalStorageKey(key) {
  const value = normalizeStorageKey(key);
  if (!value) return false;
  if (NON_SYNCED_STORAGE_KEYS.has(value)) return false;
  if (DEVICE_ONLY_STORAGE_KEY_PATTERN.test(value)) return false;
  if (SECRET_STORAGE_KEY_PATTERN.test(value)) return false;
  return !SERVER_SYNC_METADATA_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function dispatchSyncableStorageChange(key, operation) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("clara:syncable-local-storage-changed", {
      detail: { key: normalizeStorageKey(key) || null, operation },
    })
  );
}

function installLocalStorageMutationBridge() {
  if (
    typeof window === "undefined" ||
    typeof Storage === "undefined" ||
    !window.localStorage
  ) {
    return () => {};
  }

  const prototype = Storage.prototype;
  const originalSetItem = prototype.setItem;
  const originalRemoveItem = prototype.removeItem;
  const originalClear = prototype.clear;

  const patchedSetItem = function patchedSetItem(key, value) {
    const result = originalSetItem.call(this, key, value);
    if (this === window.localStorage && isSyncableLocalStorageKey(key)) {
      dispatchSyncableStorageChange(key, "set");
    }
    return result;
  };

  const patchedRemoveItem = function patchedRemoveItem(key) {
    const shouldNotify =
      this === window.localStorage && isSyncableLocalStorageKey(key);
    const result = originalRemoveItem.call(this, key);
    if (shouldNotify) dispatchSyncableStorageChange(key, "remove");
    return result;
  };

  const patchedClear = function patchedClear() {
    const shouldNotify = this === window.localStorage;
    const result = originalClear.call(this);
    if (shouldNotify) dispatchSyncableStorageChange(null, "clear");
    return result;
  };

  prototype.setItem = patchedSetItem;
  prototype.removeItem = patchedRemoveItem;
  prototype.clear = patchedClear;

  return () => {
    if (prototype.setItem === patchedSetItem) prototype.setItem = originalSetItem;
    if (prototype.removeItem === patchedRemoveItem) {
      prototype.removeItem = originalRemoveItem;
    }
    if (prototype.clear === patchedClear) prototype.clear = originalClear;
  };
}

export default function CloudVaultSyncBridge() {
  const { user, authReady } = useAuth();
  const accountId = getBackendAccountId(user);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const userRef = useRef(user);
  const preflightPromiseRef = useRef(null);
  const lastPreflightAtRef = useRef(0);
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

    const runSync = ({ forcePull = false, resumeAfter = false } = {}) =>
      syncServerFinance({ user: userRef.current, forcePull }).then((result) => {
        if (result?.state === "synced") {
          lastPreflightAtRef.current = Date.now();
          if (resumeAfter) resumeOnlineSync();
        }
        return result;
      });

    const handleManualSync = (event) => {
      if (isApplyingServerFinanceState()) return;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;

      runSync({
        forcePull: Boolean(event?.detail?.forcePull),
        resumeAfter: true,
      }).catch(() => {
        // The Settings control listens for the detailed sync status event.
      });
    };

    window.addEventListener(
      CLARA_MANUAL_ONLINE_SYNC_REQUEST_EVENT,
      handleManualSync
    );

    if (syncPaused) {
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
        runSync({ forcePull }).catch(() => {
          // The storage screen listens for the detailed sync status event.
        });
      }, delay);
    };

    const prepareMutation = async ({ localUserId } = {}) => {
      if (isApplyingServerFinanceState() || isOnlineSyncPaused()) {
        return { skipped: true };
      }

      const activeUser = userRef.current;
      const activeUserId = String(activeUser?.id || "").trim();
      const requestedUserId = String(localUserId || "").trim();
      if (!activeUserId || (requestedUserId && requestedUserId !== activeUserId)) {
        return { skipped: true };
      }

      if (Date.now() - lastPreflightAtRef.current < PREFLIGHT_FRESH_MS) {
        return { fresh: true };
      }

      if (!preflightPromiseRef.current) {
        preflightPromiseRef.current = runSync().finally(() => {
          preflightPromiseRef.current = null;
        });
      }

      return preflightPromiseRef.current;
    };

    const previousMutationHook = window[MUTATION_PREFLIGHT_HOOK];
    window[MUTATION_PREFLIGHT_HOOK] = prepareMutation;

    const handleDataChange = (event) => {
      if (event?.detail?.source === CLARA_SERVER_FINANCE_EVENT_SOURCE) return;
      scheduleSync();
    };
    const handleOnline = () => scheduleSync({ immediate: true });
    const handleFocus = () => scheduleSync({ immediate: true });
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleSync({ immediate: true });
      }
    };
    const handleStorage = (event) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key !== null && !isSyncableLocalStorageKey(event.key)) return;
      scheduleSync();
    };

    const uninstallStorageBridge = installLocalStorageMutationBridge();

    SYNC_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, handleDataChange)
    );
    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    intervalRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        scheduleSync({ immediate: true });
      }
    }, FOREGROUND_SYNC_INTERVAL_MS);

    scheduleSync({ immediate: true });

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      timerRef.current = null;
      intervalRef.current = null;
      preflightPromiseRef.current = null;
      uninstallStorageBridge();

      if (window[MUTATION_PREFLIGHT_HOOK] === prepareMutation) {
        if (typeof previousMutationHook === "function") {
          window[MUTATION_PREFLIGHT_HOOK] = previousMutationHook;
        } else {
          delete window[MUTATION_PREFLIGHT_HOOK];
        }
      }

      window.removeEventListener(
        CLARA_MANUAL_ONLINE_SYNC_REQUEST_EVENT,
        handleManualSync
      );
      SYNC_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, handleDataChange)
      );
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [accountId, authReady, syncPaused]);

  return null;
}
