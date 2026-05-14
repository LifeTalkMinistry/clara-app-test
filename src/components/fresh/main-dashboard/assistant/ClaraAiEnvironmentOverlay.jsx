import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

function isWelcomeMessage(message = {}) {
  return String(message?.text || "").trim() === "What are you thinking of buying?";
}

export default function ClaraAiEnvironmentOverlay({
  isActive = false,
  messages = [],
  requestFeaturePrompt,
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const visibleMessages = useMemo(
    () => (Array.isArray(messages) ? messages.filter((message) => !isWelcomeMessage(message)) : []),
    [messages]
  );

  useEffect(() => {
    if (!isActive) return undefined;

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus?.();
    }, 180);

    return () => window.clearTimeout(focusTimer);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [isActive, visibleMessages.length]);

  if (!isActive) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleanDraft = draft.trim();
    if (!cleanDraft) return;

    requestFeaturePrompt?.(cleanDraft);
    setDraft("");
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
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold text-emerald-100/80">
            Live
          </span>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-1 py-3 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        {visibleMessages.length ? (
          <div className="flex min-h-full flex-col justify-end gap-3 pb-2">
            {visibleMessages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[86%] rounded-[24px] px-4 py-3 text-[13px] leading-5 shadow-[0_14px_34px_rgba(0,0,0,0.20)] ${
                      isUser
                        ? "bg-emerald-300 text-slate-950"
                        : "border border-white/12 bg-white/[0.075] text-white/86 backdrop-blur-xl"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex h-full min-h-[42dvh] flex-col justify-center rounded-[30px] border border-white/10 bg-white/[0.045] p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/55">
              Decision space
            </p>
            <h3 className="mt-3 text-2xl font-black leading-tight tracking-tight text-white">
              What are you thinking of buying?
            </h3>
            <p className="mx-auto mt-3 max-w-[280px] text-sm leading-6 text-slate-300/75">
              Type the item, amount, or question. CLARA will use your real wallet and budget context.
            </p>
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
            placeholder="Item + price, e.g. shoes ₱1,200"
            inputMode="text"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
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
