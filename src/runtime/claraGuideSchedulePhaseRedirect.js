const CLARA_GUIDE_SCHEDULE_PHASE_CHANGE_EVENT = "clara:guide-schedule-phase-change";
const CLARA_GUIDE_SCHEDULE_PHASE_REQUEST_EVENT = "clara:guide-schedule-phase-request";

let installed = false;

export function installClaraGuideSchedulePhaseRedirect() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener(
    CLARA_GUIDE_SCHEDULE_PHASE_CHANGE_EVENT,
    (event) => {
      if (event?.detail?.phase !== "schedule-overview") return;

      event.stopImmediatePropagation();
      window.dispatchEvent(
        new CustomEvent(CLARA_GUIDE_SCHEDULE_PHASE_REQUEST_EVENT, {
          detail: { phase: "agenda-overview" },
        })
      );
    },
    true
  );
}
