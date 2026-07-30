import { Suspense, lazy } from "react";
import { LoaderCircle } from "lucide-react";

const ClaraGuideLearningHubPreviewLoaded = lazy(() =>
  import("./ClaraGuideLearningHubPreviewLoaded"),
);

function PreviewLoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex h-[244px] w-full items-center justify-center gap-2 rounded-[30px] border border-cyan-100/10 bg-[rgba(6,18,38,0.68)] text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50/72"
    >
      <LoaderCircle className="h-4 w-4 animate-spin text-cyan-100/80" />
      <span>Opening Learning Hub preview</span>
    </div>
  );
}

export default function ClaraGuideLearningHubPreview({ flushSpacing = true }) {
  return (
    <Suspense fallback={<PreviewLoadingState />}>
      <ClaraGuideLearningHubPreviewLoaded flushSpacing={flushSpacing} />
    </Suspense>
  );
}
