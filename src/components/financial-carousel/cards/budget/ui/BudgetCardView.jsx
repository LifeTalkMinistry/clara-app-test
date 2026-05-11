import { useEffect, useState } from "react";
import BudgetCard from "@/components/BudgetCard";

const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";

const FALLBACK_MESSAGES = [
  {
    id: "clara-budget-welcome",
    role: "clara",
    text: "What are you thinking of buying?",
  },
];

function ClaraBudgetDecisionScreen({ selectedDashboardTheme }) {
  return (
    <div
      className="relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border border-cyan-200/18 bg-slate-950/88 backdrop-blur-2xl"
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
