import { useEffect, useMemo, useRef, useState } from "react";
import { Box, MessageCircle, Sparkles } from "lucide-react";
import BudgetCard from "@/components/BudgetCard";

const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";

const FALLBACK_MESSAGES = [];
const HIDDEN_WELCOME_TEXT = "What are you thinking of buying?";

const GUIDE_GROUPS = [
  {
    key: "cards",
    label: "Core Features",
    Icon: Box,
    iconClassName: "text-cyan-200",
    activeClassName:
      "border-cyan-100/42 bg-cyan-300/[0.13] text-white shadow-[0_0_26px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.11)]",
    inactiveClassName:
      "border-white/10 bg-white/[0.045] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]",
  },
  {
    key: "smart_actions",
    label: "Smart Actions",
    Icon: Sparkles,
    iconClassName: "text-violet-200",
    activeClassName:
      "border-violet-100/40 bg-violet-300/[0.12] text-white shadow-[0_0_24px_rgba(196,181,253,0.15),inset_0_1px_0_rgba(255,255,255,0.10)]",
    inactiveClassName:
      "border-white/10 bg-white/[0.04] text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.048)]",
  },
  {
    key: "advice",
    label: "Ask Advice",
    Icon: MessageCircle,
    iconClassName: "text-fuchsia-200",
    activeClassName:
      "border-fuchsia-100/38 bg-fuchsia-300/[0.11] text-white shadow-[0_0_22px_rgba(217,70,239,0.14),inset_0_1px_0_rgba(255,255,255,0.09)]",
    inactiveClassName:
      "border-white/10 bg-white/[0.035] text-white/66 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  },
];

const GUIDE_BUBBLE_CAROUSELS = {
  cards: [
    "Budget Plan",
    "Wallets",
    "Savings Goals",
    "Emergency Fund",
    "Transactions",
    "Monthly Spending",
    "Transfers",
    "Expense Tracking",
    "Financial Calendar",
    "Income Tracking",
    "Budget Categories",
    "Spending History",
    "Money Left",
    "Planned vs Unplanned",
    "Undocumented Spending",
    "Subscription Tracking",
    "Debt Tracking",
    "Bills & Due Dates",
    "Survival Days",
    "Goal Progress",
  ],
  smart_actions: [
    "Future Money Forecast",
    "Spending Checkup",
    "Savings Game Plan",
    "Emergency Fund Builder",
    "Can I Afford This?",
    "Budget Fixer",
    "Hidden Risk Check",
    "Monthly Money Review",
    "Next Best Move",
  ],
  advice: [
    "Can I buy this?",
    "Predict my month",
    "What if I overspend?",
    "How much can I still spend?",
    "Am I doing okay?",
    "Future me",
    "Survive until payday",
    "Delay or buy?",
    "Where did my money go?",
    "Can I afford this next week?",
    "Is this impulsive?",
    "What should I avoid?",
    "What's hurting my budget?",
  ],
};

function GuideActionCard({ active, group, onClick }) {
  const Icon = group.Icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-[74px] min-w-0 flex-1 flex-col items-center justify-center gap-2 rounded-[22px] border px-2.5 text-center backdrop-blur-xl transition duration-200 hover:bg-white/[0.07] hover:text-white active:scale-[0.98] ${
        active ? group.activeClassName : group.inactiveClassName
      }`}
    >
      <Icon className={`h-5 w-5 ${group.iconClassName}`} strokeWidth={1.8} />
      <span className="whitespace-nowrap text-[10.5px] font-black leading-none tracking-tight">
        {group.label}
      </span>
    </button>
  );
}

function ClaraQuickActions({ activeGroup, onSelectGroup }) {
  const currentGroup = activeGroup || "cards";

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-3 px-1">
        <div className="h-px flex-1 bg-white/[0.045]" />
        <p className="text-[10.5px] font-bold tracking-wide text-white/30">
          Quick actions
        </p>
        <div className="h-px flex-1 bg-white/[0.045]" />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {GUIDE_GROUPS.map((group) => (
          <GuideActionCard
            key={group.key}
            group={group}
            active={currentGroup === group.key}
            onClick={() => onSelectGroup(group.key)}
          />
        ))}
      </div>
    </div>
  );
}

function ClaraGuideBubbleCarousel({ activeGroup }) {
  const items = GUIDE_BUBBLE_CAROUSELS[activeGroup] || GUIDE_BUBBLE_CAROUSELS.cards;

  return (
    <div className="min-w-0 flex-1 overflow-hidden">
      <div className="flex snap-x gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <div
            key={item}
            className="min-w-fit snap-start rounded-[20px] border border-white/[0.07] bg-white/[0.035] px-4 py-2 text-[11px] font-semibold leading-5 text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-xl"
          >
            <p className="whitespace-nowrap font-black text-white/92">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClaraBudgetDecisionScreen({
  messages = FALLBACK_MESSAGES,
  selectedDashboardTheme,
  activeGuideGroup = "cards",
  onSelectGuideGroup,
  onMinimize,
}) {
  const messagesEndRef = useRef(null);

  const visibleMessages = useMemo(() => {
    const source = Array.isArray(messages) && messages.length ? messages : FALLBACK_MESSAGES;
    return source.filter((message) => String(message?.text || "").trim() !== HIDDEN_WELCOME_TEXT);
  }, [messages]);

  const hasActiveConversation = visibleMessages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleMessages]);

  return (
    <div className="relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border border-cyan-200/18 bg-slate-950/88 p-4 text-white backdrop-blur-2xl">
      <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-0 h-48 w-48 rounded-full bg-indigo-400/12 blur-3xl" />

      <div className="relative z-20 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0 max-w-[235px]">
          <h3 className="text-[1.18rem] font-black leading-none tracking-tight text-white">
            Ask before you spend.
          </h3>
        </div>

        <button
          type="button"
          onClick={onMinimize}
          className="flex h-[30px] shrink-0 items-center justify-center rounded-full border border-cyan-100/12 bg-white/[0.05] px-3 text-[9.5px] font-black uppercase tracking-[0.10em] text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.065)] backdrop-blur-xl transition hover:border-cyan-100/18 hover:bg-white/[0.075] hover:text-white/76 active:scale-95"
          aria-label="Close CLARA budget lens"
        >
          Close
        </button>
      </div>

      {!hasActiveConversation && (
        <div className="relative z-10 mt-6 flex min-h-0 flex-1 flex-col justify-end gap-5 pb-1">
          <div className="flex items-center">
            <ClaraGuideBubbleCarousel activeGroup={activeGuideGroup} />
          </div>

          <ClaraQuickActions
            activeGroup={activeGuideGroup}
            onSelectGroup={onSelectGuideGroup}
          />
        </div>
      )}

      {hasActiveConversation && (
        <div className="relative z-10 mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {visibleMessages.map((message) => {
            const isUser = message.role === "user";

            return (
              <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-[11px] font-medium leading-4 ${
                    isUser
                      ? "bg-emerald-300 text-slate-950"
                      : "border border-white/10 bg-white/[0.075] text-white/86"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} className="h-1 shrink-0" />
        </div>
      )}
    </div>
  );
}

export default function BudgetCardView({
  data = {},
  selectedDashboardTheme,
  expandedFinanceCard,
  toggleFinanceDetails,
  financeActionLoading,
  onSaveBudget,
  onEditBudgetCategory,
  onDeleteBudgetCategory,
  onResetBudget,
}) {
  const [claraChatState, setClaraChatState] = useState({
    active: false,
    messages: FALLBACK_MESSAGES,
    activeGuideGroup: "cards",
  });

  useEffect(() => {
    const handleClaraMoneyChat = (event) => {
      const detail = event?.detail || {};

      setClaraChatState((current) => ({
        active: Boolean(detail.active),
        messages: Array.isArray(detail.messages) && detail.messages.length
          ? detail.messages
          : FALLBACK_MESSAGES,
        activeGuideGroup: detail.activeGuideGroup || current.activeGuideGroup || "cards",
      }));
    };

    window.addEventListener(CLARA_MONEY_CHAT_EVENT, handleClaraMoneyChat);

    return () => {
      window.removeEventListener(CLARA_MONEY_CHAT_EVENT, handleClaraMoneyChat);
    };
  }, []);

  const selectGuideGroup = (groupKey) => {
    setClaraChatState((current) => ({
      ...current,
      activeGuideGroup: groupKey,
    }));
  };

  const minimizeClaraChat = () => {
    setClaraChatState((current) => ({
      ...current,
      active: false,
      messages: FALLBACK_MESSAGES,
    }));

    window.dispatchEvent(
      new CustomEvent(CLARA_MONEY_CHAT_EVENT, {
        detail: {
          active: false,
          messages: FALLBACK_MESSAGES,
        },
      })
    );

    if (expandedFinanceCard === "budgets") {
      toggleFinanceDetails?.("budgets");
    }
  };

  if (claraChatState.active) {
    return (
      <div className="flex h-full min-h-[inherit] flex-col">
        <ClaraBudgetDecisionScreen
          messages={claraChatState.messages}
          selectedDashboardTheme={selectedDashboardTheme}
          activeGuideGroup={claraChatState.activeGuideGroup}
          onSelectGuideGroup={selectGuideGroup}
          onMinimize={minimizeClaraChat}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[inherit] flex-col">
      <BudgetCard
        activeBudget={data.activeBudget}
        budgetCategories={data.budgetCategories}
        declaredBudget={data.declaredBudget}
        unallocatedAmount={data.unallocatedAmount}
        budgetStatus={data.budgetStatus}
        isComplete={data.isComplete}
        unplannedSpent={data.unplannedSpent}
        undocumentedSpent={data.undocumentedSpent}
        remainingAmount={data.remainingAmount}
        amountLeft={data.amountLeft}
        spentAmount={data.spentAmount}
        totalSpent={data.totalSpent}
        theme={selectedDashboardTheme}
        expanded={expandedFinanceCard === "budgets"}
        onToggleDetails={() => toggleFinanceDetails?.("budgets")}
        financeActionLoading={financeActionLoading}
        onSaveBudget={onSaveBudget}
        onEditBudgetCategory={onEditBudgetCategory}
        onDeleteBudgetCategory={onDeleteBudgetCategory}
        onResetBudget={onResetBudget}
      />
    </div>
  );
}
