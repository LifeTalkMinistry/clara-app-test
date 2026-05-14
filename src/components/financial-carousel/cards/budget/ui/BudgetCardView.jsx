import { useEffect, useMemo, useRef, useState } from "react";
import { Box, MessageCircle, Sparkles } from "lucide-react";
import BudgetCard from "@/components/BudgetCard";

const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";
const CLARA_MONEY_CHAT_REQUEST_EVENT = "clara:money-card-chat-request";
const FALLBACK_MESSAGES = [];
const HIDDEN_WELCOME_TEXT = "What are you thinking of buying?";

const FEATURE_PROMPTS = {
  "Budget Plan": "Review my current Budget Plan like CLARA. Use my real budget context, categories, spending pace, remaining money, unplanned spending, and risks. Tell me the main concern I need to solve right now. Keep it short, conversational, and decision-focused.",
  Wallets: "Review my current Wallets like CLARA. Use my real wallet balances, total available money, wallet transaction movement, and money location. Give me a mini financial reality check so I immediately understand where my money is sitting, which wallet needs attention, and what I should be careful about next. Do not ask a random purchase question. Keep it short, conversational, and decision-focused.",
  "Savings Goals": "Review my Savings Goals like CLARA. Use my savings goal progress, total saved, total target, emotional purpose, and possible delay risks. Tell me what goal needs attention and what small top-up or protection move makes sense next. Keep it short, warm, and action-focused.",
  "Emergency Fund": "Review my Emergency Fund like CLARA. Use my survival expense, emergency fund status, available money, and current spending pressure. Tell me how protected I am right now, what risk I should notice, and the next safest top-up or protection move. Keep it short, calm, protective, and practical.",
  Transactions: "Review my Transactions like CLARA. Use my visible transaction history, wallet movement, recent spending, planned/unplanned behavior, repeated spending, and budget-risk signals. Tell me what pattern I should notice and what behavior to adjust next. Keep it short, observational, and non-judgmental.",
  "Monthly Spending": "Review my Monthly Spending like CLARA. Use my total spent this month, money left, active budget, remaining budget, and spending pace. Tell me if the month is safe, tight, or risky, then give one next best move. Keep it short, strategic, and decision-focused.",
  Transfers: "Review my Transfers like CLARA. Use my wallet movement and transfer behavior if available. Tell me whether my money movement looks organized or scattered, and what transfer habit would make my wallet system cleaner. Keep it short and practical.",
  "Financial Calendar": "Review my Financial Calendar like CLARA. Use bills, due dates, upcoming spending pressure, and the current month context if available. Tell me what date or money event I should prepare for next. Keep it short and calendar-focused.",
  "Income Tracking": "Review my Income Tracking like CLARA. Use my visible income, wallet inflows, and spending pressure. Tell me if my income is being directed clearly or disappearing too quickly, then give one simple next move. Keep it short and direct.",
  "Budget Categories": "Review my Budget Categories like CLARA. Use my category list, allocation, spending pace, and unmatched expenses. Tell me which category needs clearer boundaries or adjustment. Keep it short and category-focused.",
  "Planned vs Unplanned": "Review my Planned vs Unplanned spending like CLARA. Use my expense behavior, planned spending, unplanned spending, unexpected necessary spending, and repeated reasons. Tell me what pattern I should notice without guilt. Keep it short, behavioral, and practical.",
  "Subscription Tracking": "Review my Subscription Tracking like CLARA. Use recurring payments, subscriptions, bills, and repeated wallet deductions if visible. Tell me what recurring cost may quietly drain the month and what to verify next. Keep it short and practical.",
  "Debt Tracking": "Review my Debt Tracking like CLARA. Use debt, obligations, recurring payments, and spending pressure if visible. Tell me the safest next payment or caution point. Keep it short, calm, and non-shaming.",
  "Bills & Due Dates": "Review my Bills & Due Dates like CLARA. Use upcoming bills, utilities, due dates, wallet readiness, and current money left if visible. Tell me what bill risk to prepare for first. Keep it short and protective.",
  "Survival Days": "Review my Survival Days like CLARA. Use my available money, survival expense, emergency fund, and monthly spending pressure. Estimate how much breathing room I have and what to protect first. Keep it short, calm, and realistic.",
  "Future Money Forecast": "Forecast my money like CLARA. Use my current money left, monthly spending pace, budget status, wallets, and savings pressure. Predict whether my month is safe, tight, or risky and give one next best move. Keep it short and practical.",
  "Spending Checkup": "Run a Spending Checkup like CLARA. Use my recent spending, planned/unplanned behavior, top categories, repeated purchases, and wallet movement. Tell me what spending pattern needs attention today. Keep it short and non-judgmental.",
  "Savings Game Plan": "Build a Savings Game Plan like CLARA. Use my savings goals, available money, budget pressure, and spending behavior. Give one realistic savings move that does not break essentials. Keep it short and encouraging.",
  "Emergency Fund Builder": "Build my Emergency Fund plan like CLARA. Use my survival expense, emergency fund status, available money, and current spending pressure. Suggest a safe top-up amount or protection habit. Keep it short and protective.",
  "Affordability Check": "Run an Affordability Check like CLARA. Use my money left, budget status, spending pace, and current commitments. Tell me how to decide before buying and what amount would be safer. Keep it short and decision-focused.",
  "Budget Fixer": "Act as my Budget Fixer like CLARA. Use my current budget, category pressure, unplanned spending, and money left. Tell me the simplest budget adjustment to make now. Keep it short and actionable.",
  "Hidden Risk Check": "Run a Hidden Risk Check like CLARA. Use my wallets, budget, spending pace, repeated expenses, bills, and savings pressure. Tell me the quiet financial risk I may not be noticing. Keep it short and practical.",
  "Monthly Money Review": "Run my Monthly Money Review like CLARA. Use my total spent, money left, budget progress, wallets, savings goals, and behavior patterns. Tell me what went well, what is risky, and one next move. Keep it short and useful.",
  "Next Best Move": "Tell me my Next Best Move like CLARA. Use my real finance context across wallets, budget, spending, savings, emergency fund, and behavior signals. Give one prioritized action only. Keep it short and confident.",
  "Can I buy this?": "Help me decide if I can buy something like CLARA. Use my money left, budget status, savings goals, emergency fund, and spending behavior. Ask for the item and price if missing. Keep it short and decision-focused.",
  "Predict my month": "Predict my month like CLARA. Use my current spending pace, budget remaining, wallet balances, bills, savings pressure, and emergency fund. Tell me if the month is safe, tight, or risky. Keep it short and practical.",
  "What if I overspend?": "Explain what happens if I overspend like CLARA. Use my budget, money left, savings goals, emergency fund, and current spending behavior. Tell me the likely tradeoff and how to reduce damage. Keep it short and calm.",
  "Am I doing okay?": "Answer whether I am doing okay financially like CLARA. Use my real finance context and behavior signals. Be honest, encouraging, and specific about one thing to protect or improve. Keep it short.",
  "Future me": "Talk to me from the perspective of Future Me like CLARA. Use my current money choices, savings goals, emergency fund, and spending pattern. Give a short future-focused reminder that helps me choose wisely now.",
  "Survive until payday": "Help me survive until payday like CLARA. Use my money left, spending pace, budget, emergency fund, and upcoming pressure. Give a simple survival plan and what to avoid. Keep it short and realistic.",
  "Delay or buy?": "Help me decide delay or buy like CLARA. Use my money left, budget, savings goals, emergency fund, and spending behavior. Ask for item and price if missing. Keep it short and clear.",
  "Where did my money go?": "Explain where my money went like CLARA. Use my spending categories, transaction patterns, wallets, planned/unplanned behavior, and repeated purchases. Tell me the biggest visible reason. Keep it short and non-judgmental.",
  "Is this impulsive?": "Help me check if a purchase is impulsive like CLARA. Use my spending behavior, budget status, savings goals, emergency fund, and emotional trigger signals. Ask for the item and price if missing. Keep it short and gentle.",
  "What should I avoid?": "Tell me what I should avoid financially like CLARA. Use my real spending patterns, budget pressure, wallets, savings, and emergency fund. Give one or two avoidance rules for today. Keep it short and practical.",
  "What's hurting my budget?": "Tell me what's hurting my budget like CLARA. Use my categories, unplanned spending, repeated purchases, high spends, wallet movement, and current budget pressure. Give the main culprit and one fix. Keep it short and direct.",
};

const ENABLED_FEATURES = new Set(Object.keys(FEATURE_PROMPTS));

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

function getFeatureDisplayMessage(featureName = "") {
  if (/\?$/.test(featureName)) return featureName;
  return `Review my ${featureName}`;
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
          const isEnabled = ENABLED_FEATURES.has(item);

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
  activeGuideGroup = "cards",
  onSelectGuideGroup,
  onSelectFeature,
  onMinimize,
}) {
  const messagesEndRef = useRef(null);
  const screenRef = useRef(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const visibleMessages = useMemo(() => {
    const source = Array.isArray(messages) && messages.length ? messages : FALLBACK_MESSAGES;
    return source.filter(
      (message) => String(message?.text || "").trim() !== HIDDEN_WELCOME_TEXT
    );
  }, [messages]);

  const hasActiveConversation = visibleMessages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleMessages]);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) return undefined;

    const updateKeyboardInset = () => {
      const inset = Math.max(
        0,
        window.innerHeight - visualViewport.height - visualViewport.offsetTop
      );

      setKeyboardInset(inset);

      if (inset > 80) {
        window.requestAnimationFrame(() => {
          screenRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
        });
      }
    };

    updateKeyboardInset();
    visualViewport.addEventListener("resize", updateKeyboardInset);
    visualViewport.addEventListener("scroll", updateKeyboardInset);

    return () => {
      visualViewport.removeEventListener("resize", updateKeyboardInset);
      visualViewport.removeEventListener("scroll", updateKeyboardInset);
    };
  }, []);

  return (
    <div
      ref={screenRef}
      className="relative flex h-full max-h-[100dvh] min-h-0 flex-col overflow-hidden rounded-3xl border border-cyan-200/18 bg-slate-950/88 p-4 text-white backdrop-blur-2xl"
      style={{
        maxHeight: keyboardInset > 80 ? "calc(100dvh - 12px)" : "100%",
        paddingBottom: keyboardInset > 80 ? "calc(env(safe-area-inset-bottom) + 10px)" : "env(safe-area-inset-bottom)",
      }}
    >
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
        <div
          className="relative z-10 mt-4 min-h-0 flex-1 overflow-y-auto pr-1 overscroll-contain"
          style={{
            WebkitOverflowScrolling: "touch",
            paddingBottom: keyboardInset > 80 ? 128 : 24,
          }}
        >
          <div className="flex min-h-full flex-col justify-end gap-2 pb-6">
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
    const aiPrompt = FEATURE_PROMPTS[featureName];
    if (!aiPrompt) return;

    window.dispatchEvent(
      new CustomEvent(CLARA_MONEY_CHAT_REQUEST_EVENT, {
        detail: {
          feature: featureName,
          prompt: featureName,
          aiPrompt,
          displayMessage: getFeatureDisplayMessage(featureName),
          source: "budget_lens_feature",
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
      <div className="flex h-full max-h-[100dvh] min-h-0 flex-col overflow-y-auto pb-[env(safe-area-inset-bottom)]">
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
