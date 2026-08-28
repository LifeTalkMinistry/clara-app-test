import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const scheduleSource = readSource(
  "src/lib/notifications/scheduleNotificationEvaluator.js"
);
const localFacadeSource = readSource("src/lib/local-data-facade.js");
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
const dashboardPanelNavigationSource = readSource(
  "src/components/fresh/main-dashboard/shell/useDashboardPanelNavigation.js"
);
const activeSettingsSource = readSource(
  "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx"
);
const themeProviderSource = readSource("src/theme/ThemeProvider.jsx");
const userRoleSource = readSource("src/hooks/useUserRole.js");
const appSource = readSource("src/App.jsx");
const adminPanelSource = readSource("src/pages/AdminPanel.jsx");
const adminClientSource = readSource("src/lib/admin-backend-client.js");
const profileClientSource = readSource("src/lib/profile-backend-client.js");
const supabaseClientSource = readSource("src/lib/supabaseClient.js");
const claraDataClientSource = readSource("src/lib/clara-data-client.js");
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

test("retired CLARA Memory runtime stays uninstalled", () => {
  assert.doesNotMatch(runtimePatchRegistrySource, /installScopedClaraMemoryStorage/);
  assert.doesNotMatch(runtimePatchRegistrySource, /clara-memory-bridge/);
  assert.doesNotMatch(runtimePatchRegistrySource, /clara-assistant-memory-tab/);
  assert.doesNotMatch(runtimePatchRegistrySource, /clara-onboarding-memory-review-bridge/);
  assert.match(runtimePatchRegistrySource, /installRetiredContextDataCleanup/);
  assert.doesNotMatch(activeSettingsSource, /title: "Memory"/);
  assert.doesNotMatch(activeSettingsSource, /clara:open-assistant-memory-board/);
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
  assert.doesNotMatch(notificationPanelSource, /from\("user_program_day_assignments"\)/);
  assert.match(notificationPanelSource, /Push notifications/);
  assert.match(notificationPanelSource, /tasksAndCoaching/);
  assert.doesNotMatch(notificationPanelSource, /TaskReminderSettingsCard/);
});

test("Weekly Money Review visible setting is the authoritative runtime gate", () => {
  assert.match(notificationRegistrySource, /weekly_review_ready: event\(\{ category: NOTIFICATION_CATEGORIES\.WEEKLY_REVIEW/);
  assert.match(notificationRegistrySource, /\[NOTIFICATION_CATEGORIES\.WEEKLY_REVIEW\]: "weeklyMoneyReview"/);
  assert.match(notificationRegistrySource, /return preferenceKey \? preferences\?\.\[preferenceKey\] !== false : false/);
});

test("the Settings overview leaves notification state to the Notifications detail surface", () => {
  const row = activeSettingsSource.match(/key: "notifications"[\s\S]{0,320}?action:/)?.[0] || "";
  assert.match(row, /title: "Notifications"/);
  assert.doesNotMatch(row, /badge:/);
});

test("dashboard panels and Settings detail pages participate in browser Back history", () => {
  assert.match(dashboardPanelNavigationSource, /PANEL_HISTORY_KEY/);
  assert.match(dashboardPanelNavigationSource, /SETTINGS_DETAIL_HISTORY_KEY/);
  assert.match(dashboardPanelNavigationSource, /window\.history\.pushState/);
  assert.match(dashboardPanelNavigationSource, /window\.history\.replaceState/);
  assert.match(dashboardPanelNavigationSource, /window\.addEventListener\("popstate"/);
  assert.match(activeSettingsSource, /SETTINGS_DETAIL_HISTORY_KEY/);
  assert.match(activeSettingsSource, /openSetting/);
  assert.match(activeSettingsSource, /closeActiveSetting/);
  assert.match(activeSettingsSource, /window\.history\.pushState/);
  assert.match(activeSettingsSource, /window\.history\.back\(\)/);
  assert.match(activeSettingsSource, /window\.addEventListener\("popstate"/);
});

test("Settings no longer installs duplicate theme hiding or the hidden double-tap demo", () => {
  assert.doesNotMatch(runtimePatchRegistrySource, /settings-hide-theme-appearance/);
  assert.doesNotMatch(
    runtimePatchRegistrySource,
    /clara-settings-young-professional-current-state/
  );
  assert.match(runtimePatchRegistrySource, /google-play-already-owned-restore-bridge/);
  assert.doesNotMatch(runtimePatchRegistrySource, /clara-google-play-verify-auth-retry/);
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

test("free users can use normal messaging and still enter the CLARA Support admin conversation", () => {
  assert.match(userRoleSource, /messagingFull: hasFeatureAccess\("messages", \["full"\]\)/);
  assert.match(
    userRoleSource,
    /messagingAdminOnly:[\s\S]{0,180}plan === FREE_PLAN_KEY/
  );
  assert.doesNotMatch(userRoleSource, /general private messaging is a Committed feature/);
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

test("legacy profile compatibility writes through the canonical CLARA Profile", () => {
  assert.match(localFacadeSource, /async updateUser\(\{ data \} = \{\}\)/);
  assert.match(localFacadeSource, /updateCurrentBackendProfile/);
  assert.match(profileClientSource, /updateCanonicalClaraDisplayName/);
  assert.doesNotMatch(profileClientSource, /\/api\/users\/me/);
});

test("legacy Settings support UI delivers into the real CLARA backend support inbox", () => {
  assert.match(claraDataClientSource, /withSettingsSupportCompatibility\(createLocalDataFacade\(\)\)/);
  assert.doesNotMatch(supabaseClientSource, /withSettingsSupportCompatibility/);
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
