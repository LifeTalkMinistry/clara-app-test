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
      className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-[#020817] px-[clamp(16px,5vw,30px)] pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]"
      role="presentation"
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-28 -top-32 h-80 w-80 rounded-full bg-cyan-400/[0.08] blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-violet-600/[0.11] blur-3xl" />
      </div>

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="clara-guided-onboarding-title"
        aria-describedby="clara-guided-onboarding-description"
        className="relative flex h-[calc(100dvh-32px)] max-h-[820px] w-full max-w-[430px] items-center justify-center text-white"
      >
        <article className="relative flex h-[calc(100%_-_100px)] min-h-[520px] max-h-[716px] w-[calc(100%_-_32px)] max-w-[398px] flex-col overflow-y-auto rounded-[32px] border border-cyan-100/16 bg-[linear-gradient(150deg,rgba(7,54,71,0.96),rgba(8,20,54,0.97)_48%,rgba(34,14,79,0.97))] px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_46px_rgba(0,0,0,0.28)] sm:px-6 sm:py-7">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
            <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full bg-cyan-300/[0.09] blur-3xl" />
            <div className="absolute -bottom-24 -right-16 h-60 w-60 rounded-full bg-violet-500/[0.14] blur-3xl" />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 z-20 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/18 bg-slate-950/24 text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition hover:bg-white/[0.11] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
            aria-label="Close CLARA walkthrough page"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative z-10 flex min-h-full flex-col">
            <div>
              <div className="pr-12">
                <span className="inline-flex w-fit items-center rounded-full border border-cyan-100/20 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-cyan-100">
                  Free 30-minute 1-on-1 session
                </span>
              </div>

              <h1
                id="clara-guided-onboarding-title"
                className="mt-5 max-w-[19rem] text-[clamp(2rem,8.5vw,2.45rem)] font-black leading-[0.98] tracking-[-0.05em] text-white"
              >
                Book Your Free CLARA Walkthrough
              </h1>

              <p
                id="clara-guided-onboarding-description"
                className="mt-5 text-[15px] font-medium leading-[1.65] text-slate-100/86"
              >
                Get a free one-on-one session with a CLARA guide who can answer your
                questions, help you understand the app, and show you the features most
                relevant to you.
              </p>

              <div className="mt-6 rounded-[22px] bg-white/[0.055] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-cyan-300/[0.1] text-cyan-100/90">
                    <CheckCircle2 className="h-[18px] w-[18px]" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-[22px] font-black leading-[1.05] tracking-[-0.035em] text-white">
                      What happens next
                    </h2>
                    <p className="mt-3 text-[14px] font-medium leading-[1.65] text-white/82">
                      Complete a short form, tell us what you need help with, and choose
                      your preferred schedule.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-7">
              <div className="border-t border-white/[0.08] pt-5">
                <p className="text-[13px] font-medium leading-[1.6] text-slate-300/68">
                  No payment required. You do not need to finish setting up CLARA before
                  booking.
                </p>

                <button
                  ref={continueButtonRef}
                  type="button"
                  onClick={onContinue}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[17px] border border-cyan-100/20 bg-[linear-gradient(100deg,rgba(14,165,233,0.96),rgba(99,102,241,0.98))] px-4 text-[12px] font-extrabold tracking-[0.02em] text-white shadow-[0_14px_30px_rgba(37,99,235,0.26)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 active:scale-[0.99]"
                >
                  Reserve My Free Session
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>,
    document.body,
  );
}
