import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import BudgetCard from "@/components/BudgetCard";

const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";

const FALLBACK_MESSAGES = [
  {
    id: "clara-budget-welcome",
    role: "clara",
    text: "What are you thinking of buying?",
  },
];

function ClaraBudgetDecisionScreen({
  messages = FALLBACK_MESSAGES,
  data = {},
  selectedDashboardTheme,
}) {
  const safeMessages = Array.isArray(messages) && messages.length ? messages : FALLBACK_MESSAGES;
  const remaining = Number(data.remainingAmount ?? data.amountLeft ?? 0);
  const spent = Number(data.spentAmount ?? data.totalSpent ?? 0);
  const declared = Number(data.declaredBudget ?? 0);
  const usedPercent = declared > 0 ? Math.min(100, Math.round((spent / declared) * 100)) : 0;

  return (
    <div
      className="relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border border-cyan-200/18 bg-slate-950/88 p-4 text-white shadow-[0_22px_60px_rgba(0,0,0,0.38),0_0_34px_rgba(0,255,220,0.08),0_0_48px_rgba(126,34,206,0.09)] backdrop-blur-2xl"
      style={{
        borderColor: selectedDashboardTheme?.tokens?.border || "rgba(103,232,249,0.18)",
      }}
    >
      <div className="pointer-events-none absolute -left-[92px] -top-[118px] h-[210px] w-[210px] rounded-full bg-cyan-300/[0.08] blur-2xl" />
      <div className="pointer-events-none absolute bottom-[-185px] right-[-125px] h-[250px] w-[250px] rounded-full bg-violet-400/[0.08] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_38%,rgba(0,0,0,0.08))]" />
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />

      <div className="relative z-10 mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-100/85">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.82)]" />
            Decision Check
          </div>
          <h3 className="text-[1.18rem] font-black leading-none tracking-tight text-white">
            Ask before you spend.
          </h3>
          <p className="mt-1 text-[11px] leading-4 text-slate-300/78">
            Your budget is now the thinking screen.
          </p>
        </div>

        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cyan-100/15 bg-white/[0.075] text-emerald-100">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <div className="relative z-10 mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-2.5 py-2 text-center">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-300/65">Left</div>
          <div className="mt-1 truncate text-xs font-black text-emerald-100">₱{remaining.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-2.5 py-2 text-center">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-300/65">Used</div>
          <div className="mt-1 truncate text-xs font-black text-cyan-100">{usedPercent}%</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-2.5 py-2 text-center">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-300/65">Mode</div>
          <div className="mt-1 truncate text-xs font-black text-white">Live</div>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-end gap-2 overflow-y-auto pb-1 pr-1">
        {safeMessages.slice(-5).map((message) => {
          const isUser = message.role === "user";
          return (
            <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-[11px] leading-4 shadow-[0_10px_24px_rgba(0,0,0,0.18)] ${
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
    return () => window.removeEventListener(CLARA_MONEY_CHAT_EVENT, handleClaraMoneyChat);
  }, []);

  if (claraChatState.active) {
    return (
      <div className="h-full min-h-[inherit] flex flex-col">
        <ClaraBudgetDecisionScreen
          messages={claraChatState.messages}
          data={data}
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
