import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Cloud,
  Download,
  Info,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getBackendAccountId } from "@/lib/clara-account-identity";
import {
  CLARA_ONLINE_SYNC_POLICY_EVENT,
  isOnlineSyncPaused,
  resumeOnlineSync,
} from "@/lib/cloud-sync-policy";
import {
  countCloudSnapshotItems,
  downloadClaraPrivateBackup,
  restoreClaraPrivateBackupFile,
} from "@/lib/cloud-vault-snapshot";
import {
  CLARA_SERVER_FINANCE_SYNC_EVENT,
  bootstrapServerFinanceFromThisDevice,
  fetchServerFinanceStatus,
  syncServerFinance,
} from "@/lib/server-finance-sync";

export default function DataExport() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const accountId = getBackendAccountId(user);
  const fileInputRef = useRef(null);
  const [serverStatus, setServerStatus] = useState(null);
  const [syncPaused, setSyncPaused] = useState(() => isOnlineSyncPaused());
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const refreshStatus = async () => {
    if (!accountId) return null;
    const status = await fetchServerFinanceStatus(user);
    setServerStatus(status);
    return status;
  };

  useEffect(() => {
    if (!accountId) return undefined;
    let active = true;

    refreshStatus().catch((statusError) => {
      if (active) setError(statusError?.message || "Unable to check your saved CLARA data.");
    });

    const handleSyncStatus = (event) => {
      if (String(event?.detail?.accountId || "") !== String(accountId)) return;
      setSyncing(event.detail?.state === "syncing");
      if (event.detail?.initialized !== undefined) {
        setServerStatus((current) => ({ ...current, ...event.detail }));
      }
    };
    const handlePolicyChange = (event) => {
      setSyncPaused(Boolean(event?.detail?.paused ?? isOnlineSyncPaused()));
    };

    window.addEventListener(CLARA_SERVER_FINANCE_SYNC_EVENT, handleSyncStatus);
    window.addEventListener(CLARA_ONLINE_SYNC_POLICY_EVENT, handlePolicyChange);

    return () => {
      active = false;
      window.removeEventListener(CLARA_SERVER_FINANCE_SYNC_EVENT, handleSyncStatus);
      window.removeEventListener(CLARA_ONLINE_SYNC_POLICY_EVENT, handlePolicyChange);
    };
  }, [accountId]);

  const handleInitializeDatabase = async () => {
    const confirmed = window.confirm(
      "Save the CLARA data currently on this device? Choose this only on the device with the data you want to keep."
    );
    if (!confirmed) return;

    try {
      setSyncing(true);
      setError("");
      const status = await bootstrapServerFinanceFromThisDevice({ user });
      setServerStatus(status);
      setResult({
        type: "success",
        message: "Your CLARA data is saved and ready to use on another device when you choose.",
      });
    } catch (syncError) {
      if (syncError?.status === 409) {
        await refreshStatus().catch(() => {});
      }
      setError(syncError?.message || "Unable to save your CLARA data right now.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncOnlineData = async () => {
    const currentlyPaused = isOnlineSyncPaused();
    if (
      currentlyPaused &&
      !window.confirm(
        "Bring your saved CLARA data to this device? Your saved copy will replace the financial data currently on this device."
      )
    ) {
      return;
    }

    try {
      setSyncing(true);
      setError("");
      setResult(null);

      const status = await syncServerFinance({ user, forcePull: currentlyPaused });
      setServerStatus((current) => ({ ...current, ...status }));

      if (status?.needsBootstrap) {
        setResult({
          type: "info",
          message: "No saved CLARA data is available yet. Open the device with your correct data and save it first.",
        });
      } else if (status?.offline) {
        setResult({
          type: "info",
          message: "You are offline. This device was left unchanged. Reconnect and try again.",
        });
      } else if (currentlyPaused) {
        resumeOnlineSync();
        setSyncPaused(false);
        setResult({
          type: "success",
          message: "Your saved CLARA data is now on this device.",
          reload: true,
        });
      } else {
        setResult({
          type: "success",
          message: "Your CLARA data is up to date.",
        });
      }
    } catch (syncError) {
      setError(syncError?.message || "Unable to update your CLARA data right now.");
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

    if (serverStatus?.initialized) {
      setError("Restore is unavailable while this device is connected to saved CLARA data.");
      return;
    }

    const confirmed = window.confirm("Restore this backup to this device?");
    if (!confirmed) return;

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
          <p className="text-sm font-bold text-white/80">Using a new device?</p>
          <p className="mt-1 text-xs leading-5 text-white/50">
            Your CLARA data will not appear automatically. You choose when to bring your saved data here.
          </p>
        </div>

        <section className="rounded-[30px] border border-white/12 bg-white/[0.045] p-4 shadow-[0_22px_70px_rgba(0,0,0,.28)]">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-400/12 text-emerald-100">
              <Cloud size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black">Your saved CLARA data</h2>
                {initialized && !syncPaused ? <CheckCircle2 size={18} className="text-emerald-200" /> : null}
              </div>
              {initialized ? (
                syncPaused ? (
                  <>
                    <p className="mt-2 text-sm font-black text-amber-100">Ready when you are</p>
                    <p className="mt-1 text-xs leading-5 text-white/55">
                      Saved CLARA data is available. This device stays as it is until you choose to bring that data here.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm font-black text-emerald-100">Connected</p>
                    <p className="mt-1 text-xs leading-5 text-white/55">
                      This device is connected to your saved CLARA data.
                    </p>
                  </>
                )
              ) : (
                <>
                  <p className="mt-2 text-sm font-black text-white/80">Not saved yet</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">
                    Save the CLARA data on this device so you can bring it to another device later.
                  </p>
                </>
              )}
            </div>
          </div>

          {!initialized ? (
            <button
              type="button"
              onClick={handleInitializeDatabase}
              disabled={syncing}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-55"
            >
              <Cloud size={17} />
              {syncing ? "Saving..." : "Save this device's data"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSyncOnlineData}
              disabled={syncing}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-55"
            >
              <RefreshCw size={17} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Updating..." : syncPaused ? "Bring saved data to this device" : "Sync now"}
            </button>
          )}
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

          <button
            type="button"
            onClick={handleDownload}
            disabled={exporting || importing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-5 py-3.5 text-sm font-black text-emerald-100 disabled:opacity-55"
          >
            <Download size={17} />
            {exporting ? "Preparing backup..." : "Download backup"}
          </button>

          {!initialized ? (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={exporting || importing}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.045] px-5 py-3.5 text-sm font-black text-white/80 disabled:opacity-40"
              >
                <Upload size={17} />
                {importing ? "Restoring..." : "Restore from backup"}
              </button>
              <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileSelected} />
            </>
          ) : null}
        </section>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">{error}</div>
        ) : null}

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
