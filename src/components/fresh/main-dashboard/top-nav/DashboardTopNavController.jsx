import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import DashboardTopNav from "@/components/fresh/main-dashboard/top-nav/DashboardTopNav";

const CLARA_GUIDE_EXIT_EVENT = "clara:guide-exit";
const CLARA_GUIDE_MODE_CHANGE_EVENT = "clara:guide-mode-change";
const CLARA_GUIDE_FEATURE_COMPLETE_EVENT = "clara:guide-feature-complete";
const CLARA_GUIDE_ME_PHASE_CHANGE_EVENT = "clara:guide-me-phase-change";
const CLARA_GUIDE_ME_PHASE_REQUEST_EVENT = "clara:guide-me-phase-request";
const CLARA_GUIDE_SCHEDULE_PHASE_CHANGE_EVENT = "clara:guide-schedule-phase-change";
const CLARA_GUIDE_SCHEDULE_PHASE_REQUEST_EVENT = "clara:guide-schedule-phase-request";
const GUIDE_FEATURE_MONEY_LEFT_ORB = "money-left-orb";
const GUIDE_FEATURE_ME_PAGE = "me-page";
const GUIDE_FEATURE_SCHEDULE = "schedule";

const ME_GUIDE_PHASES = {
  INACTIVE: "inactive",
  AWAIT_ME_TAB: "await-me-tab",
  ME_PAGE_PREVIEW: "me-page-preview",
  COMPLETE: "complete",
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
  "clara-guide-money-left-orb-active",
];

function ClaraGuideMeNavigationBubble() {
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[240] w-[min(calc(100vw-40px),360px)] -translate-x-1/2"
      style={{ top: "clamp(112px, 15dvh, 150px)" }}
    >
      <div
        role="dialog"
        aria-live="polite"
        aria-labelledby="clara-guide-me-navigation-title"
        className="relative rounded-[28px] border border-cyan-100/24 bg-[linear-gradient(145deg,rgba(5,18,36,0.98),rgba(10,22,54,0.98)_52%,rgba(27,18,65,0.98))] px-5 py-5 text-white shadow-[0_22px_70px_rgba(0,0,0,0.72),0_0_44px_rgba(34,211,238,0.18)] backdrop-blur-2xl"
      >
        <div className="pointer-events-none absolute -top-2 left-[37.5%] h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-cyan-100/24 bg-[rgba(8,20,45,0.98)]" />
        <p
          id="clara-guide-me-navigation-title"
          className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100"
        >
          ME PAGE
        </p>
        <p className="mt-3 text-[14px] font-bold leading-relaxed text-white">
          This is where CLARA learns the life behind your money—not just the numbers.
        </p>
        <p className="mt-3 border-t border-cyan-100/15 pt-3 text-[12px] font-black uppercase leading-relaxed tracking-[0.08em] text-cyan-100/90">
          TAP ME NOW.
        </p>
      </div>
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
  const [guideActive, setGuideActive] = useState(false);
  const [meGuidePhase, setMeGuidePhase] = useState(ME_GUIDE_PHASES.INACTIVE);
  const [scheduleGuidePhase, setScheduleGuidePhase] = useState(
    SCHEDULE_GUIDE_PHASES.INACTIVE
  );

  const isAwaitingMeTab = meGuidePhase === ME_GUIDE_PHASES.AWAIT_ME_TAB;
  const isMePageVisible =
    meGuidePhase === ME_GUIDE_PHASES.ME_PAGE_PREVIEW ||
    meGuidePhase === ME_GUIDE_PHASES.COMPLETE;
  const isAwaitingScheduleTab =
    scheduleGuidePhase === SCHEDULE_GUIDE_PHASES.AWAIT_SCHEDULE_TAB;
  const isSchedulePageVisible =
    scheduleGuidePhase !== SCHEDULE_GUIDE_PHASES.INACTIVE &&
    scheduleGuidePhase !== SCHEDULE_GUIDE_PHASES.AWAIT_SCHEDULE_TAB;

  const exitGuide = useCallback(() => {
    setGuideActive(false);
    setMeGuidePhase(ME_GUIDE_PHASES.INACTIVE);
    setScheduleGuidePhase(SCHEDULE_GUIDE_PHASES.INACTIVE);
    openDashboardPanel("home");

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
        setMeGuidePhase(ME_GUIDE_PHASES.INACTIVE);
        setScheduleGuidePhase(SCHEDULE_GUIDE_PHASES.INACTIVE);
      }
    };

    const handleGuideFeatureComplete = (event) => {
      const completedFeature = event?.detail?.feature;

      if (completedFeature === GUIDE_FEATURE_MONEY_LEFT_ORB) {
        GUIDE_ROOT_FEATURE_CLASSES.forEach((className) => {
          document.documentElement.classList.remove(className);
        });
        setMeGuidePhase(ME_GUIDE_PHASES.AWAIT_ME_TAB);
        return;
      }

      if (completedFeature === GUIDE_FEATURE_ME_PAGE) {
        setMeGuidePhase(ME_GUIDE_PHASES.INACTIVE);
        setScheduleGuidePhase(SCHEDULE_GUIDE_PHASES.AWAIT_SCHEDULE_TAB);
        return;
      }

      if (completedFeature === GUIDE_FEATURE_SCHEDULE) {
        exitGuide();
      }
    };

    const handleMeGuidePhaseRequest = (event) => {
      if (event?.detail?.phase === ME_GUIDE_PHASES.COMPLETE) {
        setMeGuidePhase(ME_GUIDE_PHASES.COMPLETE);
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
    window.addEventListener(
      CLARA_GUIDE_ME_PHASE_REQUEST_EVENT,
      handleMeGuidePhaseRequest
    );
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
      window.removeEventListener(
        CLARA_GUIDE_ME_PHASE_REQUEST_EVENT,
        handleMeGuidePhaseRequest
      );
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
    root.classList.toggle("clara-guide-me-await-active", isAwaitingMeTab);
    root.classList.toggle(
      "clara-guide-me-preview-active",
      meGuidePhase === ME_GUIDE_PHASES.ME_PAGE_PREVIEW
    );
    root.classList.toggle(
      "clara-guide-me-complete-active",
      meGuidePhase === ME_GUIDE_PHASES.COMPLETE
    );

    SCHEDULE_GUIDE_ROOT_CLASSES.forEach((className) => root.classList.remove(className));
    const activeScheduleClass =
      SCHEDULE_GUIDE_ROOT_CLASS_BY_PHASE[scheduleGuidePhase];
    if (activeScheduleClass) root.classList.add(activeScheduleClass);

    window.dispatchEvent(
      new CustomEvent(CLARA_GUIDE_ME_PHASE_CHANGE_EVENT, {
        detail: { phase: meGuidePhase },
      })
    );
    window.dispatchEvent(
      new CustomEvent(CLARA_GUIDE_SCHEDULE_PHASE_CHANGE_EVENT, {
        detail: { phase: scheduleGuidePhase },
      })
    );

    return () => {
      root.classList.remove(
        "clara-guide-me-await-active",
        "clara-guide-me-preview-active",
        "clara-guide-me-complete-active",
        ...SCHEDULE_GUIDE_ROOT_CLASSES
      );
    };
  }, [isAwaitingMeTab, meGuidePhase, scheduleGuidePhase]);

  const handleSelect = useCallback(
    (selection) => {
      if (selection === "guide-exit") {
        exitGuide();
        return;
      }

      if (!guideActive) {
        openDashboardPanel(selection);
        return;
      }

      if (isAwaitingMeTab && selection === "me") {
        openDashboardPanel("me");
        setMeGuidePhase(ME_GUIDE_PHASES.ME_PAGE_PREVIEW);
        return;
      }

      if (isAwaitingScheduleTab && selection === "schedule") {
        openDashboardPanel("schedule");
        setScheduleGuidePhase(SCHEDULE_GUIDE_PHASES.AGENDA_OVERVIEW);
      }
    }, [
      exitGuide,
      guideActive,
      isAwaitingMeTab,
      isAwaitingScheduleTab,
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
        (isAwaitingMeTab && item.key === "me") ||
        (isAwaitingScheduleTab && item.key === "schedule");
      const forceActive =
        (isMePageVisible &&
          item.key === "me" &&
          activeDashboardPanel === "me") ||
        (isSchedulePageVisible &&
          item.key === "schedule" &&
          activeDashboardPanel === "schedule");

      return {
        ...item,
        highlighted,
        forceActive,
        disabled: !highlighted,
        dataGuideMeTarget: isAwaitingMeTab && item.key === "me",
        dataGuideScheduleTarget:
          isAwaitingScheduleTab && item.key === "schedule",
      };
    });
  }, [
    activeDashboardPanel,
    guideActive,
    headerQuickActions,
    isAwaitingMeTab,
    isAwaitingScheduleTab,
    isMePageVisible,
    isSchedulePageVisible,
  ]);

  return (
    <>
      <style>{`
        html.clara-guide-me-await-active .clara-guide-carousel-bubble-shell,
        html.clara-guide-schedule-await-active .clara-guide-carousel-bubble-shell {
          display: none !important;
        }

        html.clara-guide-me-preview-active div:has(> div > [data-clara-guide-me-preview="true"]) > div:first-child,
        html.clara-guide-me-complete-active div:has(> div > [data-clara-guide-me-preview="true"]) > div:first-child {
          pointer-events: auto !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html.clara-guide-me-preview-active div:has(> div > [data-clara-guide-me-preview="true"]) > div:nth-child(2),
        html.clara-guide-me-complete-active div:has(> div > [data-clara-guide-me-preview="true"]) > div:nth-child(2) {
          display: none !important;
        }
      `}</style>

      {isMePageVisible || isSchedulePageVisible ? (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/82 backdrop-blur-[2px]"
          aria-hidden="true"
        />
      ) : null}

      {isAwaitingMeTab ? <ClaraGuideMeNavigationBubble /> : null}
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
