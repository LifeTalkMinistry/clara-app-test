import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const GUIDE_FEATURE_MONEY_LEFT_ORB = "money-left-orb";

const GUIDE_TARGET_CHANGE_EVENT = "clara:guide-target-change";
const GUIDE_FEATURE_COMPLETE_EVENT = "clara:guide-feature-complete";
const OPEN_AI_ENVIRONMENT_EVENT = "clara:open-ai-environment";
const CLOSE_AI_ENVIRONMENT_EVENT = "clara:close-ai-environment";
const ROOT_CLASS = "clara-guide-money-left-orb-active";

export const CLARA_ORB_GUIDE_COPY = {
  intro: {
    title: "MEET THE CLARA ORB",
    body: "One real control gives you three production actions.",
    footer: "LEARN EACH ACTION ONE AT A TIME.",
    actionLabel: "NEXT",
    items: [
      { label: "1 TAP", value: "Log Expense" },
      { label: "2 TAPS", value: "Transaction Hub" },
      { label: "HOLD", value: "Chat with CLARA" },
    ],
  },
  "await-single": {
    title: "1 TAP — LOG EXPENSE",
    body: "Tap the real CLARA orb once to open the production expense logger.",
    footer: "TAP THE ORB ONCE.",
  },
  "await-double": {
    title: "2 TAPS — TRANSACTION HUB",
    body: "Double-tap the real orb to open your complete production transaction history.",
    footer: "DOUBLE-TAP THE ORB NOW.",
  },
  "await-hold": {
    title: "HOLD — CHAT WITH CLARA",
    body: "Press and hold the real orb to open the production CLARA AI environment.",
    footer: "PRESS AND HOLD THE ORB NOW.",
  },
  complete: {
    title: "ORB LESSON COMPLETE",
    body: "You used all three real application surfaces without changing your data.",
    footer: "YOU CAN USE THE ORB ANYTIME.",
    actionLabel: "NEXT",
  },
};

const EXPECTED_ACTION = {
  "await-single": "single",
  "await-double": "double",
  "await-hold": "hold",
};

const SHOWING_PHASES = new Set([
  "showing-log-expense",
  "showing-transaction-hub",
  "showing-clara-chat",
]);

function emit(name, detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function focusOrb() {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    const orb = document.querySelector('[data-clara-manual-expense-orb="true"]');
    try {
      orb?.focus?.({ preventScroll: true });
    } catch {
      orb?.focus?.();
    }
  });
}

export default function useClaraGuideOrbLesson({
  isGuideMode,
  openManualExpenseModal,
  closeFinanceModal,
} = {}) {
  const [phase, setPhase] = useState("idle");
  const transitionLockRef = useRef(false);
  const featureCompleteSentRef = useRef(false);

  const unlockTransition = useCallback(() => {
    if (typeof window === "undefined") {
      transitionLockRef.current = false;
      return;
    }

    window.requestAnimationFrame(() => {
      transitionLockRef.current = false;
    });
  }, []);

  const transition = useCallback(
    (expectedPhase, nextPhase, action) => {
      if (transitionLockRef.current) return false;
      if (expectedPhase && phase !== expectedPhase) return false;

      transitionLockRef.current = true;
      action?.();
      setPhase(nextPhase);
      unlockTransition();
      return true;
    },
    [phase, unlockTransition]
  );

  const start = useCallback(() => {
    if (!isGuideMode || transitionLockRef.current) return;

    featureCompleteSentRef.current = false;
    transitionLockRef.current = true;
    setPhase("intro");
    emit(GUIDE_TARGET_CHANGE_EVENT, { feature: GUIDE_FEATURE_MONEY_LEFT_ORB });
    unlockTransition();
  }, [isGuideMode, unlockTransition]);

  const stop = useCallback(() => {
    closeFinanceModal?.();
    emit(CLOSE_AI_ENVIRONMENT_EVENT, { source: "guide-orb-stop" });
    setPhase("idle");
    transitionLockRef.current = false;
    focusOrb();
  }, [closeFinanceModal]);

  const onGuideOrbSingleTap = useCallback(() => {
    transition("await-single", "showing-log-expense", () => {
      openManualExpenseModal?.({ guideSimulationMode: true });
    });
  }, [openManualExpenseModal, transition]);

  const onGuideOrbDoubleTap = useCallback(() => {
    transition("await-double", "showing-transaction-hub");
  }, [transition]);

  const onGuideOrbLongPress = useCallback(() => {
    transition("await-hold", "showing-clara-chat", () => {
      emit(OPEN_AI_ENVIRONMENT_EVENT, {
        source: "guide-money-left-orb",
        guideSimulationMode: true,
      });
    });
  }, [transition]);

  const next = useCallback(() => {
    if (phase === "intro") {
      transition("intro", "await-single", focusOrb);
      return;
    }

    if (phase === "showing-log-expense") {
      transition("showing-log-expense", "await-double", () => {
        closeFinanceModal?.();
        focusOrb();
      });
      return;
    }

    if (phase === "showing-transaction-hub") {
      transition("showing-transaction-hub", "await-hold", focusOrb);
      return;
    }

    if (phase === "showing-clara-chat") {
      transition("showing-clara-chat", "complete", () => {
        emit(CLOSE_AI_ENVIRONMENT_EVENT, { source: "guide-money-left-orb-next" });
        focusOrb();
      });
      return;
    }

    if (phase === "complete" && !featureCompleteSentRef.current) {
      featureCompleteSentRef.current = true;
      emit(GUIDE_FEATURE_COMPLETE_EVENT, { feature: GUIDE_FEATURE_MONEY_LEFT_ORB });
    }
  }, [closeFinanceModal, phase, transition]);

  useEffect(() => {
    if (isGuideMode) return;
    if (phase !== "idle") stop();
  }, [isGuideMode, phase, stop]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const root = document.documentElement;
    const active = isGuideMode && phase !== "idle";
    root.classList.toggle(ROOT_CLASS, active);

    if (active) root.dataset.claraGuideOrbPhase = phase;
    else delete root.dataset.claraGuideOrbPhase;

    return () => {
      root.classList.remove(ROOT_CLASS);
      delete root.dataset.claraGuideOrbPhase;
    };
  }, [isGuideMode, phase]);

  return useMemo(
    () => ({
      phase,
      isActive: isGuideMode && phase !== "idle",
      expectedAction: EXPECTED_ACTION[phase] || null,
      isShowingFeature: SHOWING_PHASES.has(phase),
      copy: CLARA_ORB_GUIDE_COPY[phase] || null,
      start,
      stop,
      next,
      onGuideOrbSingleTap,
      onGuideOrbDoubleTap,
      onGuideOrbLongPress,
    }),
    [
      isGuideMode,
      next,
      onGuideOrbDoubleTap,
      onGuideOrbLongPress,
      onGuideOrbSingleTap,
      phase,
      start,
      stop,
    ]
  );
}
