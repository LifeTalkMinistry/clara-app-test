import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  House,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const HOME_ROUTE = "/community?view=home";
const GUIDE_PANEL_GAP = 10;
const GUIDE_VIEWPORT_MARGIN = 10;

const STEP_THEMES = {
  orientation: {
    accent: "#67e8f9",
    accent2: "#818cf8",
    glow: "rgba(103,232,249,0.24)",
    glowSoft: "rgba(129,140,248,0.10)",
  },
  discipline: {
    accent: "#5eead4",
    accent2: "#22d3ee",
    glow: "rgba(94,234,212,0.26)",
    glowSoft: "rgba(34,211,238,0.10)",
  },
  learning: {
    accent: "#7dd3fc",
    accent2: "#a78bfa",
    glow: "rgba(125,211,252,0.24)",
    glowSoft: "rgba(167,139,250,0.11)",
  },
  money: {
    accent: "#2dd4bf",
    accent2: "#6366f1",
    glow: "rgba(45,212,191,0.26)",
    glowSoft: "rgba(99,102,241,0.12)",
  },
  community: {
    accent: "#67e8f9",
    accent2: "#8b5cf6",
    glow: "rgba(103,232,249,0.24)",
    glowSoft: "rgba(139,92,246,0.12)",
  },
  schedule: {
    accent: "#93c5fd",
    accent2: "#67e8f9",
    glow: "rgba(147,197,253,0.24)",
    glowSoft: "rgba(103,232,249,0.10)",
  },
  circle: {
    accent: "#5eead4",
    accent2: "#818cf8",
    glow: "rgba(94,234,212,0.25)",
    glowSoft: "rgba(129,140,248,0.11)",
  },
  challenge: {
    accent: "#a7f3d0",
    accent2: "#60a5fa",
    glow: "rgba(167,243,208,0.23)",
    glowSoft: "rgba(96,165,250,0.11)",
  },
  communication: {
    accent: "#7dd3fc",
    accent2: "#c084fc",
    glow: "rgba(125,211,252,0.23)",
    glowSoft: "rgba(192,132,252,0.11)",
  },
  profile: {
    accent: "#c4b5fd",
    accent2: "#67e8f9",
    glow: "rgba(196,181,253,0.23)",
    glowSoft: "rgba(103,232,249,0.10)",
  },
  complete: {
    accent: "#5eead4",
    accent2: "#818cf8",
    glow: "rgba(94,234,212,0.27)",
    glowSoft: "rgba(129,140,248,0.12)",
  },
};

// The Guide follows the current CLARA product hierarchy instead of treating
// every small utility as a separate destination. Secondary controls are grouped
// into the feature surface they belong to, which keeps the walkthrough concise
// while still teaching the complete system.
const GUIDE_STEPS = [
  {
    route: HOME_ROUTE,
    target: ".clara-community-shell-header a[title='Home']",
    chapter: "Orientation",
    eyebrow: "Start here",
    title: "Your CLARA home base",
    body: "This is where your day starts: check your money habit, learn when you need clarity, then see your current financial picture.",
    benefit: "Guide Mode only points and navigates. It never writes to your real data.",
    note: "Your wallet, budget, savings, streak, posts, messages, schedule, and profile stay untouched.",
    theme: "orientation",
    icon: House,
    importance: "primary",
  },
  {
    route: HOME_ROUTE,
    target: "[data-clara-community-guide='daily-tip']",
    scroll: true,
    scrollBlock: "start",
    chapter: "Daily habit",
    eyebrow: "Your daily anchor",
    title: "Daily Money Tip + streak",
    body: "Open this once a day before spending. The reminder creates the pause; the streak makes your consistency visible.",
    bullets: ["Pause before spending", "Daily check-in", "Streak + 30-day progress"],
    benefit: "This is the small habit CLARA wants you to repeat every day.",
    theme: "discipline",
    icon: Flame,
    importance: "primary",
  },
  {
    route: HOME_ROUTE,
    target: "[data-clara-learning-hub-bridge='true']",
    scroll: true,
    chapter: "Support tools",
    eyebrow: "Learn or talk it through",
    title: "Learning Hub + coaching",
    body: "Learning Hub explains the money idea. The 30m calendar gives you a human coaching option when the situation needs more than another tip.",
    bullets: ["Learning Hub · self-guided", "30m · one-on-one coaching"],
    benefit: "Use a lesson for clarity; use coaching when you need accountability.",
    note: "Nothing is booked during Guide Mode.",
    theme: "learning",
    icon: BookOpen,
  },
  {
    route: HOME_ROUTE,
    target: [
      ".clara-production-guide-matched-carousel .clara-finance-slide-shell[data-visual-mode='full']",
      ".clara-community-home-financial-carousel .clara-finance-slide-shell",
    ],
    scroll: true,
    scrollBlock: "end",
    chapter: "Money system",
    eyebrow: "Your financial picture",
    title: "The six-part money system",
    body: "Swipe one card at a time to see where money comes from, where it sits, what is planned, and what still needs protection.",
    bullets: ["Income", "Wallet", "Budget", "Emergency Fund", "Savings", "Debt"],
    benefit: "The cards connect your money into one system instead of six disconnected screens.",
    theme: "money",
    icon: Wallet,
    importance: "primary",
    targetPad: 8,
  },
  {
    route: HOME_ROUTE,
    target: ".clara-community-home-money-left",
    scroll: true,
    scrollBlock: "end",
    chapter: "Quick decisions",
    eyebrow: "One glance before you spend",
    title: "Money Left + quick controls",
    body: "Before your next expense, this card answers the fast question: what is left right now? The controls beside it handle the quick follow-up actions.",
    bullets: [
      "Eye · hide amounts",
      "Calculator · check numbers",
      "Orb · 1 tap expense",
      "2 taps · transactions",
      "Hold · pause before buying",
    ],
    benefit: "One reality check and one control cluster for fast money decisions.",
    theme: "money",
    icon: Wallet,
    importance: "primary",
    targetPad: 8,
  },
  {
    route: "/community",
    target: ".clara-community-shell-header a[title='Feed']",
    chapter: "Accountability",
    eyebrow: "Do money with people",
    title: "Community Feed",
    body: "Use the Feed for real money wins, questions, struggles, and lessons—and respond to people working on the same habits.",
    bullets: ["Wins", "Questions", "Struggles", "Lessons", "Comments + support"],
    benefit: "The point is accountability, not another noisy social feed.",
    theme: "community",
    icon: UsersRound,
    importance: "primary",
  },
  {
    route: "/community",
    target: [
      ".clara-community-board",
      ".clara-community-shell-header a[title='Feed']",
    ],
    scroll: true,
    scrollBlock: "start",
    chapter: "Discovery",
    eyebrow: "Useful things worth seeing",
    title: "CLARA Board",
    body: "When Board cards are live, this area surfaces selected money facts, updates, and announcements without interrupting the rest of the Feed.",
    bullets: ["Swipe cards", "Tap deeper", "Sponsored is labeled"],
    benefit: "Useful discovery stays separate from member conversations.",
    theme: "community",
    icon: Sparkles,
  },
  {
    route: "/community",
    target: ".clara-community-composer",
    scroll: true,
    scrollBlock: "start",
    chapter: "Accountability",
    eyebrow: "Share with a reason",
    title: "Post with a purpose",
    body: "Share the moment that needs accountability: a win, question, struggle, or tip. Add media only when it helps the story.",
    bullets: ["Win", "Question", "Struggle", "Tip", "Photo / video / file"],
    benefit: "A good CLARA post helps you or someone else take the next money action.",
    note: "Nothing is published while the Guide is open.",
    theme: "community",
    icon: Send,
    importance: "primary",
    targetPad: 8,
  },
  {
    route: "/community?view=schedule",
    target: [
      ".clara-community-schedule-view > div > div > section",
      ".clara-community-schedule-view",
    ],
    scroll: true,
    scrollBlock: "end",
    chapter: "Planning",
    eyebrow: "Give money a date",
    title: "Schedule",
    body: "Use Schedule for bills, payday, goals, sessions, and events that may affect spending. CLARA helps you see pressure before the date arrives.",
    bullets: ["Calendar", "Money impact", "Upcoming pressure"],
    benefit: "A money intention becomes much harder to ignore once it has a date.",
    theme: "schedule",
    icon: CalendarDays,
    importance: "primary",
    targetPad: 8,
  },
  {
    route: "/community?view=circles",
    target: [
      ".clara-community-circles-view section",
      ".clara-community-shell-header a[title='My Circle']",
    ],
    scroll: true,
    scrollBlock: "start",
    chapter: "Private accountability",
    eyebrow: "Your people",
    title: "My Circle",
    body: "Build a smaller accountability space with people you choose—without automatically exposing balances, income, budgets, savings, or debt.",
    bullets: ["Private by default", "Shared goals", "Encouragement"],
    benefit: "Share the journey with people you trust, not your private numbers.",
    theme: "circle",
    icon: UsersRound,
    importance: "primary",
    targetPad: 8,
  },
  {
    route: "/community?view=challenges",
    target: [
      ".clara-community-challenges-view main section:nth-of-type(2)",
      ".clara-community-challenges-view main section",
      ".clara-community-shell-header a[title='CLARA Challenges']",
    ],
    scroll: true,
    scrollBlock: "end",
    chapter: "Momentum",
    eyebrow: "Put discipline into action",
    title: "CLARA Challenges",
    body: "Choose a weekly, monthly, or 30-day challenge, check in, and make discipline visible as progress toward a finish line.",
    bullets: ["Weekly", "Monthly", "30-Day", "Check-ins + progress"],
    benefit: "Small repeated wins become a money habit you can actually see.",
    theme: "challenge",
    icon: Trophy,
    importance: "primary",
    targetPad: 8,
  },
  {
    route: "/community?view=messages",
    target: [
      ".clara-community-shell-header a[title='Messages']",
      ".clara-community-shell-header a[title='Notifications']",
    ],
    targetMode: "union",
    chapter: "Follow-up",
    eyebrow: "Stay connected",
    title: "Messages + notifications",
    body: "Messages keeps accountability one-to-one. Notifications brings reactions, comments, and follow-ups back to you so conversations do not get lost.",
    bullets: ["Messages · private", "Notifications · activity", "Follow up"],
    benefit: "Public when useful; private when personal.",
    theme: "communication",
    icon: MessageCircle,
  },
  {
    route: "/community?view=profile",
    target: [
      ".clara-community-profile-view nav",
      ".clara-community-shell-header a[title='ME']",
    ],
    scroll: true,
    scrollBlock: "start",
    chapter: "Your identity",
    eyebrow: "Your story + progress",
    title: "ME / Profile",
    body: "ME brings together your story, money snapshot, goals, discipline, milestones, badges, and the privacy controls around what you share.",
    bullets: ["Overview", "Money", "Dreams", "Journey + progress"],
    benefit: "Your profile should show how your money life is changing—not just who you are.",
    theme: "profile",
    icon: UserRound,
    importance: "primary",
  },
  {
    route: HOME_ROUTE,
    target: ".clara-community-shell-header a[title='Home']",
    chapter: "Complete",
    eyebrow: "Walkthrough complete",
    title: "You're ready to use CLARA",
    body: "You now know the daily habit, money system, accountability tools, planning, challenges, and your personal progress space.",
    benefit: "Start with one action today: check in, review your Money Left, or ask before you spend.",
    theme: "complete",
    icon: CheckCircle2,
    complete: true,
    importance: "primary",
  },
];

function isVisibleElement(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect?.();
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

function getStepTargetElements(step) {
  if (typeof document === "undefined" || !step?.target) return [];
  const selectors = Array.isArray(step.target) ? step.target : [step.target];

  if (step.targetMode === "union") {
    const elements = [];
    selectors.forEach((selector) => {
      if (!selector) return;
      const element = document.querySelector(selector);
      if (isVisibleElement(element) && !elements.includes(element)) elements.push(element);
    });
    return elements;
  }

  for (const selector of selectors) {
    if (!selector) continue;
    const element = document.querySelector(selector);
    if (isVisibleElement(element)) return [element];
  }

  return [];
}

function getCombinedRect(elements, pad = 6) {
  if (!elements?.length || typeof window === "undefined") return null;
  const rects = elements
    .map((element) => element.getBoundingClientRect?.())
    .filter((rect) => rect && rect.width > 0 && rect.height > 0);

  if (!rects.length) return null;

  const rawLeft = Math.min(...rects.map((rect) => rect.left));
  const rawTop = Math.min(...rects.map((rect) => rect.top));
  const rawRight = Math.max(...rects.map((rect) => rect.right));
  const rawBottom = Math.max(...rects.map((rect) => rect.bottom));
  const safePad = Math.max(4, Number(pad) || 6);
  const left = Math.max(7, rawLeft - safePad);
  const top = Math.max(7, rawTop - safePad);
  const right = Math.min(window.innerWidth - 7, rawRight + safePad);
  const bottom = Math.min(window.innerHeight - 7, rawBottom + safePad);

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function getPanelPlacement(targetRect, panelWidth, panelHeight) {
  if (!targetRect || typeof window === "undefined") {
    return { top: null, side: "center", arrowLeft: null };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const safePanelWidth = Math.min(
    Math.max(1, Number(panelWidth) || 350),
    Math.max(1, viewportWidth - GUIDE_VIEWPORT_MARGIN * 2),
  );
  const safePanelHeight = Math.min(
    Math.max(1, Number(panelHeight) || 240),
    Math.max(1, viewportHeight - GUIDE_VIEWPORT_MARGIN * 2),
  );
  const belowTop = targetRect.bottom + GUIDE_PANEL_GAP;
  const aboveTop = targetRect.top - GUIDE_PANEL_GAP - safePanelHeight;
  const roomBelow = viewportHeight - GUIDE_VIEWPORT_MARGIN - targetRect.bottom;
  const roomAbove = targetRect.top - GUIDE_VIEWPORT_MARGIN;
  const panelLeft = Math.max(0, (viewportWidth - safePanelWidth) / 2);
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const arrowLeft = Math.min(
    safePanelWidth - 28,
    Math.max(28, targetCenterX - panelLeft),
  );

  if (roomBelow >= safePanelHeight + GUIDE_PANEL_GAP) {
    return {
      top: Math.max(GUIDE_VIEWPORT_MARGIN, belowTop),
      side: "below",
      arrowLeft,
    };
  }

  if (roomAbove >= safePanelHeight + GUIDE_PANEL_GAP) {
    return {
      top: Math.max(GUIDE_VIEWPORT_MARGIN, aboveTop),
      side: "above",
      arrowLeft,
    };
  }

  const targetCenterY = targetRect.top + targetRect.height / 2;
  const dockTop = GUIDE_VIEWPORT_MARGIN;
  const dockBottom = Math.max(
    GUIDE_VIEWPORT_MARGIN,
    viewportHeight - GUIDE_VIEWPORT_MARGIN - safePanelHeight,
  );

  if (targetCenterY >= viewportHeight / 2) {
    return { top: dockTop, side: "above", arrowLeft };
  }

  return { top: dockBottom, side: "below", arrowLeft };
}

export default function CommunityGuideTour({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [panelPlacement, setPanelPlacement] = useState({
    top: null,
    side: "center",
    arrowLeft: null,
  });
  const panelRef = useRef(null);
  const startLocationRef = useRef(HOME_ROUTE);
  const wasOpenRef = useRef(false);
  const scrolledStepRef = useRef(-1);
  const measureFrameRef = useRef(null);
  const step = GUIDE_STEPS[stepIndex] || GUIDE_STEPS[0];
  const totalSteps = GUIDE_STEPS.length;
  const theme = STEP_THEMES[step.theme] || STEP_THEMES.orientation;
  const StepIcon = step.icon || ShieldCheck;

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      startLocationRef.current = `${location.pathname}${location.search}` || HOME_ROUTE;
      setStepIndex(0);
      setTargetRect(null);
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

    const elements = getStepTargetElements(step);
    if (!elements.length) {
      setTargetRect(null);
      return;
    }

    if (step?.scroll && scrolledStepRef.current !== stepIndex) {
      scrolledStepRef.current = stepIndex;
      elements[0]?.scrollIntoView?.({
        behavior: "smooth",
        block: step.scrollBlock || "center",
        inline: "nearest",
      });
    }

    setTargetRect(getCombinedRect(elements, step.targetPad));
  }, [open, step, stepIndex]);

  const scheduleMeasure = useCallback(() => {
    if (typeof window === "undefined" || measureFrameRef.current) return;
    measureFrameRef.current = window.requestAnimationFrame(() => {
      measureFrameRef.current = null;
      measureTarget();
    });
  }, [measureTarget]);

  useEffect(() => {
    if (!open) return undefined;

    setTargetRect(null);
    scrolledStepRef.current = -1;
    const timers = [40, 140, 320, 650, 1100].map((delay) =>
      window.setTimeout(scheduleMeasure, delay),
    );
    scheduleMeasure();
    let mutationObserver = null;

    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(scheduleMeasure);
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "data-visual-mode"],
      });
    }

    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, true);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      if (measureFrameRef.current) {
        window.cancelAnimationFrame(measureFrameRef.current);
        measureFrameRef.current = null;
      }
      mutationObserver?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, true);
    };
  }, [open, scheduleMeasure, stepIndex]);

  const updatePanelPlacement = useCallback(() => {
    if (!open || !targetRect || typeof window === "undefined") {
      setPanelPlacement({ top: null, side: "center", arrowLeft: null });
      return;
    }

    const panelRect = panelRef.current?.getBoundingClientRect?.();
    setPanelPlacement(
      getPanelPlacement(
        targetRect,
        panelRect?.width || 350,
        panelRect?.height || 240,
      ),
    );
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
    return targetRect.height > window.innerHeight * 0.34 || targetRect.width > window.innerWidth * 0.86;
  }, [targetRect]);

  const panelStyle = useMemo(() => {
    const base = {
      borderColor: `${theme.accent}2f`,
      background: `radial-gradient(circle at 0% 0%, ${theme.glowSoft}, transparent 32%), radial-gradient(circle at 100% 0%, rgba(99,102,241,0.10), transparent 32%), linear-gradient(180deg, rgba(8,20,38,0.992), rgba(5,13,28,0.996))`,
      boxShadow: `0 24px 72px rgba(0,0,0,0.60), 0 0 34px ${theme.glowSoft}, inset 0 1px 0 rgba(255,255,255,0.06)`,
    };

    if (panelPlacement.top == null) {
      return {
        ...base,
        top: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    return {
      ...base,
      top: `${Math.round(panelPlacement.top)}px`,
      transform: "translateX(-50%)",
    };
  }, [panelPlacement.top, theme]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2147483500]" aria-hidden={false}>
      <div
        className={`absolute inset-0 ${
          targetRect ? "bg-transparent" : "bg-[#020817]/76 backdrop-blur-[2px]"
        }`}
        onPointerDown={(event) => event.preventDefault()}
        onClick={(event) => event.preventDefault()}
      />

      {targetRect ? (
        <>
          <div
            className={`pointer-events-none fixed transition-all duration-300 ${
              targetIsLarge ? "rounded-[28px]" : "rounded-[18px]"
            }`}
            style={{
              left: targetRect.left,
              top: targetRect.top,
              width: targetRect.width,
              height: targetRect.height,
              border: `1.5px solid ${theme.accent}c7`,
              background: "rgba(255,255,255,0.008)",
              boxShadow: targetIsLarge
                ? `0 0 0 9999px rgba(2,8,23,0.62), 0 0 0 2px ${theme.glowSoft}, 0 0 34px ${theme.glow}`
                : `0 0 0 9999px rgba(2,8,23,0.69), 0 0 0 2px ${theme.glowSoft}, 0 0 32px ${theme.glow}`,
            }}
            aria-hidden="true"
          />
          <div
            className={`pointer-events-none fixed ${targetIsLarge ? "rounded-[28px]" : "rounded-[18px]"}`}
            style={{
              left: targetRect.left + 3,
              top: targetRect.top + 3,
              width: Math.max(0, targetRect.width - 6),
              height: Math.max(0, targetRect.height - 6),
              boxShadow: `inset 0 0 0 1px ${theme.accent}35`,
            }}
            aria-hidden="true"
          />
        </>
      ) : null}

      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clara-community-guide-title"
        className="absolute left-1/2 max-h-[calc(100dvh-20px)] w-[min(calc(100vw-30px),356px)] overflow-y-auto rounded-[24px] border text-white backdrop-blur-2xl transition-[top] duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={panelStyle}
      >
        {targetRect && panelPlacement.side !== "center" ? (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute z-20 h-3 w-3 rotate-45 ${
              panelPlacement.side === "below"
                ? "-top-1.5 border-l border-t"
                : "-bottom-1.5 border-b border-r"
            }`}
            style={{
              left: panelPlacement.arrowLeft ?? "50%",
              marginLeft: "-6px",
              borderColor: `${theme.accent}4a`,
              background: "rgba(7,18,36,0.995)",
            }}
          />
        ) : null}

        <div className="relative overflow-hidden rounded-[24px]">
          <div
            className="pointer-events-none absolute inset-x-7 top-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme.accent}, ${theme.accent2}, transparent)`,
            }}
          />
          <div
            className="pointer-events-none absolute -right-14 -top-16 h-36 w-36 rounded-full blur-3xl"
            style={{ background: theme.glowSoft }}
          />
          <div
            className="pointer-events-none absolute -left-16 bottom-0 h-32 w-32 rounded-full blur-3xl"
            style={{ background: theme.glowSoft }}
          />

          <div className="relative px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em]"
                  style={{
                    borderColor: `${theme.accent}28`,
                    background: `${theme.accent}0d`,
                    color: theme.accent,
                  }}
                >
                  {step.complete ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  CLARA Guide
                </div>
                {step.importance === "primary" ? (
                  <span
                    className="hidden rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.14em] min-[360px]:inline-flex"
                    style={{
                      borderColor: `${theme.accent}20`,
                      color: `${theme.accent}b8`,
                      background: `${theme.accent}08`,
                    }}
                  >
                    Core
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tabular-nums tracking-[0.12em] text-white/38">
                  {String(stepIndex + 1).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => closeGuide()}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.04] text-white/48 transition hover:bg-white/[0.08] hover:text-white/82"
                  aria-label="Exit CLARA Guide"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-3 h-[2px] overflow-hidden rounded-full bg-white/[0.055]">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})`,
                  boxShadow: `0 0 12px ${theme.glow}`,
                }}
              />
            </div>

            <div className="mt-3.5 flex items-start gap-3">
              <div
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                style={{
                  borderColor: `${theme.accent}28`,
                  background: `linear-gradient(145deg, ${theme.accent}1d, ${theme.accent2}18)`,
                  color: theme.accent,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), 0 0 18px ${theme.glowSoft}`,
                }}
              >
                <StepIcon className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1 pr-5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p
                    className="text-[8px] font-black uppercase tracking-[0.18em]"
                    style={{ color: `${theme.accent}a8` }}
                  >
                    {step.eyebrow}
                  </p>
                  <span className="text-[7px] font-black uppercase tracking-[0.16em] text-white/24">
                    {step.chapter}
                  </span>
                </div>
                <h2
                  id="clara-community-guide-title"
                  className="mt-1 text-[1.13rem] font-black leading-[1.1] tracking-[-0.035em] text-white"
                >
                  {step.title}
                </h2>
              </div>
            </div>

            <p className="mt-3 text-[12px] font-semibold leading-[1.52] text-white/70">
              {step.body}
            </p>

            {step.bullets?.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {step.bullets.map((bullet) => (
                  <span
                    key={bullet}
                    className="rounded-full border px-2.5 py-1.5 text-[8.5px] font-bold leading-none"
                    style={{
                      borderColor: `${theme.accent}22`,
                      background: `${theme.accent}0b`,
                      color: "rgba(236,254,255,0.76)",
                    }}
                  >
                    {bullet}
                  </span>
                ))}
              </div>
            ) : null}

            {step.benefit ? (
              <div
                className="mt-3 rounded-[14px] border px-3 py-2.5"
                style={{
                  borderColor: `${theme.accent}20`,
                  background: `linear-gradient(135deg, ${theme.accent}0d, ${theme.accent2}09)`,
                }}
              >
                <p
                  className="text-[7px] font-black uppercase tracking-[0.17em]"
                  style={{ color: `${theme.accent}9f` }}
                >
                  Why it matters
                </p>
                <p className="mt-1 text-[10px] font-bold leading-[1.45] text-white/62">
                  {step.benefit}
                </p>
              </div>
            ) : null}

            {step.note ? (
              <p
                className="mt-3 border-l pl-3 text-[9.5px] font-semibold leading-[1.48] text-white/43"
                style={{ borderColor: `${theme.accent}4d` }}
              >
                {step.note}
              </p>
            ) : null}

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.055] pt-3">
              <button
                type="button"
                onClick={goBack}
                disabled={stepIndex === 0}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-full px-2 text-[9px] font-black uppercase tracking-[0.12em] text-white/48 transition hover:text-white/76 disabled:cursor-not-allowed disabled:opacity-20"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>

              <button
                type="button"
                onClick={goNext}
                className="inline-flex h-10 min-w-[98px] items-center justify-center gap-1.5 rounded-full border px-4 text-[9px] font-black uppercase tracking-[0.14em] text-white transition hover:brightness-110 active:scale-[0.985]"
                style={{
                  borderColor: `${theme.accent}42`,
                  background: `linear-gradient(110deg, ${theme.accent}, ${theme.accent2})`,
                  boxShadow: `0 10px 25px ${theme.glowSoft}, inset 0 1px 0 rgba(255,255,255,0.18)`,
                }}
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
