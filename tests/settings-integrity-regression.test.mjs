import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const scheduleSource = readSource(
  "src/lib/notifications/scheduleNotificationEvaluator.js"
);
const localFacadeSource = readSource("src/lib/local-supabase-facade.js");
const notificationHookSource = readSource(
  "src/hooks/useNotificationPreferences.js"
);

test("Schedule reminders never fall back to another account's local schedule", () => {
  assert.doesNotMatch(scheduleSource, /readLatestScheduleEvents/);
  assert.doesNotMatch(
    scheduleSource,
    /for\s*\([^)]*localStorage\.length[^)]*\)/
  );
  assert.match(
    scheduleSource,
    /localStorage\.getItem\(scheduleStorageKey\(userId\)\)/
  );
});

test("legacy local facade resolves the active vault at operation time", () => {
  assert.match(localFacadeSource, /function currentLocalUserId\(\)/);
  assert.doesNotMatch(
    localFacadeSource,
    /const\s+localUserId\s*=\s*getOrCreateLocalVaultId\(\);/
  );
  assert.match(localFacadeSource, /const localUserId = currentLocalUserId\(\);/);
});

test("task reminder compatibility tables persist per local vault", () => {
  assert.match(localFacadeSource, /user_task_reminder_settings/);
  assert.match(localFacadeSource, /user_task_reminder_states/);
  assert.match(
    localFacadeSource,
    /clara_local_compat_table_v1:/
  );
  assert.match(localFacadeSource, /onConflict/);
});

test("legacy compatibility identity reflects backend role without changing vault ownership", () => {
  assert.match(localFacadeSource, /getStoredBackendUser/);
  assert.match(localFacadeSource, /backendUser\?\.role/);
  assert.match(localFacadeSource, /id: localUserId/);
  assert.match(localFacadeSource, /account_id: accountId/);
});

test("notification preferences are scoped to the active local vault and react to account switching", () => {
  assert.match(notificationHookSource, /requestedUserId/);
  assert.match(notificationHookSource, /ensureActiveLocalVaultId/);
  assert.match(notificationHookSource, /clara:active-local-vault-updated/);
  assert.match(notificationHookSource, /clara:account-vault-switched/);
});
