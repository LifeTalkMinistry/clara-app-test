import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function ManualExpenseFullScreenSheet({
  open,
  children,
  onClose,
  onSubmit,
  submitDisabled = false,
  loading = false,
}) {
  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [open]);

  if (!open) return null;

  const sheet = (
    <div className="clara-manual-expense-sheet fixed inset-0 z-[160] min-h-[100dvh] overflow-hidden bg-[#030c16] text-white">
      <style>{`
        .clara-manual-expense-sheet {
          min-height: 100dvh;
          padding-bottom: env(safe-area-inset-bottom);
        }

        .clara-manual-expense-sheet input,
        .clara-manual-expense-sheet textarea,
        .clara-manual-expense-sheet select {
          font-size: 16px;
        }

        .clara-manual-expense-sheet label {
          gap: 0.55rem;
        }

        .clara-manual-expense-sheet label > span {
          font-size: 12px !important;
          font-weight: 850 !important;
          letter-spacing: 0.02em !important;
          color: rgba(255,255,255,0.74) !important;
        }

        .clara-manual-expense-sheet input,
        .clara-manual-expense-sheet textarea {
          min-height: 56px !important;
          border-radius: 20px !important;
          border-color: rgba(255,255,255,0.12) !important;
          background: rgba(255,255,255,0.055) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 26px rgba(0,0,0,0.18) !important;
        }

        .clara-manual-expense-sheet [aria-haspopup="listbox"] {
          min-height: 58px;
          border-radius: 20px !important;
          padding: 13px 16px !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          background: rgba(255,255,255,0.055) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 26px rgba(0,0,0,0.18) !important;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(20,184,166,0.26),transparent_38%),radial-gradient(circle_at_100%_8%,rgba(124,58,237,0.20),transparent_38%),linear-gradient(180deg,rgba(4,18,30,0.98)_0%,rgba(3,10,22,1)_100%)]" />
      <div className="pointer-events-none absolute -left-28 top-10 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-24 h-80 w-80 rounded-full bg-violet-400/12 blur-3xl" />

      <form
        onSubmit={onSubmit}
        className="relative z-10 mx-auto flex h-[100dvh] min-h-[100dvh] w-full max-w-[430px] animate-[claraManualExpenseIn_180ms_ease-out] flex-col px-4"
      >
        <div className="shrink-0 px-1 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)]">
          <div className="flex items-start justify-between gap-4 rounded-[28px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_20px_64px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center rounded-full border border-emerald-200/16 bg-emerald-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/82">
                Manual Log
              </div>
              <h2 className="mt-2 text-[21px] font-black tracking-tight text-white">
                Log expense
              </h2>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-white/58">
                Amount, budget, and wallet — clean and simple.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] text-white/72 shadow-[0_12px_28px_rgba(0,0,0,0.22)] transition hover:bg-white/[0.10] hover:text-white active:scale-95"
              aria-label="Close log expense"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-[calc(118px+env(safe-area-inset-bottom))] pt-1.5">
          <div className="relative overflow-visible rounded-[28px] border border-white/12 bg-white/[0.045] p-4 shadow-[0_18px_54px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-x-10 top-0 h-14 rounded-full bg-emerald-300/8 blur-3xl" />
            <div className="relative space-y-4">{children}</div>
          </div>
        </div>

        <div className="shrink-0 px-1 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2.5">
          <div className="rounded-[26px] border border-white/10 bg-[#06101d]/88 p-3 shadow-[0_-12px_44px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
            {submitDisabled && !loading ? (
              <p className="mb-2 text-center text-[11px] font-semibold leading-5 text-white/42">
                Complete the amount, budget list, and wallet.
              </p>
            ) : null}

            <div className="grid grid-cols-[0.8fr_1.2fr] gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[48px] rounded-[18px] border border-white/12 bg-white/[0.045] px-4 py-3 text-sm font-bold text-white/72 transition hover:bg-white/[0.08] hover:text-white active:scale-[0.99]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitDisabled || loading}
                className="min-h-[48px] rounded-[18px] bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-4 py-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(16,185,129,0.24)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.99]"
              >
                {loading ? "Saving..." : "Add Expense"}
              </button>
            </div>
          </div>
        </div>
      </form>

      <style>{`
        @keyframes claraManualExpenseIn {
          0% {
            opacity: 0;
            transform: translate3d(0, 10px, 0) scale(0.99);
            filter: blur(2px);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
            filter: blur(0);
          }
        }
      `}</style>
    </div>
  );

  if (typeof document === "undefined") return sheet;
  return createPortal(sheet, document.body);
}
