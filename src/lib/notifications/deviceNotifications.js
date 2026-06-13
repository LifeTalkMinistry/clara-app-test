import { supabase } from "@/lib/supabaseClient";
import {
  enableTaskReminderPush,
  getExistingPushSubscription,
  getNotificationPermissionState as getWebPermissionState,
  showTestNotification,
} from "@/lib/push-notifications";
import {
  enableNativePushNotifications,
  getNativeNotificationStatus,
} from "@/lib/notifications/nativePushNotifications";
import { getNotificationEnvironment } from "@/lib/notifications/notificationEnvironment";

const IN_APP_FALLBACK_MESSAGE = "Device notifications are unavailable here, but CLARA will still use in-app notifications.";

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

export async function showTestDeviceNotification() {
  const environment = getNotificationEnvironment();

  if (environment.preferredChannel === "native_push") {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Date.now() % 2147483647),
          title: "CLARA notifications are ready",
          body: "You’ll receive important reminders based on your preferences.",
          schedule: { at: new Date(Date.now() + 250) },
          extra: { url: "#/dashboard", eventType: "test_notification" },
          channelId: environment.platform === "android" ? "clara_reminders" : undefined,
        },
      ],
    });
    return;
  }

  if (environment.preferredChannel === "web_push") {
    return showTestNotification();
  }

  throw new Error(IN_APP_FALLBACK_MESSAGE);
}
