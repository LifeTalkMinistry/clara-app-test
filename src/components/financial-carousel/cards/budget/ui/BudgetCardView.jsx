import { useEffect, useMemo, useRef, useState } from "react";
import { Box, MessageCircle, Sparkles } from "lucide-react";
import BudgetCard from "@/components/BudgetCard";

const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";

const FALLBACK_MESSAGES = [];
const HIDDEN_WELCOME_TEXT = "What are you thinking of buying?";
const BUDGET_PLAN_FEATURE = "Budget Plan";

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
    "Financial Calendar",
    "Income Tracking",
    "Budget Categories",
    "Planned vs Unplanned",
    "Subscription Tracking",
    "Debt Tracking",
    "Bills & Due Dates",
    "Survival Days",
  ],
  smart_actions: [
    "Future Money Forecast",
    "Spending Checkup",
    "Savings Game Plan",
    "Emergency Fund Builder",
    "Affordability Check",
    "Budget Fixer",
    "Hidden Risk Check",
    "Monthly Money Review",
    "Next Best Move",
  ],
  advice: [
    "Can I buy this?",
    "Predict my month",
    "What if I overspend?",
    "Am I doing okay?",
    "Future me",
    "Survive until payday",
    "Delay or buy?",
    "Where did my money go?",
    "Is this impulsive?",
    "What should I avoid?",
    "What's hurting my budget?",
  ],
};

function makeClaraMessage(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
  };
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function fmtPHP(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeNumber(value));
}

function getCategoryName(category = {}) {
  return (
    category.name ||
    category.category_name ||
    category.label ||
    category.title ||
    category.key ||
    "Unnamed category"
  );
}

function getCategoryAllocated(category = {}) {
  return safeNumber(
    category.allocated ??
      category.allocated_amount ??
      category.amount ??
      category.budget_amount ??
      category.limit
  );
}

function getCategorySpent(category = {}) {
  return safeNumber(
    category.spent ?? category.spent_amount ?? category.used ?? category.total_spent
  );
}

function getBudgetCategories(data = {}) {
  if (Array.isArray(data.budgetCategories)) return data.budgetCategories;
  if (Array.isArray(data.activeBudget?.categories)) return data.activeBudget.categories;
  return [];
}

function buildBudgetPlanReply(data = {}) {
  const categories = getBudgetCategories(data);
  const declared = safeNumber(
    data.declaredBudget ??
      data.activeBudget?.declared_budget ??
      data.activeBudget?.declared_amount ??
      data.activeBudget?.monthly_budget_amount
  );
  const allocated = safeNumber(
    data.activeBudget?.allocated_amount ??
      data.activeBudget?.allocated_total ??
      data.activeBudget?.total_budget ??
      categories.reduce((sum, item) => sum + getCategoryAllocated(item), 0)
  );
  const spent = safeNumber(
    data.spentAmount ??
      data.totalSpent ??
      data.activeBudget?.spent ??
      data.activeBudget?.spent_amount ??
      data.activeBudget?.total_spent ??
      categories.reduce((sum, item) => sum + getCategorySpent(item), 0)
  );
  const remaining = Math.max(
    safeNumber(data.remainingAmount ?? data.activeBudget?.remaining ?? data.activeBudget?.remaining_amount ?? declared - spent),
    0
  );
  const unallocated = Math.max(
    safeNumber(data.unallocatedAmount ?? data.activeBudget?.unallocated_amount ?? declared - allocated),
    0
  );
  const progress = declared > 0 ? Math.round(Math.min(999, (spent / declared) * 100)) : 0;
  const unplanned = safeNumber(data.unplannedSpent);
  const planComplete = data.isComplete === true || data.activeBudget?.is_complete === true || (declared > 0 && allocated === declared && unallocated === 0);

  const categoryByAllocation = [...categories]
    .filter((item) => getCategoryAllocated(item) > 0)
    .sort((a, b) => getCategoryAllocated(b) - getCategoryAllocated(a))[0];

  const categoryByPressure = [...categories]
    .filter((item) => getCategoryAllocated(item) > 0 || getCategorySpent(item) > 0)
    .sort((a, b) => {
      const aAllocated = getCategoryAllocated(a);
      const bAllocated = getCategoryAllocated(b);
      const aPressure = aAllocated > 0 ? getCategorySpent(a) / aAllocated : getCategorySpent(a) > 0 ? 99 : 0;
      const bPressure = bAllocated > 0 ? getCategorySpent(b) / bAllocated : getCategorySpent(b) > 0 ? 99 : 0;
      return bPressure - aPressure || getCategorySpent(b) - getCategorySpent(a);
    })[0];

  if (declared <= 0) {
    return "Budget Plan: you don’t have a declared budget yet. The main job here is to decide where your money should go before emotions spend it. Start by setting this month’s spending amount, then split it into categories.";
  }

  if (!categories.length || allocated <= 0) {
    return `Budget Plan: you declared ${fmtPHP(declared)}, but it is not distributed into categories yet. The main concern is allocation clarity: give every peso a job before the month gets messy.`;
  }

  if (!planComplete || unallocated > 0) {
    return `Budget Plan: you declared ${fmtPHP(declared)} and assigned ${fmtPHP(allocated)}. You still have ${fmtPHP(unallocated)} unassigned. Fix that first so this money does not quietly become casual spending.`;
  }

  if (progress >= 100) {
    const pressureText = categoryByPressure
      ? ` The strongest pressure is ${getCategoryName(categoryByPressure)}.`
      : "";
    return `Budget Plan: your plan is fully allocated, but spending has already reached ${progress}% of the declared budget. The main concern now is control: pause flexible spending and protect the remaining categories.${pressureText}`;
  }

  if (progress >= 80) {
    const pressureText = categoryByPressure
      ? ` Watch ${getCategoryName(categoryByPressure)} first.`
      : "";
    return `Budget Plan: your plan is active, but you are already at ${progress}% used with ${fmtPHP(remaining)} remaining. The main concern is pace: slow down unplanned spending before the budget gets tight.${pressureText}`;
  }

  const biggestText = categoryByAllocation
    ? ` Your biggest planned area is ${getCategoryName(categoryByAllocation)}.`
    : "";
  const unplannedText = unplanned > 0
    ? ` You also have ${fmtPHP(unplanned)} unplanned spending, so keep checking if purchases are still aligned with the plan.`
    : "";

  return `Budget Plan: your plan is active and ${progress}% used. You still have ${fmtPHP(remaining)} remaining this cycle.${biggestText}${unplannedText} The main job now is simple: follow the plan before emotions create new spending.`;
}

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

function ClaraGuideBubbleCarousel({ activeGroup, onSelectFeature }) {
  const items = GUIDE_BUBBLE_CAROUSELS[activeGroup] || GUIDE_BUBBLE_CAROUSELS.cards;

  return (
    <div className="min-w-0 flex-1 overflow-hidden">
      <div className="flex snap-x gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const isEnabled = item === BUDGET_PLAN_FEATURE;

          return (
            <button
              key={item}
              type="button"
              onClick={() => onSelectFeature?.(item)}
              disabled={!isEnabled}
              className={`min-w-fit snap-start rounded-[20px] border px-4 py-2 text-[11px] font-semibold leading-5 text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-xl transition active:scale-[0.98] ${
                isEnabled
                  ? "border-cyan-100/16 bg-white/[0.05] hover:bg-white/[0.075] hover:text-white"
                  : "border-white/[0.07] bg-white/[0.035] opacity-75"
              }`}
            >
              <span className="whitespace-nowrap font-black text-white/92">{item}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClaraBudgetDecisionScreen({
  messages = FALLBACK_MESSAGES,
  selectedDashboardTheme,
  activeGuideGroup = "cards",
  onSelectGuideGroup,
  onSelectFeature,
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
            <ClaraGuideBubbleCarousel
              activeGroup={activeGuideGroup}
              onSelectFeature={onSelectFeature}
            />
          </div>

          <ClaraQuickActions
            activeGroup={activeGuideGroup}
            onSelectGroup={onSelectGuideGroup}
          />
        </div>
      )}

      {hasActiveConversation && (
        <div className="relative z-10 mt-4 flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-y-auto pr-1 pb-2">
          {visibleMessages.map((message) => {
            const isUser = message.role === "user";

            return (
              <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3 py-2 text-[11px] font-medium leading-4 ${
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

  const selectFeature = (featureName) => {
    if (featureName !== BUDGET_PLAN_FEATURE) return;

    const nextMessages = [
      makeClaraMessage("user", featureName),
      makeClaraMessage("clara", buildBudgetPlanReply(data)),
    ];

    setClaraChatState((current) => ({
      ...current,
      active: true,
      messages: nextMessages,
      activeGuideGroup: "cards",
    }));

    window.dispatchEvent(
      new CustomEvent(CLARA_MONEY_CHAT_EVENT, {
        detail: {
          active: true,
          messages: nextMessages,
          activeGuideGroup: "cards",
          source: "budget_lens_feature",
          feature: featureName,
        },
      })
    );
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
          onSelectFeature={selectFeature}
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
