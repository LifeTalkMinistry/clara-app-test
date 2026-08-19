import { useEffect, useMemo, useRef, useState } from "react";
import ClaraAiEnvironmentOverlayV2 from "./ClaraAiEnvironmentOverlayV2.jsx";
import ClaraWeeklyMoneyCheckOverlay from "./ClaraWeeklyMoneyCheckOverlay.jsx";
import ClaraBuyCheckImpactPortal from "./ClaraBuyCheckImpactPortal.jsx";
import ClaraBuyCheckUsagePortal from "./ClaraBuyCheckUsagePortal.jsx";
import ClaraLifeProfilePortal from "./ClaraLifeProfilePortal.jsx";
import useClaraBuyCheckLifeContext from "./useClaraBuyCheckLifeContext.js";
import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";
import { getRecurringCashFlowOwnerId } from "@/lib/recurringCashFlowRepository";
import { WEEKLY_MONEY_CHECK_UPDATED_EVENT } from "@/lib/weeklyMoneyCheckState";

const WEEKLY_SESSION_STORAGE_PREFIX = "clara_weekly_money_check_v1";
const WEEKLY_CHAT_FLOW_VERSION = "weekly-money-check-chat-v1";

function getRuntimeRouteParam(name) {
  if (typeof window === "undefined") return null;

  const directValue = new URLSearchParams(window.location.search).get(name);
  if (directValue !== null) return directValue;

  const hash = String(window.location.hash || "");
  const queryIndex = hash.indexOf("?");
  if (queryIndex < 0) return null;

  return new URLSearchParams(hash.slice(queryIndex + 1)).get(name);
}

function useRuntimeRouteParam(name) {
  const [value, setValue] = useState(() => getRuntimeRouteParam(name));

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const sync = () => setValue(getRuntimeRouteParam(name));
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);

    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [name]);

  return value;
}

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
  const routeMode = useRuntimeRouteParam("mode");
  const weeklyMoneyCheckMode = !guidePreview && routeMode === "weekly-money-check";
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

  if (weeklyMoneyCheckMode) {
    const closeWeeklyMoneyCheck = () => {
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
