import { getStoredBackendUser } from "@/lib/clara-backend-client";
import {
  enableTaskReminderPush,
  getExistingPushSubscription,
  getNotificationPermissionState as getWebPermissionState,
  sendServerPushTestNotification,
  showDeviceNotification as showWebDeviceNotification,
  showTestNotification,
} from "@/lib/push-notifications";
import {
  enableNativePushNotifications,
  getNativeNotificationStatus,
} from "@/lib/notifications/nativePushNotifications";
import { getNotificationEnvironment } from "@/lib/notifications/notificationEnvironment";

const IN_APP_FALLBACK_MESSAGE =
  "Device notifications are unavailable here, but CLARA will still use in-app notifications.";
const ANDROID_REMINDER_CHANNEL_ID = "clara_reminders";
const EXPENSE_LOG_EVENT_TYPE = "daily_money_check_in";
const EXPENSE_LOG_REMINDER_KIND = "expense_log";
const EXPENSE_LOG_NOTIFICATION_TITLE = "Log today’s expenses";
const EXPENSE_LOG_NOTIFICATION_BODY =
  "Record what you spent today so CLARA can keep your money picture updated.";

let localNotificationListenersInstalled = false;
let warnedLocalNotificationsUnavailable = false;

function normalizePermission(value) {
  if (value === "granted" || value === "denied") return value;
  if (value === "prompt" || value === "prompt-with-rationale") return "default";
  return value || "default";
}

function normalizeRuntimeNotificationUrl(url) {
  const rawUrl = String(url || "").trim();
  if (!rawUrl) return "#/dashboard";
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  if (rawUrl.startsWith("#")) return rawUrl;
  if (rawUrl.startsWith("/")) return `#${rawUrl}`;
  return `#/${rawUrl.replace(/^\/+/, "")}`;
}

function routeRuntimeNotificationUrl(url) {
  if (typeof window === "undefined") return;

  const safeUrl = normalizeRuntimeNotificationUrl(url);
  if (/^https?:\/\//i.test(safeUrl)) {
    window.location.href = safeUrl;
    return;
  }

  window.location.hash = safeUrl.startsWith("#")
    ? safeUrl.replace(/^#/, "")
    : safeUrl.startsWith("/")
      ? safeUrl
      : `/${safeUrl.replace(/^\/+/, "")}`;
}

async function loadLocalNotificationsPlugin() {
  try {
    const module = await import("@capacitor/local-notifications");
    return module.LocalNotifications;
  } catch (error) {
    if (!warnedLocalNotificationsUnavailable) {
      warnedLocalNotificationsUnavailable = true;
      console.warn("Native local notifications plugin is unavailable:", error);
    }
    return null;
  }
}

function installLocalNotificationTapListener(LocalNotifications) {
  if (localNotificationListenersInstalled || !LocalNotifications?.addListener) return;
  localNotificationListenersInstalled = true;

  LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
    try {
      routeRuntimeNotificationUrl(event?.notification?.extra?.url);
    } catch (error) {
      console.warn("Unable to route local notification tap:", error);
    }
  }).catch((error) => {
    localNotificationListenersInstalled = false;
    console.warn("Unable to install local notification tap listener:", error);
  });
}

async function getLocalNotificationPermissionState(LocalNotifications) {
  if (!LocalNotifications?.checkPermissions) return "unsupported";
  const status = await LocalNotifications.checkPermissions();
  return normalizePermission(status?.display || status?.receive);
}

async function requestLocalNotificationPermission(LocalNotifications) {
  const currentPermission = await getLocalNotificationPermissionState(LocalNotifications);
  if (currentPermission === "granted" || currentPermission === "denied") {
    return currentPermission;
  }
  if (!LocalNotifications?.requestPermissions) return currentPermission;
  const requested = await LocalNotifications.requestPermissions();
  return normalizePermission(requested?.display || requested?.receive);
}

function deterministicNotificationId(value) {
  const source = String(value || "").trim();
  if (!source) return Math.floor(Date.now() % 2147483647);

  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
  }

  const positive = Math.abs(hash);
  return positive > 0
    ? positive % 2147483647
    : Math.floor(Date.now() % 2147483647);
}

function normalizeExpenseLogTime(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getExpenseLogLocalNotificationSlots(preferences = {}) {
  const frequency = [1, 2, 3].includes(Number(preferences.expenseLogFrequency))
    ? Number(preferences.expenseLogFrequency)
    : 1;
  const sourceTimes =
    Array.isArray(preferences.expenseLogTimes) && preferences.expenseLogTimes.length
      ? preferences.expenseLogTimes
      : [preferences.preferredTime || "12:30"];

  return Array.from({ length: frequency }, (_, index) => {
    const time = normalizeExpenseLogTime(
      sourceTimes[index] || sourceTimes[0] || "12:30"
    );
    if (!time) return null;
    const [hour, minute] = time.split(":").map(Number);
    return { index, time, hour, minute };
  }).filter(Boolean);
}

function expenseLogLocalNotificationId({ userId, slotIndex, time }) {
  return deterministicNotificationId(
    `${userId || "guest"}:${EXPENSE_LOG_EVENT_TYPE}:${slotIndex}:${time}`
  );
}

async function getPendingLocalNotifications(LocalNotifications) {
  if (!LocalNotifications?.getPending) return [];
  try {
    const pending = await LocalNotifications.getPending();
    return Array.isArray(pending?.notifications) ? pending.notifications : [];
  } catch (error) {
    console.warn("Unable to inspect pending CLARA local notifications:", error);
    return [];
  }
}

function isExpenseLogLocalNotification(notification) {
  const extra = notification?.extra || {};
  return (
    extra.eventType === EXPENSE_LOG_EVENT_TYPE &&
    extra.reminderKind === EXPENSE_LOG_REMINDER_KIND
  );
}

async function cancelExpenseLogLocalNotifications(LocalNotifications) {
  const pending = await getPendingLocalNotifications(LocalNotifications);
  const notificationIds = pending
    .filter(isExpenseLogLocalNotification)
    .map((notification) => Number(notification.id))
    .filter((id) => Number.isInteger(id));

  if (!notificationIds.length || !LocalNotifications?.cancel) return 0;
  await LocalNotifications.cancel({
    notifications: notificationIds.map((id) => ({ id })),
  });
  return notificationIds.length;
}

async function scheduleNativeRuntimeNotification({
  title,
  body,
  url,
  tag,
  eventType,
  environment,
} = {}) {
  const LocalNotifications = await loadLocalNotificationsPlugin();
  if (!LocalNotifications) throw new Error(IN_APP_FALLBACK_MESSAGE);

  const permission = await requestLocalNotificationPermission(LocalNotifications);
  if (permission !== "granted") {
    if (permission === "denied") {
      console.warn(
        "CLARA local notification skipped because device permission is denied."
      );
    }
    return { delivered: false, permission, environment };
  }

  installLocalNotificationTapListener(LocalNotifications);
  const safeUrl = normalizeRuntimeNotificationUrl(url || "#/dashboard");

  await LocalNotifications.schedule({
    notifications: [
      {
        id: Math.floor(Date.now() % 2147483647),
        title: title || "CLARA",
        body: body || "CLARA has an update for you.",
        schedule: { at: new Date(Date.now() + 250) },
        extra: {
          url: safeUrl,
          tag: tag || "",
          eventType: eventType || "",
        },
        channelId:
          environment?.platform === "android"
            ? ANDROID_REMINDER_CHANNEL_ID
            : undefined,
      },
    ],
  });

  return { delivered: true, permission, environment };
}

function formatDiagnosticError(error) {
  const message = String(error?.message || error || "");
  if (/sign in/i.test(message)) {
    return new Error(
      "Sign in to your CLARA account before testing real device notifications."
    );
  }
  if (/firebase|fcm|google-services/i.test(message)) {
    return new Error(
      "CLARA could not complete Firebase delivery. Check the Android Firebase configuration and CLARA backend Firebase credentials."
    );
  }
  return error instanceof Error
    ? error
    : new Error(message || "Real push test failed.");
}

export async function syncExpenseLogLocalNotifications({ userId, preferences } = {}) {
  const environment = getNotificationEnvironment();

  if (!environment.supportsNativePush || environment.platform !== "android") {
    return {
      scheduled: 0,
      cancelled: 0,
      permission: "unsupported",
      environment,
      reason: "android_native_only",
    };
  }

  const LocalNotifications = await loadLocalNotificationsPlugin();
  if (!LocalNotifications) {
    return {
      scheduled: 0,
      cancelled: 0,
      permission: "unsupported",
      environment,
      reason: IN_APP_FALLBACK_MESSAGE,
    };
  }

  installLocalNotificationTapListener(LocalNotifications);
  const cancelled = await cancelExpenseLogLocalNotifications(LocalNotifications);
  const shouldSchedule = Boolean(
    preferences?.dailyCheckIn &&
      preferences?.deliveryMode === "device_and_in_app"
  );

  if (!shouldSchedule) {
    return {
      scheduled: 0,
      cancelled,
      permission: "skipped",
      environment,
      reason: "expense_log_device_reminders_disabled",
    };
  }

  const slots = getExpenseLogLocalNotificationSlots(preferences);
  if (!slots.length) {
    return {
      scheduled: 0,
      cancelled,
      permission: "skipped",
      environment,
      reason: "no_valid_expense_log_times",
    };
  }

  const permission = await requestLocalNotificationPermission(LocalNotifications);
  if (permission !== "granted") {
    return { scheduled: 0, cancelled, permission, environment };
  }

  const safeUrl = normalizeRuntimeNotificationUrl("#/dashboard");
  const notifications = slots.map((slot) => ({
    id: expenseLogLocalNotificationId({
      userId,
      slotIndex: slot.index,
      time: slot.time,
    }),
    title: EXPENSE_LOG_NOTIFICATION_TITLE,
    body: EXPENSE_LOG_NOTIFICATION_BODY,
    schedule: {
      on: { hour: slot.hour, minute: slot.minute },
      repeats: true,
      allowWhileIdle: true,
    },
    channelId: ANDROID_REMINDER_CHANNEL_ID,
    extra: {
      url: safeUrl,
      eventType: EXPENSE_LOG_EVENT_TYPE,
      reminderKind: EXPENSE_LOG_REMINDER_KIND,
      slotIndex: slot.index,
      time: slot.time,
    },
  }));

  await LocalNotifications.schedule({ notifications });
  return {
    scheduled: notifications.length,
    cancelled,
    permission,
    environment,
  };
}

export async function scheduleNativeCalendarNotification({
  id,
  title,
  body,
  at,
  url = "#/dashboard",
  tag = "",
  eventType = "schedule_event_today",
} = {}) {
  const environment = getNotificationEnvironment();
  const scheduledAt = at instanceof Date ? at : new Date(at);

  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    return {
      delivered: false,
      permission: "skipped",
      environment,
      reason: "invalid_or_past_schedule",
    };
  }

  const LocalNotifications = await loadLocalNotificationsPlugin();
  if (!LocalNotifications) {
    return {
      delivered: false,
      permission: "unsupported",
      environment,
      reason: IN_APP_FALLBACK_MESSAGE,
    };
  }

  const permission = await requestLocalNotificationPermission(LocalNotifications);
  if (permission !== "granted") {
    return { delivered: false, permission, environment };
  }

  installLocalNotificationTapListener(LocalNotifications);
  const safeUrl = normalizeRuntimeNotificationUrl(url || "#/dashboard");
  const stableKey = `${id || tag || eventType}:${scheduledAt.toISOString()}`;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: deterministicNotificationId(stableKey),
        title: title || "CLARA schedule reminder",
        body: body || "You have a schedule reminder from CLARA.",
        schedule: { at: scheduledAt },
        extra: {
          url: safeUrl,
          tag: tag || "",
          eventType: eventType || "schedule_event_today",
        },
        channelId:
          environment?.platform === "android"
            ? ANDROID_REMINDER_CHANNEL_ID
            : undefined,
      },
    ],
  });

  return {
    delivered: true,
    permission,
    environment,
    scheduledAt: scheduledAt.toISOString(),
  };
}

export function getDeviceNotificationEnvironment() {
  return getNotificationEnvironment();
}

export function supportsDeviceNotifications() {
  return getNotificationEnvironment().supportsAnyDevicePush;
}

export async function getDeviceNotificationPermissionState() {
  const environment = getNotificationEnvironment();
  if (environment.preferredChannel === "native_push") {
    return (await getNativeNotificationStatus()).permission;
  }
  if (environment.preferredChannel === "web_push") {
    return getWebPermissionState();
  }
  return "unsupported";
}

export async function getRuntimeDeviceNotificationPermissionState() {
  const environment = getNotificationEnvironment();

  if (environment.preferredChannel === "native_push") {
    const LocalNotifications = await loadLocalNotificationsPlugin();
    if (LocalNotifications) {
      const permission = await getLocalNotificationPermissionState(LocalNotifications);
      if (permission !== "unsupported") return permission;
    }
    return (await getNativeNotificationStatus()).permission;
  }

  if (environment.preferredChannel === "web_push") {
    return getWebPermissionState();
  }

  return "unsupported";
}

export async function enableDeviceNotifications({ userId } = {}) {
  const environment = getNotificationEnvironment();
  const resolvedUserId = userId || getStoredBackendUser()?.id || null;

  if (environment.preferredChannel === "native_push") {
    return enableNativePushNotifications({ userId: resolvedUserId });
  }

  if (environment.preferredChannel === "web_push") {
    const result = await enableTaskReminderPush({ userId: resolvedUserId });
    return { ...result, channel: "web_push", environment };
  }

  return {
    permission: "unsupported",
    configured: false,
    environment,
    reason: IN_APP_FALLBACK_MESSAGE,
  };
}

export async function getExistingDeviceNotificationConnection() {
  const environment = getNotificationEnvironment();

  if (environment.preferredChannel === "native_push") {
    const status = await getNativeNotificationStatus();
    if (!status.configured || status.permission !== "granted") return null;
    return {
      channel: environment.platform === "ios" ? "apns" : "fcm",
      platform: environment.platform,
      configured: true,
      permission: status.permission,
      source: "device_permission",
    };
  }

  if (environment.preferredChannel === "web_push") {
    return getExistingPushSubscription();
  }

  return null;
}

export async function showRuntimeDeviceNotification({
  title,
  body,
  url = "#/dashboard",
  tag = "",
  eventType = "",
} = {}) {
  const environment = getNotificationEnvironment();

  if (environment.preferredChannel === "native_push") {
    return scheduleNativeRuntimeNotification({
      title,
      body,
      url,
      tag,
      eventType,
      environment,
    });
  }

  if (environment.preferredChannel === "web_push") {
    return showWebDeviceNotification({
      title,
      body,
      url: normalizeRuntimeNotificationUrl(url),
      tag,
      eventType,
    });
  }

  throw new Error(IN_APP_FALLBACK_MESSAGE);
}

export async function showTestDeviceNotification() {
  const environment = getNotificationEnvironment();

  if (environment.preferredChannel === "native_push") {
    const result = await scheduleNativeRuntimeNotification({
      title: "CLARA local test notification",
      body: "This local test was generated by this device.",
      url: "#/dashboard",
      tag: `clara-local-test-${Date.now()}`,
      eventType: "local_test_notification",
      environment,
    });

    if (!result.delivered) {
      throw new Error("Notification permission is not granted on this device.");
    }
    return result;
  }

  if (environment.preferredChannel === "web_push") {
    return showTestNotification();
  }

  throw new Error(IN_APP_FALLBACK_MESSAGE);
}

export async function sendRealPushTestNotification() {
  const environment = getNotificationEnvironment();

  try {
    if (environment.preferredChannel === "web_push") {
      const enableResult = await enableTaskReminderPush({
        userId: getStoredBackendUser()?.id || null,
      });
      if (enableResult.permission === "denied") {
        throw new Error(
          "Notification permission is blocked. Enable CLARA notifications in your browser or phone settings, then try again."
        );
      }
      if (!enableResult.configured) {
        throw new Error(
          "CLARA could not finish the Web Push subscription for this device."
        );
      }
    } else {
      if (!environment.supportsNativePush) {
        throw new Error("Real push is unavailable in this environment.");
      }

      const user = getStoredBackendUser();
      if (!user?.id) {
        throw new Error("Sign in before testing real device notifications.");
      }

      const enableResult = await enableNativePushNotifications({ userId: user.id });
      if (enableResult.permission === "denied") {
        throw new Error(
          "Phone notification permission is denied. Enable CLARA notifications in the app settings, then try again."
        );
      }
      if (!enableResult.configured || !enableResult.token) {
        throw new Error(
          "CLARA could not register this phone for Firebase notifications."
        );
      }
    }

    const data = await sendServerPushTestNotification();
    if (!Number(data?.sent || 0)) {
      throw new Error(
        "CLARA backend did not report a successful device notification delivery."
      );
    }

    return {
      ...data,
      environment,
    };
  } catch (error) {
    throw formatDiagnosticError(error);
  }
}
