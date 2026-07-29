import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  HardDrive,
  Info,
  RefreshCw,
  ShieldCheck,
  Upload,
  Wifi,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getBackendAccountId } from "@/lib/clara-account-identity";
import { resumeOnlineSync } from "@/lib/cloud-sync-policy";
import {
  CLARA_STORAGE_MODE_EVENT,
  CLARA_STORAGE_MODES,
  getClaraStorageMode,
} from "@/lib/clara-storage-mode";
import { clearClaraDeviceData } from "@/lib/clear-clara-device-data";
import {
  countCloudSnapshotItems,
  downloadClaraPrivateBackup,
  restoreClaraPrivateBackupFile,
} from "@/lib/cloud-vault-snapshot";
import { fetchServerFinanceStatus } from "@/lib/server-finance-sync";
import {
  bootstrapFinanceForOnlineMode,
  enableStrictDeviceOnlyMode,
  enableStrictOnlineSyncMode,
  refreshClaraStorageModeFromServer,
  syncFinanceForActiveMode,
} from "@/lib/strict-storage-mode-policy";

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export default function DataExport() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const accountId = getBackendAccountId(user);
  const fileInputRef = useRef(null);
  const [serverStatus, setServerStatus] = useState(null);
  const [storageMode, setStorageMode] = useState(() =>
    accountId
      ? getClaraStorageMode(accountId)
      : CLARA_STORAGE_MODES.LOCAL_ONLY
  );
  const [networkOffline, setNetworkOffline] = useState(() => isOffline());
  const [syncing, setSyncing] = useState(false);
  const [changingMode, setChangingMode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const refreshStatus = async () => {
    if (!accountId || isOffline()) return null;
    const status = await fetchServerFinanceStatus(user);
    setServerStatus(status);
    return status;
  };

  useEffect(() => {
    setStorageMode(
      accountId
        ? getClaraStorageMode(accountId)
        : CLARA_STORAGE_MODES.LOCAL_ONLY
    );
  }, [accountId]);

  useEffect(() => {
    if (!accountId) return undefined;
    let active = true;

    const loadModeAndStatus = async () => {
      if (isOffline()) return;
      try {
        const mode = await refreshClaraStorageModeFromServer(user);
        if (active) setStorageMode(mode);
      } catch {
        // Keep the last account-scoped choice when the server cannot be reached.
      }

      try {
        const status = await fetchServerFinanceStatus(user);
        if (active) setServerStatus(status);
      } catch (statusError) {
        if (active && storageMode === CLARA_STORAGE_MODES.ONLINE_SYNC) {
          setError(statusError?.message || "Unable to check your saved CLARA data.");
        }
      }
    };

    loadModeAndStatus();

    const handleStorageMode = (event) => {
      const eventAccountId = String(event?.detail?.accountId || "");
      if (eventAccountId && eventAccountId !== String(accountId)) return;
      setStorageMode(event?.detail?.mode || getClaraStorageMode(accountId));
    };
    const handleOnline = () => {
      setNetworkOffline(false);
      loadModeAndStatus();
    };
    const handleOffline = () => setNetworkOffline(true);

    window.addEventListener(CLARA_STORAGE_MODE_EVENT, handleStorageMode);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      active = false;
      window.removeEventListener(CLARA_STORAGE_MODE_EVENT, handleStorageMode);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [accountId, storageMode, user]);

  const handleEnableOnlineSync = async () => {
    if (networkOffline) {
      setError("Reconnect before enabling Online Sync.");
      return;
    }

    const initialized = Boolean(serverStatus?.initialized);
    const confirmation = initialized
      ? "Enable Online Sync and bring saved data to this device? Current financial data on this device will be replaced by the protected online copy. CLARA will require internet access after this."
      : "Enable Online Sync using this device's current CLARA data? This will save this device's data to your account. CLARA will require internet access after this.";

    if (!window.confirm(confirmation)) return;

    try {
      setChangingMode(true);
      setError("");
      setResult(null);

      await enableStrictOnlineSyncMode(user);
      setStorageMode(CLARA_STORAGE_MODES.ONLINE_SYNC);

      let status;
      if (initialized) {
        status = await syncFinanceForActiveMode({ user, forcePull: true });
      } else {
        try {
          status = await bootstrapFinanceForOnlineMode({ user });
        } catch (bootstrapError) {
          if (bootstrapError?.status !== 409) throw bootstrapError;
          await refreshStatus();
          status = await syncFinanceForActiveMode({ user, forcePull: true });
        }
      }

      setServerStatus((current) => ({ ...current, ...status, initialized: true }));
      resumeOnlineSync();
      setResult({
        type: "success",
        message: initialized
          ? "Online Sync is active. Your saved online data is now on this device."
          : "Online Sync is active. This device's CLARA data is now protected in your account.",
        reload: true,
      });
    } catch (modeError) {
      setError(modeError?.message || "Unable to enable Online Sync right now.");
    } finally {
      setChangingMode(false);
    }
  };

  const handleSwitchToDeviceOnly = async () => {
    if (networkOffline) {
      setError("Reconnect before switching this account to Device-Only Mode.");
      return;
    }

    const confirmed = window.confirm(
      "Switch to Device-Only Mode? Your protected online data will remain saved in your account, but this phone will be cleared and start a new empty local workspace. You will be logged out, and the two workspaces will never merge automatically."
    );
    if (!confirmed) return;

    try {
      setChangingMode(true);
      setError("");
      await enableStrictDeviceOnlyMode(user);
      await clearClaraDeviceData();
      window.location.reload();
    } catch (modeError) {
      setError(modeError?.message || "Unable to switch to Device-Only Mode.");
      setChangingMode(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      setError("");
      setResult(null);
      const status = await syncFinanceForActiveMode({ user, forcePull: true });
      setServerStatus((current) => ({ ...current, ...status }));
      setResult({ type: "success", message: "Your online CLARA data is up to date." });
    } catch (syncError) {
      setError(syncError?.message || "Unable to sync your CLARA data right now.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDownload = async () => {
    try {
      setExporting(true);
      setError("");
      const download = await downloadClaraPrivateBackup({ user, profile });
      const counts = countCloudSnapshotItems(download.snapshot);
      setResult({
        type: "success",
        message: `Backup downloaded with ${counts.total} item${counts.total === 1 ? "" : "s"}.`,
        fileName: download.fileName,
      });
    } catch (downloadError) {
      setError(downloadError?.message || "Unable to download your backup.");
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (storageMode === CLARA_STORAGE_MODES.ONLINE_SYNC) {
      setError("Restore from backup is available only in Device-Only Mode.");
      return;
    }

    if (!window.confirm("Restore this backup to this device-only workspace?")) return;

    try {
      setImporting(true);
      setError("");
      const restored = await restoreClaraPrivateBackupFile(file, { user });
      setResult({
        type: "success",
        message: `Restored ${restored.summary?.totalApplied || 0} item${restored.summary?.totalApplied === 1 ? "" : "s"}. Reload CLARA to see your restored data.`,
        reload: true,
      });
    } catch (restoreError) {
      setError(restoreError?.message || "Unable to restore this CLARA backup.");
    } finally {
      setImporting(false);
    }
  };

  const onlineSyncActive = storageMode === CLARA_STORAGE_MODES.ONLINE_SYNC;
  const initialized = Boolean(serverStatus?.initialized);

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto max-w-md px-4 pb-24 pt-4">
        <div className="mb-5 flex items-center justify-between">
          <button type="button" onClick={() => navigate(-1)} className="btn-icon" aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-xs tracking-[0.28em] text-emerald-300/70">SECURITY & PRIVACY</p>
            <h1 className="text-lg font-black">Move & Restore Data</h1>
          </div>
          <div className="h-11 w-11" />
        </div>

        <div className="mb-5 px-1 text-center">
          <p className="text-sm font-bold text-white/80">Choose where your CLARA data belongs</p>
          <p className="mt-1 text-xs leading-5 text-white/50">
            Device-Only data belongs to this phone. Online Sync data belongs to your account. CLARA never merges the two automatically.
          </p>
        </div>

        <section className={`rounded-[30px] border p-4 shadow-[0_22px_70px_rgba(0,0,0,.28)] ${!onlineSyncActive ? "border-emerald-300/25 bg-emerald-400/[0.07]" : "border-white/12 bg-white/[0.035]"}`}>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-100">
              <HardDrive size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black">Device-Only Mode</h2>
                {!onlineSyncActive ? <CheckCircle2 size={18} className="text-emerald-200" /> : null}
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/58">
                Use CLARA with or without internet. Financial data stays exclusively on this device and never uploads automatically.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-xs font-semibold text-white/60">
            {["Works online and offline", "Every device has separate data", "Backup and restore remain manual"].map((item) => (
              <div key={item} className="flex items-center gap-2"><Check size={14} className="text-emerald-200" />{item}</div>
            ))}
          </div>
          {onlineSyncActive ? (
            <button type="button" onClick={handleSwitchToDeviceOnly} disabled={changingMode} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-100 disabled:opacity-55">
              <CloudOff size={17} />
              {changingMode ? "Switching..." : "Switch to Device-Only"}
            </button>
          ) : null}
        </section>

        <section className={`mt-4 rounded-[30px] border p-4 shadow-[0_22px_70px_rgba(0,0,0,.28)] ${onlineSyncActive ? "border-cyan-300/25 bg-cyan-400/[0.07]" : "border-white/12 bg-white/[0.035]"}`}>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
              <Cloud size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black">Online Sync Mode</h2>
                {onlineSyncActive ? <CheckCircle2 size={18} className="text-cyan-200" /> : null}
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/58">
                Your saved CLARA data belongs to your account and can be used on authorized devices. Internet is required to open or change financial data.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-xs font-semibold text-white/60">
            {["Same protected data on authorized devices", "No offline financial changes", "Disconnected workspace is fully blocked"].map((item) => (
              <div key={item} className="flex items-center gap-2"><Check size={14} className="text-cyan-200" />{item}</div>
            ))}
          </div>

          {!onlineSyncActive ? (
            <button type="button" onClick={handleEnableOnlineSync} disabled={changingMode || networkOffline} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-55">
              <Wifi size={17} />
              {changingMode ? "Enabling..." : initialized ? "Bring saved data to this device" : "Save this device's data online"}
            </button>
          ) : (
            <button type="button" onClick={handleSyncNow} disabled={syncing || networkOffline} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-55">
              <RefreshCw size={17} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing..." : "Sync now"}
            </button>
          )}

          {networkOffline ? (
            <p className="mt-3 text-center text-xs font-bold text-amber-200">Ready when you are—reconnect to change or use Online Sync.</p>
          ) : null}
        </section>

        <section className="mt-5 rounded-[28px] border border-white/12 bg-white/[0.035] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] text-emerald-100">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="font-black">Backup</h2>
              <p className="mt-1 text-xs text-white/48">Keep a personal backup of your CLARA data for safekeeping.</p>
            </div>
          </div>

          <button type="button" onClick={handleDownload} disabled={exporting || importing} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-5 py-3.5 text-sm font-black text-emerald-100 disabled:opacity-55">
            <Download size={17} />
            {exporting ? "Preparing backup..." : "Download backup"}
          </button>

          {!onlineSyncActive ? (
            <>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={exporting || importing} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.045] px-5 py-3.5 text-sm font-black text-white/80 disabled:opacity-40">
                <Upload size={17} />
                {importing ? "Restoring..." : "Restore from backup"}
              </button>
              <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileSelected} />
            </>
          ) : (
            <p className="mt-3 text-center text-[11px] leading-5 text-white/40">Restore is disabled while Online Sync owns this workspace.</p>
          )}
        </section>

        {error ? <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">{error}</div> : null}

        {result ? (
          <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${result.type === "info" ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-100" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"}`}>
            <div className="flex items-start gap-2"><Info size={17} className="mt-0.5 shrink-0" /><div><p className="font-bold">{result.message}</p>{result.fileName ? <p className="mt-1 break-all text-xs opacity-70">{result.fileName}</p> : null}</div></div>
            {result.reload ? <button type="button" onClick={() => window.location.reload()} className="mt-3 w-full rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950">Reload CLARA now</button> : null}
          </div>
        ) : null}
      </div>

      <style>{`
        .btn-icon{height:44px;width:44px;display:flex;align-items:center;justify-content:center;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}
      `}</style>
    </div>
  );
}
