import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const loginSource = readFileSync(new URL("../src/pages/Login.jsx", import.meta.url), "utf8");
const onboardingSource = readFileSync(
  new URL("../src/pages/onboarding/UniversalOnboarding.jsx", import.meta.url),
  "utf8"
);

test("mission onboarding is available as an authenticated app route", () => {
  assert.match(
    appSource,
    /const UniversalOnboarding = lazy\(\(\) =>[\s\S]*?import\("\.\/pages\/onboarding\/UniversalOnboarding"\)/
  );
  assert.match(
    appSource,
    /path="\/onboarding"\s+element=\{<UniversalOnboarding \/>\}/
  );
  assert.doesNotMatch(appSource, /if \(isUniversalOnboardingRoute\)/);
});

test("new account creation enters mission onboarding while normal login does not", () => {
  assert.match(
    loginSource,
    /if \(mode === "signup"\)[\s\S]*?await signUp\([\s\S]*?navigate\("\/onboarding", \{ replace: true \}\)/
  );
  assert.match(
    loginSource,
    /else \{[\s\S]*?await signIn\([\s\S]*?navigate\(destination, \{ replace: true \}\)/
  );
});

test("onboarding is mission-led instead of a financial diagnosis questionnaire", () => {
  assert.doesNotMatch(onboardingSource, /QUESTION_SETS/);
  assert.doesNotMatch(onboardingSource, /commitment_level/);
  assert.doesNotMatch(onboardingSource, /money_pressure_point/);
  assert.doesNotMatch(onboardingSource, /spending_guidance_style/);
  assert.match(onboardingSource, /Filipinos work hard for every peso\./);
  assert.match(onboardingSource, /Ask before you spend\./);
  assert.match(onboardingSource, /CLARA is free to start\. You are never forced to pay to begin\./);
  assert.match(onboardingSource, /Supporting CLARA doesn&apos;t buy discipline\./);
});

test("support exploration hands off to the existing CLARA support bubble", () => {
  assert.match(onboardingSource, /clara_open_support_after_onboarding_v1/);
  assert.match(onboardingSource, /clara_support_bubble_cycle_epoch_v2/);
  assert.match(appSource, /document\.querySelector\("\[data-clara-support-bubble\]"\)/);
  assert.match(appSource, /supportButton\.click\(\)/);
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
