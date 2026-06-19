import { useCallback, useMemo, useRef, useState } from "react";
import {
  ClaraGuideSimulationContext,
} from "@/context/ClaraGuideSimulationContext";

export const ORB_GUIDE_PHASES = Object.freeze({
  INTRO: "intro",
  AWAIT_SINGLE: "await-single",
  SHOWING_LOG_EXPENSE: "showing-log-expense",
  AWAIT_DOUBLE: "await-double",
  SHOWING_TRANSACTION_HUB: "showing-transaction-hub",
  AWAIT_HOLD: "await-hold",
  SHOWING_CLARA_CHAT: "showing-clara-chat",
  COMPLETE: "complete",
});

const EXPECTED_ACTION = Object.freeze({
  [ORB_GUIDE_PHASES.AWAIT_SINGLE]: "single",
  [ORB_GUIDE_PHASES.AWAIT_DOUBLE]: "double",
  [ORB_GUIDE_PHASES.AWAIT_HOLD]: "hold",
});

export default function ClaraGuideSimulationProvider({ children }) {
  const [guideModeActive, setGuideModeActive] = useState(false);
  const [orbLessonActive, setOrbLessonActive] = useState(false);
  const [orbPhase, setOrbPhase] = useState(ORB_GUIDE_PHASES.INTRO);
  const transitionLockRef = useRef(false);
  const financeModalCloseRef = useRef(null);

  const registerFinanceModalClose = useCallback((handler) => {
    financeModalCloseRef.current = typeof handler === "function" ? handler : null;
    return () => {
      if (financeModalCloseRef.current === handler) {
        financeModalCloseRef.current = null;
      }
    };
  }, []);

  const isGuideManualExpenseSimulation =
    orbLessonActive && orbPhase === ORB_GUIDE_PHASES.SHOWING_LOG_EXPENSE;
  const isGuideTransactionHubSimulation =
    orbLessonActive && orbPhase === ORB_GUIDE_PHASES.SHOWING_TRANSACTION_HUB;
  const isGuideClaraChatSimulation =
    orbLessonActive && orbPhase === ORB_GUIDE_PHASES.SHOWING_CLARA_CHAT;
  const isGuideSimulation =
    isGuideManualExpenseSimulation ||
    isGuideTransactionHubSimulation ||
    isGuideClaraChatSimulation;

  const value = useMemo(
    () => ({
      guideModeActive,
      setGuideModeActive,
      orbLessonActive,
      setOrbLessonActive,
      orbPhase,
      setOrbPhase,
      expectedOrbAction: EXPECTED_ACTION[orbPhase] || null,
      isGuideSimulation,
      isGuideManualExpenseSimulation,
      isGuideTransactionHubSimulation,
      isGuideClaraChatSimulation,
      transitionLockRef,
      financeModalCloseRef,
      registerFinanceModalClose,
    }),
    [
      guideModeActive,
      isGuideClaraChatSimulation,
      isGuideManualExpenseSimulation,
      isGuideSimulation,
      isGuideTransactionHubSimulation,
      orbLessonActive,
      orbPhase,
      registerFinanceModalClose,
    ]
  );

  return (
    <ClaraGuideSimulationContext.Provider value={value}>
      {children}
    </ClaraGuideSimulationContext.Provider>
  );
}
