import {
  ArrowLeft,
  CalendarDays,
  Receipt,
  Search,
  X,
} from "lucide-react";
import {
  DEFAULT_THEME,
  FILTERS,
  getLast12Months,
  peso,
} from "@/components/fresh/transaction-hub/logic/transactionHubUtils";
import {
  GlassDropdown,
  InsightCard,
  SummaryCard,
} from "@/components/fresh/transaction-hub/ui/TransactionHubPrimitives";
import TimelineDropdown from "@/components/fresh/transaction-hub/ui/TimelineDropdown";

const noop = () => {};

function guideDate(daysAgo = 0, hour = 10, minute = 0) {
  const value = new Date();
  value.setDate(value.getDate() - daysAgo);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
}

const GUIDE_TRANSACTIONS = Object.freeze({
  today: [
    {
      id: "guide-expense-food",
      raw: {
        id: "guide-expense-food",
        planning_status: "planned",
      },
      date: guideDate(0, 12, 15),
      group: "expense",
      type: "expense",
      title: "Lunch",
      category: "Food",
      walletName: "Main Wallet",
      amount: 120,
      signedAmount: -120,
      note: "Recorded from the quick expense logger.",
      budgetStatus: "planned",
      isGoodDecision: true,
      isBudgetRisk: false,
      isFrequent: false,
      isHighSpend: false,
    },
    {
      id: "guide-income-salary",
      raw: {
        id: "guide-income-salary",
        type: "income",
      },
      date: guideDate(0, 8, 30),
      group: "income",
      type: "income",
      title: "Salary",
      category: "Primary Income",
      walletName: "Main Wallet",
      amount: 25000,
      signedAmount: 25000,
      note: "Monthly salary received.",
    },
  ],
  yesterday: [
    {
      id: "guide-transfer-savings",
      raw: {
        id: "guide-transfer-savings",
        type: "transfer",
      },
      date: guideDate(1, 18, 10),
      group: "transfer",
      type: "transfer",
      title: "Savings Transfer",
      category: "Transfer",
      walletName: "Main Wallet → Savings",
      amount: 2000,
      signedAmount: 0,
      note: "Moved money into the savings wallet.",
    },
  ],
  thisWeek: [
    {
      id: "guide-expense-transport",
      raw: {
        id: "guide-expense-transport",
        planning_status: "planned",
      },
      date: guideDate(3, 7, 45),
      group: "expense",
      type: "expense",
      title: "Transportation",
      category: "Transport",
      walletName: "Main Wallet",
      amount: 350,
      signedAmount: -350,
      note: "Work commute expense.",
      budgetStatus: "planned",
      isGoodDecision: true,
      isBudgetRisk: false,
      isFrequent: false,
      isHighSpend: false,
    },
  ],
});

const GUIDE_TIMELINE_GROUPS = Object.freeze([
  { key: "today", label: "Today", items: GUIDE_TRANSACTIONS.today },
  { key: "yesterday", label: "Yesterday", items: GUIDE_TRANSACTIONS.yesterday },
  { key: "thisWeek", label: "This Week", items: GUIDE_TRANSACTIONS.thisWeek },
]);

export default function ClaraGuideTransactionHubPreview({ onNext }) {
  const theme = DEFAULT_THEME;
  const months = getLast12Months();
  const currentMonth = months[0] || { key: "current", label: "This month" };
  const monthOptions = months.map((item) => ({ key: item.key, label: item.label }));
  const filterOptions = FILTERS.map(([key, label]) => ({ key, label }));
  const moneyOut = 470;
  const moneyIn = 25000;
  const netFlow = moneyIn - moneyOut;

  return (
    <div
      className="fixed inset-0 z-[260] overflow-hidden bg-[#020713] text-white"
      data-clara-guide-orb-preview="true"
      data-clara-guide-transaction-hub-preview="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clara-guide-transaction-hub-title"
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[color:var(--clara-theme-soft,rgba(148,163,184,0.08))] blur-3xl" />
        <div className="absolute -right-28 top-40 h-72 w-72 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.075))] blur-3xl" />
        <div className="absolute -bottom-20 -left-28 h-80 w-80 rounded-full bg-white/[0.035] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex h-[100dvh] w-full max-w-4xl flex-col">
        <header className="shrink-0 px-4 pb-2 pt-[calc(1rem+env(safe-area-inset-top))] md:px-6">
          <div className="flex items-center justify-between gap-3 px-1 pb-0.5 pt-1">
            <button
              type="button"
              onClick={onNext}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border ${theme.border} ${theme.orb} text-white/82 shadow-[0_14px_34px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition duration-200 active:scale-[0.96]`}
              aria-label="Close Transaction Hub demonstration and continue"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1 px-2 text-center">
              <p
                id="clara-guide-transaction-hub-title"
                className="truncate text-[13px] font-black tracking-tight text-white/86"
              >
                Transaction Hub
              </p>
              <p className="mx-auto mt-0.5 max-w-[150px] truncate whitespace-nowrap text-[10px] font-semibold text-white/44">
                {currentMonth.label}
              </p>
            </div>

            <button
              type="button"
              onClick={onNext}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border ${theme.border} ${theme.orb} text-white/82 shadow-[0_14px_34px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition duration-200 active:scale-[0.96]`}
              aria-label="Close Transaction Hub demonstration and continue"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 md:px-6">
          <main
            className="mx-auto max-w-4xl space-y-3.5"
            inert=""
            aria-disabled="true"
          >
            <section className="grid grid-cols-2 gap-2">
              <GlassDropdown
                label="Month"
                icon={CalendarDays}
                value={currentMonth.key}
                options={monthOptions}
                onChange={noop}
                onAfterChange={noop}
                theme={theme}
              />

              <GlassDropdown
                label="Filter"
                icon={Receipt}
                value="all"
                options={filterOptions}
                onChange={noop}
                onAfterChange={noop}
                theme={theme}
              />
            </section>

            <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <SummaryCard
                label="Money Out"
                value={`-${peso(moneyOut)}`}
                helper="Monthly expenses"
                tone="rose"
              />
              <SummaryCard
                label="Money In"
                value={`+${peso(moneyIn)}`}
                helper="Monthly income"
                tone="emerald"
              />
              <SummaryCard
                label="Net Flow"
                value={`+${peso(netFlow)}`}
                helper="Positive month"
                tone="emerald"
              />
              <SummaryCard
                label="Shown"
                value="4"
                helper="Current view"
                tone="cyan"
              />
            </section>

            <InsightCard
              insight="Your planned expenses are staying aligned this month."
              theme={theme}
            />

            <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] p-2.5 shadow-[0_18px_52px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute -left-20 -top-20 h-36 w-36 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.07))] blur-3xl" />
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
                <input
                  value=""
                  readOnly
                  aria-label="Static transaction search demonstration"
                  placeholder="Search transactions"
                  className={`min-h-[50px] w-full rounded-[20px] border border-white/10 bg-black/[0.26] pl-11 pr-4 text-sm font-medium text-white shadow-inner shadow-black/18 outline-none backdrop-blur-2xl placeholder:text-white/32 ${theme.focus}`}
                />
              </div>
            </section>

            <section className="space-y-2.5">
              {GUIDE_TIMELINE_GROUPS.map((group) => (
                <TimelineDropdown
                  key={group.key}
                  group={group}
                  items={group.items}
                  isOpen={group.key === "today"}
                  onEdit={noop}
                  theme={theme}
                  onToggle={noop}
                />
              ))}
            </section>
          </main>
        </div>

        <footer className="shrink-0 border-t border-white/10 bg-[#06101d]/92 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-14px_46px_rgba(0,0,0,0.38)] backdrop-blur-2xl md:px-6">
          <div className="mx-auto grid max-w-4xl gap-3">
            <p className="rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.07] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
              GUIDE MODE — NO REAL TRANSACTIONS WERE OPENED OR CHANGED
            </p>

            <div className="flex justify-end">
              <button
                type="button"
                data-clara-guide-orb-preview-next="true"
                onClick={onNext}
                className="inline-flex min-h-[44px] min-w-[108px] items-center justify-center rounded-full border border-cyan-100/30 bg-[linear-gradient(135deg,rgba(207,250,254,0.18),rgba(103,232,249,0.10)_48%,rgba(129,140,248,0.13))] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-50 shadow-[0_12px_34px_rgba(2,8,23,0.38),0_0_22px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:border-cyan-100/45 hover:bg-cyan-100/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.985]"
              >
                Next
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
