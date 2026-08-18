import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const orbIntro = read("src/pages/onboarding/ClaraTutorialOrbIntro.jsx");
const orbPage = read("src/components/community/ClaraOrbPage.jsx");
const orbDemo = read("src/pages/onboarding/ClaraTutorialOrbDemo.jsx");
const coreTutorial = read("src/pages/onboarding/ClaraCoreTutorial.jsx");

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

test("canonical ORB preserves production activation while allowing controlled tutorial activation", () => {
  assert.match(orbPage, /export default function ClaraOrbPage\(\{ onActivate, activationDelayMs = 0 \}\)/);
  assert.match(orbPage, /if \(typeof onActivate === ["']function["']\) \{\s*onActivate\(\);\s*return;/);
  assert.match(orbPage, /new CustomEvent\(CLARA_PAUSE_OPEN_REQUEST_EVENT/);
  assert.match(orbPage, /source: ["']clara-orb-page["']/);
  assert.match(orbPage, /clara-money-left-orb-launching/);
  assert.match(orbPage, /MoneyLeftOrbVisual launching=\{launching\}/);
});

test("tutorial simulation remains on the injected guide-preview path", () => {
  assert.match(orbDemo, /layoutVariant=["']guide-preview["']/);
  assert.match(orbDemo, /tutorialState=\{tutorialState\}/);
  assert.match(orbDemo, /onSubmit=\{\(\) => \{\}\}/);
  assert.match(orbDemo, /onConfirm=\{\(\) => \{\}\}/);
  assert.match(orbDemo, /onRecordExpense=\{\(\) => \{\}\}/);
});

test("Juan leads to ORB before financial feature walkthroughs", () => {
  const meetIndex = coreTutorial.indexOf('{ id: "meet", type: "meet" }');
  const orbIndex = coreTutorial.indexOf('{ id: "orb", type: "orb" }');
  const profileIndex = coreTutorial.indexOf('{ id: "profile", type: "feature", feature: "profile" }');

  assert.ok(meetIndex >= 0, "Juan step must exist");
  assert.ok(orbIndex > meetIndex, "ORB must follow Juan");
  assert.ok(profileIndex > orbIndex, "feature walkthroughs must follow ORB activation");
});
