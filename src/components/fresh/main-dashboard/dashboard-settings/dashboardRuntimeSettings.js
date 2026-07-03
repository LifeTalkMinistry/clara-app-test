import {
  getNotificationPreferencesStorageKey,
  notificationPreferencesToLegacySettings,
  readNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notifications/notificationPreferences";
import { ensureActiveLocalVaultId } from "@/lib/localVaultIdentity";

const dashboardRuntimePrefs = new Map();
const dashboardRuntimeMoneySummaryVisibility = new Map();

export const MONEY_SUMMARY_PRIVACY_KEY = "clara_dashboard_money_summary_visible";

const normalizeRuntimeString = (value) =>
  typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();

const resolvePrivateOwner = () => ensureActiveLocalVaultId();

export const getDashboardPrefsStorageKey = () =>
  `clara_dashboard_prefs_${resolvePrivateOwner()}`;

export function readMoneySummaryVisibility() {
  const ownerId = resolvePrivateOwner();
  return dashboardRuntimeMoneySummaryVisibility.get(ownerId) === true;
}

export function persistMoneySummaryVisibility(visible) {
  const ownerId = resolvePrivateOwner();
  dashboardRuntimeMoneySummaryVisibility.set(ownerId, Boolean(visible));
}

export function readDashboardPrefs() {
  const key = getDashboardPrefsStorageKey();
  const parsed = dashboardRuntimePrefs.get(key) || {};

  return {
    reminderTime: normalizeRuntimeString(parsed?.reminderTime || ""),
    financialGoal: normalizeRuntimeString(parsed?.financialGoal || ""),
  };
}

export function persistDashboardPrefs(_userId, updates) {
  const key = getDashboardPrefsStorageKey();
  const current = readDashboardPrefs();
  dashboardRuntimePrefs.set(key, { ...current, ...(updates || {}) });
}

export function getSettingsStorageKey() {
  return getNotificationPreferencesStorageKey(resolvePrivateOwner());
}

export function readStoredNotificationSettings() {
  return notificationPreferencesToLegacySettings(
    readNotificationPreferences(resolvePrivateOwner())
  );
}

export function persistStoredNotificationSettings(_userId, updates = {}) {
  const saved = updateNotificationPreferences(resolvePrivateOwner(), updates);
  return notificationPreferencesToLegacySettings(saved);
}
