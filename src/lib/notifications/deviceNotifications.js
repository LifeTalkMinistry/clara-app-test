import { supabase } from "@/lib/supabaseClient";
import {
  enableTaskReminderPush,
  getExistingPushSubscription,
  getNotificationPermissionState as getWebPermissionState,
  showDeviceNotification as showWebDeviceNotification,
  showTestNotification,
} from "@/lib/push-notifications";
import {
  enableNativePushNotifications,
  getNativeNotificationStatus,
} from "@/lib/notifications/nativePushNotifications";
import { getNotificationEnvironment } from "@/lib/notifications/notificationEnvironment";

const IN_APP_FALLBACK_MESSAGE = "Device notifications are unavailable here, but CLARA will still use in-app notifications.";

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

  if (safeUrl.startsWith("#")) {
    window.location.hash = safeUrl.replace(/^#/, "");
    return;
  }

  if (safeUrl.startsWith("/")) {
    window.location.hash = safeUrl;
    return;
  }

  window.location.hash = `/${safeUrl.replace(/^\/+/, "")}`;
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
      const extra = event?.notification?.extra || {};
      routeRuntimeNotificationUrl(extra.url);
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

async function scheduleNativeRuntimeNotification({
  title,
  body,
  url,
  tag,
  eventType,
  environment,
} = {}) {
  const LocalNotifications = await loadLocalNotificationsPlugin();

  if (!LocalNotifications) {
    throw new Error(IN_APP_FALLBACK_MESSAGE);
  }

  const permission = await requestLocalNotificationPermission(LocalNotifications);
  if (permission !== "granted") {
    if (permission === "denied") {
      console.warn("CLARA local notification skipped because device permission is denied.");
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
        channelId: environment?.platform === "android" ? "clara_reminders" : undefined,
      },
    ],
  });

  return { delivered: true, permission, environment };
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
    const status = await getNativeNotificationStatus();
    return status.permission;
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

    const status = await getNativeNotificationStatus();
    return status.permission;
  }

  if (environment.preferredChannel === "web_push") {
    return getWebPermissionState();
  }

  return "unsupported";
}

export async function enableDeviceNotifications({ userId }) {
  const environment = getNotificationEnvironment();

  if (environment.preferredChannel === "native_push") {
    return enableNativePushNotifications({ userId });
  }

  if (environment.preferredChannel === "web_push") {
    const result = await enableTaskReminderPush({ userId });
    return { ...result, channel: "web_push", environment };
  }

  return {
    permission: "unsupported",
    configured: false,
    environment,
    reason: IN_APP_FALLBACK_MESSAGE,
  };
}

export async function getExistingDeviceNotificationConnection({ userId } = {}) {
  const environment = getNotificationEnvironment();

  if (environment.preferredChannel === "native_push") {
    if (!userId) return null;

    const channel = environment.platform === "ios" ? "apns" : "fcm";
    const { data, error } = await supabase
      .from("user_notification_devices")
      .select("id,channel,platform,last_seen_at")
      .eq("user_id", userId)
      .eq("channel", channel)
      .eq("platform", environment.platform)
      .eq("is_active", true)
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("Failed checking native notification device:", error);
      return null;
    }

    return data || null;
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
      title: "CLARA notifications are ready",
      body: "You’ll receive important reminders based on your preferences.",
      url: "#/dashboard",
      tag: `clara-test-${Date.now()}`,
      eventType: "test_notification",
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
