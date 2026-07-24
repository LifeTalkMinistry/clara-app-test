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
const notificationPanelSource = readSource(
  "src/components/notifications/NotificationSettingsPanel.jsx"
);
const notificationRegistrySource = readSource(
  "src/lib/notifications/notificationRegistry.js"
);
const appSource = readSource("src/App.jsx");
const adminPanelSource = readSource("src/pages/AdminPanel.jsx");
const adminClientSource = readSource("src/lib/admin-backend-client.js");
const profileClientSource = readSource("src/lib/profile-backend-client.js");
const supabaseClientSource = readSource("src/lib/supabaseClient.js");
const supportCompatibilitySource = readSource(
  "src/lib/settings-support-compatibility.js"
);
const supportClientSource = readSource("src/lib/support-backend-client.js");

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
  assert.match(localFacadeSource, /clara_local_compat_table_v1:/);
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

test("notification Settings no longer queries retired program tables to decide whether task settings exist", () => {
  assert.doesNotMatch(notificationPanelSource, /from\("user_programs"\)/);
  assert.doesNotMatch(
    notificationPanelSource,
    /from\("user_program_day_assignments"\)/
  );
  assert.match(notificationPanelSource, /Advanced task reminder schedule/);
  assert.match(notificationPanelSource, /tasksAndCoaching/);
});

test("Weekly Money Review visible setting is the authoritative runtime gate", () => {
  assert.match(
    notificationRegistrySource,
    /eventType === "weekly_review_ready"[\s\S]*weeklyMoneyReview !== false/
  );
});

test("Settings Admin Panel route opens a real backend-backed admin surface", () => {
  assert.match(appSource, /const AdminPanel = lazy/);
  assert.match(
    appSource,
    /path="\/admin\/\*"\s+element=\{<AdminPanel \/>\}/
  );
  assert.doesNotMatch(
    appSource,
    /path="\/admin\/\*"[\s\S]{0,120}<Navigate to="\/dashboard"/
  );
  assert.match(adminPanelSource, /Admin Panel/);
  assert.match(adminPanelSource, /Users & membership/);
  assert.match(adminPanelSource, /Access codes/);
  assert.match(adminPanelSource, /Support inbox/);
  assert.match(adminPanelSource, /Platform mode/);
  assert.match(adminClientSource, /\/api\/admin/);
  assert.match(adminClientSource, /\/support\/messages/);
});

test("profile Settings writes the display name through the CLARA backend account", () => {
  assert.match(localFacadeSource, /async updateUser\(\{ data \} = \{\}\)/);
  assert.match(localFacadeSource, /updateCurrentBackendProfile/);
  assert.match(profileClientSource, /backendRequest\("\/api\/users\/me"/);
  assert.match(profileClientSource, /method: "PATCH"/);
});

test("legacy Settings support UI delivers into the real CLARA backend support inbox", () => {
  assert.match(supabaseClientSource, /withSettingsSupportCompatibility/);
  assert.match(supportCompatibilitySource, /direct_messages/);
  assert.match(supportCompatibilitySource, /sendBackendSupportMessage/);
  assert.match(supportClientSource, /backendRequest\("\/api\/support\/messages"/);
  assert.match(supportClientSource, /method: "POST"/);
});
