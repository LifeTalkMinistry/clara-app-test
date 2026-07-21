import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("universal onboarding is loaded directly instead of through Suspense", () => {
  assert.match(
    appSource,
    /import UniversalOnboarding from "\.\/pages\/onboarding\/UniversalOnboarding";/
  );
  assert.doesNotMatch(
    appSource,
    /const UniversalOnboarding = lazy\(\(\) => import\("\.\/pages\/onboarding\/UniversalOnboarding"\)\);/
  );
});

test("the onboarding route bypasses the global auth and role loader", () => {
  const directEntryIndex = appSource.indexOf("if (isUniversalOnboardingRoute)");
  const globalLoaderIndex = appSource.indexOf("if (!authReady || loading || roleLoading)");

  assert.ok(directEntryIndex >= 0, "direct onboarding entry condition is missing");
  assert.ok(globalLoaderIndex >= 0, "global startup loader condition is missing");
  assert.ok(
    directEntryIndex < globalLoaderIndex,
    "onboarding must be considered before the global startup loader"
  );
  assert.match(
    appSource,
    /if \(isUniversalOnboardingRoute\) \{[\s\S]*?authReady && !loading && !user[\s\S]*?<Navigate to="\/login"[\s\S]*?return <UniversalOnboarding \/>;/
  );
});

test("other routes keep an explicit startup loader", () => {
  assert.match(
    appSource,
    /<FullScreenLoader message="Restoring your CLARA account\.\.\." \/>/
  );
  assert.match(
    appSource,
    /<Suspense fallback=\{<FullScreenLoader message="Opening CLARA\.\.\." \/>\}>/
  );
});
