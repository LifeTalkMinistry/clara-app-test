import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  Info,
  RefreshCw,
  ShieldCheck,
  Upload,
  WifiOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getBackendAccountId } from "@/lib/clara-account-identity";
import {
  countCloudSnapshotItems,
  downloadClaraPrivateBackup,
  restoreClaraPrivateBackupFile,
} from "@/lib/cloud-vault-snapshot";
import {
  CLARA_SERVER_FINANCE_SYNC_EVENT,
  bootstrapServerFinanceFromThisDevice,
  fetchServerFinanceStatus,
  pullServerFinanceToThisDevice,
  syncServerFinance,
} from "@/lib/server-finance-sync";

export default function DataExport() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const accountId = getBackendAccountId(user);
  const fileInputRef = useRef(null);
  const [serverStatus, setServerStatus] = useState(null);
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
      if (active) setError(statusError?.message || "Unable to check account data status.");
    });

    const handleSyncStatus = (event) => {
      if (String(event?.detail?.accountId || "") !== String(accountId)) return;
      setSyncing(event.detail?.state === "syncing");
      if (event.detail?.initialized !== undefined) {
        setServerStatus((current) => ({ ...current, ...event.detail }));
      }
    };
    window.addEventListener(CLARA_SERVER_FINANCE_SYNC_EVENT, handleSyncStatus);

    return () => {
      active = false;
      window.removeEventListener(CLARA_SERVER_FINANCE_SYNC_EVENT, handleSyncStatus);
    };
  }, [accountId]);

  const handleInitializeDatabase = async () => {
    const confirmed = window.confirm(
      "Use the financial data currently on THIS device to initialize your CLARA account database? Do this only on the device that has your correct data."
    );
    if (!confirmed) return;

    try {
      setSyncing(true);
      setError("");
      const status = await bootstrapServerFinanceFromThisDevice({ user });
      setServerStatus(status);
      setResult({
        type: "success",
        message: "Your CLARA account database is now the source of truth. Other devices will download this same data.",
      });
    } catch (syncError) {
      if (syncError?.status === 409) {
        await refreshStatus().catch(() => {});
      }
      setError(syncError?.message || "Unable to initialize your CLARA account data.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncPending = async () => {
    try {
      setSyncing(true);
      setError("");
      const status = await syncServerFinance({ user });
      setServerStatus((current) => ({ ...current, ...status }));
      if (status?.needsBootstrap) {
        setResult({
          type: "info",
          message: "Your account database is not initialized yet. Use the device with your correct CLARA data to initialize it first.",
        });
      } else if (status?.offline) {
        setResult({
          type: "info",
          message: "You are offline. CLARA kept your changes on this device and will send them when internet returns.",
        });
      } else {
        setResult({
          type: "success",
          message: `Account data is current. ${status?.accepted || 0} pending change${status?.accepted === 1 ? " was" : "s were"} accepted by the server.`,
        });
      }
    } catch (syncError) {
      setError(syncError?.message || "Unable to sync account data right now.");
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshThisDevice = async () => {
    const confirmed = window.confirm(
      "Refresh this device from your CLARA account database? The server copy will replace this device's finance cache."
    );
    if (!confirmed) return;

    try {
      setSyncing(true);
      setError("");
      const status = await pullServerFinanceToThisDevice({ user });
      setServerStatus((current) => ({ ...current, ...status }));
      setResult({
        type: "success",
        message: "This device now matches your CLARA account database. Reload CLARA to refresh every screen.",
        reload: true,
      });
    } catch (restoreError) {
      setError(restoreError?.message || "Unable to refresh this device from the account database.");
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
        message: `Private emergency backup downloaded with ${counts.total} account item${counts.total === 1 ? "" : "s"}.`,
        fileName: download.fileName,
      });
    } catch (downloadError) {
      setError(downloadError?.message || "Unable to download your private backup.");
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (serverStatus?.initialized) {
      setError(
        "Your account database is already active. Private backup restore is blocked here so an old file cannot overwrite live account data."
      );
      return;
    }

    const confirmed = window.confirm(
      "Restore this private backup onto this device? After restoring, initialize the account database from this device."
    );
    if (!confirmed) return;

    try {
      setImporting(true);
      setError("");
      const restored = await restoreClaraPrivateBackupFile(file, { user });
      setResult({
        type: "success",
        message: `Restored ${restored.summary?.totalApplied || 0} local item${restored.summary?.totalApplied === 1 ? "" : "s"}. Reload CLARA, verify the data, then initialize the account database from this device.`,
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
            <p className="text-xs tracking-[0.28em] text-emerald-300/70">ACCOUNT DATA</p>
            <h1 className="text-lg font-black">Cloud & Offline</h1>
          </div>
          <div className="h-11 w-11" />
        </div>

        <section className="rounded-[30px] border border-white/12 bg-white/[0.045] p-4 shadow-[0_22px_70px_rgba(0,0,0,.28)]">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-400/12 text-emerald-100">
              <Database size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black">CLARA Account Database</h2>
                {initialized ? <CheckCircle2 size={18} className="text-emerald-200" /> : null}
              </div>
              <p className="mt-1 text-xs leading-5 text-white/55">
                Your PostgreSQL account data is the permanent source of truth. This device keeps an offline working copy only.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs leading-5 text-white/65">
            {initialized ? (
              <>
                <p className="font-black text-emerald-100">Database active</p>
                <p className="mt-1">Revision {serverStatus?.revision || 0}. Any phone signed into this account reads the same financial records.</p>
              </>
            ) : (
              <>
                <p className="font-black text-amber-100">One-time initialization required</p>
                <p className="mt-1">Open the device that currently has the correct CLARA data and make that copy the starting account database.</p>
              </>
            )}
          </div>

          {!initialized ? (
            <button
              type="button"
              onClick={handleInitializeDatabase}
              disabled={syncing}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-55"
            >
              <Cloud size={17} />
              {syncing ? "Initializing account data..." : "Use this device to initialize account data"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSyncPending}
                disabled={syncing}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-55"
              >
                <RefreshCw size={17} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Updating account data..." : "Sync pending offline changes now"}
              </button>

              <button
                type="button"
                onClick={handleRefreshThisDevice}
                disabled={syncing}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.045] px-4 py-3 text-sm font-black text-white/80 disabled:opacity-55"
              >
                <Download size={17} />
                Refresh this device from account database
              </button>
            </>
          )}

          <div className="mt-4 space-y-2 text-[11px] font-semibold text-white/65">
            <p className="flex items-center gap-2"><Check size={13} className="text-emerald-200" />One account database across devices</p>
            <p className="flex items-center gap-2"><WifiOff size={13} className="text-cyan-200" />Offline changes remain local until connection returns</p>
            <p className="flex items-center gap-2"><Check size={13} className="text-emerald-200" />Reconnect sends record changes, not whole-device totals</p>
          </div>
        </section>

        <section className="mt-5 rounded-[28px] border border-white/12 bg-white/[0.035] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] text-emerald-100">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="font-black">Emergency private backup</h2>
              <p className="mt-1 text-xs text-white/48">A manual recovery file. It is no longer the live synchronization system.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={exporting || importing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-5 py-3.5 text-sm font-black text-emerald-100 disabled:opacity-55"
          >
            <Download size={17} />
            {exporting ? "Preparing backup..." : "Download emergency backup"}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={exporting || importing || initialized}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.045] px-5 py-3.5 text-sm font-black text-white/80 disabled:opacity-40"
          >
            <Upload size={17} />
            {importing ? "Restoring backup..." : "Restore backup before database initialization"}
          </button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileSelected} />
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

        <div className="mt-5 info-card">
          <Info size={18} />
          <div>
            <p className="font-semibold text-white">No more device-vs-device merging</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">When internet is available, the backend database decides the account state. Local storage exists so CLARA can continue working temporarily while offline.</p>
          </div>
        </div>
      </div>

      <style>{`
        .btn-icon{height:44px;width:44px;display:flex;align-items:center;justify-content:center;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}
        .info-card{display:flex;align-items:flex-start;gap:12px;border-radius:22px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);padding:16px}
        .info-card>svg{margin-top:2px;flex-shrink:0;color:rgb(110,231,183)}
      `}</style>
    </div>
  );
}
