import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  fmt,
  formatHistoryDate,
  getHistoryAmountPrefix,
  getHistoryTypeLabel,
} from "@/components/financial-carousel/cards/wallet/logic/useWalletCardLogic";
import { FINANCE_ITEM_HIERARCHY_TONES } from "@/components/financial-carousel/shared/financeItemHierarchy";
import { PremiumFinanceItemSurface } from "@/components/financial-carousel/shared/PremiumFinanceItemSurface";

const isTransferTransaction = (transaction) => {
  const type = String(transaction?.type || "").trim().toLowerCase();
  return type === "transfer_in" || type === "transfer_out";
};

const getTransferTone = (type) => {
  const normalized = String(type || "").trim().toLowerCase();
  return normalized === "transfer_in"
    ? FINANCE_ITEM_HIERARCHY_TONES.emerald || FINANCE_ITEM_HIERARCHY_TONES.neutral
    : FINANCE_ITEM_HIERARCHY_TONES.cyan || FINANCE_ITEM_HIERARCHY_TONES.neutral;
};

export default function WalletTransferHistory({ transactions = [] }) {
  const [expanded, setExpanded] = useState(false);
  const transfers = useMemo(
    () =>
      (Array.isArray(transactions) ? transactions : [])
        .filter(isTransferTransaction)
        .slice(0, 8),
    [transactions]
  );

  if (!transfers.length) return null;

  return (
    <PremiumFinanceItemSurface
      tone={FINANCE_ITEM_HIERARCHY_TONES.neutral}
      rail={false}
      glow={false}
      className="p-3"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/44">
          Transfer history
        </span>
        <ChevronDown
          className={`h-4 w-4 text-white/58 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded ? (
        <div className="mt-3 max-h-[280px] space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {transfers.map((item, index) => (
            <PremiumFinanceItemSurface
              key={item.id || `${item.type}-${index}`}
              tone={getTransferTone(item.type)}
              glow={false}
              className="px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-black text-white/84">
                    {getHistoryTypeLabel(item.type)}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-white/38">
                    {formatHistoryDate(
                      item.transaction_date || item.date || item.created_at
                    )}
                  </p>
                </div>
                <p className="shrink-0 text-[12px] font-black text-white/82">
                  {getHistoryAmountPrefix(item.type)}
                  {fmt(item.amount || 0)}
                </p>
              </div>
            </PremiumFinanceItemSurface>
          ))}
        </div>
      ) : null}
    </PremiumFinanceItemSurface>
  );
}
