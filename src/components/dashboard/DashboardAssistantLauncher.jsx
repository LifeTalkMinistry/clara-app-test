import { Suspense, lazy } from "react";

const ClaraDecisionCoachPanel = lazy(() =>
  import("@/components/ai/ClaraDecisionCoachPanel")
);

export default function DashboardAssistantLauncher({ open, onClose, context }) {
  if (!open) return null;

  return (
    <Suspense fallback={null}>
      <ClaraDecisionCoachPanel
        open={open}
        onClose={onClose}
        context={context}
      />
    </Suspense>
  );
}
