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
    window.isSecureContext === true &&
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
    throw new Error(
      "Web Push is unavailable in this browser/PWA. CLARA must be opened from its secure HTTPS installation."
    );
  }

  const registration = await navigator.serviceWorker.register(
    REMINDER_SERVICE_WORKER_PATH,
    { updateViaCache: "none" }
  );

  // `ready` guarantees that showNotification()/PushManager are backed by an
  // active worker. This matters on the first notification attempt after a PWA
  // install or after Clear This Device removes the previous registration.
  const readyRegistration = await navigator.serviceWorker.ready;
  return readyRegistration || registration;
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
    return {
      permission,
      configured: false,
      subscription: null,
      reason:
        permission === "denied"
          ? "Notifications are blocked for CLARA. On Android, open Settings → Apps → CLARA (or Chrome) → Notifications and allow notifications, then return to CLARA."
          : "CLARA needs notification permission before it can show phone notifications.",
    };
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
    throw new Error(
      "Device notifications are not supported in this browser/PWA environment."
    );
  }

  // A local test is itself a direct user gesture. Ask for permission here as
  // well, rather than silently failing when the user skipped the separate
  // Enable phone notifications button.
  const permission = await requestBrowserNotificationPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "CLARA notification permission is blocked. On Android, open Settings → Apps → CLARA (or Chrome) → Notifications and allow notifications."
        : "Allow CLARA notifications when Android asks, then run the test again."
    );
  }

  const registration = await registerReminderServiceWorker();
  await registration.showNotification(title || "CLARA", {
    body: body || "CLARA has an update for you.",
    icon: `${import.meta.env.BASE_URL || "/"}icons/icon-192.png`,
    badge: `${import.meta.env.BASE_URL || "/"}icons/maskable-icon-192.png`,
    tag: tag || undefined,
    renotify: false,
    silent: false,
    data: { url, eventType, tag },
  });

  return {
    delivered: true,
    permission,
    scope: registration.scope,
  };
}

export function showTestNotification() {
  return showDeviceNotification({
    title: "CLARA notifications are ready",
    body: "This is a local CLARA notification test from this phone.",
    url: "/dashboard",
    tag: `clara-test-${Date.now()}`,
    eventType: "test_notification",
  });
}
