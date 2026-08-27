import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..");

async function readSource(relativePath) {
  return readFile(path.resolve(repoRoot, relativePath), "utf8");
}

test("Daily Awareness is not globally owned by app-open tracking", async () => {
  const appOpenSource = await readSource("src/runtime/installAppOpenTracking.js");

  assert.doesNotMatch(appOpenSource, /installDailyAwarenessStreak/);
  assert.match(appOpenSource, /registerVisibleOpen/);
  assert.match(appOpenSource, /syncCompetitionIntegrity/);
});

test("importing the Daily Awareness module alone cannot install its runtime", async () => {
  const source = await readSource("src/runtime/installDailyAwarenessStreak.js");
  const createRuntimeStart = source.indexOf("function createRuntime()");
  const installerStart = source.indexOf("export function installDailyAwarenessStreak()");
  const createRuntimeCall = source.indexOf("runtime = createRuntime();");

  assert.ok(createRuntimeStart > 0, "runtime factory must exist");
  assert.ok(installerStart > createRuntimeStart, "explicit installer must own runtime creation");
  assert.ok(createRuntimeCall > installerStart, "runtime creation must only be reachable through installer");
  assert.doesNotMatch(source.slice(0, createRuntimeStart), /addEventListener\(/);
  assert.doesNotMatch(source, /shouldRunOnCurrentRoute|hashchange|location\.hash|view=orb/);
});

test("the production ClaraOrbPage explicitly owns Daily Awareness mount and cleanup", async () => {
  const orbSource = await readSource("src/components/community/ClaraOrbPage.jsx");

  assert.match(
    orbSource,
    /import \{ installDailyAwarenessStreak \} from "@\/runtime\/installDailyAwarenessStreak";/,
  );
  assert.match(orbSource, /const isCommandModeEnabled = typeof onActivate !== "function";/);
  assert.match(
    orbSource,
    /useEffect\(\(\) => \{\s*if \(!isCommandModeEnabled\) return undefined;\s*return installDailyAwarenessStreak\(\);\s*\}, \[isCommandModeEnabled\]\);/,
  );
});

test("onboarding tutorial reuses the Orb surface without owning Daily Awareness", async () => {
  const tutorialSource = await readSource("src/pages/onboarding/ClaraTutorialOrbIntro.jsx");
  const orbSource = await readSource("src/components/community/ClaraOrbPage.jsx");

  assert.match(tutorialSource, /<ClaraOrbPage\s+onActivate=\{\(\) => setStarted\(true\)\}/);
  assert.match(orbSource, /if \(!isCommandModeEnabled\) return undefined;/);
});

test("Community access gate renders before the production ORB branch", async () => {
  const communitySource = await readSource("src/pages/Community.jsx");
  const gateBranch = communitySource.indexOf(") : gateCurrentView ? (");
  const orbBranch = communitySource.indexOf(") : activeView === \"orb\" ? (");

  assert.ok(gateBranch > 0, "trial/access gate branch must exist");
  assert.ok(orbBranch > gateBranch, "the access gate must win before ClaraOrbPage can mount");
  assert.match(communitySource.slice(orbBranch, orbBranch + 160), /<ClaraOrbPage \/>/);
});

test("Daily Awareness cleanup removes ORB-scoped listeners, timers, banner, and install ownership", async () => {
  const source = await readSource("src/runtime/installDailyAwarenessStreak.js");

  assert.match(source, /removeEventListener\("pageshow", activateDailyAwarenessStreak\)/);
  assert.match(source, /removeEventListener\("focus", activateDailyAwarenessStreak\)/);
  assert.match(source, /removeEventListener\("visibilitychange", handleVisibilityChange\)/);
  assert.match(source, /retryTimerIds\.forEach\(\(timerId\) => window\.clearTimeout\(timerId\)\)/);
  assert.match(source, /removeBanner\(\);/);
  assert.match(source, /delete window\[INSTALLED_FLAG\]/);
});

test("Daily Awareness keeps existing persistence source and same-day engine authority", async () => {
  const source = await readSource("src/runtime/installDailyAwarenessStreak.js");
  const actionSource = await readSource(
    "src/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInActions.js",
  );

  assert.match(source, /"daily_awareness_open"/);
  assert.match(source, /performDailyCheckIn\(/);
  assert.match(actionSource, /already_checked_in/);
});
