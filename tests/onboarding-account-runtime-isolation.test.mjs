import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const runtimeRegistrySource = readFileSync(
  new URL("../src/runtime/installClaraRuntimePatches.js", import.meta.url),
  "utf8"
);
const supportHookSource = readFileSync(
  new URL("../src/hooks/useClaraSupport.js", import.meta.url),
  "utf8"
);
const lifeProfileSource = readFileSync(
  new URL("../src/lib/clara-life-profile.js", import.meta.url),
  "utf8"
);

test("onboarding does not eagerly install account-backed Community polling", () => {
  assert.match(runtimeRegistrySource, /ACCOUNT_RUNTIME_SUSPENDED_PATHS/);
  assert.match(runtimeRegistrySource, /"\/onboarding"/);
  assert.match(runtimeRegistrySource, /"\/program-onboarding"/);
  assert.match(runtimeRegistrySource, /function installDeferredAccountRuntimes\(\)/);
  assert.match(runtimeRegistrySource, /import\("\.\/installCommunityBackendOwnership"\)/);
  assert.match(runtimeRegistrySource, /import\("\.\/installMessagesProfilePhotos"\)/);
  assert.match(runtimeRegistrySource, /import\("\.\/installCommunityMessageNotificationSplit"\)/);
  assert.doesNotMatch(
    runtimeRegistrySource,
    /import "\.\/installCommunityBackendOwnership";/
  );
  assert.doesNotMatch(
    runtimeRegistrySource,
    /import "\.\/installMessagesProfilePhotos";/
  );
  assert.doesNotMatch(
    runtimeRegistrySource,
    /import "\.\/installCommunityMessageNotificationSplit";/
  );
  assert.match(
    runtimeRegistrySource,
    /window\.addEventListener\("hashchange", installDeferredAccountRuntimes\);/
  );
});

test("support polling stays asleep on onboarding and wakes after route change", () => {
  assert.match(supportHookSource, /SUPPORT_RUNTIME_SUSPENDED_PATHS/);
  assert.match(supportHookSource, /"\/onboarding"/);
  assert.match(supportHookSource, /"\/program-onboarding"/);
  assert.match(supportHookSource, /if \(!isSupportRuntimeRouteAllowed\(\)\)/);
  assert.match(supportHookSource, /window\.addEventListener\("hashchange", sync\);/);
});

test("Life Context persistence uses a per-user IndexedDB primary key", () => {
  assert.match(
    lifeProfileSource,
    /return `\$\{CLARA_LIFE_PROFILE_ID\}:\$\{localUserId\}`;/
  );
  assert.match(
    lifeProfileSource,
    /const recordId = getClaraLifeProfileRecordId\(localUserId\);/
  );
  assert.match(
    lifeProfileSource,
    /newestActiveProfile\(records, recordId\)/
  );
  assert.match(
    lifeProfileSource,
    /id: recordId,\s*\n\s*profile: normalized,/
  );
  assert.doesNotMatch(
    lifeProfileSource,
    /id: CLARA_LIFE_PROFILE_ID,\s*\n\s*profile: normalized,/
  );
});
