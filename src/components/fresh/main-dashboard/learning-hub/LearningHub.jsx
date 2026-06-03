import { useState } from "react";
import useLearningHub from "./logic/useLearningHub";
import LearningHubCarousel from "./ui/LearningHubCarousel";
import LearningMaterialModal from "./modal/LearningMaterialModal";
import { activateClaraSampleUserData } from "@/lib/clara-demo-sample-data";

export default function LearningHub({ user = null }) {
  const {
    materials,
    selectedMaterial,
    isOpen,
    openMaterial,
    closeMaterial,
  } = useLearningHub();
  const [sampleStatus, setSampleStatus] = useState("");
  const [isActivatingSample, setIsActivatingSample] = useState(false);

  const activateSampleUser = async () => {
    if (isActivatingSample) return;

    try {
      setIsActivatingSample(true);
      setSampleStatus("Activating Max sample data...");
      const result = await activateClaraSampleUserData({ user });
      setSampleStatus(
        `Max sample activated: ${result.wallets} wallets, ${result.expenses} transactions, ${result.budgets} budget records, ${result.savingsGoals} goals.`
      );

      window.setTimeout(() => {
        window.location.reload();
      }, 900);
    } catch (error) {
      console.error("CLARA sample user activation failed:", error);
      setSampleStatus("Sample activation failed. Please try again.");
      setIsActivatingSample(false);
    }
  };

  return (
    <section
      className="clara-budget-focus-shift clara-budget-focus-hub w-full"
      onDoubleClick={activateSampleUser}
      title="Double click to activate Max sample user data"
    >
      <LearningHubCarousel materials={materials} onOpenMaterial={openMaterial} />

      {sampleStatus ? (
        <div className="mx-auto mt-2 max-w-[340px] rounded-2xl border border-cyan-100/20 bg-cyan-300/10 px-3 py-2 text-center text-[11px] font-semibold text-cyan-50/86 shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
          {sampleStatus}
        </div>
      ) : null}

      <LearningMaterialModal
        isOpen={isOpen}
        material={selectedMaterial}
        onClose={closeMaterial}
      />
    </section>
  );
}
