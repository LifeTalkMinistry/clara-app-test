import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const indexCss = readSource("src/index.css");
const viewportFallbackCss = readSource(
  "src/universal-onboarding-viewport-fallback.css"
);
const onboardingSource = readSource("src/pages/onboarding/UniversalOnboarding.jsx");
const isolationRuntime = readSource(
  "src/runtime/installUniversalOnboardingScrollIsolation.js"
);
const runtimeRegistry = readSource("src/runtime/installClaraRuntimePatches.js");
const communityScrollCss = readSource("src/messages-back-to-community-label.css");
const viewportEdgeCss = readSource("src/viewport-edge-seam-fix.css");

const mobileMarker =
  "/* Android WebView onboarding: keep the shell as the single vertical scroll owner. */";
const mobileScrollCss = indexCss.slice(indexCss.indexOf(mobileMarker));

function getRuleBody(source, selector) {
  const selectorIndex = source.indexOf(selector);
  assert.notEqual(selectorIndex, -1, `Missing selector: ${selector}`);

  const openBraceIndex = source.indexOf("{", selectorIndex);
  const closeBraceIndex = source.indexOf("}", openBraceIndex);
  assert.notEqual(openBraceIndex, -1, `Missing opening brace for: ${selector}`);
  assert.notEqual(closeBraceIndex, -1, `Missing closing brace for: ${selector}`);

  return source.slice(openBraceIndex + 1, closeBraceIndex);
}

test("mobile Universal Onboarding has exactly one vertical scroll owner", () => {
  assert.notEqual(indexCss.indexOf(mobileMarker), -1);

  const outerRule = getRuleBody(
    mobileScrollCss,
    "#root .clara-universal-onboarding"
  );
  const shellRule = getRuleBody(
    mobileScrollCss,
    "#root .clara-universal-onboarding-shell"
  );

  assert.match(outerRule, /overflow:\s*hidden !important;/);
  assert.doesNotMatch(outerRule, /overflow-y:\s*auto !important;/);

  assert.match(shellRule, /overflow-x:\s*hidden !important;/);
  assert.match(shellRule, /overflow-y:\s*auto !important;/);
  assert.match(shellRule, /max-height:\s*calc\(100dvh - 24px\) !important;/);
  assert.doesNotMatch(shellRule, /overflow:\s*visible !important;/);
});

test("vertical panning is allowed from every onboarding option descendant", () => {
  const shellRule = getRuleBody(
    mobileScrollCss,
    "#root .clara-universal-onboarding-shell"
  );

  assert.match(
    mobileScrollCss,
    /#root \.clara-universal-onboarding-screen,[\s\S]*?#root \.clara-universal-onboarding-option,[\s\S]*?#root \.clara-universal-onboarding-option \* \{[\s\S]*?touch-action:\s*pan-y;/
  );
  assert.match(shellRule, /overscroll-behavior-y:\s*contain;/);
  assert.match(shellRule, /-webkit-overflow-scrolling:\s*touch;/);
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
  assert.match(isolationRuntime, /attributeFilter:\s*\["class"\]/);
  assert.match(
    runtimeRegistry,
    /import "\.\/installUniversalOnboardingScrollIsolation";/
  );
});

test("Android viewport fallback is CSS-only and cannot block React bootstrap", () => {
  assert.match(
    isolationRuntime,
    /import "\.\.\/universal-onboarding-viewport-fallback\.css";/
  );
  assert.doesNotMatch(isolationRuntime, /visualViewport/);
  assert.doesNotMatch(isolationRuntime, /window\.innerHeight/);
  assert.doesNotMatch(isolationRuntime, /document\.createElement\("style"\)/);
  assert.doesNotMatch(isolationRuntime, /style\.setProperty/);

  assert.match(viewportFallbackCss, /height:\s*100vh !important;/);
  assert.match(viewportFallbackCss, /height:\s*100svh !important;/);
  assert.match(
    viewportFallbackCss,
    /max-height:\s*calc\(100vh - 24px\) !important;/
  );
  assert.match(
    viewportFallbackCss,
    /max-height:\s*calc\(100svh - 24px\) !important;/
  );
  assert.match(viewportFallbackCss, /overflow-y:\s*auto !important;/);
});

test("the scroll isolation scheduler has an older-WebView fallback", () => {
  assert.match(isolationRuntime, /typeof queueMicrotask === "function"/);
  assert.match(isolationRuntime, /Promise\.resolve\(\)\.then\(callback\)/);
  assert.match(isolationRuntime, /typeof MutationObserver === "function"/);
});

test("screen changes reset the active shell scroll container", () => {
  assert.match(onboardingSource, /ref=\{onboardingShellRef\}/);
  assert.match(
    onboardingSource,
    /onboardingShellRef\.current\?\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/
  );
  assert.match(onboardingSource, /sm:h-\[calc\(100dvh-48px\)\]/);
});

test("Community scroll ownership does not depend on :has support in Android WebView", () => {
  const sectionStart = communityScrollCss.indexOf(
    "* Community owns its page scrolling directly."
  );
  const sectionEnd = communityScrollCss.indexOf(
    "* Keep the default Messages inbox focused on existing conversations.",
    sectionStart
  );

  assert.notEqual(sectionStart, -1);
  assert.notEqual(sectionEnd, -1);

  const communitySection = communityScrollCss.slice(sectionStart, sectionEnd);
  const communityRulesOnly = communitySection.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(communityRulesOnly, /:has\(/);
  assert.match(
    communitySection,
    /div\[class~="z-\[80\]"\]\[class~="h-\[100dvh\]"\]\s*\{/
  );
  assert.match(communitySection, /overflow-y:\s*auto !important;/);
  assert.match(communitySection, /touch-action:\s*pan-y;/);
  assert.match(communitySection, /-webkit-overflow-scrolling:\s*touch;/);
  assert.match(
    communitySection,
    /> header \{[\s\S]*?position:\s*sticky !important;/
  );
  assert.match(
    communitySection,
    /> main \{[\s\S]*?overflow:\s*visible !important;/
  );
});

test("route settle cannot create a transformed or filtered Community containing block", () => {
  assert.match(
    viewportEdgeCss,
    /\.theme-page-shell > \.relative > main \{[\s\S]*?padding-top:/
  );

  const keyframeStart = viewportEdgeCss.indexOf(
    "@keyframes clara-route-surface-settle-no-seam"
  );
  const routeRuleStart = viewportEdgeCss.indexOf(
    "body.clara-route-soft-settle .theme-page-shell main"
  );
  assert.notEqual(keyframeStart, -1);
  assert.notEqual(routeRuleStart, -1);

  const keyframeSection = viewportEdgeCss.slice(keyframeStart, routeRuleStart);
  assert.doesNotMatch(keyframeSection, /transform\s*:/);
  assert.doesNotMatch(keyframeSection, /filter\s*:/);

  const routeRule = getRuleBody(
    viewportEdgeCss,
    "body.clara-route-soft-settle .theme-page-shell main"
  );
  assert.match(routeRule, /transform:\s*none !important;/);
  assert.match(routeRule, /filter:\s*none !important;/);
  assert.match(routeRule, /will-change:\s*opacity !important;/);
  assert.doesNotMatch(routeRule, /will-change:[^;]*(transform|filter)/);
});
