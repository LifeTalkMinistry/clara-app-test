import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import useClaraBuyCheckFlow from "@/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlow";
import BuyCheckDecisionCard from "@/components/fresh/main-dashboard/assistant/buy-check/BuyCheckDecisionCard";

const CLARA_AI_BRAIN_VERSION = "pause-react-owned-buy-check-v5-clara-money-tools";
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
  if (BUY_CHECK_ACKNOWLEDGMENTS.length > 1 && index === previousIndex) {
    index = (index + 1) % BUY_CHECK_ACKNOWLEDGMENTS.length;
  }
  return { index, message: BUY_CHECK_ACKNOWLEDGMENTS[index] };
}

function FloatingCloseButton({ onClose }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="absolute right-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-blue-100/28 bg-[#07152d]/86 text-white/88 shadow-[0_10px_28px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-blue-200/55 hover:bg-blue-500/15 active:scale-95"
      aria-label="Close CLARA Ask Before You Spend"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function BuyCheckHeader({ onClose }) {
  return (
    <header
      data-clara-buy-check-header="true"
      className="relative z-20 mx-1 shrink-0 overflow-hidden rounded-[24px] border border-blue-200/18 bg-[linear-gradient(115deg,rgba(5,26,62,0.98),rgba(7,22,48,0.98)_52%,rgba(35,10,28,0.96))] px-4 py-3.5 pr-14 shadow-[0_16px_38px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)]" />
      <div className="pointer-events-none absolute -left-10 -top-12 h-28 w-28 rounded-full bg-blue-500/18 blur-3xl" />
      <div className="pointer-events-none absolute -right-8 -top-12 h-28 w-28 rounded-full bg-red-500/12 blur-3xl" />
      <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#ffd84a]/88">CLARA MONEY TOOLS</p>
      <h1 className="mt-1 text-[17px] font-black tracking-[-0.025em] text-white">Ask Before You Spend</h1>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100/42">Pause · Check · Decide</p>
      <FloatingCloseButton onClose={onClose} />
    </header>
  );
}

function PauseEntryBoard({ acknowledgmentMessage }) {
  return (
    <section
      data-clara-pause-entry-board="true"
      data-clara-buy-check-board="true"
      data-clara-buy-check-opening-board="true"
      className="relative overflow-hidden rounded-[30px] border border-blue-200/20 bg-[#061226]/78 px-6 pb-7 pt-7 text-center shadow-[0_26px_80px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_0%,rgba(23,105,255,0.24),transparent_38%),radial-gradient(circle_at_94%_18%,rgba(229,57,69,0.13),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(255,216,74,0.05),transparent_32%),linear-gradient(145deg,rgba(3,12,27,0.82),rgba(2,6,23,0.95))]" />
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-blue-200/52">BUY CHECK</p>
      <div className="mx-auto mt-4 flex min-h-[92px] max-w-[318px] items-center justify-center rounded-[22px] border border-blue-200/12 bg-black/20 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <p className="text-[16px] font-extrabold leading-[1.48] text-white/94">{acknowledgmentMessage}</p>
      </div>
      <div data-clara-buy-check-active-question="true" aria-live="polite" className="mx-auto mt-5 max-w-[318px] text-center">
        <strong className="block text-[16px] font-black leading-[1.4] text-white/95">What do you want to buy?</strong>
        <span className="mt-1.5 block text-[12px] font-semibold leading-[1.55] text-slate-300/72">Type the exact item for us to start.</span>
        <span className="mt-1 block text-[11.5px] font-extrabold leading-[1.5] text-[#ffd84a]/82">Example: Running shoes</span>
      </div>
    </section>
  );
}

function FinalDecisionPanel({ finalDecision, walletOptions, item, onExplanationChange, onWalletChange, onSave, onCancel }) {
  if (!finalDecision || !["explain", "resolved"].includes(finalDecision.phase)) return null;

  if (finalDecision.phase === "resolved") {
    return (
      <section className="relative overflow-hidden rounded-[26px] border border-blue-200/20 bg-[#050d1f]/96 px-5 py-5 text-left shadow-[0_20px_52px_rgba(0,0,0,0.46)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)]" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd84a]/76">DECISION SAVED</p>
        <h3 className="mt-2 text-[19px] font-black text-white">{finalDecision.result?.title}</h3>
        <p className="mt-2 text-[13px] font-semibold leading-6 text-slate-100/88">{finalDecision.result?.message}</p>
      </section>
    );
  }

  const isBuy = finalDecision.choice === "buy";
  return (
    <section
      data-clara-buy-check-final-decision-panel={finalDecision.choice}
      className="relative overflow-hidden rounded-[26px] border border-blue-200/18 bg-[#050d1f]/96 px-4 py-5 text-left shadow-[0_22px_56px_rgba(0,0,0,0.48)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)]" />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/68">YOUR FINAL DECISION</p>
      <h3 className="mt-2 text-[19px] font-black text-white">{isBuy ? `You chose to continue with ${item}` : `You chose not to buy ${item}`}</h3>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-slate-200/82">CLARA already prepared the decision note. You may edit it, but no explanation is required.</p>
      <textarea
        rows={3}
        value={finalDecision.explanation || ""}
        onChange={(event) => onExplanationChange?.(event.target.value)}
        placeholder="Optional note"
        className="mt-4 w-full resize-none rounded-[18px] border border-blue-200/14 bg-[#08142b]/96 px-4 py-3 text-[13px] font-semibold leading-5 text-white shadow-inner outline-none placeholder:text-slate-400/72 focus:border-blue-300/42"
        disabled={finalDecision.busy}
      />
      {isBuy ? (
        <div className="mt-3">
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd84a]/66">PAY FROM</label>
          <select
            value={finalDecision.walletId || ""}
            onChange={(event) => onWalletChange?.(event.target.value)}
            disabled={finalDecision.busy}
            className="w-full rounded-[18px] border border-blue-200/14 bg-[#08142b]/96 px-4 py-3 text-[13px] font-bold text-white shadow-inner outline-none focus:border-blue-300/42"
          >
            <option value="">Choose a wallet</option>
            {(walletOptions || []).map((wallet) => (
              <option key={wallet.id || wallet.name} value={wallet.id} disabled={!wallet.enough}>
                {wallet.name} — {money(wallet.balance)}{wallet.enough ? "" : " (not enough)"}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {finalDecision.error ? <p className="mt-3 text-[11px] font-black leading-5 text-red-200/90" aria-live="polite">{finalDecision.error}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onSave}
          disabled={finalDecision.busy}
          className="min-h-11 rounded-full border border-blue-300/26 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 text-[12px] font-black text-white shadow-[0_12px_30px_rgba(23,105,255,0.25)] transition hover:brightness-110 disabled:opacity-50"
        >
          {finalDecision.busy ? "Saving..." : isBuy ? "Log expense" : "Save decision"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={finalDecision.busy}
          className="min-h-11 rounded-full border border-red-300/18 bg-red-500/[0.045] px-4 text-[12px] font-black text-white/90 transition hover:border-red-300/32 hover:bg-red-500/[0.09] disabled:opacity-50"
        >
          Back
        </button>
      </div>
    </section>
  );
}

function ActionBar({ step, busy, finalDecision, onConfirm, onEditReason, onCheckAnother, onClose }) {
  if (step === "confirm") {
    return (
      <div className="relative z-10 grid grid-cols-2 gap-2.5 px-1 pb-2 pt-1">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="min-h-11 rounded-full border border-blue-300/24 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 text-[12px] font-black text-white shadow-[0_12px_30px_rgba(23,105,255,0.24)] transition hover:brightness-110 disabled:opacity-55"
        >
          Yes
        </button>
        <button
          type="button"
          onClick={onEditReason}
          disabled={busy}
          className="min-h-11 rounded-full border border-red-300/18 bg-red-500/[0.045] px-4 text-[12px] font-black text-white/92 transition hover:border-red-300/34 hover:bg-red-500/[0.09] disabled:opacity-55"
        >
          No
        </button>
      </div>
    );
  }

  if (step === "complete" && finalDecision?.phase === "resolved") {
    return (
      <div className="relative z-10 grid grid-cols-2 gap-2.5 px-1 pb-2 pt-1">
        <button
          type="button"
          onClick={onCheckAnother}
          className="min-h-11 rounded-full border border-blue-300/24 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 text-[12px] font-black text-white shadow-[0_12px_30px_rgba(23,105,255,0.24)] transition hover:brightness-110"
        >
          Check another
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-full border border-white/12 bg-[#07152d]/86 px-4 text-[12px] font-black text-white/90 transition hover:border-red-300/28 hover:bg-red-500/[0.07]"
        >
          Done
        </button>
      </div>
    );
  }

  return null;
}

function placeholderFor(step) {
  if (step === "price") return "Enter the price, e.g. ₱3,500";
  if (step === "reason") return "Why do you want to buy it?";
  if (step === "clarification") return "Answer CLARA’s follow-up";
  if (step === "confirm") return "Choose Yes or No";
  if (step === "diagnosis") return "CLARA is checking your context";
  if (step === "complete") return "Choose your final action";
  return "Type the item you want to buy";
}

const BuyCheckMessageRow = memo(function BuyCheckMessageRow({ role, text, isGuidePreview }) {
  const isUser = role === "user";
  const userBubble = isGuidePreview
    ? "w-fit max-w-[78%] rounded-[22px] border border-blue-300/22 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 py-2.5 text-[13px] font-semibold leading-5 text-white shadow-[0_12px_28px_rgba(23,105,255,0.20)]"
    : "max-w-[86%] rounded-[24px] border border-blue-300/22 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 py-3 text-[13px] font-semibold leading-5 text-white shadow-[0_12px_28px_rgba(23,105,255,0.20)]";
  const claraBubble = isGuidePreview
    ? "w-fit max-w-[86%] rounded-[22px] border border-blue-200/14 border-l-2 border-l-[#ffd84a]/45 bg-[#07152d]/88 px-4 py-3 text-[13.5px] leading-[1.55] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl"
    : "w-[94%] max-w-[94%] rounded-[26px] border border-blue-200/14 border-l-2 border-l-[#ffd84a]/45 bg-[#07152d]/88 px-4 py-4 text-[13.5px] leading-6 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl";

  return (
    <div className={`flex min-w-0 w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`min-w-0 break-words [overflow-wrap:break-word] ${isUser ? userBubble : claraBubble}`}>
        <span className="whitespace-pre-wrap">{text}</span>
      </div>
    </div>
  );
});

const BuyCheckComposer = memo(function BuyCheckComposer({
  isActive,
  inputLocked,
  busy,
  step,
  submitAnswer,
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isActive) setDraft("");
  }, [isActive]);

  useEffect(() => {
    if (!isActive || inputLocked || busy) return undefined;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus?.({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [busy, inputLocked, isActive, step]);

  const submitDraft = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const answer = draft.trim();
    if (!answer || inputLocked || busy) return;
    submitAnswer?.(answer);
    setDraft("");
  };

  const composerLocked = inputLocked || busy;

  return (
    <form
      onSubmit={submitDraft}
      data-clara-buy-check-react-form="true"
      data-clara-buy-check-composer-locked={composerLocked ? "true" : "false"}
      className="relative z-10 shrink-0 overflow-hidden rounded-[28px] border border-blue-200/16 bg-[#040b1a]/96 p-2.5 shadow-[0_-18px_52px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)] opacity-80" />
      <div className="flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#08142b]/94 px-3 py-2 shadow-inner focus-within:border-blue-300/36">
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          readOnly={composerLocked}
          aria-disabled={composerLocked ? "true" : undefined}
          className={`min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium text-white outline-none placeholder:text-slate-400/72 ${composerLocked ? "opacity-55" : ""}`}
          placeholder={placeholderFor(step)}
          inputMode={step === "price" ? "decimal" : "text"}
          aria-label={placeholderFor(step)}
        />
        <button
          type="submit"
          disabled={!draft.trim() || composerLocked}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-300/24 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] text-white shadow-[0_10px_28px_rgba(23,105,255,0.28)] transition hover:brightness-110 disabled:opacity-40"
          aria-label="Send Ask Before You Spend answer"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
});

export default function ClaraAiEnvironmentOverlay({
  isActive = false,
  messages = [],
  claraAssistantContext = {},
  buyCheckState = null,
  onSubmitBuyCheckAnswer,
  onConfirmBuyCheck,
  onEditBuyCheck,
  onCheckAnother,
  onClose,
  layoutVariant = "default",
}) {
  const messagesEndRef = useRef(null);
  const previousAcknowledgmentIndexRef = useRef(-1);
  const acknowledgmentSessionRef = useRef({ active: false, sessionId: "", index: -1, message: "" });
  const previousActiveRef = useRef(false);
  const isGuidePreview = layoutVariant === "guide-preview";
  const ownedFlow = useClaraBuyCheckFlow({ assistantContext: claraAssistantContext });

  useEffect(() => {
    if (isGuidePreview) return;
    if (isActive && !previousActiveRef.current) {
      ownedFlow.startSession(`pause-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    }
    if (!isActive && previousActiveRef.current) ownedFlow.clearSession();
    previousActiveRef.current = isActive;
  }, [isActive, isGuidePreview, ownedFlow.clearSession, ownedFlow.startSession]);

  const activeState = isGuidePreview ? buyCheckState : ownedFlow.state;
  const activeMessages = isGuidePreview ? messages : ownedFlow.messages;
  const submitAnswer = isGuidePreview ? onSubmitBuyCheckAnswer : ownedFlow.submitAnswer;
  const confirmBuyCheck = isGuidePreview ? onConfirmBuyCheck : ownedFlow.confirm;
  const editReason = isGuidePreview ? onEditBuyCheck : ownedFlow.editReason;
  const editAmount = isGuidePreview ? onEditBuyCheck : ownedFlow.editAmount;
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

  const visibleMessages = useMemo(
    () => (Array.isArray(activeMessages) ? activeMessages : []).filter(Boolean),
    [activeMessages],
  );

  useEffect(() => {
    if (!isActive) return undefined;
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      onClose?.();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isActive, onClose]);

  // Align once when a new turn/card is added. Do not start a fresh smooth-scroll
  // animation for every streamed text chunk; that was fighting the Android
  // keyboard viewport guard and causing visible chat jank.
  useEffect(() => {
    if (!isActive || !visibleMessages.length) return undefined;
    const frame = window.requestAnimationFrame(() =>
      messagesEndRef.current?.scrollIntoView?.({ behavior: "auto", block: "end" })
    );
    return () => window.cancelAnimationFrame(frame);
  }, [finalDecision?.phase, isActive, step, visibleMessages.length]);

  if (!isActive) return null;

  const showDecisionCard = step === "complete" && finalDecision?.phase === "choose";
  const showFinalDecisionPanel = Boolean(finalDecision && ["explain", "resolved"].includes(finalDecision.phase));

  const runDecisionAction = (action) => {
    if (isGuidePreview) {
      if (action === "edit_amount") editAmount?.();
      return;
    }
    if (action === "buy") ownedFlow.chooseFinalDecision?.("buy");
    else if (action === "not_buy") ownedFlow.chooseFinalDecision?.("not_buy");
    else if (action === "edit_amount") editAmount?.();
  };

  return (
    <div
      className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/96 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-ai-brain-version={CLARA_AI_BRAIN_VERSION}
      data-clara-ai-layout-variant={layoutVariant}
      data-clara-pause-overlay="true"
      data-clara-buy-check-react-owner="true"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.30),transparent_34%),radial-gradient(circle_at_52%_-8%,rgba(255,216,74,0.07),transparent_24%),radial-gradient(circle_at_96%_8%,rgba(229,57,69,0.18),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[54%] bg-[linear-gradient(180deg,rgba(2,7,20,0)_0%,rgba(2,7,20,0.72)_22%,rgba(2,7,20,0.96)_100%)]" />

      <BuyCheckHeader onClose={onClose} />

      <main
        data-clara-ai-message-viewport="true"
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-0 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {visibleMessages.length ? (
          <div data-clara-ai-message-stack="true" className="flex min-h-full min-w-0 flex-col justify-start gap-3 px-2 pb-28 pt-1">
            {visibleMessages.map((message, index) => (
              <BuyCheckMessageRow
                key={message.id || `${message.role || "message"}-${index}`}
                role={message.role}
                text={clean(message.text || message.content || "")}
                isGuidePreview={isGuidePreview}
              />
            ))}

            {showDecisionCard ? <BuyCheckDecisionCard diagnosis={activeState?.diagnosis} onAction={runDecisionAction} /> : null}

            {showFinalDecisionPanel ? (
              <div className="mt-3 border-t border-blue-200/10 pt-3">
                <FinalDecisionPanel
                  finalDecision={finalDecision}
                  walletOptions={walletOptions}
                  item={activeState?.item || "this purchase"}
                  onExplanationChange={ownedFlow.setDecisionExplanation}
                  onWalletChange={ownedFlow.setDecisionWallet}
                  onSave={ownedFlow.submitFinalDecision}
                  onCancel={ownedFlow.cancelFinalDecision}
                />
              </div>
            ) : null}

            <div ref={messagesEndRef} className="h-1 shrink-0" />
          </div>
        ) : (
          <div className="flex min-h-full flex-col justify-center px-1 pb-24 pt-3">
            <PauseEntryBoard acknowledgmentMessage={acknowledgmentSessionRef.current.message || BUY_CHECK_ACKNOWLEDGMENTS[0]} />
          </div>
        )}
      </main>

      <ActionBar
        step={step}
        busy={busy}
        finalDecision={finalDecision}
        onConfirm={confirmBuyCheck}
        onEditReason={editReason}
        onCheckAnother={checkAnother}
        onClose={onClose}
      />

      <BuyCheckComposer
        isActive={isActive}
        inputLocked={inputLocked}
        busy={busy}
        step={step}
        submitAnswer={submitAnswer}
      />
    </div>
  );
}
