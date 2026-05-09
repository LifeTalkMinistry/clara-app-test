import fs from "node:fs";
import path from "node:path";

const targetPath = path.resolve(
  "src/components/fresh/main-dashboard/shell/DashboardModalStack.jsx"
);

const nextContent = `import { lazy, Suspense } from "react";

import DashboardModalLayer from "@/components/fresh/main-dashboard/shell/DashboardModalLayer";

const DashboardFinanceExpandedSheetLayer = lazy(() =>
  import("@/components/fresh/main-dashboard/shell/DashboardFinanceExpandedSheetLayer")
);
const DashboardProgramOnboardingModal = lazy(() =>
  import("@/components/fresh/main-dashboard/onboarding/DashboardProgramOnboardingModal")
);
const DashboardFinanceModalRenderer = lazy(() =>
  import("@/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer")
);

export default function DashboardModalStack({
  expandedSheetLayerProps,
  onboardingModalProps,
  financeModalRendererProps,
}) {
  const shouldRenderExpandedSheet = Boolean(
    expandedSheetLayerProps?.expandedFinanceCard
  );
  const shouldRenderOnboarding = Boolean(onboardingModalProps?.showOnboarding);
  const shouldRenderFinanceModals = Boolean(
    financeModalRendererProps?.financeModal?.type ||
      financeModalRendererProps?.showAiAssistant
  );

  return (
    <DashboardModalLayer>
      {shouldRenderExpandedSheet ? (
        <Suspense fallback={null}>
          <DashboardFinanceExpandedSheetLayer {...expandedSheetLayerProps} />
        </Suspense>
      ) : null}

      {shouldRenderOnboarding ? (
        <Suspense fallback={null}>
          <DashboardProgramOnboardingModal {...onboardingModalProps} />
        </Suspense>
      ) : null}

      {shouldRenderFinanceModals ? (
        <Suspense fallback={null}>
          <DashboardFinanceModalRenderer {...financeModalRendererProps} />
        </Suspense>
      ) : null}
    </DashboardModalLayer>
  );
}
`;

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function assertResult(source) {
  const required = [
    'import { lazy, Suspense } from "react";',
    "const DashboardFinanceExpandedSheetLayer = lazy(() =>",
    "const DashboardProgramOnboardingModal = lazy(() =>",
    "const DashboardFinanceModalRenderer = lazy(() =>",
    "const shouldRenderExpandedSheet = Boolean(",
    "const shouldRenderOnboarding = Boolean(",
    "const shouldRenderFinanceModals = Boolean(",
    "financeModalRendererProps?.financeModal?.type",
    "financeModalRendererProps?.showAiAssistant",
    "<Suspense fallback={null}>",
  ];

  required.forEach((text) => {
    if (!source.includes(text)) fail(`Missing expected text after patch: ${text}`);
  });

  const forbidden = [
    'import DashboardFinanceModalRenderer from "@/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer";',
    'import DashboardFinanceExpandedSheetLayer from "@/components/fresh/main-dashboard/shell/DashboardFinanceExpandedSheetLayer";',
    'import DashboardProgramOnboardingModal from "@/components/fresh/main-dashboard/onboarding/DashboardProgramOnboardingModal";',
    "<DashboardFinanceExpandedSheetLayer {...expandedSheetLayerProps} />\n      <DashboardProgramOnboardingModal {...onboardingModalProps} />\n      <DashboardFinanceModalRenderer {...financeModalRendererProps} />",
  ];

  forbidden.forEach((text) => {
    if (source.includes(text)) fail(`Static modal stack child import/render still exists: ${text}`);
  });
}

if (!fs.existsSync(targetPath)) {
  fail(`File not found: ${targetPath}`);
}

const original = fs.readFileSync(targetPath, "utf8");
assertResult(nextContent);

if (original === nextContent) {
  console.log("No changes needed. DashboardModalStack children already appear lazy-loaded.");
  process.exit(0);
}

fs.writeFileSync(targetPath, nextContent, "utf8");

console.log("✅ DashboardModalStack child branches are now lazy-loaded and conditional.");
console.log("✅ Expanded sheet, onboarding modal, and finance modal renderer load only when needed.");
console.log("✅ Modal behavior and finance logic were left untouched.");
console.log("\nNext: run npm run build to verify modal stack child lazy wiring.\n");
