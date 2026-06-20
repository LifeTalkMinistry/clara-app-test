import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

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
  OVERVIEW: "schedule-overview",
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
  [SCHEDULE_GUIDE_PHASES.OVERVIEW]: "clara-guide-schedule-overview-active",
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

const SCHEDULE_GUIDE_ROOT_CLASSES = Object.values(SCHEDULE_GUIDE_ROOT_CLASS_BY_PHASE);

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

export default function DashboardTopNav({
  dashboardScale,
  headerQuickActions = [],
  activeDashboardPanel,
  openDashboardPanel,
  themeQuickActionPanelStyle,
  themeQuickActionGlowStyle,
  themeQuickActionBaseClass = "",
  themeQuickActionIconShellClass = "",
  themeSecondaryTextClass = "",
  themeDividerClass = "via-white/10",
  themeIsLight = false,
}) {
  const [isGuideModeTopNav, setIsGuideModeTopNav] = useState(false);
  const [meGuidePhase, setMeGuidePhase] = useState(ME_GUIDE_PHASES.INACTIVE);
  const [scheduleGuidePhase, setScheduleGuidePhase] = useState(SCHEDULE_GUIDE_PHASES.INACTIVE);
  const isAwaitingMeTab = meGuidePhase === ME_GUIDE_PHASES.AWAIT_ME_TAB;
  const isMePagePreviewActive = meGuidePhase === ME_GUIDE_PHASES.ME_PAGE_PREVIEW;
  const isMeGuideComplete = meGuidePhase === ME_GUIDE_PHASES.COMPLETE;
  const isMePageGuideVisible = isMePagePreviewActive || isMeGuideComplete;
  const isAwaitingScheduleTab = scheduleGuidePhase === SCHEDULE_GUIDE_PHASES.AWAIT_SCHEDULE_TAB;
  const isSchedulePageGuideVisible =
    scheduleGuidePhase !== SCHEDULE_GUIDE_PHASES.INACTIVE &&
    scheduleGuidePhase !== SCHEDULE_GUIDE_PHASES.AWAIT_SCHEDULE_TAB;

  const publishMeGuidePhase = useCallback((phase) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent(CLARA_GUIDE_ME_PHASE_CHANGE_EVENT, {
        detail: { phase },
      })
    );
  }, []);

  const publishScheduleGuidePhase = useCallback((phase) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent(CLARA_GUIDE_SCHEDULE_PHASE_CHANGE_EVENT, {
        detail: { phase },
      })
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleGuideModeChange = (event) => {
      const active = Boolean(event?.detail?.active);
      setIsGuideModeTopNav(active);
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
        document.documentElement.classList.add("clara-guide-me-await-active");
        setMeGuidePhase(ME_GUIDE_PHASES.AWAIT_ME_TAB);
        return;
      }

      if (completedFeature === GUIDE_FEATURE_ME_PAGE) {
        document.documentElement.classList.remove(
          "clara-guide-me-await-active",
          "clara-guide-me-preview-active",
          "clara-guide-me-complete-active"
        );
        setMeGuidePhase(ME_GUIDE_PHASES.INACTIVE);
        publishMeGuidePhase(ME_GUIDE_PHASES.INACTIVE);
        setScheduleGuidePhase(SCHEDULE_GUIDE_PHASES.AWAIT_SCHEDULE_TAB);
        publishScheduleGuidePhase(SCHEDULE_GUIDE_PHASES.AWAIT_SCHEDULE_TAB);
        return;
      }

      if (completedFeature === GUIDE_FEATURE_SCHEDULE) {
        SCHEDULE_GUIDE_ROOT_CLASSES.forEach((className) => {
          document.documentElement.classList.remove(className);
        });
        setScheduleGuidePhase(SCHEDULE_GUIDE_PHASES.INACTIVE);
        publishScheduleGuidePhase(SCHEDULE_GUIDE_PHASES.INACTIVE);
        setIsGuideModeTopNav(false);
        window.dispatchEvent(new CustomEvent(CLARA_GUIDE_EXIT_EVENT));
      }
    };

    const handleMeGuidePhaseRequest = (event) => {
      const requestedPhase = event?.detail?.phase;
      if (requestedPhase === ME_GUIDE_PHASES.COMPLETE) {
        setMeGuidePhase(ME_GUIDE_PHASES.COMPLETE);
      }
    };

    const handleScheduleGuidePhaseRequest = (event) => {
      const requestedPhase = event?.detail?.phase;
      if (!Object.values(SCHEDULE_GUIDE_PHASES).includes(requestedPhase)) return;
      setScheduleGuidePhase(requestedPhase);
      publishScheduleGuidePhase(requestedPhase);
    };

    window.addEventListener(CLARA_GUIDE_MODE_CHANGE_EVENT, handleGuideModeChange);
    window.addEventListener(CLARA_GUIDE_FEATURE_COMPLETE_EVENT, handleGuideFeatureComplete);
    window.addEventListener(CLARA_GUIDE_ME_PHASE_REQUEST_EVENT, handleMeGuidePhaseRequest);
    window.addEventListener(CLARA_GUIDE_SCHEDULE_PHASE_REQUEST_EVENT, handleScheduleGuidePhaseRequest);

    return () => {
      window.removeEventListener(CLARA_GUIDE_MODE_CHANGE_EVENT, handleGuideModeChange);
      window.removeEventListener(CLARA_GUIDE_FEATURE_COMPLETE_EVENT, handleGuideFeatureComplete);
      window.removeEventListener(CLARA_GUIDE_ME_PHASE_REQUEST_EVENT, handleMeGuidePhaseRequest);
      window.removeEventListener(CLARA_GUIDE_SCHEDULE_PHASE_REQUEST_EVENT, handleScheduleGuidePhaseRequest);
    };
  }, [publishMeGuidePhase, publishScheduleGuidePhase]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const root = document.documentElement;
    root.classList.toggle("clara-guide-me-await-active", isAwaitingMeTab);
    root.classList.toggle("clara-guide-me-preview-active", isMePagePreviewActive);
    root.classList.toggle("clara-guide-me-complete-active", isMeGuideComplete);
    SCHEDULE_GUIDE_ROOT_CLASSES.forEach((className) => root.classList.remove(className));
    const activeScheduleClass = SCHEDULE_GUIDE_ROOT_CLASS_BY_PHASE[scheduleGuidePhase];
    if (activeScheduleClass) root.classList.add(activeScheduleClass);
    publishMeGuidePhase(meGuidePhase);
    publishScheduleGuidePhase(scheduleGuidePhase);

    return () => {
      root.classList.remove(
        "clara-guide-me-await-active",
        "clara-guide-me-preview-active",
        "clara-guide-me-complete-active",
        ...SCHEDULE_GUIDE_ROOT_CLASSES
      );
    };
  }, [
    isAwaitingMeTab,
    isMeGuideComplete,
    isMePagePreviewActive,
    meGuidePhase,
    publishMeGuidePhase,
    publishScheduleGuidePhase,
    scheduleGuidePhase,
  ]);

  const handleGuideExit = () => {
    setIsGuideModeTopNav(false);
    setMeGuidePhase(ME_GUIDE_PHASES.INACTIVE);
    setScheduleGuidePhase(SCHEDULE_GUIDE_PHASES.INACTIVE);
    publishMeGuidePhase(ME_GUIDE_PHASES.INACTIVE);
    publishScheduleGuidePhase(SCHEDULE_GUIDE_PHASES.INACTIVE);

    if (typeof document !== "undefined") {
      document.documentElement.classList.remove(
        "clara-guide-me-await-active",
        "clara-guide-me-preview-active",
        "clara-guide-me-complete-active",
        ...SCHEDULE_GUIDE_ROOT_CLASSES
      );
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(CLARA_GUIDE_EXIT_EVENT));
    }
  };

  const handleGuideNavigationTargetClick = (itemKey) => {
    if (isAwaitingMeTab && itemKey === "me") {
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("clara-guide-me-await-active");
        document.documentElement.classList.add("clara-guide-me-preview-active");
      }

      openDashboardPanel("me");
      setMeGuidePhase(ME_GUIDE_PHASES.ME_PAGE_PREVIEW);
      publishMeGuidePhase(ME_GUIDE_PHASES.ME_PAGE_PREVIEW);
      return;
    }

    if (isAwaitingScheduleTab && itemKey === "schedule") {
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("clara-guide-schedule-await-active");
        document.documentElement.classList.add("clara-guide-schedule-overview-active");
      }

      openDashboardPanel("schedule");
      setScheduleGuidePhase(SCHEDULE_GUIDE_PHASES.OVERVIEW);
      publishScheduleGuidePhase(SCHEDULE_GUIDE_PHASES.OVERVIEW);
    }
  };

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

      {isMePageGuideVisible || isSchedulePageGuideVisible ? (
        <div className="fixed inset-0 z-[60] bg-slate-950/82 backdrop-blur-[2px]" aria-hidden="true" />
      ) : null}

      {isAwaitingMeTab ? <ClaraGuideMeNavigationBubble /> : null}
      {isAwaitingScheduleTab ? <ClaraGuideScheduleNavigationBubble /> : null}

      <div className={`relative shrink-0 ${isGuideModeTopNav ? "z-[100]" : "z-30"} ${dashboardScale.headerOuter}`}>
        <div className="mx-auto w-full max-w-[430px] overflow-visible">
          <div
            className={`relative w-full overflow-hidden border backdrop-blur-xl ${dashboardScale.headerPanel}`}
            style={themeQuickActionPanelStyle}
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-70"
              style={themeQuickActionGlowStyle}
            />
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.065),transparent_42%,rgba(0,0,0,0.14))]" />
            <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />
            <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="relative grid grid-cols-4 gap-1.5 sm:gap-2">
              {headerQuickActions.map((item, index) => {
                const isGuideMeTargetSlot = isGuideModeTopNav && isAwaitingMeTab && item.key === "me";
                const isGuideScheduleTargetSlot =
                  isGuideModeTopNav && isAwaitingScheduleTab && item.key === "schedule";
                const isGuideTargetSlot = isGuideMeTargetSlot || isGuideScheduleTargetSlot;
                const isGuideExitSlot = isGuideModeTopNav && item.key === "settings";
                const isGuideStaticSlot =
                  isGuideModeTopNav && !isGuideExitSlot && !isGuideTargetSlot;
                const isGuideMeActiveSlot =
                  isGuideModeTopNav &&
                  isMePageGuideVisible &&
                  item.key === "me" &&
                  activeDashboardPanel === "me";
                const isGuideScheduleActiveSlot =
                  isGuideModeTopNav &&
                  isSchedulePageGuideVisible &&
                  item.key === "schedule" &&
                  activeDashboardPanel === "schedule";
                const Icon = isGuideExitSlot ? X : item.icon;
                const itemLabel = isGuideExitSlot ? "Exit" : item.label;
                const isActive =
                  isGuideExitSlot ||
                  isGuideMeActiveSlot ||
                  isGuideScheduleActiveSlot ||
                  (!isGuideModeTopNav && activeDashboardPanel === item.key);
                const pillGlow =
                  item.key === "feed"
                    ? "shadow-[0_0_12px_rgba(59,130,246,0.20)]"
                    : item.key === "task"
                      ? "shadow-[0_0_12px_rgba(250,204,21,0.22)]"
                      : "";
                const iconHoverGlow =
                  item.key === "feed"
                    ? "group-hover:shadow-[0_0_24px_rgba(59,130,246,0.18)]"
                    : item.key === "task"
                      ? "group-hover:shadow-[0_0_24px_rgba(250,204,21,0.22)]"
                      : item.key === "settings"
                        ? "group-hover:shadow-[0_0_22px_rgba(255,255,255,0.16)]"
                        : "group-hover:shadow-[0_0_22px_rgba(255,255,255,0.10)]";

                const activeItemClass = themeIsLight
                  ? "border-emerald-400/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.92)_0%,rgba(236,253,245,0.82)_42%,rgba(237,233,254,0.82)_100%)] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_28px_rgba(15,23,42,0.12),0_0_26px_rgba(20,184,166,0.16)]"
                  : "border-emerald-100/24 bg-[linear-gradient(135deg,rgba(10,126,128,0.50)_0%,rgba(17,44,85,0.62)_46%,rgba(82,45,147,0.66)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_34px_rgba(45,212,191,0.16),0_16px_32px_rgba(0,0,0,0.26)]";

                const inactiveItemClass = themeIsLight
                  ? "border-transparent text-slate-700 hover:border-slate-300/40 hover:bg-white/48 hover:text-slate-950"
                  : "border-transparent text-white/76 hover:border-white/[0.09] hover:bg-white/[0.055] hover:text-white";

                const activeIconClass = themeIsLight
                  ? "border-emerald-500/55 bg-emerald-500/14 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_0_24px_rgba(16,185,129,0.18)]"
                  : "border-emerald-100/45 bg-emerald-400/[0.18] text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_26px_rgba(94,234,212,0.28)]";

                return (
                  <button
                    key={item.key}
                    type="button"
                    data-clara-guide-exit={isGuideExitSlot ? "true" : undefined}
                    data-clara-guide-me-target={isGuideMeTargetSlot ? "true" : undefined}
                    data-clara-guide-schedule-target={isGuideScheduleTargetSlot ? "true" : undefined}
                    onClick={
                      isGuideExitSlot
                        ? handleGuideExit
                        : isGuideTargetSlot
                          ? () => handleGuideNavigationTargetClick(item.key)
                          : isGuideStaticSlot
                            ? undefined
                            : () => openDashboardPanel(item.key)
                    }
                    className={`group relative flex min-w-0 ${
                      isGuideStaticSlot ? "pointer-events-none opacity-35 saturate-50" : ""
                    } ${
                      isGuideTargetSlot
                        ? "z-[120] rounded-[24px] ring-2 ring-cyan-200/75 ring-offset-2 ring-offset-slate-950/80 shadow-[0_0_34px_rgba(34,211,238,0.34)]"
                        : ""
                    }`}
                    aria-label={isGuideExitSlot ? "Exit CLARA Guide Mode" : item.label}
                    aria-current={isActive && !isGuideExitSlot ? "page" : undefined}
                    disabled={isGuideStaticSlot}
                  >
                    <div
                      className={`relative flex w-full flex-col items-center justify-center overflow-hidden border transition duration-200 ${
                        isGuideStaticSlot ? "" : "hover:-translate-y-[1px] active:scale-[0.985]"
                      } ${dashboardScale.headerItem} ${
                        isActive || isGuideTargetSlot
                          ? activeItemClass
                          : `${inactiveItemClass} ${themeQuickActionBaseClass}`
                      } ${isActive || isGuideTargetSlot ? "clara-theme-nav-pill-active" : ""}`}
                    >
                      {isActive || isGuideTargetSlot ? (
                        <>
                          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_18%_28%,rgba(94,234,212,0.24),transparent_44%),radial-gradient(circle_at_88%_54%,rgba(168,85,247,0.24),transparent_50%)]" />
                          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-emerald-100/50 to-transparent" />
                        </>
                      ) : (
                        <div className={`pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition duration-200 group-hover:opacity-100 ${themeIsLight ? "bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.14),transparent_58%)]" : "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_58%)]"}`} />
                      )}

                      <div
                        className={`relative flex shrink-0 items-center justify-center rounded-full border transition duration-200 ${dashboardScale.headerIcon} ${
                          isActive || isGuideTargetSlot
                            ? activeIconClass
                            : `${themeQuickActionIconShellClass} ${iconHoverGlow}`
                        }`}
                      >
                        <Icon className={dashboardScale.headerIconSvg} />

                        {!isGuideExitSlot && item.badge?.type === "count" ? (
                          <span
                            className={`absolute -right-1.5 -top-1.5 inline-flex min-w-[16px] items-center justify-center rounded-full border px-1 py-[2px] text-[8px] font-bold leading-none shadow-[0_4px_12px_rgba(0,0,0,0.24)] ${item.badge.className}`}
                          >
                            {item.badge.value}
                          </span>
                        ) : !isGuideExitSlot && item.badge?.type === "pill" ? (
                          <span
                            className={`absolute -right-2 -top-1.5 inline-flex items-center justify-center rounded-full border px-1.5 py-[2px] text-[8px] font-semibold leading-none ${pillGlow} ${item.badge.className}`}
                          >
                            {item.badge.value}
                          </span>
                        ) : !isGuideExitSlot && item.badge?.type === "dot" ? (
                          <span
                            className={`absolute right-0 top-0 h-1.5 w-1.5 rounded-full border shadow-[0_0_10px_rgba(56,189,248,0.45),0_4px_10px_rgba(0,0,0,0.22)] ${item.badge.className}`}
                          />
                        ) : null}
                      </div>

                      <span
                        className={`relative max-w-full shrink-0 truncate leading-none transition ${dashboardScale.headerLabel} ${
                          isActive || isGuideTargetSlot
                            ? "font-black tracking-[-0.01em]"
                            : `font-semibold ${themeSecondaryTextClass}`
                        }`}
                      >
                        {itemLabel}
                      </span>
                    </div>

                    {index < headerQuickActions.length - 1 ? (
                      <div className={`pointer-events-none absolute -right-1 top-1/2 hidden h-9 w-px -translate-y-1/2 bg-gradient-to-b from-transparent ${themeDividerClass} to-transparent sm:block`} />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
