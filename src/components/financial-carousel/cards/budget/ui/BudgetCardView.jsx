import { useEffect, useMemo, useRef, useState } from "react";
import BudgetCard from "@/components/BudgetCard";

const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";

const FALLBACK_MESSAGES = [];
const HIDDEN_WELCOME_TEXT = "What are you thinking of buying?";

const CLARA_IDLE_PROMPTS = [
  "CLARA is here to think with you 🙂",
  "Pause first. Decide second.",
  "Small choices shape the month.",
  "Ask before the budget feels it.",
];

const CLARA_BUDGET_LENS_MOTION_STYLES = `
  @keyframes claraBudgetLensDrift {
    0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.62; }
    50% { transform: translate3d(-8px, 10px, 0) scale(1.04); opacity: 0.9; }
  }

  @keyframes claraBudgetGuideBreathe {
    0%, 100% { translate: 0 0; }
    50% { translate: 0 -1px; }
  }

  @keyframes claraBudgetMessageFade {
    0% { opacity: 0; transform: translateY(2px); }
    18%, 82% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0.92; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .clara-budget-lens-drift,
    .clara-budget-guide-breathe,
    .clara-budget-message-fade {
      animation: none !important;
    }
  }
`;

const GUIDE_GROUPS = [
  {
    key: "cards",
    label: "Core Features",
    className: "min-w-[132px] px-4.5 py-2 text-[11px] translate-x-0",
    activeClassName:
      "border-emerald-100/65 bg-emerald-300/26 text-white shadow-[0_0_30px_rgba(110,231,183,0.22),inset_0_1px_0_rgba(255,255,255,0.15)] scale-[1.03]",
    inactiveClassName:
      "border-emerald-100/26 bg-white/[0.095] text-white/86 shadow-[0_0_18px_rgba(110,231,183,0.09),inset_0_1px_0_rgba(255,255,255,0.08)]",
    animationDelay: "0ms",
  },
  {
    key: "smart_actions",
    label: "Smart Actions",
    className: "min-w-[114px] px-3.5 py-[7px] text-[10px] translate-x-2",
    activeClassName:
      "border-cyan-100/48 bg-cyan-200/18 text-cyan-50 shadow-[0_0_20px_rgba(125,211,252,0.13),inset_0_1px_0_rgba(255,255,255,0.11)] scale-[1.01]",
    inactiveClassName:
      "border-white/15 bg-white/[0.062] text-white/73 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]",
    animationDelay: "420ms",
  },
  {
    key: "advice",
    label: "Ask Advice",
    className: "min-w-[98px] px-3 py-1.5 text-[9.5px] translate-x-4",
    activeClassName:
      "border-violet-100/38 bg-violet-200/14 text-white/90 shadow-[0_0_14px_rgba(196,181,253,0.10),inset_0_1px_0_rgba(255,255,255,0.08)]",
    inactiveClassName:
      "border-white/12 bg-white/[0.042] text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]",
    animationDelay: "860ms",
  },
];

function GuideChip({
  active,
  children,
  onClick,
  className = "",
  activeClassName = "",
  inactiveClassName = "",
  animationDelay = "0ms",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{ animationDelay }}
      className={`clara-budget-guide-breathe shrink-0 origin-right rounded-full border font-bold tracking-[0.02em] backdrop-blur-xl transition duration-200 hover:bg-white/[0.10] hover:text-white hover:shadow-[0_0_18px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.08)] active:scale-95 ${
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
    <div className="pointer-events-auto absolute right-6 top-[56%] z-30 flex -translate-y-1/2 flex-col items-end gap-2.5">
      {GUIDE_GROUPS.map((group) => (
        <GuideChip
          key={group.key}
          active={currentGroup === group.key}
          onClick={() => onSelectGroup(group.key)}
          className={`${group.className} justify-center text-center`}
          activeClassName={group.activeClassName}
          inactiveClassName={group.inactiveClassName}
          animationDelay={group.animationDelay}
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
  const [idlePromptIndex, setIdlePromptIndex] = useState(0);

  const visibleMessages = useMemo(() => {
    const source = Array.isArray(messages) && messages.length ? messages : FALLBACK_MESSAGES;
    return source.filter((message) => String(message?.text || "").trim() !== HIDDEN_WELCOME_TEXT);
  }, [messages]);

  const hasActiveConversation = visibleMessages.length > 0;
  const idlePrompt = CLARA_IDLE_PROMPTS[idlePromptIndex % CLARA_IDLE_PROMPTS.length];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleMessages]);

  useEffect(() => {
    if (hasActiveConversation) return undefined;

    const intervalId = window.setInterval(() => {
      setIdlePromptIndex((current) => current + 1);
    }, 9000);

    return () => window.clearInterval(intervalId);
  }, [hasActiveConversation]);

  return (
    <div className="relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border border-cyan-200/18 bg-slate-950/88 p-4 text-white backdrop-blur-2xl">
      <style>{CLARA_BUDGET_LENS_MOTION_STYLES}</style>
      <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-0 h-48 w-48 rounded-full bg-indigo-400/12 blur-3xl" />
      <div className="clara-budget-lens-drift pointer-events-none absolute left-[24%] top-[24%] h-44 w-44 rounded-full bg-cyan-200/[0.035] blur-3xl" />
      <div className="clara-budget-lens-drift pointer-events-none absolute bottom-[18%] right-[22%] h-36 w-36 rounded-full bg-violet-300/[0.04] blur-3xl [animation-delay:1.8s]" />

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
            <p key={idlePrompt} className="clara-budget-message-fade text-white/88">
              {idlePrompt}
            </p>
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
