const dashboardRuntimePrefs = new Map();
const dashboardRuntimeNotifications = new Map();
const dashboardRuntimeMoneySummaryVisibility = new Map();

export const MONEY_SUMMARY_PRIVACY_KEY = "clara_dashboard_money_summary_visible";

const normalizeRuntimeString = (value) =>
  typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();

const dispatchClaraRuntimeSettingsEvent = (eventName, detail = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
};

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
  return `clara_settings_${userId || "guest"}`;
}

export function readStoredNotificationSettings(userId) {
  const defaults = {
    dailyReminders: true,
    productUpdates: true,
    coachingAlerts: true,
    budgetAlerts: true,
    decisionNudges: true,
    goalProgressAlerts: true,
  };

  const saved = dashboardRuntimeNotifications.get(getSettingsStorageKey(userId)) || {};
  return { ...defaults, ...saved };
}

export function persistStoredNotificationSettings(userId, updates = {}) {
  const key = getSettingsStorageKey(userId);
  const current = readStoredNotificationSettings(userId);
  const next = { ...current, ...(updates || {}) };

  dashboardRuntimeNotifications.set(key, next);
  dispatchClaraRuntimeSettingsEvent("clara:settings-updated", {
    type: "notifications",
    notifications: next,
  });

  return next;
}
