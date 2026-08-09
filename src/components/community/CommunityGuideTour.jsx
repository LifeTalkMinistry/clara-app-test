import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, ShieldCheck, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const HOME_ROUTE = "/community?view=home";

const GUIDE_STEPS = [
  {
    route: HOME_ROUTE,
    target: ".clara-community-shell-header a[title='Home']",
    eyebrow: "Current CLARA walkthrough",
    title: "Welcome to the real CLARA home",
    body: "This guide now stays inside the current CLARA app. It will show the features you actually have today without sending you back to the retired dashboard or writing demo data into your account.",
    note: "You can exit anytime. Your real money data is never changed by this tour.",
  },
  {
    route: HOME_ROUTE,
    target: "[data-clara-community-guide='daily-tip']",
    scroll: true,
    eyebrow: "Daily habit",
    title: "Daily Money Tip + streak",
    body: "Start here for one practical money reminder at a time. The streak turns financial discipline into a daily habit so progress feels visible instead of vague.",
    bullets: ["Read or flip the daily tip", "Check in consistently", "Track your 30-day progress"],
  },
  {
    route: HOME_ROUTE,
    target: "[data-clara-community-guide='learning-hub']",
    scroll: true,
    eyebrow: "Learn inside the app",
    title: "Learning Hub",
    body: "The Learning Hub is where CLARA explains money concepts in short, usable pieces. It is meant to help you understand the reason behind the financial actions you are taking.",
  },
  {
    route: HOME_ROUTE,
    target: "[data-clara-coaching-calendar-button='true']",
    scroll: true,
    eyebrow: "Human accountability",
    title: "30-minute coaching",
    body: "Use the small 30m calendar when a money situation deserves a real conversation. This opens CLARA Coaching so you can choose a focused one-on-one session.",
    note: "The tour only explains the button. It does not create a booking.",
  },
  {
    route: HOME_ROUTE,
    target: ".clara-community-home-financial-carousel",
    scroll: true,
    eyebrow: "Your money system",
    title: "Financial carousel",
    body: "Swipe this section to move through the core parts of your financial picture. The next six stops explain what every money card is for.",
    bullets: ["Income Hub", "Wallet", "Budget", "Emergency Fund", "Savings Goals", "Debt / Obligations"],
  },
  {
    route: HOME_ROUTE,
    target: ".clara-community-home-financial-carousel",
    scroll: true,
    eyebrow: "Money card 1 of 6",
    title: "Income Hub",
    body: "Income Hub answers the first question: where is your money coming from? Use it to understand your income sources before deciding where the money should go.",
  },
  {
    route: HOME_ROUTE,
    target: ".clara-community-home-financial-carousel",
    scroll: true,
    eyebrow: "Money card 2 of 6",
    title: "Wallet",
    body: "Wallet shows where your available money is sitting right now. It helps separate money you actually have from money that is only planned or expected.",
  },
  {
    route: HOME_ROUTE,
    target: ".clara-community-home-financial-carousel",
    scroll: true,
    eyebrow: "Money card 3 of 6",
    title: "Budget",
    body: "Budget gives your money a plan before spending happens. Use it to see what has already been assigned and whether a new expense still fits your priorities.",
  },
  {
    route: HOME_ROUTE,
    target: ".clara-community-home-financial-carousel",
    scroll: true,
    eyebrow: "Money card 4 of 6",
    title: "Emergency Fund",
    body: "Emergency Fund is your protection money for genuine unexpected problems. Building it creates room to handle emergencies without immediately depending on debt.",
  },
  {
    route: HOME_ROUTE,
    target: ".clara-community-home-financial-carousel",
    scroll: true,
    eyebrow: "Money card 5 of 6",
    title: "Savings Goals",
    body: "Savings Goals gives future money a specific purpose. Instead of simply trying to save more, you can see what you are saving for and how far you have already come.",
  },
  {
    route: HOME_ROUTE,
    target: ".clara-community-home-financial-carousel",
    scroll: true,
    eyebrow: "Money card 6 of 6",
    title: "Debt / Obligations",
    body: "Debt and Obligations keeps the money you owe visible. The goal is awareness: know what still needs attention before those commitments quietly pressure the rest of your budget.",
  },
  {
    route: HOME_ROUTE,
    target: ".clara-community-home-money-left",
    scroll: true,
    eyebrow: "Reality check",
    title: "Money Left + privacy controls",
    body: "Money Left gives you a fast reality check after recorded spending. You can hide amounts when someone is looking at your screen, and the CLARA orb beside it is your shortcut into CLARA's spending and transaction tools.",
    bullets: ["See what remains", "Hide or reveal sensitive amounts", "Use the CLARA orb for money actions"],
  },
  {
    route: "/community",
    target: ".clara-community-shell-header a[title='Feed']",
    eyebrow: "Accountability together",
    title: "Community Feed",
    body: "The Feed is the shared accountability space. Post progress, money lessons, questions, wins, and setbacks so financial discipline is not something you have to practice alone.",
  },
  {
    route: "/community?view=schedule",
    target: ".clara-community-shell-header a[title='Schedule']",
    eyebrow: "Plan ahead",
    title: "Schedule",
    body: "Schedule keeps important money actions and planned sessions visible. Use it when a financial intention needs a date instead of staying as something you will do 'someday.'",
  },
  {
    route: "/community?view=circles",
    target: ".clara-community-shell-header a[title='My Circle']",
    eyebrow: "Private accountability",
    title: "My Circle",
    body: "My Circle gives you a smaller accountability space with people you choose. It is designed for groups that want to encourage each other, save together, and stay disciplined together.",
  },
  {
    route: "/community?view=challenges",
    target: ".clara-community-shell-header a[title='CLARA Challenges']",
    eyebrow: "Turn goals into action",
    title: "CLARA Challenges",
    body: "Challenges gives you structured weekly and monthly targets so progress has a clear finish line. Use it when you want a specific money behavior to practice consistently.",
  },
  {
    route: "/community?view=messages",
    target: ".clara-community-shell-header a[title='Messages']",
    eyebrow: "Private conversation",
    title: "Messages",
    body: "Messages lets you continue accountability privately when a conversation should not live on the public feed.",
  },
  {
    route: "/community?view=notifications",
    target: ".clara-community-shell-header a[title='Notifications']",
    eyebrow: "Stay connected",
    title: "Notifications",
    body: "Notifications collects important community activity such as reactions, comments, and messages so you can quickly see what needs your attention.",
  },
  {
    route: "/community?view=profile",
    target: ".clara-community-shell-header a[title='ME']",
    eyebrow: "Your CLARA identity",
    title: "ME / Profile",
    body: "Your profile is your personal identity inside the CLARA community. This is where your accountability presence, progress signals, badges, and profile information come together.",
  },
  {
    route: HOME_ROUTE,
    target: ".clara-community-shell-header a[title='Home']",
    eyebrow: "Guide complete",
    title: "You now know the CLARA system",
    body: "You have seen the current Home tools, every core finance card, Money Left, coaching, learning, and every Community section. The Guide button will now teach this version of CLARA instead of opening the old dashboard.",
    note: "CLARA remains fully usable outside the tour; this walkthrough is only an explanation layer.",
    complete: true,
  },
];

function getExpandedRect(rect) {
  if (!rect) return null;
  const pad = 7;
  const left = Math.max(6, rect.left - pad);
  const top = Math.max(6, rect.top - pad);
  const right = Math.min(window.innerWidth - 6, rect.right + pad);
  const bottom = Math.min(window.innerHeight - 6, rect.bottom + pad);

  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

export default function CommunityGuideTour({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
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

    const timers = [80, 260, 520].map((delay) => window.setTimeout(measureTarget, delay));
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [measureTarget, open, step?.scroll, step?.target]);

  const closeGuide = useCallback(
    ({ completed = false } = {}) => {
      const destination = completed ? HOME_ROUTE : startLocationRef.current || HOME_ROUTE;
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2147482500]" aria-hidden={false}>
      <div
        className={`absolute inset-0 ${targetRect ? "bg-transparent" : "bg-slate-950/82 backdrop-blur-[2px]"}`}
        onPointerDown={(event) => event.preventDefault()}
        onClick={(event) => event.preventDefault()}
      />

      {targetRect ? (
        <div
          className="pointer-events-none fixed rounded-[22px] border border-cyan-100/80 transition-all duration-300"
          style={{
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow:
              "0 0 0 9999px rgba(2,8,23,0.80), 0 0 0 3px rgba(34,211,238,0.18), 0 0 34px rgba(34,211,238,0.32)",
          }}
          aria-hidden="true"
        />
      ) : null}

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="clara-community-guide-title"
        className="absolute bottom-[max(18px,env(safe-area-inset-bottom))] left-1/2 w-[min(calc(100vw-28px),430px)] -translate-x-1/2 overflow-hidden rounded-[30px] border border-cyan-100/18 bg-[linear-gradient(145deg,rgba(5,18,37,0.985),rgba(10,24,54,0.985)_52%,rgba(31,19,72,0.985))] text-white shadow-[0_30px_100px_rgba(0,0,0,0.68),0_0_44px_rgba(34,211,238,0.16)] backdrop-blur-2xl"
      >
        <div className="h-1 bg-white/[0.07]">
          <div
            className="h-full rounded-r-full bg-[linear-gradient(90deg,#2dd4bf,#67e8f9,#818cf8)] transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="relative px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
          <button
            type="button"
            onClick={() => closeGuide()}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-white/58 transition hover:bg-white/[0.10] hover:text-white"
            aria-label="Exit CLARA Guide"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="pr-12">
            <div className="flex items-center gap-2 text-cyan-100/72">
              {step.complete ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              <p className="text-[9px] font-black uppercase tracking-[0.22em]">
                {step.eyebrow}
              </p>
            </div>
            <h2
              id="clara-community-guide-title"
              className="mt-2 text-[1.38rem] font-black leading-[1.08] tracking-[-0.04em] text-white"
            >
              {step.title}
            </h2>
          </div>

          <p className="mt-3 text-[13px] font-semibold leading-6 text-white/72">
            {step.body}
          </p>

          {step.bullets?.length ? (
            <div className="mt-3 grid gap-1.5 rounded-[20px] border border-white/[0.08] bg-white/[0.045] px-4 py-3">
              {step.bullets.map((bullet) => (
                <div key={bullet} className="flex items-start gap-2 text-[11px] font-bold leading-5 text-cyan-50/78">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200/70" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          ) : null}

          {step.note ? (
            <p className="mt-3 rounded-[18px] border border-cyan-100/10 bg-cyan-100/[0.055] px-3.5 py-3 text-[11px] font-bold leading-5 text-cyan-50/68">
              {step.note}
            </p>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-4 text-[10px] font-black uppercase tracking-[0.14em] text-white/64 transition disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <p className="shrink-0 text-[9px] font-black uppercase tracking-[0.16em] text-white/34">
              {stepIndex + 1} / {totalSteps}
            </p>

            <button
              type="button"
              onClick={goNext}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-cyan-100/20 bg-[linear-gradient(100deg,rgba(45,212,191,0.92),rgba(99,102,241,0.96))] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)] transition active:scale-[0.99]"
            >
              {step.complete ? "Finish" : "Next"}
              {!step.complete ? <ChevronRight className="h-4 w-4" /> : null}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
