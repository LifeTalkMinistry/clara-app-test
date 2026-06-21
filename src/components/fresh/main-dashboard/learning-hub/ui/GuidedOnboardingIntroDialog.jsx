import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Image,
  MessageCircleQuestion,
  Settings2,
  ShieldCheck,
  Smartphone,
  Wifi,
  X,
} from "lucide-react";

const SESSION_STEPS = [
  {
    icon: ClipboardList,
    label: "Before the session",
    title: "Tell us what you need",
    description:
      "Complete a short support form so we know your current setup, the features you want explained, and any issue you encountered.",
  },
  {
    icon: BookOpenCheck,
    label: "During the session",
    title: "Walk through CLARA together",
    description:
      "A real person will explain the important features, show how they connect, and guide you while you try them.",
  },
  {
    icon: Settings2,
    label: "Personal setup",
    title: "Set up what matters first",
    description:
      "We will prioritize the features that fit your current needs instead of rushing through the entire app.",
  },
  {
    icon: MessageCircleQuestion,
    label: "Your questions",
    title: "Ask as we go",
    description:
      "Pause anytime to clarify a feature, calculation, instruction, or next step.",
  },
];

const PREPARATION_ITEMS = [
  {
    icon: Smartphone,
    title: "Your device",
    description: "Have the device with CLARA ready.",
  },
  {
    icon: Wifi,
    title: "Stable internet",
    description: "Use a reliable connection for screen sharing.",
  },
  {
    icon: Image,
    title: "Questions or screenshots",
    description: "Prepare anything you want us to review.",
  },
  {
    icon: ShieldCheck,
    title: "Keep private details private",
    description: "Never share passwords, PINs, or full account numbers.",
  },
];

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
        className="relative max-h-[calc(100dvh-24px)] w-full max-w-[430px] overflow-hidden rounded-[30px] border border-cyan-100/20 bg-[linear-gradient(155deg,rgba(4,25,42,0.995),rgba(8,17,43,0.995)_50%,rgba(31,12,70,0.995))] text-white shadow-[0_36px_110px_rgba(0,0,0,0.82),0_0_60px_rgba(34,211,238,0.12)] sm:max-h-[min(860px,calc(100dvh-48px))]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[30px]">
          <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 h-60 w-60 rounded-full bg-violet-500/15 blur-3xl" />
        </div>

        <div className="relative z-10 max-h-[calc(100dvh-24px)] overflow-y-auto overscroll-contain px-5 pb-5 pt-5 sm:max-h-[min(860px,calc(100dvh-48px))] sm:px-6 sm:pb-6 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full border border-cyan-100/20 bg-cyan-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100">
                30-MINUTE HUMAN GUIDANCE
              </span>
              <h2
                id="clara-guided-onboarding-title"
                className="mt-3 text-[24px] font-black leading-[1.05] tracking-tight text-white"
              >
                CLARA Walkthrough Support
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/[0.10] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              aria-label="Close CLARA Walkthrough Support information"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p
            id="clara-guided-onboarding-description"
            className="mt-3 text-[12px] font-semibold leading-[1.7] text-slate-200/78"
          >
            Before you book, here is exactly what to expect and how to prepare
            for your one-on-one CLARA walkthrough.
          </p>

          <div className="mt-4 flex items-start gap-2.5 rounded-[17px] border border-cyan-100/12 bg-cyan-300/[0.06] px-3.5 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200/85" />
            <p className="text-[10px] font-bold leading-relaxed text-cyan-50/78">
              You do not need to understand or finish setting up CLARA before
              booking. The session is designed to help you begin clearly.
            </p>
          </div>

          <div className="mt-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100/65">
                  Your support journey
                </p>
                <h3 className="mt-1 text-[14px] font-black text-white">
                  What to expect
                </h3>
              </div>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-white/35">
                Step by step
              </span>
            </div>

            <div className="mt-3 space-y-2.5">
              {SESSION_STEPS.map(
                ({ icon: Icon, label, title, description }, index) => (
                  <div
                    key={title}
                    className="relative flex items-start gap-3 rounded-[19px] border border-white/[0.08] bg-white/[0.045] px-3.5 py-3.5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border border-cyan-100/15 bg-cyan-300/[0.08] text-cyan-100/85">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/[0.08] px-1 text-[7px] font-black text-white/65">
                          {index + 1}
                        </span>
                        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/58">
                          {label}
                        </p>
                      </div>
                      <p className="mt-1.5 text-[11px] font-black text-white">
                        {title}
                      </p>
                      <p className="mt-1 text-[9.5px] font-semibold leading-relaxed text-slate-300/65">
                        {description}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="mt-5 rounded-[21px] border border-violet-200/12 bg-violet-300/[0.055] p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[12px] border border-violet-100/15 bg-violet-300/[0.09] text-violet-100/85">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-violet-100/60">
                  The Google Form helps us prepare
                </p>
                <p className="mt-0.5 text-[11px] font-black text-white">
                  You will be asked about:
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                "Your current CLARA setup",
                "Features you want explained",
                "Any issue or error encountered",
                "Your preferred date and platform",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 rounded-[13px] border border-white/[0.06] bg-slate-950/15 px-2.5 py-2"
                >
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-violet-200/75" />
                  <p className="text-[8.5px] font-bold leading-relaxed text-slate-200/68">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100/65">
              Before the meeting
            </p>
            <h3 className="mt-1 text-[14px] font-black text-white">
              How to prepare
            </h3>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {PREPARATION_ITEMS.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-[17px] border border-white/[0.08] bg-white/[0.04] p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-[11px] border border-cyan-100/12 bg-cyan-300/[0.07] text-cyan-100/80">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-2.5 text-[9.5px] font-black leading-tight text-white">
                    {title}
                  </p>
                  <p className="mt-1 text-[8.5px] font-semibold leading-relaxed text-slate-300/60">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-[1fr_auto]">
            <button
              ref={continueButtonRef}
              type="button"
              onClick={onContinue}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[17px] border border-cyan-100/20 bg-[linear-gradient(100deg,rgba(14,165,233,0.94),rgba(99,102,241,0.96))] px-4 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_30px_rgba(37,99,235,0.25)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 active:scale-[0.99]"
            >
              Continue to Support Form
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
