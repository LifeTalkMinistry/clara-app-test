import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import useClaraBuyCheckFlow from "@/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlow";

const CLARA_AI_BRAIN_VERSION = "strict-buy-check-v11-single-optional-ai";

const BUY_CHECK_GREETINGS = [
  "Hey! Let’s check it before the money leaves.",
  "Hi! Tell me exactly what you’re thinking about buying.",
  "Hey there! Let’s document the purchase first.",
  "Hi! I’m ready to check this purchase with you.",
  "Hey! Before you spend, let’s get the exact item.",
  "Welcome back! Let’s check what you want to buy.",
  "Hi! We’ll keep this quick and clear.",
  "Hey! Let’s take note of the purchase first.",
  "Hi there! What purchase are we checking today?",
  "Hey! Let’s see what this purchase would change.",
];

const BUTTON_ONLY_STEPS = new Set([
  "confirm_item",
  "reason_permission",
  "confirm_price",
  "confirm",
]);

function clean(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function money(value = 0) {
  const amount = Math.max(0, Number(value) || 0);
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 })}`;
}

function greetingForSession(sessionId = "") {
  const source = String(sessionId || "buy-check");
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  return BUY_CHECK_GREETINGS[hash % BUY_CHECK_GREETINGS.length];
}

function placeholderFor(step) {
  if (step === "item") return "Type the exact item";
  if (step === "reason") return "Tell CLARA why you want or need it";
  if (step === "price") return "Type the exact amount or payment structure";
  return "Choose an option below";
}

const MessageRow = memo(function MessageRow({ role, text }) {
  const isUser = role === "user";
  const isThinking = !isUser && !clean(text);
  if (isThinking) {
    return (
      <div className="flex justify-start" data-clara-buy-check-thinking-row="true">
        <div className="flex items-center gap-1.5 rounded-full border border-blue-200/14 bg-[#07152d]/88 px-4 py-3" role="status" aria-label="CLARA is thinking">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={isUser
        ? "max-w-[86%] rounded-[24px] border border-blue-300/22 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 py-3 text-[13px] font-semibold leading-5 text-white shadow-[0_12px_28px_rgba(23,105,255,0.20)]"
        : "w-[94%] max-w-[94%] rounded-[26px] border border-blue-200/14 border-l-2 border-l-[#ffd84a]/45 bg-[#07152d]/88 px-4 py-4 text-[13.5px] leading-6 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"}
      >
        <span className="whitespace-pre-wrap">{text}</span>
      </div>
    </div>
  );
});

function Composer({ step, busy, onSubmit }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft("");
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus?.({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  const submit = (event) => {
    event.preventDefault();
    const answer = clean(draft);
    if (!answer || busy) return;
    onSubmit?.(answer);
    setDraft("");
  };

  return (
    <form onSubmit={submit} data-clara-buy-check-react-form="true" className="relative z-30 shrink-0 rounded-[28px] border border-blue-200/16 bg-[#040b1a]/96 p-2.5 shadow-[0_-18px_52px_rgba(0,0,0,0.48)]">
      <div className="flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#08142b]/94 px-3 py-2 focus-within:border-blue-300/36">
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={busy}
          placeholder={placeholderFor(step)}
          aria-label={placeholderFor(step)}
          className="min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium text-white outline-none placeholder:text-slate-400/72 disabled:opacity-55"
        />
        <button type="submit" disabled={busy || !clean(draft)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-300/24 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] text-white disabled:opacity-40" aria-label="Send Ask Before You Spend answer">
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}

function BinaryActions({ step, busy, onAnswer, onFinalYes, onFinalNo }) {
  if (!BUTTON_ONLY_STEPS.has(step)) return null;
  const finalChoice = step === "confirm";
  return (
    <div data-clara-buy-check-binary-actions={step} className="relative z-30 grid grid-cols-2 gap-2.5 px-1 pb-2 pt-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => finalChoice ? onFinalYes?.() : onAnswer?.("Yes")}
        className="min-h-11 rounded-full border border-blue-300/24 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 text-[12px] font-black text-white shadow-[0_12px_30px_rgba(23,105,255,0.24)] disabled:opacity-55"
      >
        Yes
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => finalChoice ? onFinalNo?.() : onAnswer?.("No")}
        className="min-h-11 rounded-full border border-red-300/18 bg-red-500/[0.045] px-4 text-[12px] font-black text-white/92 disabled:opacity-55"
      >
        No
      </button>
    </div>
  );
}

function FinalDecisionPanel({ flow, state }) {
  const finalDecision = state?.finalDecision;
  const walletOptions = Array.isArray(state?.walletOptions) ? state.walletOptions : [];
  if (!finalDecision || !["explain", "resolved"].includes(finalDecision.phase)) return null;

  if (finalDecision.phase === "resolved") {
    return (
      <section className="rounded-[26px] border border-blue-200/20 bg-[#050d1f]/96 px-5 py-5 text-left shadow-[0_20px_52px_rgba(0,0,0,0.46)]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd84a]/76">{finalDecision.result?.eyebrow || "DECISION SAVED"}</p>
        <h3 className="mt-2 text-[19px] font-black text-white">{finalDecision.result?.title}</h3>
        <p className="mt-2 text-[13px] font-semibold leading-6 text-slate-100/88">{finalDecision.result?.message}</p>
        <p className="mt-4 text-[14px] font-black text-white/94">Anything else you want to check?</p>
      </section>
    );
  }

  const isBuy = finalDecision.choice === "buy";
  const installment = Boolean(isBuy && finalDecision.recordMode === "installment_obligation");
  const selectedWallet = walletOptions.find((wallet) => wallet.id === finalDecision.walletId) || null;
  const dueDay = Number(finalDecision.installmentDueDay || 0);
  const canSave = !finalDecision.busy && (
    !isBuy ||
    (installment ? Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31 : Boolean(selectedWallet))
  );

  return (
    <section data-clara-buy-check-final-decision-panel={finalDecision.choice} className="rounded-[26px] border border-blue-200/18 bg-[#050d1f]/96 px-4 py-5 text-left shadow-[0_22px_56px_rgba(0,0,0,0.48)]">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/68">YOUR DECISION</p>
      <h3 className="mt-2 text-[19px] font-black text-white">{isBuy ? `You chose to buy ${state.item}` : `You chose not to buy ${state.item}`}</h3>
      <textarea
        rows={3}
        value={finalDecision.explanation || ""}
        onChange={(event) => flow.setDecisionExplanation?.(event.target.value)}
        className="mt-4 w-full resize-none rounded-[18px] border border-blue-200/14 bg-[#08142b]/96 px-4 py-3 text-[13px] font-semibold leading-5 text-white outline-none"
        disabled={finalDecision.busy}
      />

      {isBuy && !installment ? (
        <div className="mt-3 grid gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd84a]/66">PAY FROM</p>
          {walletOptions.map((wallet) => (
            <button
              key={wallet.id || wallet.name}
              type="button"
              disabled={finalDecision.busy || !wallet.enough}
              onClick={() => flow.setDecisionWallet?.(wallet.id)}
              className={`flex min-h-12 items-center justify-between rounded-[16px] border px-4 text-left text-[12px] font-bold ${wallet.id === finalDecision.walletId ? "border-blue-300/42 bg-blue-500/14" : "border-white/8 bg-white/[0.035]"} disabled:opacity-40`}
            >
              <span>{wallet.name}</span><span>{money(wallet.balance)}</span>
            </button>
          ))}
          {!walletOptions.length ? <p className="text-[11px] font-semibold text-amber-100/72">Add or fund a spendable wallet before logging this expense.</p> : null}
        </div>
      ) : null}

      {installment ? (
        <div className="mt-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd84a]/66">DUE EACH MONTH</p>
          <select
            value={finalDecision.installmentDueDay || ""}
            onChange={(event) => flow.setDecisionInstallmentDueDay?.(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-[16px] border border-blue-200/14 bg-[#08142b]/96 px-4 text-[13px] font-bold text-white outline-none"
          >
            <option value="">Choose day</option>
            {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>Day {day}</option>)}
          </select>
          <p className="mt-2 text-[11px] font-semibold leading-5 text-blue-100/65">CLARA will document the installment under Debt / Obligations. No wallet money is deducted just for documenting it.</p>
        </div>
      ) : null}

      {finalDecision.error ? <p className="mt-3 text-[11px] font-black text-red-200/90">{finalDecision.error}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button type="button" disabled={!canSave} onClick={flow.submitFinalDecision} className="min-h-11 rounded-full bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 text-[12px] font-black text-white disabled:opacity-50">
          {finalDecision.busy ? "Saving..." : installment ? "Document installment" : isBuy ? "Log expense" : "Save decision"}
        </button>
        <button type="button" disabled={finalDecision.busy} onClick={flow.cancelFinalDecision} className="min-h-11 rounded-full border border-white/12 px-4 text-[12px] font-black text-white/90 disabled:opacity-50">Back</button>
      </div>
    </section>
  );
}

export default function ClaraAiEnvironmentOverlayV3({
  isActive = false,
  messages = [],
  claraAssistantContext = {},
  buyCheckState = null,
  onSubmitBuyCheckAnswer,
  onConfirmBuyCheck,
  onDeclineBuyCheck,
  onCheckAnother,
  onClose,
  layoutVariant = "default",
}) {
  const previousActiveRef = useRef(false);
  const guidePreview = layoutVariant === "guide-preview";
  const ownedFlow = useClaraBuyCheckFlow({ assistantContext: claraAssistantContext });

  useEffect(() => {
    if (guidePreview) return;
    if (isActive && !previousActiveRef.current) ownedFlow.startSession(`pause-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    if (!isActive && previousActiveRef.current) ownedFlow.clearSession();
    previousActiveRef.current = isActive;
  }, [guidePreview, isActive, ownedFlow.clearSession, ownedFlow.startSession]);

  const state = guidePreview ? (buyCheckState || {}) : ownedFlow.state;
  const flowMessages = guidePreview ? messages : ownedFlow.messages;
  const submitAnswer = guidePreview ? onSubmitBuyCheckAnswer : ownedFlow.submitAnswer;
  const confirm = guidePreview ? onConfirmBuyCheck : ownedFlow.confirm;
  const decline = guidePreview ? onDeclineBuyCheck : ownedFlow.decline;
  const checkAnother = guidePreview ? onCheckAnother : ownedFlow.checkAnother;
  const step = state?.step || "item";
  const busy = Boolean(state?.busy || state?.finalDecision?.busy);
  const finalDecision = state?.finalDecision;
  const finalDecisionActive = Boolean(finalDecision && ["explain", "resolved"].includes(finalDecision.phase));
  const visibleMessages = useMemo(() => (Array.isArray(flowMessages) ? flowMessages.filter(Boolean) : []), [flowMessages]);
  const greeting = greetingForSession(state?.sessionId);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/96 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white" data-clara-ai-brain-version={CLARA_AI_BRAIN_VERSION} data-clara-buy-check-react-owner="true">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.30),transparent_34%),radial-gradient(circle_at_96%_8%,rgba(229,57,69,0.18),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />

      <header className="relative z-20 mx-1 shrink-0 overflow-hidden rounded-[24px] border border-blue-200/18 bg-[linear-gradient(115deg,rgba(5,26,62,0.98),rgba(7,22,48,0.98)_52%,rgba(35,10,28,0.96))] px-4 py-3.5 pr-14 shadow-[0_16px_38px_rgba(0,0,0,0.28)]">
        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#ffd84a]/88">CLARA MONEY TOOLS</p>
        <h1 className="mt-1 text-[17px] font-black text-white">Ask Before You Spend</h1>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100/42">Pause · Check · Decide</p>
        <button type="button" onClick={onClose} aria-label="Close CLARA Ask Before You Spend" className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-blue-100/28 bg-[#07152d]/86 text-white/88"><X className="h-4 w-4" /></button>
      </header>

      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-clara-ai-message-viewport="true">
        {!visibleMessages.length ? (
          <section data-clara-buy-check-opening-board="true" className="mt-12 rounded-[30px] border border-blue-200/20 bg-[#061226]/78 px-6 py-7 text-center shadow-[0_26px_80px_rgba(0,0,0,0.40)]">
            <p className="text-[16px] font-extrabold leading-[1.48] text-white/94">{greeting}</p>
            <strong className="mt-5 block text-[16px] font-black leading-[1.4] text-white/95">Please type the exact item you want to buy.</strong>
            <span className="mt-2 block text-[11.5px] font-extrabold text-[#ffd84a]/82">Example: Running shoes</span>
          </section>
        ) : (
          <div className="flex min-h-full flex-col gap-3 pb-5 pt-1" data-clara-ai-message-stack="true">
            {visibleMessages.map((message, index) => <MessageRow key={message.id || `${message.role}-${index}`} role={message.role} text={clean(message.text || message.content)} />)}
            {finalDecisionActive && !guidePreview ? <FinalDecisionPanel flow={ownedFlow} state={state} /> : null}
          </div>
        )}
      </main>

      {!finalDecisionActive ? (
        <BinaryActions
          step={step}
          busy={busy}
          onAnswer={submitAnswer}
          onFinalYes={() => confirm?.("buy")}
          onFinalNo={() => decline?.()}
        />
      ) : null}

      {!BUTTON_ONLY_STEPS.has(step) && !finalDecisionActive && step !== "complete" ? (
        <Composer step={step} busy={busy} onSubmit={submitAnswer} />
      ) : null}

      {finalDecision?.phase === "resolved" ? (
        <div className="relative z-30 grid grid-cols-2 gap-2.5 px-1 pb-2 pt-1">
          <button type="button" onClick={checkAnother} className="min-h-11 rounded-full bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 text-[12px] font-black text-white">Yes</button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full border border-white/12 px-4 text-[12px] font-black text-white/90">No, I’m done</button>
        </div>
      ) : null}
    </div>
  );
}
