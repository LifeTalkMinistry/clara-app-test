import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  fmt,
  formatHistoryDate,
  getHistoryAmountPrefix,
  getHistoryTypeLabel,
} from "@/components/financial-carousel/cards/wallet/logic/useWalletCardLogic";

const MAX_VISIBLE_TRANSFERS = 5;

const normalizeTransactionType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const isTransferTransaction = (transaction) => {
  const type = normalizeTransactionType(transaction?.type);
  return type === "transfer_in" || type === "transfer_out";
};

const getTransactionTime = (transaction) => {
  const value =
    transaction?.transaction_date ||
    transaction?.date ||
    transaction?.created_at ||
    transaction?.updated_at;
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

export default function WalletRecentActivity({ transactions = [] }) {
  const [expanded, setExpanded] = useState(false);

  const recentTransfers = useMemo(
    () =>
      (Array.isArray(transactions) ? [...transactions] : [])
        .filter(isTransferTransaction)
        .sort((left, right) => getTransactionTime(right) - getTransactionTime(left))
        .slice(0, MAX_VISIBLE_TRANSFERS),
    [transactions]
  );

  if (!recentTransfers.length) return null;

  const historyId = "wallet-recent-transfer-history";
  const countLabel = `${recentTransfers.length} recent ${
    recentTransfers.length === 1 ? "transfer" : "transfers"
  }`;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={historyId}
        onClick={() => setExpanded((current) => !current)}
        className="flex min-h-[52px] w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition hover:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-200/45"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-white/72">
            Transfer history
          </span>
          <span className="mt-1 block text-[10px] font-semibold text-white/38">
            {countLabel}
          </span>
        </span>

        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/[0.09] bg-white/[0.045] text-white/58">
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>

      {expanded ? (
        <div
          id={historyId}
          className="space-y-2 border-t border-white/[0.055] px-3 py-3"
        >
          {recentTransfers.map((item, index) => (
            <div
              key={item.id || `${item.type}-${index}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.075] bg-white/[0.04] px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-black text-white/86">
                  {getHistoryTypeLabel(item.type)}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-white/40">
                  {formatHistoryDate(
                    item.transaction_date || item.date || item.created_at
                  )}
                </p>
              </div>

              <p className="shrink-0 text-[12px] font-black text-white/84">
                {getHistoryAmountPrefix(item.type)}
                {fmt(item.amount || 0)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
