import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";

const CLARA_AI_BRAIN_VERSION = "final-ai-surface-v3-iconless-compact-tabs";

const FINAL_AI_TAB_ICON_KILL_SWITCH = `
  [data-clara-final-ai-feature] svg,
  [data-clara-final-ai-feature] .clara-final-ai-tab-icon,
  [data-clara-final-ai-tab] svg,
  [data-clara-final-ai-tab] .clara-final-ai-tab-icon {
    display: none !important;
  }

  [data-clara-final-ai-feature] > span:has(svg),
  [data-clara-final-ai-tab] > span:has(svg) {
    display: none !important;
  }
`;

const FINAL_AI_FEATURES = [
  { id: "buy-check", label: "Buy Check" },
  { id: "forecast", label: "Forecast" },
  { id: "analytic", label: "Analytic" },
];

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

function PanelButton({ feature, active = false, onClick }) {
  return (
    <button
      type="button"
      data-clara-final-ai-feature={feature.id}
      onClick={() => onClick?.(feature.id)}
      className={`flex min-w-0 items-center justify-center rounded-full border px-2.5 py-2.5 text-[12px] font-black leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition active:scale-95 ${
        active
          ? "border-cyan-100/30 bg-cyan-300/[0.13] text-white"
          : "border-white/14 bg-white/[0.055] text-white/86 hover:border-cyan-100/22 hover:bg-white/[0.075]"
      }`}
      aria-label={`Open CLARA ${feature.label}`}
      title={feature.label}
    >
      <span className="min-w-0 truncate text-center">{feature.label}</span>
    </button>
  );
}

function InstructionBoard({ onClose }) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-cyan-100/22 bg-white/[0.055] px-6 pb-6 pt-8 text-center shadow-[0_26px_80px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
      <FloatingCloseButton onClose={onClose} />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(45,212,191,0.22),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(124,58,237,0.30),transparent_38%),linear-gradient(145deg,rgba(8,47,73,0.35),rgba(30,27,75,0.38))]" />

      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/55">
        MONEY CHECK-IN
      </p>
      <h3 className="mx-auto mt-4 max-w-[318px] text-[24px] font-black leading-[1.12] tracking-[-0.045em] text-white">
        Need help thinking through a decision?
      </h3>
      <p className="mx-auto mt-5 max-w-[292px] text-[13.5px] font-medium leading-7 text-slate-300/76">
        Choose Buy Check, Forecast, or Analytic when you need CLARA to read your money situation.
      </p>
      <p className="mx-auto mt-3 max-w-[278px] text-[13.5px] font-medium leading-7 text-slate-300/70">
        No rush. CLARA is here to help you pause before spending.
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
}) {
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState("buy-check");
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
      setSelectedFeature("buy-check");
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
          "Use the buttons above first so CLARA can open the correct system: Buy Check, Forecast, or Analytic.",
      },
    ]);
    setDraft("");
  };

  return (
    <div
      className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-slate-950/78 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),18px)] text-white backdrop-blur-[2px]"
      data-clara-ai-brain-version={CLARA_AI_BRAIN_VERSION}
    >
      <style>{FINAL_AI_TAB_ICON_KILL_SWITCH}</style>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_10%,rgba(45,212,191,0.26),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(124,58,237,0.32),transparent_38%),linear-gradient(180deg,rgba(2,6,23,0.68),rgba(2,6,23,0.94))]" />

      <main className="min-h-0 flex-1 overflow-y-auto px-0 py-3 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        {visibleMessages.length ? (
          <div className="flex min-h-full flex-col justify-start gap-3 px-2 pb-28 pt-12">
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
          <div className="flex min-h-full flex-col justify-end gap-4 pb-24 pt-20">
            <InstructionBoard onClose={onClose} />
            <div className="rounded-[25px] border border-white/12 bg-slate-950/72 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
              <div className="grid grid-cols-3 gap-2">
                {FINAL_AI_FEATURES.map((feature) => (
                  <PanelButton
                    key={feature.id}
                    feature={feature}
                    active={selectedFeature === feature.id}
                    onClick={openFeature}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <form onSubmit={submitDraft} className="shrink-0 rounded-[28px] border border-cyan-100/22 bg-white/[0.055] p-2.5 shadow-[0_-18px_50px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
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
            disabled={!draft.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cyan-300/70 text-slate-950 shadow-[0_0_26px_rgba(45,212,191,0.22)] transition disabled:opacity-60 active:scale-95"
            aria-label="Send to CLARA"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
