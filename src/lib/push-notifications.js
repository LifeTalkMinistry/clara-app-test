import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";
import { readNotificationPreferences } from "@/lib/notifications/notificationPreferences";

const REMINDER_SERVICE_WORKER_PATH = `${
  import.meta.env.BASE_URL || "/"
}clara-task-reminder-sw.js`;

function getConfiguredPublicKey() {
  return (
    import.meta.env.VITE_VAPID_PUBLIC_KEY ||
    import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY ||
    ""
  );
}

function requireBackendToken() {
  const token = getStoredBackendToken();
  if (!token) {
    throw new Error("Sign in to your CLARA account before enabling device notifications.");
  }
  return token;
}

async function getPublicKey() {
  const configured = getConfiguredPublicKey();
  if (configured) return configured;

  const token = requireBackendToken();
  const response = await backendRequest("/api/push/public-key", { token });
  const publicKey = String(response?.publicKey || "").trim();
  if (!publicKey) {
    throw new Error("CLARA notification server did not return a Web Push public key.");
  }
  return publicKey;
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

function byteArraysEqual(left, right) {
  if (!left || !right) return false;
  const first = new Uint8Array(left);
  const second = new Uint8Array(right);
  if (first.length !== second.length) return false;
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) return false;
  }
  return true;
}

function subscriptionUsesPublicKey(subscription, publicKey) {
  const existingKey = subscription?.options?.applicationServerKey;
  if (!existingKey) return true;
  return byteArraysEqual(existingKey, urlBase64ToUint8Array(publicKey));
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

export async function syncNotificationPreferencesToBackend(preferences) {
  const token = getStoredBackendToken();
  if (!token || !preferences) return { synced: false, reason: "no_backend_session" };

  await backendRequest("/api/push/preferences", {
    method: "POST",
    token,
    body: { preferences },
  });
  return { synced: true };
}

export async function enableTaskReminderPush({ userId } = {}) {
  const token = requireBackendToken();
  const permission = await requestBrowserNotificationPermission();
  if (permission !== "granted") {
    return { permission, configured: false, subscription: null };
  }

  const registration = await registerReminderServiceWorker();
  const publicKey = await getPublicKey();
  let subscription = await registration.pushManager.getSubscription();

  if (subscription && !subscriptionUsesPublicKey(subscription, publicKey)) {
    await subscription.unsubscribe().catch(() => false);
    subscription = null;
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const serializedSubscription = subscription.toJSON();
  await backendRequest("/api/push/subscriptions", {
    method: "POST",
    token,
    body: {
      subscription: serializedSubscription,
      deviceLabel: "CLARA PWA",
      userAgent: navigator.userAgent,
    },
  });

  try {
    await syncNotificationPreferencesToBackend(readNotificationPreferences(userId));
  } catch (error) {
    console.warn("CLARA Web Push preference sync will retry later:", error);
  }

  return {
    permission,
    configured: true,
    subscription: serializedSubscription,
    channel: "web_push",
  };
}

export async function disableTaskReminderPush() {
  if (!supportsPushNotifications()) return { disabled: false, reason: "unsupported" };

  const registration = await navigator.serviceWorker.getRegistration().catch(() => null);
  const subscription = await registration?.pushManager?.getSubscription?.();
  if (!subscription) return { disabled: false, reason: "not_subscribed" };

  const endpoint = subscription.endpoint;
  const token = getStoredBackendToken();
  if (token) {
    await backendRequest("/api/push/subscriptions", {
      method: "DELETE",
      token,
      body: { endpoint },
    }).catch((error) => {
      console.warn("Unable to deactivate CLARA Web Push endpoint on the server:", error);
    });
  }

  const disabled = await subscription.unsubscribe();
  return { disabled };
}

export async function getExistingPushSubscription() {
  if (!supportsPushNotifications()) return null;
  const registration = await navigator.serviceWorker.getRegistration().catch(() => null);
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function sendServerPushTestNotification() {
  const token = requireBackendToken();
  return backendRequest("/api/push/test", {
    method: "POST",
    token,
  });
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
