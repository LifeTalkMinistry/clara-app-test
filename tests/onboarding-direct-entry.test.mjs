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
    /SCREEN_IDS = \[[\s\S]*?"country"[\s\S]*?"measurement"[\s\S]*?"means-score"[\s\S]*?"score-meaning"[\s\S]*?"decision-impact"[\s\S]*?"clara-reveal"[\s\S]*?"mission-rule"[\s\S]*?"bigger-vision"[\s\S]*?\]/
  );
  assert.match(onboardingSource, /You can&apos;t manage what you don&apos;t measure\./);
  assert.match(onboardingSource, /Meet your Means Score\./);
  assert.match(onboardingSource, /One practical number that makes your financial position visible\./);
  assert.match(onboardingSource, /100 is the line\./);
  assert.match(onboardingSource, /Below it means financial pressure\. Above it means more financial room\./);
  assert.match(onboardingSource, /Before you spend, see what it changes\./);
  assert.match(onboardingSource, /How do you see the impact before you spend\?/);
  assert.match(onboardingSource, /By asking <ClaraBrandName \/>\./);
  assert.match(onboardingSource, /Your financial accountability companion\./);
  assert.match(onboardingSource, /Before you spend, ask <ClaraBrandName \/>\./);
  assert.match(onboardingSource, /understands your financial position\./);
  assert.match(onboardingSource, /Your Means Score shows where you currently stand\./);
  assert.match(onboardingSource, /helps you protect your Means Score/);
  assert.match(onboardingSource, /The bigger vision/);
  assert.match(onboardingSource, /The goal is bigger than one person\./);
  assert.match(onboardingSource, /Normalize healthy money habits in the Philippines\./);
  assert.match(onboardingSource, /See My Financial Status/);
  assert.match(onboardingShellSource, /if \(activeScreen === "mission-rule"\) return <MissionRuleScreen \/>/);
  assert.match(onboardingShellSource, /return <BiggerVisionScreen \/>/);

  assert.doesNotMatch(onboardingSource, /Money rarely disappears in one dramatic moment\./);
  assert.doesNotMatch(onboardingSource, /₱100–₱165 a day/);
  assert.doesNotMatch(onboardingShellSource, /MoneySituationScreen/);
  assert.doesNotMatch(onboardingShellSource, /FinancialSuccessScreen/);
  assert.doesNotMatch(onboardingShellSource, /PersonalScreen/);
  assert.doesNotMatch(onboardingShellSource, /AwarenessScreen/);
});

test("onboarding still routes completion directly into the CLARA ORB", () => {
  assert.match(onboardingShellSource, /const CLARA_ORB_PATH = "\/community\?view=orb"/);
  assert.match(onboardingShellSource, /rememberCompletion\(user\)/);
  assert.match(onboardingShellSource, /navigate\(CLARA_ORB_PATH, \{ replace: true \}\)/);
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
