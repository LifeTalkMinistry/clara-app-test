import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import ClaraAiEnvironmentOverlay from "@/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay";
import ClaraGuideFeatureControls from "@/components/fresh/main-dashboard/guide/ClaraGuideFeatureControls";
import ClaraGuideOrbBubble from "@/components/fresh/main-dashboard/guide/ClaraGuideOrbBubble";
import { useClaraGuideSimulation } from "@/context/ClaraGuideSimulationContext";
import { ORB_GUIDE_PHASES } from "@/context/ClaraGuideSimulationProvider";
import TransactionHub from "@/pages/TransactionHub";

const GUIDE_MODE_CHANGE_EVENT = "clara:guide-mode-change";
const GUIDE_TARGET_CHANGE_EVENT = "clara:guide-target-change";
const GUIDE_FEATURE_COMPLETE_EVENT = "clara:guide-feature-complete";
const GUIDE_EXIT_EVENT = "clara:guide-exit";
const OPEN_MANUAL_EXPENSE_EVENT = "clara:open-manual-expense";
const PRIVACY_FEATURE = "money-left-privacy";
const ORB_FEATURE = "money-left-orb";
const ORB_SELECTOR = '[data-clara-manual-expense-orb="true"]';

export default function ClaraGuideMoneyLeftOrbController() {
  const guide = useClaraGuideSimulation();
  const phaseRef = useRef(guide.orbPhase);
  const activeRef = useRef(guide.orbLessonActive);
  const completedRef = useRef(false);

  useEffect(() => {
    phaseRef.current = guide.orbPhase;
    activeRef.current = guide.orbLessonActive;
  }, [guide.orbLessonActive, guide.orbPhase]);

  return null;
}
