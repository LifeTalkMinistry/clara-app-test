const CLARA_GUIDE_SCHEDULE_PHASE_CHANGE_EVENT = "clara:guide-schedule-phase-change";
const CLARA_GUIDE_SCHEDULE_PHASE_REQUEST_EVENT = "clara:guide-schedule-phase-request";

let installed = false;

function installDateTargetStyles() {
  if (document.getElementById("clara-guide-schedule-date-target-styles")) return;

  const style = document.createElement("style");
  style.id = "clara-guide-schedule-date-target-styles";
  style.textContent = `
    html:is(.clara-guide-schedule-select-date-active,.clara-guide-schedule-double-tap-active)
    .fixed.inset-0.z-\\[60\\][aria-hidden='true'] {
      pointer-events: none !important;
      background: transparent !important;
      backdrop-filter: none !important;
    }

    html:is(.clara-guide-schedule-select-date-active,.clara-guide-schedule-double-tap-active)
    [data-clara-schedule-calendar='true'] {
      position: relative !important;
      z-index: 70 !important;
      overflow: visible !important;
    }

    html:is(.clara-guide-schedule-select-date-active,.clara-guide-schedule-double-tap-active)
    [data-clara-guide-schedule-target-date='true'] {
      position: relative !important;
      z-index: 90 !important;
      pointer-events: auto !important;
      opacity: 1 !important;
      filter: none !important;
      color: #fff !important;
      border: 3px solid rgba(207,250,254,.98) !important;
      background: linear-gradient(145deg,rgba(8,47,73,.98),rgba(17,24,62,.98)) !important;
      transform: scale(1.08) !important;
      box-shadow: 0 0 0 9999px rgba(2,6,23,.82),0 0 0 5px rgba(8,47,73,.9),0 0 34px rgba(34,211,238,.78),inset 0 1px 0 rgba(255,255,255,.24) !important;
    }
  `;
  document.head.appendChild(style);
}

export function installClaraGuideSchedulePhaseRedirect() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;
  installDateTargetStyles();

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
