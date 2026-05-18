import { useState } from "react";
import { Send, X } from "lucide-react";
import { generateClaraGeminiReply, hasGeminiConfig } from "../../../../../lib/clara-gemini-client";
import {
  clean,
  extractMemoryValue,
  isVagueChangeRequest,
  openingReflection,
  probingReply,
  readMemory,
  saveMemory,
  savedFallbackReply,
  validProbe,
} from "./meMemoryUtils";

const USER_NAME = "Max";

function introMessage(field, current) {
  if (!current) {
    return `Hi ${USER_NAME}, do you want to teach me this part of your life? This helps me understand your ${field.label.toLowerCase()} before giving money guidance.`;
  }
  return `Hi ${USER_NAME}, I currently remember your ${field.label.toLowerCase()} as “${current}.” Do you want to update this part of your life?`;
}

function fieldImpact(drawer, field) {
  const specific = {
    incomePattern: "That helps me plan around your real cash flow instead of treating every day the same.",
    livingSituation: "That helps me understand possible shared expenses, household pressure, and the support system around you.",
    responsibilities: "That helps me separate real obligations from random spending when I guide you.",
    workType: "That helps me consider your work stress, schedule, energy, and spending triggers.",
    relationshipStatus: "That helps me understand emotional context that may affect spending or financial pressure.",
    dependents: "That helps me understand who may rely on your money, care, or support.",
    currentFinancialPressure: "That tells me where we need to be careful before suggesting spending or saving moves.",
    survivalPressureLevel: "That helps me adjust whether my guidance should be gentle, strict, or protective.",
    mainFinancialGoal: "That gives your money a direction, so future decisions can protect what matters most.",
    emotionalStateTrend: "That helps me support the person behind the spending, not just the transaction.",
    emotionalTriggers: "That helps me notice the feeling behind the spending before it becomes a money decision.",
    stressSpendingHabits: "That helps me protect you during stressful moments when spending becomes tempting.",
    rewardSystem: "That helps me suggest rewards that restore you without quietly hurting your goals.",
    commonImpulsivePurchases: "That helps me recognize the kind of purchases we may need to pause before.",
    biggestSpendingWeakness: "That gives us a clear place to build better friction, not just more discipline.",
    copingMechanisms: "That helps me suggest alternatives that still feel realistic when life feels heavy.",
    motivationStyle: "That helps me speak to you in the kind of guidance you actually respond to.",
    financialFear: "That helps me guide from safety and clarity instead of pressure or shame.",
    guiltPatterns: "That helps me turn guilt into awareness instead of making you feel judged.",
    socialPressureTriggers: "That helps me protect your boundaries when people or situations pull on your money.",
    scheduleRoutine: "That helps me understand when spending may become convenient, rushed, or emotional.",
    sleepPattern: "That helps me account for energy, patience, cravings, and impulse control.",
    workExhaustion: "That helps me notice when comfort spending may be connected to tiredness.",
    socialEnvironment: "That helps me understand whether people around you support your goals or pressure your wallet.",
    relationshipConflicts: "That helps me treat emotional pressure carefully when giving money advice.",
    hobbyPatterns: "That helps me suggest fulfilling activities that can replace spending as comfort.",
    energyLevelTrends: "That helps me notice when your spending risk may rise because your energy is low.",
    burnoutIndicators: "That helps me protect rest and recovery before strict budgeting.",
    wallets: "That helps me know where your money decisions actually happen.",
    budgets: "That helps me give advice that fits your current system instead of forcing a perfect one.",
    emergencyFund: "That tells me how much safety we need to protect before taking financial risks.",
    savingsGoals: "That helps me protect the goal when pressure or temptation appears.",
    recurringExpenses: "That helps me know what money is already spoken for before suggesting what is safe to use.",
    debt: "That helps me account for both the financial and emotional weight of debt.",
    subscriptions: "That helps me watch for quiet leaks from automatic charges.",
    transfers: "That helps me understand how your money moves between people, wallets, and priorities.",
    paydayCycle: "That helps me guide you around the moments when spending risk usually changes.",
  };

  return specific[field.key] || `That helps me understand your ${drawer.title.toLowerCase()} with more personal context.`;
}

function normalizeMemoryValue(field, rawValue) {
  const raw = clean(rawValue);
  const text = raw.toLowerCase();
  if (!raw) return "";

  if (field.key === "livingSituation") {
    if (/\b(partner|boyfriend|girlfriend|spouse|husband|wife)\b/.test(text)) return "with partner";
    if (/\b(family|parents|parent|mother|father|siblings|sibling)\b/.test(text)) return "with family";
    if (/\b(alone|solo|by myself|living alone)\b/.test(text)) return "alone";
    if (/\b(rent|renting|rented|apartment|boarding)\b/.test(text)) return "renting";
    if (/\b(shared|roommate|housemate|bedspace)\b/.test(text)) return "shared place";
  }

  if (field.key === "dependents") {
    if (/\b(no|none|wala)\b/.test(text) && /\b(dependent|dependents|support|sinusupportahan)\b/.test(text)) return "no dependents";
    if (/\b(parent|parents|mother|father|mom|dad)\b/.test(text)) return "parents";
    if (/\b(child|children|kid|kids|baby|son|daughter)\b/.test(text)) return "child/kids";
    if (/\b(sibling|siblings|brother|sister)\b/.test(text)) return "sibling";
    if (/\b(partner|spouse|husband|wife|boyfriend|girlfriend)\b/.test(text)) return "partner";
  }

  if (field.key === "workType") {
    if (/\b(bpo|call center|csr|agent)\b/.test(text)) return "BPO/call center";
    if (/\b(freelance|freelancer|client)\b/.test(text)) return "freelance";
    if (/\b(student|school|college)\b/.test(text)) return "student";
    if (/\b(business|negosyo|owner)\b/.test(text)) return "business";
    if (/\b(office|corporate|employee)\b/.test(text)) return "office work";
  }

  return raw
    .replace(/^i am currently\s+/i, "")
    .replace(/^i'm currently\s+/i, "")
    .replace(/^i am\s+/i, "")
    .replace(/^i'm\s+/i, "")
    .replace(/\s+now$/i, "")
    .trim();
}

function naturalMemoryPhrase(field, value) {
  const normalized = clean(value);
  if (!normalized) return "";
  if (field.key === "livingSituation") {
    if (normalized === "with partner") return "you’re living with your partner";
    if (normalized === "with family") return "you’re living with your family";
    if (normalized === "alone") return "you’re living alone";
    if (normalized === "renting") return "you’re renting";
    if (normalized === "shared place") return "you’re in a shared living setup";
  }
  if (field.key === "dependents") {
    if (normalized === "no dependents") return "you don’t currently have dependents";
    return `you support ${normalized}`;
  }
  return `your ${field.label.toLowerCase()} is ${normalized}`;
}

function followUpQuestion() {
  return `Anything else I can help you with, ${USER_NAME}?`;
}

function savedSummaryReply({ drawer, field, value }) {
  const nextValue = clean(value);
  if (!nextValue) return savedFallbackReply(field, value);
  const natural = naturalMemoryPhrase(field, nextValue);
  return `Oh, got it, ${USER_NAME} — ${natural}. ${fieldImpact(drawer, field)} Would you mind elaborating a little more, or should I keep it as is? ${followUpQuestion()}`;
}

function validSavedReply(reply) {
  const text = clean(reply).toLowerCase();
  if (!text || !text.includes("?")) return false;
  if (text.includes("updated to") && text.endsWith("to")) return false;
  return text.includes("anything else") || text.includes("elaborating") || text.includes("add") || text.includes("follow") || text.includes("correct") || text.includes("keep");
}

function isNoMoreReply(value) {
  const text = clean(value).toLowerCase().replace(/[?.!]+$/g, "");
  return /^(no|none|nothing|nope|nah|not now|all good|looks good|that's all|thats all|nothing else|nothing, thank you|nothing thank you|no thank you|no thanks)$/i.test(text);
}

function isThanksReply(value) {
  const text = clean(value).toLowerCase().replace(/[?.!]+$/g, "");
  return /^(thank you|thanks|ty|salamat|thank you clara|thanks clara)$/i.test(text);
}

function isGoodbyeReply(value) {
  const text = clean(value).toLowerCase().replace(/[?.!]+$/g, "");
  return /^(bye|goodbye|good bye|see you|see ya|later|that's all bye|thats all bye)$/i.test(text);
}

function closingReply(userText) {
  if (isGoodbyeReply(userText)) {
    return `Goodbye for now, ${USER_NAME}. I’ll be here when you’re ready to continue.`;
  }
  if (isThanksReply(userText)) {
    return `You’re welcome, ${USER_NAME}. ${followUpQuestion()}`;
  }
  return null;
}

async function askGeminiForMemoryReply({ drawer, field, current, userText, value, action }) {
  const fallback = action === "ask" ? probingReply(field, current) : savedSummaryReply({ drawer, field, value });
  if (!hasGeminiConfig()) return fallback;

  try {
    const memory = readMemory();
    const naturalValue = naturalMemoryPhrase(field, value);
    const prompt = `You are CLARA inside the user's Me memory drawer. The user is editing one specific identity or behavior memory.

Drawer: ${drawer.title}
Topic being edited: ${field.label}
Previous value: ${current || "not saved yet"}
Raw user message: ${userText}
Refined memory value to remember: ${value || "none"}
Natural meaning: ${naturalValue || "none"}
System action: ${action === "ask" ? "The user wants to change this specific memory but did not provide the replacement value. Ask one clear probing follow-up question for the exact corrected value. Do not save or assume anything." : `The memory was updated to the refined value: ${value}`}

Rules:
- Do not repeat the raw user sentence as the memory.
- If saved, summarize the refined meaning in a natural way, not as a database value.
- Example for living situation: say "Oh, so you're living with your partner" instead of "your living situation is now: I am living with my partner now".
- If saved, explain why it matters for future money guidance.
- End saved responses with a helpful follow-up like: "Anything else I can help you with, ${USER_NAME}?"
- If asking, directly reference the topic and ask for the corrected value.
- Be warm, personal, and financially aware.
- Do not mention storage, database, keys, model, or Gemini.
- Keep under 80 words.`;

    const reply = clean(await generateClaraGeminiReply({
      mode: "me-memory-refine",
      context: { profile: { lifeProfile: memory.items || {} }, lifeProfile: memory.items || {} },
      conversationHistory: [
        { role: "assistant", text: introMessage(field, current) },
        { role: "user", text: userText },
      ],
      message: prompt,
    }));

    if (action === "ask" && !validProbe(reply)) return fallback;
    if (action === "saved" && !validSavedReply(reply)) return fallback;
    return reply || fallback;
  } catch {
    return fallback;
  }
}

async function askGeminiForQuestion({ drawer, field, current, userText }) {
  const fallback = `You can ask me how your ${field.label.toLowerCase()} affects your money decisions, or you can update it if this part of your life has changed. ${followUpQuestion()}`;
  if (!hasGeminiConfig()) return fallback;

  try {
    const memory = readMemory();
    const prompt = `You are CLARA inside the user's Me memory drawer.

Drawer: ${drawer.title}
Topic: ${field.label}
Current remembered value: ${current || "not saved yet"}
User question: ${userText}

Answer the user's question naturally as CLARA. Be warm, concise, emotionally aware, and financially relevant. Do not update the memory unless the user gives a clear replacement value. End with a natural follow-up like "Anything else I can help you with, ${USER_NAME}?" unless the user is saying goodbye. Do not mention storage, database, keys, model, or Gemini. Keep under 65 words.`;

    const reply = clean(await generateClaraGeminiReply({
      mode: "me-memory-question",
      context: { profile: { lifeProfile: memory.items || {} }, lifeProfile: memory.items || {} },
      conversationHistory: [
        { role: "assistant", text: introMessage(field, current) },
        { role: "user", text: userText },
      ],
      message: prompt,
    }));

    return reply || fallback;
  } catch {
    return fallback;
  }
}

export default function MeMemoryChat({ drawer, field, onClose, onSaved }) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [waitingForReplacement, setWaitingForReplacement] = useState(false);
  const [mode, setMode] = useState("idle");
  const [rememberedValue, setRememberedValue] = useState(() => clean(field.memory?.value));
  const current = rememberedValue;

  const startUpdate = () => {
    if (isThinking) return;
    setMode("updating");
    setWaitingForReplacement(true);
    setMessages((items) => [
      ...items,
      { role: "user", text: "Yes, I want to update this." },
      { role: "clara", text: probingReply(field, current) },
    ]);
  };

  const keepCurrent = () => {
    if (isThinking) return;
    setMode("idle");
    setWaitingForReplacement(false);
    setMessages((items) => [
      ...items,
      { role: "user", text: "No, keep this for now." },
      { role: "clara", text: `Got it, ${USER_NAME}. I’ll keep your ${field.label.toLowerCase()} as “${current || "not set yet"}” for now. ${followUpQuestion()}` },
    ]);
  };

  const startAsk = () => {
    if (isThinking) return;
    setMode("asking");
    setWaitingForReplacement(false);
    setMessages((items) => [
      ...items,
      { role: "user", text: "I want to ask about this." },
      { role: "clara", text: `Sure — ask me anything about your ${field.label.toLowerCase()}, or how it affects your money decisions.` },
    ]);
  };

  const startAddMore = () => {
    if (isThinking) return;
    setMode("adding");
    setWaitingForReplacement(true);
    setMessages((items) => [
      ...items,
      { role: "user", text: "I want to add more about this." },
      { role: "clara", text: `Sure, ${USER_NAME}. What extra detail should I add about your ${field.label.toLowerCase()}?` },
    ]);
  };

  const finishReview = () => {
    if (isThinking) return;
    setMode("idle");
    setWaitingForReplacement(false);
    setMessages((items) => [
      ...items,
      { role: "user", text: "Looks good." },
      { role: "clara", text: `Got it, ${USER_NAME}. I’ll keep this as your current ${field.label.toLowerCase()} and use it when guiding your financial decisions. ${followUpQuestion()}` },
    ]);
  };

  const startFollowUp = () => {
    if (isThinking) return;
    setMode("asking");
    setWaitingForReplacement(false);
    setMessages((items) => [
      ...items,
      { role: "user", text: "I have a follow-up question." },
      { role: "clara", text: `Sure — what do you want to ask about your ${field.label.toLowerCase()}?` },
    ]);
  };

  const submit = async (event) => {
    event.preventDefault();
    const userText = clean(draft);
    if (!userText || isThinking) return;

    setDraft("");
    setMessages((items) => [...items, { role: "user", text: userText }]);
    setIsThinking(true);

    const directClosing = closingReply(userText);
    if (directClosing) {
      setMode(isGoodbyeReply(userText) ? "closed" : "idle");
      setWaitingForReplacement(false);
      setMessages((items) => [...items, { role: "clara", text: directClosing }]);
      setIsThinking(false);
      return;
    }

    if (mode === "reviewing" && isNoMoreReply(userText)) {
      setMode("idle");
      setWaitingForReplacement(false);
      setMessages((items) => [
        ...items,
        { role: "clara", text: `Got it, ${USER_NAME}. I’ll keep this as your current ${field.label.toLowerCase()} and use it when guiding your financial decisions. ${followUpQuestion()}` },
      ]);
      setIsThinking(false);
      return;
    }

    const shouldAsk = !waitingForReplacement && mode !== "asking" && mode !== "adding" && isVagueChangeRequest(userText);

    if (mode === "asking" && !isVagueChangeRequest(userText)) {
      const reply = await askGeminiForQuestion({ drawer, field, current, userText });
      setMessages((items) => [...items, { role: "clara", text: reply }]);
      setIsThinking(false);
      return;
    }

    if (!waitingForReplacement && mode !== "adding" && !shouldAsk) {
      setMode("idle");
      setMessages((items) => [
        ...items,
        { role: "clara", text: `I can help with that, ${USER_NAME}. Do you want to update your ${field.label.toLowerCase()}, ask a follow-up, or keep it as is? ${followUpQuestion()}` },
      ]);
      setIsThinking(false);
      return;
    }

    const action = shouldAsk ? "ask" : "saved";
    const extractedValue = action === "saved" ? extractMemoryValue(userText) : "";
    const normalizedValue = action === "saved" ? normalizeMemoryValue(field, extractedValue) : "";
    const value = mode === "adding" && current ? `${current}. Additional context: ${extractedValue}` : normalizedValue;

    if (action === "saved") {
      onSaved(saveMemory(field, value, drawer.level));
      setRememberedValue(value);
      setWaitingForReplacement(false);
      setMode("reviewing");
    } else {
      setWaitingForReplacement(true);
      setMode("updating");
    }

    const reply = await askGeminiForMemoryReply({ drawer, field, current, userText, value, action });
    setMessages((items) => [...items, { role: "clara", text: reply }]);
    setIsThinking(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[280] mx-auto max-w-[430px] px-4 pb-[max(env(safe-area-inset-bottom),14px)]">
      <div className="overflow-hidden rounded-[30px] border border-white/12 bg-slate-950/94 shadow-[0_-24px_80px_rgba(0,0,0,.45)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/46">Refine with CLARA</p>
            <h3 className="mt-1 text-lg font-black text-white">{field.label}</h3>
            <p className="mt-1 text-xs font-semibold text-white/38">{drawer.title}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-white/62 active:scale-95" aria-label="Close memory editor">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[38svh] space-y-3 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="max-w-[90%] rounded-[22px] bg-white/[0.07] px-4 py-3 text-sm font-semibold leading-6 text-white/78">
            {introMessage(field, current)}
          </div>

          {messages.length === 0 ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={startUpdate} className="rounded-full border border-emerald-200/20 bg-emerald-300/14 px-3 py-2 text-xs font-black text-emerald-100 active:scale-95">Yes, update this</button>
              <button type="button" onClick={keepCurrent} className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-black text-white/68 active:scale-95">No, keep it</button>
              <button type="button" onClick={startAsk} className="rounded-full border border-cyan-200/14 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100/80 active:scale-95">Ask CLARA</button>
            </div>
          ) : null}

          {messages.map((message, index) => (
            <div key={`${message.role}-${index}-${message.text.slice(0, 10)}`} className={message.role === "user" ? "ml-auto max-w-[88%] rounded-[22px] bg-emerald-300 px-4 py-3 text-sm font-semibold leading-6 text-slate-950" : "max-w-[90%] rounded-[22px] bg-white/[0.07] px-4 py-3 text-sm font-semibold leading-6 text-white/78"}>
              {message.text}
            </div>
          ))}

          {mode === "reviewing" && !isThinking ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={startAddMore} className="rounded-full border border-emerald-200/20 bg-emerald-300/14 px-3 py-2 text-xs font-black text-emerald-100 active:scale-95">Add about this</button>
              <button type="button" onClick={finishReview} className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-black text-white/68 active:scale-95">Looks good</button>
              <button type="button" onClick={startFollowUp} className="rounded-full border border-cyan-200/14 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100/80 active:scale-95">Follow-up</button>
            </div>
          ) : null}

          {isThinking ? <div className="max-w-[82%] rounded-[22px] bg-white/[0.06] px-4 py-3 text-sm font-semibold leading-6 text-white/56">CLARA is thinking through that…</div> : null}
        </div>

        <form onSubmit={submit} className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.055] px-3 py-2">
            <input value={draft} onChange={(event) => setDraft(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-sm font-semibold text-white outline-none placeholder:text-white/32" placeholder={waitingForReplacement ? "Type the corrected value..." : mode === "asking" ? "Ask CLARA about this..." : "Tell CLARA what changed..."} disabled={isThinking || mode === "closed"} />
            <button type="submit" disabled={!draft.trim() || isThinking || mode === "closed"} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 disabled:opacity-40 active:scale-95" aria-label="Send to CLARA">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
