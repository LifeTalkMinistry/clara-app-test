import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  BookOpenCheck,
  CheckCircle2,
  ExternalLink,
  MessageCircleQuestion,
  Settings2,
  X,
} from "lucide-react";

const SESSION_POINTS = [
  {
    icon: BookOpenCheck,
    title: "Understand the important features",
    description: "Learn what each major part of CLARA does and why it matters.",
  },
  {
    icon: Settings2,
    title: "Set up what you need first",
    description: "Get personal guidance on the features that fit your current situation.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Ask questions along the way",
    description: "Receive light coaching support while learning how to use the app.",
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
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/78 px-3 py-3 backdrop-blur-md sm:items-center sm:p-6"
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
        className="relative w-full max-w-[420px] overflow-hidden rounded-[28px] border border-cyan-100/20 bg-[linear-gradient(155deg,rgba(4,25,42,0.99),rgba(8,17,43,0.99)_52%,rgba(31,12,70,0.99))] p-5 text-white shadow-[0_36px_110px_rgba(0,0,0,0.78),0_0_55px_rgba(34,211,238,0.12)] sm:p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute -left-16 -top-20 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="absolute -bottom-20 -right-12 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center rounded-full border border-cyan-100/20 bg-cyan-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100">
                30-MINUTE HUMAN GUIDANCE
              </span>
              <h2
                id="clara-guided-onboarding-title"
                className="mt-3 text-[23px] font-black leading-tight tracking-tight text-white"
              >
                CLARA Guided Onboarding
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/[0.10] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              aria-label="Close Guided Onboarding information"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p
            id="clara-guided-onboarding-description"
            className="mt-3 text-[12px] font-semibold leading-[1.7] text-slate-200/78"
          >
            Meet with a real person who will walk you through CLARA, explain why
            each feature matters, and help you begin using the app with confidence.
          </p>

          <div className="mt-5 space-y-2.5">
            {SESSION_POINTS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-[18px] border border-white/[0.08] bg-white/[0.045] px-3.5 py-3"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border border-cyan-100/15 bg-cyan-300/[0.08] text-cyan-100/85">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-white">{title}</p>
                  <p className="mt-1 text-[10px] font-semibold leading-relaxed text-slate-300/65">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-[16px] border border-emerald-200/10 bg-emerald-300/[0.06] px-3.5 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200/80" />
            <p className="text-[9px] font-bold leading-relaxed text-emerald-50/75">
              This is mainly an app guidance and setup session. Coaching is used
              only to make the walkthrough more personal and helpful.
            </p>
          </div>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-[1fr_auto]">
            <button
              ref={continueButtonRef}
              type="button"
              onClick={onContinue}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[17px] border border-cyan-100/20 bg-[linear-gradient(100deg,rgba(14,165,233,0.92),rgba(99,102,241,0.96))] px-4 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_30px_rgba(37,99,235,0.25)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 active:scale-[0.99]"
            >
              Book through Google Form
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
