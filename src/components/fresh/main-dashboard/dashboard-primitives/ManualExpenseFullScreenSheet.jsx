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
          min-height: 64px;
          border-radius: 24px !important;
          padding: 16px 20px !important;
          background: linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035)) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 38px rgba(0,0,0,0.20);
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_34%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_32%),linear-gradient(180deg,rgba(4,16,24,0.98)_0%,rgba(4,12,22,0.99)_52%,rgba(2,8,16,1)_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/40 to-transparent" />

      <form
        onSubmit={onSubmit}
        className="relative z-10 flex h-[100dvh] min-h-[100dvh] animate-[claraManualExpenseIn_220ms_ease-out] flex-col"
      >
        <div className="shrink-0 border-b border-white/15 bg-[#06111f]/82 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-2xl">
          <div className="mx-auto flex w-full max-w-[520px] items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/85">
                Manual Log
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">Log expense</h2>
              <p className="mt-1.5 text-sm leading-6 text-white/66">
                Connect this expense to your monthly budget list.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-white/78 shadow-[0_12px_30px_rgba(0,0,0,0.24)] transition hover:bg-white/[0.10] hover:text-white active:scale-95"
              aria-label="Close log expense"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-[calc(150px+env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-[520px] space-y-5">
            <div className="relative overflow-visible rounded-[30px] border border-white/15 bg-white/[0.045] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-16 rounded-full bg-emerald-300/8 blur-3xl" />
              <div className="relative space-y-5">{children}</div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/15 bg-[#041018]/96 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-18px_50px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
          <div className="mx-auto grid w-full max-w-[520px] grid-cols-1 gap-3 sm:grid-cols-[0.8fr_1.2fr]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[54px] rounded-2xl border border-white/15 bg-white/[0.045] px-5 py-4 text-sm font-semibold text-white/78 transition hover:bg-white/[0.08] hover:text-white active:scale-[0.99]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitDisabled || loading}
              className="min-h-[56px] rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-5 py-4 text-sm font-bold text-white shadow-[0_14px_34px_rgba(16,185,129,0.28)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99]"
            >
              {loading ? "Saving..." : "Add Expense"}
            </button>
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
