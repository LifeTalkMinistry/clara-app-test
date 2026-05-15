import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Sparkles, X } from "lucide-react";

const DEMO_STEPS = [
  {
    command: "check my wallet",
    reply:
      "Alex has ₱9,260 visible across 3 wallets: Payroll Wallet ₱6,120, GCash ₱2,240, and Cash on Hand ₱900. CLARA sees breathing room, but not extra freedom yet because bills, debt payments, and food spending are already active this month.",
    next: "check my budget",
  },
  {
    command: "check my budget",
    reply:
      "Alex has an active ₱27,000 monthly budget. The warning area is food: several food purchases are already unplanned, including GrabFood, coffee, dinner out, and buko juice. The issue is not only the amount — it is the pattern of stress spending after work.",
    next: "check my emergency fund",
  },
  {
    command: "check my emergency fund",
    reply:
      "Alex has ₱4,000 saved toward a ₱54,000 emergency fund target. That is only about 7 days of safety if monthly survival costs are ₱18,000, so CLARA would protect this fund before approving random spending.",
    next: "check my debt",
  },
  {
    command: "check my debt",
    reply:
      "Alex has ₱52,000 in active obligations: credit card ₱18,000, motorcycle installment ₱28,000, and family loan ₱6,000. The monthly pressure is about ₱5,800, so CLARA will treat wants differently until the debt load becomes lighter.",
    next: "can i buy milk tea for 150",
  },
  {
    command: "can i buy milk tea for 150",
    reply:
      "Yes, Alex can technically afford ₱150 milk tea today, but CLARA would mark it as a small emotional spend because food is already showing unplanned pressure. The better move is: buy it only if it is intentional, not because of stress. That is the point of CLARA — ask before you spend.",
    next: null,
  },
];

function makeMessage(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
  };
}

function normalizeCommand(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ");
}

export default function ClaraDemoGuidedOverlay({ isActive = false, onClose }) {
  const [draft, setDraft] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [messages, setMessages] = useState([]);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const currentStep = DEMO_STEPS[Math.min(stepIndex, DEMO_STEPS.length - 1)];
  const isComplete = stepIndex >= DEMO_STEPS.length;
  const expectedCommand = isComplete ? "" : currentStep.command;

  const guideText = useMemo(() => {
    if (isComplete) {
      return "Demo complete. You just saw how CLARA reads wallet pressure, budget behavior, emergency safety, debt load, and purchase decisions.";
    }

    return `Type exactly: ${expectedCommand}`;
  }, [expectedCommand, isComplete]);

  useEffect(() => {
    if (!isActive) {
      setDraft("");
      setStepIndex(0);
      setMessages([]);
      return undefined;
    }

    setMessages([
      makeMessage(
        "clara",
        "This is a guided demo using a sample CLARA member named Alex. You will not use live AI here yet — type the exact guided prompts so you can see the story one step at a time."
      ),
    ]);

    const timer = window.setTimeout(() => inputRef.current?.focus?.(), 180);
    return () => window.clearTimeout(timer);
  }, [isActive]);

  useEffect(() => {
    if (isActive) {
      messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
    }
  }, [isActive, messages.length]);

  if (!isActive) return null;

  const submitDemoPrompt = (event) => {
    event.preventDefault();

    const typed = draft.trim();
    if (!typed || isComplete) return;

    const expected = normalizeCommand(expectedCommand);
    const actual = normalizeCommand(typed);

    if (actual !== expected) {
      setMessages((current) => [
        ...current,
        makeMessage("user", typed),
        makeMessage("clara", `For this guided demo, type exactly: ${expectedCommand}`),
      ]);
      setDraft("");
      return;
    }

    const nextIndex = stepIndex + 1;
    const nextCommand = currentStep.next;

    setMessages((current) => [
      ...current,
      makeMessage("user", typed),
      makeMessage(
        "clara",
        nextCommand ? `${currentStep.reply}\n\nNext, type exactly: ${nextCommand}` : currentStep.reply
      ),
    ]);

    setStepIndex(nextIndex);
    setDraft("");
  };

  return (
    <div className="fixed inset-0 z-[270] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-slate-950/78 px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),18px)] text-white backdrop-blur-[2px]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_4%,rgba(45,212,191,0.24),transparent_32%),radial-gradient(circle_at_88%_22%,rgba(124,58,237,0.22),transparent_36%),linear-gradient(180deg,rgba(2,6,23,0.88),rgba(2,6,23,0.96))]" />

      <header className="shrink-0 pb-3 pt-1">
        <div className="flex items-center gap-3 rounded-[26px] border border-white/12 bg-white/[0.065] px-3.5 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-100/20 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)]">
            <Sparkles className="h-4.5 w-4.5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/60">
              CLARA Demo Mode
            </p>
            <h2 className="truncate text-[1.02rem] font-black leading-tight tracking-tight text-white">
              Guided sample account
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.075] text-white/72 transition hover:bg-white/[0.12] active:scale-95"
            aria-label="Close CLARA demo mode"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mb-3 rounded-[24px] border border-emerald-200/18 bg-emerald-300/10 px-4 py-3 text-[12px] font-bold leading-5 text-emerald-100/90 shadow-[0_14px_34px_rgba(0,0,0,0.16)]">
        {guideText}
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto px-1 py-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-h-full flex-col justify-end gap-3 pb-2">
          {messages.map((message) => {
            const isUser = message.role === "user";

            return (
              <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] whitespace-pre-wrap px-4 py-3 text-[13px] leading-5 shadow-[0_14px_34px_rgba(0,0,0,0.16)] ${
                    isUser
                      ? "rounded-[24px] bg-emerald-300 text-slate-950"
                      : "rounded-[24px] bg-white/[0.075] text-white/86 backdrop-blur-xl"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <form onSubmit={submitDemoPrompt} className="shrink-0 rounded-[28px] border border-white/16 bg-slate-950/68 p-2.5 shadow-[0_-18px_50px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
        <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.055] px-3 py-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={isComplete}
            className="min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium text-white outline-none placeholder:text-slate-400/70 disabled:opacity-50"
            placeholder={isComplete ? "Demo complete" : expectedCommand}
            inputMode="text"
          />

          <button
            type="submit"
            disabled={!draft.trim() || isComplete}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_26px_rgba(110,231,183,0.22)] transition disabled:opacity-45 active:scale-95"
            aria-label="Send demo prompt"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
