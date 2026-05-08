import { X } from "lucide-react";

export default function FinanceActionModal({
  open,
  title,
  description,
  children,
  onClose,
  onSubmit,
  submitLabel = "Save",
  submitDisabled = false,
  loading = false,
  danger = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/28 px-3 pb-3 pt-[max(4.5rem,env(safe-area-inset-top))] backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="flex w-full max-w-[380px] max-h-[72dvh] overflow-hidden rounded-[30px] border border-cyan-100/15 bg-[linear-gradient(135deg,rgba(5,44,62,0.97),rgba(7,20,48,0.98)_48%,rgba(38,16,77,0.98))] shadow-[0_20px_55px_rgba(0,0,0,0.45),0_0_28px_rgba(0,255,220,0.08)]">
        <form onSubmit={onSubmit} className="flex min-h-0 w-full flex-col">
          <div className="shrink-0 border-b border-white/10 bg-white/[0.03] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-[26px] font-black tracking-[-0.03em] text-white">
                  {title}
                </h3>

                {description ? (
                  <p className="mt-1 text-sm leading-6 text-white/60">
                    {description}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-white/15 bg-white/[0.075] p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 pb-4 [scrollbar-width:thin]">
            {children}
          </div>

          <div className="shrink-0 border-t border-white/10 bg-[#071120]/90 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
            <div className="flex flex-col-reverse gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-white/15 bg-white/[0.075] px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/[0.08] hover:text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitDisabled || loading}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-55 ${
                  danger
                    ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_10px_30px_rgba(244,63,94,0.24)]"
                    : submitDisabled
                      ? "border border-white/15 bg-white/[0.09] text-white/55 shadow-none"
                      : "bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 shadow-[0_10px_30px_rgba(16,185,129,0.24)]"
                }`}
              >
                {loading ? "Saving..." : submitDisabled ? "Insufficient Funds" : submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
