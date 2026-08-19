import { useMemo } from "react";
import ClaraAiEnvironmentOverlayV2 from "./ClaraAiEnvironmentOverlayV2.jsx";
import ClaraWeeklyMoneyCheckOverlay from "./ClaraWeeklyMoneyCheckOverlay.jsx";
import ClaraBuyCheckImpactPortal from "./ClaraBuyCheckImpactPortal.jsx";
import ClaraBuyCheckUsagePortal from "./ClaraBuyCheckUsagePortal.jsx";
import ClaraLifeProfilePortal from "./ClaraLifeProfilePortal.jsx";
import useClaraBuyCheckLifeContext from "./useClaraBuyCheckLifeContext.js";

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
    return (
      <ClaraWeeklyMoneyCheckOverlay
        {...props}
        claraAssistantContext={enrichedAssistantContext}
      />
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
