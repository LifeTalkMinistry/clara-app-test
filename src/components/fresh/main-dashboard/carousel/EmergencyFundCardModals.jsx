import { Check, MinusCircle, RotateCcw, X } from "lucide-react";

function ModalFrame({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center p-4">
      <button type="button" aria-label="Close modal" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="theme-modal-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.07] bg-[#061224]/95 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
          <div>
            <p className="text-base font-semibold text-white">{title}</p>
            {subtitle ? <p className="mt-0.5 text-xs text-white/45">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-black/[0.12] text-white/70 transition hover:bg-white/[0.05] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-4">{children}</div>
      </div>
    </div>
  );
}

export function EmergencyAddModal({
  open,
  onClose,
  wallets,
  sourceWalletId,
  setSourceWalletId,
  amount,
  setAmount,
  error,
  saving,
  onSave,
  fmt,
  getWalletId,
  getWalletName,
  getWalletSpendable,
}) {
  if (!open) return null;

  return (
    <ModalFrame title="Add Emergency Fund" subtitle="Use any wallet as the funding source." onClose={onClose}>
      <div>
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Source Wallet</label>
        <select value={sourceWalletId} onChange={(event) => setSourceWalletId(event.target.value)} className="w-full rounded-2xl border border-white/[0.07] bg-black/[0.18] px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-emerald-300/24">
          {wallets.length ? wallets.map((wallet) => (
            <option key={getWalletId(wallet)} value={getWalletId(wallet)} className="bg-slate-950">
              {getWalletName(wallet)} — spendable {fmt(getWalletSpendable(wallet))}
            </option>
          )) : <option value="" className="bg-slate-950">No wallet available</option>}
        </select>
      </div>
      <input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" className="w-full rounded-2xl border border-white/[0.07] bg-black/[0.18] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300/24" />
      {error ? <div className="rounded-2xl border border-rose-300/16 bg-rose-400/[0.075] px-4 py-3 text-xs font-semibold text-rose-200">{error}</div> : null}
      <button type="button" onClick={onSave} disabled={saving || wallets.length === 0} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.09] px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/[0.13] disabled:cursor-not-allowed disabled:opacity-60">
        <Check className="h-4 w-4" />{saving ? "Saving..." : "Add to Emergency Fund"}
      </button>
    </ModalFrame>
  );
}

export function EmergencyUseModal({
  open,
  onClose,
  amount,
  setAmount,
  reason,
  setReason,
  error,
  saving,
  onSave,
  currentReserve,
  actionType,
  setActionType,
  orphanAllocation,
  onReverseOrphanAllocation,
  fmt,
  toNumber,
}) {
  if (!open) return null;
  const isCorrection = actionType === "correction";
  const orphanAmount = toNumber(orphanAllocation?.amount ?? orphanAllocation?.value ?? orphanAllocation?.total ?? 0);

  return (
    <ModalFrame title="Emergency Fund Action" subtitle="Choose whether this is real emergency usage or a balance correction." onClose={onClose}>
      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Action type</label>
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.055] bg-black/[0.13] p-1">
          {[{ value: "expense", label: "Emergency expense" }, { value: "correction", label: "Balance correction" }].map((option) => (
            <button key={option.value} type="button" onClick={() => setActionType(option.value)} disabled={saving} className={`rounded-xl px-3 py-2.5 text-[11px] font-black transition disabled:opacity-60 ${actionType === option.value ? "border border-cyan-200/18 bg-cyan-300/[0.11] text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,0.08)]" : "text-white/52 hover:bg-white/[0.045] hover:text-white/78"}`}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className={`rounded-2xl border px-4 py-3 text-xs font-semibold leading-5 ${isCorrection ? "border-violet-300/18 bg-violet-400/[0.075] text-violet-50/82" : "border-amber-300/18 bg-amber-400/[0.08] text-amber-50/82"}`}>
        {isCorrection ? "Use this only to fix an incorrect Emergency Fund balance. This will not be recorded as emergency spending." : `This will reduce your emergency reserve from ${fmt(currentReserve)}.`}
      </div>
      {isCorrection && orphanAllocation ? (
        <div className="rounded-2xl border border-violet-300/14 bg-violet-400/[0.055] px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-100/54">Detected possible orphan allocation</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-black text-white/84">{orphanAllocation?.title || "Emergency Fund Allocation"}</p>
              <p className="mt-1 text-[10px] font-semibold text-white/44">{fmt(orphanAmount)}</p>
            </div>
            <button type="button" onClick={onReverseOrphanAllocation} disabled={saving || orphanAmount <= 0} className="shrink-0 rounded-xl border border-violet-200/18 bg-violet-300/[0.10] px-3 py-2 text-[11px] font-black text-violet-50 transition hover:bg-violet-300/[0.14] disabled:opacity-50">Reverse this allocation</button>
          </div>
        </div>
      ) : null}
      <input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={isCorrection ? "Correction amount" : "Amount used"} className="w-full rounded-2xl border border-white/[0.07] bg-black/[0.18] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30" />
      <input type="text" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={isCorrection ? "Correction reason" : "Emergency reason"} className="w-full rounded-2xl border border-white/[0.07] bg-black/[0.18] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30" />
      {error ? <div className="rounded-2xl border border-rose-300/16 bg-rose-400/[0.075] px-4 py-3 text-xs font-semibold text-rose-200">{error}</div> : null}
      <button type="button" onClick={onSave} disabled={saving} className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition disabled:opacity-60 ${isCorrection ? "border-violet-300/22 bg-violet-400/[0.10] text-violet-100 hover:bg-violet-400/[0.15]" : "border-amber-300/22 bg-amber-400/[0.10] text-amber-100 hover:bg-amber-400/[0.15]"}`}>
        {isCorrection ? <RotateCcw className="h-4 w-4" /> : <MinusCircle className="h-4 w-4" />}
        {saving ? (isCorrection ? "Applying..." : "Logging...") : (isCorrection ? "Apply Correction" : "Use Fund")}
      </button>
    </ModalFrame>
  );
}

export function EmergencyMoveModal({
  open,
  onClose,
  onConfirm,
  currentWallet,
  nextWallet,
  amount,
  error,
  moving,
  fmt,
  getWalletName,
}) {
  if (!open || !nextWallet) return null;
  const currentWalletName = currentWallet ? getWalletName(currentWallet) : "Previous wallet";
  const nextWalletName = getWalletName(nextWallet);
  const message = amount > 0 && currentWallet
    ? `Changing the Emergency Fund storage wallet will move the protected Emergency Fund amount to the new wallet. CLARA will deduct ${fmt(amount)} from ${currentWalletName} and add it to ${nextWalletName}. Any extra money in the old wallet will remain there.`
    : amount > 0
      ? "The previous storage wallet is no longer available. CLARA will assign this wallet as the new Emergency Fund storage wallet."
      : "No protected balance will be moved yet. CLARA will use this wallet as the storage wallet for future Emergency Fund money.";

  return (
    <ModalFrame title="Move Emergency Fund?" subtitle="Confirm before changing storage wallet." onClose={onClose}>
      <div className="rounded-2xl border border-cyan-300/16 bg-cyan-400/[0.075] px-4 py-3 text-xs font-semibold leading-6 text-cyan-50/82">{message}</div>
      <div className="grid grid-cols-1 gap-2 text-xs font-semibold text-white/64">
        <div className="rounded-2xl border border-white/[0.06] bg-black/[0.12] px-4 py-3"><span className="text-white/38">From:</span> <span className="font-black text-white/86">{currentWallet ? currentWalletName : "Previous wallet unavailable"}</span></div>
        <div className="rounded-2xl border border-white/[0.06] bg-black/[0.12] px-4 py-3"><span className="text-white/38">To:</span> <span className="font-black text-white/86">{nextWalletName}</span></div>
        <div className="rounded-2xl border border-white/[0.06] bg-black/[0.12] px-4 py-3"><span className="text-white/38">Amount:</span> <span className="font-black text-emerald-100">{fmt(amount)}</span></div>
      </div>
      {error ? <div className="rounded-2xl border border-rose-300/16 bg-rose-400/[0.075] px-4 py-3 text-xs font-semibold text-rose-200">{error}</div> : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} disabled={moving} className="rounded-2xl border border-white/[0.06] bg-black/[0.12] px-4 py-3 text-sm font-semibold text-white/78 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-60">Cancel</button>
        <button type="button" onClick={onConfirm} disabled={moving} className="rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.09] px-4 py-3 text-sm font-black text-emerald-200 transition hover:bg-emerald-400/[0.13] disabled:opacity-60">{moving ? "Moving..." : "Move Emergency Fund"}</button>
      </div>
    </ModalFrame>
  );
}

export function EmergencyResetConfirmModal({ open, onClose, onConfirm, saving, error }) {
  if (!open) return null;

  return (
    <ModalFrame title="Reset Emergency Fund?" subtitle="Please confirm before CLARA clears this setup." onClose={onClose}>
      <div className="rounded-2xl border border-rose-300/16 bg-rose-400/[0.08] px-4 py-3 text-xs font-semibold leading-6 text-rose-50/86">This will reset the Emergency Fund setup and activity log. The actual money will remain in its wallet and become spendable again.</div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-100/72">This cannot be undone.</p>
      {error ? <div className="rounded-2xl border border-rose-300/16 bg-rose-400/[0.075] px-4 py-3 text-xs font-semibold text-rose-200">{error}</div> : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} disabled={saving} className="rounded-2xl border border-white/[0.06] bg-black/[0.12] px-4 py-3 text-sm font-semibold text-white/78 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-60">Cancel</button>
        <button type="button" onClick={onConfirm} disabled={saving} className="rounded-2xl border border-rose-300/22 bg-rose-400/[0.10] px-4 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-400/[0.15] disabled:opacity-60">{saving ? "Resetting..." : "Continue reset"}</button>
      </div>
    </ModalFrame>
  );
}
