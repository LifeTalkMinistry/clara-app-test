import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import useClaraBuyCheckFlow from "@/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlow";
import useClaraConversationReveal from "./useClaraConversationReveal";
import {
  getClaraReadDelay,
  getClaraReplyDelay,
  getClaraTypingPlan,
} from "@/lib/clara-conversation-pacing";

const CLARA_AI_BRAIN_VERSION = "progressive-buy-check-v10-installment-obligation-day-grid";

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

function CanonicalTypewriter({ text, onComplete, className = "", delayBeforeTyping = true }) {
  const source = String(text || "");
  const [visible, setVisible] = useState("");
  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const plan = getClaraTypingPlan(source);
    let intervalId = 0;
    let timeoutId = 0;
    let cancelled = false;
    let index = 0;

    setVisible("");

    const start = () => {
      if (cancelled) return;
      if (!plan.source) {
        completeRef.current?.();
        return;
      }
      intervalId = window.setInterval(() => {
        if (cancelled) return;
        index = Math.min(plan.source.length, index + plan.charsPerTick);
        setVisible(plan.source.slice(0, index));
        if (index >= plan.source.length) {
          window.clearInterval(intervalId);
          intervalId = 0;
          completeRef.current?.();
        }
      }, plan.tickMs);
    };

    if (delayBeforeTyping) timeoutId = window.setTimeout(start, getClaraReplyDelay());
    else start();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [delayBeforeTyping, source]);

  return (
    <span className={className}>
      {visible}
      <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse rounded-full bg-cyan-100/75" />
    </span>
  );
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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_56%,#e53945_100%)]" />
      <div className="pointer-events-none absolute -left-10 -top-12 h-28 w-28 rounded-full bg-blue-500/18 blur-3xl" />
      <div className="pointer-events-none absolute -right-8 -top-12 h-28 w-28 rounded-full bg-red-500/12 blur-3xl" />
      <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#ffd84a]/88">CLARA MONEY TOOLS</p>
      <h1 className="mt-1 text-[17px] font-black tracking-[-0.025em] text-white">Ask Before You Spend</h1>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100/42">Pause · Check · Decide</p>
      <FloatingCloseButton onClose={onClose} />
    </header>
  );
}

function PauseEntryBoard({ acknowledgmentMessage, pacingEnabled = true, onReadyChange }) {
  const [ready, setReady] = useState(!pacingEnabled);
  const readTimerRef = useRef(null);

  useEffect(() => {
    if (!pacingEnabled) {
      setReady(true);
      onReadyChange?.(true);
      return undefined;
    }
    setReady(false);
    onReadyChange?.(false);
    return () => {
      if (readTimerRef.current) window.clearTimeout(readTimerRef.current);
      readTimerRef.current = null;
    };
  }, [acknowledgmentMessage, pacingEnabled]);

  const finishAcknowledgment = () => {
    if (!pacingEnabled) return;
    if (readTimerRef.current) window.clearTimeout(readTimerRef.current);
    readTimerRef.current = window.setTimeout(() => {
      setReady(true);
      onReadyChange?.(true);
      readTimerRef.current = null;
    }, getClaraReadDelay());
  };

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
        <p className="text-[16px] font-extrabold leading-[1.48] text-white/94">
          {pacingEnabled ? (
            <CanonicalTypewriter text={acknowledgmentMessage} onComplete={finishAcknowledgment} />
          ) : acknowledgmentMessage}
        </p>
      </div>
      <div
        data-clara-buy-check-active-question="true"
        aria-live="polite"
        className={`mx-auto mt-5 max-w-[318px] text-center transition-opacity duration-300 ${ready ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <strong className="block text-[16px] font-black leading-[1.4] text-white/95">What do you want to buy?</strong>
        <span className="mt-1.5 block text-[12px] font-semibold leading-[1.55] text-slate-300/72">Type the exact item for us to start.</span>
        <span className="mt-1 block text-[11.5px] font-extrabold leading-[1.5] text-[#ffd84a]/82">Example: Running shoes</span>
      </div>
    </section>
  );
}

function FinalDecisionPanel({
  finalDecision,
  walletOptions,
  item,
  onExplanationChange,
  onWalletChange,
  onInstallmentDueDayChange,
  onSave,
  onCancel,
}) {
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const [dueDayPickerOpen, setDueDayPickerOpen] = useState(false);

  if (!finalDecision || !["explain", "resolved"].includes(finalDecision.phase)) return null;

  if (finalDecision.phase === "resolved") {
    return (
      <section className="relative overflow-hidden rounded-[26px] border border-blue-200/20 bg-[#050d1f]/96 px-5 py-5 text-left shadow-[0_20px_52px_rgba(0,0,0,0.46)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)]" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd84a]/76">{finalDecision.result?.eyebrow || "DECISION SAVED"}</p>
        <h3 className="mt-2 text-[19px] font-black text-white">{finalDecision.result?.title}</h3>
        <p className="mt-2 text-[13px] font-semibold leading-6 text-slate-100/88">{finalDecision.result?.message}</p>
        <p className="mt-4 text-[14px] font-black text-white/94">Anything else you want to check?</p>
      </section>
    );
  }

  const isBuy = finalDecision.choice === "buy";
  const installmentStructure = finalDecision.paymentStructure || null;
  const isInstallment = Boolean(
    isBuy &&
    finalDecision.recordMode === "installment_obligation" &&
    installmentStructure?.purchaseType === "installment",
  );
  const installmentDueDay = String(finalDecision.installmentDueDay || "");
  const dueDayNumber = Number(installmentDueDay);
  const validInstallmentDueDay = Boolean(
    Number.isInteger(dueDayNumber) && dueDayNumber >= 1 && dueDayNumber <= 31,
  );
  const safeWalletOptions = Array.isArray(walletOptions) ? walletOptions : [];
  const selectedWallet = safeWalletOptions.find((wallet) => wallet.id === finalDecision.walletId) || null;
  const hasWallets = safeWalletOptions.length > 0;
  const saveDisabled = Boolean(
    finalDecision.busy ||
    (isInstallment && !validInstallmentDueDay) ||
    (isBuy && !isInstallment && !selectedWallet),
  );

  return (
    <section
      data-clara-buy-check-final-decision-panel={finalDecision.choice}
      data-clara-buy-check-installment-documentation={isInstallment ? "true" : "false"}
      className="relative overflow-hidden rounded-[26px] border border-blue-200/18 bg-[#050d1f]/96 px-4 py-5 text-left shadow-[0_22px_56px_rgba(0,0,0,0.48)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)]" />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/68">YOUR DECISION</p>
      <h3 className="mt-2 text-[19px] font-black text-white">{isBuy ? `You chose to buy ${item}` : `You chose not to buy ${item}`}</h3>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-slate-200/82">
        {isInstallment
          ? "This is an installment. CLARA will document it under Debt / Obligations instead of logging it as a one-time expense. Review the structure and add the monthly due day before saving."
          : isBuy
            ? "CLARA prepared this reason from your conversation. Use it as-is or edit it before saving to Transaction Hub."
            : "CLARA prepared this reason from your conversation. You can keep it or edit it before saving the decision."}
      </p>
      <textarea
        rows={3}
        value={finalDecision.explanation || ""}
        onChange={(event) => onExplanationChange?.(event.target.value)}
        placeholder={isInstallment ? "Reason for this installment" : isBuy ? "Reason for this transaction" : "Reason for this decision"}
        className="mt-4 w-full resize-none rounded-[18px] border border-blue-200/14 bg-[#08142b]/96 px-4 py-3 text-[13px] font-semibold leading-5 text-white shadow-inner outline-none placeholder:text-slate-400/72 focus:border-blue-300/42"
        disabled={finalDecision.busy}
      />

      {isInstallment ? (
        <div className="mt-3" data-clara-installment-obligation-panel="true">
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd84a]/72">INSTALLMENT TO DOCUMENT</label>
          <article className="rounded-[18px] border border-blue-200/14 bg-[#08142b]/96 px-4 py-3 shadow-inner">
            <div className="grid gap-2 text-[11.5px] font-semibold leading-5 text-white/84">
              <div className="flex items-center justify-between gap-3"><span className="text-white/42">Total commitment</span><strong className="text-white">{money(installmentStructure.totalCommitment)}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-white/42">Due now</span><strong className="text-white">{money(installmentStructure.amountDueNow)}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-white/42">Regular payment</span><strong className="text-white">{money(installmentStructure.paymentAmount)}/month</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-white/42">Schedule</span><strong className="text-white">{Number(installmentStructure.totalPayments) || 0} payments total</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-white/42">After the first</span><strong className="text-white">{Number(installmentStructure.remainingPayments) || 0} payments</strong></div>
              {Number(installmentStructure.fees) > 0 ? (
                <div className="flex items-center justify-between gap-3"><span className="text-white/42">Fees included</span><strong className="text-white">{money(installmentStructure.fees)}</strong></div>
              ) : null}
            </div>
          </article>

          <p className="mb-1.5 mt-3 block text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd84a]/66">DUE EACH MONTH</p>
          <button
            type="button"
            data-clara-installment-due-day-trigger="true"
            onClick={() => setDueDayPickerOpen((open) => !open)}
            disabled={finalDecision.busy}
            aria-expanded={dueDayPickerOpen}
            className="relative z-20 flex min-h-12 w-full touch-manipulation items-center justify-between gap-3 rounded-[18px] border border-blue-200/14 bg-[#08142b]/96 px-4 py-3 text-left shadow-inner outline-none transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span className="text-[13px] font-black text-white">
              {validInstallmentDueDay ? `Day ${installmentDueDay}` : "Choose day"}
            </span>
            <span className="shrink-0 text-[10.5px] font-semibold text-slate-300/58">
              day of month {dueDayPickerOpen ? "⌃" : "⌄"}
            </span>
          </button>

          {dueDayPickerOpen ? (
            <div
              data-clara-installment-due-day-grid="true"
              role="listbox"
              aria-label="Choose installment due day"
              className="relative z-30 mt-2 grid grid-cols-7 gap-1.5 rounded-[18px] border border-blue-200/12 bg-[#050d1f]/98 p-2.5 shadow-[0_16px_36px_rgba(0,0,0,0.34)]"
            >
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
                const selected = installmentDueDay === String(day);
                return (
                  <button
                    key={day}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-clara-installment-due-day-option={String(day)}
                    disabled={finalDecision.busy}
                    onClick={() => {
                      onInstallmentDueDayChange?.(String(day));
                      setDueDayPickerOpen(false);
                    }}
                    className={`grid aspect-square min-h-9 touch-manipulation place-items-center rounded-[11px] border text-[11.5px] font-black transition active:scale-95 disabled:opacity-50 ${selected ? "border-blue-300/42 bg-blue-500/18 text-white" : "border-white/8 bg-white/[0.035] text-white/84"}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          ) : null}

          <p className="mt-2 text-[11px] font-semibold leading-5 text-blue-100/65">
            CLARA will save this under Debt / Obligations. No wallet money is deducted just for documenting it. Record the actual payment from the obligation when you pay.
          </p>
        </div>
      ) : isBuy ? (
        <div className="mt-3">
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd84a]/66">PAY FROM</label>
          <button
            type="button"
            data-clara-wallet-picker-trigger="true"
            onClick={() => setWalletPickerOpen((open) => !open)}
            disabled={finalDecision.busy || !hasWallets}
            aria-expanded={walletPickerOpen}
            className="flex min-h-12 w-full touch-manipulation items-center justify-between gap-3 rounded-[18px] border border-blue-200/14 bg-[#08142b]/96 px-4 py-3 text-left text-[13px] font-bold text-white shadow-inner outline-none transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span className="min-w-0 truncate">
              {selectedWallet ? `${selectedWallet.name} — ${money(selectedWallet.balance)}` : hasWallets ? "Choose a wallet" : "No spendable wallets available"}
            </span>
            <span className={`shrink-0 text-[13px] text-blue-100/72 transition-transform ${walletPickerOpen ? "rotate-180" : ""}`} aria-hidden="true">⌄</span>
          </button>

          {walletPickerOpen && hasWallets ? (
            <div
              data-clara-wallet-picker-options="true"
              role="listbox"
              aria-label="Choose a wallet"
              className="mt-2 grid gap-2 rounded-[18px] border border-blue-200/12 bg-[#050d1f]/98 p-2 shadow-[0_16px_36px_rgba(0,0,0,0.34)]"
            >
              {safeWalletOptions.map((wallet) => {
                const selected = wallet.id === finalDecision.walletId;
                return (
                  <button
                    key={wallet.id || wallet.name}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={finalDecision.busy || !wallet.enough}
                    onClick={() => {
                      if (!wallet.enough) return;
                      onWalletChange?.(wallet.id);
                      setWalletPickerOpen(false);
                    }}
                    className={`flex min-h-12 w-full touch-manipulation items-center justify-between gap-3 rounded-[15px] border px-3.5 py-3 text-left transition active:scale-[0.99] disabled:opacity-45 ${selected ? "border-blue-300/42 bg-blue-500/14" : "border-white/8 bg-white/[0.035]"}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-black text-white">{wallet.name}</span>
                      <span className="mt-0.5 block text-[10.5px] font-semibold text-slate-300/68">
                        {wallet.enough ? "Available to spend" : "Not enough for this purchase"}
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] font-black text-white/86">{money(wallet.balance)}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {!hasWallets ? (
            <p className="mt-2 text-[11px] font-semibold leading-5 text-amber-100/72">
              Add or fund a spendable wallet before logging this expense.
            </p>
          ) : null}
        </div>
      ) : null}
      {finalDecision.error ? <p className="mt-3 text-[11px] font-black leading-5 text-red-200/90" aria-live="polite">{finalDecision.error}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className="min-h-11 rounded-full border border-blue-300/26 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 text-[12px] font-black text-white shadow-[0_12px_30px_rgba(23,105,255,0.25)] transition hover:brightness-110 disabled:opacity-50"
        >
          {finalDecision.busy ? "Saving..." : isInstallment ? "Document installment" : isBuy ? "Log expense" : "Save decision"}
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

function ActionBar({ step, busy, finalDecision, onConfirm, onDecline, onAskMore, onCheckAnother, onClose }) {
  if (finalDecision && ["explain", "resolved"].includes(finalDecision.phase)) {
    if (step === "complete" && finalDecision.phase === "resolved") {
      return (
        <div className="relative z-10 grid grid-cols-2 gap-2.5 px-1 pb-2 pt-1">
          <button
            type="button"
            onClick={onCheckAnother}
            className="min-h-11 rounded-full border border-blue-300/24 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 text-[12px] font-black text-white shadow-[0_12px_30px_rgba(23,105,255,0.24)] transition hover:brightness-110"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full border border-white/12 bg-[#07152d]/86 px-4 text-[12px] font-black text-white/90 transition hover:border-red-300/28 hover:bg-red-500/[0.07]"
          >
            No, I’m done
          </button>
        </div>
      );
    }
    return null;
  }

  if (step === "confirm") {
    return (
      <div className="relative z-10 grid grid-cols-3 gap-2 px-1 pb-2 pt-1">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="min-h-11 rounded-full border border-blue-300/24 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-3 text-[11.5px] font-black text-white shadow-[0_12px_30px_rgba(23,105,255,0.24)] transition hover:brightness-110 disabled:opacity-55"
        >
          Yes
        </button>
        <button
          type="button"
          onClick={onDecline}
          disabled={busy}
          className="min-h-11 rounded-full border border-red-300/18 bg-red-500/[0.045] px-3 text-[11.5px] font-black text-white/92 transition hover:border-red-300/34 hover:bg-red-500/[0.09] disabled:opacity-55"
        >
          No
        </button>
        <button
          type="button"
          onClick={onAskMore}
          disabled={busy}
          className="min-h-11 rounded-full border border-[#ffd84a]/20 bg-[#ffd84a]/[0.045] px-3 text-[11px] font-black text-[#ffe783] transition hover:border-[#ffd84a]/38 hover:bg-[#ffd84a]/[0.08] disabled:opacity-55"
        >
          Ask more
        </button>
      </div>
    );
  }

  return null;
}

function placeholderFor(step) {
  if (step === "confirm") return "Choose Yes, No, or Ask more";
  if (step === "complete") return "Decision saved";
  return "Talk to CLARA naturally about the purchase";
}

const BuyCheckMessageRow = memo(function BuyCheckMessageRow({ role, text, animate = false, onTypingComplete }) {
  const isUser = role === "user";
  const isThinking = !isUser && !clean(text);
  const userBubble = "max-w-[86%] rounded-[24px] border border-blue-300/22 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] px-4 py-3 text-[13px] font-semibold leading-5 text-white shadow-[0_12px_28px_rgba(23,105,255,0.20)]";
  const claraBubble = "w-[94%] max-w-[94%] rounded-[26px] border border-blue-200/14 border-l-2 border-l-[#ffd84a]/45 bg-[#07152d]/88 px-4 py-4 text-[13.5px] leading-6 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl";

  if (isThinking) {
    return (
      <div className="flex min-w-0 w-full justify-start" data-clara-buy-check-thinking-row="true">
        <div className="clara-buy-check-thinking-bubble" role="status" aria-label="CLARA is thinking" aria-live="polite">
          <span className="clara-buy-check-thinking-dot" aria-hidden="true" />
          <span className="clara-buy-check-thinking-dot" aria-hidden="true" />
          <span className="clara-buy-check-thinking-dot" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`min-w-0 break-words [overflow-wrap:break-word] ${isUser ? userBubble : claraBubble}`}>
        <span className="whitespace-pre-wrap">
          {!isUser && animate ? (
            <CanonicalTypewriter text={text} onComplete={onTypingComplete} />
          ) : text}
        </span>
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
  presetDraft = "",
  presetLocked = false,
}) {
  const [draft, setDraft] = useState(() => String(presetDraft || ""));
  const inputRef = useRef(null);
  const hasDraft = Boolean(draft.trim());

  useEffect(() => {
    if (!isActive) {
      setDraft("");
      return;
    }
    setDraft(String(presetDraft || ""));
  }, [isActive, presetDraft]);

  useEffect(() => {
    if (!isActive || inputLocked || presetLocked) return undefined;
    const frame = window.requestAnimationFrame(() => {
      if (document.activeElement !== inputRef.current) inputRef.current?.focus?.({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [busy, inputLocked, isActive, presetLocked, step]);

  const submitDraft = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const answer = draft.trim();
    if (!answer || inputLocked || busy) return;
    submitAnswer?.(answer);
    setDraft("");
  };

  const composerLocked = inputLocked || busy;
  const editingLocked = composerLocked || presetLocked;
  const blockLockedInput = (event) => {
    if (editingLocked) event.preventDefault();
  };

  return (
    <form
      onSubmit={submitDraft}
      data-clara-buy-check-react-form="true"
      data-clara-buy-check-composer-locked={composerLocked ? "true" : "false"}
      data-clara-buy-check-composer-preset={presetDraft ? "true" : "false"}
      className="relative z-30 shrink-0 overflow-hidden rounded-[28px] border border-blue-200/16 bg-[#040b1a]/96 p-2.5 shadow-[0_-18px_52px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)] opacity-80" />
      <div className="flex items-center gap-2 rounded-[22px] border border-blue-200/14 bg-[#08142b]/94 px-3 py-2 shadow-inner focus-within:border-blue-300/36">
        <input
          ref={inputRef}
          value={draft}
          readOnly={presetLocked}
          onBeforeInput={blockLockedInput}
          onPaste={blockLockedInput}
          onDrop={blockLockedInput}
          onChange={(event) => {
            if (!editingLocked) setDraft(event.target.value);
          }}
          aria-disabled={composerLocked ? "true" : undefined}
          aria-readonly={presetLocked ? "true" : undefined}
          className={`min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium text-white outline-none placeholder:text-slate-400/72 ${composerLocked ? "opacity-55" : ""}`}
          placeholder={placeholderFor(step)}
          inputMode="text"
          aria-label={placeholderFor(step)}
        />
        <button
          type="submit"
          onMouseDown={(event) => event.preventDefault()}
          disabled={composerLocked || !hasDraft}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-300/24 bg-[linear-gradient(135deg,#1769ff,#0d4fc6)] text-white shadow-[0_10px_28px_rgba(23,105,255,0.28)] transition hover:brightness-110 active:scale-95 disabled:opacity-40"
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
  onDeclineBuyCheck,
  onAskMoreBuyCheck,
  onEditBuyCheck,
  onCheckAnother,
  onClose,
  layoutVariant = "default",
  composerPresetDraft = "",
  composerPresetLocked = false,
}) {
  const previousAcknowledgmentIndexRef = useRef(-1);
  const acknowledgmentSessionRef = useRef({ active: false, sessionId: "", index: -1, message: "" });
  const previousActiveRef = useRef(false);
  const viewportRef = useRef(null);
  const resultFocusRef = useRef(null);
  const readTimerRef = useRef(null);
  const [entryReady, setEntryReady] = useState(false);
  const [completedAssistantIds, setCompletedAssistantIds] = useState(() => new Set());
  const [readReady, setReadReady] = useState(true);
  const isGuidePreview = layoutVariant === "guide-preview";
  const pacingEnabled = !isGuidePreview;
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
  const declineBuyCheck = isGuidePreview ? (onDeclineBuyCheck || onEditBuyCheck) : ownedFlow.decline;
  const askMoreBuyCheck = isGuidePreview
    ? (onAskMoreBuyCheck || (() => onSubmitBuyCheckAnswer?.("I want to ask more before deciding.")))
    : ownedFlow.askMore;
  const checkAnother = isGuidePreview ? onCheckAnother : ownedFlow.checkAnother;
  const finalDecision = activeState?.finalDecision;
  const walletOptions = activeState?.walletOptions || [];
  const sessionId = activeState?.sessionId || "preview-session";
  const step = activeState?.step || "conversation";
  const busy = Boolean(activeState?.busy || finalDecision?.busy);
  const finalDecisionLocksConversation = Boolean(finalDecision && ["explain", "resolved"].includes(finalDecision.phase));
  const resultMode = step === "complete";

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

  const lastVisibleMessage = visibleMessages[visibleMessages.length - 1] || null;
  const lastVisibleText = clean(lastVisibleMessage?.text || lastVisibleMessage?.content || "");
  const pacingMessageId = pacingEnabled && lastVisibleMessage?.role !== "user" && lastVisibleText && !completedAssistantIds.has(lastVisibleMessage?.id)
    ? lastVisibleMessage?.id
    : "";
  const pacingLocked = pacingEnabled && (Boolean(pacingMessageId) || !readReady);
  const inputLocked = Boolean(activeState && (step === "confirm" || finalDecisionLocksConversation || pacingLocked));
  const baseShowComposer = step !== "confirm" && !finalDecisionLocksConversation;
  const openingReady = !pacingEnabled || entryReady;
  const showComposer = baseShowComposer && (visibleMessages.length > 0 || openingReady);

  useEffect(() => {
    if (!pacingEnabled) return undefined;
    if (readTimerRef.current) window.clearTimeout(readTimerRef.current);
    readTimerRef.current = null;
    setCompletedAssistantIds(new Set());
    setReadReady(true);
    setEntryReady(false);
    return undefined;
  }, [isActive, pacingEnabled, sessionId]);

  useEffect(() => {
    if (!isActive) return undefined;
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      onClose?.();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isActive, onClose]);

  useEffect(() => {
    if (!isActive || !resultMode || !finalDecisionLocksConversation || pacingLocked) return undefined;
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) activeElement.blur();
    return undefined;
  }, [finalDecision?.phase, finalDecisionLocksConversation, isActive, pacingLocked, resultMode]);

  const resultRevealKey = isActive && resultMode && finalDecisionLocksConversation && !pacingLocked
    ? `buy-check-result:${sessionId}:${finalDecision?.phase || "result"}`
    : null;

  useClaraConversationReveal({
    viewportRef,
    assistantRef: resultFocusRef,
    actionRef: resultFocusRef,
    revealKey: resultRevealKey,
    enabled: isActive,
    requireAction: true,
    behavior: "auto",
  });

  useEffect(
    () => () => {
      if (readTimerRef.current) window.clearTimeout(readTimerRef.current);
      readTimerRef.current = null;
    },
    []
  );

  if (!isActive) return null;

  const handleAssistantTypingComplete = (messageId) => {
    setCompletedAssistantIds((current) => {
      const next = new Set(current);
      next.add(messageId);
      return next;
    });
    setReadReady(false);
    if (readTimerRef.current) window.clearTimeout(readTimerRef.current);
    readTimerRef.current = window.setTimeout(() => {
      setReadReady(true);
      readTimerRef.current = null;
    }, getClaraReadDelay());
  };

  const showFinalDecisionPanel = Boolean(
    finalDecision && ["explain", "resolved"].includes(finalDecision.phase) && !pacingLocked
  );
  const actionBarVisible = !pacingLocked && (visibleMessages.length > 0 || openingReady);

  return (
    <div
      className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-[#020714]/96 px-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),10px)] text-white"
      data-clara-ai-brain-version={CLARA_AI_BRAIN_VERSION}
      data-clara-ai-layout-variant={layoutVariant}
      data-clara-pause-overlay="true"
      data-clara-buy-check-react-owner="true"
      data-clara-buy-check-result-mode={resultMode ? "true" : "false"}
      data-clara-conversation-pacing={pacingEnabled ? "masterclass" : "preview"}
      data-clara-conversation-reveal-owner="semantic"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_4%,rgba(23,105,255,0.30),transparent_34%),radial-gradient(circle_at_52%_-8%,rgba(255,216,74,0.07),transparent_24%),radial-gradient(circle_at_96%_8%,rgba(229,57,69,0.18),transparent_34%),linear-gradient(180deg,#06152e_0%,#040b1a_44%,#020714_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[54%] bg-[linear-gradient(180deg,rgba(2,7,20,0)_0%,rgba(2,7,20,0.72)_22%,rgba(2,7,20,0.96)_100%)]" />

      <BuyCheckHeader onClose={onClose} />

      <main
        ref={viewportRef}
        data-clara-ai-message-viewport="true"
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-0 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {visibleMessages.length ? (
          <div
            data-clara-ai-message-stack="true"
            className={`flex min-h-full min-w-0 flex-col justify-start gap-3 px-2 pt-1 ${showComposer ? "pb-28" : "pb-5"}`}
          >
            {visibleMessages.map((message, index) => {
              const text = clean(message.text || message.content || "");
              const animate = Boolean(pacingMessageId && message.id === pacingMessageId);
              return (
                <BuyCheckMessageRow
                  key={message.id || `${message.role || "message"}-${index}`}
                  role={message.role}
                  text={text}
                  animate={animate}
                  onTypingComplete={() => handleAssistantTypingComplete(message.id)}
                />
              );
            })}

            {showFinalDecisionPanel ? (
              <div ref={resultFocusRef} data-clara-buy-check-result-focus="true" className="mt-3 border-t border-blue-200/10 pt-3">
                <FinalDecisionPanel
                  finalDecision={finalDecision}
                  walletOptions={walletOptions}
                  item={activeState?.item || "this purchase"}
                  onExplanationChange={ownedFlow.setDecisionExplanation}
                  onWalletChange={ownedFlow.setDecisionWallet}
                  onInstallmentDueDayChange={ownedFlow.setDecisionInstallmentDueDay}
                  onSave={ownedFlow.submitFinalDecision}
                  onCancel={ownedFlow.cancelFinalDecision}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-full flex-col justify-center px-1 pb-24 pt-3">
            <PauseEntryBoard
              acknowledgmentMessage={acknowledgmentSessionRef.current.message || BUY_CHECK_ACKNOWLEDGMENTS[0]}
              pacingEnabled={pacingEnabled}
              onReadyChange={setEntryReady}
            />
          </div>
        )}
      </main>

      {actionBarVisible ? (
        <ActionBar
          step={step}
          busy={busy || pacingLocked}
          finalDecision={finalDecision}
          onConfirm={confirmBuyCheck}
          onDecline={declineBuyCheck}
          onAskMore={askMoreBuyCheck}
          onCheckAnother={checkAnother}
          onClose={onClose}
        />
      ) : null}

      {showComposer ? (
        <BuyCheckComposer
          isActive={isActive}
          inputLocked={inputLocked}
          busy={busy || pacingLocked}
          step={step}
          submitAnswer={submitAnswer}
          presetDraft={composerPresetDraft}
          presetLocked={composerPresetLocked}
        />
      ) : null}
    </div>
  );
}
