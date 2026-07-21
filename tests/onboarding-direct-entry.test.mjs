import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("universal onboarding is not imported into the live app flow", () => {
  assert.doesNotMatch(
    appSource,
    /import UniversalOnboarding from "\.\/pages\/onboarding\/UniversalOnboarding";/
  );
  assert.doesNotMatch(
    appSource,
    /lazy\(\(\) => import\("\.\/pages\/onboarding\/UniversalOnboarding"\)\)/
  );
});

test("the onboarding URL redirects authenticated users to the dashboard", () => {
  assert.match(
    appSource,
    /<Route path="\/onboarding" element=\{<Navigate to="\/dashboard" replace \/>\} \/>/
  );
  assert.doesNotMatch(appSource, /if \(isUniversalOnboardingRoute\)/);
  assert.doesNotMatch(appSource, /return <UniversalOnboarding \/>/);
});

test("logged-out routes still wait for account restoration and then use Login", () => {
  assert.match(
    appSource,
    /<FullScreenLoader message="Restoring your CLARA account\.\.\." \/>/
  );
  assert.match(
    appSource,
    /<Navigate to="\/login" replace state=\{\{ from: location \}\} \/>/
  );
  assert.match(
    appSource,
    /<Suspense fallback=\{<FullScreenLoader message="Opening CLARA\.\.\." \/>\}>/
  );
});
