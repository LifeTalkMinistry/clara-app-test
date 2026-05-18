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

async function askGeminiForMemoryReply({ drawer, field, current, userText, value, action }) {
  const fallback = action === "ask" ? probingReply(field, current) : savedFallbackReply(field, value);
  if (!hasGeminiConfig()) return fallback;

  try {
    const memory = readMemory();
    const prompt = `You are CLARA inside the user's Me memory drawer. The user is editing one specific identity or behavior memory.

Drawer: ${drawer.title}
Topic being edited: ${field.label}
Current value: ${current || "not saved yet"}
User message: ${userText}
System action: ${action === "ask" ? "The user wants to change this specific memory but did not provide the replacement value. Ask one clear probing follow-up question for the exact corrected value. Do not save or assume anything." : `The memory was updated to: ${value}`}

Rules:
- If asking, directly reference the current value and the topic.
- Ask only one clear probing question.
- If saved, acknowledge the change and say how you will use it later.
- Be warm, personal, and financially aware.
- Do not mention storage, database, keys, model, or Gemini.
- Keep under 45 words.`;

    const reply = clean(await generateClaraGeminiReply({
      mode: "me-memory-refine",
      context: { profile: { lifeProfile: memory.items || {} }, lifeProfile: memory.items || {} },
      conversationHistory: [
        { role: "assistant", text: openingReflection(drawer, field, current) },
        { role: "user", text: userText },
      ],
      message: prompt,
    }));

    if (action === "ask" && !validProbe(reply)) return fallback;
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
  const current = clean(field.memory?.value);

  const submit = async (event) => {
    event.preventDefault();
    const userText = clean(draft);
    if (!userText || isThinking) return;

    setDraft("");
    setMessages((items) => [...items, { role: "user", text: userText }]);
    setIsThinking(true);

    const shouldAsk = !waitingForReplacement && isVagueChangeRequest(userText);
    const action = shouldAsk ? "ask" : "saved";
    const value = action === "saved" ? extractMemoryValue(userText) : "";

    if (action === "saved") {
      onSaved(saveMemory(field, value, drawer.level));
      setWaitingForReplacement(false);
    } else {
      setWaitingForReplacement(true);
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
            {openingReflection(drawer, field, current)}
          </div>
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}-${message.text.slice(0, 10)}`} className={message.role === "user" ? "ml-auto max-w-[88%] rounded-[22px] bg-emerald-300 px-4 py-3 text-sm font-semibold leading-6 text-slate-950" : "max-w-[90%] rounded-[22px] bg-white/[0.07] px-4 py-3 text-sm font-semibold leading-6 text-white/78"}>
              {message.text}
            </div>
          ))}
          {isThinking ? <div className="max-w-[82%] rounded-[22px] bg-white/[0.06] px-4 py-3 text-sm font-semibold leading-6 text-white/56">CLARA is thinking through that…</div> : null}
        </div>

        <form onSubmit={submit} className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.055] px-3 py-2">
            <input value={draft} onChange={(event) => setDraft(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-sm font-semibold text-white outline-none placeholder:text-white/32" placeholder={waitingForReplacement ? "Type the corrected value..." : "Tell CLARA what changed..."} disabled={isThinking} />
            <button type="submit" disabled={!draft.trim() || isThinking} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 disabled:opacity-40 active:scale-95" aria-label="Save memory">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
