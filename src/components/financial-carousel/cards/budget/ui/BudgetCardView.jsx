import { useEffect, useMemo, useRef, useState } from "react";
import BudgetCard from "@/components/BudgetCard";

const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";

const FALLBACK_MESSAGES = [];
const HIDDEN_WELCOME_TEXT = "What are you thinking of buying?";

const GUIDE_GROUPS = [
  {
    key: "cards",
    label: "Core Features",
    className: "min-w-[132px] px-4.5 py-2 text-[11px] translate-x-0",
    activeClassName:
      "border-emerald-100/62 bg-emerald-300/22 text-white shadow-[0_0_24px_rgba(110,231,183,0.16),inset_0_1px_0_rgba(255,255,255,0.13)] scale-[1.02]",
    inactiveClassName:
      "border-emerald-100/24 bg-white/[0.082] text-white/84 shadow-[0_0_14px_rgba(110,231,183,0.07),inset_0_1px_0_rgba(255,255,255,0.07)]",
  },
  {
    key: "smart_actions",
    label: "Smart Actions",
    className: "min-w-[114px] px-3.5 py-[7px] text-[10px] translate-x-2",
    activeClassName:
      "border-cyan-100/44 bg-cyan-200/16 text-cyan-50 shadow-[0_0_17px_rgba(125,211,252,0.10),inset_0_1px_0_rgba(255,255,255,0.10)] scale-[1.01]",
    inactiveClassName:
      "border-white/15 bg-white/[0.058] text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.052)]",
  },
  {
    key: "advice",
    label: "Ask Advice",
    className: "min-w-[98px] px-3 py-1.5 text-[9.5px] translate-x-4",
    activeClassName:
      "border-violet-100/34 bg-violet-200/12 text-white/88 shadow-[0_0_12px_rgba(196,181,253,0.08),inset_0_1px_0_rgba(255,255,255,0.07)]",
    inactiveClassName:
      "border-white/12 bg-white/[0.04] text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  },
];

function GuideChip({
  active,
  children,
  onClick,
  className = "",
  activeClassName = "",
  inactiveClassName = "",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 origin-right rounded-full border font-bold tracking-[0.02em] backdrop-blur-xl transition duration-200 hover:bg-white/[0.10] hover:text-white hover:shadow-[0_0_16px_rgba(255,255,255,0.07),inset_0_1px_0_rgba(255,255,255,0.07)] active:scale-95 ${
        active ? activeClassName : inactiveClassName
      } ${className}`}
    >
      {children}
    </button>
  );
}

function ClaraGuideLauncher({ activeGroup, onSelectGroup }) {
  const currentGroup = activeGroup || "cards";

  return (
    <div className="pointer-events-auto absolute right-4 top-[55%] z-30 flex -translate-y-1/2 flex-col items-end gap-2.5">
      {GUIDE_GROUPS.map((group) => (
        <GuideChip
          key={group.key}
          active={currentGroup === group.key}
          onClick={() => onSelectGroup(group.key)}
          className={`${group.className} justify-center text-center`}
          activeClassName={group.activeClassName}
          inactiveClassName={group.inactiveClassName}
        >
          {group.label}
        </GuideChip>
      ))}
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

          <p className="mt-1 text-[11px] leading-4 text-slate-300/78">
            Your budget is ready to think with you.
          </p>
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
        <div className="relative z-10 mt-6 flex min-h-0 flex-1 flex-col justify-end pb-1">
          <div className="max-w-[68%] rounded-[24px] border border-white/10 bg-white/[0.065] px-4 py-3 text-[11px] font-semibold leading-5 text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
            <p className="text-white/88">CLARA is here to think with you 🙂</p>
          </div>

          <ClaraGuideLauncher
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
