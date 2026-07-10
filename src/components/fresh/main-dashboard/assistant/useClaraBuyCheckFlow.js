import { useCallback, useEffect, useMemo, useState } from "react";
import useClaraBuyCheckReasonSummary from "./useClaraBuyCheckReasonSummary.js";
import useUserRole from "@/hooks/useUserRole";
import { openCommittedVersionModal } from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";
import {
  canUseFreeBuyCheckToday,
  recordFreeBuyCheckCompletion,
} from "@/lib/clara-buy-check-daily-limit";

const FREE_LIMIT_MESSAGE = {
  id: "clara-free-buy-check-daily-limit",
  role: "clara",
  text: "You already used today’s Free Buy Check. Your next free check becomes available tomorrow. Enter a Committed access code to continue today.",
};

function clean(value) {
  return String(value || "").trim();
}

export default function useClaraBuyCheckFlow({ assistantContext = {} } = {}) {
  const flow = useClaraBuyCheckReasonSummary({ assistantContext });
  const { hasCommittedAccess } = useUserRole();
  const [dailyLimitBlocked, setDailyLimitBlocked] = useState(false);
  const localUserId = useMemo(
    () => clean(assistantContext?.user?.id || assistantContext?.user?.email || "local-user") || "local-user",
    [assistantContext?.user?.email, assistantContext?.user?.id]
  );

  const showDailyLimit = useCallback(() => {
    setDailyLimitBlocked(true);
    openCommittedVersionModal();
    return false;
  }, []);

  const hasFreeAllowance = useCallback(
    () => hasCommittedAccess || canUseFreeBuyCheckToday(localUserId),
    [hasCommittedAccess, localUserId]
  );

  useEffect(() => {
    if (hasCommittedAccess || dailyLimitBlocked) return;
    if (flow.state?.step !== "complete" || flow.state?.done !== true) return;

    const sessionId = clean(flow.state?.sessionId);
    if (!sessionId) return;

    recordFreeBuyCheckCompletion(localUserId, sessionId);
  }, [
    dailyLimitBlocked,
    flow.state?.done,
    flow.state?.sessionId,
    flow.state?.step,
    hasCommittedAccess,
    localUserId,
  ]);

  useEffect(() => {
    if (!dailyLimitBlocked || !hasCommittedAccess) return;

    setDailyLimitBlocked(false);
    flow.startSession(`buy-check-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }, [dailyLimitBlocked, flow.startSession, hasCommittedAccess]);

  const startSession = useCallback(
    (sessionId = "") => {
      flow.startSession(sessionId);
      if (!hasFreeAllowance()) return showDailyLimit();

      setDailyLimitBlocked(false);
      return true;
    },
    [flow.startSession, hasFreeAllowance, showDailyLimit]
  );

  const clearSession = useCallback(() => {
    setDailyLimitBlocked(false);
    flow.clearSession();
  }, [flow.clearSession]);

  const submitAnswer = useCallback(
    (answer) => {
      if (dailyLimitBlocked || !hasFreeAllowance()) return showDailyLimit();
      return flow.submitAnswer(answer);
    },
    [dailyLimitBlocked, flow.submitAnswer, hasFreeAllowance, showDailyLimit]
  );

  const confirm = useCallback(() => {
    if (dailyLimitBlocked || !hasFreeAllowance()) return showDailyLimit();
    return flow.confirm();
  }, [dailyLimitBlocked, flow.confirm, hasFreeAllowance, showDailyLimit]);

  const checkAnother = useCallback(() => {
    if (!hasFreeAllowance()) return showDailyLimit();

    setDailyLimitBlocked(false);
    flow.checkAnother();
    return true;
  }, [flow.checkAnother, hasFreeAllowance, showDailyLimit]);

  const state = useMemo(
    () =>
      dailyLimitBlocked
        ? {
            ...flow.state,
            step: "complete",
            busy: false,
            done: true,
            diagnosis: null,
            dailyLimitReached: true,
            finalDecision: {
              ...(flow.state?.finalDecision || {}),
              phase: "blocked",
              busy: false,
            },
          }
        : flow.state,
    [dailyLimitBlocked, flow.state]
  );

  const messages = useMemo(
    () => (dailyLimitBlocked ? [FREE_LIMIT_MESSAGE] : flow.messages),
    [dailyLimitBlocked, flow.messages]
  );

  return useMemo(
    () => ({
      ...flow,
      state,
      messages,
      startSession,
      clearSession,
      submitAnswer,
      confirm,
      checkAnother,
      dailyLimitBlocked,
    }),
    [
      checkAnother,
      clearSession,
      confirm,
      dailyLimitBlocked,
      flow,
      messages,
      startSession,
      state,
      submitAnswer,
    ]
  );
}
