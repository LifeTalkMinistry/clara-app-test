import { createPortal } from "react-dom";
import { Check, ShieldCheck, X } from "lucide-react";
import {
  fmt,
  toNumber,
  walletIcons,
  walletTypes,
} from "../logic/useWalletCardLogic";

const walletTypeDetails = {
  cash: {
    label: "Cash",
    helper: "Physical money",
    glow: "rgba(16,185,129,0.26)",
  },
  bank: {
    label: "Bank",
    helper: "Payroll or savings bank",
    glow: "rgba(34,211,238,0.24)",
  },
  ewallet: {
    label: "E-wallet",
    helper: "GCash, Maya, digital funds",
    glow: "rgba(56,189,248,0.24)",
  },
  savings: {
    label: "Savings",
    helper: "Reserved or protected money",
    glow: "rgba(52,211,153,0.24)",
  },
  credit: {
    label: "Credit",
    helper: "Borrowed spending line",
    glow: "rgba(251,113,133,0.2)",
  },
  investment: {
    label: "Investment",
    helper: "Growth-focused funds",
    glow: "rgba(168,85,247,0.22)",
  },
  custom: {
    label: "Custom",
    helper: "Personal money container",
    glow: "rgba(125,211,252,0.2)",
  },
};

function getWalletTypeDetail(type) {
  return walletTypeDetails[type] || walletTypeDetails.custom;
}

export default function EditWalletModal({
  editingWallet,
  editForm,
  setEditForm,
  isSavingWalletEdit,
  closeEditWallet,
  handleSaveWalletEdit,
}) {
  if (!editingWallet) return null;

  const currentType = editForm.type || "cash";
  const currentTypeDetail = getWalletTypeDetail(currentType);
  const currentIcon = walletIcons[currentType] || "💰";
  const currentName = editForm.name.trim() || editingWallet?.name || "Untitled wallet";
  const currentBalance = fmt(toNumber(editingWallet?.balance));

  const modalContent = (
    <div className="fixed inset-0 z-[2147483647] flex h-[100dvh] w-screen justify-center overflow-hidden bg-black/82 text-white backdrop-blur-xl">
      <div className="relative flex h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none border-0 border-cyan-100/[0.14] bg-[linear-gradient(145deg,rgba(4,14,34,0.99),rgba(5,32,47,0.985)_42%,rgba(24,18,58,0.98)_100%)] text-white shadow-[0_30px_90px_rgba(0,0,0,0.72),0_0_50px_rgba(34,211,238,0.11),0_0_70px_rgba(16,185,129,0.08)] sm:my-5 sm:h-[calc(100dvh-40px)] sm:max-w-md sm:rounded-[32px] sm:border">
        <div className="pointer-events-none absolute -left-24 -top-28 h-60 w-60 rounded-full bg-cyan-300/[0.12] blur-[74px]" />
        <div className="pointer-events-none absolute -right-24 top-20 h-64 w-64 rounded-full bg-emerald-300/[0.09] blur-[82px]" />
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_34%,rgba(0,0,0,0.15))]" />

        <div className="relative shrink-0 border-b border-white/[0.08] px-5 pb-4 pt-[calc(env(safe-area-inset-top)+24px)] sm:pt-6">
          <button
            type="button"
            onClick={closeEditWallet}
            disabled={isSavingWalletEdit}
            className="absolute right-4 top-[calc(env(safe-area-inset-top)+16px)] flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.10] hover:text-white disabled:opacity-50 sm:top-5"
            aria-label="Close edit wallet"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="pr-12">
            <h3 className="text-[24px] font-black tracking-[-0.04em] text-white">
              Edit wallet
            </h3>
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto px-5 py-5 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-5">
            <div
              className="relative overflow-hidden rounded-[28px] border border-cyan-100/[0.14] bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(255,255,255,0.055)_42%,rgba(16,185,129,0.10))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_38px_rgba(0,0,0,0.22)]"
              style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 38px rgba(0,0,0,0.22), 0 0 34px ${currentTypeDetail.glow}` }}
            >
              <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/[0.08] blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3.5">
                  <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[20px] border border-white/15 bg-white/[0.10] text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_24px_rgba(0,0,0,0.20)]">
                    {currentIcon}
                  </div>

                  <div className="min-w-0 pt-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-50/55">
                      Current wallet
                    </p>
                    <p className="mt-1.5 truncate text-lg font-black tracking-[-0.03em] text-white">
                      {currentName}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-white/70">
                        {currentTypeDetail.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">
                    Balance
                  </p>
                  <p className="mt-1 text-[15px] font-black tracking-[-0.025em] text-emerald-100">
                    {currentBalance}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
                Wallet name
              </p>
              <input
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="e.g. BDO Wallet, GCash, Cash"
                className="h-[52px] w-full rounded-[22px] border border-white/[0.12] bg-white/[0.065] px-4 text-[15px] font-bold tracking-[-0.01em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] outline-none placeholder:text-white/32 focus:border-cyan-200/45 focus:bg-white/[0.085] focus:ring-2 focus:ring-cyan-300/15"
              />
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
                Wallet type
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {walletTypes.map((type) => {
                  const details = getWalletTypeDetail(type);
                  const selected = currentType === type;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, type }))}
                      className={`group relative overflow-hidden rounded-[22px] border p-3 text-left transition active:scale-[0.985] ${
                        selected
                          ? "border-cyan-200/45 bg-cyan-300/[0.12] text-white shadow-[0_0_30px_rgba(34,211,238,0.14)]"
                          : "border-white/[0.08] bg-white/[0.04] text-white/68 hover:border-white/[0.16] hover:bg-white/[0.065] hover:text-white/86"
                      }`}
                      style={
                        selected
                          ? { boxShadow: `0 0 30px ${details.glow}, inset 0 1px 0 rgba(255,255,255,0.075)` }
                          : undefined
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-lg ${
                              selected
                                ? "border-cyan-100/25 bg-white/[0.12]"
                                : "border-white/10 bg-white/[0.055]"
                            }`}
                          >
                            {walletIcons[type] || "💰"}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-black tracking-[-0.02em]">
                              {details.label}
                            </span>
                            <span className="mt-0.5 block truncate text-[10.5px] font-medium text-white/42">
                              {details.helper}
                            </span>
                          </span>
                        </div>

                        {selected ? (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_18px_rgba(52,211,153,0.35)]">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[24px] border border-emerald-100/[0.13] bg-emerald-300/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-100/15 bg-emerald-300/10 text-emerald-100">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black tracking-[-0.01em] text-white/88">
                      Balance stays unchanged
                    </p>
                    <p className="mt-1 text-[11.5px] leading-5 text-white/48">
                      Use Add Money, Transfer, or transactions to change this wallet’s balance.
                    </p>
                  </div>
                </div>
                <p className="shrink-0 text-right text-[14px] font-black tracking-[-0.025em] text-emerald-100">
                  {currentBalance}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative shrink-0 border-t border-white/[0.08] bg-slate-950/30 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-2.5">
            <button
              type="button"
              onClick={handleSaveWalletEdit}
              disabled={isSavingWalletEdit}
              className="min-h-[54px] w-full rounded-[22px] bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-400 text-sm font-black tracking-[-0.01em] text-slate-950 shadow-[0_16px_36px_rgba(45,212,191,0.22)] transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingWalletEdit ? "Saving..." : "Save wallet"}
            </button>

            <button
              type="button"
              onClick={closeEditWallet}
              disabled={isSavingWalletEdit}
              className="h-12 w-full rounded-[20px] border border-white/[0.10] bg-white/[0.045] text-sm font-bold text-white/68 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return modalContent;

  return createPortal(modalContent, document.body);
}
