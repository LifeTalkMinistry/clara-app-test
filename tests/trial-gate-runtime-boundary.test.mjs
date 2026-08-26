import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Deployment stamp: trial preview keeps TopNav browsable while page content remains locked.
async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("trial gate leaves TopNav fully browsable while product content stays locked", async () => {
  const runtime = await source("src/lib/clara-product-runtime-access.js");
  const community = await source("src/pages/Community.jsx");

  assert.match(runtime, /let productLocked = true/);
  assert.doesNotMatch(runtime, /clara-community-shell-header/);
  assert.doesNotMatch(runtime, /header\.inert/);
  assert.match(community, /data-clara-community-content-stack="true"/);
  assert.match(community, /data-clara-trial-preview-page=\{gateCurrentView/);
  assert.match(community, /data-clara-trial-gate-layer="true"/);
  assert.doesNotMatch(community, /nextParams\.set\("view", "orb"\)/);
});

test("trial banner overlays the actual selected page instead of mounting a second Orb", async () => {
  const gate = await source("src/components/community/ClaraTrialAccessGate.jsx");
  const community = await source("src/pages/Community.jsx");

  assert.doesNotMatch(gate, /import ClaraOrbPage from/);
  assert.doesNotMatch(gate, /data-clara-trial-preview-content/);
  assert.match(gate, /rgba\(1,2,23,0\.10\)/);
  assert.match(gate, /rgba\(13,24,55,\.78\)/);
  assert.match(community, /inert=\{gateCurrentView \? "" : undefined\}/);
  assert.match(community, /<ClaraTrialAccessGate/);
});

test("daily awareness cannot persist a check-in before product access is active", async () => {
  const daily = await source("src/runtime/installDailyAwarenessStreak.js");

  const lockGuard = daily.indexOf("if (isClaraProductRuntimeLocked())");
  const checkIn = daily.indexOf("const result = performDailyCheckIn");

  assert.ok(lockGuard >= 0, "daily streak must check the shared product lock");
  assert.ok(checkIn >= 0, "daily streak check-in must still exist");
  assert.ok(lockGuard < checkIn, "product lock must be checked before daily persistence");
  assert.match(daily, /CLARA_PRODUCT_ACCESS_CHANGED_EVENT/);
  assert.match(daily, /removeBanner\(\)/);
});

test("product access hook publishes fail-closed and activation states to runtimes", async () => {
  const hook = await source("src/hooks/useClaraProductAccess.js");

  assert.match(hook, /setClaraProductRuntimeAccess\(false, "checking-access"\)/);
  assert.match(hook, /setClaraProductRuntimeAccess\(false, "access-check-failed"\)/);
  assert.match(hook, /nextTrial\.status === "active"/);
  assert.match(hook, /"trial-redeemed"/);
  assert.match(hook, /hasProductAccess/);
});
