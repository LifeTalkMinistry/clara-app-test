import { Suspense, lazy } from "react";

const ClaraAssistantPanel = lazy(() => import("@/components/ai/ClaraAssistantPanel"));

export default function DashboardAssistantLauncher({ open, onClose, context }) {
  if (!open) return null;

  return (
    <Suspense fallback={null}>
      <ClaraAssistantPanel open={open} onClose={onClose} context={context} />
    </Suspense>
  );
}
