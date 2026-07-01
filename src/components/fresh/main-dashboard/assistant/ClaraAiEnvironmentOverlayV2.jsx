import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import useClaraBuyCheckFlow from "@/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlow";

const CLARA_AI_BRAIN_VERSION = "pause-react-owned-buy-check-v3-deterministic";
const BUY_CHECK_ACKNOWLEDGMENTS = [
  "Good move—you paused before buying. Let’s see if it fits your money.",
  "Nice. You stopped before spending. Let’s check this purchase together.",
  "That pause matters. Now let’s see if this purchase makes sense for you.",
  "No judgment—just a clearer decision before your money leaves.",
  "You brought the decision here before spending. That is real progress.",
];

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function money(value = 0) {
  const parsed = Number(String(value || "").replace(/[₱,\s]/g, ""));
  return `₱${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function selectAcknowledgment(previousIndex = -1) {
  let index = Math.floor(Math.random() * BUY_CHECK_ACKNOWLEDGMENTS.length);
  if (BUY_CHECK_ACKNOWLEDGMENTS.length > 1 && index === previousIndex) index = (index + 1) % BUY_CHECK_ACKNOWLEDGMENTS.length;
  return { index, message: BUY_CHECK_ACKNOWLEDGMENTS[index] };
}

function decisionTheme(decision = "") {
  const normalized = clean(decision).toUpperCase();
  if (normalized === "BUY") return { card: "border-emerald-200/20 bg-emerald-300/10", note: "text-emerald-50/90" };
  if (normalized === "BUY WITH CAP") return { card: "border-cyan-200/20 bg-cyan-300/10", note: "text-cyan-50/90" };
  if (normalized === "REDUCE") return { card: "border-amber-200/25 bg-amber-300/10", note: "text-amber-50/90" };
  if (normalized === "WAIT") return { card: "border-orange-200/25 bg-orange-300/10", note: "text-orange-50/90" };
  if (normalized === "PAUSE") return { card: "border-violet-200/25 bg-violet-300/10", note: "text-violet-50/90" };
  return { card: "border-white/12 bg-slate-950/24", note: "text-slate-200/80" };
}

function FloatingCloseButton({ onClose }) {
  return (
    <button type="button" onClick={onClose} className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/75 bg-white/[0.055] text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:bg-white/[0.12] active:scale-95" aria-label="Close CLARA AI mode">
      <X className="h-4 w-4" />
    </button>
  );
}

function PauseEntryBoard({ onClose, acknowledgmentMessage }) {
  return (
    <section data-clara-pause-entry-board="true" data-clara-buy-check-board="true" data-clara-buy-check-opening-board="true" className="relative overflow-hidden rounded-[30px] border border-cyan-100/22 bg-white/[0.055] px-6 pb-7 pt-9 text-center shadow-[0_26px_80px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
      <FloatingCloseButton onClose={onClose} />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(45,212,191,0.22),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(124,58,237,0.30),transparent_38%),linear-gradient(145deg,rgba(8,47,73,0.35),rgba(30,27,75,0.38))]" />
      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/55">BUY CHECK</p>
      <div className="mx-auto mt-5 flex min-h-[96px] max-w-[318px] items-center justify-center rounded-[22px] border border-white/10 bg-slate-950/20 px-5 py-4">
        <p className="text-[16px] font-extrabold leading-[1.48] text-white/92">{acknowledgmentMessage}</p>
      </div>
      <div data-clara-buy-check-active-question="true" aria-live="polite" className="mx-auto mt-5 max-w-[318px] text-center">
        <strong className="block text-[16px] font-black leading-[1.4] text-white/95">What do you want to buy?</strong>
        <span className="mt-1.5 block text-[12px] font-semibold leading-[1.55] text-slate-300/72">Type the exact item for us to start.</span>
        <span className="mt-1 block text-[11.5px] font-extrabold leading-[1.5] text-emerald-300/88">Example: Running shoes</span>
      </div>
    </section>
  );
}

function BuyCheckReport({ diagnosis }) {
  const cards = Array.isArray(diagnosis?.cards) ? diagnosis.cards : [];
  if (!cards.length) return null;
  return (
    <section data-clara-buy-check-react-report="true" className="mt-2 rounded-[28px] border border-cyan-100/15 bg-white/[0.065] px-4 pb-5 pt-5 text-center shadow-[0_22px_58px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/55">BUY CHECK REPORT</p>
      <p className="mt-2 text-[11px] font-bold text-slate-300/65">Swipe through the evidence</p>
      <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((card, index) => {
          const theme = card.final ? decisionTheme(card.decision || diagnosis?.decision || card.title) : null;
          return (
            <article key={`${card.eyebrow || "card"}-${index}`} className={`min-w-full snap-center rounded-[24px] border px-5 py-5 text-left ${card.final ? theme.card : "border-white/10 bg-slate-950/20"}`}>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/45">{card.eyebrow}</p>
              <h3 className="mt-2 text-[21px] font-black leading-tight text-white">{card.title}</h3>
              <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-black text-slate-100/90">{card.stat}</div>
              <p className="mt-4 text-[13px] font-bold leading-6 text-slate-100/90">{card.body}</p>
              <p className={`mt-4 text-[11px] font-black leading-5 ${card.final ? theme.note : "text-slate-300/58"}`}>{card.note}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FinalDecisionPanel({ finalDecision, walletOptions, item, price, onExplanationChange, onWalletChange, onSave, onCancel }) {
  if (!finalDecision || !["explain", "resolved"].includes(finalDecision.phase)) return null;
  if (finalDecision.phase === "resolved") {
    return (
      <section className="rounded-[26px] border border-emerald-200/22 bg-slate-950/95 px-5 py-5 text-left shadow-[0_20px_52px_rgba(0,0,0,0.46)] backdrop-blur-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/75">DECISION SAVED</p>
        <h3 className="mt-2 text-[19px] font-black text-white">{finalDecision.result?.title}</h3>
        <p className="mt-2 text-[13px] font-semibold leading-6 text-slate-100/88">{finalDecision.result?.message}</p>
      </section>
    );
  }
  const isBuy = finalDecision.choice === "buy";
  return (
    <section data-clara-buy-check-final-decision-panel={finalDecision.choice} className="rounded-[26px] border border-cyan-100/20 bg-slate-950/95 px-4 py-5 text-left shadow-[0_22px_56px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/65">YOUR FINAL DECISION</p>
      <h3 className="mt-2 text-[19px] font-black text-white">{isBuy ? `You chose to continue with ${item}` : `You chose not to buy ${item}`}</h3>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-slate-200/82">{isBuy ? `Tell CLARA why you will continue with this ${money(price)} purchase. Your explanation will be attached to the expense.` : "Tell CLARA why you changed your mind or decided to wait. This reflection will be remembered for future Buy Checks."}</p>
      <textarea rows={3} value={finalDecision.explanation || ""} onChange={(event) => onExplanationChange?.(event.target.value)} placeholder={isBuy ? "Example: I need it for work because my current one is broken." : "Example: It is not urgent, so I decided to save first."} className="mt-4 w-full resize-none rounded-[18px] border border-white/14 bg-slate-900/95 px-4 py-3 text-[13px] font-semibold leading-5 text-white shadow-inner outline-none placeholder:text-slate-400/72 focus:border-cyan-200/40" disabled={finalDecision.busy} />
      {isBuy ? (
        <div className="mt-3">
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-300/72">PAY FROM</label>
          <select value={finalDecision.walletId || ""} onChange={(event) => onWalletChange?.(event.target.value)} disabled={finalDecision.busy} className="w-full rounded-[18px] border border-white/14 bg-slate-900/95 px-4 py-3 text-[13px] font-bold text-white shadow-inner outline-none focus:border-cyan-200/40">
            <option value="">Choose a wallet</option>
            {(walletOptions || []).map((wallet) => <option key={wallet.id || wallet.name} value={wallet.id} disabled={!wallet.enough}>{wallet.name} — {money(wallet.balance)}{wallet.enough ? "" : " (not enough)"}</option>)}
          </select>
        </div>
      ) : null}
      {finalDecision.error ? <p className="mt-3 text-[11px] font-black leading-5 text-rose-200/90" aria-live="polite">{finalDecision.error}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button type="button" onClick={onSave} disabled={finalDecision.busy} className="min-h-11 rounded-full bg-cyan-300 px-4 text-[12px] font-black text-slate-950 disabled:opacity-50">{finalDecision.busy ? "Saving..." : isBuy ? "Log expense" : "Save reflection"}</button>
        <button type="button" onClick={onCancel} disabled={finalDecision.busy} className="min-h-11 rounded-full border border-white/15 bg-slate-800/95 px-4 text-[12px] font-black text-white/92 disabled:opacity-50">Back</button>
      </div>
    </section>
  );
}

function getRecommendationActions(decision = "") {
  const normalized = clean(decision).toUpperCase();
  if (normalized === "BUY") return { primary: "Will buy", primaryAction: "buy", secondary: "Not buy", secondaryAction: "not_buy" };
  if (normalized === "BUY WITH CAP") return { primary: "Buy within cap", primaryAction: "buy", secondary: "Not buy", secondaryAction: "not_buy" };
  if (normalized === "REDUCE") return { primary: "Adjust amount", primaryAction: "edit", secondary: "Continue at full price", secondaryAction: "buy" };
  if (normalized === "WAIT") return { primary: "I’ll wait", primaryAction: "not_buy", secondary: "Continue anyway", secondaryAction: "buy" };
  return { primary: "Review my budget", primaryAction: "not_buy", secondary: "Continue anyway", secondaryAction: "buy" };
}

function ActionBar({ step, busy, finalDecision, diagnosis, onConfirm, onEditReason, onEdit, onWillBuy, onNotBuy, onCheckAnother, onClose }) {
  if (step === "confirm") {
    return <div className="relative z-10 grid grid-cols-2 gap-2.5 px-1 pb-2"><button type="button" onClick={onConfirm} disabled={busy} className="min-h-11 rounded-full bg-cyan-300 px-4 text-[12px] font-black text-slate-950 disabled:opacity-55">Yes</button><button type="button" onClick={onEditReason} disabled={busy} className="min-h-11 rounded-full border border-white/15 bg-slate-900/92 px-4 text-[12px] font-black text-white/92 disabled:opacity-55">No</button></div>;
  }
  if (step === "complete" && finalDecision?.phase === "choose") {
    const actions = getRecommendationActions(diagnosis?.decision);
    const run = (action) => action === "buy" ? onWillBuy?.() : action === "not_buy" ? onNotBuy?.() : onEdit?.();
    return <div className="relative z-10 grid grid-cols-2 gap-2.5 px-1 pb-2"><button type="button" onClick={() => run(actions.primaryAction)} className="min-h-11 rounded-full bg-cyan-300 px-4 text-[12px] font-black text-slate-950">{actions.primary}</button><button type="button" onClick={() => run(actions.secondaryAction)} className="min-h-11 rounded-full border border-white/15 bg-slate-900/92 px-4 text-[12px] font-black text-white/92">{actions.secondary}</button></div>;
  }
  if (step === "complete" && finalDecision?.phase === "resolved") {
    return <div className="relative z-10 grid grid-cols-2 gap-2.5 px-1 pb-2"><button type="button" onClick={onCheckAnother} className="min-h-11 rounded-full bg-cyan-300 px-4 text-[12px] font-black text-slate-950">Check another</button><button type="button" onClick={onClose} className="min-h-11 rounded-full border border-white/15 bg-slate-900/92 px-4 text-[12px] font-black text-white/92">Done</button></div>;
  }
  return null;
}

function placeholderFor(step) {
  if (step === "price") return "Enter the price, e.g. ₱3,500";
  if (step === "reason") return "Why do you want to buy it?";
  if (step === "confirm") return "Choose Yes or No";
  if (step === "diagnosis") return "CLARA is checking your context";
  if (step === "complete") return "Choose your final action";
  return "Type the item you want to buy";
}

export default function ClaraAiEnvironmentOverlay({ isActive = false, messages = [], claraAssistantContext = {}, buyCheckState = null, onSubmitBuyCheckAnswer, onConfirmBuyCheck, onEditBuyCheck, onCheckAnother, onClose, layoutVariant = "default" }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const previousAcknowledgmentIndexRef = useRef(-1);
  const acknowledgmentSessionRef = useRef({ active: false, sessionId: "", index: -1, message: "" });
  const previousActiveRef = useRef(false);
  const isGuidePreview = layoutVariant === "guide-preview";
  const ownedFlow = useClaraBuyCheckFlow({ assistantContext: claraAssistantContext });

  useEffect(() => {
    if (isGuidePreview) return;
    if (isActive && !previousActiveRef.current) ownedFlow.startSession(`pause-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    if (!isActive && previousActiveRef.current) ownedFlow.clearSession();
    previousActiveRef.current = isActive;
  }, [isActive, isGuidePreview, ownedFlow.clearSession, ownedFlow.startSession]);

  const activeState = isGuidePreview ? buyCheckState : ownedFlow.state;
  const activeMessages = isGuidePreview ? messages : ownedFlow.messages;
  const submitAnswer = isGuidePreview ? onSubmitBuyCheckAnswer : ownedFlow.submitAnswer;
  const confirmBuyCheck = isGuidePreview ? onConfirmBuyCheck : ownedFlow.confirm;
  const editReason = isGuidePreview ? onEditBuyCheck : ownedFlow.editReason;
  const editBuyCheck = isGuidePreview ? onEditBuyCheck : ownedFlow.editAnswers;
  const checkAnother = isGuidePreview ? onCheckAnother : ownedFlow.checkAnother;
  const finalDecision = activeState?.finalDecision;
  const walletOptions = activeState?.walletOptions || [];
  const sessionId = activeState?.sessionId || "preview-session";
  const step = activeState?.step || "item";
  const busy = Boolean(activeState?.busy || finalDecision?.busy);
  const inputLocked = Boolean(activeState && ["confirm", "diagnosis", "complete"].includes(step));

  if (isActive && (!acknowledgmentSessionRef.current.active || acknowledgmentSessionRef.current.sessionId !== sessionId)) {
    const selection = selectAcknowledgment(previousAcknowledgmentIndexRef.current);
    acknowledgmentSessionRef.current = { active: true, sessionId, ...selection };
    previousAcknowledgmentIndexRef.current = selection.index;
  } else if (!isActive && acknowledgmentSessionRef.current.active) {
    acknowledgmentSessionRef.current = { active: false, sessionId: "", index: -1, message: "" };
  }

  const visibleMessages = useMemo(() => (Array.isArray(activeMessages) ? activeMessages : []).filter(Boolean), [activeMessages]);
  const scrollKey = useMemo(() => visibleMessages.map((message) => `${message.id || "message"}:${String(message.text || message.content || "").length}`).join("|"), [visibleMessages]);
  useEffect(() => { if (!isActive) setDraft(""); }, [isActive]);
  useEffect(() => {
    if (!isActive || inputLocked || busy) return undefined;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus?.({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [busy, inputLocked, isActive, step]);
  useEffect(() => {
    if (!isActive) return undefined;
    const handleEscape = (event) => event.key === "Escape" && onClose?.();
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isActive, onClose]);
  useEffect(() => {
    if (!isActive || !visibleMessages.length) return undefined;
    const frame = window.requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" }));
    return () => window.cancelAnimationFrame(frame);
  }, [finalDecision?.phase, isActive, scrollKey, step, visibleMessages.length]);

  if (!isActive) return null;
  const submitDraft = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const answer = draft.trim();
    if (!answer || inputLocked || busy) return;
    submitAnswer?.(answer);
    setDraft("");
  };
  const userBubble = isGuidePreview ? "w-fit max-w-[78%] rounded-[22px] bg-emerald-300 px-4 py-2.5 text-[13px] font-semibold leading-5 text-slate-950" : "max-w-[86%] rounded-[24px] bg-emerald-300 px-4 py-3 text-[13px] font-semibold leading-5 text-slate-950";
  const claraBubble = isGuidePreview ? "w-fit max-w-[86%] rounded-[22px] border border-white/10 bg-white/[0.075] px-4 py-3 text-[13.5px] leading-[1.55] text-white/90 backdrop-blur-xl" : "w-[94%] max-w-[94%] rounded-[26px] border border-white/10 bg-white/[0.075] px-4 py-4 text-[13.5px] leading-6 text-white/90 backdrop-blur-xl";
  const showFinalDecisionPanel = Boolean(finalDecision && ["explain", "resolved"].includes(finalDecision.phase));

  return (
    <div className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-slate-950/78 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),18px)] text-white backdrop-blur-[2px]" data-clara-ai-brain-version={CLARA_AI_BRAIN_VERSION} data-clara-ai-layout-variant={layoutVariant} data-clara-pause-overlay="true" data-clara-buy-check-react-owner="true">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_10%,rgba(45,212,191,0.26),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(124,58,237,0.32),transparent_38%),linear-gradient(180deg,rgba(2,6,23,0.68),rgba(2,6,23,0.94))]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[58%] bg-[linear-gradient(180deg,rgba(2,6,23,0)_0%,rgba(2,6,23,0.74)_18%,rgba(2,6,23,0.93)_45%,rgba(2,6,23,0.99)_100%)]" />
      <main data-clara-ai-message-viewport="true" className="relative z-10 min-h-0 flex-1 overflow-y-auto px-0 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visibleMessages.length ? (
          <div data-clara-ai-message-stack="true" className="flex min-h-full min-w-0 flex-col justify-start gap-3 px-2 pb-28 pt-12">
            <FloatingCloseButton onClose={onClose} />
            {visibleMessages.map((message, index) => {
              const isUser = message.role === "user";
              return <div key={message.id || `${message.role || "message"}-${index}`} className={`flex min-w-0 w-full ${isUser ? "justify-end" : "justify-start"}`}><div className={`min-w-0 break-words shadow-[0_14px_34px_rgba(0,0,0,0.16)] [overflow-wrap:break-word] ${isUser ? userBubble : claraBubble}`}><span className="whitespace-pre-wrap">{clean(message.text || message.content || "")}</span></div></div>;
            })}
            <BuyCheckReport diagnosis={activeState?.diagnosis} />
            {showFinalDecisionPanel ? (
              <div className="mt-3 border-t border-white/10 pt-3">
                <FinalDecisionPanel finalDecision={finalDecision} walletOptions={walletOptions} item={activeState?.item || "this purchase"} price={activeState?.price} onExplanationChange={ownedFlow.setDecisionExplanation} onWalletChange={ownedFlow.setDecisionWallet} onSave={ownedFlow.submitFinalDecision} onCancel={ownedFlow.cancelFinalDecision} />
              </div>
            ) : null}
            <div ref={messagesEndRef} className="h-1 shrink-0" />
          </div>
        ) : <div className="flex min-h-full flex-col justify-center px-1 pb-24 pt-8"><PauseEntryBoard onClose={onClose} acknowledgmentMessage={acknowledgmentSessionRef.current.message || BUY_CHECK_ACKNOWLEDGMENTS[0]} /></div>}
      </main>
      <ActionBar step={step} busy={busy} finalDecision={finalDecision} diagnosis={activeState?.diagnosis} onConfirm={confirmBuyCheck} onEditReason={editReason} onEdit={editBuyCheck} onWillBuy={() => ownedFlow.chooseFinalDecision?.("buy")} onNotBuy={() => ownedFlow.chooseFinalDecision?.("not_buy")} onCheckAnother={checkAnother} onClose={onClose} />
      <form onSubmit={submitDraft} data-clara-buy-check-react-form="true" className="relative z-10 shrink-0 rounded-[28px] border border-white/14 bg-slate-950/95 p-2.5 shadow-[0_-20px_56px_rgba(0,0,0,0.52)] backdrop-blur-2xl">
        <div className="flex items-center gap-2 rounded-[22px] border border-white/12 bg-slate-900/95 px-3 py-2 shadow-inner">
          <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={inputLocked || busy} className="min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium text-white outline-none placeholder:text-slate-400/72 disabled:opacity-55" placeholder={placeholderFor(step)} inputMode={step === "price" ? "decimal" : "text"} aria-label={placeholderFor(step)} />
          <button type="submit" disabled={!draft.trim() || inputLocked || busy} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cyan-300/80 text-slate-950 transition disabled:opacity-45" aria-label="Send Buy Check answer"><ArrowUp className="h-5 w-5" /></button>
        </div>
      </form>
    </div>
  );
}
