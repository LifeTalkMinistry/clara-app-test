import { Sparkles, WalletCards, X } from "lucide-react";

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

  const isWalletModal = String(title || "").toLowerCase().includes("wallet");
  const finalTitle = isWalletModal ? "Create wallet" : title;
  const finalDescription = isWalletModal
    ? "Set up a money container for balance, spending, and transfers."
    : description;
  const finalSubmitLabel = isWalletModal ? "Create wallet" : submitLabel;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-hidden bg-black/78 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-2xl sm:items-center sm:p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_34%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.12),transparent_38%),linear-gradient(180deg,rgba(2,6,12,0.25),rgba(2,6,12,0.95))]" />
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-emerald-400/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative flex w-full max-w-lg max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.17),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.11),transparent_40%),linear-gradient(145deg,rgba(7,17,32,0.98),rgba(4,12,22,0.99)_52%,rgba(2,7,14,1))] shadow-[0_28px_90px_rgba(0,0,0,0.62),0_0_45px_rgba(16,185,129,0.12)] backdrop-blur-2xl sm:max-h-[calc(100dvh-2rem)]">
        <form onSubmit={onSubmit} className="flex min-h-0 w-full flex-col">
          <div className="relative shrink-0 border-b border-white/10 bg-white/[0.035] px-5 py-5">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-14 rounded-full bg-emerald-300/10 blur-3xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                {isWalletModal ? (
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.18)]">
                      <WalletCards className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/85">
                        <Sparkles className="h-3 w-3" />
                        Wallet setup
                      </div>
                      <h3 className="mt-2 text-xl font-bold tracking-tight text-white">
                        {finalTitle}
                      </h3>
                    </div>
                  </div>
                ) : (
                  <h3 className="text-xl font-bold tracking-tight text-white">
                    {finalTitle}
                  </h3>
                )}

                {finalDescription ? (
                  <p className="text-sm leading-6 text-white/66">
                    {finalDescription}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/72 shadow-[0_12px_30px_rgba(0,0,0,0.22)] transition hover:bg-white/[0.10] hover:text-white active:scale-95"
                aria-label="Close modal"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-6">
            {isWalletModal ? (
              <div className="mb-4 rounded-[26px] border border-emerald-300/15 bg-gradient-to-br from-emerald-400/[0.10] via-white/[0.045] to-cyan-400/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                      CLARA container
                    </p>
                    <p className="mt-2 text-base font-bold text-white">
                      Ready to organize your money
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/50">
                      Name it, choose the type, then lock in the starting balance.
                    </p>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-emerald-100">
                    <WalletCards className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="relative overflow-visible rounded-[26px] border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_50px_rgba(0,0,0,0.18)]">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-12 rounded-full bg-cyan-300/8 blur-3xl" />
              <div className="relative space-y-4">{children}</div>
            </div>
          </div>

          <div className="shrink-0 border-t border-white/10 bg-[#041018]/94 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-18px_48px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[0.85fr_1.15fr]">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[52px] rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-semibold text-white/72 transition hover:bg-white/[0.08] hover:text-white active:scale-[0.99]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitDisabled || loading}
                className={`min-h-[54px] rounded-2xl px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99] ${
                  danger
                    ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_14px_34px_rgba(244,63,94,0.26)]"
                    : "bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 shadow-[0_14px_34px_rgba(16,185,129,0.30)]"
                }`}
              >
                {loading ? "Saving..." : finalSubmitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
