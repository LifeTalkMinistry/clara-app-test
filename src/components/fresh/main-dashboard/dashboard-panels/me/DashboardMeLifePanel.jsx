import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { CLARA_ENVIRONMENT_UPDATED, countEnvironmentSignals, readEnvironmentSignals } from "./claraEnvironmentUtils";
import ClaraGuideMePageOverlay from "../../guide/ClaraGuideMePageOverlay";
import FinancialClimateScreen from "./FinancialClimateUniversalScreen";

const CLARA_GUIDE_EXIT_EVENT = "clara:guide-exit";
const CLARA_GUIDE_MODE_CHANGE_EVENT = "clara:guide-mode-change";
const CLARA_GUIDE_ME_PHASE_CHANGE_EVENT = "clara:guide-me-phase-change";
const GUIDE_PROTECTED_STORAGE_KEYS = new Set([
  "clara_life_stage_profile_v1",
  "clara_life_stage_images_v1",
]);

let guideStorageGuardUsers = 0;
let originalStorageSetItem = null;

function isMeGuideRootActive() {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  return (
    root.classList.contains("clara-guide-me-preview-active") ||
    root.classList.contains("clara-guide-me-complete-active")
  );
}

function acquireGuideStorageGuard() {
  if (
    typeof window === "undefined" ||
    typeof Storage === "undefined" ||
    !Storage.prototype?.setItem
  ) {
    return () => {};
  }

  if (guideStorageGuardUsers === 0) {
    originalStorageSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function guardedGuideStorageSetItem(key, value) {
      const isProtectedLifeStageWrite =
        this === window.localStorage && GUIDE_PROTECTED_STORAGE_KEYS.has(String(key));

      if (isProtectedLifeStageWrite && isMeGuideRootActive()) return undefined;
      return originalStorageSetItem.call(this, key, value);
    };
  }

  guideStorageGuardUsers += 1;

  return () => {
    guideStorageGuardUsers = Math.max(0, guideStorageGuardUsers - 1);
    if (guideStorageGuardUsers === 0 && originalStorageSetItem) {
      Storage.prototype.setItem = originalStorageSetItem;
      originalStorageSetItem = null;
    }
  };
}

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

  useLayoutEffect(() => {
    if (!guidePreviewMode) return undefined;
    return acquireGuideStorageGuard();
  }, [guidePreviewMode]);

  useLayoutEffect(() => {
    if (!guidePreviewMode || typeof document === "undefined") return undefined;

    const surface = document.querySelector("[data-clara-guide-me-static-surface='true']");
    if (!surface) return undefined;

    const controls = Array.from(
      surface.querySelectorAll("button, input, select, textarea, a[href], [role='button']")
    );
    const snapshots = controls.map((control) => ({
      control,
      disabled: "disabled" in control ? control.disabled : undefined,
      ariaDisabled: control.getAttribute("aria-disabled"),
      tabIndex: control.getAttribute("tabindex"),
    }));

    controls.forEach((control) => {
      if ("disabled" in control) control.disabled = true;
      control.setAttribute("aria-disabled", "true");
      control.setAttribute("tabindex", "-1");
    });

    return () => {
      snapshots.forEach(({ control, disabled, ariaDisabled, tabIndex }) => {
        if ("disabled" in control && disabled !== undefined) control.disabled = disabled;
        if (ariaDisabled === null) control.removeAttribute("aria-disabled");
        else control.setAttribute("aria-disabled", ariaDisabled);
        if (tabIndex === null) control.removeAttribute("tabindex");
        else control.setAttribute("tabindex", tabIndex);
      });
    };
  }, [guidePreviewMode]);

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
      className={`relative h-full min-h-0 rounded-[30px] bg-[#020817] shadow-[0_18px_52px_rgba(0,0,0,.24)] ${
        guidePreviewMode
          ? "z-[80] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_button]:cursor-default [&_a]:cursor-default"
          : "overflow-hidden"
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

      {guidePreviewMode ? <ClaraGuideMePageOverlay phase={meGuidePhase} /> : null}
    </div>
  );
}
