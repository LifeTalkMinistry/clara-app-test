import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, ShieldCheck, Trash2, X } from "lucide-react";
import { clearClaraDataKeepAccount } from "@/lib/clear-clara-device-data";

const CONFIRMATION_WORD = "CLEAR";

function restartAtOnboarding() {
  if (typeof window === "undefined") return;
  const nextUrl = `${window.location.pathname}${window.location.search}#/onboarding`;
  window.history.replaceState(null, "", nextUrl);
  window.location.reload();
}

export default function ClaraDataResetPanel() {
  const inputRef = useRef(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState("");

  const confirmationMatches =
    confirmation.trim().toUpperCase() === CONFIRMATION_WORD;

  useEffect(() => {
    if (!isConfirming) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => inputRef.current?.focus(), 40);

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isClearing) {
        setIsConfirming(false);
        setConfirmation("");
        setError("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isConfirming, isClearing]);

  const openConfirmation = () => {
    setConfirmation("");
    setError("");
    setIsConfirming(true);
  };

  const closeConfirmation = () => {
    if (isClearing) return;
    setIsConfirming(false);
    setConfirmation("");
    setError("");
  };

  const handleClearEverything = async () => {
    if (!confirmationMatches || isClearing) return;

    setIsClearing(true);
    setError("");

    try {
      await clearClaraDataKeepAccount();
      restartAtOnboarding();
    } catch (resetError) {
      console.error("[CLARA Data Reset] Could not complete data reset.", resetError);
      setError(
        "CLARA could not fully clear your local data. Your account was not deleted. Please try again."
      );
      setIsClearing(false);
    }
  };

  return (
    <>
      <section className="mt-5 rounded-[26px] border border-rose-300/18 bg-rose-400/[0.035] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-400/10 text-rose-100">
            <Trash2 size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-200/60">
              Danger zone
            </p>
            <h2 className="mt-1 text-sm font-black text-rose-50">
              Clear all CLARA data
            </h2>
            <p className="mt-1.5 text-xs font-semibold leading-5 text-white/52">
              Start over on this device without deleting your CLARA account or membership.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openConfirmation}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-300/24 bg-rose-500/10 px-4 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-500/15 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/45"
        >
          <Trash2 size={16} />
          Clear Data
        </button>
        <p className="mt-2 px-1 text-[10px] font-semibold leading-4 text-white/36">
          Removes local financial records, setup, history, preferences, transfer recovery, and device notifications.
        </p>
      </section>

      {isConfirming ? (
        <div
          className="fixed inset-0 z-[260] flex items-end justify-center bg-[#020713]/88 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeConfirmation();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clara-clear-data-title"
            aria-describedby="clara-clear-data-description"
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[30px] border border-rose-300/20 bg-[#081321] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.62)] sm:rounded-[30px]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rose-300/25 bg-rose-400/10 text-rose-100">
                <AlertTriangle size={21} />
              </div>
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={isClearing}
                aria-label="Cancel clearing CLARA data"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-35"
              >
                <X size={17} />
              </button>
            </div>

            <h2
              id="clara-clear-data-title"
              className="mt-4 text-xl font-black tracking-tight text-white"
            >
              Start fresh with CLARA?
            </h2>
            <p
              id="clara-clear-data-description"
              className="mt-2 text-sm font-semibold leading-6 text-white/62"
            >
              This permanently removes CLARA data stored on this device and returns the app to first-time setup.
            </p>

            <div className="mt-4 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.08] px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-100">
                <ShieldCheck size={15} />
                Your account and membership stay active
              </div>
              <p className="mt-1.5 text-[11px] font-semibold leading-5 text-emerald-50/55">
                This does not delete your CLARA account or subscription. Any separate online backup is not deleted and will not automatically restore after the reset.
              </p>
            </div>

            <div className="mt-3 rounded-2xl border border-amber-300/18 bg-amber-400/[0.07] px-4 py-3">
              <p className="text-xs font-black text-amber-100">
                Local data cannot be recovered after this reset.
              </p>
              <p className="mt-1.5 text-[11px] font-semibold leading-5 text-amber-50/55">
                Transfer or back up anything you still need before continuing.
              </p>
            </div>

            <label className="mt-5 block">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
                Type CLEAR to continue
              </span>
              <input
                ref={inputRef}
                type="text"
                value={confirmation}
                onChange={(event) => {
                  setConfirmation(event.target.value);
                  setError("");
                }}
                disabled={isClearing}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="CLEAR"
                className="mt-2 w-full rounded-2xl border border-white/14 bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white outline-none placeholder:text-white/18 focus:border-rose-300/40 disabled:opacity-45"
              />
            </label>

            {error ? (
              <p className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-3 py-2.5 text-xs font-bold leading-5 text-rose-100">
                {error}
              </p>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={isClearing}
                className="min-h-12 rounded-2xl border border-white/14 bg-white/[0.05] px-4 py-3 text-sm font-black text-white/68 transition hover:bg-white/[0.08] active:scale-[0.99] disabled:opacity-35"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearEverything}
                disabled={!confirmationMatches || isClearing}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-rose-300/25 bg-rose-500/16 px-4 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-500/22 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35"
              >
                {isClearing ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {isClearing ? "Clearing..." : "Clear Everything"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
