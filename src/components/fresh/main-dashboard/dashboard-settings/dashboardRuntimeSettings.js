import {
  getNotificationPreferencesStorageKey,
  notificationPreferencesToLegacySettings,
  readNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notifications/notificationPreferences";

const dashboardRuntimePrefs = new Map();
const dashboardRuntimeMoneySummaryVisibility = new Map();

export const MONEY_SUMMARY_PRIVACY_KEY = "clara_dashboard_money_summary_visible";

const normalizeRuntimeString = (value) =>
  typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();

export const getDashboardPrefsStorageKey = (userId) =>
  `clara_dashboard_prefs_${userId || "guest"}`;

export function readMoneySummaryVisibility(userId = "guest") {
  return dashboardRuntimeMoneySummaryVisibility.get(userId || "guest") === true;
}

export function persistMoneySummaryVisibility(visible, userId = "guest") {
  dashboardRuntimeMoneySummaryVisibility.set(userId || "guest", Boolean(visible));
}

export function readDashboardPrefs(userId) {
  const key = getDashboardPrefsStorageKey(userId);
  const parsed = dashboardRuntimePrefs.get(key) || {};

  return {
    reminderTime: normalizeRuntimeString(parsed?.reminderTime || ""),
    financialGoal: normalizeRuntimeString(parsed?.financialGoal || ""),
  };
}

export function persistDashboardPrefs(userId, updates) {
  if (!userId) return;

  const key = getDashboardPrefsStorageKey(userId);
  const current = readDashboardPrefs(userId);
  dashboardRuntimePrefs.set(key, { ...current, ...(updates || {}) });
}

export function getSettingsStorageKey(userId) {
  return getNotificationPreferencesStorageKey(userId);
}

export function readStoredNotificationSettings(userId) {
  return notificationPreferencesToLegacySettings(readNotificationPreferences(userId));
}

export function persistStoredNotificationSettings(userId, updates = {}) {
  const saved = updateNotificationPreferences(userId, updates);
  return notificationPreferencesToLegacySettings(saved);
}
