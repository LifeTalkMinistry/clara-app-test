import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("trial gate keeps Community navigation visible as an inert preview", async () => {
  const runtime = await source("src/lib/clara-product-runtime-access.js");

  assert.match(runtime, /let productLocked = true/);
  assert.match(runtime, /data-clara-product-locked/);
  assert.match(runtime, /clara-community-root:has\(\[data-clara-trial-access-gate="true"\]\)/);
  assert.match(runtime, /> \.clara-community-shell-header/);
  assert.match(runtime, /opacity: \.34 !important/);
  assert.match(runtime, /pointer-events: none !important/);
  assert.match(runtime, /header\.inert = true/);
  assert.match(runtime, /data\.claraTrialNavPreview/);
  assert.doesNotMatch(runtime, /> \.clara-community-shell-header \{\s*display: none !important/);
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
