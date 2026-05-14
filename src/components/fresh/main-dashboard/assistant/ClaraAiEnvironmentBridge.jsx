import { useEffect, useMemo, useRef, useState } from "react";
import ClaraAiEnvironmentOverlay from "@/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay";
import useClaraAiEnvironment from "@/components/fresh/main-dashboard/assistant/useClaraAiEnvironment";
import useFinancialData from "@/hooks/useFinancialData";
import useUserRole from "@/hooks/useUserRole";

const LONG_PRESS_DELAY = 520;
const DASHBOARD_DEFAULT_GUARD_VERSION = "dashboard-default-ai-mode-v2";

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
  const longPressTimerRef = useRef(null);

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

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointerup", handlePointerRelease, true);
    document.addEventListener("pointercancel", handlePointerRelease, true);
    document.addEventListener("touchend", handlePointerRelease, true);

    return () => {
      clearLongPressTimer();
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointerup", handlePointerRelease, true);
      document.removeEventListener("pointercancel", handlePointerRelease, true);
      document.removeEventListener("touchend", handlePointerRelease, true);
    };
  }, [claraAiEnvironment]);

  const closeOverlay = () => {
    setOverlayVisible(false);
    claraAiEnvironment.clearEnvironment?.();
  };

  return (
    <>
      <style>{CLARA_AI_ENVIRONMENT_STYLES}</style>

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
