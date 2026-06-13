import { Suspense, lazy, useState } from "react";
import DailyTipCard from "../daily-tip";
import {
  openCommittedVersionModal,
  useCommittedFeatureAccess,
} from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";
import LearningHubToggleButton from "./ui/LearningHubToggleButton";

const LearningHubLoaded = lazy(() => import("./LearningHubLoaded"));

export default function LearningHub() {
  const [shouldLoadHub, setShouldLoadHub] = useState(false);
  const hasCommittedAccess = useCommittedFeatureAccess();
  const isLocked = !hasCommittedAccess;

  const handleOpenHub = () => {
    if (isLocked) {
      openCommittedVersionModal();
      return;
    }

    setShouldLoadHub(true);
  };

  return (
    <section className="clara-budget-focus-shift clara-budget-focus-hub w-full">
      <div className="relative -mb-1 w-full overflow-hidden px-1 py-0">
        <DailyTipCard
          hasCommittedAccess={hasCommittedAccess}
          onOpenCommitmentBooklet={openCommittedVersionModal}
        />

        {!shouldLoadHub ? (
          <LearningHubToggleButton
            isExpanded={false}
            isLocked={isLocked}
            isInsideCategory={false}
            headerLabel="Learning Hub"
            onClick={handleOpenHub}
          />
        ) : null}
      </div>

      {shouldLoadHub ? (
        <Suspense fallback={null}>
          <LearningHubLoaded initialExpanded />
        </Suspense>
      ) : null}
    </section>
  );
}
