import { X } from "lucide-react";
import {
  fmt,
  toNumber,
  walletIcons,
  walletTypes,
} from "../logic/useWalletCardLogic";

export default function EditWalletModal({
  editingWallet,
  editForm,
  setEditForm,
  isSavingWalletEdit,
  closeEditWallet,
  handleSaveWalletEdit,
}) {
  if (!editingWallet) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 px-4 py-5 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-cyan-200/15 bg-[linear-gradient(135deg,rgba(6,48,66,0.98),rgba(7,20,48,0.96)_48%,rgba(37,13,74,0.96))] text-white shadow-[0_30px_90px_rgba(0,0,0,0.72),0_0_44px_rgba(0,255,220,0.14)]">
        <div className="relative border-b border-white/10 px-5 py-5">
          <button
            type="button"
            onClick={closeEditWallet}
            disabled={isSavingWalletEdit}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.10] hover:text-white disabled:opacity-50"
            aria-label="Close edit wallet"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="pr-12">
            <div className="mb-3 inline-flex items-center rounded-full border border-cyan-200/15 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-50/85">
              Wallet setup
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">
              Edit wallet
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Update the name and type of this money container.
            </p>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="rounded-[26px] border border-cyan-200/15 bg-gradient-to-br from-cyan-300/[0.12] via-white/[0.045] to-purple-500/[0.12] p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                  Current wallet
                </p>
                <p className="mt-2 truncate text-lg font-bold text-white">
                  {editForm.name.trim() || editingWallet?.name || "Untitled wallet"}
                </p>
                <p className="mt-1 text-sm capitalize text-white/55">
                  {(editForm.type || "cash").replaceAll("_", " ")}
                </p>
              </div>
              <div className="text-3xl">
                {walletIcons[editForm.type] || "💰"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-white/86">
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
              placeholder="e.g. GCash, Cash, Payroll"
              className="h-12 w-full rounded-2xl border border-white/15 bg-white/[0.07] px-4 text-white outline-none placeholder:text-white/35 focus:border-cyan-300/45 focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-white/86">
              Wallet type
            </p>
            <div className="grid grid-cols-3 gap-2">
              {walletTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setEditForm((prev) => ({ ...prev, type }))
                  }
                  className={`rounded-2xl border px-2.5 py-3 text-center text-xs font-bold capitalize transition active:scale-[0.98] ${
                    editForm.type === type
                      ? "border-cyan-300/45 bg-cyan-300/15 text-cyan-50 shadow-[0_0_26px_rgba(0,255,220,0.14)]"
                      : "border-white/10 bg-white/[0.045] text-white/58 hover:border-white/20 hover:bg-white/[0.07] hover:text-white/80"
                  }`}
                >
                  <span className="mb-1 block text-lg leading-none">
                    {walletIcons[type] || "💰"}
                  </span>
                  <span>{type.replaceAll("_", " ")}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-white/60">
                Balance stays unchanged
              </p>
              <p className="text-sm font-bold text-white">
                {fmt(toNumber(editingWallet?.balance))}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveWalletEdit}
            disabled={isSavingWalletEdit}
            className="min-h-[54px] w-full rounded-2xl bg-gradient-to-r from-cyan-300 via-teal-400 to-emerald-500 text-sm font-bold text-slate-950 shadow-[0_14px_34px_rgba(0,255,220,0.24)] transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingWalletEdit ? "Saving..." : "Save wallet"}
          </button>

          <button
            type="button"
            onClick={closeEditWallet}
            disabled={isSavingWalletEdit}
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.045] text-sm font-semibold text-white/72 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
