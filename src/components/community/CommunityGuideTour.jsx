import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const HOME_ROUTE = "/community?view=home";
const GUIDE_PANEL_GAP = 10;
const GUIDE_VIEWPORT_MARGIN = 10;

const GUIDE_STEPS = [
  {
    route: HOME_ROUTE,
    target: ".clara-community-shell-header a[title='Home']",
    eyebrow: "Start here",
    title: "Your CLARA home",
    body: "This walkthrough stays inside the current CLARA app and introduces the tools that are actually available here today.",
    note: "Guide mode only explains the app. It does not change your real money data.",
  },
  {
    route: HOME_ROUTE,
    target: "[data-clara-community-guide='daily-tip']",
    scroll: true,
    eyebrow: "Daily discipline",
    title: "Daily Money Tip + streak",
    body: "Get one practical money reminder, check in, and keep your 30-day consistency visible.",
    bullets: ["Daily tip", "Personal streak", "30-day progress"],
  },
  {
    route: HOME_ROUTE,
    target: "[data-clara-community-guide='learning-hub']",
    scroll: true,
    eyebrow: "Learn as you go",
    title: "Learning Hub",
    body: "Short, practical lessons explain the money concepts behind the actions you take inside CLARA.",
  },
  {
    route: HOME_ROUTE,
    target: "[data-clara-coaching-calendar-button='true']",
    scroll: true,
    eyebrow: "Human accountability",
    title: "30-minute coaching",
    body: "Use the calendar when a money situation needs a focused one-on-one conversation instead of another generic tip.",
    note: "Nothing is booked during this walkthrough.",
  },
  {
    route: HOME_ROUTE,
    target: ".clara-community-home-financial-carousel",
    scroll: true,
    eyebrow: "Your money system",
    title: "The financial carousel",
    body: "Swipe through the six core areas that organize your financial picture from income to obligations.",
    bullets: [
      "Income Hub",
      "Wallet",
      "Budget",
      "Emergency Fund",
      "Savings Goals",
      "Debt / Obligations",
    ],
    wideTarget: true,
  },
  {
    route: HOME_ROUTE,
    target: ".clara-community-home-money-left",
    scroll: true,
    eyebrow: "Quick reality check",
    title: "Money Left + privacy",
    body: "See what remains after recorded spending and hide sensitive amounts whenever someone else can see your screen.",
    bullets: ["Money remaining", "Hide / reveal amounts", "CLARA money shortcut"],
  },
  {
    route: "/community",
    target: ".clara-community-shell-header a[title='Feed']",
    eyebrow: "Accountability together",
    title: "Community Feed",
    body: "Share progress, questions, lessons, wins, and setbacks with people who are also trying to become more disciplined with money.",
  },
  {
    route: "/community?view=schedule",
    target: ".clara-community-shell-header a[title='Schedule']",
    eyebrow: "Plan ahead",
    title: "Schedule",
    body: "Turn financial intentions into dated actions so important money tasks and sessions do not stay on a someday list.",
  },
  {
    route: "/community?view=circles",
    target: ".clara-community-shell-header a[title='My Circle']",
    eyebrow: "Private accountability",
    title: "My Circle",
    body: "Create a smaller accountability space with people you choose for encouragement, shared goals, and disciplined money habits.",
  },
  {
    route: "/community?view=challenges",
    target: ".clara-community-shell-header a[title='CLARA Challenges']",
    eyebrow: "Put discipline into action",
    title: "CLARA Challenges",
    body: "Weekly and monthly challenges give a money behavior a clear target, a deadline, and a finish line.",
  },
  {
    route: "/community?view=messages",
    target: ".clara-community-shell-header a[title='Messages']",
    eyebrow: "Private conversation",
    title: "Messages",
    body: "Continue an accountability conversation privately when it does not belong on the shared community feed.",
  },
  {
    route: "/community?view=notifications",
    target: ".clara-community-shell-header a[title='Notifications']",
    eyebrow: "Stay connected",
    title: "Notifications",
    body: "See reactions, comments, and other community activity that may need your attention without hunting through the app.",
  },
  {
    route: "/community?view=profile",
    target: ".clara-community-shell-header a[title='ME']",
    eyebrow: "Your CLARA identity",
    title: "ME / Profile",
    body: "Your profile brings together your community identity, accountability presence, progress signals, badges, and personal information.",
  },
  {
    route: HOME_ROUTE,
    target: ".clara-community-shell-header a[title='Home']",
    eyebrow: "Walkthrough complete",
    title: "That is the CLARA system",
    body: "You now know the current Home tools, learning and coaching, the six-part money system, and every main Community section.",
    note: "CLARA stays fully usable whether or not you support the project. Support CLARA is voluntary and separate from normal app access.",
    complete: true,
  },
];

function getExpandedRect(rect) {
  if (!rect || typeof window === "undefined") return null;

  const pad = 6;
  const left = Math.max(7, rect.left - pad);
  const top = Math.max(7, rect.top - pad);
  const right = Math.min(window.innerWidth - 7, rect.right + pad);
  const bottom = Math.min(window.innerHeight - 7, rect.bottom + pad);

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function getPanelPlacement(targetRect, panelHeight) {
  if (!targetRect || typeof window === "undefined") {
    return { top: null, side: "center" };
  }

  const viewportHeight = window.innerHeight;
  const safePanelHeight = Math.max(1, Number(panelHeight) || 230);
  const belowTop = targetRect.bottom + GUIDE_PANEL_GAP;
  const aboveTop = targetRect.top - GUIDE_PANEL_GAP - safePanelHeight;
  const roomBelow = viewportHeight - GUIDE_VIEWPORT_MARGIN - targetRect.bottom;
  const roomAbove = targetRect.top - GUIDE_VIEWPORT_MARGIN;

  if (roomBelow >= safePanelHeight + GUIDE_PANEL_GAP) {
    return {
      top: Math.max(GUIDE_VIEWPORT_MARGIN, belowTop),
      side: "below",
    };
  }

  if (roomAbove >= safePanelHeight + GUIDE_PANEL_GAP) {
    return {
      top: Math.max(GUIDE_VIEWPORT_MARGIN, aboveTop),
      side: "above",
    };
  }

  // When neither side has enough room, stay attached to whichever edge of the
  // featured item has more usable space. This deliberately allows a small
  // overlap instead of sending the guide to the opposite end of the screen.
  if (roomBelow >= roomAbove) {
    return {
      top: Math.min(
        viewportHeight - GUIDE_VIEWPORT_MARGIN - safePanelHeight,
        Math.max(GUIDE_VIEWPORT_MARGIN, targetRect.bottom + 4),
      ),
      side: "below",
    };
  }

  return {
    top: Math.max(
      GUIDE_VIEWPORT_MARGIN,
      Math.min(targetRect.top - safePanelHeight - 4, viewportHeight - GUIDE_VIEWPORT_MARGIN - safePanelHeight),
    ),
    side: "above",
  };
}

export default function CommunityGuideTour({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [panelPlacement, setPanelPlacement] = useState({ top: null, side: "center" });
  const panelRef = useRef(null);
  const startLocationRef = useRef(HOME_ROUTE);
  const wasOpenRef = useRef(false);
  const step = GUIDE_STEPS[stepIndex] || GUIDE_STEPS[0];
  const totalSteps = GUIDE_STEPS.length;

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      startLocationRef.current = `${location.pathname}${location.search}` || HOME_ROUTE;
      setStepIndex(0);
    }
    wasOpenRef.current = open;
  }, [location.pathname, location.search, open]);

  useEffect(() => {
    if (!open || !step?.route) return;

    const currentRoute = `${location.pathname}${location.search}`;
    if (currentRoute !== step.route) {
      navigate(step.route, { replace: true });
    }
  }, [location.pathname, location.search, navigate, open, step?.route]);

  const measureTarget = useCallback(() => {
    if (!open || typeof document === "undefined" || !step?.target) {
      setTargetRect(null);
      return;
    }

    const target = document.querySelector(step.target);
    if (!target) {
      setTargetRect(null);
      return;
    }

    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      setTargetRect(null);
      return;
    }

    setTargetRect(getExpandedRect(rect));
  }, [open, step?.target]);

  useEffect(() => {
    if (!open) return undefined;

    const target = step?.target ? document.querySelector(step.target) : null;
    if (target && step?.scroll) {
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }

    const timers = [70, 220, 460].map((delay) =>
      window.setTimeout(measureTarget, delay),
    );

    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [measureTarget, open, step?.scroll, step?.target]);

  const updatePanelPlacement = useCallback(() => {
    if (!open || !targetRect || typeof window === "undefined") {
      setPanelPlacement({ top: null, side: "center" });
      return;
    }

    const panelHeight = panelRef.current?.getBoundingClientRect?.().height || 230;
    setPanelPlacement(getPanelPlacement(targetRect, panelHeight));
  }, [open, targetRect]);

  useEffect(() => {
    if (!open) return undefined;

    const frame = window.requestAnimationFrame(updatePanelPlacement);
    const timer = window.setTimeout(updatePanelPlacement, 80);
    let observer = null;

    if (typeof ResizeObserver !== "undefined" && panelRef.current) {
      observer = new ResizeObserver(updatePanelPlacement);
      observer.observe(panelRef.current);
    }

    window.addEventListener("resize", updatePanelPlacement);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      observer?.disconnect();
      window.removeEventListener("resize", updatePanelPlacement);
    };
  }, [stepIndex, updatePanelPlacement, open]);

  const closeGuide = useCallback(
    ({ completed = false } = {}) => {
      const destination = completed
        ? HOME_ROUTE
        : startLocationRef.current || HOME_ROUTE;
      navigate(destination, { replace: true });
      onClose?.();
    },
    [navigate, onClose],
  );

  const goNext = useCallback(() => {
    if (stepIndex >= totalSteps - 1) {
      closeGuide({ completed: true });
      return;
    }
    setStepIndex((current) => Math.min(totalSteps - 1, current + 1));
  }, [closeGuide, stepIndex, totalSteps]);

  const goBack = useCallback(() => {
    setStepIndex((current) => Math.max(0, current - 1));
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeGuide();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeGuide, goBack, goNext, open]);

  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / totalSteps) * 100),
    [stepIndex, totalSteps],
  );

  const targetIsLarge = useMemo(() => {
    if (!targetRect || typeof window === "undefined") return false;
    return step?.wideTarget || targetRect.height > window.innerHeight * 0.38;
  }, [step?.wideTarget, targetRect]);

  const panelStyle = useMemo(() => {
    if (panelPlacement.top == null) {
      return {
        top: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    return {
      top: `${Math.round(panelPlacement.top)}px`,
      transform: "translateX(-50%)",
    };
  }, [panelPlacement.top]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2147482500]" aria-hidden={false}>
      <div
        className={`absolute inset-0 ${
          targetRect ? "bg-transparent" : "bg-[#020817]/72 backdrop-blur-[2px]"
        }`}
        onPointerDown={(event) => event.preventDefault()}
        onClick={(event) => event.preventDefault()}
      />

      {targetRect ? (
        <div
          className={`pointer-events-none fixed transition-all duration-300 ${
            targetIsLarge
              ? "rounded-[30px] border border-cyan-100/28"
              : "rounded-[18px] border border-cyan-100/58"
          }`}
          style={{
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: targetIsLarge
              ? "0 0 0 9999px rgba(2,8,23,0.56), inset 0 0 0 1px rgba(103,232,249,0.05), 0 0 26px rgba(34,211,238,0.13)"
              : "0 0 0 9999px rgba(2,8,23,0.62), 0 0 0 2px rgba(34,211,238,0.10), 0 0 26px rgba(34,211,238,0.24)",
          }}
          aria-hidden="true"
        />
      ) : null}

      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clara-community-guide-title"
        className="absolute left-1/2 w-[min(calc(100vw-34px),360px)] overflow-visible rounded-[24px] border border-white/[0.10] bg-[linear-gradient(180deg,rgba(8,20,38,0.985),rgba(6,14,29,0.99))] text-white shadow-[0_24px_70px_rgba(0,0,0,0.58),0_0_30px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-2xl transition-[top] duration-300"
        style={panelStyle}
      >
        {targetRect && panelPlacement.side !== "center" ? (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-1/2 z-20 h-3 w-3 -translate-x-1/2 rotate-45 border-white/[0.10] bg-[rgba(8,20,38,0.99)] ${
              panelPlacement.side === "below"
                ? "-top-1.5 border-l border-t"
                : "-bottom-1.5 border-b border-r"
            }`}
          />
        ) : null}

        <div className="overflow-hidden rounded-[24px]">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(103,232,249,0.72),rgba(129,140,248,0.50),transparent)]" />
          <div className="pointer-events-none absolute -right-14 -top-16 h-36 w-36 rounded-full bg-indigo-400/[0.10] blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-cyan-300/[0.07] blur-3xl" />

          <div className="relative px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-100/[0.10] bg-cyan-100/[0.045] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.19em] text-cyan-100/72">
                {step.complete ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                CLARA Guide
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tabular-nums tracking-[0.12em] text-white/34">
                  {String(stepIndex + 1).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => closeGuide()}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-white/46 transition hover:bg-white/[0.07] hover:text-white/78"
                  aria-label="Exit CLARA Guide"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-3 h-[2px] overflow-hidden rounded-full bg-white/[0.055]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#2dd4bf,#67e8f9,#818cf8)] transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-4 flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] border border-cyan-100/[0.12] bg-[linear-gradient(145deg,rgba(45,212,191,0.12),rgba(99,102,241,0.10))] text-cyan-100/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <ShieldCheck className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1 pr-6">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100/48">
                  {step.eyebrow}
                </p>
                <h2
                  id="clara-community-guide-title"
                  className="mt-1 text-[1.12rem] font-black leading-[1.12] tracking-[-0.035em] text-white"
                >
                  {step.title}
                </h2>
              </div>
            </div>

            <p className="mt-3 text-[12px] font-semibold leading-[1.55] text-white/67">
              {step.body}
            </p>

            {step.bullets?.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {step.bullets.map((bullet) => (
                  <span
                    key={bullet}
                    className="rounded-full border border-white/[0.075] bg-white/[0.035] px-2.5 py-1.5 text-[9px] font-bold leading-none text-cyan-50/67"
                  >
                    {bullet}
                  </span>
                ))}
              </div>
            ) : null}

            {step.note ? (
              <p className="mt-3 border-l border-cyan-100/24 pl-3 text-[10px] font-semibold leading-[1.5] text-cyan-50/48">
                {step.note}
              </p>
            ) : null}

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.055] pt-3">
              <button
                type="button"
                onClick={goBack}
                disabled={stepIndex === 0}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-full px-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/46 transition hover:text-white/72 disabled:cursor-not-allowed disabled:opacity-20"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>

              <button
                type="button"
                onClick={goNext}
                className="inline-flex h-10 min-w-[96px] items-center justify-center gap-1.5 rounded-full border border-cyan-100/14 bg-[linear-gradient(110deg,rgba(20,184,166,0.90),rgba(79,70,229,0.92))] px-4 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-[0_10px_24px_rgba(37,99,235,0.18),inset_0_1px_0_rgba(255,255,255,0.10)] transition hover:brightness-110 active:scale-[0.985]"
              >
                {step.complete ? "Finish" : "Next"}
                {!step.complete ? <ChevronRight className="h-3.5 w-3.5" /> : null}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
