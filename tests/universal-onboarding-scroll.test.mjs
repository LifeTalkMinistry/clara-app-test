import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const indexCss = readSource("src/index.css");
const onboardingSource = readSource("src/pages/onboarding/UniversalOnboarding.jsx");
const isolationRuntime = readSource(
  "src/runtime/installUniversalOnboardingScrollIsolation.js"
);
const runtimeRegistry = readSource("src/runtime/installClaraRuntimePatches.js");

const mobileMarker =
  "/* Android WebView onboarding: keep the shell as the single vertical scroll owner. */";
const mobileScrollCss = indexCss.slice(indexCss.indexOf(mobileMarker));

test("mobile Universal Onboarding has exactly one vertical scroll owner", () => {
  assert.notEqual(indexCss.indexOf(mobileMarker), -1);
  assert.match(
    mobileScrollCss,
    /#root \.clara-universal-onboarding \{[\s\S]*?overflow:\s*hidden !important;/
  );
  assert.match(
    mobileScrollCss,
    /#root \.clara-universal-onboarding-shell \{[\s\S]*?overflow-x:\s*hidden !important;[\s\S]*?overflow-y:\s*auto !important;/
  );
  assert.match(
    mobileScrollCss,
    /max-height:\s*calc\(100dvh - 24px\) !important;/
  );
  assert.doesNotMatch(
    mobileScrollCss,
    /\.clara-universal-onboarding-shell \{[\s\S]*?overflow:\s*visible !important;/
  );
  assert.doesNotMatch(
    mobileScrollCss,
    /\.clara-universal-onboarding \{[\s\S]*?overflow-y:\s*auto !important;/
  );
});

test("vertical panning is allowed from every onboarding option descendant", () => {
  assert.match(
    mobileScrollCss,
    /#root \.clara-universal-onboarding-screen,[\s\S]*?#root \.clara-universal-onboarding-option,[\s\S]*?#root \.clara-universal-onboarding-option \* \{[\s\S]*?touch-action:\s*pan-y;/
  );
  assert.match(
    mobileScrollCss,
    /\.clara-universal-onboarding-shell \{[\s\S]*?overscroll-behavior-y:\s*contain;[\s\S]*?-webkit-overflow-scrolling:\s*touch;/
  );
});

test("Universal Onboarding isolates the dashboard document lock while mounted", () => {
  assert.match(
    isolationRuntime,
    /UNIVERSAL_ONBOARDING_SELECTOR\s*=\s*"\.clara-universal-onboarding"/
  );
  assert.match(
    isolationRuntime,
    /root\.classList\.remove\(DASHBOARD_ONBOARDING_LOCK_CLASS\)/
  );
  assert.match(
    isolationRuntime,
    /root\.classList\.toggle\(UNIVERSAL_ONBOARDING_ROUTE_CLASS, isMounted\)/
  );
  assert.match(isolationRuntime, /new MutationObserver\(queueSync\)/);
  assert.match(
    isolationRuntime,
    /attributeFilter:\s*\["class"\]/
  );
  assert.match(
    runtimeRegistry,
    /import "\.\/installUniversalOnboardingScrollIsolation";/
  );
});

test("screen changes reset the active shell scroll container", () => {
  assert.match(onboardingSource, /ref=\{onboardingShellRef\}/);
  assert.match(
    onboardingSource,
    /onboardingShellRef\.current\?\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/
  );
  assert.match(
    onboardingSource,
    /sm:h-\[calc\(100dvh-48px\)\]/
  );
});
