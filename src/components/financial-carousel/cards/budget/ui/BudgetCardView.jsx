import { useEffect, useMemo, useRef, useState } from "react";
import BudgetCard from "@/components/BudgetCard";

const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";
const CLARA_MONEY_GUIDE_EVENT = "clara:money-guide-selected";

const FALLBACK_MESSAGES = [];
const HIDDEN_WELCOME_TEXT = "What are you thinking of buying?";

const GUIDE_GROUPS = [
  { key: "cards", label: "5 Cards", position: "right-0 top-0 min-w-[86px]" },
  { key: "smart_actions", label: "Smart Actions", position: "right-[22px] top-[39px] min-w-[112px]" },
  { key: "advice", label: "Ask Advice", position: "right-[6px] top-[78px] min-w-[92px]" },
];

const GUIDE_OPTIONS = {
  cards: [
    { key: "wallets", label: "Wallets", mode: "card_wallets", prompt: "Let’s look at your wallet health." },
    { key: "budgets", label: "Budgets", mode: "card_budgets", prompt: "Let’s work with your budget plan." },
    { key: "emergency", label: "Emergency Fund", mode: "card_emergency_fund", prompt: "Let’s check your emergency protection." },
    { key: "savings", label: "Savings Goals", mode: "card_savings_goals", prompt: "Let’s check your savings goals." },
    { key: "investments", label: "Investment", mode: "card_investment", prompt: "Let’s think about investment safely." },
    { key: "debt", label: "Debt/Obligation", mode: "card_debt", prompt: "Let’s check your obligations first." },
  ],
  smart_actions: [
    { key: "future_forecast", label: "Future Money Forecast", mode: "future_money_forecast", prompt: "Let’s predict where your money is heading." },
    { key: "spending_checkup", label: "Spending Checkup", mode: "spending_checkup", prompt: "Let’s review your spending so far." },
    { key: "savings_game_plan", label: "Savings Game Plan", mode: "savings_game_plan", prompt: "Let’s build a realistic savings plan." },
    { key: "emergency_builder", label: "Emergency Fund Builder", mode: "emergency_fund_builder", prompt: "Let’s build your safety fund plan." },
    { key: "can_afford", label: "Can I Afford This?", mode: "can_i_afford_this", prompt: "Tell me the item and price." },
    { key: "budget_fixer", label: "Budget Fixer", mode: "budget_fixer", prompt: "Let’s fix what is not working in the budget." },
    { key: "hidden_risk", label: "Hidden Risk Check", mode: "hidden_risk_check", prompt: "Let’s scan hidden money risks." },
    { key: "monthly_review", label: "Monthly Money Review", mode: "monthly_money_review", prompt: "Let’s review this month." },
    { key: "next_best_move", label: "Next Best Move", mode: "next_best_move", prompt: "Let’s find your one best move right now." },
  ],
  advice: [
    { key: "stress_spending", label: "Stress spending", mode: "advice_stress_spending", prompt: "Let’s talk through the spending urge." },
    { key: "family_support", label: "Family support", mode: "advice_family_support", prompt: "Let’s balance support and protection." },
    { key: "discipline", label: "Discipline", mode: "advice_discipline", prompt: "Let’s make this easier to follow." },
    { key: "payday", label: "Payday control", mode: "advice_payday_control", prompt: "Let’s protect your payday." },
    { key: "burnout", label: "Burnout spending", mode: "advice_burnout_spending", prompt: "Let’s separate rest from spending." },
  ],
};

function GuideChip({ active, children, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-[0.02em] shadow-[0_10px_22px_rgba(0,0,0,0.18)] backdrop-blur-xl transition active:scale-95 ${
        active
          ? "border-emerald-200/45 bg-emerald-300/20 text-emerald-50 shadow-[0_0_18px_rgba(110,231,183,0.14)]"
          : "border-white/12 bg-white/[0.065] text-white/72 hover:bg-white/[0.10]"
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
    <div className="pointer-events-none absolute inset-x-4 bottom-8 z-30 h-[166px]">
      <div className="pointer-events-auto absolute right-0 top-0 h-[110px] w-[150px]">
        {GUIDE_GROUPS.map((group) => (
          <GuideChip
            key={group.key}
            active={currentGroup === group.key}
            onClick={() => onSelectGroup(group.key)}
            className={`absolute justify-center text-center ${group.position}`}
          >
            {group.label}
          </GuideChip>
        ))}
      </div>

      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 overflow-visible">
        <div className="flex gap-2 overflow-x-auto pb-1 pl-2 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {options.map((option) => (
            <GuideChip
              key={option.key}
              active={activeGuide?.key === option.key}
              onClick={() => onSelectGuide(currentGroup, option)}
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
}) {
  const messagesEndRef = useRef(null);
  const visibleMessages = useMemo(() => {
    const source = Array.isArray(messages) && messages.length ? messages : FALLBACK_MESSAGES;
    return source.filter((message) => String(message?.text || "").trim() !== HIDDEN_WELCOME_TEXT);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [visibleMessages]);

  return (
    <div
      className="relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border border-cyan-200/18 bg-slate-950/88 p-4 text-white backdrop-blur-2xl"
      style={{
        borderColor: selectedDashboardTheme?.tokens?.border || "rgba(103,232,249,0.18)",
        boxShadow:
          "0 22px 60px rgba(0,0,0,0.38), 0 0 34px rgba(0,255,220,0.08), 0 0 48px rgba(126,34,206,0.09)",
      }}
    >
      <div className="pointer-events-none absolute -left-[92px] -top-[118px] h-[210px] w-[210px] rounded-full bg-cyan-300/[0.08] blur-2xl" />
      <div className="pointer-events-none absolute bottom-[-185px] right-[-125px] h-[250px] w-[250px] rounded-full bg-violet-400/[0.08] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),rgba(255,255,255,0.01)_38%,rgba(0,0,0,0.06))]" />
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/8" />

      <div className="relative z-10 w-full max-w-[230px] shrink-0 pt-1">
        <h3 className="text-[1.18rem] font-black leading-none tracking-tight text-white drop-shadow-[0_1px_12px_rgba(0,0,0,0.45)]">
          Ask before you spend.
        </h3>

        <p className="mt-1 text-[11px] leading-4 text-slate-300/78">
          Your budget is ready to think with you.
        </p>
      </div>

      <ClaraGuideLauncher
        activeGroup={activeGuideGroup}
        activeGuide={activeGuide}
        onSelectGroup={onSelectGuideGroup}
        onSelectGuide={onSelectGuide}
      />

      <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 h-8 bg-gradient-to-t from-slate-950/78 to-transparent" />

      <div className="relative z-10 mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-1 scroll-smooth [scrollbar-color:rgba(148,163,184,0.38)_transparent] [scrollbar-width:thin]">
        {visibleMessages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-[11px] font-medium leading-4 shadow-[0_10px_24px_rgba(0,0,0,0.18)] ${
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

    window.dispatchEvent(
      new CustomEvent(CLARA_MONEY_GUIDE_EVENT, {
        detail: {
          activeGuideGroup: groupKey,
          activeGuide: null,
        },
      })
    );
  };

  const selectGuide = (groupKey, guide) => {
    setClaraChatState((current) => ({
      ...current,
      activeGuideGroup: groupKey,
      activeGuide: guide,
    }));

    window.dispatchEvent(
      new CustomEvent(CLARA_MONEY_GUIDE_EVENT, {
        detail: {
          activeGuideGroup: groupKey,
          activeGuide: guide,
        },
      })
    );
  };

  if (claraChatState.active) {
    return (
      <div className="h-full min-h-[inherit] flex flex-col">
        <ClaraBudgetDecisionScreen
          messages={claraChatState.messages}
          selectedDashboardTheme={selectedDashboardTheme}
          activeGuide={claraChatState.activeGuide}
          activeGuideGroup={claraChatState.activeGuideGroup}
          onSelectGuideGroup={selectGuideGroup}
          onSelectGuide={selectGuide}
        />
      </div>
    );
  }

  return (
    <div className="h-full min-h-[inherit] flex flex-col">
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
