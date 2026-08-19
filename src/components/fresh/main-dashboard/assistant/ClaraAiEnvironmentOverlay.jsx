import { useMemo } from "react";
import ClaraAiEnvironmentOverlayV2 from "./ClaraAiEnvironmentOverlayV2.jsx";
import ClaraWeeklyMoneyCheckOverlay from "./ClaraWeeklyMoneyCheckOverlay.jsx";
import ClaraBuyCheckImpactPortal from "./ClaraBuyCheckImpactPortal.jsx";
import ClaraBuyCheckUsagePortal from "./ClaraBuyCheckUsagePortal.jsx";
import ClaraLifeProfilePortal from "./ClaraLifeProfilePortal.jsx";
import useClaraBuyCheckLifeContext from "./useClaraBuyCheckLifeContext.js";
import { getRecurringCashFlowOwnerId } from "@/lib/recurringCashFlowRepository";
import { WEEKLY_MONEY_CHECK_UPDATED_EVENT } from "@/lib/weeklyMoneyCheckState";

const WEEKLY_SESSION_STORAGE_PREFIX = "clara_weekly_money_check_v1";
const WEEKLY_CHAT_FLOW_VERSION = "weekly-money-check-chat-v1";

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
  const weeklyMoneyCheckMode =
    !guidePreview &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("mode") === "weekly-money-check";
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
