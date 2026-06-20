import useLearningHub from "../learning-hub/logic/useLearningHub";
import LearningHubCarousel from "../learning-hub/ui/LearningHubCarousel";

export default function ClaraGuideLearningHubPreview({ flushSpacing = true }) {
  const { carouselItems } = useLearningHub();

  const blockPreviewActivation = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      data-clara-guide-learning-hub-preview="true"
      aria-label="Learning Hub Guide preview"
      onClickCapture={blockPreviewActivation}
      onKeyDownCapture={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          blockPreviewActivation(event);
        }
      }}
    >
      <LearningHubCarousel
        items={carouselItems}
        hasCommittedAccess
        initialExpanded
        flushSpacing={flushSpacing}
      />
    </div>
  );
}
