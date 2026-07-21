import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mainSource = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const onboardingContentSource = readFileSync(
  new URL("../src/lib/universal-onboarding-content.js", import.meta.url),
  "utf8"
);

test("direct onboarding is selected before the full App module is needed", () => {
  assert.match(mainSource, /const App = React\.lazy\(\(\) => import\("\.\/App\.jsx"\)\);/);
  assert.match(
    mainSource,
    /const UniversalOnboarding = React\.lazy\(\(\) =>[\s\S]*?import\("\.\/pages\/onboarding\/UniversalOnboarding\.jsx"\)/
  );
  assert.match(mainSource, /function isUniversalOnboardingLocation\(location\)/);
  assert.match(
    mainSource,
    /if \(isUniversalOnboardingLocation\(location\)\) \{[\s\S]*?return <DirectOnboardingEntry \/>;[\s\S]*?\}/
  );
  assert.match(mainSource, /<StartupScreen message="Opening onboarding\.\.\." \/>/);
  assert.match(mainSource, /<UniversalOnboarding \/>/);
});

test("direct onboarding keeps authentication enforcement after startup settles", () => {
  assert.match(mainSource, /const \{ user, loading, authReady \} = useAuth\(\);/);
  assert.match(mainSource, /if \(authReady && !loading && !user\)/);
  assert.match(mainSource, /<Navigate to="\/login" replace/);
});

test("onboarding content no longer imports a compatibility data service", () => {
  assert.doesNotMatch(onboardingContentSource, /supabase/i);
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
