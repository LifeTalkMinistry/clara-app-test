import { Shield, WalletCards } from "lucide-react";

import { FINANCE_ITEM_HIERARCHY_TONES } from "@/components/financial-carousel/shared/financeItemHierarchy";
import {
  PremiumFinanceIconTile,
  PremiumFinanceInfoRow,
  PremiumFinanceItemSurface,
} from "@/components/financial-carousel/shared/PremiumFinanceItemSurface";

const PROTECTED_FUND_TONE = { key: "protected", name: "Protected Fund", rgb: "45 212 191" };
const EMERGENCY_ACTIVITY_TONES = {
  added: { key: "added", name: "Added", rgb: "52 211 153" },
  usage: { key: "usage", name: "Usage", rgb: "251 191 36" },
  correction: { key: "correction", name: "Correction", rgb: "167 139 250" },
  transfer: { key: "transfer", name: "Storage Transfer", rgb: "96 165 250" },
  unknown: FINANCE_ITEM_HIERARCHY_TONES.neutral,
};

function activityText(item = {}) {
  return [
    item?.type,
    item?.title,
    item?.reason,
    item?.category,
    item?.note,
    item?.notes,
    item?.description,
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");
}

function getActivityMeta(item = {}, toNumber) {
  const text = activityText(item);
  const type = String(item?.type || "").toLowerCase();
  const amount = Math.abs(toNumber(item?.amount ?? item?.value ?? item?.total ?? 0));
  const before = toNumber(item?.balanceBefore ?? item?.balance_before);
  const after = toNumber(item?.balanceAfter ?? item?.balance_after);
  const hasBalanceDirection =
    (item?.balanceBefore ?? item?.balance_before) !== undefined &&
    (item?.balanceAfter ?? item?.balance_after) !== undefined;
  const isError = /error|failed|invalid|destructive/.test(text);

  let semantic = "unknown";
  if (/correction|reversal|reverse/.test(text)) semantic = "correction";
  else if (/storage_wallet|storage wallet|wallet transfer|moved from|moved to/.test(text) || type.includes("transfer")) semantic = "transfer";
  else if (/\b(use|used|withdraw|withdrawal|expense|spent)\b/.test(text)) semantic = "usage";
  else if (/allocation|deposit|top.?up|added|add money|funded/.test(text)) semantic = "added";

  let direction = "none";
  if (hasBalanceDirection && after < before) direction = "decrease";
  else if (hasBalanceDirection && after > before) direction = "increase";
  else if (semantic === "usage") direction = "decrease";
  else if (semantic === "added") direction = "increase";
  else if (semantic === "correction" && /reversal|reverse/.test(text)) direction = "decrease";

  const amountClassName = isError
    ? "text-rose-200"
    : direction === "decrease"
      ? "text-amber-100"
      : direction === "increase"
        ? "text-emerald-200"
        : semantic === "correction"
          ? "text-violet-200"
          : semantic === "transfer"
            ? "text-sky-200"
            : "text-white/72";

  return {
    amount,
    semantic,
    tone: EMERGENCY_ACTIVITY_TONES[semantic],
    prefix: direction === "decrease" ? "-" : direction === "increase" ? "+" : "",
    amountClassName,
  };
}

export function SetupSummaryBoard({
  monthlyExpense,
  targetMonths,
  target,
  storageWalletId,
  storageWalletName,
  safeWallets,
  saving,
  movingFund,
  onChangeStorageWallet,
  fmt,
  getWalletId,
  getWalletName,
  getWalletBalance,
}) {
  return (
    <PremiumFinanceItemSurface tone={PROTECTED_FUND_TONE} className="p-3.5">
      <div className="flex items-start gap-3">
        <PremiumFinanceIconTile tone={PROTECTED_FUND_TONE}>
          <Shield className="h-5 w-5" />
        </PremiumFinanceIconTile>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/52">Emergency setup</p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-300/16 bg-emerald-400/[0.08] px-2.5 py-1 text-[10px] font-black text-emerald-100/90">{targetMonths} months</span>
      </div>

      <div className="mt-3 divide-y divide-white/[0.06] border-y border-white/[0.06]">
        <PremiumFinanceInfoRow label="Monthly survival" value={fmt(monthlyExpense)} valueClassName="text-white/94" />
        <PremiumFinanceInfoRow label="Protection target" value={fmt(target)} valueClassName="text-emerald-100" />
      </div>

      <div className="mt-3 rounded-2xl border border-cyan-300/12 bg-cyan-400/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="mb-2.5 flex items-center gap-2">
          <WalletCards className="h-4 w-4 shrink-0 text-cyan-100" />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/48">Storage wallet</p>
            <p className="mt-0.5 truncate text-[12px] font-black text-white/84">{storageWalletName}</p>
          </div>
        </div>
        <select
          value={storageWalletId || ""}
          onChange={(event) => onChangeStorageWallet(event.target.value)}
          disabled={saving || movingFund || !safeWallets.length}
          className="w-full rounded-2xl border border-white/[0.08] bg-black/[0.18] px-3.5 py-3 text-[13px] font-black text-white outline-none transition focus:border-cyan-300/24 disabled:opacity-60"
        >
          <option value="" className="bg-slate-950">Choose storage wallet</option>
          {safeWallets.map((wallet) => (
            <option key={getWalletId(wallet)} value={getWalletId(wallet)} className="bg-slate-950">
              {getWalletName(wallet)} • {fmt(getWalletBalance(wallet))}
            </option>
          ))}
        </select>
      </div>
    </PremiumFinanceItemSurface>
  );
}

export function ActivityList({ activity, fmt, toNumber }) {
  const latest = activity.slice(0, 4);

  if (!latest.length) {
    return (
      <PremiumFinanceItemSurface tone={FINANCE_ITEM_HIERARCHY_TONES.neutral} glow={false} className="px-4 py-4 text-center">
        <p className="text-[12px] font-black text-white/76">No emergency activity yet</p>
        <p className="mt-1.5 text-[10.5px] font-semibold leading-5 text-white/38">CLARA will keep a private log here when this reserve changes.</p>
      </PremiumFinanceItemSurface>
    );
  }

  return (
    <div className="space-y-2.5">
      {latest.map((item, index) => {
        const meta = getActivityMeta(item, toNumber);
        const createdAt = item?.createdAt || item?.created_at || item?.date || null;
        const parsedDate = createdAt ? new Date(createdAt) : null;
        const dateLabel = parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
          : "Date unavailable";
        const title = item?.title || item?.reason || (meta.semantic === "usage" ? "Emergency usage" : meta.semantic === "transfer" ? "Storage wallet move" : meta.semantic === "correction" ? "Balance correction" : meta.semantic === "added" ? "Emergency deposit" : "Emergency activity");
        const note = item?.note || item?.notes || item?.description || "";

        return (
          <PremiumFinanceItemSurface
            key={item?.id || item?.emergency_fund_transaction_id || `${createdAt || "activity"}-${meta.amount}-${index}`}
            tone={meta.tone}
            glow={meta.semantic !== "unknown"}
            className="px-3.5 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-black text-white/86">{title}</p>
                <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-white/38">
                  {dateLabel}{note ? ` • ${note}` : ""}
                </p>
              </div>
              <p className={`shrink-0 text-[12px] font-black ${meta.amountClassName}`}>
                {meta.prefix}{fmt(meta.amount)}
              </p>
            </div>
          </PremiumFinanceItemSurface>
        );
      })}
    </div>
  );
}

export { PROTECTED_FUND_TONE };
