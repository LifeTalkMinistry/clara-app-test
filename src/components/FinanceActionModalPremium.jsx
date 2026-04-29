import { X } from "lucide-react";

export default function FinanceActionModalPremium({
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
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/70 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl sm:items-center sm:p-4">

      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative flex w-full max-w-lg max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.10),transparent_40%),linear-gradient(135deg,#071120,#03060C)] shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:max-h-[calc(100dvh-2rem)]">

        <form onSubmit={onSubmit} className="flex min-h-0 w-full flex-col">

          <div className="shrink-0 border-b border-white/10 bg-white/[0.03] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {title || "Where will your money live?"}
                </h3>
                {description && (
                  <p className="mt-1 text-sm text-white/65">
                    {description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 pb-6">
            {children}
          </div>

          <div className="shrink-0 border-t border-white/10 bg-[#071120]/95 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75 hover:bg-white/[0.08] transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitDisabled || loading}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98] ${
                  danger
                    ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_10px_30px_rgba(244,63,94,0.25)]"
                    : "bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 shadow-[0_10px_30px_rgba(16,185,129,0.28)]"
                }`}
              >
                {loading ? "Saving..." : submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
