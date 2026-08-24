import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ClaraAiEnvironmentOverlayV2 from "./ClaraAiEnvironmentOverlayV2.jsx";
import ClaraWeeklyMoneyCheckOverlay from "./ClaraWeeklyMoneyCheckOverlayV2.jsx";
import ClaraLogExpenseOverlay from "./ClaraLogExpenseOverlayV2.jsx";
import ClaraAddIncomeOverlay from "./ClaraAddIncomeOverlayV2.jsx";
import ClaraWalletOverlay from "./ClaraWalletOverlayV2.jsx";
import ClaraMoneyScheduleOverlay from "./ClaraMoneyScheduleOverlay.jsx";
import ClaraCalendarOverlay from "./ClaraCalendarOverlay.jsx";
import ClaraBuyCheckImpactPortal from "./ClaraBuyCheckImpactPortal.jsx";
import ClaraBuyCheckUsagePortal from "./ClaraBuyCheckUsagePortal.jsx";
import ClaraLifeProfilePortal from "./ClaraLifeProfilePortal.jsx";
import useClaraBuyCheckLifeContext from "./useClaraBuyCheckLifeContext.js";
import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";
import { getRecurringCashFlowOwnerId } from "@/lib/recurringCashFlowRepository";
import { WEEKLY_MONEY_CHECK_UPDATED_EVENT } from "@/lib/weeklyMoneyCheckState";

const WEEKLY_SESSION_STORAGE_PREFIX = "clara_weekly_money_check_v1";
const WEEKLY_CHAT_FLOW_VERSION = "weekly-money-check-chat-v1";
const ORB_ENTRY_MODES = new Set(["log-expense", "add-income", "wallet", "calendar", "money-schedule"]);

function restoreReadyStateWhenWeeklyCheckWasNotStarted(user) {
  if (typeof window === "undefined" || !window.localStorage) return;

  const key = `${WEEKLY_SESSION_STORAGE_PREFIX}_${getRecurringCashFlowOwnerId(user)}`;
  let current = null;
  try {
    current = JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    current = null;
  }

  if (
    !current ||
    current.status !== "in_progress" ||
    current.conversationVersion === WEEKLY_CHAT_FLOW_VERSION
  ) {
    return;
  }

  const next = {
    ...current,
    status: "idle",
    startedAt: null,
    completedAt: null,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent(WEEKLY_MONEY_CHECK_UPDATED_EVENT, {
      detail: { type: "session_cancelled_before_start", session: next },
    })
  );
}

export default function ClaraAiEnvironmentOverlay(props) {
  const guidePreview = props?.layoutVariant === "guide-preview";
  const [searchParams, setSearchParams] = useSearchParams();
  const [entryMode, setEntryMode] = useState(null);
  const [walletHandoff, setWalletHandoff] = useState(null);
  const [logExpenseResume, setLogExpenseResume] = useState(null);
  const [addIncomeResume, setAddIncomeResume] = useState(null);
  const routeMode = searchParams.get("mode");
  const weeklyMoneyCheckLaunchRequested =
    !guidePreview && routeMode === "weekly-money-check";
  const [weeklyMoneyCheckMode, setWeeklyMoneyCheckMode] = useState(
    () => weeklyMoneyCheckLaunchRequested
  );
  const logExpenseMode = !guidePreview && entryMode === "log-expense";
  const addIncomeMode = !guidePreview && entryMode === "add-income";
  const walletMode = !guidePreview && entryMode === "wallet";
  const calendarMode = !guidePreview && entryMode === "calendar";
  const moneyScheduleMode = !guidePreview && entryMode === "money-schedule";
  const weeklyAutoOpenRef = useRef(false);
  const lifeContext = useClaraBuyCheckLifeContext(props?.claraAssistantContext?.user);
  const enrichedAssistantContext = useMemo(
    () => ({
      ...(props?.claraAssistantContext || {}),
      lifeProfile: lifeContext.profile,
      lifeProfileSupportTier: lifeContext.supportTier,
      lifeProfileAccess: lifeContext.access,
    }),
    [
      props?.claraAssistantContext,
      lifeContext.access,
      lifeContext.profile,
      lifeContext.supportTier,
    ]
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handlePauseOpenRequest = (event) => {
      const mode = String(event?.detail?.mode || "").trim();
      const nextMode = ORB_ENTRY_MODES.has(mode) ? mode : null;
      setEntryMode(nextMode);
      setWalletHandoff(null);
      if (nextMode === "log-expense") setLogExpenseResume(null);
      if (nextMode === "add-income") setAddIncomeResume(null);
    };

    window.addEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, handlePauseOpenRequest);
    return () => window.removeEventListener(CLARA_PAUSE_OPEN_REQUEST_EVENT, handlePauseOpenRequest);
  }, []);

  useEffect(() => {
    if (!weeklyMoneyCheckLaunchRequested) return undefined;

    setWeeklyMoneyCheckMode(true);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("mode");
    nextParams.delete("source");
    setSearchParams(nextParams, { replace: true });

    return undefined;
  }, [searchParams, setSearchParams, weeklyMoneyCheckLaunchRequested]);

  useEffect(() => {
    if (!weeklyMoneyCheckMode) {
      weeklyAutoOpenRef.current = false;
      return undefined;
    }

    if (weeklyAutoOpenRef.current || props?.isActive || typeof window === "undefined") {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      if (weeklyAutoOpenRef.current) return;
      weeklyAutoOpenRef.current = true;

      const requestId = `clara-weekly-money-check-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.dispatchEvent(
        new CustomEvent(CLARA_PAUSE_OPEN_REQUEST_EVENT, {
          detail: {
            requestId,
            source: "weekly-money-check-route",
          },
        })
      );
    }, 220);

    return () => window.clearTimeout(timerId);
  }, [props?.isActive, weeklyMoneyCheckMode]);

  const returnToLogExpense = () => {
    setWalletHandoff(null);
    setEntryMode("log-expense");
  };

  const returnToAddIncome = (walletResult = null) => {
    setWalletHandoff(null);
    if (walletResult?.wallet) {
      setAddIncomeResume((current) => ({
        ...(current || {}),
        wallet: walletResult.wallet,
        walletAction: walletResult.action || "created",
        cancelled: false,
      }));
    } else if (walletResult?.cancelled) {
      setAddIncomeResume((current) => ({
        ...(current || {}),
        cancelled: true,
      }));
    }
    setEntryMode("add-income");
  };

  useEffect(() => {
    if (entryMode !== "wallet" || walletHandoff?.returnMode !== "log-expense") {
      return;
    }

    const walletCountBefore = Number(walletHandoff?.walletCountBefore) || 0;
    const financeRevisionBefore = Number(walletHandoff?.financeRevisionBefore) || 0;
    const currentWalletCount = Array.isArray(enrichedAssistantContext?.wallets)
      ? enrichedAssistantContext.wallets.length
      : 0;
    const currentFinanceRevision = Number(enrichedAssistantContext?.financeRevision) || 0;

    const walletWasCreated = currentWalletCount > walletCountBefore;
    const financeWasUpdated = currentFinanceRevision > financeRevisionBefore;
    if (!walletWasCreated && !financeWasUpdated) return;

    returnToLogExpense();
  }, [
    entryMode,
    walletHandoff?.returnMode,
    walletHandoff?.walletCountBefore,
    walletHandoff?.financeRevisionBefore,
    enrichedAssistantContext?.wallets,
    enrichedAssistantContext?.financeRevision,
  ]);

  if (logExpenseMode) {
    const closeLogExpense = () => {
      setEntryMode(null);
      setWalletHandoff(null);
      setLogExpenseResume(null);
      props?.onClose?.();
    };

    const openWalletChat = (detail = {}) => {
      const walletCountBefore = Array.isArray(enrichedAssistantContext?.wallets)
        ? enrichedAssistantContext.wallets.length
        : 0;
      const financeRevisionBefore = Number(enrichedAssistantContext?.financeRevision) || 0;

      setLogExpenseResume({
        amount: Number(detail?.amount) || 0,
        item: String(detail?.item || "").trim(),
      });
      setWalletHandoff({
        ...detail,
        intent: detail?.intent === "create" ? undefined : detail?.intent,
        source: "log-expense",
        returnMode: "log-expense",
        walletCountBefore,
        financeRevisionBefore,
      });
      setEntryMode("wallet");
    };

    return (
      <ClaraLogExpenseOverlay
        {...props}
        claraAssistantContext={enrichedAssistantContext}
        resumeState={logExpenseResume}
        onOpenWalletChat={openWalletChat}
        onClose={closeLogExpense}
      />
    );
  }

  if (addIncomeMode) {
    const closeAddIncome = () => {
      setEntryMode(null);
      setWalletHandoff(null);
      setAddIncomeResume(null);
      props?.onClose?.();
    };

    const openWalletChat = (detail = {}) => {
      setAddIncomeResume({
        sourceId: String(detail?.sourceId || ""),
        sourceName: String(detail?.sourceName || "").trim(),
        amount: Number(detail?.amount) || 0,
        reason: "transfer-after-wallet",
        cancelled: false,
      });
      setWalletHandoff({
        intent: "create",
        source: "add-income",
        returnMode: "add-income",
      });
      setEntryMode("wallet");
    };

    return (
      <ClaraAddIncomeOverlay
        {...props}
        claraAssistantContext={enrichedAssistantContext}
        resumeState={addIncomeResume}
        onOpenWalletChat={openWalletChat}
        onClose={closeAddIncome}
      />
    );
  }

  if (walletMode) {
    const closeWallet = () => {
      if (walletHandoff?.returnMode === "log-expense") {
        returnToLogExpense();
        return;
      }
      if (walletHandoff?.returnMode === "add-income") {
        returnToAddIncome({ cancelled: true });
        return;
      }
      setEntryMode(null);
      setWalletHandoff(null);
      props?.onClose?.();
    };

    const walletReady = (detail = {}) => {
      if (walletHandoff?.returnMode === "log-expense") {
        returnToLogExpense();
        return;
      }
      if (walletHandoff?.returnMode === "add-income") {
        returnToAddIncome(detail);
      }
    };

    return (
      <ClaraWalletOverlay
        {...props}
        claraAssistantContext={enrichedAssistantContext}
        entryContext={walletHandoff}
        onWalletReady={walletReady}
        onClose={closeWallet}
      />
    );
  }

  if (calendarMode) {
    const closeCalendar = () => {
      setEntryMode(null);
      props?.onClose?.();
    };

    return (
      <ClaraCalendarOverlay
        {...props}
        claraAssistantContext={enrichedAssistantContext}
        onClose={closeCalendar}
      />
    );
  }

  if (moneyScheduleMode) {
    const closeMoneySchedule = () => {
      setEntryMode(null);
      props?.onClose?.();
    };

    return (
      <ClaraMoneyScheduleOverlay
        {...props}
        claraAssistantContext={enrichedAssistantContext}
        onClose={closeMoneySchedule}
      />
    );
  }

  if (weeklyMoneyCheckMode) {
    const closeWeeklyMoneyCheck = () => {
      setWeeklyMoneyCheckMode(false);
      restoreReadyStateWhenWeeklyCheckWasNotStarted(enrichedAssistantContext?.user);
      props?.onClose?.();
    };

    return (
      <>
        <ClaraWeeklyMoneyCheckOverlay
          {...props}
          claraAssistantContext={enrichedAssistantContext}
          onClose={closeWeeklyMoneyCheck}
        />
        <span
          data-clara-pause-entry-board="true"
          className="hidden"
          aria-hidden="true"
        />
      </>
    );
  }

  return (
    <>
      <ClaraAiEnvironmentOverlayV2
        {...props}
        claraAssistantContext={enrichedAssistantContext}
      />
      <ClaraLifeProfilePortal
        isActive={Boolean(props?.isActive)}
        disabled={guidePreview}
        onBeforeOpen={props?.onClose}
        onClose={props?.onClose}
      />
      <ClaraBuyCheckImpactPortal
        isActive={Boolean(props?.isActive)}
        disabled={guidePreview}
      />
      <ClaraBuyCheckUsagePortal
        isActive={Boolean(props?.isActive)}
        disabled={guidePreview}
      />
    </>
  );
}
