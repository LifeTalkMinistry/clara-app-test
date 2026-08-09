import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, LoaderCircle, ScrollText } from "lucide-react";
import DailyTipCard from "../daily-tip";
import ClaraGuideLearningHubInlineBubble from "../guide/ClaraGuideLearningHubInlineBubble";
import ClaraGuideLearningHubOverlay from "../guide/ClaraGuideLearningHubOverlay";
import ClaraGuideLearningHubPreview from "../guide/ClaraGuideLearningHubPreview";
import {
  openCommittedVersionModal,
  useCommittedFeatureAccess,
} from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";
import LearningHubToggleButton from "./ui/LearningHubToggleButton";

let learningHubModulePromise = null;

function loadLearningHubModule() {
  if (!learningHubModulePromise) {
    learningHubModulePromise = import("./LearningHubLoaded").catch((error) => {
      learningHubModulePromise = null;
      throw error;
    });
  }

  return learningHubModulePromise;
}

function preloadLearningHub() {
  return loadLearningHubModule().catch((error) => {
    console.warn("Learning Hub preload failed:", error?.message || error);
    return null;
  });
}

const LearningHubLoaded = lazy(loadLearningHubModule);

const LEARNING_HUB_PHASE_EVENT = "clara:guide-learning-hub-phase";
const GUIDE_MODE_CHANGE_EVENT = "clara:guide-mode-change";
const GUIDE_EXIT_EVENT = "clara:guide-exit";
const GUIDE_TARGET_CHANGE_EVENT = "clara:guide-target-change";
const GUIDE_FEATURE_COMPLETE_EVENT = "clara:guide-feature-complete";
const GUIDE_FEATURE_COACHING = "coaching-calendar";
const GUIDE_FEATURE_COMMUNITY = "community";
const GUIDE_COACHING_ROOT_CLASS = "clara-guide-coaching-active";

function getDashboardScrollRoot() {
  if (typeof document === "undefined") return null;

  return document.querySelector(
    "[data-clara-dashboard-scroll-root='true']",
  );
}

function restoreDashboardScrollPosition(scroller, scrollTop) {
  if (!scroller || typeof window === "undefined") return;

  const restore = () => {
    scroller.scrollTop = scrollTop;
  };

  window.requestAnimationFrame(() => {
    restore();

    window.requestAnimationFrame(() => {
      restore();
    });
  });
}

function ClaraGuideButton({ hasNewGuide = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="clara-learning-motion relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 overflow-visible rounded-full border border-cyan-200/15 bg-[rgba(6,18,38,0.62)] px-3 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-50/72 shadow-[0_10px_26px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl transition hover:border-cyan-200/28 hover:bg-white/[0.08] active:scale-[0.98]"
      aria-label="Open CLARA Guide Mode"
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.16),transparent_46%),radial-gradient(circle_at_bottom_right,rgba(129,140,248,0.14),transparent_50%)]" />
      <ScrollText className="relative z-10 h-3.5 w-3.5 text-cyan-100/70" />
      <span className="relative z-10 hidden sm:inline">Guide</span>
      {hasNewGuide ? (
        <span className="absolute -right-1.5 -top-2 z-20 rounded-full border border-cyan-100/25 bg-cyan-300 px-1.5 py-0.5 text-[7px] font-black leading-none tracking-[0.12em] text-slate-950 shadow-[0_8px_18px_rgba(34,211,238,0.28)]">
          GUIDE
        </span>
      ) : null}
    </button>
  );
}

function CoachingCalendarButton({ onClick, guideTarget = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-clara-coaching-calendar-button="true"
      data-clara-guide-coaching-target={guideTarget ? "true" : undefined}
      className={`clara-learning-motion relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-visible rounded-full border bg-[rgba(6,18,38,0.68)] text-cyan-50 shadow-[0_10px_26px_rgba(0,0,0,0.22),0_0_24px_rgba(34,211,238,0.10),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:border-cyan-200/36 hover:bg-white/[0.09] active:scale-[0.96] ${
        guideTarget
          ? "z-[180] border-cyan-100/80 ring-2 ring-cyan-200/80 ring-offset-2 ring-offset-slate-950/80 shadow-[0_0_36px_rgba(34,211,238,0.46)]"
          : "border-cyan-200/20"
      }`}
      aria-label="Open CLARA Coaching Calendar"
      title="CLARA Coaching Calendar"
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.24),transparent_52%)]" />
      <CalendarDays className="relative z-10 h-4 w-4 text-cyan-100/85" />
      <span className="absolute -right-2 -top-2 z-20 rounded-full border border-emerald-100/25 bg-emerald-300 px-1.5 py-0.5 text-[7px] font-black leading-none text-emerald-950 shadow-[0_8px_18px_rgba(52,211,153,0.28)]">
        30m
      </span>
    </button>
  );
}

function CoachingGuideBubble() {
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[240] w-[min(calc(100vw-44px),360px)] -translate-x-1/2"
      style={{ top: "clamp(100px, 13dvh, 138px)" }}
      role="dialog"
      aria-live="polite"
      aria-labelledby="clara-guide-coaching-title"
    >
      <div className="relative rounded-[28px] border border-cyan-100/24 bg-[linear-gradient(145deg,rgba(5,18,36,0.985),rgba(10,22,54,0.985)_52%,rgba(27,18,65,0.985))] px-5 py-5 text-white shadow-[0_22px_70px_rgba(0,0,0,0.72),0_0_44px_rgba(34,211,238,0.18)] backdrop-blur-2xl">
        <p id="clara-guide-coaching-title" className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">
          30-MIN COACHING
        </p>
        <p className="mt-3 text-[14px] font-bold leading-relaxed text-white">
          This small calendar orb opens CLARA Coaching when you want a focused one-on-one conversation about your money situation.
        </p>
        <p className="mt-3 border-t border-cyan-100/15 pt-3 text-[12px] font-black uppercase leading-relaxed tracking-[0.08em] text-cyan-100/90">
          TAP THE 30m CALENDAR ORB NOW.
        </p>
      </div>
    </div>
  );
}

function CoachingGuidePreview({ onNext }) {
  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-slate-950/84 px-4 py-6 backdrop-blur-lg" role="dialog" aria-modal="true" aria-labelledby="clara-guide-coaching-preview-title">
      <section className="w-full max-w-[360px] rounded-[28px] border border-cyan-100/22 bg-[linear-gradient(145deg,rgba(5,18,36,0.99),rgba(10,22,54,0.99)_52%,rgba(27,18,65,0.99))] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.62),0_0_42px_rgba(34,211,238,0.16)]">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100/20 bg-emerald-300/10 text-emerald-100">
          <CalendarDays className="h-5 w-5" />
        </div>
        <p className="mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/60">Guide preview · no booking is created</p>
        <h3 id="clara-guide-coaching-preview-title" className="mt-1.5 text-xl font-black tracking-[-0.03em]">CLARA Coaching Calendar</h3>
        <p className="mt-3 text-[13px] font-semibold leading-6 text-white/72">
          In the real screen, you can choose an available coaching time and a focus for the session. Use it when you need a human conversation for a money problem that deserves more than a quick app interaction.
        </p>
        <button
          type="button"
          onClick={onNext}
          className="mt-5 min-h-[46px] w-full rounded-full border border-cyan-100/30 bg-cyan-100/15 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-50 shadow-[0_12px_34px_rgba(34,211,238,0.16)] transition active:scale-[0.99]"
        >
          Next — Community
        </button>
      </section>
    </div>
  );
}

function DailyTipGuideBubble() {
  return (
    <div className="clara-guide-bubble-shell pointer-events-none absolute left-1/2 top-full z-[160] mt-2 w-[min(92vw,372px)] -translate-x-1/2 isolate">
      <div className="clara-guide-bubble-surface relative rounded-[30px] border px-6 py-5 text-white">
        <div className="clara-guide-bubble-arrow pointer-events-none absolute -top-2 left-11 h-4 w-4 rotate-45 border-l border-t" />
        <p className="relative z-10 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">
          Daily Money Tip
        </p>
        <p className="clara-guide-bubble-copy relative z-10 mt-3 text-[14px] font-bold leading-relaxed text-white">
          CLARA gives you one quick money reminder before you spend.
        </p>
      </div>
    </div>
  );
}

function LearningHubOpeningPlaceholder() {
  return (
    <div
      data-clara-learning-hub-opening="true"
      role="status"
      aria-live="polite"
      className="mx-auto flex min-h-10 w-fit items-center justify-center gap-2 rounded-full border border-cyan-100/15 bg-[rgba(6,18,38,0.68)] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50/72 shadow-[0_10px_26px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]"
    >
      <LoaderCircle className="h-4 w-4 animate-spin text-cyan-100/80" />
      <span>Opening Learning Hub</span>
    </div>
  );
}

function emitLearningHubPhase(phase) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(LEARNING_HUB_PHASE_EVENT, {
      detail: { phase },
    }),
  );
}

export default function LearningHub({
  isGuideMode = false,
  guideFeature = "",
  guideStep = 0,
  isDailyTipGuideActive = false,
  hasNewGuide = false,
  onOpenGuideIntro,
  onGuideDailyTipTap,
}) {
  const navigate = useNavigate();
  const [shouldLoadHub, setShouldLoadHub] = useState(false);
  const [learningHubGuidePhase, setLearningHubGuidePhase] = useState("inactive");
  const [coachingGuidePhase, setCoachingGuidePhase] = useState("inactive");
  const learningHubGuideEntryScrollRef = useRef(null);
  const realHasCommittedAccess = useCommittedFeatureAccess();
  const hasCommittedAccess = isGuideMode ? true : realHasCommittedAccess;
  const isLocked = !hasCommittedAccess;
  const isCarouselGuideActive = isGuideMode && guideFeature === "finance-carousel";
  const isLearningHubGuideActive =
    isGuideMode &&
    (learningHubGuidePhase === "await-open" || learningHubGuidePhase === "preview");
  const isLearningHubGuideAwaitOpen =
    isLearningHubGuideActive && learningHubGuidePhase === "await-open";
  const isLearningHubGuidePreview =
    isLearningHubGuideActive && learningHubGuidePhase === "preview";
  const isCoachingGuideActive =
    isGuideMode && coachingGuidePhase !== "inactive";
  const isCoachingGuideAwaitOpen =
    isCoachingGuideActive && coachingGuidePhase === "await-open";
  const isCoachingGuidePreview =
    isCoachingGuideActive && coachingGuidePhase === "preview";

  const handleCloseHub = useCallback(() => {
    setShouldLoadHub(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const root = document.documentElement;
    const resetLearningHubGuide = () => {
      learningHubGuideEntryScrollRef.current = null;
      setLearningHubGuidePhase("inactive");
      setShouldLoadHub(false);
    };
    const resetCoachingGuide = () => {
      setCoachingGuidePhase("inactive");
      root.classList.remove(GUIDE_COACHING_ROOT_CLASS);
    };
    const resetAllGuidePreviews = () => {
      resetLearningHubGuide();
      resetCoachingGuide();
    };

    const handleLearningHubPhase = (event) => {
      const phase = event?.detail?.phase;
      if (phase === "await-open") {
        learningHubGuideEntryScrollRef.current = null;
        setShouldLoadHub(false);
        setLearningHubGuidePhase("await-open");
        return;
      }

      if (phase === "preview") {
        setShouldLoadHub(true);
        setLearningHubGuidePhase("preview");
        return;
      }

      resetLearningHubGuide();
    };

    const handleTargetChange = (event) => {
      const feature = event?.detail?.feature;

      if (feature !== "learning-hub") {
        resetLearningHubGuide();
      }

      if (feature === GUIDE_FEATURE_COACHING) {
        setShouldLoadHub(false);
        setCoachingGuidePhase("await-open");
        root.classList.add(GUIDE_COACHING_ROOT_CLASS);
        window.setTimeout(() => {
          document
            .querySelector("[data-clara-coaching-calendar-button='true']")
            ?.scrollIntoView?.({ block: "center", behavior: "smooth" });
        }, 80);
        return;
      }

      if (feature !== GUIDE_FEATURE_COACHING) {
        resetCoachingGuide();
      }
    };

    window.addEventListener(LEARNING_HUB_PHASE_EVENT, handleLearningHubPhase);
    window.addEventListener(GUIDE_MODE_CHANGE_EVENT, resetAllGuidePreviews);
    window.addEventListener(GUIDE_EXIT_EVENT, resetAllGuidePreviews);
    window.addEventListener(GUIDE_TARGET_CHANGE_EVENT, handleTargetChange);

    return () => {
      learningHubGuideEntryScrollRef.current = null;
      root.classList.remove(GUIDE_COACHING_ROOT_CLASS);
      window.removeEventListener(LEARNING_HUB_PHASE_EVENT, handleLearningHubPhase);
      window.removeEventListener(GUIDE_MODE_CHANGE_EVENT, resetAllGuidePreviews);
      window.removeEventListener(GUIDE_EXIT_EVENT, resetAllGuidePreviews);
      window.removeEventListener(GUIDE_TARGET_CHANGE_EVENT, handleTargetChange);
    };
  }, []);

  useEffect(() => {
    if (
      isGuideMode ||
      isLocked ||
      shouldLoadHub ||
      typeof window === "undefined"
    ) {
      return undefined;
    }

    let cancelled = false;
    const warmLearningHub = () => {
      if (!cancelled) void preloadLearningHub();
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(warmLearningHub, { timeout: 1200 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = window.setTimeout(warmLearningHub, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isGuideMode, isLocked, shouldLoadHub]);

  const handleOpenCoachingCalendar = () => {
    if (isGuideMode) {
      if (isCoachingGuideAwaitOpen) {
        setCoachingGuidePhase("preview");
      }
      return;
    }

    navigate("/welcome-session");
  };

  const handleCoachingGuideNext = () => {
    if (!isCoachingGuidePreview || typeof window === "undefined") return;

    setCoachingGuidePhase("inactive");
    document.documentElement.classList.remove(GUIDE_COACHING_ROOT_CLASS);

    window.dispatchEvent(
      new CustomEvent(GUIDE_TARGET_CHANGE_EVENT, {
        detail: { feature: GUIDE_FEATURE_COMMUNITY },
      }),
    );
    window.dispatchEvent(
      new CustomEvent(GUIDE_FEATURE_COMPLETE_EVENT, {
        detail: { feature: GUIDE_FEATURE_COACHING },
      }),
    );
  };

  const handleOpenHub = () => {
    if (isGuideMode) {
      if (isLearningHubGuideAwaitOpen) {
        const dashboardScroller = getDashboardScrollRoot();

        learningHubGuideEntryScrollRef.current =
          Number(dashboardScroller?.scrollTop) || 0;

        setShouldLoadHub(true);
        setLearningHubGuidePhase("preview");
        emitLearningHubPhase("preview");
      }
      return;
    }

    if (isLocked) {
      openCommittedVersionModal();
      return;
    }

    void preloadLearningHub();
    setShouldLoadHub(true);
  };

  const handleGuideLearningHubNext = () => {
    if (!isLearningHubGuidePreview || typeof window === "undefined") {
      return;
    }

    const dashboardScroller = getDashboardScrollRoot();
    const savedScrollTop = learningHubGuideEntryScrollRef.current;
    const restoreScrollTop =
      savedScrollTop === null
        ? Number(dashboardScroller?.scrollTop) || 0
        : Number(savedScrollTop) || 0;

    setShouldLoadHub(false);
    setLearningHubGuidePhase("inactive");
    emitLearningHubPhase("inactive");

    window.dispatchEvent(
      new CustomEvent(GUIDE_TARGET_CHANGE_EVENT, {
        detail: {
          feature: "finance-carousel",
        },
      }),
    );

    restoreDashboardScrollPosition(
      dashboardScroller,
      restoreScrollTop,
    );
    learningHubGuideEntryScrollRef.current = null;
  };

  return (
    <section
      data-clara-guide-learning-hub-section="true"
      className="clara-budget-focus-shift clara-budget-focus-hub w-full"
    >
      {isCoachingGuideActive ? (
        <style>{`
          html.${GUIDE_COACHING_ROOT_CLASS} .clara-guide-carousel-bubble-shell {
            display: none !important;
          }
        `}</style>
      ) : null}

      {isCoachingGuideAwaitOpen ? <CoachingGuideBubble /> : null}
      {isCoachingGuidePreview ? <CoachingGuidePreview onNext={handleCoachingGuideNext} /> : null}

      <div className="relative flex w-full flex-col gap-[var(--clara-hub-rail-gap,14px)] overflow-visible px-1 py-0">
        <div
          className={`${isDailyTipGuideActive ? "relative z-[150] isolate" : "relative"} ${
            isCarouselGuideActive ? "clara-guide-daily-tip-muted" : ""
          } overflow-visible`}
        >
          <DailyTipCard
            hasCommittedAccess={hasCommittedAccess}
            onOpenCommitmentBooklet={openCommittedVersionModal}
            flushSpacing
            isGuideMode={isGuideMode}
            guideStep={guideStep}
            isDailyTipGuideActive={isDailyTipGuideActive}
            onGuideDailyTipTap={onGuideDailyTipTap}
          />

          {isDailyTipGuideActive ? <DailyTipGuideBubble /> : null}
        </div>

        {!shouldLoadHub ? (
          <div
            data-clara-learning-hub-bridge="true"
            className={`relative grid w-full items-center ${isCoachingGuideActive ? "z-[150] isolate" : ""}`}
            style={{ gridTemplateColumns: "1fr auto 1fr" }}
          >
            {!isGuideMode || isCoachingGuideActive ? (
              <div
                className="clara-guide-float mr-1.5 justify-self-end"
                style={{ animationDelay: "-0.5s" }}
              >
                <CoachingCalendarButton
                  onClick={handleOpenCoachingCalendar}
                  guideTarget={isCoachingGuideAwaitOpen}
                />
              </div>
            ) : (
              <span aria-hidden="true" />
            )}

            <LearningHubToggleButton
              isExpanded={false}
              isLocked={isLocked}
              isInsideCategory={false}
              headerLabel="Learning Hub"
              onClick={handleOpenHub}
              flushSpacing
              guideTarget={isLearningHubGuideAwaitOpen}
            />

            {!isGuideMode ? (
              <div className="clara-guide-float ml-1.5 justify-self-start">
                <ClaraGuideButton hasNewGuide={hasNewGuide} onClick={onOpenGuideIntro} />
              </div>
            ) : (
              <span aria-hidden="true" />
            )}
          </div>
        ) : isLearningHubGuidePreview ? (
          <div
            data-clara-guide-learning-hub-preview-stack="true"
            className="flex w-full flex-col"
          >
            <ClaraGuideLearningHubPreview flushSpacing />

            <ClaraGuideLearningHubInlineBubble
              onNext={handleGuideLearningHubNext}
            />
          </div>
        ) : (
          <Suspense fallback={<LearningHubOpeningPlaceholder />}>
            <LearningHubLoaded
              initialExpanded
              flushSpacing={true}
              onCollapse={handleCloseHub}
            />
          </Suspense>
        )}

        {isLearningHubGuideAwaitOpen ? (
          <ClaraGuideLearningHubOverlay phase="await-open" />
        ) : null}
      </div>
    </section>
  );
}
