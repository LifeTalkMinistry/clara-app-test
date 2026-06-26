import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";

const CLARA_AI_BRAIN_VERSION = "pause-phase-one-buy-check";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function FloatingCloseButton({ onClose }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/75 bg-white/[0.055] text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:bg-white/[0.12] active:scale-95"
      aria-label="Close CLARA AI mode"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function PauseEntryBoard({ onClose }) {
  return (
    <section
      data-clara-pause-entry-board="true"
      className="relative overflow-hidden rounded-[30px] border border-cyan-100/22 bg-white/[0.055] px-6 pb-6 pt-8 text-center shadow-[0_26px_80px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl"
    >
      <FloatingCloseButton onClose={onClose} />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(45,212,191,0.22),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(124,58,237,0.30),transparent_38%),linear-gradient(145deg,rgba(8,47,73,0.35),rgba(30,27,75,0.38))]" />

      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/55">
        PAUSE BEFORE YOU BUY
      </p>
      <h3 className="mx-auto mt-4 max-w-[318px] text-[24px] font-black leading-[1.12] tracking-[-0.045em] text-white">
        Let’s check this purchase first.
      </h3>
      <p className="mx-auto mt-5 max-w-[292px] text-[13.5px] font-medium leading-7 text-slate-300/76">
        CLARA will ask for the item, price, and reason before reading your money situation.
      </p>
      <p className="mx-auto mt-3 max-w-[278px] text-[13.5px] font-medium leading-7 text-slate-300/70">
        Your current Buy Check will open automatically.
      </p>
    </section>
  );
}

function MessageText({ text }) {
  return <span className="whitespace-pre-wrap">{clean(text)}</span>;
}

export default function ClaraAiEnvironmentOverlay({
  isActive = false,
  messages = [],
  onClose,
  layoutVariant = "default",
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isGuidePreview = layoutVariant === "guide-preview";

  const visibleMessages = useMemo(
    () => (Array.isArray(messages) ? messages : []).filter(Boolean),
    [messages]
  );

  const visibleMessagesScrollKey = useMemo(
    () =>
      visibleMessages
        .map(
          (message) =>
            `${message.id || "message"}:${String(
              message.text || message.content || ""
            ).length}`
        )
        .join("|"),
    [visibleMessages]
  );

  useEffect(() => {
    if (!isActive) {
      setDraft("");
      return undefined;
    }

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
    if (!isActive || !visibleMessages.length) return undefined;
    const frame = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView?.({
        behavior: "smooth",
        block: "end",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isActive, visibleMessages.length, visibleMessagesScrollKey]);

  if (!isActive) return null;

  const submitDraft = (event) => {
    event.preventDefault();
  };

  const messageStackClassName = isGuidePreview
    ? "flex min-h-full min-w-0 flex-col justify-start gap-4 px-2 pb-32 pt-0"
    : "flex min-h-full flex-col justify-start gap-3 px-2 pb-28 pt-12";

  const userBubbleClassName = isGuidePreview
    ? "w-fit max-w-[78%] rounded-[22px] bg-emerald-300 px-4 py-2.5 text-[13px] font-semibold leading-5 text-slate-950"
    : "max-w-[86%] rounded-[24px] bg-emerald-300 px-4 py-3 text-[13px] font-semibold leading-5 text-slate-950";

  const claraBubbleClassName = isGuidePreview
    ? "w-fit max-w-[86%] rounded-[22px] border border-white/10 bg-white/[0.075] px-4 py-3 text-[13.5px] leading-[1.55] text-white/90 shadow-[0_18px_44px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.075)] backdrop-blur-xl"
    : "w-[94%] max-w-[94%] rounded-[26px] border border-white/10 bg-white/[0.075] px-4 py-4 text-[13.5px] leading-6 text-white/90 shadow-[0_18px_44px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.075)] backdrop-blur-xl";

  return (
    <div
      className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-slate-950/78 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),18px)] text-white backdrop-blur-[2px]"
      data-clara-ai-brain-version={CLARA_AI_BRAIN_VERSION}
      data-clara-ai-layout-variant={layoutVariant}
      data-clara-pause-overlay="true"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_10%,rgba(45,212,191,0.26),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(124,58,237,0.32),transparent_38%),linear-gradient(180deg,rgba(2,6,23,0.68),rgba(2,6,23,0.94))]" />

      <main
        data-clara-ai-message-viewport="true"
        className="min-h-0 flex-1 overflow-y-auto px-0 py-3 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
      >
        {visibleMessages.length ? (
          <div
            data-clara-ai-message-stack="true"
            className={messageStackClassName}
          >
            <FloatingCloseButton onClose={onClose} />
            {visibleMessages.map((message, index) => {
              const isUser = message.role === "user";
              const role = isUser ? "user" : "clara";
              const text = message.text || message.content || "";
              return (
                <div
                  key={message.id || `${message.role || "message"}-${index}`}
                  data-clara-ai-message-row="true"
                  data-clara-ai-message-role={role}
                  className={`flex min-w-0 w-full ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    data-clara-ai-message-bubble="true"
                    data-clara-ai-message-role={role}
                    className={`min-w-0 break-words shadow-[0_14px_34px_rgba(0,0,0,0.16)] [overflow-wrap:break-word] ${
                      isUser ? userBubbleClassName : claraBubbleClassName
                    }`}
                  >
                    <MessageText text={text} />
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} className="h-1 shrink-0" />
          </div>
        ) : (
          <div className="flex min-h-full flex-col justify-end pb-24 pt-20">
            <PauseEntryBoard onClose={onClose} />
          </div>
        )}
      </main>

      <form
        onSubmit={submitDraft}
        className="shrink-0 rounded-[28px] border border-cyan-100/22 bg-white/[0.055] p-2.5 shadow-[0_-18px_50px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl"
      >
        <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.055] px-3 py-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium text-white outline-none placeholder:text-slate-400/70"
            placeholder="Enter the item or answer Buy Check"
            inputMode="text"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cyan-300/70 text-slate-950 shadow-[0_0_26px_rgba(45,212,191,0.22)] transition disabled:opacity-60 active:scale-95"
            aria-label="Send Buy Check answer"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
