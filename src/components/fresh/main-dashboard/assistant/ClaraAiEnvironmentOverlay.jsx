import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Sparkles, X } from "lucide-react";
import { buildClaraFinanceSnapshot, generateClaraLocalReply } from "@/lib/clara-local-brain";
import { generateClaraGeminiReply, hasGeminiConfig } from "@/lib/clara-gemini-client";

const CLARA_AI_BRAIN_VERSION = "connected-brain-v4-daily-decision";
const PRESENTATION_RULES = "Format for a mobile money coach. Plain text only. No markdown. Use short labels like Money Signal, Risk, Next Move, Question. Keep it practical and calm.";

const QUICK_QUESTIONS = [
  { label: "Can I buy this?", prompt: "Help me decide if I can buy something. Ask for item, price, and wallet if missing, then say if it is safe, risky, or better delayed." },
  { label: "Check my money", prompt: "Check my current money situation. Tell me what is safe, what is pressured, and what I should watch before spending today." },
  { label: "Next move", prompt: "Based on my current money situation, tell me the clearest next financial move I should take today." },
];

const CORE_FEATURES = [
  { id: "wallets", title: "Wallets", description: "Visible money and wallet pressure.", prompt: "Check my wallet health and tell me what money is safe to use today." },
  { id: "budget", title: "Budget", description: "Budget pressure and remaining room.", prompt: "Check my budget health and tell me what is pressured or still safe." },
  { id: "savings", title: "Savings", description: "Savings progress and goal protection.", prompt: "Check my savings progress and tell me what spending could slow my goal." },
  { id: "emergency", title: "Emergency Fund", description: "Safety buffer and protection.", prompt: "Check my emergency fund and tell me the next safest step." },
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

function hiddenMessage(message = {}) {
  const text = String(message.text || "").toLowerCase();
  return text.includes("what are you thinking of buying") || text.includes("setting up the right clara check") || text.includes("wiring each action");
}

function formatMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : null;
}

function fallbackReply(prompt, context) {
  const snapshot = buildClaraFinanceSnapshot(context || {});
  const local = generateClaraLocalReply(prompt, context);
  if (local && !local.includes("I can help with money decisions") && !local.includes("What do you want to check?")) return local;
  const available = formatMoney(snapshot.availableMoney);
  const spent = formatMoney(snapshot.monthlySpent);
  if (!snapshot.hasAnyData) return "Money Signal: I need more finance data first. Next Move: Add wallets, expenses, budgets, savings, or emergency fund so I can guide you properly.";
  return [
    available ? `Money Signal: You have ${available} visible money.` : "Money Signal: I can read your loaded finance context.",
    spent ? `Spending Signal: Spending shows ${spent}.` : null,
    "Next Move: Keep the next decision planned, necessary, and aligned with your current money pressure.",
  ].filter(Boolean).join(" ");
}

function splitIntoBlocks(text = "") {
  const cleaned = clean(text);
  if (!cleaned) return [];
  const labeled = cleaned.replace(/\b(Money Signal|Spending Signal|Risk|Budget|Wallet|Savings|Emergency Fund|Next Move|Question):/g, "\n$1:");
  const parts = labeled.split(/\n+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  return cleaned.split(/(?<=[.!?])\s+(?=[A-Z₱0-9])/).reduce((blocks, sentence) => {
    const last = blocks[blocks.length - 1] || "";
    if (last && `${last} ${sentence}`.length < 150) blocks[blocks.length - 1] = `${last} ${sentence}`;
    else blocks.push(sentence);
    return blocks;
  }, []);
}

function Insight({ text, action }) {
  const blocks = splitIntoBlocks(text);
  return (
    <div className="space-y-3">
      {action ? (
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/55">Smart Action</p>
          <h4 className="mt-1 text-[15px] font-black text-white">{action.title}</h4>
        </div>
      ) : null}
      {blocks.slice(0, 5).map((block, index) => {
        const [rawTitle, ...rest] = block.split(":");
        const hasLabel = rest.length > 0 && rawTitle.length < 32;
        const title = hasLabel ? rawTitle : index === 0 ? "CLARA says" : "Money Note";
        const body = hasLabel ? rest.join(":").trim() : block;
        const lower = `${title} ${body}`.toLowerCase();
        const tone = lower.includes("risk") || lower.includes("pressure") || lower.includes("delay") || lower.includes("pause")
          ? "border-amber-200/18 bg-amber-300/[0.055]"
          : lower.includes("next") || lower.includes("question")
            ? "border-cyan-200/18 bg-cyan-300/[0.055]"
            : "border-white/10 bg-white/[0.045]";
        return (
          <div key={`${title}-${index}`} className={`rounded-[18px] border px-3 py-2.5 ${tone}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/48">{title}</p>
            <p className="mt-1.5 text-[12px] leading-5 text-slate-200/86">{body}</p>
          </div>
        );
      })}
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

export default function ClaraAiEnvironmentOverlay({ isActive = false, messages = [], claraAssistantContext = {}, onClose }) {
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [panel, setPanel] = useState("ask");
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
      setPanel("ask");
      return undefined;
    }
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
    const pending = makeMessage("clara", "Checking your real finance context...");
    setIsThinking(true);
    setLocalMessages((current) => [...current.filter((message) => !hiddenMessage(message)), makeMessage("user", cleanDisplay), pending]);
    try {
      let reply = "";
      if (hasGeminiConfig()) {
        try {
          reply = await generateClaraGeminiReply({
            message: `${cleanPrompt}\n\n${PRESENTATION_RULES}`,
            context: claraAssistantContext,
            mode: action?.id || "ai_environment",
            conversationHistory: [...visibleMessages, makeMessage("user", cleanDisplay)],
          });
        } catch {
          reply = fallbackReply(cleanPrompt, claraAssistantContext);
        }
      } else {
        reply = fallbackReply(cleanPrompt, claraAssistantContext);
      }
      setLocalMessages((current) => current.map((message) => message.id === pending.id ? { ...message, text: reply, ...(action ? { smartAction: action } : {}) } : message));
    } catch {
      setLocalMessages((current) => current.map((message) => message.id === pending.id ? { ...message, text: fallbackReply(cleanPrompt, claraAssistantContext), ...(action ? { smartAction: action } : {}) } : message));
    } finally {
      setIsThinking(false);
    }
  };

  const submitDraft = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    runClara({ prompt: text, displayText: text });
    setDraft("");
  };

  return (
    <div className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-slate-950/72 px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),18px)] text-white backdrop-blur-[2px]" data-clara-ai-brain-version={CLARA_AI_BRAIN_VERSION}>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_4%,rgba(45,212,191,0.24),transparent_32%),radial-gradient(circle_at_88%_22%,rgba(124,58,237,0.22),transparent_36%),linear-gradient(180deg,rgba(2,6,23,0.88),rgba(2,6,23,0.96))]" />

      <header className="shrink-0 pb-3 pt-1">
        <div className="flex items-center gap-3 rounded-[26px] border border-white/12 bg-white/[0.065] px-3.5 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-100/20 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)]"><Sparkles className="h-4.5 w-4.5" /></div>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/60">CLARA AI Mode</p><h2 className="truncate text-[1.02rem] font-black leading-tight tracking-tight text-white">Ask before you spend.</h2></div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.075] text-white/72 transition hover:bg-white/[0.12] active:scale-95" aria-label="Close CLARA AI mode"><X className="h-4 w-4" /></button>
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
                  <div className={`rounded-[24px] px-4 py-3 text-[13px] leading-5 shadow-[0_14px_34px_rgba(0,0,0,0.20)] ${isUser ? "max-w-[88%] bg-emerald-300 text-slate-950" : "max-w-[94%] border border-white/12 bg-white/[0.075] text-white/86 backdrop-blur-xl"}`}>
                    {isUser ? clean(message.text) : <Insight text={message.text} action={action} />}
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
            <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/55">Ask Questions</p>
              <h3 className="mt-3 text-2xl font-black leading-tight tracking-tight text-white">What money decision are we checking today?</h3>
              <p className="mx-auto mt-3 max-w-[285px] text-sm leading-6 text-slate-300/75">Start with a normal question. Smart Actions and Core Features are here when you need more structure.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {QUICK_QUESTIONS.map((item) => <button key={item.label} type="button" disabled={isThinking} onClick={() => runClara({ prompt: item.prompt, displayText: item.label })} className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-2 text-[11px] font-black text-white/74 transition hover:bg-white/[0.10] active:scale-95 disabled:opacity-45">{item.label}</button>)}
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <PanelButton active={panel === "ask"} onClick={() => setPanel("ask")}>Ask Questions</PanelButton>
                <PanelButton active={panel === "smart"} onClick={() => setPanel(panel === "smart" ? "ask" : "smart")}>Smart Actions</PanelButton>
                <PanelButton active={panel === "core"} onClick={() => setPanel(panel === "core" ? "ask" : "core")}>Core Features</PanelButton>
              </div>

              {panel === "smart" ? <div className="mt-3 grid grid-cols-2 gap-2">{SMART_ACTIONS.map((action) => <OptionCard key={action.id} item={action} disabled={isThinking} onClick={() => runClara({ prompt: action.prompt, displayText: action.title, action })} />)}</div> : null}
              {panel === "core" ? <div className="mt-3 grid grid-cols-2 gap-2">{CORE_FEATURES.map((feature) => <OptionCard key={feature.id} item={feature} disabled={isThinking} onClick={() => runClara({ prompt: feature.prompt, displayText: feature.title, action: { ...feature, chips: ["Can I buy this?", "Next move", "Check risk"] } })} />)}</div> : null}
            </div>
          </div>
        )}
      </main>

      <form onSubmit={submitDraft} className="shrink-0 rounded-[28px] border border-white/16 bg-slate-950/68 p-2.5 shadow-[0_-18px_50px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
        <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.055] px-3 py-2">
          <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium text-white outline-none placeholder:text-slate-400/70" placeholder="Ask CLARA or enter item + price" inputMode="text" />
          <button type="submit" disabled={!draft.trim() || isThinking} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_26px_rgba(110,231,183,0.22)] transition disabled:opacity-45 active:scale-95" aria-label="Send to CLARA"><ArrowUp className="h-5 w-5" /></button>
        </div>
      </form>
    </div>
  );
}
