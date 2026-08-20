import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mainSource = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const onboardingContentSource = readFileSync(
  new URL("../src/lib/universal-onboarding-content.js", import.meta.url),
  "utf8"
);

test("bootstrap loads only the full CLARA app", () => {
  assert.match(mainSource, /const App = React\.lazy\(\(\) => import\("\.\/App\.jsx"\)\);/);
  assert.doesNotMatch(mainSource, /UniversalOnboarding/);
  assert.doesNotMatch(mainSource, /isUniversalOnboardingLocation/);
  assert.doesNotMatch(mainSource, /DirectOnboardingEntry/);
  assert.match(
    mainSource,
    /function RootApplication\(\) \{[\s\S]*?<Suspense fallback=\{<StartupScreen message="Opening CLARA\.\.\." \/>\}>[\s\S]*?<App \/>/
  );
});

test("universal onboarding content remains available for a future restoration", () => {
  assert.doesNotMatch(onboardingContentSource, /app_settings/);
  assert.match(
    onboardingContentSource,
    /export async function loadUniversalOnboardingContent\(\) \{[\s\S]*?return buildUniversalOnboardingContent\(\);/
  );
});

test("startup failures produce a recovery screen instead of a permanent boot placeholder", () => {
  assert.match(mainSource, /class StartupErrorBoundary extends React\.Component/);
  assert.match(mainSource, /CLARA could not finish opening\./);
  assert.match(mainSource, /onClick=\{\(\) => window\.location\.reload\(\)\}/);
});
