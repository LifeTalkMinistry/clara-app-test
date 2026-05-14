import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Sparkles, X } from "lucide-react";
import {
  buildClaraFinanceSnapshot,
  generateClaraLocalReply,
} from "@/lib/clara-local-brain";
import {
  generateClaraGeminiReply,
  hasGeminiConfig,
} from "@/lib/clara-gemini-client";

const SMART_ACTIONS = [
  {
    id: "future-money-forecast",
    title: "Future Money Forecast",
    shortTitle: "Forecast",
    description: "Predict where your money is heading based on income, expenses, budgets, savings, wallets, and hidden risks.",
    prompt: "Run my Future Money Forecast. Predict where my money is heading based on income, expenses, budgets, savings, wallets, unplanned spending, undocumented spending, and hidden risks. Keep it practical and decision-focused.",
    question: "Do you want me to focus next on this week, this month, or your next payday?",
    chips: ["This week", "This month", "Next payday"],
  },
  {
    id: "spending-checkup",
    title: "Spending Checkup",
    shortTitle: "Checkup",
    description: "Explain past spending behavior, leaks, planned vs unplanned spending, and undocumented spending.",
    prompt: "Run my Spending Checkup. Explain my past spending behavior, biggest money leaks, planned vs unplanned spending, and undocumented spending. Give me the clearest issue I should fix first.",
    question: "Do you want the next check to be direct, gentle, or focused only on the biggest leak?",
    chips: ["Be direct", "Gentle", "Biggest leak"],
  },
  {
    id: "savings-game-plan",
    title: "Savings Game Plan",
    shortTitle: "Savings Plan",
    description: "Show how I can realistically reach my declared savings goal.",
    prompt: "Create my Savings Game Plan. Check how I can realistically reach my declared savings goal based on my current money, spending, and budget behavior.",
    question: "Should I make the savings plan safe, faster, or easier to follow daily?",
    chips: ["Safe plan", "Faster plan", "Daily steps"],
  },
  {
    id: "emergency-fund-builder",
    title: "Emergency Fund Builder",
    shortTitle: "Emergency Fund",
    description: "Build a realistic safety fund plan based on expenses, income, and survival needs.",
    prompt: "Build my Emergency Fund plan. Use my expenses, income, survival needs, savings, and wallet situation to create a realistic safety fund strategy.",
    question: "Should we start with a small starter fund, full survival fund, or monthly target?",
    chips: ["Starter fund", "Full fund", "Monthly target"],
  },
  {
    id: "can-i-afford-this",
    title: "Can I Afford This?",
    shortTitle: "Afford Check",
    description: "Enter an amount and CLARA checks whether the purchase is safe.",
    prompt: "Help me check if I can afford a purchase. Ask me for the item and amount if I have not provided them yet, then judge if it is safe based on my money and budget context.",
    question: "Tell me the item, price, and wallet you plan to use.",
    chips: ["₱500", "₱1,000", "₱2,500"],
  },
  {
    id: "budget-fixer",
    title: "Budget Fixer",
    shortTitle: "Budget Fixer",
    description: "Suggest better budget allocation based on real spending behavior.",
    prompt: "Run my Budget Fixer. Suggest better budget allocation based on my real spending behavior, recurring expenses, unplanned spending, and current budget risk.",
    question: "Should I fix the budget for survival, savings, or spending control first?",
    chips: ["Survival", "Savings", "Control spending"],
  },
  {
    id: "hidden-risk-check",
    title: "Hidden Risk Check",
    shortTitle: "Risk Check",
    description: "Detect ignored money risks like health, maintenance, family support, debt, rest, and transportation.",
    prompt: "Run my Hidden Risk Check. Detect ignored areas that may cost money later, including health, checkups, emergencies, maintenance, family support, transportation, rest, and debt.",
    question: "Should I check personal risks, family risks, or bills and maintenance first?",
    chips: ["Personal", "Family", "Bills"],
  },
  {
    id: "monthly-money-review",
    title: "Monthly Money Review",
    shortTitle: "Monthly Review",
    description: "Summarize what went well, what hurt the budget, biggest risk, and next focus.",
    prompt: "Run my Monthly Money Review. Summarize what went well, what hurt my budget, my biggest risk, and my next money focus.",
    question: "Do you want a quick review, deeper breakdown, or next focus only?",
    chips: ["Quick review", "Deep breakdown", "Next focus"],
  },
  {
    id: "next-best-move",
    title: "Next Best Move",
    shortTitle: "Next Move",
    description: "Give one clear recommended action based on my current money situation.",
    prompt: "Give me my Next Best Move. Based on my current money situation, give me one clear action I should take next.",
    question: "Should the next move focus on spending, saving, budgeting, or emergency safety?",
    chips: ["Spending", "Saving", "Budgeting", "Emergency"],
  },
];

function isWelcomeMessage(message = {}) {
  return String(message?.text || "").trim() === "What are you thinking of buying?";
}

function makeLocalMessage(role, text, meta = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
    ...meta,
  };
}

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;

  return `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function buildUnsupportedActionReply(action, snapshot = {}) {
  const available = formatMoney(snapshot.availableMoney);
  const spent = formatMoney(snapshot.monthlySpent);
  const budgetLeft = formatMoney(snapshot.budgetRemaining);
  const savingsSaved = formatMoney(snapshot.savingsSaved);
  const emergencySaved = formatMoney(snapshot.emergencyFund?.saved);
  const topCategory = snapshot.topSpendingCategory?.category;

  if (!snapshot.hasAnyData) {
    return "I need more finance data before I can give a clear answer. Add or refresh your wallets, expenses, budgets, savings, or emergency fund first.";
  }

  switch (action?.id) {
    case "hidden-risk-check":
      return [
        "Here’s the risk I’d watch first: hidden future costs, not just today’s spending.",
        available ? `You have ${available} visible money.` : null,
        emergencySaved ? `Emergency protection shows ${emergencySaved}.` : "I don’t see a strong emergency buffer yet.",
        "Check health, transportation, family support, maintenance, and debt before treating extra cash as spendable.",
      ].filter(Boolean).join(" ");

    case "monthly-money-review":
      return [
        spent ? `This month, your visible spending is ${spent}.` : "I don’t see enough monthly spending yet.",
        available ? `You still have ${available} visible.` : null,
        topCategory ? `The category to review first is ${topCategory}.` : null,
        "Next focus: protect essentials, reduce unplanned spending, and avoid adding new wants until the budget feels stable.",
      ].filter(Boolean).join(" ");

    case "next-best-move":
      if (snapshot.availableMoney !== null && snapshot.availableMoney < 1000) {
        return `Your next best move is defensive: protect your remaining ${available} and pause non-essential spending first.`;
      }
      if (snapshot.emergencyFund?.saved === null || snapshot.emergencyFund?.saved <= 0) {
        return "Your next best move is to start a small emergency buffer before increasing lifestyle spending.";
      }
      if (snapshot.unplannedSpent !== null && snapshot.unplannedSpent > 0) {
        return `Your next best move is to reduce unplanned spending first. That leak matters more than finding a new budget trick right now.`;
      }
      return "Your next best move is simple: keep spending planned, protect savings, and only buy what still makes sense tomorrow.";

    case "budget-fixer":
      return [
        budgetLeft ? `Your budget remaining shows ${budgetLeft}.` : "I need a clearer active budget to fully fix the allocation.",
        spent ? `Spending already shows ${spent}.` : null,
        "Start by increasing categories that repeat in real life and shrinking categories that look good on paper but never survive actual behavior.",
      ].filter(Boolean).join(" ");

    default:
      return "I can help with that. I’ll use your loaded wallets, expenses, budgets, savings, and emergency fund to keep the answer practical and decision-focused.";
  }
}

function buildLocalBrainReply(message, context, action = null) {
  const localReply = generateClaraLocalReply(message, context);

  if (
    localReply &&
    !localReply.includes("I can help with money decisions") &&
    !localReply.includes("What do you want to check?")
  ) {
    return localReply;
  }

  return buildUnsupportedActionReply(action, buildClaraFinanceSnapshot(context || {}));
}

export default function ClaraAiEnvironmentOverlay({
  isActive = false,
  messages = [],
  claraAssistantContext = {},
  onClose,
}) {
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const visibleMessages = useMemo(() => {
    const externalMessages = Array.isArray(messages)
      ? messages.filter((message) => !isWelcomeMessage(message))
      : [];

    return [...externalMessages, ...localMessages];
  }, [messages, localMessages]);

  useEffect(() => {
    if (!isActive) {
      setDraft("");
      setLocalMessages([]);
      setIsThinking(false);
      return undefined;
    }

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus?.();
    }, 180);

    return () => window.clearTimeout(focusTimer);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isActive, onClose]);

  useEffect(() => {
    if (!isActive) return;
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [isActive, visibleMessages.length, isThinking]);

  if (!isActive) return null;

  const updateMessage = (messageId, nextText, meta = {}) => {
    setLocalMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, text: nextText, ...meta } : message
      )
    );
  };

  const runClaraBrain = async ({ prompt, displayText = prompt, action = null }) => {
    const cleanPrompt = String(prompt || "").trim();
    const cleanDisplay = String(displayText || cleanPrompt).trim();
    if (!cleanPrompt || isThinking) return;

    const pendingMessage = makeLocalMessage(
      "clara",
      "Checking your real finance context..."
    );

    setIsThinking(true);
    setLocalMessages((current) => [
      ...current,
      makeLocalMessage("user", cleanDisplay),
      pendingMessage,
    ]);

    try {
      let reply = "";

      if (hasGeminiConfig()) {
        try {
          reply = await generateClaraGeminiReply({
            message: cleanPrompt,
            context: claraAssistantContext,
            mode: action?.id || "ai_environment",
            conversationHistory: [...visibleMessages, makeLocalMessage("user", cleanDisplay)],
          });
        } catch (geminiError) {
          reply = buildLocalBrainReply(cleanPrompt, claraAssistantContext, action);
        }
      } else {
        reply = buildLocalBrainReply(cleanPrompt, claraAssistantContext, action);
      }

      updateMessage(pendingMessage.id, reply, action ? { smartAction: action } : {});
    } catch (error) {
      updateMessage(
        pendingMessage.id,
        buildLocalBrainReply(cleanPrompt, claraAssistantContext, action),
        action ? { smartAction: action } : {}
      );
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleanDraft = draft.trim();
    if (!cleanDraft) return;

    runClaraBrain({ prompt: cleanDraft, displayText: cleanDraft });
    setDraft("");
  };

  const handleSmartAction = (action) => {
    runClaraBrain({
      prompt: action.prompt,
      displayText: action.title,
      action,
    });
  };

  return (
    <div className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-slate-950/72 px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),18px)] text-white backdrop-blur-[2px]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_4%,rgba(45,212,191,0.24),transparent_32%),radial-gradient(circle_at_88%_22%,rgba(124,58,237,0.22),transparent_36%),linear-gradient(180deg,rgba(2,6,23,0.88),rgba(2,6,23,0.96))]" />

      <header className="shrink-0 pb-3 pt-1">
        <div className="flex items-center gap-3 rounded-[26px] border border-white/12 bg-white/[0.065] px-3.5 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-100/20 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)]">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/60">
              CLARA AI Mode
            </p>
            <h2 className="truncate text-[1.02rem] font-black leading-tight tracking-tight text-white">
              Ask before you spend.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.075] text-white/72 transition hover:bg-white/[0.12] active:scale-95"
            aria-label="Close CLARA AI mode"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-1 py-3 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        {visibleMessages.length ? (
          <div className="flex min-h-full flex-col justify-end gap-3 pb-2">
            {visibleMessages.map((message) => {
              const isUser = message.role === "user";
              const action = message.smartAction;

              return (
                <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[88%] rounded-[24px] px-4 py-3 text-[13px] leading-5 shadow-[0_14px_34px_rgba(0,0,0,0.20)] ${
                      isUser
                        ? "bg-emerald-300 text-slate-950"
                        : "border border-white/12 bg-white/[0.075] text-white/86 backdrop-blur-xl"
                    }`}
                  >
                    {action && !isUser ? (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/55">
                          Smart Action
                        </p>
                        <h4 className="mt-1 text-[15px] font-black text-white">{action.title}</h4>
                        <p className="mt-2 text-[12px] leading-5 text-slate-300/85">{message.text}</p>
                        {action.question ? (
                          <p className="mt-3 text-[12px] leading-5 text-emerald-100/85">{action.question}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {action.chips?.map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              disabled={isThinking}
                              onClick={() =>
                                runClaraBrain({
                                  prompt: `${action.prompt}\nUser selected: ${chip}`,
                                  displayText: chip,
                                  action,
                                })
                              }
                              className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-bold text-emerald-100 active:scale-95 disabled:opacity-45"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      message.text
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex min-h-full flex-col justify-center gap-4 pb-2">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/55">
                Decision space
              </p>
              <h3 className="mt-3 text-2xl font-black leading-tight tracking-tight text-white">
                What do you want CLARA to check?
              </h3>
              <p className="mx-auto mt-3 max-w-[280px] text-sm leading-6 text-slate-300/75">
                Choose a smart action or ask your own money question.
              </p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/55">
                  Smart Actions
                </p>
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-2 py-1 text-[10px] font-bold text-white/45">
                  {SMART_ACTIONS.length} tools
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {SMART_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    disabled={isThinking}
                    onClick={() => handleSmartAction(action)}
                    className="group min-h-[86px] rounded-[22px] border border-white/10 bg-white/[0.055] p-3 text-left shadow-[0_12px_26px_rgba(0,0,0,0.14)] transition hover:bg-white/[0.085] active:scale-[0.98] disabled:opacity-45"
                  >
                    <p className="text-[12px] font-black leading-tight text-white group-active:text-emerald-100">
                      {action.shortTitle}
                    </p>
                    <p className="mt-1.5 line-clamp-3 text-[10.5px] leading-4 text-slate-300/66">
                      {action.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 rounded-[28px] border border-white/16 bg-slate-950/68 p-2.5 shadow-[0_-18px_50px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl"
      >
        <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.055] px-3 py-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium text-white outline-none placeholder:text-slate-400/70"
            placeholder="Ask CLARA or enter item + price"
            inputMode="text"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isThinking}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_26px_rgba(110,231,183,0.22)] transition disabled:opacity-45 active:scale-95"
            aria-label="Send to CLARA"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
