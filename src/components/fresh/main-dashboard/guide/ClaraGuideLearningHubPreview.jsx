import useLearningHub from "../learning-hub/logic/useLearningHub";
import LearningHubCarousel from "../learning-hub/ui/LearningHubCarousel";

export default function ClaraGuideLearningHubPreview({ flushSpacing = true }) {
  const { carouselItems } = useLearningHub();

  return (
    <LearningHubCarousel
      items={carouselItems}
      hasCommittedAccess
      initialExpanded
      flushSpacing={flushSpacing}
      guidePreviewMode
    />
  );
}
