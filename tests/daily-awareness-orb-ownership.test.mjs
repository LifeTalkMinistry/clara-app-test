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

test("the real ClaraOrbPage explicitly owns Daily Awareness mount and cleanup", async () => {
  const orbSource = await readSource("src/components/community/ClaraOrbPage.jsx");

  assert.match(
    orbSource,
    /import \{ installDailyAwarenessStreak \} from "@\/runtime\/installDailyAwarenessStreak";/,
  );
  assert.match(
    orbSource,
    /useEffect\(\(\) => installDailyAwarenessStreak\(\), \[\]\);/,
  );
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
