import { useState } from "react";
import useLearningHub from "./logic/useLearningHub";
import LearningHubCarousel from "./ui/LearningHubCarousel";
import LearningMaterialModal from "./modal/LearningMaterialModal";
import {
  isClaraSampleUserDataActive,
  toggleClaraSampleUserData,
} from "@/lib/clara-demo-sample-data";

export default function LearningHub({ user = null }) {
  const { materials, selectedMaterial, isOpen, openMaterial, closeMaterial } = useLearningHub();
  const [sampleStatus, setSampleStatus] = useState("");
  const [isSwitchingSampleData, setIsSwitchingSampleData] = useState(false);

  const runSampleToggle = async () => {
    if (isSwitchingSampleData) return;

    const shouldRestoreRealData = isClaraSampleUserDataActive();

    try {
      setIsSwitchingSampleData(true);
      setSampleStatus(
        shouldRestoreRealData
          ? "Restoring your original CLARA data..."
          : "Loading Max sample data..."
      );

      const result = await toggleClaraSampleUserData({ user });

      if (result?.mode === "real") {
        setSampleStatus("Original CLARA data restored.");
      } else {
        setSampleStatus(
          `Max sample loaded: ${result.wallets} wallets, ${result.expenses} transactions, ${result.budgets} budget records, ${result.savingsGoals} goals.`
        );
      }

      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      console.error("CLARA sample data switch failed:", error);
      setSampleStatus(
        shouldRestoreRealData
          ? "Original data restore failed. Please try again."
          : "Sample loading failed. Please try again."
      );
      setIsSwitchingSampleData(false);
    }
  };

  return (
    <section
      className="clara-budget-focus-shift clara-budget-focus-hub w-full"
      title="Double click Learning Hub to switch Max sample data on or off"
    >
      <LearningHubCarousel
        materials={materials}
        onOpenMaterial={openMaterial}
        onActivateSampleUser={runSampleToggle}
      />

      {sampleStatus ? (
        <div className="mx-auto mt-2 max-w-[340px] rounded-2xl border border-cyan-100/20 bg-cyan-300/10 px-3 py-2 text-center text-[11px] font-semibold text-cyan-50/86 shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
          {sampleStatus}
        </div>
      ) : null}

      <LearningMaterialModal isOpen={isOpen} material={selectedMaterial} onClose={closeMaterial} />
    </section>
  );
}
