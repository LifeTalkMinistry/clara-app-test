import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";
import WalletProviderPicker from "@/components/financial-carousel/cards/wallet/ui/WalletProviderPicker";
import {
  fmt,
  getWalletBalanceValue,
} from "@/components/financial-carousel/cards/wallet/logic/useWalletCardLogic";
import { getWalletProvider } from "@/components/financial-carousel/cards/wallet/logic/walletProviderRegistry";

export default function EditWalletModal({
  editingWallet,
  editForm,
  setEditForm,
  editError = "",
  setEditError,
  isSavingWalletEdit,
  closeEditWallet,
  handleSaveWalletEdit,
}) {
  if (!editingWallet) return null;

  const currentProvider = getWalletProvider(editForm.providerKey, editingWallet?.type || "cash");
  const currentName = editForm.name.trim() || editingWallet?.name || "Untitled wallet";
  const currentBalance = fmt(getWalletBalanceValue(editingWallet));
  const saveDisabled = isSavingWalletEdit || !editForm.name.trim();

  const modalContent = (
    <div className="fixed inset-0 z-[2147483647] flex h-[100dvh] w-screen justify-center overflow-hidden bg-black/82 text-white backdrop-blur-xl">
      <div className="relative flex h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none border-0 border-cyan-100/[0.14] bg-[linear-gradient(145deg,rgba(4,14,34,0.99),rgba(5,32,47,0.985)_42%,rgba(24,18,58,0.98)_100%)] text-white shadow-[0_30px_90px_rgba(0,0,0,0.72),0_0_50px_rgba(34,211,238,0.11),0_0_70px_rgba(16,185,129,0.08)] sm:my-5 sm:h-[calc(100dvh-40px)] sm:max-w-md sm:rounded-[32px] sm:border">
        <div className="pointer-events-none absolute -left-24 -top-28 h-60 w-60 rounded-full bg-cyan-300/[0.12] blur-[74px]" />
        <div className="pointer-events-none absolute -right-24 top-20 h-64 w-64 rounded-full bg-emerald-300/[0.09] blur-[82px]" />

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
          <h3 className="pr-12 text-[24px] font-black tracking-[-0.04em] text-white">Edit wallet</h3>
        </div>

        <div className="relative flex-1 overflow-y-auto px-5 py-5 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-5">
            <div
              className="relative overflow-hidden rounded-[28px] border border-cyan-100/[0.14] bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(255,255,255,0.055)_42%,rgba(16,185,129,0.10))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_38px_rgba(0,0,0,0.22)]"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 38px rgba(0,0,0,0.22), 0 0 34px " + currentProvider.accent + "2b" }}
            >
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3.5">
                  <div
                    className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[20px] border border-white/15 text-[12px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_24px_rgba(0,0,0,0.20)]"
                    style={{ background: currentProvider.iconBg, color: currentProvider.iconTextColor }}
                  >
                    {currentProvider.iconText}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-50/55">Current wallet</p>
                    <p className="mt-1.5 truncate text-lg font-black tracking-[-0.03em] text-white">{currentName}</p>
                    <span className="mt-2 inline-flex rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-white/70">
                      {currentProvider.label}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">Balance</p>
                  <p className="mt-1 text-[15px] font-black tracking-[-0.025em] text-emerald-100">{currentBalance}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Wallet name</p>
              <input
                value={editForm.name}
                onChange={(event) => {
                  setEditForm((prev) => ({ ...prev, name: event.target.value }));
                  if (editError) setEditError?.("");
                }}
                placeholder="e.g. BDO Wallet, GCash, Cash"
                className="h-[52px] w-full rounded-[22px] border border-white/[0.12] bg-white/[0.065] px-4 text-[15px] font-bold tracking-[-0.01em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] outline-none placeholder:text-white/32 focus:border-cyan-200/45 focus:bg-white/[0.085] focus:ring-2 focus:ring-cyan-300/15"
              />
              {editError ? (
                <p className="rounded-2xl border border-rose-300/15 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100">{editError}</p>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Wallet identity</p>
              <WalletProviderPicker
                compact
                selectedProviderKey={editForm.providerKey}
                disabled={isSavingWalletEdit}
                onSelect={(provider) => {
                  setEditForm((prev) => ({ ...prev, providerKey: provider.key }));
                  if (editError) setEditError?.("");
                }}
              />
            </div>

            <div className="rounded-[24px] border border-emerald-100/[0.13] bg-emerald-300/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-100/15 bg-emerald-300/10 text-emerald-100">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black tracking-[-0.01em] text-white/88">Balance stays unchanged</p>
                    <p className="mt-1 text-[11.5px] leading-5 text-white/48">Use Add Money, Transfer, or transactions to change this wallet’s balance.</p>
                  </div>
                </div>
                <p className="shrink-0 text-right text-[14px] font-black tracking-[-0.025em] text-emerald-100">{currentBalance}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative shrink-0 border-t border-white/[0.08] bg-slate-950/30 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-2.5">
            <button
              type="button"
              onClick={handleSaveWalletEdit}
              disabled={saveDisabled}
              className="min-h-[54px] w-full rounded-[22px] bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-400 text-sm font-black tracking-[-0.01em] text-slate-950 shadow-[0_16px_36px_rgba(45,212,191,0.22)] transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingWalletEdit ? "Saving..." : editForm.name.trim() ? "Save wallet" : "Enter wallet name"}
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
