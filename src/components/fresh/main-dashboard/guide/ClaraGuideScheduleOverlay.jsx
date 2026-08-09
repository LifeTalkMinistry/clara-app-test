import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { markDailyMoneyTipGuideComplete } from "./claraGuideProgress";

const CLARA_GUIDE_SCHEDULE_PHASE_REQUEST_EVENT = "clara:guide-schedule-phase-request";
const CLARA_GUIDE_FEATURE_COMPLETE_EVENT = "clara:guide-feature-complete";
const GUIDE_FEATURE_SCHEDULE = "schedule";

const PHASE_CONFIG = {
  "schedule-overview": {
    selector: "[data-clara-guide-schedule-static-surface='true']",
    title: "YOUR MONEY-AWARE CALENDAR",
    body: "The board shows one selected day, the calendar lets you explore or add plans, and the insight below helps you notice pressure across the month.",
    footer: "PLANS BECOME EASIER TO MANAGE WHEN YOU CAN SEE THEM EARLY.",
    action: "NEXT",
    next: "agenda-overview",
  },
  "agenda-overview": {
    selector: "[data-clara-schedule-agenda-card='true']",
    title: "SELECTED DAY OVERVIEW",
    body: "This board changes whenever you choose a calendar date. It may show a schedule, money impact, a Philippine holiday, or a clear day.",
    footer: "THE BOARD ALWAYS FOLLOWS THE DATE YOU SELECT.",
    action: "NEXT",
    next: "calendar-overview",
  },
  "calendar-overview": {
    selector: "[data-clara-schedule-calendar='true']",
    title: "YOUR ACTUAL CALENDAR",
    body: "Tap once to view a day. Double-tap the same date to add a schedule. You can also select a date and press the plus button.",
    footer: "DOTS MARK HOLIDAYS, MONEY IMPACTS, AND SCHEDULES.",
    action: "NEXT",
    next: "select-date",
  },
  "select-date": {
    selector: "[data-clara-guide-schedule-target-date='true']",
    title: "CHOOSE A DAY",
    body: "Tap the highlighted date once.",
    footer: "WATCH THE BOARD ABOVE CHANGE.",
  },
  "date-selected": {
    selector: "[data-clara-schedule-agenda-card='true']",
    title: "THE DAY IS ACTIVE",
    body: "The board above now represents this exact date. There is no schedule yet, so the day is still clear.",
    footer: "NEXT, ADD SOMETHING TO THIS DAY.",
    action: "NEXT",
    next: "double-tap-date",
  },
  "double-tap-date": {
    selector: "[data-clara-guide-schedule-target-date='true']",
    title: "ADD A SCHEDULE",
    body: "Double-tap the same highlighted date now.",
    footer: "TWO QUICK TAPS OPEN THE SETUP SHEET.",
  },
  "setup-event": {
    selector: "[data-clara-schedule-sheet-surface='true']",
    title: "SET UP THE EVENT",
    body: "The date is already filled in. Review the title, time, type, and description, then save the demo schedule.",
    supporting: "You can normally calculate possible money impact or save the schedule directly.",
    footer: "THIS SAMPLE WILL NOT CHANGE YOUR REAL SCHEDULE.",
  },
  "event-saved": {
    selector: "[data-clara-schedule-agenda-card='true']",
    title: "THE DAY IS NOW UPDATED",
    body: "The new schedule appears on the selected date, and the board above updates automatically.",
    footer: "YOU DO NOT NEED TO SELECT THE DATE AGAIN.",
    action: "NEXT",
    next: "open-event-details",
  },
  "open-event-details": {
    selector: "[data-clara-schedule-agenda-card='true']",
    title: "OPEN THE FULL DETAILS",
    body: "Tap the updated board above.",
    footer: "THE BOARD OPENS THE COMPLETE EVENT INFORMATION.",
  },
  "event-details": {
    selector: "[data-clara-schedule-event-detail='true']",
    title: "FULL SCHEDULE INFORMATION",
    body: "Here you can review the event date, time, type, description, and any money-impact details attached to the schedule.",
    footer: "YOUR SCHEDULE WALKTHROUGH IS COMPLETE.",
    action: "FINISH",
    finish: true,
  },
};

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getSafeTop() {
  const nav = document.querySelector("[data-clara-guide-exit='true']");
  return Math.max(12, (nav?.getBoundingClientRect?.().bottom || 0) + 12);
}

export default function ClaraGuideScheduleOverlay({ phase }) {
  const bubbleRef = useRef(null);
  const scrolledPhaseRef = useRef("");
  const [position, setPosition] = useState({ top: 124, left: 16, arrowLeft: 42, placement: "top" });
  const config = PHASE_CONFIG[phase];

  const updatePosition = useCallback(() => {
    if (!config || typeof document === "undefined") return;
    const target = document.querySelector(config.selector);
    const bubble = bubbleRef.current;
    if (!target || !bubble) return;

    const targetRect = target.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const safeTop = getSafeTop();
    const edge = 16;
    const gap = 16;
    const bubbleWidth = bubbleRect.width || Math.min(viewportWidth - 32, 354);
    const bubbleHeight = bubbleRect.height || 150;
    const desiredLeft = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;
    const left = clamp(desiredLeft, edge, Math.max(edge, viewportWidth - bubbleWidth - edge));
    const roomBelow = viewportHeight - targetRect.bottom - edge;
    const roomAbove = targetRect.top - safeTop;
    let placement = "top";
    let top = targetRect.bottom + gap;

    if (roomBelow < bubbleHeight + gap && roomAbove >= bubbleHeight + gap) {
      placement = "bottom";
      top = targetRect.top - bubbleHeight - gap;
    } else if (roomBelow < bubbleHeight + gap) {
      placement = targetRect.top > safeTop + bubbleHeight / 2 ? "bottom" : "top";
      top = placement === "bottom"
        ? Math.max(safeTop, targetRect.top - bubbleHeight - gap)
        : safeTop;
    }

    top = clamp(top, safeTop, Math.max(safeTop, viewportHeight - bubbleHeight - edge));
    const arrowLeft = clamp(targetRect.left + targetRect.width / 2 - left, 34, bubbleWidth - 34);
    setPosition({ top, left, arrowLeft, placement });
  }, [config]);

  useLayoutEffect(() => {
    updatePosition();
    const first = window.requestAnimationFrame(() => {
      updatePosition();
      window.requestAnimationFrame(updatePosition);
    });
    return () => window.cancelAnimationFrame(first);
  }, [phase, updatePosition]);

  useEffect(() => {
    if (!config || typeof document === "undefined") return undefined;
    const target = document.querySelector(config.selector);
    if (!target) return undefined;

    if (scrolledPhaseRef.current !== phase) {
      scrolledPhaseRef.current = phase;
      const rect = target.getBoundingClientRect();
      const safeTop = getSafeTop();
      if (rect.top < safeTop || rect.bottom > window.innerHeight - 18) {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }

    const handleViewportChange = () => updatePosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(handleViewportChange) : null;
    observer?.observe(target);
    if (bubbleRef.current) observer?.observe(bubbleRef.current);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      observer?.disconnect();
    };
  }, [config, phase, updatePosition]);

  if (!config || typeof document === "undefined") return null;

  const handleAction = () => {
    if (config.finish) {
      markDailyMoneyTipGuideComplete();
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(
        new CustomEvent(CLARA_GUIDE_FEATURE_COMPLETE_EVENT, {
          detail: { feature: GUIDE_FEATURE_SCHEDULE },
        })
      );
      return;
    }

    if (config.next) {
      window.dispatchEvent(
        new CustomEvent(CLARA_GUIDE_SCHEDULE_PHASE_REQUEST_EVENT, {
          detail: { phase: config.next },
        })
      );
    }
  };

  return createPortal(
    <div
      data-clara-guide-schedule-bubble="true"
      className="pointer-events-none fixed z-[100300]"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div
        ref={bubbleRef}
        role="dialog"
        aria-live="polite"
        aria-labelledby="clara-guide-schedule-title"
        className="pointer-events-auto relative"
      >
        <div
          data-clara-guide-schedule-arrow="true"
          data-placement={position.placement}
          className="pointer-events-none absolute h-3.5 w-3.5 rotate-45"
          style={{ left: `${position.arrowLeft - 7}px` }}
        />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
          <div className="min-w-0">
            <p id="clara-guide-schedule-title">{config.title}</p>
            <p data-clara-guide-schedule-body="true">{config.body}</p>
            {config.supporting ? (
              <p data-clara-guide-schedule-supporting="true">{config.supporting}</p>
            ) : null}
          </div>
          {config.action ? (
            <button
              data-clara-guide-schedule-action="true"
              type="button"
              onClick={handleAction}
            >
              {config.action}
            </button>
          ) : null}
          <div data-clara-guide-schedule-footer-row="true" className="col-span-2">
            <div data-clara-guide-schedule-divider="true" />
            <p data-clara-guide-schedule-footer="true">{config.footer}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
