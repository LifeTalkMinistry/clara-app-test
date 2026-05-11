import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X } from "lucide-react";

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
    <div className="clara-manual-expense-sheet fixed inset-0 z-[160] min-h-[100dvh] overflow-hidden bg-[#041018] text-white">
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

        .clara-manual-expense-sheet [aria-haspopup="listbox"] {
          min-height: 60px;
          border-radius: 22px !important;
          padding: 14px 18px !important;
          background: linear-gradient(135deg, rgba(255,255,255,0.078), rgba(255,255,255,0.034)) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 32px rgba(0,0,0,0.20);
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.24),transparent_34%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_34%),linear-gradient(180deg,rgba(4,16,24,0.98)_0%,rgba(4,12,22,0.99)_54%,rgba(2,8,16,1)_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-28 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/40 to-transparent" />

      <form
        onSubmit={onSubmit}
        className="relative z-10 flex h-[100dvh] min-h-[100dvh] animate-[claraManualExpenseIn_220ms_ease-out] flex-col"
      >
        <div className="shrink-0 border-b border-white/12 bg-[#06111f]/86 px-5 pb-3.5 pt-[calc(env(safe-area-inset-top)+0.85rem)] backdrop-blur-2xl">
          <div className="mx-auto flex w-full max-w-[520px] items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/85">
                Manual Log
              </div>
              <h2 className="mt-2.5 text-[22px] font-black tracking-tight text-white">Log expense</h2>
              <p className="mt-1 text-sm leading-5 text-white/66">
                Add the amount, budget list, and wallet in one clean flow.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-white/78 shadow-[0_12px_30px_rgba(0,0,0,0.24)] transition hover:bg-white/[0.10] hover:text-white active:scale-95"
              aria-label="Close log expense"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-[calc(132px+env(safe-area-inset-bottom))]">
          <div className="mx-auto flex w-full max-w-[520px] flex-col gap-3.5">
            <div className="relative overflow-visible rounded-[28px] border border-white/15 bg-white/[0.047] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-16 rounded-full bg-emerald-300/8 blur-3xl" />
              <div className="relative space-y-4">{children}</div>
            </div>

            <div className="rounded-[24px] border border-cyan-200/12 bg-white/[0.035] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-200/18 bg-cyan-300/10 text-cyan-100">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-50/72">
                    Before saving
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-white/56">
                    CLARA will connect this spending to your monthly plan so your history stays easy to review later.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/12 bg-[#041018]/96 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3.5 shadow-[0_-18px_50px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
          <div className="mx-auto w-full max-w-[520px]">
            {submitDisabled && !loading ? (
              <p className="mb-2.5 text-center text-[11px] font-semibold leading-5 text-white/45">
                Complete the amount, budget list, and wallet to activate Add Expense.
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[0.8fr_1.2fr]">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[50px] rounded-2xl border border-white/15 bg-white/[0.045] px-5 py-3.5 text-sm font-semibold text-white/78 transition hover:bg-white/[0.08] hover:text-white active:scale-[0.99]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitDisabled || loading}
                className="min-h-[52px] rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-5 py-3.5 text-sm font-black text-white shadow-[0_14px_34px_rgba(16,185,129,0.28)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
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
            transform: translate3d(0, 14px, 0) scale(0.985);
            filter: blur(3px);
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
