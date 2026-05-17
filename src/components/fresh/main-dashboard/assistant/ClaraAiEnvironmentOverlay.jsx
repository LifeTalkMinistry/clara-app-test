import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { buildClaraFinanceSnapshot, generateClaraLocalReply } from "@/lib/clara-local-brain";
import { generateClaraGeminiReply, hasGeminiConfig } from "@/lib/clara-gemini-client";
import { buildContextualFinanceReply } from "@/lib/clara-direct-finance-reply";

const CLARA_AI_BRAIN_VERSION = "connected-brain-v9-context-wallets";
const PRESENTATION_RULES = "Reply like a normal chat message. Plain text only. No markdown. Do not use headings, labels, section titles, bullets, tables, or report format. Give one natural conversational reply in 1-3 short sentences.";
const SHOW_DEBUG_SOURCE = import.meta.env.DEV || import.meta.env.VITE_CLARA_DEBUG_AI === "true";
const DEFAULT_CHAT_INPUT_PLACEHOLDER = "Ask CLARA or enter item + price";

const DEFAULT_CLARA_GREETINGS = [
  {
    eyebrow: "ASK BEFORE YOU SPEND",
    heading: "Hi, any spending concern today?",
    body: [
      "Tell CLARA what you are thinking of buying, changing, or checking before you act.",
      "You can also choose a guided path below if you want more structure.",
    ],
  },
  {
    eyebrow: "CLARA IS READY",
    heading: "What money situation are we figuring out?",
    body: [
      "Start with what is on your mind: a purchase, a budget concern, a savings goal, or a money pressure today.",
      "CLARA can talk naturally or guide you through a specific action when you choose one.",
    ],
  },
  {
    eyebrow: "BEFORE YOU ACT",
    heading: "Anything tempting your wallet today?",
    body: [
      "Share the item, amount, reason, or situation so CLARA can help you think clearly first.",
      "Choose a category below only when you want the screen to become more specific.",
    ],
  },
  {
    eyebrow: "MONEY CHECK-IN",
    heading: "Need help thinking through a decision?",
    body: [
      "You can ask freely, or select Smart Actions and Core Features when you need a more guided check.",
      "No rush. CLARA is here to help you pause before spending.",
    ],
  },
];

const CHAT_INPUT_PLACEHOLDERS = [
  "Tell CLARA what’s happening today...",
  "Share what’s affecting your spending...",
  "Tell CLARA about your current situation...",
  "What’s been going on lately?",
  "Share a habit, feeling, or concern...",
  "Tell CLARA before you decide...",
  "What should CLARA understand about you?",
  "Share anything CLARA should know...",
];

const TALK_TO_CLARA_CONTEXT_ACTION = {
  id: "talk_to_clara_context",
  title: "Talk to CLARA",
  shortTitle: "Talk to CLARA",
  prompt: `Continue the Talk to CLARA conversation naturally.`,
  chips: [],
};

const PANEL_COPY = {
  talk: {
    label: "Talk to CLARA",
    eyebrow: "TALK TO CLARA",
    heading: "Tell CLARA what’s really happening in your life.",
    body: [
      "Share anything that may affect your spending — habits, routines, goals, pressure, feelings, or daily situations.",
      "When you choose to save it, CLARA can use that context to guide future decisions based on you, not just your numbers.",
    ],
  },
  smart: {
    label: "Smart Actions",
    eyebrow: "SMART ACTIONS",
    heading: "Choose a guided money action.",
    body: [
      "Smart Actions are structured CLARA flows for faster financial decisions.",
      "Use them to check affordability, review spending leaks, plan savings, fix budget pressure, or decide your next best move.",
    ],
  },
  core: {
    label: "Core Features",
    eyebrow: "CORE FEATURES",
    heading: "Your financial system in one place.",
    body: [
      "Core Features are the foundations CLARA uses to understand your money.",
      "Manage wallets, budgets, emergency funds, savings goals, investments, and obligations so CLARA can give better guidance.",
    ],
  },
};

const CORE_FEATURES = [
  { id: "wallets", title: "Wallets", description: "Visible money and wallet pressure.", prompt: "Check my wallet health and tell me what money is safe to use today." },
  { id: "budgets", title: "Budgets", description: "Budget pressure and remaining room.", prompt: "Check my budget health and tell me what is pressured or still safe." },
  { id: "emergency", title: "Emergency Fund", description: "Safety buffer and protection.", prompt: "Check my emergency fund and tell me the next safest step." },
  { id: "savings-goals", title: "Savings Goals", description: "Savings progress and goal protection.", prompt: "Check my savings goals and tell me what spending could slow my goal." },
  { id: "investment", title: "Investment", description: "Growth money and future direction.", prompt: "Check my investment situation and tell me how it should fit my current money priorities." },
  { id: "debt-obligations", title: "Debt/Obligations", description: "Payables, pressure, and commitments.", prompt: "Check my debt and obligations pressure and tell me what I should prioritize next." },
];

const SMART_ACTIONS = [
  { id: "forecast", title: "Future Money Forecast", shortTitle: "Forecast", description: "Predict where your money is heading.", prompt: "Run my Future Money Forecast using income, expenses, budgets, savings, wallets, unplanned spending, and hidden risks.", chips: ["This week", "This month", "Next payday"] },
  { id: "checkup", title: "Spending Checkup", shortTitle: "Checkup", description: "Find spending leaks and patterns.", prompt: "Run my Spending Checkup. Explain my biggest spending leak and what to fix first.", chips: ["Be direct", "Gentle", "Biggest leak"] },
  { id: "savings-plan", title: "Savings Game Plan", shortTitle: "Savings Plan", description: "Reach savings realistically.", prompt: "Create my Savings Game Plan based on my current money, spending, and budget behavior.", chips: ["Safe plan", "Faster plan", "Daily steps"] },
  { id: "emergency-plan", title: "Emergency Fund Builder", shortTitle: "Emergency Fund", description: "Build a practical safety fund.", prompt: "Build my Emergency Fund plan using my expenses, income, savings, and wallet situation.", chips: ["Starter fund", "Full fund", "Monthly target"] },
  { id: "afford", title: "Can I Afford This?", shortTitle: "Afford Check", description: "Check if a purchase is safe.", prompt: "Help me check if I can afford a purchase. Ask for item and amount if needed.", chips: ["₱500", "₱1,000", "₱2,500"] },
  { id: "budget-fixer", title: "Budget Fixer", shortTitle: "Budget Fixer", description: "Improve budget allocation.", prompt: "Run my Budget Fixer and suggest better allocation based on my real spending behavior.", chips: ["Survival", "Savings", "Control"] },
  { id: "risk", title: "Hidden Risk Check", shortTitle: "Risk Check", description: "Find ignored future costs.", prompt: "Run my Hidden Risk Check and find ignored areas that may affect money later.", chips: ["Personal", "Family", "Bills"] },
  { id: "monthly-review", title: "Monthly Money Review", shortTitle: "Monthly Review", description: "Review wins, leaks, and next focus.", prompt: "Run my Monthly Money Review. Summarize what went well, what hurt my budget, biggest risk, and next focus.", chips: ["Quick", "Deep", "Next focus"] },
  { id: "next-move", title: "Next Best Move", shortTitle: "Next Move", description: "One clear action for today.", prompt: "Give me my Next Best Move based on my current money situation.", chips: ["Spending", "Saving", "Budgeting"] },
];

function pickRandomItem(items = []) {
  return items[Math.floor(Math.random() * items.length)] || items[0];
}

function pickDefaultGreeting() {
  return pickRandomItem(DEFAULT_CLARA_GREETINGS);
}

function pickChatInputPlaceholder() {
  return pickRandomItem(CHAT_INPUT_PLACEHOLDERS);
}

function buildTalkToClaraPrompt(userText = "") {
  return `Talk to CLARA context mode is active.

Actual user message:
${String(userText || "").trim()}

How CLARA should respond:
- First understand what happened in the message: greeting only, reply to a previous question, current money issue, life update, or request for advice.
- Acknowledge warmly and naturally.
- Do not show or mention buttons, chips, options, workflows, modes, or categories.
- Do not reply with only "How can I help you today?"
- If the user only greets CLARA and CLARA does not know what to call them yet, start simple by asking what CLARA should call them.
- If the user gives a name after CLARA asked what to call them, confirm if CLARA should use that name moving forward.
- If the user confirms the name, continue gently with one basic profile question.
- After each answer, ask only one next foundation question at a time.
- If the user shares a real issue at any point, pause the profile questions and help with that issue first.
- Keep the tone respectful, calm, and practical.
- Do not claim information was permanently saved. You may say CLARA can use it as context in this conversation, or that it can help future guidance when the user chooses to save it.

Reply as CLARA in 1-3 short sentences.`;
}

function makeMessage(role, text, meta = {}) {
  return { id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`, role, text, ...meta };
}

function clean(text = "") {
  return String(text || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeNaturalChatReply(text = "") {
  return clean(text)
    .replace(/\b(Money Signal|Spending Signal|Next Move|Risk|Budget|Wallet|Savings|Emergency Fund|Question|CLARA says|Money Note|Smart Action):\s*/gi, "")
    .replace(/\s*\|\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function hiddenMessage(message = {}) {
  const text = String(message.text || "").toLowerCase();
  return text.includes("what are you thinking of buying") || text.includes("setting up the right clara check") || text.includes("wiring each action");
}

function formatMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : null;
}

function fallbackReply(prompt, context) {
  const direct = buildContextualFinanceReply(prompt, context);
  if (direct) return direct;

  const snapshot = buildClaraFinanceSnapshot(context || {});
  const local = normalizeNaturalChatReply(generateClaraLocalReply(prompt, context));

  if (local && !local.includes("I can help with money decisions") && !local.includes("What do you want to check?")) {
    return local;
  }

  const available = formatMoney(snapshot.availableMoney);
  const spent = formatMoney(snapshot.monthlySpent);

  if (!snapshot.hasAnyData) {
    return "I need a little more finance data first. Add your wallet, expenses, budget, savings, or emergency fund, then I can guide you better.";
  }

  if (available && spent) {
    return `You have ${available} visible money right now, and your spending shows ${spent}. Keep the next decision planned, necessary, and aligned with your current money pressure.`;
  }

  if (available) {
    return `You have ${available} visible money right now. Keep your next spending decision planned and aligned with your current budget.`;
  }

  return "I can read your loaded finance context now. Keep the next decision planned, necessary, and aligned with your current money pressure.";
}

function Insight({ text, source }) {
  const reply = normalizeNaturalChatReply(text);

  return (
    <div className="space-y-2">
      {SHOW_DEBUG_SOURCE ? (
        <div className="inline-flex rounded-full bg-white/[0.05] px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
          Source: {source === "gemini" ? "Gemini" : source === "local_finance" ? "Local finance" : "Local fallback"}
        </div>
      ) : null}

      <p className="whitespace-pre-wrap text-[13px] leading-5 text-slate-100/90">{reply}</p>
    </div>
  );
}

function PanelButton({ active, children, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-3 py-2 text-[11px] font-black transition active:scale-95 ${active ? "border-emerald-200/25 bg-emerald-300/15 text-emerald-100" : "border-white/10 bg-white/[0.055] text-white/60 hover:bg-white/[0.08]"}`}>
      {children}
    </button>
  );
}

function OptionCard({ item, disabled, onClick }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="group min-h-[82px] rounded-[22px] border border-white/10 bg-white/[0.055] p-3 text-left shadow-[0_12px_26px_rgba(0,0,0,0.14)] transition hover:bg-white/[0.085] active:scale-[0.98] disabled:opacity-45">
      <p className="text-[12px] font-black leading-tight text-white group-active:text-emerald-100">{item.shortTitle || item.title}</p>
      <p className="mt-1.5 line-clamp-3 text-[10.5px] leading-4 text-slate-300/66">{item.description}</p>
    </button>
  );
}

function PanelInstructionBoard({ panel, greeting, onClose }) {
  const copy = panel ? PANEL_COPY[panel] : greeting;

  return (
    <div className="relative rounded-[30px] border border-white/10 bg-white/[0.045] px-5 pb-5 pt-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all duration-300">
      <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-white/12 bg-white/[0.075] text-white/72 transition hover:bg-white/[0.12] active:scale-95" aria-label="Close CLARA AI mode">
        <X className="h-4 w-4" />
      </button>
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/55">{copy.eyebrow}</p>
      <h3 className="mt-3 text-2xl font-black leading-tight tracking-tight text-white">{copy.heading}</h3>
      <div className="mx-auto mt-3 max-w-[300px] space-y-2 text-sm leading-6 text-slate-300/75">
        {copy.body.map((line) => <p key={line}>{line}</p>)}
      </div>
    </div>
  );
}

function FloatingCloseButton({ onClose }) {
  return (
    <button type="button" onClick={onClose} className="absolute right-4 top-[max(env(safe-area-inset-top),18px)] z-10 grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-white/[0.075] text-white/72 shadow-[0_14px_34px_rgba(0,0,0,0.16)] backdrop-blur-xl transition hover:bg-white/[0.12] active:scale-95" aria-label="Close CLARA AI mode">
      <X className="h-4 w-4" />
    </button>
  );
}

export default function ClaraAiEnvironmentOverlay({ isActive = false, messages = [], claraAssistantContext = {}, onClose }) {
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [panel, setPanel] = useState(null);
  const [greeting, setGreeting] = useState(() => pickDefaultGreeting());
  const [chatInputPlaceholder, setChatInputPlaceholder] = useState(() => pickChatInputPlaceholder());
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const visibleMessages = useMemo(() => {
    const externalMessages = Array.isArray(messages) ? messages : [];
    return [...externalMessages, ...localMessages].filter((message) => !hiddenMessage(message));
  }, [messages, localMessages]);

  useEffect(() => {
    if (!isActive) {
      setDraft("");
      setLocalMessages([]);
      setIsThinking(false);
      setPanel(null);
      return undefined;
    }
    setPanel(null);
    setGreeting(pickDefaultGreeting());
    setChatInputPlaceholder(pickChatInputPlaceholder());
    setLocalMessages((current) => current.filter((message) => !hiddenMessage(message)));
    const timer = window.setTimeout(() => inputRef.current?.focus?.(), 180);
    return () => window.clearTimeout(timer);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return undefined;
    const handleEscape = (event) => event.key === "Escape" && onClose?.();
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isActive, onClose]);

  useEffect(() => {
    if (isActive) messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [isActive, visibleMessages.length, isThinking]);

  if (!isActive) return null;

  const runClara = async ({ prompt, displayText = prompt, action = null }) => {
    const cleanPrompt = String(prompt || "").trim();
    const cleanDisplay = String(displayText || cleanPrompt).trim();

    if (!cleanPrompt || isThinking) return;

    const pending = makeMessage("clara", "Thinking...", {
      source: "system"
    });

    setIsThinking(true);

    setLocalMessages((current) => [
      ...current.filter((message) => !hiddenMessage(message)),
      makeMessage("user", cleanDisplay),
      pending
    ]);

    try {
      let reply = "";
      let source = "local_fallback";
      const directFinanceReply = buildContextualFinanceReply(cleanPrompt, claraAssistantContext);

      if (directFinanceReply) {
        reply = directFinanceReply;
        source = "local_finance";
      } else if (hasGeminiConfig()) {
        try {
          reply = await generateClaraGeminiReply({
            message: `${cleanPrompt}\n\n${PRESENTATION_RULES}`,
            context: claraAssistantContext,
            mode: action?.id || "ai_environment",
            conversationHistory: [...visibleMessages, makeMessage("user", cleanDisplay)],
          });

          source = "gemini";
        } catch (error) {
          console.warn("[CLARA AI] Gemini failed, using local fallback", {
            message: error?.message,
            status: error?.status,
            payload: error?.payload,
          });

          reply = fallbackReply(cleanPrompt, claraAssistantContext);
          source = "local_fallback";
        }
      } else {
        console.warn("[CLARA AI] Gemini configuration missing, using local fallback");
        reply = fallbackReply(cleanPrompt, claraAssistantContext);
      }

      setLocalMessages((current) => current.map((message) => {
        if (message.id !== pending.id) return message;

        return {
          ...message,
          text: normalizeNaturalChatReply(reply),
          source,
          ...(action ? { smartAction: action } : {})
        };
      }));
    } catch (error) {
      console.error("[CLARA AI] Fatal assistant modal error", error);

      setLocalMessages((current) => current.map((message) => {
        if (message.id !== pending.id) return message;

        return {
          ...message,
          text: fallbackReply(cleanPrompt, claraAssistantContext),
          source: "local_fallback",
          ...(action ? { smartAction: action } : {})
        };
      }));
    } finally {
      setIsThinking(false);
    }
  };

  const submitDraft = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const isTalkToClaraMode = panel === "talk";
    runClara({
      prompt: isTalkToClaraMode ? buildTalkToClaraPrompt(text) : text,
      displayText: text,
      action: isTalkToClaraMode ? TALK_TO_CLARA_CONTEXT_ACTION : null,
    });
    setDraft("");
  };

  return (
    <div className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-slate-950/72 px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),18px)] text-white backdrop-blur-[2px]" data-clara-ai-brain-version={CLARA_AI_BRAIN_VERSION}>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_4%,rgba(45,212,191,0.24),transparent_32%),radial-gradient(circle_at_88%_22%,rgba(124,58,237,0.22),transparent_36%),linear-gradient(180deg,rgba(2,6,23,0.88),rgba(2,6,23,0.96))]" />
      {visibleMessages.length ? <FloatingCloseButton onClose={onClose} /> : null}

      <main className="min-h-0 flex-1 overflow-y-auto px-1 py-3 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        {visibleMessages.length ? (
          <div className="flex min-h-full flex-col justify-end gap-3 pb-2 pt-12">
            {visibleMessages.map((message) => {
              const isUser = message.role === "user";
              const action = message.smartAction;
              return (
                <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`px-4 py-3 text-[13px] leading-5 shadow-[0_14px_34px_rgba(0,0,0,0.16)] ${isUser ? "max-w-[88%] rounded-[24px] bg-emerald-300 text-slate-950" : "max-w-[88%] rounded-[24px] bg-white/[0.075] text-white/86 backdrop-blur-xl"}`}>
                    {isUser ? clean(message.text) : <Insight text={message.text} action={action} source={message.source} />}
                    {action && !isUser && action.chips?.length ? (
                      <div className="mt-3 border-t border-white/10 pt-3">
                        <p className="text-[12px] leading-5 text-emerald-100/85">What should we narrow down next?</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {action.chips.map((chip) => <button key={chip} type="button" disabled={isThinking} onClick={() => runClara({ prompt: `${action.prompt}\nUser selected: ${chip}`, displayText: chip, action })} className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-bold text-emerald-100 active:scale-95 disabled:opacity-45">{chip}</button>)}
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
            <PanelInstructionBoard panel={panel} greeting={greeting} onClose={onClose} />

            <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
              <div className="grid grid-cols-3 gap-2">
                <PanelButton active={panel === "talk"} onClick={() => { setPanel("talk"); setChatInputPlaceholder(pickChatInputPlaceholder()); }}>Talk to CLARA</PanelButton>
                <PanelButton active={panel === "core"} onClick={() => setPanel("core")}>Core Features</PanelButton>
                <PanelButton active={panel === "smart"} onClick={() => setPanel("smart")}>Smart Actions</PanelButton>
              </div>

              {panel === "smart" ? <div className="mt-3 grid grid-cols-2 gap-2">{SMART_ACTIONS.map((action) => <OptionCard key={action.id} item={action} disabled={isThinking} onClick={() => runClara({ prompt: action.prompt, displayText: action.title, action })} />)}</div> : null}
              {panel === "core" ? <div className="mt-3 grid grid-cols-2 gap-2">{CORE_FEATURES.map((feature) => <OptionCard key={feature.id} item={feature} disabled={isThinking} onClick={() => runClara({ prompt: feature.prompt, displayText: feature.title, action: { ...feature, chips: ["Can I buy this?", "Next move", "Check risk"] } })} />)}</div> : null}
            </div>
          </div>
        )}
      </main>

      <form onSubmit={submitDraft} className="shrink-0 rounded-[28px] border border-white/16 bg-slate-950/68 p-2.5 shadow-[0_-18px_50px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
        <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.055] px-3 py-2">
          <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium text-white outline-none placeholder:text-slate-400/70" placeholder={panel === "talk" ? chatInputPlaceholder : DEFAULT_CHAT_INPUT_PLACEHOLDER} inputMode="text" />
          <button type="submit" disabled={!draft.trim() || isThinking} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_26px_rgba(110,231,183,0.22)] transition disabled:opacity-45 active:scale-95" aria-label="Send to CLARA"><ArrowUp className="h-5 w-5" /></button>
        </div>
      </form>
    </div>
  );
}
