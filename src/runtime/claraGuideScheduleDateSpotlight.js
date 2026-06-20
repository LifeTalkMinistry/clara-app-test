const PHASE_CHANGE_EVENT = "clara:guide-schedule-phase-change";
const GUIDE_EXIT_EVENT = "clara:guide-exit";
const ACTIVE_PHASES = new Set(["select-date", "double-tap-date"]);

let installed = false;
let phase = "inactive";
let mirror = null;
let source = null;

function clearMirror() {
  mirror?.remove();
  mirror = null;
  source = null;
}

export function installClaraGuideScheduleDateSpotlight() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;

  window.addEventListener(PHASE_CHANGE_EVENT, (event) => {
    phase = event?.detail?.phase || "inactive";
    if (!ACTIVE_PHASES.has(phase)) clearMirror();
  });

  window.addEventListener(GUIDE_EXIT_EVENT, clearMirror);
}
