import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import ClaraAiEnvironmentOverlay from "@/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay";
import ClaraDemoGuidedOverlay from "@/components/fresh/main-dashboard/assistant/ClaraDemoGuidedOverlay";
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
import { buildClaraDemoAccountRecords, clearClaraDemoAccount, seedClaraDemoAccount } from "@/lib/clara-demo-account";

const LONG_PRESS_DELAY = 520;
const DASHBOARD_DEFAULT_GUARD_VERSION = "dashboard-default-ai-mode-v2";
const DEV_EYE_DOUBLE_TAP_WINDOW = 460;
const DEMO_INTRO_SEEN_KEY = "clara_demo_intro_seen_at_v1";
const CLARA_DEMO_LOCAL_USER_ID = "clara-demo-user";
const CLARA_AI_USE_DEMO_CONTEXT_KEY = "CLARA_AI_USE_DEMO_CONTEXT";

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

  .clara-demo-intro-active [data-clara-ai-background="true"] {
    opacity: 0.36;
    filter: blur(2.5px) saturate(0.9);
    pointer-events: none;
  }

  .clara-demo-intro-active [data-clara-manual-expense-orb="true"],
  .clara-demo-intro-active [aria-label*="Tap to log expense"],
  .clara-demo-intro-active [aria-label*="ask CLARA"] {
    position: relative !important;
    z-index: 315 !important;
    animation: clara-demo-orb-glow 1.1s ease-in-out infinite !important;
    border-color: rgba(167, 243, 208, 0.82) !important;
    background:
      radial-gradient(circle at 35% 28%, rgba(255,255,255,0.34), rgba(110,231,183,0.22) 32%, rgba(20,184,166,0.18) 62%, rgba(88,28,135,0.20) 100%) !important;
    box-shadow:
      0 0 0 5px rgba(110, 231, 183, 0.20),
      0 0 0 12px rgba(34, 211, 238, 0.12),
      0 0 28px rgba(110, 231, 183, 0.70),
      0 0 58px rgba(34, 211, 238, 0.36),
      0 0 82px rgba(168, 85, 247, 0.30),
      inset 0 1px 0 rgba(255,255,255,0.35) !important;
  }

  @keyframes clara-demo-orb-glow {
    0%, 100% {
      transform: scale(1);
      filter: brightness(1.08) saturate(1.18);
      box-shadow:
        0 0 0 5px rgba(110, 231, 183, 0.18),
        0 0 0 12px rgba(34, 211, 238, 0.10),
        0 0 24px rgba(110, 231, 183, 0.62),
        0 0 50px rgba(34, 211, 238, 0.30),
        0 0 72px rgba(168, 85, 247, 0.24),
        inset 0 1px 0 rgba(255,255,255,0.35);
    }
    50% {
      transform: scale(1.09);
      filter: brightness(1.28) saturate(1.35);
      box-shadow:
        0 0 0 7px rgba(110, 231, 183, 0.26),
        0 0 0 17px rgba(34, 211, 238, 0.16),
        0 0 36px rgba(110, 231, 183, 0.86),
        0 0 72px rgba(34, 211, 238, 0.44),
        0 0 104px rgba(168, 85, 247, 0.38),
        inset 0 1px 0 rgba(255,255,255,0.45);
    }
  }

  @keyframes clara-demo-pointer-float {
    0%, 100% {
      transform: translateY(0);
      opacity: 0.88;
    }
    50% {
      transform: translateY(10px);
      opacity: 1;
    }
  }

  .clara-demo-pointer-float {
    animation: clara-demo-pointer-float 1.35s ease-in-out infinite;
    will-change: transform, opacity;
  }
`;

function getLocalUserId(user) {
  const value = user?.id || user?.email || "local-user";
  return String(value || "local-user").trim() || "local-user";
}

function isAiDemoContextEnabled() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage?.getItem(CLARA_AI_USE_DEMO_CONTEXT_KEY) === "true" || window.localStorage?.getItem(CLARA_AI_USE_DEMO_CONTEXT_KEY) === "1";
  } catch {
    return false;
  }
}

function getStoredDemoIntroSeenAt() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(DEMO_INTRO_SEEN_KEY);
  } catch {
    return null;
  }
}

function setStoredDemoIntroSeenAt(value) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(DEMO_INTRO_SEEN_KEY, String(value || "seen"));
  } catch {
    // Ignore unavailable storage.
  }
}

function clearStoredDemoIntroSeenAt() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(DEMO_INTRO_SEEN_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

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

function DemoIntroOverlay({ isVisible, onStartDemo }) {
  const holdTimerRef = useRef(null);

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  useEffect(() => clearHoldTimer, []);

  if (!isVisible) return null;

  const startHold = (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      clearHoldTimer();
      onStartDemo?.();
    }, LONG_PRESS_DELAY);
  };

  const cancelHold = (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearHoldTimer();
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-[260] mx-auto flex w-full max-w-[430px] flex-col justify-end overflow-hidden px-5 pb-[176px] text-white">
      <div className="absolute inset-0 -z-10 bg-slate-950/52 backdrop-blur-[1.5px]" />

      <div className="pointer-events-none rounded-[30px] border border-white/14 bg-slate-950/78 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-100/20 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)]">
            <Sparkles className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/58">
              CLARA Demo
            </p>
            <h3 className="mt-1 text-[1.05rem] font-black leading-tight text-white">
              This is a sample user’s information.
            </h3>
            <p className="mt-3 text-[12.5px] leading-5 text-slate-200/78">
              Alex is 27, a BPO employee, building an emergency fund while balancing bills, debt, and emotional spending.
            </p>
            <div className="mt-4 rounded-[22px] border border-emerald-200/18 bg-emerald-300/10 px-4 py-3 text-[12.5px] font-black leading-5 text-emerald-100">
              Long press the glowing CLARA orb now.
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-[38px] right-[14px] flex w-[90px] flex-col items-center gap-1.5 text-emerald-100">
        <div className="rounded-full border border-emerald-200/22 bg-slate-950/72 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] shadow-[0_14px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl">
          Hold here
        </div>
        <div className="clara-demo-pointer-float text-5xl leading-none drop-shadow-[0_0_18px_rgba(110,231,183,0.75)]">
          ↓
        </div>
      </div>

      <div
        role="button"
        aria-label="Hold CLARA orb to start demo"
        tabIndex={0}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onPointerLeave={cancelHold}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        className="pointer-events-auto absolute bottom-[16px] right-[4px] h-[132px] w-[132px] rounded-full"
      />
    </div>
  );
}

function ClaraDeveloperPanel({ isVisible, activeScenarioId, isApplyingScenario, onClose, onApplyScenario, onClearScenario }) {
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
              disabled={isApplyingScenario}
              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-bold text-white/65 disabled:opacity-40"
            >
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-4 py-4">
          {isApplyingScenario ? (
            <div className="mb-3 rounded-[22px] border border-emerald-200/15 bg-emerald-300/10 px-4 py-3 text-[12px] font-bold text-emerald-100/85">
              Preparing selected CLARA scenario...
            </div>
          ) : null}

          <div className="space-y-2">
            {scenarios.map((scenario) => {
              const active = activeScenarioId === scenario.id;

              return (
                <button
                  key={scenario.id}
                  type="button"
                  disabled={isApplyingScenario}
                  onClick={() => onApplyScenario(scenario.id)}
                  className={`w-full rounded-[24px] border px-4 py-4 text-left transition active:scale-[0.99] disabled:opacity-55 ${
                    active
                      ? "border-emerald-200/22 bg-emerald-300/12"
                      : "border-white/8 bg-white/[0.04] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-black text-white">{scenario.name}</p>
                      <p className="mt-1 text-[11.5px] leading-5 text-slate-300/70">{scenario.description}</p>
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
              disabled={isApplyingScenario}
              onClick={onClearScenario}
              className="flex-1 rounded-[20px] border border-white/10 bg-white/[0.05] px-4 py-3 text-[12px] font-black text-white/70 disabled:opacity-45"
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

  const currentOverride = readClaraDevIdentityOverride();
  const isDemoUserScenario = currentOverride?.scenarioId === "demo_user";
  const demoIntroSeenToken = currentOverride?.appliedAt || "demo_user";

  const claraAssistantContext = useMemo(
    () => {
      const baseContext = {
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
      };

      if (!isAiDemoContextEnabled()) return baseContext;

      const demoContext = buildClaraDemoAccountRecords("clara-ai-demo-context");

      return {
        ...baseContext,
        ...demoContext,
        user,
        loading,
        refreshing,
        aiOnlyDemoContext: true,
        aiOnlyDemoContextLabel: "CLARA AI demo context only — dashboard and storage unchanged",
      };
    },
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
    () => currentOverride?.scenarioId || null
  );
  const [isApplyingScenario, setIsApplyingScenario] = useState(false);
  const [demoIntroVisible, setDemoIntroVisible] = useState(
    () => isDemoUserScenario && getStoredDemoIntroSeenAt() !== demoIntroSeenToken
  );

  const longPressTimerRef = useRef(null);
  const lastEyeTapAtRef = useRef(0);

  const isActive = overlayVisible;

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const root = document.documentElement;
    const body = document.body;

    root.classList.toggle("clara-ai-environment-active", isActive);
    root.classList.toggle("clara-demo-intro-active", demoIntroVisible);
    root.dataset.claraAiMode = isActive ? "active" : "idle";
    root.dataset.claraAiGuard = DASHBOARD_DEFAULT_GUARD_VERSION;

    if (body) {
      body.classList.toggle("clara-ai-environment-active", isActive);
      body.classList.toggle("clara-demo-intro-active", demoIntroVisible);
      body.dataset.claraAiMode = isActive ? "active" : "idle";
      body.dataset.claraAiGuard = DASHBOARD_DEFAULT_GUARD_VERSION;
    }

    return () => {
      root.classList.remove("clara-ai-environment-active");
      root.classList.remove("clara-demo-intro-active");
      delete root.dataset.claraAiMode;
      delete root.dataset.claraAiGuard;

      if (body) {
        body.classList.remove("clara-ai-environment-active");
        body.classList.remove("clara-demo-intro-active");
        delete body.dataset.claraAiMode;
        delete body.dataset.claraAiGuard;
      }
    };
  }, [isActive, demoIntroVisible]);

  useEffect(() => {
    setOverlayVisible(false);
    claraAiEnvironment.clearEnvironment?.();
  }, []);

  useEffect(() => {
    if (!isDemoUserScenario) {
      setDemoIntroVisible(false);
      return;
    }

    setDemoIntroVisible(getStoredDemoIntroSeenAt() !== demoIntroSeenToken);
  }, [isDemoUserScenario, demoIntroSeenToken]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const clearLongPressTimer = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const markDemoIntroSeen = () => {
      setStoredDemoIntroSeenAt(demoIntroSeenToken);
      setDemoIntroVisible(false);
    };

    const handlePointerDown = (event) => {
      if (!isMoneyLeftOrbTarget(event.target)) return;

      clearLongPressTimer();

      longPressTimerRef.current = window.setTimeout(() => {
        if (isDemoUserScenario && demoIntroVisible) {
          markDemoIntroSeen();
        }

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
  }, [claraAiEnvironment, demoIntroSeenToken, demoIntroVisible, isDemoUserScenario]);

  const closeOverlay = () => {
    setOverlayVisible(false);
    claraAiEnvironment.clearEnvironment?.();
  };

  const startDemoFromIntro = () => {
    setStoredDemoIntroSeenAt(demoIntroSeenToken);
    setDemoIntroVisible(false);
    setOverlayVisible(true);
    claraAiEnvironment.activateOverlay?.("demo-intro-hold-orb");
  };

  const applyDeveloperScenario = async (scenarioId) => {
    if (isApplyingScenario) return;

    const localUserId = getLocalUserId(user);
    setIsApplyingScenario(true);

    try {
      clearStoredDemoIntroSeenAt();

      if (scenarioId === "demo_user") {
        await clearClaraDemoAccount(CLARA_DEMO_LOCAL_USER_ID);
        await seedClaraDemoAccount(CLARA_DEMO_LOCAL_USER_ID);
      } else {
        await clearClaraDemoAccount(CLARA_DEMO_LOCAL_USER_ID);
        await clearClaraDemoAccount(localUserId);
      }

      const override = writeClaraDevIdentityOverride(scenarioId);
      setActiveDevScenario(override.scenarioId);
      reloadForDevIdentityChange();
    } catch (error) {
      console.error("CLARA developer scenario failed:", error);
      setIsApplyingScenario(false);
    }
  };

  const clearDeveloperScenario = async () => {
    if (isApplyingScenario) return;

    const localUserId = getLocalUserId(user);
    setIsApplyingScenario(true);

    try {
      clearStoredDemoIntroSeenAt();
      await clearClaraDemoAccount(CLARA_DEMO_LOCAL_USER_ID);
      await clearClaraDemoAccount(localUserId);
      clearClaraDevIdentityOverride();
      setActiveDevScenario(null);
      reloadForDevIdentityChange();
    } catch (error) {
      console.error("CLARA developer scenario reset failed:", error);
      setIsApplyingScenario(false);
    }
  };

  return (
    <>
      <style>{CLARA_AI_ENVIRONMENT_STYLES}</style>

      <ClaraDeveloperPanel
        isVisible={developerPanelVisible}
        activeScenarioId={activeDevScenario}
        isApplyingScenario={isApplyingScenario}
        onClose={() => setDeveloperPanelVisible(false)}
        onApplyScenario={applyDeveloperScenario}
        onClearScenario={clearDeveloperScenario}
      />

      <DemoIntroOverlay
        isVisible={isDemoUserScenario && demoIntroVisible && !isActive && !developerPanelVisible}
        onStartDemo={startDemoFromIntro}
      />

      {isDemoUserScenario ? (
        <ClaraDemoGuidedOverlay
          isActive={isActive}
          onClose={closeOverlay}
        />
      ) : (
        <ClaraAiEnvironmentOverlay
          isActive={isActive}
          messages={claraAiEnvironment.messages}
          claraAssistantContext={claraAssistantContext}
          requestFeaturePrompt={claraAiEnvironment.requestFeaturePrompt}
          onClose={closeOverlay}
        />
      )}
    </>
  );
}
