import useLearningHub from "./logic/useLearningHub";
import LearningHubCarousel from "./ui/LearningHubCarousel";
import LearningMaterialModal from "./modal/LearningMaterialModal";

export default function LearningHub() {
  const {
    materials,
    selectedMaterial,
    isOpen,
    openMaterial,
    closeMaterial,
  } = useLearningHub();

  return (
    <section className="clara-budget-focus-shift clara-budget-focus-hub w-full">
      <LearningHubCarousel materials={materials} onOpenMaterial={openMaterial} />

      <LearningMaterialModal
        isOpen={isOpen}
        material={selectedMaterial}
        onClose={closeMaterial}
      />
    </section>
  );
}
