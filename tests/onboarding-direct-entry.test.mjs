import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const loginSource = readFileSync(new URL("../src/pages/Login.jsx", import.meta.url), "utf8");
const betaWelcomeSource = readFileSync(
  new URL("../src/pages/onboarding/FoundingBetaWelcome.jsx", import.meta.url),
  "utf8"
);
const onboardingShellSource = readFileSync(
  new URL("../src/pages/onboarding/UniversalOnboarding.jsx", import.meta.url),
  "utf8"
);
const onboardingScreensSource = readFileSync(
  new URL("../src/pages/onboarding/UniversalOnboardingScreens.jsx", import.meta.url),
  "utf8"
);
const onboardingSource = `${onboardingShellSource}\n${onboardingScreensSource}`;

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

test("new account creation no longer shows the founding beta introduction", () => {
  assert.match(
    appSource,
    /const FoundingBetaWelcome = lazy\(\(\) =>[\s\S]*?import\("\.\/pages\/onboarding\/FoundingBetaWelcome"\)/
  );
  assert.match(
    appSource,
    /path="\/beta-welcome"\s+element=\{<FoundingBetaWelcome \/>\}/
  );
  assert.match(
    loginSource,
    /if \(mode === "signup"\)[\s\S]*?await signUp\([\s\S]*?navigate\("\/beta-welcome", \{ replace: true \}\)/
  );
  assert.match(betaWelcomeSource, /<Navigate to="\/onboarding" replace \/>/);
  assert.doesNotMatch(betaWelcomeSource, /00 \/ 08/);
  assert.doesNotMatch(betaWelcomeSource, /very first beta users/i);
  assert.doesNotMatch(betaWelcomeSource, /Beta Season/i);
  assert.doesNotMatch(betaWelcomeSource, /helping shape what/i);
});

test("normal login does not enter the beta welcome or mission onboarding", () => {
  assert.match(
    loginSource,
    /else \{[\s\S]*?await signIn\([\s\S]*?navigate\(destination, \{ replace: true \}\)/
  );
});

test("onboarding separates CLARA mechanics from the bigger vision", () => {
  assert.match(
    onboardingScreensSource,
    /SCREEN_IDS = \[[\s\S]*?"country"[\s\S]*?"measurement"[\s\S]*?"means-score"[\s\S]*?"score-meaning"[\s\S]*?"simulation-ready"[\s\S]*?"juan-intro"[\s\S]*?"juan-choice"[\s\S]*?"quantified-feedback"[\s\S]*?"ask-clara-build-up"[\s\S]*?"clara-reveal"[\s\S]*?"mission-rule"[\s\S]*?"clara-context"[\s\S]*?"bigger-vision"[\s\S]*?\]/
  );
  assert.match(onboardingScreensSource, /JUAN_SHOE_OPTIONS/);
  assert.match(onboardingScreensSource, /afterScore/);
  assert.match(onboardingShellSource, /activeScreen === "mission-rule"/);
  assert.match(onboardingShellSource, /BiggerVisionScreen/);
  assert.doesNotMatch(onboardingShellSource, /MoneySituationScreen/);
  assert.doesNotMatch(onboardingShellSource, /FinancialSuccessScreen/);
});

test("onboarding still routes completion directly into the CLARA ORB", () => {
  assert.match(onboardingShellSource, /const CLARA_ORB_PATH = "\/community\?view=orb"/);
  assert.match(onboardingShellSource, /rememberCompletion\(user\)/);
  assert.match(onboardingShellSource, /navigate\(CLARA_ORB_PATH, \{ replace: true \}\)/);
});

test("logged-out routes still wait for account restoration and then use Login", () => {
  assert.match(appSource, /<FullScreenLoader message="Restoring your CLARA account\.\.\." \/>/);
  assert.match(appSource, /const isPublicAuthRoute =/);
  assert.match(appSource, /state=\{location\.pathname === "\/" \? undefined : \{ from: location \}\}/);
  assert.match(appSource, /<Suspense fallback=\{<FullScreenLoader message="Opening CLARA\.\.\." \/>\}>/);
});
