import { useCallback, useEffect, useRef } from "react";
import ClaraGuideManualExpensePreview from "@/components/fresh/main-dashboard/guide/ClaraGuideManualExpensePreview";

const TRANSACTION_HUB_ROWS = [
  { type: "Expense", label: "Food", amount: "−₱120" },
  { type: "Income", label: "Salary", amount: "+₱25,000" },
  { type: "Transfer", label: "Main Wallet → Savings", amount: "₱2,000" },
];

export default function ClaraGuideOrbPreview({ preview, onNext }) {
  const headingRef = useRef(null);

  useEffect(() => {
    if (preview === "log-expense" || typeof window === "undefined") return undefined;

    const frameId = window.requestAnimationFrame(() => {
      headingRef.current?.focus?.({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [preview]);

  const stopEvent = useCallback((event) => {
    event?.stopPropagation?.();
  }, []);

  const handleNext = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      onNext?.();
    },
    [onNext]
  );

  if (preview === "log-expense") {
    return <ClaraGuideManualExpensePreview onNext={onNext} />;
  }

  const isTransactionHubPreview = preview === "transaction-hub";
  const isClaraChatPreview = preview === "clara-chat";

  if (!isTransactionHubPreview && !isClaraChatPreview) return null;

  const title = isTransactionHubPreview ? "Transaction Hub" : "Chat with CLARA";
  const body = isTransactionHubPreview
    ? "Two quick taps take you to the place where all recorded money activity can be reviewed."
    : null;
  const safetyMessage = isTransactionHubPreview
    ? "SIMULATION ONLY — YOUR RECORDS WERE NOT OPENED OR CHANGED."
    : "SIMULATION ONLY — NO MESSAGE WILL BE SENT.";

  return (
    <div className="pointer-events-none fixed inset-0 z-[245] flex items-end justify-center px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-24">
      <section
        role="dialog"
        aria-modal="true"
        data-clara-guide-orb-preview="true"
        aria-labelledby="clara-guide-orb-preview-title"
        aria-describedby="clara-guide-orb-preview-body"
        className="pointer-events-auto w-full max-w-[390px] rounded-[30px] border border-cyan-100/20 bg-[linear-gradient(145deg,rgba(5,18,36,0.985),rgba(10,22,54,0.985)_52%,rgba(27,18,65,0.985))] px-6 py-5 text-white shadow-[0_24px_78px_rgba(0,0,0,0.76),0_0_42px_rgba(34,211,238,0.16)] backdrop-blur-2xl"
        onPointerDown={stopEvent}
        onPointerUp={stopEvent}
        onPointerCancel={stopEvent}
        onClick={stopEvent}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">
          ORB ACTION
        </p>
        <h2
          ref={headingRef}
          tabIndex={-1}
          id="clara-guide-orb-preview-title"
          className="mt-2 text-[26px] font-black tracking-[-0.04em] text-white focus:outline-none"
        >
          {title}
        </h2>

        {body ? (
          <p
            id="clara-guide-orb-preview-body"
            className="mt-3 text-[14px] font-semibold leading-relaxed text-cyan-50/78"
          >
            {body}
          </p>
        ) : (
          <div
            id="clara-guide-orb-preview-body"
            className="mt-4 rounded-2xl border border-cyan-100/12 bg-white/[0.05] px-4 py-4"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/60">
              CLARA
            </p>
            <p className="mt-2 text-[14px] font-semibold leading-relaxed text-white">
              Hi! Ask me anything about your spending, budget, savings, or next money decision.
            </p>
          </div>
        )}

        {isTransactionHubPreview ? (
          <div className="mt-5 grid gap-2.5" aria-label="Static transaction demonstration">
            {TRANSACTION_HUB_ROWS.map((transaction) => (
              <div
                key={`${transaction.type}-${transaction.label}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3"
              >
                <span className="min-w-0">
                  <small className="block text-[9px] font-black uppercase tracking-[0.13em] text-cyan-100/55">
                    {transaction.type}
                  </small>
                  <strong className="mt-1 block truncate text-[12px] font-black text-white">
                    {transaction.label}
                  </strong>
                </span>
                <b className="shrink-0 text-[13px] font-black text-white">{transaction.amount}</b>
              </div>
            ))}
          </div>
        ) : (
          <input
            type="text"
            disabled
            aria-label="Static CLARA message input"
            placeholder="Ask CLARA about your money..."
            className="mt-4 min-h-[46px] w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-[13px] font-semibold text-white/60 placeholder:text-white/38 disabled:cursor-not-allowed disabled:opacity-100"
          />
        )}

        <p className="mt-4 rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.07] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
          {safetyMessage}
        </p>

        <button
          type="button"
          data-clara-guide-orb-preview-next="true"
          onPointerDown={stopEvent}
          onPointerUp={stopEvent}
          onClick={handleNext}
          className="mt-4 min-h-[46px] w-full rounded-full border border-cyan-100/30 bg-cyan-100/15 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-50 shadow-[0_12px_34px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-cyan-100/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.99]"
        >
          NEXT
        </button>
      </section>
    </div>
  );
}
