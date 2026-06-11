import useLearningHub from "./logic/useLearningHub";
import LearningHubCarousel from "./ui/LearningHubCarousel";
import LearningMaterialModal from "./modal/LearningMaterialModal";
import {
  openCommittedVersionModal,
  useCommittedFeatureAccess,
} from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";

export default function LearningHub() {
  const { materials, selectedMaterial, isOpen, openMaterial, closeMaterial } = useLearningHub();
  const hasCommittedAccess = useCommittedFeatureAccess();
  const primaryMaterials = materials.filter(({ type }) => ["video", "book"].includes(type));

  const handleOpenMaterial = (material) => {
    if (!hasCommittedAccess) {
      openCommittedVersionModal();
      return;
    }

    openMaterial(material);
  };

  return (
    <section className="clara-budget-focus-shift clara-budget-focus-hub w-full">
      <LearningHubCarousel
        materials={primaryMaterials}
        hasCommittedAccess={hasCommittedAccess}
        onOpenCommitmentBooklet={openCommittedVersionModal}
        onOpenMaterial={handleOpenMaterial}
      />

      <LearningMaterialModal
        isOpen={hasCommittedAccess && isOpen}
        material={selectedMaterial}
        onClose={closeMaterial}
      />
    </section>
  );
}
