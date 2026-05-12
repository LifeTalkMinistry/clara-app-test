import { useEffect, useMemo, useRef, useState } from "react";
import BudgetCard from "@/components/BudgetCard";

const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";

const FALLBACK_MESSAGES = [
  {
    id: "clara-budget-welcome",
    role: "clara",
    text: "What are you thinking of buying?",
  },
];

function ClaraBudgetDecisionScreen({ messages = FALLBACK_MESSAGES, selectedDashboardTheme }) {
  const messagesEndRef = useRef(null);
  const visibleMessages = useMemo(() => {
    const source = Array.isArray(messages) && messages.length ? messages : FALLBACK_MESSAGES;
    return source;
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

      <div className="relative z-10 w-full max-w-[230px] shrink-0">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-100/85 shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.82)]" />
          CLARA Budget Lens
        </div>

        <h3 className="text-[1.18rem] font-black leading-none tracking-tight text-white drop-shadow-[0_1px_12px_rgba(0,0,0,0.45)]">
          Ask before you spend.
        </h3>

        <p className="mt-1 text-[11px] leading-4 text-slate-300/78">
          Your budget is ready to think with you.
        </p>
      </div>

      <div className="pointer-events-none absolute inset-x-4 top-[112px] z-20 h-7 bg-gradient-to-b from-slate-950/75 to-transparent" />
      <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 h-8 bg-gradient-to-t from-slate-950/78 to-transparent" />

      <div className="relative z-10 mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-1 scroll-smooth [scrollbar-color:rgba(148,163,184,0.38)_transparent] [scrollbar-width:thin]">
        <div className="mt-auto" />
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
  });

  useEffect(() => {
    const handleClaraMoneyChat = (event) => {
      const detail = event?.detail || {};

      setClaraChatState({
        active: Boolean(detail.active),
        messages: Array.isArray(detail.messages) && detail.messages.length
          ? detail.messages
          : FALLBACK_MESSAGES,
      });
    };

    window.addEventListener(CLARA_MONEY_CHAT_EVENT, handleClaraMoneyChat);

    return () => {
      window.removeEventListener(CLARA_MONEY_CHAT_EVENT, handleClaraMoneyChat);
    };
  }, []);

  if (claraChatState.active) {
    return (
      <div className="h-full min-h-[inherit] flex flex-col">
        <ClaraBudgetDecisionScreen
          messages={claraChatState.messages}
          selectedDashboardTheme={selectedDashboardTheme}
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
