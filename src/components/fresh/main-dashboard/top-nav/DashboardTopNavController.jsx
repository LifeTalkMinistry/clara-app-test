import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardTopNav from "@/components/fresh/main-dashboard/top-nav/DashboardTopNav";

const CLARA_GUIDE_EXIT_EVENT = "clara:guide-exit";
const CLARA_GUIDE_MODE_CHANGE_EVENT = "clara:guide-mode-change";
const CLARA_GUIDE_TARGET_CHANGE_EVENT = "clara:guide-target-change";
const CLARA_GUIDE_FEATURE_COMPLETE_EVENT = "clara:guide-feature-complete";
const CLARA_GUIDE_SCHEDULE_PHASE_CHANGE_EVENT = "clara:guide-schedule-phase-change";
const CLARA_GUIDE_SCHEDULE_PHASE_REQUEST_EVENT = "clara:guide-schedule-phase-request";
const GUIDE_FEATURE_MONEY_LEFT_ORB = "money-left-orb";
const GUIDE_FEATURE_COACHING = "coaching-calendar";
const GUIDE_FEATURE_COMMUNITY = "community";
const GUIDE_FEATURE_SCHEDULE = "schedule";
const GUIDE_COACHING_ROOT_CLASS = "clara-guide-coaching-active";
const GUIDE_COMMUNITY_AWAIT_ROOT_CLASS = "clara-guide-community-await-active";
const GUIDE_COMMUNITY_PREVIEW_ROOT_CLASS = "clara-guide-community-preview-active";

const COMMUNITY_GUIDE_PHASES = {
  INACTIVE: "inactive",
  AWAIT_COMMUNITY_TAB: "await-community-tab",
  PREVIEW: "preview",
};

const SCHEDULE_GUIDE_PHASES = {
  INACTIVE: "inactive",
  AWAIT_SCHEDULE_TAB: "await-schedule-tab",
  AGENDA_OVERVIEW: "agenda-overview",
  CALENDAR_OVERVIEW: "calendar-overview",
  SELECT_DATE: "select-date",
  DATE_SELECTED: "date-selected",
  DOUBLE_TAP_DATE: "double-tap-date",
  SETUP_EVENT: "setup-event",
  EVENT_SAVED: "event-saved",
  OPEN_EVENT_DETAILS: "open-event-details",
  EVENT_DETAILS: "event-details",
  COMPLETE: "complete",
};

const SCHEDULE_GUIDE_ROOT_CLASS_BY_PHASE = {
  [SCHEDULE_GUIDE_PHASES.AWAIT_SCHEDULE_TAB]: "clara-guide-schedule-await-active",
  [SCHEDULE_GUIDE_PHASES.AGENDA_OVERVIEW]: "clara-guide-schedule-agenda-active",
  [SCHEDULE_GUIDE_PHASES.CALENDAR_OVERVIEW]: "clara-guide-schedule-calendar-active",
  [SCHEDULE_GUIDE_PHASES.SELECT_DATE]: "clara-guide-schedule-select-date-active",
  [SCHEDULE_GUIDE_PHASES.DATE_SELECTED]: "clara-guide-schedule-date-selected-active",
  [SCHEDULE_GUIDE_PHASES.DOUBLE_TAP_DATE]: "clara-guide-schedule-double-tap-active",
  [SCHEDULE_GUIDE_PHASES.SETUP_EVENT]: "clara-guide-schedule-setup-active",
  [SCHEDULE_GUIDE_PHASES.EVENT_SAVED]: "clara-guide-schedule-event-saved-active",
  [SCHEDULE_GUIDE_PHASES.OPEN_EVENT_DETAILS]: "clara-guide-schedule-open-details-active",
  [SCHEDULE_GUIDE_PHASES.EVENT_DETAILS]: "clara-guide-schedule-details-active",
};

const SCHEDULE_GUIDE_ROOT_CLASSES = Object.values(
  SCHEDULE_GUIDE_ROOT_CLASS_BY_PHASE
);

const GUIDE_ROOT_FEATURE_CLASSES = [
  "clara-guide-finance-carousel-active",
  "clara-guide-money-left-active",
  "clara-guide-money-left-privacy-active",
  "clara-guide-money-calculator-active",
  "clara-guide-money-left-orb-active",
];

function ClaraGuideCommunityNavigationBubble() {
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[240] w-[min(calc(100vw-40px),360px)] -translate-x-1/2"
      style={{ top: "clamp(112px, 15dvh, 150px)" }}
    >
      <div
        role="dialog"
        aria-live="polite"
        aria-labelledby="clara-guide-community-navigation-title"
        className="relative rounded-[28px] border border-cyan-100/24 bg-[linear-gradient(145deg,rgba(5,18,36,0.98),rgba(10,22,54,0.98)_52%,rgba(27,18,65,0.98))] px-5 py-5 text-white shadow-[0_22px_70px_rgba(0,0,0,0.72),0_0_44px_rgba(34,211,238,0.18)] backdrop-blur-2xl"
      >
        <div className="pointer-events-none absolute -top-2 left-[37.5%] h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-cyan-100/24 bg-[rgba(8,20,45,0.98)]" />
        <p
          id="clara-guide-community-navigation-title"
          className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100"
        >
          COMMUNITY
        </p>
        <p className="mt-3 text-[14px] font-bold leading-relaxed text-white">
          CLARA Community is your accountability space—where members can share money wins, questions, struggles, and lessons together.
        </p>
        <p className="mt-3 border-t border-cyan-100/15 pt-3 text-[12px] font-black uppercase leading-relaxed tracking-[0.08em] text-cyan-100/90">
          TAP COMMUNITY NOW.
        </p>
      </div>
    </div>
  );
}

function ClaraGuideCommunityPreview({ onNext }) {
  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="clara-guide-community-preview-title">
      <section className="w-full max-w-[370px] rounded-[30px] border border-cyan-100/22 bg-[linear-gradient(145deg,rgba(5,18,36,0.99),rgba(10,22,54,0.99)_52%,rgba(27,18,65,0.99))] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.70),0_0_42px_rgba(34,211,238,0.16)] backdrop-blur-2xl">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/60">
          Safe Community preview
        </p>
        <h3 id="clara-guide-community-preview-title" className="mt-1.5 text-xl font-black tracking-[-0.03em]">
          Accountability does not have to be solo.
        </h3>
        <p className="mt-3 text-[13px] font-semibold leading-6 text-white/72">
          The real Community is an online member space. Guide Mode will not publish, react, message anyone, or change your profile.
        </p>

        <div className="mt-4 grid gap-2">
          {[
            ["Share", "Win · Question · Struggle · Money Lesson"],
            ["Connect", "React, comment, and privately message members"],
            ["Accountability", "Build closer circles around shared money goals"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-cyan-100/10 bg-white/[0.045] px-3 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/58">{label}</p>
              <p className="mt-1 text-[12px] font-bold leading-5 text-white/88">{value}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onNext}
          className="mt-5 min-h-[46px] w-full rounded-full border border-cyan-100/30 bg-cyan-100/15 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-50 shadow-[0_12px_34px_rgba(34,211,238,0.16)] transition active:scale-[0.99]"
        >
          Next — Schedule
        </button>
      </section>
    </div>
  );
}

function ClaraGuideScheduleNavigationBubble() {
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[240] w-[min(calc(100vw-40px),360px)] -translate-x-1/2"
      style={{ top: "clamp(112px, 15dvh, 150px)" }}
    >
      <div
        role="dialog"
        aria-live="polite"
        aria-labelledby="clara-guide-schedule-navigation-title"
        className="relative rounded-[28px] border border-cyan-100/24 bg-[linear-gradient(145deg,rgba(5,18,36,0.98),rgba(10,22,54,0.98)_52%,rgba(27,18,65,0.98))] px-5 py-5 text-white shadow-[0_22px_70px_rgba(0,0,0,0.72),0_0_44px_rgba(34,211,238,0.18)] backdrop-blur-2xl"
      >
        <div className="pointer-events-none absolute -top-2 left-[62.5%] h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-cyan-100/24 bg-[rgba(8,20,45,0.98)]" />
        <p
          id="clara-guide-schedule-navigation-title"
          className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100"
        >
          SCHEDULE
        </p>
        <p className="mt-3 text-[14px] font-bold leading-relaxed text-white">
          This is where CLARA turns upcoming plans into money-aware reminders before the day arrives.
        </p>
        <p className="mt-3 border-t border-cyan-100/15 pt-3 text-[12px] font-black uppercase leading-relaxed tracking-[0.08em] text-cyan-100/90">
          TAP SCHEDULE NOW.
        </p>
      </div>
    </div>
  );
}

export default function DashboardTopNavController({
  activeDashboardPanel,
  openDashboardPanel,
  headerQuickActions = [],
  ...topNavVisualProps
}) {
  const navigate = useNavigate();
  const [guideActive, setGuideActive] = useState(false);
  const [communityGuidePhase, setCommunityGuidePhase] = useState(
    COMMUNITY_GUIDE_PHASES.INACTIVE
  );
  const [scheduleGuidePhase, setScheduleGuidePhase] = useState(
    SCHEDULE_GUIDE_PHASES.INACTIVE
  );

  const isAwaitingCommunityTab =
    communityGuidePhase === COMMUNITY_GUIDE_PHASES.AWAIT_COMMUNITY_TAB;
  const isCommunityPreviewVisible =
    communityGuidePhase === COMMUNITY_GUIDE_PHASES.PREVIEW;
  const isAwaitingScheduleTab =
    scheduleGuidePhase === SCHEDULE_GUIDE_PHASES.AWAIT_SCHEDULE_TAB;
  const isSchedulePageVisible =
    scheduleGuidePhase !== SCHEDULE_GUIDE_PHASES.INACTIVE &&
    scheduleGuidePhase !== SCHEDULE_GUIDE_PHASES.AWAIT_SCHEDULE_TAB;

  const exitGuide = useCallback(() => {
    setGuideActive(false);
    setCommunityGuidePhase(COMMUNITY_GUIDE_PHASES.INACTIVE);
    setScheduleGuidePhase(SCHEDULE_GUIDE_PHASES.INACTIVE);
    openDashboardPanel("home");

    if (typeof document !== "undefined") {
      document.documentElement.classList.remove(
        GUIDE_COACHING_ROOT_CLASS,
        GUIDE_COMMUNITY_AWAIT_ROOT_CLASS,
        GUIDE_COMMUNITY_PREVIEW_ROOT_CLASS,
      );
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(CLARA_GUIDE_EXIT_EVENT));
    }
  }, [openDashboardPanel]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleGuideModeChange = (event) => {
      const active = Boolean(event?.detail?.active);
      setGuideActive(active);
      if (!active) {
        setCommunityGuidePhase(COMMUNITY_GUIDE_PHASES.INACTIVE);
        setScheduleGuidePhase(SCHEDULE_GUIDE_PHASES.INACTIVE);
      }
    };

    const startCoachingGuide = () => {
      GUIDE_ROOT_FEATURE_CLASSES.forEach((className) => {
        document.documentElement.classList.remove(className);
      });
      setCommunityGuidePhase(COMMUNITY_GUIDE_PHASES.INACTIVE);
      document.documentElement.classList.add(GUIDE_COACHING_ROOT_CLASS);
      window.dispatchEvent(
        new CustomEvent(CLARA_GUIDE_TARGET_CHANGE_EVENT, {
          detail: { feature: GUIDE_FEATURE_COACHING },
        })
      );
    };

    const startCommunityGuide = () => {
      document.documentElement.classList.remove(GUIDE_COACHING_ROOT_CLASS);
      setCommunityGuidePhase(COMMUNITY_GUIDE_PHASES.AWAIT_COMMUNITY_TAB);
    };

    const handleGuideFeatureComplete = (event) => {
      const completedFeature = event?.detail?.feature;

      if (completedFeature === GUIDE_FEATURE_MONEY_LEFT_ORB) {
        startCoachingGuide();
        return;
      }

      if (completedFeature === GUIDE_FEATURE_COACHING) {
        startCommunityGuide();
        return;
      }

      if (completedFeature === GUIDE_FEATURE_COMMUNITY) {
        setCommunityGuidePhase(COMMUNITY_GUIDE_PHASES.INACTIVE);
        setScheduleGuidePhase(SCHEDULE_GUIDE_PHASES.AWAIT_SCHEDULE_TAB);
        return;
      }

      if (completedFeature === GUIDE_FEATURE_SCHEDULE) {
        exitGuide();
      }
    };

    const handleTargetChange = (event) => {
      const feature = event?.detail?.feature;
      if (feature === GUIDE_FEATURE_COMMUNITY) {
        startCommunityGuide();
      }
    };

    const handleScheduleGuidePhaseRequest = (event) => {
      const requestedPhase = event?.detail?.phase;
      if (!Object.values(SCHEDULE_GUIDE_PHASES).includes(requestedPhase)) return;
      setScheduleGuidePhase(requestedPhase);
    };

    window.addEventListener(CLARA_GUIDE_MODE_CHANGE_EVENT, handleGuideModeChange);
    window.addEventListener(
      CLARA_GUIDE_FEATURE_COMPLETE_EVENT,
      handleGuideFeatureComplete
    );
    window.addEventListener(CLARA_GUIDE_TARGET_CHANGE_EVENT, handleTargetChange);
    window.addEventListener(
      CLARA_GUIDE_SCHEDULE_PHASE_REQUEST_EVENT,
      handleScheduleGuidePhaseRequest
    );

    return () => {
      window.removeEventListener(
        CLARA_GUIDE_MODE_CHANGE_EVENT,
        handleGuideModeChange
      );
      window.removeEventListener(
        CLARA_GUIDE_FEATURE_COMPLETE_EVENT,
        handleGuideFeatureComplete
      );
      window.removeEventListener(CLARA_GUIDE_TARGET_CHANGE_EVENT, handleTargetChange);
      window.removeEventListener(
        CLARA_GUIDE_SCHEDULE_PHASE_REQUEST_EVENT,
        handleScheduleGuidePhaseRequest
      );
    };
  }, [exitGuide]);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return undefined;
    }

    const root = document.documentElement;
    root.classList.toggle(
      GUIDE_COMMUNITY_AWAIT_ROOT_CLASS,
      isAwaitingCommunityTab
    );
    root.classList.toggle(
      GUIDE_COMMUNITY_PREVIEW_ROOT_CLASS,
      isCommunityPreviewVisible
    );

    SCHEDULE_GUIDE_ROOT_CLASSES.forEach((className) => root.classList.remove(className));
    const activeScheduleClass =
      SCHEDULE_GUIDE_ROOT_CLASS_BY_PHASE[scheduleGuidePhase];
    if (activeScheduleClass) root.classList.add(activeScheduleClass);

    window.dispatchEvent(
      new CustomEvent(CLARA_GUIDE_SCHEDULE_PHASE_CHANGE_EVENT, {
        detail: { phase: scheduleGuidePhase },
      })
    );

    return () => {
      root.classList.remove(
        GUIDE_COMMUNITY_AWAIT_ROOT_CLASS,
        GUIDE_COMMUNITY_PREVIEW_ROOT_CLASS,
        ...SCHEDULE_GUIDE_ROOT_CLASSES
      );
    };
  }, [isAwaitingCommunityTab, isCommunityPreviewVisible, scheduleGuidePhase]);

  const handleCommunityGuideNext = useCallback(() => {
    if (!isCommunityPreviewVisible || typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent(CLARA_GUIDE_FEATURE_COMPLETE_EVENT, {
        detail: { feature: GUIDE_FEATURE_COMMUNITY },
      })
    );
  }, [isCommunityPreviewVisible]);

  const handleSelect = useCallback(
    (selection) => {
      if (selection === "guide-exit") {
        exitGuide();
        return;
      }

      if (!guideActive) {
        if (selection === "community") {
          navigate("/community");
          return;
        }

        openDashboardPanel(selection);
        return;
      }

      if (isAwaitingCommunityTab && selection === "community") {
        setCommunityGuidePhase(COMMUNITY_GUIDE_PHASES.PREVIEW);
        return;
      }

      if (isAwaitingScheduleTab && selection === "schedule") {
        openDashboardPanel("schedule");
        setScheduleGuidePhase(SCHEDULE_GUIDE_PHASES.AGENDA_OVERVIEW);
      }
    }, [
      exitGuide,
      guideActive,
      isAwaitingCommunityTab,
      isAwaitingScheduleTab,
      navigate,
      openDashboardPanel,
    ]
  );

  const navItems = useMemo(() => {
    if (!guideActive) return headerQuickActions;

    return headerQuickActions.map((item) => {
      if (item.key === "settings") {
        return {
          ...item,
          selectKey: "guide-exit",
          label: "Exit",
          ariaLabel: "Exit CLARA Guide Mode",
          icon: X,
          badge: null,
          forceActive: true,
          isAction: true,
          dataGuideExit: true,
        };
      }

      const highlighted =
        (isAwaitingCommunityTab && item.key === "community") ||
        (isAwaitingScheduleTab && item.key === "schedule");
      const forceActive =
        (isCommunityPreviewVisible && item.key === "community") ||
        (isSchedulePageVisible &&
          item.key === "schedule" &&
          activeDashboardPanel === "schedule");

      return {
        ...item,
        highlighted,
        forceActive,
        disabled: !highlighted,
        dataGuideScheduleTarget:
          isAwaitingScheduleTab && item.key === "schedule",
      };
    });
  }, [
    activeDashboardPanel,
    guideActive,
    headerQuickActions,
    isAwaitingCommunityTab,
    isAwaitingScheduleTab,
    isCommunityPreviewVisible,
    isSchedulePageVisible,
  ]);

  return (
    <>
      <style>{`
        html.${GUIDE_COACHING_ROOT_CLASS} .clara-guide-carousel-bubble-shell,
        html.${GUIDE_COMMUNITY_AWAIT_ROOT_CLASS} .clara-guide-carousel-bubble-shell,
        html.${GUIDE_COMMUNITY_PREVIEW_ROOT_CLASS} .clara-guide-carousel-bubble-shell,
        html.clara-guide-schedule-await-active .clara-guide-carousel-bubble-shell,
        html.clara-guide-schedule-agenda-active .clara-guide-carousel-bubble-shell,
        html.clara-guide-schedule-calendar-active .clara-guide-carousel-bubble-shell,
        html.clara-guide-schedule-select-date-active .clara-guide-carousel-bubble-shell,
        html.clara-guide-schedule-date-selected-active .clara-guide-carousel-bubble-shell,
        html.clara-guide-schedule-double-tap-active .clara-guide-carousel-bubble-shell,
        html.clara-guide-schedule-setup-active .clara-guide-carousel-bubble-shell,
        html.clara-guide-schedule-event-saved-active .clara-guide-carousel-bubble-shell,
        html.clara-guide-schedule-open-details-active .clara-guide-carousel-bubble-shell,
        html.clara-guide-schedule-details-active .clara-guide-carousel-bubble-shell {
          display: none !important;
        }
      `}</style>

      {isCommunityPreviewVisible || isSchedulePageVisible ? (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/82 backdrop-blur-[2px]"
          aria-hidden="true"
        />
      ) : null}

      {isAwaitingCommunityTab ? <ClaraGuideCommunityNavigationBubble /> : null}
      {isCommunityPreviewVisible ? (
        <ClaraGuideCommunityPreview onNext={handleCommunityGuideNext} />
      ) : null}
      {isAwaitingScheduleTab ? <ClaraGuideScheduleNavigationBubble /> : null}

      <DashboardTopNav
        {...topNavVisualProps}
        items={navItems}
        activeKey={activeDashboardPanel}
        onSelect={handleSelect}
        elevated={guideActive}
      />
    </>
  );
}
