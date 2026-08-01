import { useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  HardDrive,
  Info,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DeviceTransferPanel from "@/components/device-transfer/DeviceTransferPanel";
import {
  countCloudSnapshotItems,
  downloadClaraPrivateBackup,
  restoreClaraPrivateBackupFile,
} from "@/lib/cloud-vault-snapshot";

export default function DataExport() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const fileInputRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleDownload = async () => {
    try {
      setExporting(true);
      setError("");
      setResult(null);
      const download = await downloadClaraPrivateBackup({ user, profile });
      const counts = countCloudSnapshotItems(download.snapshot);
      setResult({
        type: "success",
        message: `Backup downloaded with ${counts.total} item${
          counts.total === 1 ? "" : "s"
        }.`,
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

    const confirmed = window.confirm(
      "Restore this backup on this device? Download a current backup first if you need to preserve the data already here."
    );
    if (!confirmed) return;

    try {
      setImporting(true);
      setError("");
      setResult(null);
      const restored = await restoreClaraPrivateBackupFile(file, { user });
      setResult({
        type: "success",
        message: `Restored ${restored.summary?.totalApplied || 0} item${
          restored.summary?.totalApplied === 1 ? "" : "s"
        }. Reload CLARA to view the restored data.`,
        reload: true,
      });
    } catch (restoreError) {
      setError(restoreError?.message || "Unable to restore this CLARA backup.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto max-w-md px-4 pb-24 pt-4">
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-icon"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-xs tracking-[0.28em] text-emerald-300/70">
              DATA & DEVICES
            </p>
            <h1 className="text-lg font-black">Backup & Transfer</h1>
          </div>
          <div className="h-11 w-11" />
        </div>

        <section className="rounded-[30px] border border-amber-300/20 bg-amber-300/[0.07] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-200/10 text-amber-100">
              <HardDrive size={19} />
            </div>
            <div>
              <h2 className="font-black text-amber-50">No automatic replacement</h2>
              <p className="mt-1 text-xs leading-5 text-amber-50/65">
                CLARA will never replace this device&apos;s financial data simply
                because you signed in somewhere else. A transfer only begins when
                you intentionally start it below.
              </p>
            </div>
          </div>
        </section>

        <DeviceTransferPanel user={user} profile={profile} />

        <section className="mt-5 rounded-[28px] border border-white/12 bg-white/[0.035] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] text-emerald-100">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="font-black">Personal backup file</h2>
              <p className="mt-1 text-xs leading-5 text-white/48">
                Keep your own offline copy before resetting the app or making a
                major change. This remains separate from device transfer.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={exporting || importing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3.5 text-sm font-black text-slate-950 disabled:opacity-55"
          >
            <Download size={17} />
            {exporting ? "Preparing backup..." : "Download backup"}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={exporting || importing}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.045] px-5 py-3.5 text-sm font-black text-white/80 disabled:opacity-40"
          >
            <Upload size={17} />
            {importing ? "Restoring..." : "Restore from backup file"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFileSelected}
          />
        </section>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-100">
            <div className="flex items-start gap-2">
              <Info size={17} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">{result.message}</p>
                {result.fileName ? (
                  <p className="mt-1 break-all text-xs opacity-70">
                    {result.fileName}
                  </p>
                ) : null}
              </div>
            </div>
            {result.reload ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 w-full rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950"
              >
                Reload CLARA now
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <style>{`
        .btn-icon{height:44px;width:44px;display:flex;align-items:center;justify-content:center;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}
      `}</style>
    </div>
  );
}
