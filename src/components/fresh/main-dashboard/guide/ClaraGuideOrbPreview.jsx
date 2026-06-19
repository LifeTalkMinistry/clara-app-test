import { useCallback, useEffect, useRef } from "react";
import ClaraGuideManualExpensePreview from "@/components/fresh/main-dashboard/guide/ClaraGuideManualExpensePreview";
import ClaraGuideTransactionHubPreview from "@/components/fresh/main-dashboard/guide/ClaraGuideTransactionHubPreview";

export default function ClaraGuideOrbPreview({ preview, onNext }) {
  const headingRef = useRef(null);

  useEffect(() => {
    if (
      preview === "log-expense" ||
      preview === "transaction-hub" ||
      typeof window === "undefined"
    ) {
      return undefined;
    }

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

  if (preview === "transaction-hub") {
    return <ClaraGuideTransactionHubPreview onNext={onNext} />;
  }

  if (preview !== "clara-chat") return null;

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
          Chat with CLARA
        </h2>

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

        <input
          type="text"
          disabled
          aria-label="Static CLARA message input"
          placeholder="Ask CLARA about your money..."
          className="mt-4 min-h-[46px] w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-[13px] font-semibold text-white/60 placeholder:text-white/38 disabled:cursor-not-allowed disabled:opacity-100"
        />

        <p className="mt-4 rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.07] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
          SIMULATION ONLY — NO MESSAGE WILL BE SENT.
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
