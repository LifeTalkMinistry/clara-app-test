import { useEffect, useMemo, useState } from "react";
import { CLARA_ENVIRONMENT_UPDATED, countEnvironmentSignals, readEnvironmentSignals } from "./claraEnvironmentUtils";
import FinancialClimateScreen from "./FinancialClimateUniversalScreen";

const CLARA_GUIDE_EXIT_EVENT = "clara:guide-exit";
const CLARA_GUIDE_MODE_CHANGE_EVENT = "clara:guide-mode-change";
const CLARA_GUIDE_ME_PHASE_CHANGE_EVENT = "clara:guide-me-phase-change";

function readMeGuidePhase() {
  if (typeof document === "undefined") return "inactive";
  const root = document.documentElement;
  if (root.classList.contains("clara-guide-me-complete-active")) return "complete";
  if (root.classList.contains("clara-guide-me-preview-active")) return "me-page-preview";
  return "inactive";
}

export default function DashboardMeLifePanel() {
  const [signals, setSignals] = useState(() => readEnvironmentSignals());
  const [meGuidePhase, setMeGuidePhase] = useState(() => readMeGuidePhase());

  const signalCount = useMemo(() => countEnvironmentSignals(signals), [signals]);
  const signalTotal = Math.max(signalCount, 1);
  const guidePreviewMode = meGuidePhase === "me-page-preview" || meGuidePhase === "complete";
  const refresh = () => setSignals(readEnvironmentSignals());

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("storage", handler);
    window.addEventListener(CLARA_ENVIRONMENT_UPDATED, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(CLARA_ENVIRONMENT_UPDATED, handler);
    };
  }, []);

  useEffect(() => {
    const syncPhaseFromRoot = () => setMeGuidePhase(readMeGuidePhase());
    const handleMeGuidePhaseChange = (event) => {
      setMeGuidePhase(event?.detail?.phase || "inactive");
    };
    const handleGuideExit = () => setMeGuidePhase("inactive");
    const handleGuideModeChange = (event) => {
      if (event?.detail?.active === false) setMeGuidePhase("inactive");
    };

    const observer =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(syncPhaseFromRoot)
        : null;
    observer?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    window.addEventListener(CLARA_GUIDE_ME_PHASE_CHANGE_EVENT, handleMeGuidePhaseChange);
    window.addEventListener(CLARA_GUIDE_EXIT_EVENT, handleGuideExit);
    window.addEventListener(CLARA_GUIDE_MODE_CHANGE_EVENT, handleGuideModeChange);

    return () => {
      observer?.disconnect();
      window.removeEventListener(CLARA_GUIDE_ME_PHASE_CHANGE_EVENT, handleMeGuidePhaseChange);
      window.removeEventListener(CLARA_GUIDE_EXIT_EVENT, handleGuideExit);
      window.removeEventListener(CLARA_GUIDE_MODE_CHANGE_EVENT, handleGuideModeChange);
    };
  }, []);

  useEffect(() => {
    if (!guidePreviewMode) return undefined;

    const stopStaticPreviewInteraction = (event) => {
      if (!event.target?.closest?.("[data-clara-guide-me-static-surface='true']")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    document.addEventListener("click", stopStaticPreviewInteraction, true);
    document.addEventListener("change", stopStaticPreviewInteraction, true);
    document.addEventListener("submit", stopStaticPreviewInteraction, true);

    return () => {
      document.removeEventListener("click", stopStaticPreviewInteraction, true);
      document.removeEventListener("change", stopStaticPreviewInteraction, true);
      document.removeEventListener("submit", stopStaticPreviewInteraction, true);
    };
  }, [guidePreviewMode]);

  return (
    <div
      data-clara-guide-me-preview={guidePreviewMode ? "true" : undefined}
      className={`relative h-[calc(100svh-126px)] min-h-0 rounded-[30px] bg-[#020817] shadow-[0_18px_52px_rgba(0,0,0,.24)] ${
        guidePreviewMode ? "z-[80] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "overflow-hidden"
      }`}
    >
      <div data-clara-guide-me-static-surface="true" className="h-full min-h-0">
        <FinancialClimateScreen
          signals={signals}
          signalCount={signalCount}
          signalTotal={signalTotal}
          guidePreviewMode={guidePreviewMode}
        />
      </div>
    </div>
  );
}
