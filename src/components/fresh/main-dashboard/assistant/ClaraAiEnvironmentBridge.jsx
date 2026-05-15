import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import ClaraAiEnvironmentOverlay from "@/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay";
import useClaraAiEnvironment from "@/components/fresh/main-dashboard/assistant/useClaraAiEnvironment";
import useFinancialData from "@/hooks/useFinancialData";
import useUserRole from "@/hooks/useUserRole";
import {
  clearClaraDevIdentityOverride,
  getDevIdentityScenarios,
  readClaraDevIdentityOverride,
  reloadForDevIdentityChange,
  writeClaraDevIdentityOverride,
} from "@/lib/clara-dev-simulator";

const LONG_PRESS_DELAY = 520;
const DASHBOARD_DEFAULT_GUARD_VERSION = "dashboard-default-ai-mode-v2";
const DEV_EYE_DOUBLE_TAP_WINDOW = 460;

const CLARA_AI_ENVIRONMENT_STYLES = `
  .clara-ai-environment-active [data-clara-ai-background="true"] {
    opacity: 0.28;
    filter: blur(3.5px) saturate(0.82);
    transform: translate3d(0, -8px, 0) scale(0.985);
    pointer-events: none;
    transition:
      opacity 360ms cubic-bezier(0.22, 1, 0.36, 1),
      filter 360ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
  }
`;

function isMoneyLeftOrbTarget(target) {
  return Boolean(
    target?.closest?.(
      '[data-clara-manual-expense-orb="true"], [aria-label*="Tap to log expense"], [aria-label*="ask CLARA"]'
    )
  );
}

function isMoneyPrivacyEyeTarget(target) {
  return Boolean(target?.closest?.('[data-clara-summary-privacy-toggle="true"]'));
}

function ClaraDeveloperPanel({ isVisible, activeScenarioId, onClose, onApplyScenario, onClearScenario }) {
  const scenarios = getDevIdentityScenarios();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[320] flex items-end justify-center bg-black/40 px-4 pb-5 backdrop-blur-[3px]">
      <div className="w-full max-w-[430px] overflow-hidden rounded-[32px] border border-white/10 bg-[#071019]/95 shadow-[0_25px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="border-b border-white/8 px-5 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200/14 bg-cyan-300/10 text-cyan-100">
              <Sparkles className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/50">
                CLARA Developer Access
              </p>

              <h3 className="mt-1 text-[1rem] font-black text-white">
                Identity Simulator
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-bold text-white/65"
            >
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            {scenarios.map((scenario) => {
              const active = activeScenarioId === scenario.id;

              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => onApplyScenario(scenario.id)}
                  className={`w-full rounded-[24px] border px-4 py-4 text-left transition active:scale-[0.99] ${
                    active
                      ? "border-emerald-200/22 bg-emerald-300/12"
                      : "border-white/8 bg-white/[0.04] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-black text-white">
                        {scenario.label}
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-slate-300/62">
                        {scenario.description}
                      </p>
                    </div>

                    {active ? (
                      <div className="rounded-full border border-emerald-200/18 bg-emerald-300/12 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100">
                        Active
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClearScenario}
              className="flex-1 rounded-[20px] border border-white/10 bg-white/[0.05] px-4 py-3 text-[12px] font-black text-white/70"
            >
              Return To Real State
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClaraAiEnvironmentBridge() {
  const claraAiEnvironment = useClaraAiEnvironment();
  const { user } = useUserRole();

  const {
    expenses = [],
    wallets = [],
    walletTransactions = [],
    transfers = [],
    budgets = [],
    savingsGoals = [],
    emergencyFund = null,
    loading = false,
    refreshing = false,
  } = useFinancialData(user);

  const claraAssistantContext = useMemo(
    () => ({
      user,
      expenses,
      wallets,
      walletTransactions,
      transfers,
      budgets,
      savingsGoals,
      emergencyFund,
      loading,
      refreshing,
    }),
    [
      user,
      expenses,
      wallets,
      walletTransactions,
      transfers,
      budgets,
      savingsGoals,
      emergencyFund,
      loading,
      refreshing,
    ]
  );

  const [overlayVisible, setOverlayVisible] = useState(false);
  const [developerPanelVisible, setDeveloperPanelVisible] = useState(false);
  const [activeDevScenario, setActiveDevScenario] = useState(
    () => readClaraDevIdentityOverride()?.scenarioId || null
  );

  const longPressTimerRef = useRef(null);
  const lastEyeTapAtRef = useRef(0);

  const isActive = overlayVisible;

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const root = document.documentElement;
    const body = document.body;

    root.classList.toggle("clara-ai-environment-active", isActive);
    root.dataset.claraAiMode = isActive ? "active" : "idle";
    root.dataset.claraAiGuard = DASHBOARD_DEFAULT_GUARD_VERSION;

    if (body) {
      body.classList.toggle("clara-ai-environment-active", isActive);
      body.dataset.claraAiMode = isActive ? "active" : "idle";
      body.dataset.claraAiGuard = DASHBOARD_DEFAULT_GUARD_VERSION;
    }

    return () => {
      root.classList.remove("clara-ai-environment-active");
      delete root.dataset.claraAiMode;
      delete root.dataset.claraAiGuard;

      if (body) {
        body.classList.remove("clara-ai-environment-active");
        delete body.dataset.claraAiMode;
        delete body.dataset.claraAiGuard;
      }
    };
  }, [isActive]);

  useEffect(() => {
    setOverlayVisible(false);
    claraAiEnvironment.clearEnvironment?.();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const clearLongPressTimer = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const handlePointerDown = (event) => {
      if (!isMoneyLeftOrbTarget(event.target)) return;

      clearLongPressTimer();

      longPressTimerRef.current = window.setTimeout(() => {
        setOverlayVisible(true);
        claraAiEnvironment.activateOverlay?.("money-left-orb-long-press");
      }, LONG_PRESS_DELAY);
    };

    const handlePointerRelease = () => {
      clearLongPressTimer();
    };

    const handleEyeClick = (event) => {
      if (!isMoneyPrivacyEyeTarget(event.target)) return;

      const now = Date.now();
      const previousTapAt = lastEyeTapAtRef.current || 0;
      lastEyeTapAtRef.current = now;

      if (previousTapAt && now - previousTapAt <= DEV_EYE_DOUBLE_TAP_WINDOW) {
        lastEyeTapAtRef.current = 0;
        clearLongPressTimer();
        setOverlayVisible(false);
        setDeveloperPanelVisible(true);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointerup", handlePointerRelease, true);
    document.addEventListener("pointercancel", handlePointerRelease, true);
    document.addEventListener("touchend", handlePointerRelease, true);
    document.addEventListener("click", handleEyeClick, true);

    return () => {
      clearLongPressTimer();
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointerup", handlePointerRelease, true);
      document.removeEventListener("pointercancel", handlePointerRelease, true);
      document.removeEventListener("touchend", handlePointerRelease, true);
      document.removeEventListener("click", handleEyeClick, true);
    };
  }, [claraAiEnvironment]);

  const closeOverlay = () => {
    setOverlayVisible(false);
    claraAiEnvironment.clearEnvironment?.();
  };

  const applyDeveloperScenario = (scenarioId) => {
    const override = writeClaraDevIdentityOverride(scenarioId);
    setActiveDevScenario(override.scenarioId);
    reloadForDevIdentityChange();
  };

  const clearDeveloperScenario = () => {
    clearClaraDevIdentityOverride();
    setActiveDevScenario(null);
    reloadForDevIdentityChange();
  };

  return (
    <>
      <style>{CLARA_AI_ENVIRONMENT_STYLES}</style>

      <ClaraDeveloperPanel
        isVisible={developerPanelVisible}
        activeScenarioId={activeDevScenario}
        onClose={() => setDeveloperPanelVisible(false)}
        onApplyScenario={applyDeveloperScenario}
        onClearScenario={clearDeveloperScenario}
      />

      <ClaraAiEnvironmentOverlay
        isActive={isActive}
        messages={claraAiEnvironment.messages}
        claraAssistantContext={claraAssistantContext}
        requestFeaturePrompt={claraAiEnvironment.requestFeaturePrompt}
        onClose={closeOverlay}
      />
    </>
  );
}
