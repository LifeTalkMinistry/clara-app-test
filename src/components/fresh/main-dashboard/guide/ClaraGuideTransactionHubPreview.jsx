import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

const PREVIEW_INTERACTION_ARM_DELAY = 520;
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
  const [actionsArmed, setActionsArmed] = useState(false);
  const theme = DEFAULT_THEME;
  const months = getLast12Months();
  const currentMonth = months[0] || { key: "current", label: "This month" };
  const monthOptions = months.map((item) => ({ key: item.key, label: item.label }));
  const filterOptions = FILTERS.map(([key, label]) => ({ key, label }));
  const moneyOut = 470;
  const moneyIn = 25000;
  const netFlow = moneyIn - moneyOut;

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    const timer = window.setTimeout(() => {
      setActionsArmed(true);
    }, PREVIEW_INTERACTION_ARM_DELAY);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, []);

  const blockOpeningGesture = useCallback(
    (event) => {
      if (actionsArmed) return;

      event.preventDefault?.();
      event.stopPropagation?.();
      event.nativeEvent?.stopImmediatePropagation?.();
    },
    [actionsArmed]
  );

  const handleAdvance = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.nativeEvent?.stopImmediatePropagation?.();

      if (!actionsArmed) return;
      onNext?.();
    },
    [actionsArmed, onNext]
  );

  const preview = (
    <div
      className="fixed inset-0 z-[320] isolate overflow-hidden bg-[#020713] text-white"
      data-clara-guide-orb-preview="true"
      data-clara-guide-transaction-hub-preview="true"
      data-clara-guide-preview-actions-armed={actionsArmed ? "true" : "false"}
      role="dialog"
      aria-modal="true"
      aria-labelledby="clara-guide-transaction-hub-title"
      onClickCapture={blockOpeningGesture}
      onDoubleClickCapture={blockOpeningGesture}
      onPointerUpCapture={blockOpeningGesture}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,#020713_0%,#030a17_100%)]">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/[0.09] blur-3xl" />
        <div className="absolute -right-24 top-32 h-64 w-64 rounded-full bg-violet-400/[0.09] blur-3xl" />
        <div className="absolute -bottom-20 -left-24 h-72 w-72 rounded-full bg-white/[0.025] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-[#020713]/96 shadow-[0_0_80px_rgba(0,0,0,0.48)]">
        <header className="shrink-0 border-b border-white/8 bg-[#06101d]/82 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleAdvance}
              disabled={!actionsArmed}
              aria-disabled={!actionsArmed}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border ${theme.border} ${theme.orb} text-white/82 shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition duration-200 disabled:pointer-events-none disabled:opacity-65 active:scale-[0.96]`}
              aria-label="Close Transaction Hub demonstration and continue"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p
                id="clara-guide-transaction-hub-title"
                className="truncate text-[14px] font-black tracking-tight text-white/92"
              >
                Transaction Hub
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-white/42">
                {currentMonth.label}
              </p>
            </div>

            <button
              type="button"
              onClick={handleAdvance}
              disabled={!actionsArmed}
              aria-disabled={!actionsArmed}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border ${theme.border} ${theme.orb} text-white/82 shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition duration-200 disabled:pointer-events-none disabled:opacity-65 active:scale-[0.96]`}
              aria-label="Close Transaction Hub demonstration and continue"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <main
            className="space-y-3"
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

            <section className="grid grid-cols-2 gap-2">
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

            <section className="space-y-2.5 pb-1">
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

        <footer className="shrink-0 border-t border-white/10 bg-[#06101d]/94 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-12px_36px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.13em] text-cyan-100/72">
                Guide mode
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-white/42">
                Static sample data only
              </p>
            </div>

            <button
              type="button"
              data-clara-guide-orb-preview-next="true"
              onClick={handleAdvance}
              disabled={!actionsArmed}
              aria-disabled={!actionsArmed}
              className="inline-flex min-h-[42px] min-w-[104px] shrink-0 items-center justify-center rounded-full border border-cyan-100/30 bg-[linear-gradient(135deg,rgba(207,250,254,0.18),rgba(103,232,249,0.10)_48%,rgba(129,140,248,0.13))] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-50 shadow-[0_10px_28px_rgba(2,8,23,0.34),0_0_18px_rgba(34,211,238,0.10),inset_0_1px_0_rgba(255,255,255,0.14)] transition disabled:pointer-events-none disabled:opacity-65 hover:border-cyan-100/45 hover:bg-cyan-100/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.985]"
            >
              Next
            </button>
          </div>
        </footer>
      </div>
    </div>
  );

  if (typeof document === "undefined") return preview;
  return createPortal(preview, document.body);
}
