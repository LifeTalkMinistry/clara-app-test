import useLearningHub from "../learning-hub/logic/useLearningHub";
import LearningHubCarousel from "../learning-hub/ui/LearningHubCarousel";

export default function ClaraGuideLearningHubPreviewLoaded({ flushSpacing = true }) {
  const { carouselItems } = useLearningHub();

  return (
    <div
      data-clara-guide-learning-hub-preview="true"
      aria-label="Learning Hub Guide preview"
    >
      <LearningHubCarousel
        items={carouselItems}
        hasCommittedAccess
        initialExpanded
        flushSpacing={flushSpacing}
        disableAutoScroll
        disableInteractions
      />
    </div>
  );
}
