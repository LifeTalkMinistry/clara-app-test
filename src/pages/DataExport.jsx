import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  HardDrive,
  Info,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getBackendAccountId } from "@/lib/clara-account-identity";
import { fetchCloudVaultStatus } from "@/lib/cloud-vault-client";
import {
  countCloudSnapshotItems,
  downloadClaraPrivateBackup,
  restoreClaraPrivateBackupFile,
} from "@/lib/cloud-vault-snapshot";
import {
  CLARA_CLOUD_SYNC_STATUS_EVENT,
  enableClaraLocalOnly,
  enableClaraOnlineSync,
  syncClaraCloudVault,
} from "@/lib/cloud-vault-sync";
import {
  CLARA_STORAGE_MODES,
  getClaraStorageMode,
  saveClaraStorageMode,
} from "@/lib/clara-storage-mode";

export default function DataExport() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const accountId = getBackendAccountId(user);
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState(() => getClaraStorageMode(accountId));
  const [changingMode, setChangingMode] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!accountId) return undefined;
    let active = true;

    fetchCloudVaultStatus()
      .then((status) => {
        if (!active) return;
        const nextMode = saveClaraStorageMode(accountId, status.storageMode);
        setMode(nextMode);
        setCloudStatus(status);
      })
      .catch((statusError) => {
        if (active) setError(statusError?.message || "Unable to check Online Sync.");
      });

    const handleSyncStatus = (event) => {
      if (String(event?.detail?.accountId || "") !== accountId) return;
      setCloudStatus((current) => ({ ...current, ...event.detail }));
      setSyncing(event.detail?.state === "syncing");
    };
    window.addEventListener(CLARA_CLOUD_SYNC_STATUS_EVENT, handleSyncStatus);

    return () => {
      active = false;
      window.removeEventListener(CLARA_CLOUD_SYNC_STATUS_EVENT, handleSyncStatus);
    };
  }, [accountId]);

  const chooseOnlineSync = async () => {
    try {
      setChangingMode(true);
      setError("");
      const status = await enableClaraOnlineSync({ user, profile });
      setMode(CLARA_STORAGE_MODES.ONLINE_SYNC);
      setCloudStatus(status);
      setResult({ type: "success", message: "Online Sync is active. This device is protected." });
    } catch (modeError) {
      setError(modeError?.message || "Unable to enable Online Sync.");
    } finally {
      setChangingMode(false);
    }
  };

  const chooseLocalOnly = async () => {
    const confirmed = window.confirm(
      "Switch to Local Only? CLARA will delete the online copy. Data on this device will stay here, but losing or resetting this device may permanently erase it."
    );
    if (!confirmed) return;

    try {
      setChangingMode(true);
      setError("");
      const status = await enableClaraLocalOnly({ user });
      setMode(CLARA_STORAGE_MODES.LOCAL_ONLY);
      setCloudStatus(status);
      setResult({ type: "success", message: "Local Only is active. No financial records will sync online." });
    } catch (modeError) {
      setError(modeError?.message || "Unable to switch to Local Only.");
    } finally {
      setChangingMode(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      setError("");
      const status = await syncClaraCloudVault({ user, profile, force: true });
      setCloudStatus(status);
      setResult({ type: "success", message: "CLARA finished syncing this device." });
    } catch (syncError) {
      setError(syncError?.message || "Unable to sync CLARA right now.");
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
        message: `Private backup downloaded with ${counts.total} account item${counts.total === 1 ? "" : "s"}.`,
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
    const confirmed = window.confirm(
      "Restore this private CLARA backup into the account currently signed in on this device?"
    );
    if (!confirmed) return;

    try {
      setImporting(true);
      setError("");
      const restored = await restoreClaraPrivateBackupFile(file, { user });
      setResult({
        type: "success",
        message: `Restored ${restored.summary?.totalApplied || 0} local item${restored.summary?.totalApplied === 1 ? "" : "s"}. Reload CLARA to finish.`,
        reload: true,
      });
    } catch (restoreError) {
      setError(restoreError?.message || "Unable to restore this CLARA backup.");
    } finally {
      setImporting(false);
    }
  };

  const isOnline = mode === CLARA_STORAGE_MODES.ONLINE_SYNC;

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto max-w-md px-4 pb-24 pt-4">
        <div className="mb-5 flex items-center justify-between">
          <button type="button" onClick={() => navigate(-1)} className="btn-icon" aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-xs tracking-[0.28em] text-emerald-300/70">ACCOUNT STORAGE</p>
            <h1 className="text-lg font-black">Storage & Transfer</h1>
          </div>
          <div className="h-11 w-11" />
        </div>

        <section className="rounded-[30px] border border-white/12 bg-white/[0.045] p-4 shadow-[0_22px_70px_rgba(0,0,0,.28)]">
          <h2 className="text-xl font-black">Choose how CLARA protects your data</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">
            You can change this later. CLARA always keeps a working copy on this device.
          </p>

          <button
            type="button"
            onClick={chooseOnlineSync}
            disabled={changingMode || isOnline}
            className={`mt-5 w-full rounded-[24px] border p-4 text-left transition ${
              isOnline
                ? "border-emerald-300/45 bg-emerald-400/14 shadow-[0_16px_40px_rgba(16,185,129,.12)]"
                : "border-white/15 bg-white/[0.035] hover:bg-white/[0.065]"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-400/12 text-emerald-100">
                <Cloud size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-black">Online Sync</p>
                  <span className="rounded-full bg-emerald-300 px-2 py-0.5 text-[9px] font-black uppercase text-slate-950">Recommended</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-white/55">
                  Automatic encrypted backup, recovery, and access when you sign in on another device.
                </p>
                <div className="mt-3 space-y-1.5 text-[11px] font-semibold text-white/65">
                  <p className="flex items-center gap-2"><Check size={13} className="text-emerald-200" />Automatic protection</p>
                  <p className="flex items-center gap-2"><Check size={13} className="text-emerald-200" />New-device recovery</p>
                  <p className="flex items-center gap-2"><Check size={13} className="text-emerald-200" />Offline local copy remains</p>
                </div>
              </div>
              {isOnline ? <CheckCircle2 size={20} className="shrink-0 text-emerald-200" /> : null}
            </div>
          </button>

          <button
            type="button"
            onClick={chooseLocalOnly}
            disabled={changingMode || !isOnline}
            className={`mt-3 w-full rounded-[24px] border p-4 text-left transition ${
              !isOnline
                ? "border-cyan-300/35 bg-cyan-400/10"
                : "border-white/15 bg-white/[0.035] hover:bg-white/[0.065]"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
                <HardDrive size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black">Local Only</p>
                <p className="mt-1 text-xs leading-5 text-white/55">
                  Financial records stay only on this device. Losing, resetting, or clearing it may permanently erase them.
                </p>
                <p className="mt-3 text-[11px] font-semibold text-cyan-100/75">
                  Manual private backup and restore remain available below.
                </p>
              </div>
              {!isOnline ? <CheckCircle2 size={20} className="shrink-0 text-cyan-200" /> : null}
            </div>
          </button>

          {isOnline ? (
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncing || changingMode}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-55"
            >
              <RefreshCw size={17} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing CLARA..." : "Sync now"}
            </button>
          ) : null}

          {cloudStatus?.updatedAt && isOnline ? (
            <p className="mt-3 text-center text-[11px] text-white/42">
              Latest protected revision: {cloudStatus.revision || 0} · {new Date(cloudStatus.updatedAt).toLocaleString()}
            </p>
          ) : null}
        </section>

        <section className="mt-5 rounded-[28px] border border-white/12 bg-white/[0.035] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] text-emerald-100">
              <Database size={18} />
            </div>
            <div>
              <h2 className="font-black">Manual private backup</h2>
              <p className="mt-1 text-xs text-white/48">Account-scoped file with no login token or other account’s vault.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={exporting || importing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-5 py-3.5 text-sm font-black text-emerald-100 disabled:opacity-55"
          >
            <Download size={17} />
            {exporting ? "Preparing private backup..." : "Download private backup"}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={exporting || importing}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.045] px-5 py-3.5 text-sm font-black text-white/80 disabled:opacity-55"
          >
            <Upload size={17} />
            {importing ? "Restoring backup..." : "Restore private backup"}
          </button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileSelected} />
        </section>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">{error}</div>
        ) : null}

        {result ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-100">
            <div className="flex items-start gap-2"><CheckCircle2 size={17} className="mt-0.5 shrink-0" /><div><p className="font-bold">{result.message}</p>{result.fileName ? <p className="mt-1 break-all text-xs text-emerald-50/70">{result.fileName}</p> : null}</div></div>
            {result.reload ? <button type="button" onClick={() => window.location.reload()} className="mt-3 w-full rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950">Reload CLARA now</button> : null}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <div className="info-card"><ShieldCheck size={18} /><div><p className="font-semibold text-white">Account isolation</p><p className="mt-1 text-sm leading-6 text-slate-400">Only the signed-in account’s active vault is included in sync and private backups.</p></div></div>
          <div className="info-card"><Info size={18} /><div><p className="font-semibold text-white">Changing modes</p><p className="mt-1 text-sm leading-6 text-slate-400">Switching to Local Only deletes the online snapshot but does not erase this device.</p></div></div>
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
