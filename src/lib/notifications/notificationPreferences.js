const STORAGE_PREFIX = "clara_notification_preferences_v1_";
const LEGACY_SETTINGS_PREFIX = "clara_settings_";

function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  moneyAlerts: true,
  dailyCheckIn: true,
  goalsAndReviews: true,
  tasksAndCoaching: true,
  productUpdates: false,
  deliveryMode: "in_app",
  preferredTime: "09:00",
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  snoozeMinutes: 30,
  timezone: detectTimezone(),
});

const BOOLEAN_KEYS = [
  "moneyAlerts",
  "dailyCheckIn",
  "goalsAndReviews",
  "tasksAndCoaching",
  "productUpdates",
  "quietHoursEnabled",
];

function cleanUserId(userId) {
  return String(userId || "guest").trim() || "guest";
}

export function getNotificationPreferencesStorageKey(userId) {
  return `${STORAGE_PREFIX}${cleanUserId(userId)}`;
}

function normalizeTime(value, fallback) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return fallback;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function validTimezone(value) {
  const timezone = String(value || "").trim();
  if (!timezone) return detectTimezone();
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return detectTimezone();
  }
}

function firstBoolean(...values) {
  for (const value of values) {
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

function migrateLegacyShape(value = {}) {
  const source = value?.notifications && typeof value.notifications === "object"
    ? value.notifications
    : value;

  return {
    moneyAlerts: firstBoolean(
      source.moneyAlerts,
      source.budgetAlerts,
      source.decisionNudges
    ),
    dailyCheckIn: firstBoolean(source.dailyCheckIn, source.dailyReminders),
    goalsAndReviews: firstBoolean(source.goalsAndReviews, source.goalProgressAlerts),
    tasksAndCoaching: firstBoolean(source.tasksAndCoaching, source.coachingAlerts),
    productUpdates: firstBoolean(source.productUpdates),
    deliveryMode: source.deliveryMode,
    preferredTime: source.preferredTime || source.reminderTime,
    quietHoursEnabled: firstBoolean(source.quietHoursEnabled),
    quietHoursStart: source.quietHoursStart,
    quietHoursEnd: source.quietHoursEnd,
    snoozeMinutes: source.snoozeMinutes,
    timezone: source.timezone,
  };
}

export function normalizeNotificationPreferences(value = {}) {
  const migrated = migrateLegacyShape(value);
  const defaults = DEFAULT_NOTIFICATION_PREFERENCES;
  const next = { ...defaults };

  BOOLEAN_KEYS.forEach((key) => {
    next[key] = typeof migrated[key] === "boolean" ? migrated[key] : defaults[key];
  });

  next.deliveryMode = ["in_app", "device_and_in_app"].includes(migrated.deliveryMode)
    ? migrated.deliveryMode
    : defaults.deliveryMode;
  next.preferredTime = normalizeTime(migrated.preferredTime, defaults.preferredTime);
  next.quietHoursStart = normalizeTime(migrated.quietHoursStart, defaults.quietHoursStart);
  next.quietHoursEnd = normalizeTime(migrated.quietHoursEnd, defaults.quietHoursEnd);

  const snoozeMinutes = Number(migrated.snoozeMinutes);
  next.snoozeMinutes = Number.isFinite(snoozeMinutes) && snoozeMinutes > 0
    ? Math.round(snoozeMinutes)
    : defaults.snoozeMinutes;
  next.timezone = validTimezone(migrated.timezone || defaults.timezone);

  return next;
}

function safeParse(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function hasStoredNotificationPreferences(userId) {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(getNotificationPreferencesStorageKey(userId)));
}

function readLegacyPreferences(userId) {
  if (typeof window === "undefined") return null;
  const cleanId = cleanUserId(userId);
  const candidates = [
    window.localStorage.getItem(`${LEGACY_SETTINGS_PREFIX}${cleanId}`),
    window.localStorage.getItem(`clara_notification_settings_${cleanId}`),
  ];

  for (const raw of candidates) {
    const parsed = safeParse(raw);
    if (!parsed) continue;
    const migrated = migrateLegacyShape(parsed);
    if (Object.values(migrated).some((value) => value !== undefined)) return migrated;
  }

  return null;
}

export function readNotificationPreferences(userId) {
  if (typeof window === "undefined") return normalizeNotificationPreferences();

  const storageKey = getNotificationPreferencesStorageKey(userId);
  const stored = safeParse(window.localStorage.getItem(storageKey));
  if (stored) return normalizeNotificationPreferences(stored);

  const legacy = readLegacyPreferences(userId);
  if (!legacy) return normalizeNotificationPreferences();

  const migrated = normalizeNotificationPreferences(legacy);
  window.localStorage.setItem(storageKey, JSON.stringify(migrated));
  return migrated;
}

export function persistNotificationPreferences(userId, value) {
  const normalized = normalizeNotificationPreferences(value);
  if (typeof window === "undefined") return normalized;

  const cleanId = cleanUserId(userId);
  window.localStorage.setItem(
    getNotificationPreferencesStorageKey(cleanId),
    JSON.stringify(normalized)
  );
  window.dispatchEvent(
    new CustomEvent("clara:notification-preferences-updated", {
      detail: { userId: cleanId, preferences: normalized },
    })
  );
  window.dispatchEvent(
    new CustomEvent("clara-settings-updated", {
      detail: { type: "notifications", userId: cleanId, notifications: normalized },
    })
  );
  return normalized;
}

export function updateNotificationPreferences(userId, updates = {}) {
  return persistNotificationPreferences(userId, {
    ...readNotificationPreferences(userId),
    ...migrateLegacyShape(updates),
  });
}

export function notificationPreferencesToLegacySettings(preferences = {}) {
  const normalized = normalizeNotificationPreferences(preferences);
  return {
    ...normalized,
    dailyReminders: normalized.dailyCheckIn,
    budgetAlerts: normalized.moneyAlerts,
    coachingAlerts: normalized.tasksAndCoaching,
    decisionNudges: normalized.moneyAlerts,
    goalProgressAlerts: normalized.goalsAndReviews,
  };
}

export function isInsideQuietHours(preferences, date = new Date()) {
  const normalized = normalizeNotificationPreferences(preferences);
  if (!normalized.quietHoursEnabled) return false;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: normalized.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  const current = hour * 60 + minute;
  const [startHour, startMinute] = normalized.quietHoursStart.split(":").map(Number);
  const [endHour, endMinute] = normalized.quietHoursEnd.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  if (start === end) return true;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

export function getZonedDateParts(timezone, date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: validTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}
