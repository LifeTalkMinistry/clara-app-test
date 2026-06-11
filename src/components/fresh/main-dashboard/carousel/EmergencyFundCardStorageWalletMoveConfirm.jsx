import { useMemo, useState } from "react";
import { Check, Edit2, MinusCircle, Plus, RotateCcw, Shield, X } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import useFinancialData from "@/hooks/useFinancialData";
import SurvivalExpenseModal from "../../../../SurvivalExpenseModal";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardExpandedPanel from "@/components/financial-carousel/shared/FinanceCardExpandedPanel";
import EmergencyFundSetupFlow from "./EmergencyFundSetupFlow";

const fmt = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);

const TARGET_MONTHS = [3, 6, 12];

const premiumActionClass =
  "border-white/[0.045] bg-black/[0.105] text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.026),0_10px_22px_rgba(0,0,0,0.14)] backdrop-blur-sm hover:border-white/[0.07] hover:bg-white/[0.04]";

const expandButtonClass =
  "border-white/[0.045] bg-black/[0.105] py-3 font-medium text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.028),0_10px_22px_rgba(0,0,0,0.14)] backdrop-blur-sm hover:border-white/[0.07] hover:bg-white/[0.04]";

const EMERGENCY_GLOW_LAYERS = [
  "pointer-events-none absolute -left-[132px] -top-[148px] z-[1] h-[270px] w-[270px] rounded-full bg-cyan-400/[0.07] blur-[78px]",
  "pointer-events-none absolute -right-[132px] -top-[72px] z-[1] h-[270px] w-[270px] rounded-full bg-emerald-500/[0.08] blur-[86px]",
  "pointer-events-none absolute bottom-[-210px] right-[-130px] z-[1] h-[310px] w-[310px] rounded-full bg-purple-700/[0.14] blur-[92px]",
  "pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_12%_0%,rgba(103,232,249,0.105),transparent_31%),radial-gradient(circle_at_86%_98%,rgba(124,58,237,0.16),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.012)_36%,rgba(0,0,0,0.18)_100%)]",
  "pointer-events-none absolute inset-x-0 top-0 z-[3] h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),rgba(255,255,255,0.012)_42%,transparent)]",
  "pointer-events-none absolute inset-0 z-[3] rounded-[inherit] ring-1 ring-inset ring-white/[0.055]",
];

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[₱,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstValue(source, keys = [], fallback = "") {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function getWalletId(wallet) {
  return String(wallet?.id || wallet?.wallet_id || wallet?.walletId || wallet?.local_id || "").trim();
}

function getWalletName(wallet) {
  return String(wallet?.name || wallet?.wallet_name || wallet?.title || wallet?.label || "Wallet").trim() || "Wallet";
}

function getWalletBalance(wallet) {
  return toNumber(
    wallet?.balance ??
      wallet?.derived_balance ??
      wallet?.current_balance ??
      wallet?.wallet_balance ??
      wallet?.available_balance ??
      wallet?.amount ??
      0
  );
}

function getWalletProtectedAmount(wallet) {
  return toNumber(wallet?.emergencyProtectedAmount ?? wallet?.emergency_protected_amount ?? wallet?.protectedEmergencyAmount ?? wallet?.protected_emergency_amount ?? 0);
}

function getWalletSpendable(wallet) {
  const explicit = wallet?.spendableBalance ?? wallet?.spendable_balance ?? wallet?.walletSpendableBalance ?? wallet?.wallet_spendable_balance;
  if (explicit !== undefined && explicit !== null && explicit !== "") return toNumber(explicit);
  const balance = getWalletBalance(wallet);
  return Math.max(balance - Math.min(getWalletProtectedAmount(wallet), balance), 0);
}

function isActiveWallet(wallet) {
  return Boolean(
    wallet &&
      getWalletId(wallet) &&
      !wallet?.is_archived &&
      !wallet?.deletedAt &&
      !wallet?.deleted_at &&
      !wallet?.isEmergencyReserveWallet &&
      !wallet?.protected_reserve
  );
}

function getEmergencyAmount(emergencyFund) {
  return toNumber(
    firstValue(emergencyFund, [
      "protectedBalance",
      "protected_balance",
      "reserveBalance",
      "reserve_balance",
      "savedAmount",
      "saved_amount",
      "currentAmount",
      "current_amount",
      "amount",
      "balance",
      "moneyLeft",
    ], 0)
  );
}

function getEmergencyMonthlyExpense(emergencyFund, fallback) {
  return toNumber(
    firstValue(emergencyFund, [
      "survivalExpense",
      "survival_expense",
      "monthlyExpense",
      "monthly_expense",
      "monthly_survival_expense",
    ], fallback)
  );
}

function getEmergencyTargetMonths(emergencyFund) {
  const value = toNumber(firstValue(emergencyFund, ["targetMonths", "target_months", "months_target"], 3));
  return TARGET_MONTHS.includes(value) ? value : 3;
}

function getEmergencyStorageWalletId(emergencyFund) {
  return String(
    firstValue(emergencyFund, [
      "storageWalletId",
      "storage_wallet_id",
      "linkedWalletId",
      "linked_wallet_id",
      "reserveWalletId",
      "reserve_wallet_id",
      "sourceWalletId",
      "source_wallet_id",
      "walletId",
      "wallet_id",
    ], "") || ""
  ).trim();
}

function getEmergencyStorageWalletName(emergencyFund) {
  return String(
    firstValue(emergencyFund, [
      "storageWalletName",
      "storage_wallet_name",
      "linkedWalletName",
      "linked_wallet_name",
      "reserveWalletName",
      "reserve_wallet_name",
      "sourceWalletName",
      "source_wallet_name",
      "walletName",
      "wallet_name",
    ], "") || ""
  ).trim();
}

function getEmergencyActivityLog(emergencyFund) {
  const source =
    emergencyFund?.emergencyActivityLog ||
    emergencyFund?.emergency_activity_log ||
    emergencyFund?.activityLog ||
    emergencyFund?.activity_log ||
    emergencyFund?.usageLog ||
    emergencyFund?.usage_log ||
    [];
  return Array.isArray(source) ? source.filter(Boolean) : [];
}

function getStatus(months, targetMonths) {
  if (months >= targetMonths) return { label: "Secure", text: "text-emerald-200", badge: "bg-emerald-400/12 text-emerald-100 border border-emerald-300/15", ring: "shadow-[0_0_24px_rgba(52,211,153,0.18)]" };
  if (months >= targetMonths * 0.33) return { label: "Building", text: "text-amber-200", badge: "bg-amber-400/12 text-amber-100 border border-amber-300/18", ring: "shadow-[0_0_24px_rgba(251,191,36,0.12)]" };
  return { label: "Getting started", text: "text-rose-200", badge: "bg-rose-400/12 text-rose-100 border border-rose-300/18", ring: "shadow-[0_0_24px_rgba(244,63,94,0.12)]" };
}

function EmergencyHeader({ status }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200/18 bg-white/[0.065] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_0_16px_rgba(0,255,220,0.08)] backdrop-blur-sm">
        <Shield className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight text-white">Emergency Fund</p>
            <p className="mt-0.5 text-[11px] font-medium text-white/76">Safety buffer for emergencies</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${status.badge}`}>{status.label}</span>
        </div>
      </div>
    </div>
  );
}

function EmergencySetupEmptyState({ expanded = false, onSetup }) {
  return (
    <div className={`relative overflow-hidden rounded-[28px] border border-white/[0.045] bg-black/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.026)] ${expanded ? "flex min-h-[360px] flex-1 flex-col justify-center px-5 py-7" : "px-4 py-5"}`}>
      <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-cyan-300/[0.07] blur-[58px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-violet-500/[0.10] blur-[62px]" />
      <div className="relative">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.08] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.10)]">
          <Shield className="h-5 w-5" />
        </div>
        <p className="text-xl font-black tracking-[-0.025em] text-white">Emergency Fund</p>
        <p className="mt-3 max-w-[320px] text-sm font-semibold leading-6 text-white/70">
          Before CLARA can protect you, let’s define what “safe” means for your real life.
        </p>
        <button
          type="button"
          onClick={onSetup}
          className="mt-5 flex w-full items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.11] px-4 py-3.5 text-sm font-black text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.08)] transition hover:bg-cyan-300/[0.16]"
        >
          Set up my emergency fund
        </button>
        <p className="mt-3 text-center text-[11px] font-semibold leading-5 text-white/42">
          You’ll choose your monthly survival cost, storage wallet, and protection goal.
        </p>
      </div>
    </div>
  );
}

function SetupMetricCard({ label, value, helper }) {
  return (
    <div className="flex min-h-[104px] flex-col rounded-2xl border border-white/[0.055] bg-white/[0.045] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <p className="text-[11px] font-black leading-tight tracking-[-0.01em] text-white/62">{label}</p>
      <p className="mt-2 text-[17px] font-black leading-none tracking-[-0.02em] text-white/94">{value}</p>
      <p className="mt-auto pt-2 text-[10.5px] font-semibold leading-4 text-white/38">{helper}</p>
    </div>
  );
}

function SetupSummaryBoard({ monthlyExpense, targetMonths, target, storageWalletId, storageWalletName, safeWallets, saving, movingFund, onChangeStorageWallet }) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-cyan-200/[0.09] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.085),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.105),transparent_48%),rgba(0,0,0,0.12)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-cyan-300/[0.055] blur-[58px]" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-violet-500/[0.08] blur-[64px]" />

      <div className="relative mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/48">Emergency setup</p>
          <p className="mt-1 text-[15px] font-black leading-tight tracking-[-0.015em] text-white/92">Your saved safety definition</p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-300/16 bg-emerald-400/[0.08] px-2.5 py-1 text-[10.5px] font-black text-emerald-100/90">
          {targetMonths} months
        </span>
      </div>

      <div className="relative grid grid-cols-2 gap-2.5">
        <SetupMetricCard label="Monthly survival" value={fmt(monthlyExpense)} helper="Essentials only" />
        <SetupMetricCard label="Target amount" value={fmt(target)} helper={`${targetMonths} × survival cost`} />
      </div>

      <div className="relative mt-2.5 rounded-2xl border border-white/[0.055] bg-black/[0.12] px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-black leading-tight tracking-[-0.01em] text-white/62">Storage wallet</p>
          <p className="max-w-[52%] truncate text-[11px] font-black tracking-[-0.01em] text-cyan-100/80">{storageWalletName}</p>
        </div>
        <select
          value={storageWalletId || ""}
          onChange={(event) => onChangeStorageWallet(event.target.value)}
          disabled={saving || movingFund || !safeWallets.length}
          className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.055] px-3.5 py-3 text-[13px] font-black tracking-[-0.01em] text-white outline-none transition focus:border-cyan-300/24 disabled:opacity-60"
        >
          <option value="" className="bg-slate-950">Choose storage wallet</option>
          {safeWallets.map((wallet) => (
            <option key={getWalletId(wallet)} value={getWalletId(wallet)} className="bg-slate-950">
              {getWalletName(wallet)} • {fmt(getWalletBalance(wallet))}
            </option>
          ))}
        </select>
        <p className="mt-2 text-[10.5px] font-semibold leading-5 text-cyan-50/52">This is where CLARA tracks and protects your emergency money.</p>
      </div>
    </div>
  );
}

function ExpandButtonRow({ expanded, onToggleDetails }) {
  return (
    <div className="shrink-0 border-t border-white/[0.035] pt-3">
      <FinanceCardExpandButton detailKey="emergency" expanded={expanded} onToggleDetails={onToggleDetails} collapsedLabel="View emergency details" expandedLabel="Hide emergency details" className={expandButtonClass} />
    </div>
  );
}

function ActivityList({ activity }) {
  const latest = activity.slice(0, 4);
  if (!latest.length) return <div className="rounded-2xl border border-white/[0.045] bg-black/[0.08] px-3.5 py-3 text-[12px] font-semibold leading-5 text-white/42">No emergency usage yet. CLARA will keep a private log here when you use this reserve.</div>;
  return (
    <div className="space-y-2">
      {latest.map((item) => {
        const type = String(item?.type || "").toLowerCase();
        const isUse = type.includes("use") || type.includes("withdraw") || type.includes("expense");
        const amount = toNumber(item?.amount);
        const createdAt = item?.createdAt || item?.created_at || item?.date || new Date().toISOString();
        const dateLabel = new Date(createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
        return (
          <div key={item?.id || `${createdAt}-${amount}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.045] bg-black/[0.09] px-3.5 py-3">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-black text-white/84">{item?.title || item?.reason || (isUse ? "Emergency usage" : "Emergency deposit")}</p>
              <p className="mt-1 text-[10px] font-semibold text-white/38">{dateLabel}{item?.note ? ` • ${item.note}` : ""}</p>
            </div>
            <p className={`shrink-0 text-[12px] font-black ${isUse ? "text-amber-100" : "text-emerald-200"}`}>{isUse ? "-" : "+"}{fmt(amount)}</p>
          </div>
        );
      })}
    </div>
  );
}

function ModalFrame({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center p-4">
      <button type="button" aria-label="Close modal" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="theme-modal-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.07] bg-[#061224]/95 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
          <div><p className="text-base font-semibold text-white">{title}</p>{subtitle ? <p className="mt-0.5 text-xs text-white/45">{subtitle}</p> : null}</div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-black/[0.12] text-white/70 transition hover:bg-white/[0.05] hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-4">{children}</div>
      </div>
    </div>
  );
}

function EmergencyMoveModal({ open, onClose, onConfirm, currentWallet, nextWallet, amount, error, moving }) {
  if (!open || !nextWallet) return null;
  const hasAmount = amount > 0;
  const hasCurrentWallet = Boolean(currentWallet);
  const currentWalletName = hasCurrentWallet ? getWalletName(currentWallet) : "Previous wallet";
  const nextWalletName = getWalletName(nextWallet);
  const message = hasAmount && hasCurrentWallet
    ? `Changing the Emergency Fund storage wallet will move the protected Emergency Fund amount to the new wallet. CLARA will deduct ${fmt(amount)} from ${currentWalletName} and add it to ${nextWalletName}. Any extra money in the old wallet will remain there.`
    : hasAmount
      ? "The previous storage wallet is no longer available. CLARA will assign this wallet as the new Emergency Fund storage wallet."
      : "No protected balance will be moved yet. CLARA will use this wallet as the storage wallet for future Emergency Fund money.";

  return (
    <ModalFrame title="Move Emergency Fund?" subtitle="Confirm before changing storage wallet." onClose={onClose}>
      <div className="rounded-2xl border border-cyan-300/16 bg-cyan-400/[0.075] px-4 py-3 text-xs font-semibold leading-6 text-cyan-50/82">{message}</div>
      <div className="grid grid-cols-1 gap-2 text-xs font-semibold text-white/64">
        <div className="rounded-2xl border border-white/[0.06] bg-black/[0.12] px-4 py-3"><span className="text-white/38">From:</span> <span className="font-black text-white/86">{hasCurrentWallet ? currentWalletName : "Previous wallet unavailable"}</span></div>
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

function EmergencyResetConfirmModal({ open, onClose, onConfirm, saving = false }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[116] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close reset confirmation"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        disabled={saving}
      />

      <div className="theme-modal-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.07] bg-[#061224]/95 shadow-2xl backdrop-blur-2xl">
        <div className="border-b border-white/[0.06] p-4">
          <p className="text-base font-black text-white">Reset Emergency Fund?</p>
          <p className="mt-1 text-xs font-semibold text-white/48">Please confirm before CLARA clears this setup.</p>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-2xl border border-rose-300/16 bg-rose-400/[0.08] px-4 py-3 text-xs font-semibold leading-6 text-rose-50/86">
            This will reset your Emergency Fund setup, including your monthly survival cost, protection target, storage wallet, saved emergency amount, and activity log.
          </div>

          <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-100/72">This cannot be undone.</p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-2xl border border-white/[0.06] bg-black/[0.12] px-4 py-3 text-sm font-semibold text-white/78 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={saving}
              className="rounded-2xl border border-rose-300/22 bg-rose-400/[0.10] px-4 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-400/[0.15] disabled:opacity-60"
            >
              {saving ? "Resetting..." : "Continue reset"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmergencyAddModal({ open, onClose, wallets, sourceWalletId, setSourceWalletId, amount, setAmount, error, saving, onSave }) {
  if (!open) return null;
  return (
    <ModalFrame title="Add Emergency Fund" subtitle="Use any wallet as the funding source." onClose={onClose}>
      <div>
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Source Wallet</label>
        <select value={sourceWalletId} onChange={(event) => setSourceWalletId(event.target.value)} className="w-full rounded-2xl border border-white/[0.07] bg-black/[0.18] px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-emerald-300/24">
          {wallets.length ? wallets.map((wallet) => <option key={getWalletId(wallet)} value={getWalletId(wallet)} className="bg-slate-950">{getWalletName(wallet)} — spendable {fmt(getWalletSpendable(wallet))}</option>) : <option value="" className="bg-slate-950">No wallet available</option>}
        </select>
      </div>
      <input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" className="w-full rounded-2xl border border-white/[0.07] bg-black/[0.18] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300/24" />
      {error ? <div className="rounded-2xl border border-rose-300/16 bg-rose-400/[0.075] px-4 py-3 text-xs font-semibold text-rose-200">{error}</div> : null}
      <button type="button" onClick={onSave} disabled={saving || wallets.length === 0} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.09] px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/[0.13] disabled:cursor-not-allowed disabled:opacity-60"><Check className="h-4 w-4" />{saving ? "Saving..." : "Add to Emergency Fund"}</button>
    </ModalFrame>
  );
}

function EmergencyUseModal({ open, onClose, amount, setAmount, reason, setReason, error, saving, onSave, currentReserve }) {
  if (!open) return null;
  return (
    <ModalFrame title="Use Emergency Fund" subtitle="Log protected money used for a real emergency." onClose={onClose}>
      <div className="rounded-2xl border border-amber-300/18 bg-amber-400/[0.08] px-4 py-3 text-xs font-semibold leading-5 text-amber-50/82">This will reduce your emergency reserve from {fmt(currentReserve)}.</div>
      <input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount used" className="w-full rounded-2xl border border-white/[0.07] bg-black/[0.18] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30" />
      <input type="text" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Emergency reason" className="w-full rounded-2xl border border-white/[0.07] bg-black/[0.18] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30" />
      {error ? <div className="rounded-2xl border border-rose-300/16 bg-rose-400/[0.075] px-4 py-3 text-xs font-semibold text-rose-200">{error}</div> : null}
      <button type="button" onClick={onSave} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/22 bg-amber-400/[0.10] px-4 py-3 text-sm font-black text-amber-100 transition hover:bg-amber-400/[0.15] disabled:opacity-60"><MinusCircle className="h-4 w-4" />{saving ? "Logging..." : "Use Fund"}</button>
    </ModalFrame>
  );
}

export default function EmergencyFundCard({ moneyLeft = 0, survivalExpense = 0, onSurvivalSaved, expanded = false, onToggleDetails }) {
  const { user } = useAuth();
  const { emergencyFund, wallets = [], updateEmergencyFund, addExpense, transferBetweenWallets, refreshData } = useFinancialData(user);
  const safeWallets = useMemo(() => (Array.isArray(wallets) ? wallets.filter(isActiveWallet) : []), [wallets]);
  const setupWallets = useMemo(
    () => safeWallets.map((wallet) => ({ ...wallet, id: getWalletId(wallet), name: getWalletName(wallet), balance: getWalletSpendable(wallet), spendableBalance: getWalletSpendable(wallet), spendable_balance: getWalletSpendable(wallet) })),
    [safeWallets]
  );

  const hasEmergencyFundReset = Boolean(emergencyFund?.resetAt || emergencyFund?.reset_at);
  const storedWalletId = getEmergencyStorageWalletId(emergencyFund);
  const storedWalletName = getEmergencyStorageWalletName(emergencyFund);
  const hasLinkedWalletReference = Boolean(storedWalletId || storedWalletName);
  const monthlyExpense = hasEmergencyFundReset ? 0 : getEmergencyMonthlyExpense(emergencyFund, survivalExpense || 0);
  const targetMonths = getEmergencyTargetMonths(emergencyFund);
  const isEmergencyFundConfigured = monthlyExpense > 0 && targetMonths > 0 && hasLinkedWalletReference && !hasEmergencyFundReset;
  const isEmergencyFundUnconfigured = hasEmergencyFundReset || monthlyExpense <= 0 || !hasLinkedWalletReference;
  const rawSavedAmount = getEmergencyAmount(emergencyFund);
  const savedAmount = isEmergencyFundUnconfigured ? 0 : rawSavedAmount;
  const target = isEmergencyFundUnconfigured ? 0 : monthlyExpense * targetMonths;
  const months = !isEmergencyFundUnconfigured && monthlyExpense > 0 ? savedAmount / monthlyExpense : 0;
  const pct = !isEmergencyFundUnconfigured && target > 0 ? Math.min((savedAmount / target) * 100, 100) : 0;
  const status = getStatus(months, targetMonths);
  const activity = getEmergencyActivityLog(emergencyFund);
  const activeStorageWallet = safeWallets.find((wallet) => getWalletId(wallet) === storedWalletId) || (!storedWalletId && storedWalletName ? safeWallets.find((wallet) => getWalletName(wallet) === storedWalletName) : null);
  const storageWalletId = activeStorageWallet ? getWalletId(activeStorageWallet) : storedWalletId;
  const storageWalletName = activeStorageWallet ? getWalletName(activeStorageWallet) : storedWalletName || "Choose wallet";
  const hasMonthlySurvivalCost = monthlyExpense > 0;
  const coverageLabel = hasMonthlySurvivalCost ? `${months.toFixed(1)} months` : "Set expense";

  const [editing, setEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sourceWalletId, setSourceWalletId] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addError, setAddError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  const [useAmount, setUseAmount] = useState("");
  const [useReason, setUseReason] = useState("");
  const [useError, setUseError] = useState("");
  const [pendingStorageWalletId, setPendingStorageWalletId] = useState("");
  const [moveError, setMoveError] = useState("");
  const [movingFund, setMovingFund] = useState(false);
  const [showSetupFlow, setShowSetupFlow] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const pendingStorageWallet = safeWallets.find((wallet) => getWalletId(wallet) === pendingStorageWalletId) || null;

  const persistEmergencyFund = async (patch) => {
    if (typeof updateEmergencyFund !== "function") return;
    const now = new Date().toISOString();
    await updateEmergencyFund({ ...(emergencyFund || {}), ...patch, updatedAt: now, updated_at: now });
    await refreshData?.();
  };

  const handleSetupComplete = async ({ monthlySurvivalCost, walletId, walletName, targetMonths: nextTargetMonths } = {}) => {
    const monthly = toNumber(monthlySurvivalCost);
    const safeTargetMonths = TARGET_MONTHS.includes(toNumber(nextTargetMonths)) ? toNumber(nextTargetMonths) : 3;
    const nextWalletId = String(walletId || "").trim();
    const wallet = safeWallets.find((item) => getWalletId(item) === nextWalletId);
    const nextWalletName = String(walletName || (wallet ? getWalletName(wallet) : "")).trim();

    if (monthly <= 0) throw new Error("Emergency Fund setup needs a monthly survival cost greater than 0.");
    if (!nextWalletId || !nextWalletName) throw new Error("Emergency Fund setup needs a linked wallet.");

    const nextTarget = monthly * safeTargetMonths;
    await persistEmergencyFund({
      survivalExpense: monthly,
      survival_expense: monthly,
      monthlyExpense: monthly,
      monthly_expense: monthly,
      monthly_survival_expense: monthly,
      targetAmount: nextTarget,
      target_amount: nextTarget,
      target: nextTarget,
      targetMonths: safeTargetMonths,
      target_months: safeTargetMonths,
      months_target: safeTargetMonths,
      linkedWalletId: nextWalletId,
      linked_wallet_id: nextWalletId,
      linkedWalletName: nextWalletName,
      linked_wallet_name: nextWalletName,
      reserveWalletId: nextWalletId,
      reserve_wallet_id: nextWalletId,
      reserveWalletName: nextWalletName,
      reserve_wallet_name: nextWalletName,
      sourceWalletId: nextWalletId,
      source_wallet_id: nextWalletId,
      sourceWalletName: nextWalletName,
      source_wallet_name: nextWalletName,
      storageWalletId: nextWalletId,
      storage_wallet_id: nextWalletId,
      storageWalletName: nextWalletName,
      storage_wallet_name: nextWalletName,
      resetAt: null,
      reset_at: null,
    });
    onSurvivalSaved?.(monthly);
  };

  const requestStorageWalletChange = (walletId) => {
    const nextWallet = safeWallets.find((wallet) => getWalletId(wallet) === String(walletId));
    if (!nextWallet) return;
    const nextWalletId = getWalletId(nextWallet);
    if (nextWalletId === storageWalletId) return;
    setMoveError("");
    setPendingStorageWalletId(nextWalletId);
  };

  const confirmStorageWalletMove = async () => {
    const nextWallet = pendingStorageWallet;
    if (!nextWallet) return setMoveError("Choose a valid destination wallet.");
    const nextWalletId = getWalletId(nextWallet);
    const nextWalletName = getWalletName(nextWallet);
    if (nextWalletId === storageWalletId) {
      setPendingStorageWalletId("");
      return;
    }

    const now = new Date().toISOString();
    const shouldTransfer = savedAmount > 0 && Boolean(activeStorageWallet);
    const previousWalletName = activeStorageWallet ? getWalletName(activeStorageWallet) : "Previous wallet";

    if (shouldTransfer && getWalletBalance(activeStorageWallet) < savedAmount) {
      return setMoveError("The current storage wallet does not have enough balance to move this protected amount.");
    }

    const nextActivity = savedAmount > 0
      ? [{ id: `emergency_storage_move_${Date.now()}`, type: shouldTransfer ? "storage_wallet_transfer" : "storage_wallet_changed", amount: savedAmount, title: shouldTransfer ? "Emergency Fund moved" : "Storage wallet changed", reason: "Emergency Fund Storage Wallet", note: shouldTransfer ? `Moved from ${previousWalletName} to ${nextWalletName}` : `Stored in ${nextWalletName}`, sourceWalletId: activeStorageWallet ? getWalletId(activeStorageWallet) : null, source_wallet_id: activeStorageWallet ? getWalletId(activeStorageWallet) : null, storageWalletId: nextWalletId, storage_wallet_id: nextWalletId, storageWalletName: nextWalletName, storage_wallet_name: nextWalletName, createdAt: now, created_at: now }, ...activity].slice(0, 60)
      : activity;

    setMovingFund(true);
    setMoveError("");
    try {
      if (shouldTransfer) {
        if (typeof transferBetweenWallets !== "function") throw new Error("Wallet transfer is not available yet.");
        await transferBetweenWallets({ from_wallet_id: getWalletId(activeStorageWallet), to_wallet_id: nextWalletId, amount: savedAmount, user_id: user?.id || null, user_email: user?.email || null, created_by: user?.email || null });
      }

      await persistEmergencyFund({ linkedWalletId: nextWalletId, linked_wallet_id: nextWalletId, reserveWalletId: nextWalletId, reserve_wallet_id: nextWalletId, storageWalletId: nextWalletId, storage_wallet_id: nextWalletId, linkedWalletName: nextWalletName, linked_wallet_name: nextWalletName, reserveWalletName: nextWalletName, reserve_wallet_name: nextWalletName, storageWalletName: nextWalletName, storage_wallet_name: nextWalletName, emergencyActivityLog: nextActivity, emergency_activity_log: nextActivity, activityLog: nextActivity, activity_log: nextActivity, lastStorageWalletChangedAt: now, last_storage_wallet_changed_at: now, lastReserveTransferAt: shouldTransfer ? now : emergencyFund?.lastReserveTransferAt ?? emergencyFund?.last_reserve_transfer_at ?? null, last_reserve_transfer_at: shouldTransfer ? now : emergencyFund?.last_reserve_transfer_at ?? emergencyFund?.lastReserveTransferAt ?? null });
      setPendingStorageWalletId("");
    } catch (error) {
      console.error("Unable to move Emergency Fund storage wallet:", error);
      setMoveError(error?.message || "CLARA could not move this Emergency Fund yet. Try again.");
    } finally {
      setMovingFund(false);
    }
  };

  const handleSurvivalSaved = async (value) => {
    const monthly = toNumber(value);
    await persistEmergencyFund({ survivalExpense: monthly, survival_expense: monthly, monthlyExpense: monthly, monthly_expense: monthly, monthly_survival_expense: monthly, targetAmount: monthly * targetMonths, target_amount: monthly * targetMonths, target: monthly * targetMonths, resetAt: null, reset_at: null });
    setEditing(false);
    onSurvivalSaved?.(monthly);
  };

  const addEmergencyMoney = async () => {
    const amount = toNumber(addAmount);
    const sourceWallet = safeWallets.find((wallet) => getWalletId(wallet) === sourceWalletId);
    const finalStorageWallet = activeStorageWallet || sourceWallet;
    if (!isEmergencyFundConfigured) return setAddError("Set up your Emergency Fund first.");
    if (!sourceWallet) return setAddError("Choose a valid source wallet.");
    if (amount <= 0) return setAddError("Enter a valid amount.");
    if (getWalletSpendable(sourceWallet) < amount) return setAddError("This wallet does not have enough spendable balance.");
    if (!finalStorageWallet) return setAddError("Choose a storage wallet first.");
    const now = new Date().toISOString();
    const sourceName = getWalletName(sourceWallet);
    const finalStorageId = getWalletId(finalStorageWallet);
    const finalStorageName = getWalletName(finalStorageWallet);
    const nextSaved = savedAmount + amount;
    const activityId = `emergency_allocation_${Date.now()}`;
    const nextActivity = [{ id: activityId, type: "allocation", amount, title: "Emergency Fund Allocation", reason: "Emergency Fund Allocation", note: `From ${sourceName}; stored in ${finalStorageName}`, sourceWalletId, source_wallet_id: sourceWalletId, sourceWalletName: sourceName, source_wallet_name: sourceName, storageWalletId: finalStorageId, storage_wallet_id: finalStorageId, storageWalletName: finalStorageName, storage_wallet_name: finalStorageName, balanceBefore: savedAmount, balanceAfter: nextSaved, createdAt: now, created_at: now }, ...activity].slice(0, 60);
    setSaving(true);
    setAddError("");
    try {
      await addExpense?.({ wallet_id: sourceWalletId, amount, category: "Emergency Fund Allocation", need_type: "other", planning_status: "planned", notes: `Moved to Emergency Fund. Stored in ${finalStorageName}.`, date: now, created_at: now, updated_at: now, emergency_fund_transaction_id: activityId, emergencyFundTransactionId: activityId, user_id: user?.id || null, user_email: user?.email || null, created_by: user?.email || null });
      await persistEmergencyFund({ savedAmount: nextSaved, saved_amount: nextSaved, currentAmount: nextSaved, current_amount: nextSaved, amount: nextSaved, balance: nextSaved, moneyLeft: nextSaved, protectedBalance: nextSaved, protected_balance: nextSaved, reserveBalance: nextSaved, reserve_balance: nextSaved, targetAmount: target, target_amount: target, target, linkedWalletId: finalStorageId, linked_wallet_id: finalStorageId, reserveWalletId: finalStorageId, reserve_wallet_id: finalStorageId, storageWalletId: finalStorageId, storage_wallet_id: finalStorageId, linkedWalletName: finalStorageName, linked_wallet_name: finalStorageName, reserveWalletName: finalStorageName, reserve_wallet_name: finalStorageName, storageWalletName: finalStorageName, storage_wallet_name: finalStorageName, emergencyActivityLog: nextActivity, emergency_activity_log: nextActivity, activityLog: nextActivity, activity_log: nextActivity, lastTopUpAmount: amount, last_top_up_amount: amount, lastTopUpWalletId: sourceWalletId, last_top_up_wallet_id: sourceWalletId, lastReserveAllocationAt: now, last_reserve_allocation_at: now });
      setShowAddModal(false);
      setAddAmount("");
    } catch (error) {
      console.error("Unable to add Emergency Fund money:", error);
      setAddError("CLARA could not add this Emergency Fund amount yet. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const useEmergencyMoney = async () => {
    const amount = toNumber(useAmount);
    const reason = String(useReason || "").trim();
    if (amount <= 0) return setUseError("Enter a valid amount.");
    if (amount > savedAmount) return setUseError("This is higher than your current reserve.");
    if (!reason) return setUseError("Add a short emergency reason.");
    const now = new Date().toISOString();
    const nextSaved = Math.max(savedAmount - amount, 0);
    const nextActivity = [{ id: `emergency_use_${Date.now()}`, type: "use", amount, title: "Emergency Fund Used", reason, note: storageWalletName ? `Stored in ${storageWalletName}` : "", balanceBefore: savedAmount, balanceAfter: nextSaved, createdAt: now, created_at: now }, ...activity].slice(0, 60);
    setSaving(true);
    setUseError("");
    try {
      await persistEmergencyFund({ savedAmount: nextSaved, saved_amount: nextSaved, currentAmount: nextSaved, current_amount: nextSaved, amount: nextSaved, balance: nextSaved, moneyLeft: nextSaved, protectedBalance: nextSaved, protected_balance: nextSaved, reserveBalance: nextSaved, reserve_balance: nextSaved, emergencyActivityLog: nextActivity, emergency_activity_log: nextActivity, activityLog: nextActivity, activity_log: nextActivity, usageLog: nextActivity, usage_log: nextActivity, lastEmergencySpendAmount: amount, last_emergency_spend_amount: amount, lastEmergencySpendReason: reason, last_emergency_spend_reason: reason, lastEmergencySpendAt: now, last_emergency_spend_at: now });
      setShowUseModal(false);
      setUseAmount("");
      setUseReason("");
    } finally {
      setSaving(false);
    }
  };

  const resetEmergencyFund = async () => {
    const now = new Date().toISOString();
    setSaving(true);
    try {
      await persistEmergencyFund({ savedAmount: 0, saved_amount: 0, currentAmount: 0, current_amount: 0, amount: 0, balance: 0, moneyLeft: 0, protectedBalance: 0, protected_balance: 0, reserveBalance: 0, reserve_balance: 0, survivalExpense: 0, survival_expense: 0, monthlyExpense: 0, monthly_expense: 0, monthly_survival_expense: 0, targetAmount: 0, target_amount: 0, target: 0, targetMonths: 3, target_months: 3, months_target: 3, linkedWalletId: null, linked_wallet_id: null, reserveWalletId: null, reserve_wallet_id: null, sourceWalletId: null, source_wallet_id: null, storageWalletId: null, storage_wallet_id: null, linkedWalletName: null, linked_wallet_name: null, reserveWalletName: null, reserve_wallet_name: null, sourceWalletName: null, source_wallet_name: null, storageWalletName: null, storage_wallet_name: null, emergencyActivityLog: [], emergency_activity_log: [], activityLog: [], activity_log: [], usageLog: [], usage_log: [], resetAt: now, reset_at: now });
      onSurvivalSaved?.(0);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SurvivalExpenseModal open={!isEmergencyFundUnconfigured && editing} initialValue={monthlyExpense > 0 ? monthlyExpense : ""} userId={user?.id} onSaved={handleSurvivalSaved} onOpenChange={(open) => !open && setEditing(false)} />
      <EmergencyFundSetupFlow open={showSetupFlow} onClose={() => setShowSetupFlow(false)} safeWallets={setupWallets} targetMonths={targetMonths} validTargetMonths={TARGET_MONTHS} onComplete={handleSetupComplete} fmt={fmt} saving={saving} />
      <EmergencyMoveModal open={!isEmergencyFundUnconfigured && Boolean(pendingStorageWallet)} onClose={() => { if (!movingFund) { setPendingStorageWalletId(""); setMoveError(""); } }} onConfirm={confirmStorageWalletMove} currentWallet={activeStorageWallet} nextWallet={pendingStorageWallet} amount={savedAmount} error={moveError} moving={movingFund} />
      <EmergencyAddModal open={!isEmergencyFundUnconfigured && showAddModal} onClose={() => { setShowAddModal(false); setAddError(""); }} wallets={safeWallets} sourceWalletId={sourceWalletId} setSourceWalletId={(value) => { setSourceWalletId(value); setAddError(""); }} amount={addAmount} setAmount={(value) => { setAddAmount(value); setAddError(""); }} error={addError} saving={saving} onSave={addEmergencyMoney} />
      <EmergencyUseModal open={!isEmergencyFundUnconfigured && showUseModal} onClose={() => { setShowUseModal(false); setUseError(""); }} amount={useAmount} setAmount={(value) => { setUseAmount(value); setUseError(""); }} reason={useReason} setReason={(value) => { setUseReason(value); setUseError(""); }} error={useError} saving={saving} onSave={useEmergencyMoney} currentReserve={savedAmount} />
      <EmergencyResetConfirmModal
        open={!isEmergencyFundUnconfigured && showResetConfirm}
        onClose={() => {
          if (!saving) setShowResetConfirm(false);
        }}
        onConfirm={async () => {
          await resetEmergencyFund();
          setShowResetConfirm(false);
        }}
        saving={saving}
      />
      <FinanceCardShell cardKey="emergencyFund" expanded={expanded} ringClass={status.ring || ""} roundedClass="rounded-3xl" glowLayerClassNames={EMERGENCY_GLOW_LAYERS} surfaceClassName="!border-white/[0.075] !bg-[linear-gradient(135deg,rgba(4,28,43,0.90),rgba(5,12,36,0.955)_44%,rgba(22,9,57,0.93))]" shadowClass="shadow-[0_26px_70px_rgba(0,0,0,0.48),0_0_26px_rgba(34,211,238,0.045),0_0_56px_rgba(88,28,135,0.11)]">
        {!expanded ? (
          <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
            <div className="relative flex min-h-0 flex-col gap-4">
              {isEmergencyFundUnconfigured ? (
                <EmergencySetupEmptyState onSetup={() => setShowSetupFlow(true)} />
              ) : (
                <div className="min-h-0 rounded-[28px] border border-white/[0.035] bg-black/[0.055] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)] backdrop-blur-[2px]">
                  <EmergencyHeader status={status} />
                  <div className="mt-3 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.014),rgba(255,255,255,0.004)_40%,rgba(0,0,0,0.10)_100%)] p-3">
                    <p className={`text-[32px] font-bold leading-none tracking-[-0.045em] ${status.text}`}>{coverageLabel}</p>
                    <p className="mt-2 text-sm font-semibold leading-tight text-white/70">Protection covered right now.</p>
                    <div className="mt-3 grid grid-cols-3 divide-x divide-white/[0.055] overflow-hidden rounded-[22px] border border-white/[0.055] bg-black/[0.105]">
                      <div className="px-2.5 py-2.5 text-center"><p className="truncate text-[13px] font-black text-white/88">{fmt(savedAmount)}</p><p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/34">Saved</p></div>
                      <div className="px-2.5 py-2.5 text-center"><p className="truncate text-[13px] font-black text-white/88">{fmt(target)}</p><p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/34">Target</p></div>
                      <div className="px-2.5 py-2.5 text-center"><p className={`truncate text-[13px] font-black ${status.text}`}>{status.label}</p><p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/34">Status</p></div>
                    </div>
                  </div>
                </div>
              )}
              <ExpandButtonRow expanded={false} onToggleDetails={onToggleDetails} />
            </div>
          </div>
        ) : isEmergencyFundUnconfigured ? (
          <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
            <div className="relative flex min-h-0 flex-1 flex-col gap-4">
              <EmergencySetupEmptyState expanded onSetup={() => setShowSetupFlow(true)} />
              <ExpandButtonRow expanded={true} onToggleDetails={onToggleDetails} />
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
            <div className="relative flex min-h-0 flex-1 flex-col gap-4">
              <div className="shrink-0">
                <p className={`text-[34px] font-black leading-none tracking-[-0.045em] ${status.text}`}>{coverageLabel}</p>
                <p className="mt-2 text-xs font-semibold leading-relaxed text-white/68">Protection covered right now.</p>
              </div>
              <ExpandButtonRow expanded={true} onToggleDetails={onToggleDetails} />
              <div className="min-h-0 flex-1 overflow-hidden pt-1">
                <FinanceCardExpandedPanel className="h-full space-y-3 overflow-y-auto pr-1">
                  <SetupSummaryBoard monthlyExpense={monthlyExpense} targetMonths={targetMonths} target={target} storageWalletId={storageWalletId} storageWalletName={storageWalletName} safeWallets={safeWallets} saving={saving} movingFund={movingFund} onChangeStorageWallet={requestStorageWalletChange} />
                  <div className="rounded-2xl border border-white/[0.045] bg-black/[0.105] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Emergency activity</span>
                      <span className="text-[10px] font-semibold text-white/38">Private log</span>
                    </div>
                    <ActivityList activity={activity} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1.5">
                    <button type="button" onClick={() => setEditing(true)} className={`flex items-center justify-center gap-1.5 rounded-2xl border px-2 py-3.5 text-[12px] font-semibold transition ${premiumActionClass}`}><Edit2 className="h-4 w-4" />Edit setup</button>
                    <button type="button" onClick={() => { if (!sourceWalletId && safeWallets.length) setSourceWalletId(getWalletId(safeWallets[0])); setShowAddModal(true); }} className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.09] px-2 py-3.5 text-[12px] font-black text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.08)] transition hover:bg-emerald-400/[0.13]"><Plus className="h-4 w-4" />Add</button>
                    <button type="button" onClick={() => setShowUseModal(true)} disabled={savedAmount <= 0} className="flex items-center justify-center gap-1.5 rounded-2xl border border-amber-300/18 bg-amber-400/[0.08] px-2 py-3.5 text-[12px] font-black text-amber-100/90 shadow-[0_0_18px_rgba(251,191,36,0.06)] transition hover:bg-amber-400/[0.13] disabled:cursor-not-allowed disabled:opacity-45"><MinusCircle className="h-4 w-4" />Use</button>
                    <button type="button" onClick={() => setShowResetConfirm(true)} disabled={saving} className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] px-2 py-3.5 text-[12px] font-black text-rose-100/90 shadow-[0_0_18px_rgba(244,63,94,0.06)] transition hover:bg-rose-400/[0.13] disabled:opacity-60"><RotateCcw className="h-4 w-4" />Reset</button>
                  </div>
                  <div aria-hidden="true" className="h-5 shrink-0" />
                </FinanceCardExpandedPanel>
              </div>
            </div>
          </div>
        )}
      </FinanceCardShell>
    </>
  );
}

export { premiumActionClass, expandButtonClass, EMERGENCY_GLOW_LAYERS };
