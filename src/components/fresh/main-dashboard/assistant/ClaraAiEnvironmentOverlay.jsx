import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";

const CLARA_AI_BRAIN_VERSION = "final-ai-surface-v1-buy-check-forecast-analytic";

const FINAL_AI_FEATURES = [
  {
    id: "buy-check",
    title: "Buy Check",
    eyebrow: "BEFORE SPENDING",
    description:
      "Check a purchase against wallet, budget, goals, emergency fund, schedule, and memory before deciding.",
  },
  {
    id: "forecast",
    title: "Forecast",
    eyebrow: "BEFORE PRESSURE HITS",
    description:
      "Read where your money is heading using income, expenses, budgets, savings, wallets, and risk signals.",
  },
  {
    id: "analytic",
    title: "Analytic",
    eyebrow: "AFTER MONEY MOVES",
    description:
      "Review current money behavior, leaks, pressure, and the clearest financial pattern to fix first.",
  },
];

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function FloatingCloseButton({ onClose }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-white/[0.075] text-white/72 shadow-[0_14px_34px_rgba(0,0,0,0.16)] backdrop-blur-xl transition hover:bg-white/[0.12] active:scale-95"
      aria-label="Close CLARA AI mode"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function FinalFeatureButton({ feature, active = false, onOpen }) {
  return (
    <button
      type="button"
      data-clara-final-ai-feature={feature.id}
      onClick={() => onOpen?.(feature.id)}
      className={`group relative overflow-hidden rounded-[24px] border px-4 py-4 text-left shadow-[0_18px_44px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.075)] backdrop-blur-xl transition active:scale-[0.985] ${
        active
          ? "border-cyan-100/24 bg-cyan-300/[0.13]"
          : "border-white/10 bg-white/[0.055] hover:border-cyan-100/20 hover:bg-white/[0.075]"
      }`}
      aria-label={`Open CLARA ${feature.title}`}
      title={feature.title}
    >
      <span className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-cyan-300/[0.10] blur-2xl transition group-hover:bg-cyan-300/[0.16]" />
      <span className="pointer-events-none absolute -bottom-10 left-8 h-24 w-24 rounded-full bg-violet-400/[0.10] blur-2xl transition group-hover:bg-violet-400/[0.16]" />

      <span className="relative z-10 block text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/56">
        {feature.eyebrow}
      </span>
      <span className="relative z-10 mt-2 block text-[17px] font-black leading-tight tracking-[-0.03em] text-white">
        {feature.title}
      </span>
      <span className="relative z-10 mt-2 block text-[12px] font-semibold leading-5 text-slate-300/68">
        {feature.description}
      </span>
    </button>
  );
}

function FinalInstructionBoard({ selectedFeature, onClose, onOpenFeature }) {
  return (
    <section className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.055] px-5 pb-5 pt-14 text-center shadow-[0_24px_70px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
      <FloatingCloseButton onClose={onClose} />

      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(45,212,191,0.20),transparent_34%),radial-gradient(circle_at_88%_14%,rgba(124,58,237,0.22),transparent_34%)]" />

      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/56">
        CLARA AI
      </p>
      <h3 className="mx-auto mt-3 max-w-[292px] text-[25px] font-black leading-[1.03] tracking-[-0.055em] text-white">
        Choose the money intelligence you need.
      </h3>
      <p className="mx-auto mt-3 max-w-[296px] text-[13px] font-semibold leading-6 text-slate-300/70">
        CLARA AI is now focused on three final systems: Buy Check, Forecast, and Analytic.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {FINAL_AI_FEATURES.map((feature) => (
          <button
            key={feature.id}
            type="button"
            data-clara-final-ai-tab={feature.id}
            className={`min-h-[46px] rounded-2xl border px-2 text-[11px] font-black leading-tight transition active:scale-95 ${
              selectedFeature === feature.id
                ? "border-cyan-100/28 bg-cyan-300/[0.16] text-white"
                : "border-white/10 bg-black/15 text-slate-300/78 hover:border-cyan-100/20 hover:bg-white/[0.06]"
            }`}
            aria-label={`Open CLARA ${feature.title}`}
            title={feature.title}
          >
            {feature.title}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-2">
        {FINAL_AI_FEATURES.map((feature) => (
          <FinalFeatureButton
            key={feature.id}
            feature={feature}
            active={selectedFeature === feature.id}
            onOpen={onOpenFeature}
          />
        ))}
      </div>
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
}) {
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const visibleMessages = useMemo(
    () => [...(Array.isArray(messages) ? messages : []), ...localMessages].filter(Boolean),
    [messages, localMessages]
  );

  const visibleMessagesScrollKey = useMemo(
    () => visibleMessages.map((message) => `${message.id || "message"}:${String(message.text || message.content || "").length}`).join("|"),
    [visibleMessages]
  );

  useEffect(() => {
    if (!isActive) {
      setDraft("");
      setLocalMessages([]);
      setSelectedFeature(null);
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
      messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isActive, visibleMessages.length, visibleMessagesScrollKey]);

  if (!isActive) return null;

  const openFeature = (featureId) => {
    setSelectedFeature(featureId);

    const tabButton = document.querySelector(
      `[data-clara-final-ai-tab="${featureId}"]`
    );

    if (tabButton) {
      window.requestAnimationFrame(() => tabButton.click());
    }
  };

  const submitDraft = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    setLocalMessages((current) => [
      ...current,
      {
        id: `final-ai-user-${Date.now()}`,
        role: "user",
        text,
      },
      {
        id: `final-ai-clara-${Date.now()}`,
        role: "clara",
        text:
          "Choose Buy Check, Forecast, or Analytic first so CLARA can use the correct money system. For purchases, start with Buy Check.",
      },
    ]);
    setDraft("");
  };

  return (
    <div
      className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-slate-950/92 px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),18px)] text-white backdrop-blur-xl"
      data-clara-ai-brain-version={CLARA_AI_BRAIN_VERSION}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_4%,rgba(45,212,191,0.24),transparent_32%),radial-gradient(circle_at_88%_22%,rgba(124,58,237,0.22),transparent_36%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,0.99))]" />

      <main className="min-h-0 flex-1 overflow-y-auto px-1 py-3 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        {visibleMessages.length ? (
          <div className="flex min-h-full flex-col justify-start gap-3 pb-28 pt-12">
            <FloatingCloseButton onClose={onClose} />
            {visibleMessages.map((message, index) => {
              const isUser = message.role === "user";
              const text = message.text || message.content || "";
              return (
                <div key={message.id || `${message.role || "message"}-${index}`} className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`break-words shadow-[0_14px_34px_rgba(0,0,0,0.16)] [overflow-wrap:break-word] ${isUser ? "max-w-[86%] rounded-[24px] bg-emerald-300 px-4 py-3 text-[13px] font-semibold leading-5 text-slate-950" : "w-[94%] max-w-[94%] rounded-[26px] border border-white/10 bg-white/[0.075] px-4 py-4 text-[13.5px] leading-6 text-white/90 shadow-[0_18px_44px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.075)] backdrop-blur-xl"}`}>
                    <MessageText text={text} />
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} className="h-1 shrink-0" />
          </div>
        ) : (
          <div className="flex min-h-full flex-col justify-center gap-4 pb-4">
            <FinalInstructionBoard selectedFeature={selectedFeature} onClose={onClose} onOpenFeature={openFeature} />
          </div>
        )}
      </main>

      <form onSubmit={submitDraft} className="shrink-0 rounded-[28px] border border-white/16 bg-slate-950/68 p-2.5 shadow-[0_-18px_50px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
        <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.055] px-3 py-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium text-white outline-none placeholder:text-slate-400/70"
            placeholder="Choose Buy Check, Forecast, or Analytic"
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
