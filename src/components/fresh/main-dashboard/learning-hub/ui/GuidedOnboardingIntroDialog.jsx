import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ExternalLink, X } from "lucide-react";

export default function GuidedOnboardingIntroDialog({
  open,
  onClose,
  onContinue,
}) {
  const continueButtonRef = useRef(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      continueButtonRef.current?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/80 px-3 py-3 backdrop-blur-md sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="clara-guided-onboarding-title"
        aria-describedby="clara-guided-onboarding-description"
        className="relative w-full max-w-[430px] overflow-hidden rounded-[30px] border border-cyan-100/20 bg-[linear-gradient(155deg,rgba(4,25,42,0.995),rgba(8,17,43,0.995)_50%,rgba(31,12,70,0.995))] text-white shadow-[0_36px_110px_rgba(0,0,0,0.82),0_0_60px_rgba(34,211,238,0.12)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[30px]">
          <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 h-60 w-60 rounded-full bg-violet-500/15 blur-3xl" />
        </div>

        <div className="relative z-10 px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full border border-cyan-100/20 bg-cyan-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100">
                30-MINUTE PERSONAL SUPPORT
              </span>
              <h2
                id="clara-guided-onboarding-title"
                className="mt-3 text-[24px] font-black leading-[1.05] tracking-tight text-white"
              >
                Book a CLARA Walkthrough
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/[0.10] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              aria-label="Close CLARA walkthrough information"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p
            id="clara-guided-onboarding-description"
            className="mt-4 text-[12px] font-semibold leading-[1.7] text-slate-200/78"
          >
            Get one-on-one guidance from a real person who can help you understand
            CLARA, answer your questions, and focus on the features most relevant
            to you.
          </p>

          <div className="mt-5 rounded-[20px] border border-cyan-100/12 bg-cyan-300/[0.06] px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border border-cyan-100/15 bg-cyan-300/[0.08] text-cyan-100/85">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/65">
                  What happens next
                </p>
                <p className="mt-1.5 text-[11px] font-bold leading-relaxed text-white/90">
                  You will continue to a short form where you can share what you
                  need help with and choose your preferred schedule.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[10px] font-semibold leading-relaxed text-slate-300/65">
            You do not need to finish setting up CLARA before booking.
          </p>

          <div className="mt-6 grid gap-2.5 sm:grid-cols-[1fr_auto]">
            <button
              ref={continueButtonRef}
              type="button"
              onClick={onContinue}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[17px] border border-cyan-100/20 bg-[linear-gradient(100deg,rgba(14,165,233,0.94),rgba(99,102,241,0.96))] px-4 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_30px_rgba(37,99,235,0.25)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 active:scale-[0.99]"
            >
              Continue to Booking Form
              <ExternalLink className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-12 items-center justify-center rounded-[17px] border border-white/[0.09] bg-white/[0.045] px-4 text-[9px] font-black uppercase tracking-[0.12em] text-white/70 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Not now
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
