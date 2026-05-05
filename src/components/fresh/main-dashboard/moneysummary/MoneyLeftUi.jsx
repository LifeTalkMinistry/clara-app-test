import { EyeOff, Plus } from "lucide-react";

const formatCurrency = (value) => {
  const number = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(number) ? number : 0);
};

export default function MoneyLeftUi({
  walletMoney = 0,
  totalExpenses = 0,
  loading = false,
  isRefreshing = false,
}) {
  const moneyLeftValue = formatCurrency(walletMoney);
  const totalExpenseValue = formatCurrency(totalExpenses);
  const isNegative = Number(walletMoney) < 0;

  return (
    <section className="space-y-3" aria-label="Money summary">
      <div className="relative overflow-hidden rounded-[28px] border border-cyan-300/25 bg-[radial-gradient(circle_at_88%_22%,rgba(45,212,191,0.22),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.22),rgba(30,64,175,0.36)_44%,rgba(147,51,234,0.28))] px-4 py-4 shadow-[0_18px_45px_rgba(2,6,23,0.35)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 bg-white/[0.035]" />
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-blue-500/20 blur-2xl" />

        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-100/65">
                Total Money Left
              </p>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/15 text-white/55 backdrop-blur-xl">
                <EyeOff size={13} strokeWidth={2.2} />
              </span>
            </div>

            <h2 className={`mt-3 truncate text-[30px] font-black leading-none tracking-[-0.05em] text-white ${isNegative ? "text-rose-50" : ""}`}>
              {moneyLeftValue}
            </h2>

            <p className="mt-2 text-[11px] font-medium leading-snug text-white/55">
              {loading
                ? "Loading your safe spending snapshot."
                : isRefreshing
                  ? "Refreshing quietly in the background."
                  : `${totalExpenseValue} tracked expenses this month.`}
            </p>
          </div>

          <button
            type="button"
            aria-label="Add money"
            className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full border border-cyan-200/30 bg-slate-950/55 text-cyan-200 shadow-[0_0_0_6px_rgba(34,211,238,0.10),0_18px_36px_rgba(0,0,0,0.35),inset_0_0_18px_rgba(34,211,238,0.12)] backdrop-blur-xl transition active:scale-95"
          >
            <Plus size={27} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </section>
  );
}
