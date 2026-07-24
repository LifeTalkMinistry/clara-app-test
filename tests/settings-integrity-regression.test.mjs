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
const notificationPreferencesSource = readSource(
  "src/lib/notifications/notificationPreferences.js"
);
const notificationPanelSource = readSource(
  "src/components/notifications/NotificationSettingsPanel.jsx"
);
const notificationRegistrySource = readSource(
  "src/lib/notifications/notificationRegistry.js"
);
const runtimePatchRegistrySource = readSource(
  "src/runtime/installClaraRuntimePatches.js"
);
const settingsAccessLogoutSource = readSource(
  "src/runtime/installSettingsAccessLogout.js"
);
const dashboardPanelNavigationSource = readSource(
  "src/components/fresh/main-dashboard/shell/useDashboardPanelNavigation.js"
);
const settingsCleanupSource = readSource("src/settings-cleanup.css");
const themeProviderSource = readSource("src/theme/ThemeProvider.jsx");
const userRoleSource = readSource("src/hooks/useUserRole.js");
const appSource = readSource("src/App.jsx");
const adminPanelSource = readSource("src/pages/AdminPanel.jsx");
const adminClientSource = readSource("src/lib/admin-backend-client.js");
const profileClientSource = readSource("src/lib/profile-backend-client.js");
const supabaseClientSource = readSource("src/lib/supabaseClient.js");
const supportCompatibilitySource = readSource(
  "src/lib/settings-support-compatibility.js"
);
const supportClientSource = readSource("src/lib/support-backend-client.js");
const billingClientSource = readSource("src/lib/billing-backend-client.js");
const legalClientSource = readSource("src/lib/legal-information-backend-client.js");

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

test("notification preference storage failures cannot crash Settings", () => {
  assert.match(notificationPreferencesSource, /function safeStorageGet\(/);
  assert.match(notificationPreferencesSource, /function safeStorageSet\(/);
  assert.match(notificationPreferencesSource, /getStorage\(\)\?\.getItem/);
  assert.doesNotMatch(
    notificationPreferencesSource,
    /window\.localStorage\["set" \+ "Item"\]/
  );
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

test("the Settings overview no longer claims all notifications are On or Off from one reminder flag", () => {
  assert.match(
    settingsCleanupSource,
    /button\.group:has\(svg\.lucide-bell\) > span[\s\S]*display: none !important/
  );
});

test("dashboard panels and Settings detail pages participate in browser Back history", () => {
  assert.match(dashboardPanelNavigationSource, /PANEL_HISTORY_KEY/);
  assert.match(dashboardPanelNavigationSource, /SETTINGS_DETAIL_HISTORY_KEY/);
  assert.match(dashboardPanelNavigationSource, /window\.history\.pushState/);
  assert.match(dashboardPanelNavigationSource, /window\.history\.replaceState/);
  assert.match(dashboardPanelNavigationSource, /window\.addEventListener\("popstate"/);
  assert.match(settingsAccessLogoutSource, /SETTINGS_DETAIL_HISTORY_KEY/);
  assert.match(settingsAccessLogoutSource, /pushSettingsDetailHistory/);
  assert.match(settingsAccessLogoutSource, /handleSettingsHistoryPop/);
  assert.match(settingsAccessLogoutSource, /window\.history\.back\(\)/);
});

test("Settings no longer installs duplicate theme hiding or the hidden double-tap demo", () => {
  assert.doesNotMatch(runtimePatchRegistrySource, /settings-hide-theme-appearance/);
  assert.doesNotMatch(
    runtimePatchRegistrySource,
    /clara-settings-young-professional-current-state/
  );
  assert.match(runtimePatchRegistrySource, /clara-google-play-verify-auth-retry/);
});

test("signed-in theme persistence is scoped to the active CLARA account", () => {
  assert.match(themeProviderSource, /ACCOUNT_THEME_STORAGE_PREFIX = "clara_theme_v2:"/);
  assert.match(themeProviderSource, /readAccountStoredThemeKey/);
  assert.match(themeProviderSource, /writeAccountStoredThemeKey/);
  assert.match(themeProviderSource, /lastThemeOwnerRef/);
  assert.match(
    themeProviderSource,
    /if \(user\?\.id\) \{[\s\S]{0,180}writeAccountStoredThemeKey\(user\.id, nextTheme\.key\)/
  );
});

test("free users can still enter the CLARA Support admin conversation", () => {
  assert.match(
    userRoleSource,
    /messagingAdminOnly:[\s\S]{0,120}plan === FREE_PLAN_KEY/
  );
  assert.match(userRoleSource, /general private messaging is a Committed feature/);
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

test("support history is readable in the legacy Messages surface and support replies stay backend-backed", () => {
  assert.match(supportClientSource, /fetchBackendSupportMessages/);
  assert.match(supportCompatibilitySource, /fetchBackendSupportMessages/);
  assert.match(supportCompatibilitySource, /createSupportMessagesSelectInterceptor/);
  assert.match(supportCompatibilitySource, /isSupportRecipient/);
  assert.match(supportCompatibilitySource, /Support follow-up/);
  assert.match(supportCompatibilitySource, /Direct user-to-user messaging is not connected/);
});

test("Plan & Billing reads the authenticated user's real backend subscription", () => {
  assert.match(supportCompatibilitySource, /table === "enrollments"/);
  assert.match(supportCompatibilitySource, /fetchCurrentBackendBilling/);
  assert.match(billingClientSource, /backendRequest\("\/api\/users\/me\/billing"/);
  assert.doesNotMatch(billingClientSource, /supabase/i);
});

test("About CLARA legal information uses backend content instead of the retired Supabase table", () => {
  assert.match(supportCompatibilitySource, /table === "legal_information_content"/);
  assert.match(supportCompatibilitySource, /fetchBackendLegalInformation/);
  assert.match(supportCompatibilitySource, /updateBackendLegalInformation/);
  assert.match(legalClientSource, /\/api\/content\/legal-information/);
  assert.match(legalClientSource, /\/api\/admin\/legal-information/);
});
