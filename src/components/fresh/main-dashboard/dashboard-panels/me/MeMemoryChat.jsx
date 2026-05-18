import { useState } from "react";
import { Send, X } from "lucide-react";
import { generateClaraGeminiReply, hasGeminiConfig } from "../../../../../lib/clara-gemini-client";
import {
  clean,
  extractMemoryValue,
  isVagueChangeRequest,
  probingReply,
  readMemory,
  saveMemory,
} from "./meMemoryUtils";

const USER_NAME = "Max";

function introMessage(field, current) {
  if (!current) {
    return `Hi ${USER_NAME}, do you want to teach me this part of your life? This helps me understand your ${field.label.toLowerCase()} before giving money guidance.`;
  }
  return `Hi ${USER_NAME}, I currently remember your ${field.label.toLowerCase()} as “${current}.” Do you want to update this part of your life?`;
}

function normalizeMemoryValue(field, rawValue) {
  const raw = clean(rawValue);
  const text = raw.toLowerCase();
  if (!raw) return "";

  if (field.key === "livingSituation") {
    if (/\b(partner|boyfriend|girlfriend|spouse|husband|wife)\b/.test(text)) return "with partner";
    if (/\b(family|parents|parent|mother|father|siblings|sibling)\b/.test(text)) return "with family";
    if (/\b(alone|solo|by myself|living alone)\b/.test(text)) return "alone";
    if (/\b(rent|renting|apartment|boarding)\b/.test(text)) return "renting";
    if (/\b(shared|roommate|housemate|bedspace)\b/.test(text)) return "shared place";
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

function normalizeAdditionalContext(field, rawValue) {
  const raw = clean(rawValue);
  const text = raw.toLowerCase();
  if (!raw) return "";

  if (field.key === "livingSituation") {
    if (/\bgirlfriend\b/.test(text)) return "partner is girlfriend";
    if (/\bboyfriend\b/.test(text)) return "partner is boyfriend";
    if (/\b(spouse|husband|wife)\b/.test(text)) return "partner is spouse";
  }

  return raw;
}

function naturalMemoryPhrase(field, value) {
  const normalized = clean(value);
  if (!normalized) return "";
  const [main, extra] = normalized.split(". Additional context:").map(clean);

  let base = `your ${field.label.toLowerCase()} is ${main}`;
  if (field.key === "livingSituation") {
    if (main === "with partner") base = "you’re living with your partner";
    if (main === "with family") base = "you’re living with your family";
    if (main === "alone") base = "you’re living alone";
    if (main === "renting") base = "you’re renting";
    if (main === "shared place") base = "you’re in a shared living setup";
  }
  if (field.key === "dependents") {
    if (main === "no dependents") base = "you don’t currently have dependents";
    else base = `you support ${main}`;
  }

  return extra ? `${base}, and ${extra}` : base;
}

function fieldImpact(drawer, field) {
  const specific = {
    livingSituation: "That helps me understand your home setup, who you live with, and whether your environment feels stable or still changing.",
    incomePattern: "That helps me understand the rhythm of your money.",
    responsibilities: "That helps me understand what your money is carrying in real life.",
    workType: "That helps me understand your daily environment and energy pattern.",
    relationshipStatus: "That helps me understand the emotional context around your decisions.",
    dependents: "That helps me understand who may rely on your care or support.",
  };
  return specific[field.key] || `That helps me understand your ${drawer.title.toLowerCase()} with more personal context.`;
}

function contextualFollowUp(field, value) {
  const text = clean(value).toLowerCase();

  if (field.key === "livingSituation") {
    if (text.includes("with partner")) return "Is this living setup stable now, still new, or something you’re still adjusting to?";
    if (text.includes("with family")) return "Who in your family do you live with, and does this setup feel stable right now?";
    if (text.includes("renting")) return "Are you renting alone, with someone, or in a shared living setup?";
    if (text.includes("alone")) return "Does living alone feel stable for you right now, or are you still adjusting to it?";
    if (text.includes("shared place")) return "Who do you share the place with, and does the setup feel comfortable or temporary?";
  }

  if (field.key === "incomePattern") return "Does the timing feel predictable, or does it still change often?";
  if (field.key === "workType") return "Does this work setup feel stable right now, or is it affecting your energy lately?";
  if (field.key === "dependents") return "Is that support regular, occasional, or still changing?";
  return `What extra detail about your ${field.label.toLowerCase()} should I understand?`;
}

function followUpQuestion() {
  return `Anything else I can help you with, ${USER_NAME}?`;
}

function isNoMoreReply(value) {
  const text = clean(value).toLowerCase().replace(/[?.!]+$/g, "");
  return /^(no|none|nothing|nope|nah|not now|all good|looks good|looks good for now|that's all|thats all|nothing else|no thanks|no thank you)$/i.test(text);
}

function isThanksReply(value) {
  const text = clean(value).toLowerCase().replace(/[?.!]+$/g, "");
  return /^(thank you|thanks|ty|salamat|thank you clara|thanks clara)$/i.test(text);
}

function isGoodbyeReply(value) {
  const text = clean(value).toLowerCase().replace(/[?.!]+$/g, "");
  return /^(bye|goodbye|good bye|see you|see ya|later)$/i.test(text);
}

function closingReply(userText) {
  if (isGoodbyeReply(userText)) return `Goodbye for now, ${USER_NAME}. I’ll be here when you’re ready to continue.`;
  if (isThanksReply(userText)) return `You’re welcome, ${USER_NAME}. ${followUpQuestion()}`;
  return null;
}

function isDeclarativeMemoryInfo(field, value) {
  const text = clean(value).toLowerCase();
  if (/\b(i just want to say|just want to say|to clarify|actually|i mean|what i mean is|for context)\b/.test(text)) return true;
  if (field.key === "livingSituation" && /\b(partner|girlfriend|boyfriend|family|parents|renting|alone|shared|roommate|housemate)\b/.test(text)) return true;
  if (field.key === "dependents" && /\b(dependent|dependents|support|parents|child|kids|sibling|brother|sister|partner)\b/.test(text)) return true;
  return false;
}

function savedSummaryReply({ drawer, field, value }) {
  const nextValue = clean(value);
  if (!nextValue) return `Got it, ${USER_NAME}. I’ll remember that for your ${field.label.toLowerCase()}. ${followUpQuestion()}`;
  return `Oh, got it, ${USER_NAME} — ${naturalMemoryPhrase(field, nextValue)}. ${fieldImpact(drawer, field)} ${contextualFollowUp(field, nextValue)}`;
}

async function askGeminiForMemoryReply({ drawer, field, current, userText, value, action }) {
  const fallback = action === "ask" ? probingReply(field, current) : savedSummaryReply({ drawer, field, value });
  if (!hasGeminiConfig()) return fallback;

  try {
    const memory = readMemory();
    const prompt = `You are CLARA inside the user's Me memory drawer.
Drawer: ${drawer.title}
Topic: ${field.label}
Previous value: ${current || "not saved yet"}
Raw user message: ${userText}
Refined value: ${value || "none"}
Action: ${action}

Rules:
- Stay inside the current memory topic only.
- Do not repeat the raw user sentence as the memory.
- If the topic is Living situation, talk only about home/living setup: who they live with, whether it is stable, temporary, new, or something they are adjusting to.
- If the topic is Living situation, do NOT ask about bills, expenses, rent payment, contributions, money split, or financial responsibilities.
- If saved, summarize naturally and ask one topic-specific follow-up.
- If asking, ask for the corrected value.
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

    if (!reply) return fallback;
    if (field.key === "livingSituation" && /\b(bill|bills|expense|expenses|rent payment|contribution|contributing|money split)\b/i.test(reply)) return fallback;
    return reply;
  } catch {
    return fallback;
  }
}

async function askGeminiForQuestion({ drawer, field, current, userText }) {
  const fallback = `You can ask me how your ${field.label.toLowerCase()} affects your current life context, or you can update it if this part of your life has changed. ${followUpQuestion()}`;
  if (!hasGeminiConfig()) return fallback;

  try {
    const memory = readMemory();
    const prompt = `You are CLARA inside the user's Me memory drawer.
Drawer: ${drawer.title}
Topic: ${field.label}
Current remembered value: ${current || "not saved yet"}
User question: ${userText}

Answer naturally as CLARA. Stay inside this memory topic. If the topic is Living situation, talk about the home/living setup only, not bills, expenses, rent payment, contributions, money split, or responsibilities. Do not update the memory unless the user gives a clear replacement value. Keep under 65 words.`;

    return clean(await generateClaraGeminiReply({
      mode: "me-memory-question",
      context: { profile: { lifeProfile: memory.items || {} }, lifeProfile: memory.items || {} },
      conversationHistory: [
        { role: "assistant", text: introMessage(field, current) },
        { role: "user", text: userText },
      ],
      message: prompt,
    })) || fallback;
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

  const push = (next) => setMessages((items) => [...items, ...next]);

  const startUpdate = () => {
    if (isThinking) return;
    setMode("updating");
    setWaitingForReplacement(true);
    push([
      { role: "user", text: "Yes, I want to update this." },
      { role: "clara", text: probingReply(field, current) },
    ]);
  };

  const keepCurrent = () => {
    if (isThinking) return;
    setMode("idle");
    setWaitingForReplacement(false);
    push([
      { role: "user", text: "No, keep it." },
      { role: "clara", text: `Got it, ${USER_NAME}. I’ll keep this as your current ${field.label.toLowerCase()} for now. ${followUpQuestion()}` },
    ]);
  };

  const startAsk = () => {
    if (isThinking) return;
    setMode("asking");
    setWaitingForReplacement(false);
    push([
      { role: "user", text: "I have a question." },
      { role: "clara", text: `Sure — ask me anything about your ${field.label.toLowerCase()}, or how it affects this part of your life.` },
    ]);
  };

  const startAddMore = () => {
    if (isThinking) return;
    setMode("adding");
    setWaitingForReplacement(true);
    push([
      { role: "user", text: "Let me add something." },
      { role: "clara", text: `Sure, ${USER_NAME}. What extra detail should I add about your ${field.label.toLowerCase()}?` },
    ]);
  };

  const finishReview = () => {
    if (isThinking) return;
    setMode("idle");
    setWaitingForReplacement(false);
    push([
      { role: "user", text: "Looks good for now." },
      { role: "clara", text: `Got it, ${USER_NAME}. I’ll keep this as your current ${field.label.toLowerCase()} for now. ${followUpQuestion()}` },
    ]);
  };

  const saveRefinedMemory = async ({ userText, useAdditionalContext = false }) => {
    const extractedValue = extractMemoryValue(userText);
    const normalizedValue = normalizeMemoryValue(field, extractedValue);
    const extra = normalizeAdditionalContext(field, extractedValue);
    const value = useAdditionalContext && current ? `${current}. Additional context: ${extra || extractedValue}` : normalizedValue;

    onSaved(saveMemory(field, value, drawer.level));
    setRememberedValue(value);
    setWaitingForReplacement(false);
    setMode("reviewing");

    const reply = await askGeminiForMemoryReply({ drawer, field, current, userText, value, action: "saved" });
    push([{ role: "clara", text: reply }]);
  };

  const submit = async (event) => {
    event.preventDefault();
    const userText = clean(draft);
    if (!userText || isThinking) return;

    setDraft("");
    push([{ role: "user", text: userText }]);
    setIsThinking(true);

    const directClosing = closingReply(userText);
    if (directClosing) {
      setMode(isGoodbyeReply(userText) ? "closed" : "idle");
      setWaitingForReplacement(false);
      push([{ role: "clara", text: directClosing }]);
      setIsThinking(false);
      return;
    }

    if (mode === "reviewing" && isNoMoreReply(userText)) {
      finishReview();
      setIsThinking(false);
      return;
    }

    const shouldAsk = !waitingForReplacement && mode !== "asking" && mode !== "adding" && isVagueChangeRequest(userText);

    if (mode === "asking" && !isVagueChangeRequest(userText)) {
      if (isDeclarativeMemoryInfo(field, userText)) {
        await saveRefinedMemory({ userText, useAdditionalContext: Boolean(current) });
      } else {
        const reply = await askGeminiForQuestion({ drawer, field, current, userText });
        push([{ role: "clara", text: reply }]);
      }
      setIsThinking(false);
      return;
    }

    if (mode === "adding") {
      await saveRefinedMemory({ userText, useAdditionalContext: Boolean(current) });
      setIsThinking(false);
      return;
    }

    if (!waitingForReplacement && !shouldAsk) {
      setMode("idle");
      push([{ role: "clara", text: `I can help with that, ${USER_NAME}. Do you want to update your ${field.label.toLowerCase()}, ask a question, or keep it as is? ${followUpQuestion()}` }]);
      setIsThinking(false);
      return;
    }

    if (shouldAsk) {
      setWaitingForReplacement(true);
      setMode("updating");
      const reply = await askGeminiForMemoryReply({ drawer, field, current, userText, value: "", action: "ask" });
      push([{ role: "clara", text: reply }]);
      setIsThinking(false);
      return;
    }

    await saveRefinedMemory({ userText, useAdditionalContext: false });
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
              <button type="button" onClick={startAsk} className="rounded-full border border-cyan-200/14 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100/80 active:scale-95">I have a question</button>
            </div>
          ) : null}

          {messages.map((message, index) => (
            <div key={`${message.role}-${index}-${message.text.slice(0, 10)}`} className={message.role === "user" ? "ml-auto max-w-[88%] rounded-[22px] bg-emerald-300 px-4 py-3 text-sm font-semibold leading-6 text-slate-950" : "max-w-[90%] rounded-[22px] bg-white/[0.07] px-4 py-3 text-sm font-semibold leading-6 text-white/78"}>
              {message.text}
            </div>
          ))}

          {mode === "reviewing" && !isThinking ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={finishReview} className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-black text-white/68 active:scale-95">Looks good for now</button>
              <button type="button" onClick={startAddMore} className="rounded-full border border-emerald-200/20 bg-emerald-300/14 px-3 py-2 text-xs font-black text-emerald-100 active:scale-95">Let me add something</button>
              <button type="button" onClick={startAsk} className="rounded-full border border-cyan-200/14 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100/80 active:scale-95">I have a question</button>
            </div>
          ) : null}

          {isThinking ? <div className="max-w-[82%] rounded-[22px] bg-white/[0.06] px-4 py-3 text-sm font-semibold leading-6 text-white/56">CLARA is thinking through that…</div> : null}
        </div>

        <form onSubmit={submit} className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.055] px-3 py-2">
            <input value={draft} onChange={(event) => setDraft(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-sm font-semibold text-white outline-none placeholder:text-white/32" placeholder={waitingForReplacement || mode === "adding" ? "Type your answer..." : mode === "asking" ? "Ask CLARA about this..." : "Tell CLARA what changed..."} disabled={isThinking || mode === "closed"} />
            <button type="submit" disabled={!draft.trim() || isThinking || mode === "closed"} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 disabled:opacity-40 active:scale-95" aria-label="Send to CLARA">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
