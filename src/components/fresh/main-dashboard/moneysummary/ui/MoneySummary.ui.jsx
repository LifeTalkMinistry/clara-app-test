import { ReceiptText, WalletCards } from "lucide-react";
import StatCard from "@/components/StatCard";

export default function MoneySummaryUI({
  walletMoney = 0,
  totalExpenses = 0,
  loading = false,
  isRefreshing = false,
  moneyLeftValue,
  totalExpenseValue,
  statusText,
}) {
  return (
    <section className="space-y-3" aria-label="Money summary">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
            Money Summary
          </p>
          <h2 className="mt-1 text-base font-semibold text-white">Today&apos;s snapshot</h2>
        </div>

        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-white/45 backdrop-blur-xl">
          {statusText}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Money Left"
          value={moneyLeftValue}
          sub="Available across wallets"
          icon={WalletCards}
          variant="green"
          className="min-h-[132px] rounded-[28px]"
        />

        <StatCard
          label="Total Expense"
          value={totalExpenseValue}
          sub="Tracked this month"
          icon={ReceiptText}
          variant="blue"
          className="min-h-[132px] rounded-[28px]"
        />
      </div>
    </section>
  );
}
