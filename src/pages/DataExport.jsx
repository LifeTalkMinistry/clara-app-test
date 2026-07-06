import { useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Database, Download, FileJson, Info, ShieldCheck, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  countExportedItems,
  downloadClaraLocalDataExport,
  restoreClaraLocalDataFromFile,
} from "@/lib/local-data-export";

export default function DataExport() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const fileInputRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const handleDownload = async () => {
    try {
      setExporting(true);
      setError("");
      setResult(null);
      const downloadResult = await downloadClaraLocalDataExport({ user, profile });
      setResult({
        fileName: downloadResult.fileName,
        counts: countExportedItems(downloadResult.backup),
      });
    } catch (err) {
      console.error("CLARA data export failed:", err);
      setError(err?.message || "Unable to download CLARA data right now.");
    } finally {
      setExporting(false);
    }
  };

  const handleUploadClick = () => {
    setError("");
    setUploadResult(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const confirmed = window.confirm("Use this CLARA backup file on this device?");
    if (!confirmed) return;

    try {
      setImporting(true);
      setError("");
      const applied = await restoreClaraLocalDataFromFile(file);
      const appliedCount = applied.restored.localStorage.length + applied.restored.sessionStorage.length;
      setUploadResult({ fileName: file.name, appliedCount, note: applied.note });
    } catch (err) {
      console.error("CLARA backup upload failed:", err);
      setError(err?.message || "Unable to upload CLARA backup right now.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto max-w-md px-4 pb-24 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={() => navigate(-1)} className="btn-icon" aria-label="Go back">
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <p className="text-xs tracking-[0.3em] text-emerald-300/70">CLARA TRANSFER</p>
            <h1 className="text-lg font-bold">Backup & Upload</h1>
          </div>

          <div className="h-11 w-11" />
        </div>

        <section className="export-hero">
          <div className="export-glow export-glow-one" />
          <div className="export-glow export-glow-two" />

          <div className="relative z-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">
              <Database size={12} />
              Device transfer backup
            </div>

            <h2 className="text-3xl font-black leading-tight text-white">Move CLARA data between devices.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Download one private backup file, or upload a CLARA backup file from another device.
            </p>

            <button
              type="button"
              onClick={handleDownload}
              disabled={exporting || importing}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-4 text-sm font-black text-slate-950 shadow-[0_16px_45px_rgba(16,185,129,0.24)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={18} />
              {exporting ? "Preparing backup..." : "Download CLARA Backup"}
            </button>

            <button
              type="button"
              onClick={handleUploadClick}
              disabled={exporting || importing}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-5 py-4 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/15 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={18} />
              {importing ? "Uploading backup..." : "Upload CLARA Backup"}
            </button>

            <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileSelected} />
          </div>
        </section>

        {error ? <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">{error}</div> : null}

        {result ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-100">
            <div className="mb-2 flex items-center gap-2 font-bold"><CheckCircle2 size={16} />Backup downloaded</div>
            <p className="break-all text-emerald-50/90">{result.fileName}</p>
            <p className="mt-2 text-emerald-50/80">Exported {result.counts.total} storage group{result.counts.total === 1 ? "" : "s"} from this device.</p>
          </div>
        ) : null}

        {uploadResult ? (
          <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm leading-6 text-cyan-100">
            <div className="mb-2 flex items-center gap-2 font-bold"><CheckCircle2 size={16} />Backup uploaded</div>
            <p className="break-all text-cyan-50/90">{uploadResult.fileName}</p>
            <p className="mt-2 text-cyan-50/80">Applied {uploadResult.appliedCount} local item{uploadResult.appliedCount === 1 ? "" : "s"}.</p>
            <p className="mt-2 text-cyan-50/70">{uploadResult.note}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-3 w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950">Reload CLARA now</button>
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <div className="info-card"><FileJson size={18} /><div><p className="font-semibold text-white">Backup file</p><p className="mt-1 text-sm leading-6 text-slate-400">CLARA data is packed into one JSON file for device transfer.</p></div></div>
          <div className="info-card"><ShieldCheck size={18} /><div><p className="font-semibold text-white">Keep it private</p><p className="mt-1 text-sm leading-6 text-slate-400">The file may contain personal money setup, habits, notes, and local app memory.</p></div></div>
          <div className="info-card"><Info size={18} /><div><p className="font-semibold text-white">After upload</p><p className="mt-1 text-sm leading-6 text-slate-400">Reload CLARA so the dashboard can read the uploaded local data.</p></div></div>
        </div>
      </div>

      <style>{`
        .btn-icon{height:44px;width:44px;display:flex;align-items:center;justify-content:center;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}
        .export-hero{position:relative;overflow:hidden;border-radius:32px;border:1px solid rgba(110,231,183,.16);background:radial-gradient(circle at top left,rgba(16,185,129,.2),transparent 32%),radial-gradient(circle at bottom right,rgba(6,182,212,.18),transparent 32%),linear-gradient(145deg,rgba(4,17,31,.96),rgba(2,8,23,.98));padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.35)}
        .export-glow{position:absolute;border-radius:999px;filter:blur(30px);opacity:.35}
        .export-glow-one{top:-32px;right:-32px;height:120px;width:120px;background:rgba(16,185,129,.45)}
        .export-glow-two{bottom:-40px;left:-40px;height:140px;width:140px;background:rgba(6,182,212,.35)}
        .info-card{display:flex;align-items:flex-start;gap:12px;border-radius:22px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);padding:16px}
        .info-card>svg{margin-top:2px;flex-shrink:0;color:rgb(110,231,183)}
      `}</style>
    </div>
  );
}
