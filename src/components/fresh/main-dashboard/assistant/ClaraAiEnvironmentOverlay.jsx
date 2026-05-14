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

const CLARA_AI_BRAIN_VERSION = "connected-brain-v3-presentation";

const CLARA_PRESENTATION_INSTRUCTION = `
Format your answer for the CLARA mobile AI screen.
Use plain text only. Do not use markdown, asterisks, bold syntax, numbered essays, or long paragraphs.
Use short labeled sections when helpful:
Money Signal:
Risk:
Next Move:
Question:
Keep it practical, calm, and decision-focused.
`;

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

const LEGACY_PLACEHOLDER_PATTERNS = [
  "i’m setting up the right clara check",
  "i'm setting up the right clara check",
  "smart action layer is now ready visually",
  "next step is wiring each action",
];

const SECTION_TONES = {
  good: "border-emerald-200/18 bg-emerald-300/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_28px_rgba(16,185,129,0.08)]",
  risk: "border-amber-200/18 bg-amber-300/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_28px_rgba(245,158,11,0.08)]",
  action: "border-cyan-200/18 bg-cyan-300/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_28px_rgba(34,211,238,0.08)]",
  neutral: "border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
};

function getMessageText(message = {}) {
  return String(message?.text || "").trim();
}

function isWelcomeMessage(message = {}) {
  return getMessageText(message) === "What are you thinking of buying?";
}

function isLegacyPlaceholderMessage(message = {}) {
  const text = getMessageText(message).toLowerCase();
  return LEGACY_PLACEHOLDER_PATTERNS.some((pattern) => text.includes(pattern));
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

function stripMarkdown(text = "") {
  return String(text || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function titleCase(value = "") {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function normalizeSectionTitle(title = "") {
  const cleanTitle = stripMarkdown(title)
    .replace(/possible\s+/i, "")
    .replace(/potential\s+/i, "")
    .replace(/current\s+/i, "")
    .replace(/action\s+focus/i, "Next Move")
    .replace(/forecast/i, "Money Signal")
    .trim();

  if (/positive|good|healthy|safe|strength|win|breathing/i.test(cleanTitle)) return "Good Signal";
  if (/risk|concern|warning|danger|pressure|tight|problem/i.test(cleanTitle)) return "Risk Signal";
  if (/action|next|move|focus|recommendation|step/i.test(cleanTitle)) return "Next Move";
  if (/question|ask|clarify/i.test(cleanTitle)) return "Question";
  if (/wallet|money|budget|saving|emergency|income|spending/i.test(cleanTitle)) return titleCase(cleanTitle);

  return titleCase(cleanTitle || "CLARA Note");
}

function getSectionTone(title = "", body = "") {
  const text = `${title} ${body}`.toLowerCase();

  if (/risk|concern|warning|danger|tight|hard|not recommended|delay|pause|pressure/.test(text)) {
    return SECTION_TONES.risk;
  }

  if (/action|next|move|focus|recommendation|step|do this|question/.test(text)) {
    return SECTION_TONES.action;
  }

  if (/good|positive|healthy|safe|breathing|well|progress|okay/.test(text)) {
    return SECTION_TONES.good;
  }

  return SECTION_TONES.neutral;
}

function splitReadableBlocks(text = "") {
  const clean = stripMarkdown(text);
  if (!clean) return [];

  const paragraphs = clean
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (paragraphs.length > 1) return paragraphs;

  const sentences = clean
    .split(/(?<=[.!?])\s+(?=[A-Z₱0-9])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length <= 2) return [clean];

  const blocks = [];
  let current = "";

  sentences.forEach((sentence) => {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > 145 && current) {
      blocks.push(current);
      current = sentence;
    } else {
      current = next;
    }
  });

  if (current) blocks.push(current);
  return blocks;
}

function buildInsightSections(rawText = "") {
  const raw = String(rawText || "").trim();
  if (!raw) return { intro: "", sections: [] };

  let prepared = raw
    .replace(/\*\*([^*:\n]{2,70}):\*\*/g, "\n@@$1@@\n")
    .replace(/\*\*([^*:\n]{2,70})\*\*:/g, "\n@@$1@@\n")
    .replace(
      /(?:^|\n|\s)(Money Signal|Good Signal|Positive Signal|Possible Positive|Risk Signal|Potential Risk|Risk|Concern|Warning|Next Move|Action Focus|Action|Recommendation|Question|Budget|Wallet|Savings|Emergency Fund|Spending Signal|Forecast):/gi,
      "\n@@$1@@\n"
    );

  prepared = prepared.replace(/\n{3,}/g, "\n\n").trim();

  const parts = prepared.split(/@@([^@]+)@@/g).map((part) => part.trim()).filter(Boolean);
  const sections = [];
  let intro = "";

  if (parts.length >= 3) {
    if (!prepared.startsWith("@@")) {
      intro = stripMarkdown(parts.shift() || "");
    }

    for (let index = 0; index < parts.length; index += 2) {
      const title = normalizeSectionTitle(parts[index]);
      const body = stripMarkdown(parts[index + 1] || "");
      if (title && body) sections.push({ title, body });
    }
  }

  if (!sections.length) {
    const blocks = splitReadableBlocks(raw);
    if (blocks.length <= 1) return { intro: blocks[0] || stripMarkdown(raw), sections: [] };

    intro = blocks.shift() || "";
    blocks.slice(0, 4).forEach((block, index) => {
      const title = index === blocks.length - 1 ? "Next Move" : index === 0 ? "Money Signal" : "CLARA Note";
      sections.push({ title, body: block });
    });
  }

  return { intro, sections };
}

function ClaraInsightPresentation({ text, action }) {
  const { intro, sections } = buildInsightSections(text);
  const shouldUseCards = Boolean(action || sections.length || String(text || "").length > 130);

  if (!shouldUseCards) {
    return <p className="whitespace-pre-wrap text-[13px] leading-5 text-white/88">{stripMarkdown(text)}</p>;
  }

  return (
    <div className="space-y-3">
      {action ? (
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/55">
            Smart Action
          </p>
          <h4 className="mt-1 text-[15px] font-black text-white">{action.title}</h4>
        </div>
      ) : null}

      {intro ? (
        <p className="text-[13px] leading-5 text-slate-200/88">{intro}</p>
      ) : null}

      {sections.length ? (
        <div className="space-y-2.5">
          {sections.slice(0, 5).map((section, index) => (
            <div
              key={`${section.title}-${index}`}
              className={`rounded-[18px] border px-3 py-2.5 ${getSectionTone(section.title, section.body)}`}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/48">
                {section.title}
              </p>
              <div className="mt-1.5 space-y-1.5 text-[12px] leading-5 text-slate-200/86">
                {splitReadableBlocks(section.body).map((block, blockIndex) => (
                  <p key={`${section.title}-${blockIndex}`}>{block}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function buildUnsupportedActionReply(action, snapshot = {}) {
  const available = formatMoney(snapshot.availableMoney);
  const spent = formatMoney(snapshot.monthlySpent);
  const budgetLeft = formatMoney(snapshot.budgetRemaining);
  const emergencySaved = formatMoney(snapshot.emergencyFund?.saved);
  const topCategory = snapshot.topSpendingCategory?.category;

  if (!snapshot.hasAnyData) {
    return "Money Signal: I need more finance data before I can give a clear answer. Next Move: Add or refresh your wallets, expenses, budgets, savings, or emergency fund first.";
  }

  switch (action?.id) {
    case "hidden-risk-check":
      return [
        "Money Signal: Hidden future costs are the first thing I’d watch, not just today’s spending.",
        available ? `Wallet: You have ${available} visible money.` : null,
        emergencySaved ? `Emergency Fund: Emergency protection shows ${emergencySaved}.` : "Risk: I don’t see a strong emergency buffer yet.",
        "Next Move: Check health, transportation, family support, maintenance, and debt before treating extra cash as spendable.",
      ].filter(Boolean).join(" ");

    case "monthly-money-review":
      return [
        spent ? `Spending Signal: This month, your visible spending is ${spent}.` : "Spending Signal: I don’t see enough monthly spending yet.",
        available ? `Wallet: You still have ${available} visible.` : null,
        topCategory ? `Risk Signal: The category to review first is ${topCategory}.` : null,
        "Next Move: Protect essentials, reduce unplanned spending, and avoid adding new wants until the budget feels stable.",
      ].filter(Boolean).join(" ");

    case "next-best-move":
      if (snapshot.availableMoney !== null && snapshot.availableMoney < 1000) {
        return `Risk Signal: Your remaining money is thin at ${available}. Next Move: Protect essentials and pause non-essential spending first.`;
      }
      if (snapshot.emergencyFund?.saved === null || snapshot.emergencyFund?.saved <= 0) {
        return "Risk Signal: Your emergency buffer does not look protected yet. Next Move: Start a small emergency buffer before increasing lifestyle spending.";
      }
      if (snapshot.unplannedSpent !== null && snapshot.unplannedSpent > 0) {
        return "Risk Signal: Unplanned spending is the leak to watch first. Next Move: Reduce unplanned purchases before looking for another budget trick.";
      }
      return "Good Signal: Your situation does not look like panic mode. Next Move: Keep spending planned, protect savings, and only buy what still makes sense tomorrow.";

    case "budget-fixer":
      return [
        budgetLeft ? `Budget: Your budget remaining shows ${budgetLeft}.` : "Budget: I need a clearer active budget to fully fix the allocation.",
        spent ? `Spending Signal: Spending already shows ${spent}.` : null,
        "Next Move: Increase categories that repeat in real life and shrink categories that look good on paper but never survive actual behavior.",
      ].filter(Boolean).join(" ");

    default:
      return "Money Signal: I can help with that using your loaded wallets, expenses, budgets, savings, and emergency fund. Next Move: Keep the decision practical and aligned with your current money pressure.";
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
    const externalMessages = Array.isArray(messages) ? messages : [];
    return [...externalMessages, ...localMessages].filter(
      (message) => !isWelcomeMessage(message) && !isLegacyPlaceholderMessage(message)
    );
  }, [messages, localMessages]);

  useEffect(() => {
    if (!isActive) {
      setDraft("");
      setLocalMessages([]);
      setIsThinking(false);
      return undefined;
    }

    setLocalMessages((current) => current.filter((message) => !isLegacyPlaceholderMessage(message)));

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus?.();
    }, 180);

    return () => window.clearTimeout(focusTimer);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose?.();
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

    const pendingMessage = makeLocalMessage("clara", "Checking your real finance context...");

    setIsThinking(true);
    setLocalMessages((current) => [
      ...current.filter((message) => !isLegacyPlaceholderMessage(message)),
      makeLocalMessage("user", cleanDisplay),
      pendingMessage,
    ]);

    try {
      let reply = "";
      if (hasGeminiConfig()) {
        try {
          reply = await generateClaraGeminiReply({
            message: `${cleanPrompt}\n\n${CLARA_PRESENTATION_INSTRUCTION}`,
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
    runClaraBrain({ prompt: action.prompt, displayText: action.title, action });
  };

  return (
    <div
      className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-slate-950/72 px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),18px)] text-white backdrop-blur-[2px]"
      data-clara-ai-brain-version={CLARA_AI_BRAIN_VERSION}
    >
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
                    className={`rounded-[24px] px-4 py-3 text-[13px] leading-5 shadow-[0_14px_34px_rgba(0,0,0,0.20)] ${
                      isUser
                        ? "max-w-[88%] bg-emerald-300 text-slate-950"
                        : "max-w-[94%] border border-white/12 bg-white/[0.075] text-white/86 backdrop-blur-xl"
                    }`}
                  >
                    {isUser ? (
                      stripMarkdown(message.text)
                    ) : (
                      <ClaraInsightPresentation text={message.text} action={action} />
                    )}

                    {action && !isUser && action.question ? (
                      <div className="mt-3 border-t border-white/10 pt-3">
                        <p className="text-[12px] leading-5 text-emerald-100/85">{action.question}</p>
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
                    ) : null}
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
