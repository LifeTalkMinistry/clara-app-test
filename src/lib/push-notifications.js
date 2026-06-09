import { supabase } from "@/lib/supabaseClient";

const REMINDER_SERVICE_WORKER_PATH = `${
  import.meta.env.BASE_URL || "/"
}clara-task-reminder-sw.js`;

function getPublicKey() {
  return (
    import.meta.env.VITE_VAPID_PUBLIC_KEY ||
    import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY ||
    ""
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(normalized);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function supportsPushNotifications() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function getNotificationPermissionState() {
  if (!supportsPushNotifications()) return "unsupported";
  return Notification.permission;
}

export async function registerReminderServiceWorker() {
  if (!supportsPushNotifications()) {
    throw new Error("Push notifications are not supported on this device.");
  }

  const registration = await navigator.serviceWorker.register(REMINDER_SERVICE_WORKER_PATH);
  await navigator.serviceWorker.ready;
  return registration;
}

export async function requestBrowserNotificationPermission() {
  if (!supportsPushNotifications()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export async function enableTaskReminderPush({ userId }) {
  if (!userId) {
    throw new Error("Missing user context for push notifications.");
  }

  const permission = await requestBrowserNotificationPermission();
  if (permission !== "granted") {
    return { permission, configured: false, subscription: null };
  }

  const registration = await registerReminderServiceWorker();
  const existingSubscription = await registration.pushManager.getSubscription();
  const publicKey = getPublicKey();

  let subscription = existingSubscription;

  if (!subscription) {
    if (!publicKey) {
      return { permission, configured: false, subscription: null };
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const serializedSubscription = subscription.toJSON();
  const keys = serializedSubscription.keys || {};

  const { error } = await supabase.from("user_push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      subscription: serializedSubscription,
      p256dh_key: keys.p256dh || null,
      auth_key: keys.auth || null,
      is_active: true,
      user_agent: navigator.userAgent,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) throw error;

  return {
    permission,
    configured: true,
    subscription: serializedSubscription,
  };
}

export async function getExistingPushSubscription() {
  if (!supportsPushNotifications()) return null;
  const registration =
    (await navigator.serviceWorker.getRegistration()) ||
    (await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL || "/"));
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function showDeviceNotification({
  title,
  body,
  url = "/dashboard",
  tag = "",
  eventType = "",
} = {}) {
  if (!supportsPushNotifications()) {
    throw new Error("Device notifications are not supported on this browser.");
  }
  if (Notification.permission !== "granted") {
    throw new Error("Device notification permission has not been granted.");
  }

  const registration = await registerReminderServiceWorker();
  await registration.showNotification(title || "CLARA", {
    body: body || "CLARA has an update for you.",
    icon: `${import.meta.env.BASE_URL || "/"}favicon.svg`,
    badge: `${import.meta.env.BASE_URL || "/"}favicon.svg`,
    tag: tag || undefined,
    renotify: false,
    data: { url, eventType, tag },
  });
}

export function showTestNotification() {
  return showDeviceNotification({
    title: "CLARA notifications are ready",
    body: "You’ll receive important reminders based on your preferences.",
    url: "/dashboard",
    tag: `clara-test-${Date.now()}`,
    eventType: "test_notification",
  });
}
