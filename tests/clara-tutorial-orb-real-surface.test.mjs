import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const orbIntro = read("src/pages/onboarding/ClaraTutorialOrbIntro.jsx");
const orbPage = read("src/components/community/ClaraOrbPage.jsx");
const orbDemo = read("src/pages/onboarding/ClaraTutorialOrbDemo.jsx");
const coreTutorial = read("src/pages/onboarding/ClaraCoreTutorial.jsx");
const orbGreetingRuntime = read("src/runtime/installClaraOrbGreeting.js");
const orbIdleLifeRuntime = read("src/runtime/installClaraOrbIdleLife.js");
const assistantOverlay = read(
  "src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx"
);

test("tutorial ORB intro mounts the canonical production ORB page", () => {
  assert.match(orbIntro, /import ClaraOrbPage from ["']@\/components\/community\/ClaraOrbPage["']/);
  assert.match(orbIntro, /<ClaraOrbPage\s+[\s\S]*onActivate=/);
  assert.match(orbIntro, /activationDelayMs=\{360\}/);
  assert.doesNotMatch(orbIntro, /ClaraOrbMark/);
});

test("tutorial-only ORB presentation chrome is removed", () => {
  for (const retiredCopy of [
    "MEET CLARA",
    "This is the CLARA ORB.",
    "Tap the ORB above to continue",
  ]) {
    assert.equal(orbIntro.includes(retiredCopy), false, `${retiredCopy} must stay removed`);
  }

  assert.doesNotMatch(orbIntro, /clara-tour-progress/);
  assert.doesNotMatch(orbIntro, /clara-tour-footer/);
  assert.match(orbIntro, /clara-tutorial-orb-intro-nav/);
});

test("Juan owns the tutorial ORB greeting without reading the signed-in profile", () => {
  assert.match(orbIntro, /data-clara-tutorial-orb-name=["']Juan["']/);
  assert.match(orbGreetingRuntime, /TUTORIAL_GREETING_SELECTOR/);
  assert.match(orbGreetingRuntime, /dataset\.claraTutorialOrbName/);
  assert.match(orbGreetingRuntime, /loaded = Boolean\(tutorialIdentity\)/);
  assert.match(orbGreetingRuntime, /if \(!activeLabel \|\| loaded \|\| request\) return;/);
  assert.match(orbGreetingRuntime, /firstName \? `Hi \$\{firstName\}!` : ["']Hi!["']/);
});

test("tutorial ORB receives the authentic production idle blink and glow controller", () => {
  assert.match(orbIdleLifeRuntime, /TUTORIAL_LAUNCHER_SELECTOR/);
  assert.match(
    orbIdleLifeRuntime,
    /document\.querySelector\(TUTORIAL_LAUNCHER_SELECTOR\)[\s\S]*document\.querySelector\(PRODUCTION_LAUNCHER_SELECTOR\)/
  );
  assert.match(orbIdleLifeRuntime, /const applyBlink = \(progress\) =>/);
  assert.match(orbIdleLifeRuntime, /scheduleBlink\(700\)/);
  assert.match(orbIdleLifeRuntime, /animateGlow/);
});

test("canonical ORB preserves production activation while allowing controlled tutorial activation", () => {
  assert.match(orbPage, /export default function ClaraOrbPage\(\{ onActivate, activationDelayMs = 0 \}\)/);
  assert.match(orbPage, /if \(typeof onActivate === ["']function["']\) \{\s*onActivate\(\);\s*return;/);
  assert.match(orbPage, /new CustomEvent\(CLARA_PAUSE_OPEN_REQUEST_EVENT/);
  assert.match(orbPage, /source: ["']clara-orb-page["']/);
  assert.match(orbPage, /clara-money-left-orb-launching/);
  assert.match(orbPage, /MoneyLeftOrbVisual launching=\{launching\}/);
});

test("tutorial uses the real Buy Check composer, send button, and thinking row", () => {
  assert.match(orbDemo, /layoutVariant=["']guide-preview["']/);
  assert.match(orbDemo, /buyCheckState=\{tutorialState\(phase, payoff \|\| thinking\)\}/);
  assert.match(orbDemo, /onSubmitBuyCheckAnswer=\{handlePreparedSend\}/);
  assert.match(orbDemo, /composerPresetDraft=\{showInstruction \? JUAN_PURCHASE_QUESTION : ["']["']\}/);
  assert.match(orbDemo, /composerPresetLocked=\{showInstruction\}/);
  assert.match(orbDemo, /stage === ["']ready["']/);
  assert.match(orbDemo, /stage === ["']thinking["']/);
  assert.match(orbDemo, /text: ["']["']/);
  assert.match(orbDemo, /window\.setTimeout\(\(\) => \{[\s\S]*setStage\(["']answered["']\)[\s\S]*1250/);
  assert.match(orbDemo, /This is Juan&apos;s real CLARA chat\./);
  assert.doesNotMatch(orbDemo, /data-clara-buy-check-react-form[^\n]*display:\s*none/);

  assert.match(assistantOverlay, /composerPresetDraft = ["']["']/);
  assert.match(assistantOverlay, /composerPresetLocked = false/);
  assert.match(assistantOverlay, /presetDraft=\{composerPresetDraft\}/);
  assert.match(assistantOverlay, /presetLocked=\{composerPresetLocked\}/);
  assert.match(assistantOverlay, /data-clara-buy-check-thinking-row=["']true["']/);
  assert.match(assistantOverlay, /aria-label=["']Send Ask Before You Spend answer["']/);
});

test("guide-preview remains isolated from the real Buy Check session", () => {
  assert.match(assistantOverlay, /const isGuidePreview = layoutVariant === ["']guide-preview["']/);
  assert.match(
    assistantOverlay,
    /useEffect\(\(\) => \{\s*if \(isGuidePreview\) return;[\s\S]*ownedFlow\.startSession/
  );
  assert.match(assistantOverlay, /const activeState = isGuidePreview \? buyCheckState : ownedFlow\.state/);
  assert.match(assistantOverlay, /const activeMessages = isGuidePreview \? messages : ownedFlow\.messages/);
});

test("Juan leads to ORB before financial feature walkthroughs", () => {
  const meetIndex = coreTutorial.indexOf('{ id: "meet", type: "meet" }');
  const orbIndex = coreTutorial.indexOf('{ id: "orb", type: "orb" }');
  const profileIndex = coreTutorial.indexOf('{ id: "profile", type: "feature", feature: "profile" }');

  assert.ok(meetIndex >= 0, "Juan step must exist");
  assert.ok(orbIndex > meetIndex, "ORB must follow Juan");
  assert.ok(profileIndex > orbIndex, "feature walkthroughs must follow ORB activation");
});

test("later safe tutorial steps reuse real product surfaces", () => {
  assert.match(
    coreTutorial,
    /import DailyTipCard from ["']@\/components\/fresh\/main-dashboard\/daily-tip\/ui\/DailyTipCard["']/
  );
  assert.match(
    coreTutorial,
    /import LearningHubCarousel from ["']@\/components\/fresh\/main-dashboard\/learning-hub\/ui\/LearningHubCarousel["']/
  );
  assert.match(coreTutorial, /<DailyTipCard[\s\S]*isGuideMode[\s\S]*isDailyTipGuideActive/);
  assert.match(
    coreTutorial,
    /<LearningHubCarousel[\s\S]*disableAutoScroll[\s\S]*disableInteractions/
  );
  assert.doesNotMatch(coreTutorial, /clara-tour-habit-card/);
  assert.doesNotMatch(coreTutorial, /clara-tour-learning-card/);
});
