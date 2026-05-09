import { useRef } from "react";
import { X } from "lucide-react";

import {
  DEFAULT_THEME,
  formatDateOnly,
  titleCase,
} from "@/components/fresh/transaction-hub/logic/transactionHubUtils";
import { useClickOutside } from "@/components/fresh/transaction-hub/ui/TransactionHubPrimitives";

export default function EditTransactionDialog({
  open,
  item,
  form,
  wallets,
  saving,
  error,
  onChange,
  onClose,
  onSubmit,
  theme = DEFAULT_THEME,
}) {
  const dialogRef = useRef(null);
  useClickOutside(dialogRef, () => {
    if (!saving) onClose?.();
  });

  if (!open || !item) return null;

  const canEditTransfer = item.group === "transfer";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/58 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6 backdrop-blur-md sm:items-center">
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg overflow-hidden rounded-[30px] border border-white/10 bg-[#07101d]/96 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl"
      >
        <div
          className={`pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full ${theme.orb} blur-3xl opacity-70`}
        />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.07))] blur-3xl" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-[9px] font-black uppercase tracking-[0.18em] ${theme.primaryText} opacity-60`}>
              Edit Transaction
            </p>
            <h2 className="mt-1 truncate text-xl font-black tracking-tight text-white/92">
              {item.title || "Transaction"}
            </h2>
            <p className="mt-1 text-xs font-semibold text-white/42">
              {titleCase(item.group)} · {formatDateOnly(item.date)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[17px] border border-white/10 bg-black/22 text-white/58 transition duration-200 hover:bg-white/[0.06] hover:text-white/86 disabled:opacity-40 active:scale-[0.96]"
            aria-label="Close edit transaction"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="relative mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                Title
              </span>
              <input
                value={form.title}
                onChange={(event) => onChange("title", event.target.value)}
                placeholder="Transaction title"
                className={`min-h-[48px] w-full rounded-[18px] border border-white/10 bg-black/[0.26] px-4 text-sm font-bold text-white outline-none placeholder:text-white/28 ${theme.focus}`}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                Amount
              </span>
              <input
                value={form.amount}
                onChange={(event) => onChange("amount", event.target.value)}
                inputMode="decimal"
                placeholder="0"
                className={`min-h-[48px] w-full rounded-[18px] border border-white/10 bg-black/[0.26] px-4 text-sm font-bold text-white outline-none placeholder:text-white/28 ${theme.focus}`}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                Date
              </span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => onChange("date", event.target.value)}
                className={`min-h-[48px] w-full rounded-[18px] border border-white/10 bg-black/[0.26] px-4 text-sm font-bold text-white outline-none [color-scheme:dark] ${theme.focus}`}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                Category
              </span>
              <input
                value={form.category}
                onChange={(event) => onChange("category", event.target.value)}
                placeholder="Category"
                className={`min-h-[48px] w-full rounded-[18px] border border-white/10 bg-black/[0.26] px-4 text-sm font-bold text-white outline-none placeholder:text-white/28 ${theme.focus}`}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                Wallet
              </span>
              <select
                value={form.walletId}
                onChange={(event) => onChange("walletId", event.target.value)}
                disabled={canEditTransfer}
                className={`min-h-[48px] w-full rounded-[18px] border border-white/10 bg-black/[0.26] px-4 text-sm font-bold text-white outline-none disabled:opacity-55 ${theme.focus}`}
              >
                <option value="">No wallet selected</option>
                {wallets.map((wallet) => {
                  const id = String(wallet.id || wallet.local_id || wallet.localId || "");
                  if (!id) return null;

                  return (
                    <option key={id} value={id}>
                      {wallet.name || wallet.wallet_name || wallet.title || "Wallet"}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
              Note
            </span>
            <textarea
              value={form.note}
              onChange={(event) => onChange("note", event.target.value)}
              placeholder="Optional note"
              rows={3}
              className={`w-full resize-none rounded-[18px] border border-white/10 bg-black/[0.26] px-4 py-3 text-sm font-semibold leading-6 text-white outline-none placeholder:text-white/28 ${theme.focus}`}
            />
          </label>

          {error ? (
            <div className="rounded-[18px] border border-rose-200/14 bg-rose-300/8 px-3 py-2 text-xs font-semibold leading-5 text-rose-50/78">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-[48px] rounded-[19px] border border-white/10 bg-black/20 text-sm font-black text-white/64 transition duration-200 disabled:opacity-45 active:scale-[0.98]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className={`min-h-[48px] rounded-[19px] border ${theme.border} ${theme.orb} text-sm font-black ${theme.primaryText} shadow-[0_0_22px_var(--clara-theme-glow,rgba(148,163,184,0.09))] transition duration-200 disabled:opacity-45 active:scale-[0.98]`}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
