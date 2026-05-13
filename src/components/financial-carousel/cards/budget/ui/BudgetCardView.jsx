import { useEffect, useMemo, useRef, useState } from "react";
import BudgetCard from "@/components/BudgetCard";

const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";
const CLARA_MONEY_GUIDE_EVENT = "clara:money-guide-selected";

const FALLBACK_MESSAGES = [];
const HIDDEN_WELCOME_TEXT = "What are you thinking of buying?";

const GUIDE_GROUPS = [
  { key: "cards", label: "Core Features" },
  { key: "smart_actions", label: "Smart Actions" },
  { key: "advice", label: "Ask Advice" },
];

const GUIDE_OPTIONS = {
  cards: [
    { key: "wallets", label: "Wallets" },
    { key: "budgets", label: "Budgets" },
    { key: "emergency", label: "Emergency Fund" },
    { key: "savings", label: "Savings Goals" },
    { key: "investments", label: "Investment" },
    { key: "debt", label: "Debt/Obligation" },
  ],
  smart_actions: [
    { key: "future_forecast", label: "Future Money Forecast" },
    { key: "spending_checkup", label: "Spending Checkup" },
    { key: "savings_game_plan", label: "Savings Game Plan" },
  ],
  advice: [
    { key: "stress_spending", label: "Stress spending" },
    { key: "family_support", label: "Family support" },
  ],
};

function GuideChip({ active, children, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-[0.02em] backdrop-blur-xl transition hover:bg-white/[0.10] active:scale-95 ${
        active
          ? "border-emerald-200/45 bg-emerald-300/20 text-emerald-50 shadow-[0_0_18px_rgba(110,231,183,0.10)]"
          : "border-white/12 bg-white/[0.065] text-white/72"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function ClaraGuideLauncher({ activeGroup, activeGuide, onSelectGroup, onSelectGuide }) {
  const currentGroup = activeGroup || "cards";
  const options = GUIDE_OPTIONS[currentGroup] || GUIDE_OPTIONS.cards;

  if (activeGuide) return null;

  return (
    <div className="relative z-30 mt-5 space-y-3">
      <div className="rounded-[22px] border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
        <p className="text-[9px] font-black uppercase tracking-[0.20em] text-cyan-100/50">
          CLARA shortcuts
        </p>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {GUIDE_GROUPS.map((group) => (
            <GuideChip
              key={group.key}
              active={currentGroup === group.key}
              onClick={() => onSelectGroup(group.key)}
            >
              {group.label}
            </GuideChip>
          ))}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {options.map((option) => (
            <GuideChip
              key={option.key}
              active={activeGuide?.key === option.key}
              onClick={() => onSelectGuide(currentGroup, option)}
              className="border-cyan-100/16 bg-slate-950/22"
            >
              {option.label}
            </GuideChip>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClaraBudgetDecisionScreen({
  messages = FALLBACK_MESSAGES,
  selectedDashboardTheme,
  activeGuide = null,
  activeGuideGroup = "cards",
  onSelectGuideGroup,
  onSelectGuide,
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

          <p className="mt-1 text-[11px] leading-4 text-slate-300/78">
            Your budget is ready to think with you.
          </p>
        </div>

        <button
          type="button"
          onClick={onMinimize}
          className="flex h-8 shrink-0 items-center justify-center rounded-full border border-cyan-100/14 bg-white/[0.065] px-3 text-[10px] font-black uppercase tracking-[0.10em] text-white/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:bg-white/[0.10] active:scale-95"
          aria-label="Close CLARA budget lens"
        >
          Close <span className="ml-1 text-white/44">⌄</span>
        </button>
      </div>

      {!hasActiveConversation && (
        <div className="relative z-10 mt-6 flex min-h-0 flex-1 flex-col justify-end pb-1">
          <div className="max-w-[92%] rounded-[24px] border border-white/10 bg-white/[0.065] px-4 py-3 text-[11px] font-semibold leading-5 text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
            <p className="text-white/88">CLARA is here to think with you 🙂</p>
            <p className="mt-1 text-white/58">
              Pick a shortcut below, or ask about something you want to buy.
            </p>
          </div>

          <ClaraGuideLauncher
            activeGroup={activeGuideGroup}
            activeGuide={activeGuide}
            onSelectGroup={onSelectGuideGroup}
            onSelectGuide={onSelectGuide}
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
    activeGuide: null,
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
        activeGuide: detail.activeGuide || current.activeGuide || null,
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

  const selectGuide = (groupKey, guide) => {
    setClaraChatState((current) => ({
      ...current,
      activeGuideGroup: groupKey,
      activeGuide: guide,
    }));

    window.dispatchEvent(
      new CustomEvent(CLARA_MONEY_GUIDE_EVENT, {
        detail: { groupKey, guide },
      })
    );
  };

  const minimizeClaraChat = () => {
    window.dispatchEvent(
      new CustomEvent(CLARA_MONEY_CHAT_EVENT, {
        detail: {
          active: false,
          messages: FALLBACK_MESSAGES,
        },
      })
    );
  };

  if (claraChatState.active) {
    return (
      <div className="flex h-full min-h-[inherit] flex-col">
        <ClaraBudgetDecisionScreen
          messages={claraChatState.messages}
          selectedDashboardTheme={selectedDashboardTheme}
          activeGuide={claraChatState.activeGuide}
          activeGuideGroup={claraChatState.activeGuideGroup}
          onSelectGuideGroup={selectGuideGroup}
          onSelectGuide={selectGuide}
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
