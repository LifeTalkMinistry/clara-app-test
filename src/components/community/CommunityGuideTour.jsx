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

// Keep the Guide anchored to the current CLARA shell. Do not add legacy
// Dashboard routes here. Every step is intentionally read-only: it can move
// around the app and explain a real control, but it never performs the control's
// write action for the user.
const GUIDE_STEPS = [
  {
    route: HOME_ROUTE,
    target: ".clara-community-shell-header a[title='Home']",
    eyebrow: "Start here",
    title: "Your current CLARA Home",
    body: "This walkthrough stays inside the CLARA experience you are using now. It will point to the real tools on the current Home and Community screens—never the old dashboard.",
    note: "Guide Mode is read-only. It does not change your wallet, budget, savings, streak, posts, messages, schedule, or profile.",
  },
  {
    route: HOME_ROUTE,
    target: "[data-clara-community-guide='daily-tip']",
    scroll: true,
    eyebrow: "Daily discipline",
    title: "Daily Money Tip + streak",
    body: "Start with one practical reminder before you spend, then keep your consistency visible as your streak grows.",
    bullets: ["Daily tip", "Check-in", "Personal streak", "30-day progress"],
  },
  {
    route: HOME_ROUTE,
    target: "[data-clara-community-guide='learning-hub']",
    scroll: true,
    eyebrow: "Learn as you go",
    title: "Learning Hub",
    body: "Open short, practical lessons that explain the money ideas behind the actions you take inside CLARA.",
    bullets: ["Practical lessons", "Money concepts", "Action-focused learning"],
  },
  {
    route: HOME_ROUTE,
    target: "[data-clara-coaching-calendar-button='true']",
    scroll: true,
    eyebrow: "Human accountability",
    title: "30-minute coaching",
    body: "Use the small calendar control when a money situation needs a focused one-on-one conversation instead of another generic tip.",
    note: "Nothing is booked during this walkthrough.",
  },
  {
    route: HOME_ROUTE,
    target: ".clara-community-home-financial-carousel",
    scroll: true,
    eyebrow: "Your money system",
    title: "The six-part financial carousel",
    body: "Swipe through the core money areas that organize your financial picture from where money comes from to what still needs attention.",
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
    title: "Money Left + Total Expense",
    body: "Use this summary as the fast reality check before your next expense: what is still available and what has already gone out.",
    bullets: ["Money remaining", "Total expense", "Fast dashboard check"],
  },
  {
    route: HOME_ROUTE,
    target: "[data-clara-summary-privacy-toggle='true']",
    scroll: true,
    eyebrow: "Privacy",
    title: "Hide your money amounts",
    body: "Tap the eye control in normal use whenever someone else can see your screen. CLARA can hide the sensitive amounts without removing any data.",
    note: "The Guide only points to the control; it will not toggle your real privacy preference.",
  },
  {
    route: HOME_ROUTE,
    target: "[data-clara-money-calculator-toggle='true']",
    scroll: true,
    eyebrow: "Quick utility",
    title: "Built-in money calculator",
    body: "Need to total, split, or double-check an amount before recording it? The calculator is available directly beside your money summary.",
    bullets: ["Total amounts", "Split amounts", "Check before logging"],
  },
  {
    route: HOME_ROUTE,
    target: "[data-clara-manual-expense-orb='true']",
    scroll: true,
    eyebrow: "One control, three actions",
    title: "The CLARA money orb",
    body: "This orb is your shortcut for the money actions you use most. Learn the gesture once and you can reach each action without hunting through menus.",
    bullets: ["1 tap · Log Expense", "2 taps · Transaction Hub", "Hold · Pause Before Buying"],
    note: "Guide Mode does not trigger any of these real actions.",
  },
  {
    route: "/community",
    target: ".clara-community-shell-header a[title='Feed']",
    eyebrow: "Accountability together",
    title: "Community Feed",
    body: "The Feed is the shared accountability space for money wins, questions, struggles, lessons, reactions, and conversations with other members.",
    bullets: ["Wins", "Questions", "Struggles", "Money lessons", "Comments + reactions"],
  },
  {
    route: "/community",
    target: [
      ".clara-community-board",
      ".clara-community-feed-scroll section.relative.mb-6",
    ],
    scroll: true,
    eyebrow: "Discover something useful",
    title: "CLARA Board",
    body: "The Board rotates useful financial facts, updates, and selected announcements. You can swipe it manually, and items can open a deeper read when one is available.",
    bullets: ["Auto-rotating cards", "Manual swipe", "Tap to read more", "Sponsored items are labeled"],
    wideTarget: true,
  },
  {
    route: "/community",
    target: ".clara-community-composer",
    scroll: true,
    eyebrow: "Share with purpose",
    title: "Create a Community post",
    body: "Post the kind of update that helps accountability instead of creating noise. CLARA lets you give the post context and attach media when it helps the story.",
    bullets: ["Win", "Question", "Struggle", "Tip", "Photo", "Video", "File"],
    note: "Nothing is published while the Guide is open.",
    wideTarget: true,
  },
  {
    route: "/community?view=schedule",
    target: ".clara-community-shell-header a[title='Schedule']",
    eyebrow: "Plan ahead",
    title: "Schedule",
    body: "Turn financial intentions into dated actions so bills, goals, sessions, and important money tasks do not stay on a someday list.",
    bullets: ["Agenda", "Calendar", "Dated money actions"],
  },
  {
    route: "/community?view=circles",
    target: ".clara-community-shell-header a[title='My Circle']",
    eyebrow: "Private accountability",
    title: "My Circle",
    body: "Create a smaller accountability space with people you choose for encouragement, shared goals, and disciplined money habits.",
    bullets: ["Your people", "Shared goals", "Closer accountability"],
  },
  {
    route: "/community?view=challenges",
    target: ".clara-community-shell-header a[title='CLARA Challenges']",
    eyebrow: "Put discipline into action",
    title: "CLARA Challenges",
    body: "Weekly and monthly challenges turn a good money intention into a clear target, a deadline, and a finish line you can work toward.",
    bullets: ["Weekly challenges", "Monthly challenges", "Progress + finish line"],
  },
  {
    route: "/community?view=messages",
    target: ".clara-community-shell-header a[title='Messages']",
    eyebrow: "Private conversation",
    title: "Messages",
    body: "Continue an accountability conversation privately, find another CLARA member, and keep discussions off the public Feed when they belong one-to-one.",
    bullets: ["Private chat", "Find members", "Accountability follow-up"],
  },
  {
    route: "/community?view=notifications",
    target: ".clara-community-shell-header a[title='Notifications']",
    eyebrow: "Stay connected",
    title: "Notifications",
    body: "See reactions, comments, and other Community activity that may need your attention without hunting through every screen.",
  },
  {
    route: "/community?view=profile",
    target: ".clara-community-shell-header a[title='ME']",
    eyebrow: "Your CLARA identity",
    title: "ME / Profile",
    body: "Your profile brings together your Community identity, accountability presence, progress signals, badges, and personal information.",
    bullets: ["Profile", "Progress", "Badges", "Community identity"],
  },
  {
    route: HOME_ROUTE,
    target: ".clara-community-shell-header a[title='Home']",
    eyebrow: "Walkthrough complete",
    title: "You now know the current CLARA system",
    body: "You have seen the current Home, learning and coaching tools, the full money system, quick money controls, and every main Community destination.",
    note: "CLARA's normal tools stay separate from Support CLARA. Support is voluntary, and the Support bubble is hidden for users who are already active supporters.",
    complete: true,
  },
];

function getStepTarget(step) {
  if (typeof document === "undefined" || !step?.target) return null;
  const selectors = Array.isArray(step.target) ? step.target : [step.target];

  for (const selector of selectors) {
    if (!selector) continue;
    const target = document.querySelector(selector);
    if (!target) continue;
    const rect = target.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return target;
  }

  return null;
}

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
  const safePanelHeight = Math.min(
    Math.max(1, Number(panelHeight) || 230),
    Math.max(1, viewportHeight - GUIDE_VIEWPORT_MARGIN * 2),
  );
  const belowTop = targetRect.bottom + GUIDE_PANEL_GAP;
  const aboveTop = targetRect.top - GUIDE_PANEL_GAP - safePanelHeight;
  const roomBelow = viewportHeight - GUIDE_VIEWPORT_MARGIN - targetRect.bottom;
  const roomAbove = targetRect.top - GUIDE_VIEWPORT_MARGIN;

  if (roomBelow >= safePanelHeight + GUIDE_PANEL_GAP) {
    return { top: Math.max(GUIDE_VIEWPORT_MARGIN, belowTop), side: "below" };
  }

  if (roomAbove >= safePanelHeight + GUIDE_PANEL_GAP) {
    return { top: Math.max(GUIDE_VIEWPORT_MARGIN, aboveTop), side: "above" };
  }

  const maxTop = Math.max(
    GUIDE_VIEWPORT_MARGIN,
    viewportHeight - GUIDE_VIEWPORT_MARGIN - safePanelHeight,
  );

  if (roomBelow >= roomAbove) {
    return {
      top: Math.min(
        maxTop,
        Math.max(GUIDE_VIEWPORT_MARGIN, targetRect.bottom + 4),
      ),
      side: "below",
    };
  }

  return {
    top: Math.max(
      GUIDE_VIEWPORT_MARGIN,
      Math.min(targetRect.top - safePanelHeight - 4, maxTop),
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
  const scrolledStepRef = useRef(-1);
  const step = GUIDE_STEPS[stepIndex] || GUIDE_STEPS[0];
  const totalSteps = GUIDE_STEPS.length;

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      startLocationRef.current = `${location.pathname}${location.search}` || HOME_ROUTE;
      setStepIndex(0);
      scrolledStepRef.current = -1;
    }
    wasOpenRef.current = open;
  }, [location.pathname, location.search, open]);

  useEffect(() => {
    if (!open || !step?.route) return;

    const currentRoute = `${location.pathname}${location.search}`;
    if (currentRoute !== step.route) {
      setTargetRect(null);
      navigate(step.route, { replace: true });
    }
  }, [location.pathname, location.search, navigate, open, step?.route]);

  const measureTarget = useCallback(() => {
    if (!open || typeof document === "undefined") {
      setTargetRect(null);
      return;
    }

    const target = getStepTarget(step);
    if (!target) {
      setTargetRect(null);
      return;
    }

    if (step?.scroll && scrolledStepRef.current !== stepIndex) {
      scrolledStepRef.current = stepIndex;
      target.scrollIntoView?.({ behavior: "smooth", block: "center", inline: "nearest" });
    }

    const rect = target.getBoundingClientRect();
    setTargetRect(getExpandedRect(rect));
  }, [open, step, stepIndex]);

  useEffect(() => {
    if (!open) return undefined;

    scrolledStepRef.current = -1;
    const timers = [50, 160, 340, 700].map((delay) =>
      window.setTimeout(measureTarget, delay),
    );
    const frame = window.requestAnimationFrame(measureTarget);
    let mutationObserver = null;

    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(measureTarget);
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);

    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      mutationObserver?.disconnect();
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [measureTarget, open, stepIndex]);

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
  }, [open, stepIndex, updatePanelPlacement]);

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
    <div className="fixed inset-0 z-[2147483500]" aria-hidden={false}>
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
        className="absolute left-1/2 max-h-[calc(100dvh-20px)] w-[min(calc(100vw-34px),360px)] overflow-y-auto rounded-[24px] border border-white/[0.10] bg-[linear-gradient(180deg,rgba(8,20,38,0.985),rgba(6,14,29,0.99))] text-white shadow-[0_24px_70px_rgba(0,0,0,0.58),0_0_30px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-2xl transition-[top] duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

        <div className="relative overflow-hidden rounded-[24px]">
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
