import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Capacitor } from "@capacitor/core";
import { CalendarClock, ScrollText } from "lucide-react";
import DailyTipCard from "../daily-tip";
import ClaraGuideLearningHubInlineBubble from "../guide/ClaraGuideLearningHubInlineBubble";
import ClaraGuideLearningHubOverlay from "../guide/ClaraGuideLearningHubOverlay";
import ClaraGuideLearningHubPreview from "../guide/ClaraGuideLearningHubPreview";
import {
  openCommittedVersionModal,
  useCommittedFeatureAccess,
} from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";
import { WELCOME_SESSION_FORM_URL } from "@/lib/welcome-session-schedule";
import GuidedOnboardingIntroDialog from "./ui/GuidedOnboardingIntroDialog";
import LearningHubToggleButton from "./ui/LearningHubToggleButton";

const LearningHubLoaded = lazy(() => import("./LearningHubLoaded"));

const LEARNING_HUB_PHASE_EVENT = "clara:guide-learning-hub-phase";
const GUIDE_MODE_CHANGE_EVENT = "clara:guide-mode-change";
const GUIDE_EXIT_EVENT = "clara:guide-exit";
const GUIDE_TARGET_CHANGE_EVENT = "clara:guide-target-change";

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

function openWelcomeSessionForm(url) {
  const safeUrl = String(url || "").trim();
  if (!safeUrl || typeof window === "undefined") return false;

  if (Capacitor.isNativePlatform()) {
    // Capacitor Android hands external top-level navigations to ACTION_VIEW,
    // which opens the device browser instead of relying on unsupported popups.
    window.location.assign(safeUrl);
    return true;
  }

  try {
    const popup = window.open(safeUrl, "_blank");
    if (popup) {
      try {
        popup.opener = null;
      } catch {
        // The new tab is already isolated by the browser when opener is unavailable.
      }
      return true;
    }
  } catch {
    // Fall through to a same-tab navigation when the browser blocks popups.
  }

  window.location.assign(safeUrl);
  return true;
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

function GuidedOnboardingButton({ onClick, buttonRef, isOpen = false }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      data-clara-guided-onboarding-button="true"
      className="clara-learning-motion relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-visible rounded-full border border-cyan-200/20 bg-[rgba(6,18,38,0.68)] text-cyan-50 shadow-[0_10px_26px_rgba(0,0,0,0.22),0_0_24px_rgba(34,211,238,0.10),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:border-cyan-200/36 hover:bg-white/[0.09] active:scale-[0.96]"
      aria-label="Learn about CLARA Guided Onboarding"
      aria-expanded={isOpen}
      aria-controls="clara-guided-onboarding-title"
      title="CLARA Guided Onboarding"
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.24),transparent_52%)]" />
      <CalendarClock className="relative z-10 h-4 w-4 text-cyan-100/85" />
      <span className="absolute -right-2 -top-2 z-20 rounded-full border border-emerald-100/25 bg-emerald-300 px-1.5 py-0.5 text-[7px] font-black leading-none text-emerald-950 shadow-[0_8px_18px_rgba(52,211,153,0.28)]">
        30m
      </span>
    </button>
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
  const [shouldLoadHub, setShouldLoadHub] = useState(false);
  const [learningHubGuidePhase, setLearningHubGuidePhase] = useState("inactive");
  const [isGuidedOnboardingIntroOpen, setIsGuidedOnboardingIntroOpen] =
    useState(false);
  const learningHubGuideEntryScrollRef = useRef(null);
  const guidedOnboardingButtonRef = useRef(null);
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

  const closeGuidedOnboardingIntro = useCallback(
    ({ restoreFocus = true } = {}) => {
      setIsGuidedOnboardingIntroOpen(false);

      if (!restoreFocus || typeof window === "undefined") return;

      window.requestAnimationFrame(() => {
        try {
          guidedOnboardingButtonRef.current?.focus({ preventScroll: true });
        } catch {
          guidedOnboardingButtonRef.current?.focus();
        }
      });
    },
    [],
  );

  const handleCloseHub = useCallback(() => {
    setShouldLoadHub(false);
  }, []);

  useEffect(() => {
    if (!isGuideMode && !shouldLoadHub) return;
    setIsGuidedOnboardingIntroOpen(false);
  }, [isGuideMode, shouldLoadHub]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const resetGuidePreview = () => {
      learningHubGuideEntryScrollRef.current = null;
      setLearningHubGuidePhase("inactive");
      setShouldLoadHub(false);
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

      resetGuidePreview();
    };

    const handleGuideModeChange = () => {
      resetGuidePreview();
    };

    const handleTargetChange = (event) => {
      if (event?.detail?.feature !== "learning-hub") {
        resetGuidePreview();
      }
    };

    window.addEventListener(LEARNING_HUB_PHASE_EVENT, handleLearningHubPhase);
    window.addEventListener(GUIDE_MODE_CHANGE_EVENT, handleGuideModeChange);
    window.addEventListener(GUIDE_EXIT_EVENT, resetGuidePreview);
    window.addEventListener(GUIDE_TARGET_CHANGE_EVENT, handleTargetChange);

    return () => {
      learningHubGuideEntryScrollRef.current = null;
      window.removeEventListener(LEARNING_HUB_PHASE_EVENT, handleLearningHubPhase);
      window.removeEventListener(GUIDE_MODE_CHANGE_EVENT, handleGuideModeChange);
      window.removeEventListener(GUIDE_EXIT_EVENT, resetGuidePreview);
      window.removeEventListener(GUIDE_TARGET_CHANGE_EVENT, handleTargetChange);
    };
  }, []);

  const handleGuidedOnboardingClick = () => {
    setIsGuidedOnboardingIntroOpen(true);
  };

  const handleOpenGuidedOnboardingForm = () => {
    if (!openWelcomeSessionForm(WELCOME_SESSION_FORM_URL)) return;
    closeGuidedOnboardingIntro({ restoreFocus: false });
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
            className="relative grid w-full items-center"
            style={{ gridTemplateColumns: "1fr auto 1fr" }}
          >
            {!isGuideMode ? (
              <div
                className="clara-guide-float mr-1.5 justify-self-end"
                style={{ animationDelay: "-0.5s" }}
              >
                <GuidedOnboardingButton
                  buttonRef={guidedOnboardingButtonRef}
                  isOpen={isGuidedOnboardingIntroOpen}
                  onClick={handleGuidedOnboardingClick}
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
          <Suspense fallback={null}>
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

      <GuidedOnboardingIntroDialog
        open={isGuidedOnboardingIntroOpen && !isGuideMode && !shouldLoadHub}
        onClose={closeGuidedOnboardingIntro}
        onContinue={handleOpenGuidedOnboardingForm}
      />
    </section>
  );
}
