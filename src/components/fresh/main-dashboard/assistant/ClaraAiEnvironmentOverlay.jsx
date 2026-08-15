import ClaraAiEnvironmentOverlayV2 from "./ClaraAiEnvironmentOverlayV2.jsx";
import ClaraBuyCheckImpactPortal from "./ClaraBuyCheckImpactPortal.jsx";
import ClaraBuyCheckUsagePortal from "./ClaraBuyCheckUsagePortal.jsx";

export default function ClaraAiEnvironmentOverlay(props) {
  const guidePreview = props?.layoutVariant === "guide-preview";

  return (
    <>
      <ClaraAiEnvironmentOverlayV2 {...props} />
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
