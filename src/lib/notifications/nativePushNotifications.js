import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";
import { getNotificationEnvironment } from "@/lib/notifications/notificationEnvironment";

const ANDROID_NOTIFICATION_CHANNEL_ID = "clara_reminders";
let listenersInstalled = false;
let localNotificationActionListenerInstalled = false;

function normalizePermission(value) {
  if (value === "granted" || value === "denied") return value;
  if (value === "prompt" || value === "prompt-with-rationale") return "default";
  return value || "default";
}

async function loadPushPlugin() {
  try {
    const module = await import("@capacitor/push-notifications");
    return module.PushNotifications;
  } catch (error) {
    console.warn("Native push plugin is unavailable:", error);
    return null;
  }
}

async function loadLocalNotificationsPlugin() {
  try {
    const module = await import("@capacitor/local-notifications");
    return module.LocalNotifications;
  } catch (error) {
    console.warn("Native local notification plugin is unavailable:", error);
    return null;
  }
}

function channelForPlatform(platform) {
  if (platform === "android") return "fcm";
  if (platform === "ios") return "apns";
  return "web_push";
}

function safeRouteFromNotification(data = {}) {
  const rawUrl = String(data.url || data.route || data.path || "#/dashboard").trim() || "#/dashboard";
  if (/^https?:\/\//i.test(rawUrl)) {
    window.location.href = rawUrl;
    return;
  }
  if (rawUrl.startsWith("#")) {
    window.location.hash = rawUrl.replace(/^#/, "");
    return;
  }
  if (rawUrl.startsWith("/")) {
    window.location.hash = rawUrl;
    return;
  }
  window.location.hash = `/${rawUrl.replace(/^\/+/, "")}`;
}

async function ensureAndroidNotificationChannel(PushNotifications, environment) {
  if (environment?.platform !== "android" || !PushNotifications?.createChannel) return;

  await PushNotifications.createChannel({
    id: ANDROID_NOTIFICATION_CHANNEL_ID,
    name: "CLARA notifications",
    description: "Messages, reminders, and important CLARA updates.",
    importance: 5,
    visibility: 1,
    vibration: true,
    sound: "default",
  });
}

function installLocalNotificationActionListener(LocalNotifications) {
  if (localNotificationActionListenerInstalled || !LocalNotifications?.addListener) return;
  localNotificationActionListenerInstalled = true;

  LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
    try {
      safeRouteFromNotification(event?.notification?.extra || {});
    } catch (error) {
      console.warn("Unable to route foreground message notification tap:", error);
    }
  }).catch((error) => {
    localNotificationActionListenerInstalled = false;
    console.warn("Unable to install foreground notification tap listener:", error);
  });
}

function foregroundNotificationId(notification = {}) {
  const source = String(
    notification?.data?.messageId ||
      notification?.data?.dedupeKey ||
      notification?.id ||
      Date.now()
  );
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
  }
  const positive = Math.abs(hash);
  return positive > 0 ? positive % 2147483647 : Math.floor(Date.now() % 2147483647);
}

async function showForegroundNativeNotification(notification = {}, environment) {
  const LocalNotifications = await loadLocalNotificationsPlugin();
  if (!LocalNotifications?.schedule) return { delivered: false, reason: "local_notifications_unavailable" };

  const status = await LocalNotifications.checkPermissions?.();
  const permission = normalizePermission(status?.display || status?.receive);
  if (permission !== "granted") {
    return { delivered: false, permission, reason: "notification_permission_not_granted" };
  }

  installLocalNotificationActionListener(LocalNotifications);

  const data = notification?.data && typeof notification.data === "object" ? notification.data : {};
  await LocalNotifications.schedule({
    notifications: [
      {
        id: foregroundNotificationId(notification),
        title: String(notification?.title || "CLARA"),
        body: String(notification?.body || "CLARA has a new message for you."),
        schedule: { at: new Date(Date.now() + 150) },
        channelId: environment?.platform === "android" ? ANDROID_NOTIFICATION_CHANNEL_ID : undefined,
        extra: data,
      },
    ],
  });

  return { delivered: true, permission };
}

async function saveNativeToken({ token, platform }) {
  const cleanToken = String(token || "").trim();
  if (!cleanToken) {
    throw new Error("Native push registration did not return an FCM token. Check Firebase/google-services.json and Android build config.");
  }

  const backendToken = getStoredBackendToken();
  if (!backendToken) {
    throw new Error("Sign in to your CLARA account before enabling device notifications.");
  }

  await backendRequest("/api/push/native-devices", {
    method: "POST",
    token: backendToken,
    body: {
      token: cleanToken,
      platform,
      deviceLabel: platform === "ios" ? "CLARA iPhone app" : "CLARA Android app",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    },
  });
}

export async function requestNativeNotificationPermission() {
  const environment = getNotificationEnvironment();
  if (!environment.supportsNativePush) return { permission: "unsupported", configured: false };

  const PushNotifications = await loadPushPlugin();
  if (!PushNotifications) return { permission: "unsupported", configured: false };

  const current = await PushNotifications.checkPermissions();
  const currentPermission = normalizePermission(current?.receive);
  if (currentPermission === "granted" || currentPermission === "denied") {
    return { permission: currentPermission, configured: currentPermission === "granted" };
  }

  const requested = await PushNotifications.requestPermissions();
  const permission = normalizePermission(requested?.receive);
  return { permission, configured: permission === "granted" };
}

export async function enableNativePushNotifications({ userId } = {}) {
  const environment = getNotificationEnvironment();
  if (!environment.supportsNativePush) {
    return { permission: "unsupported", configured: false, token: null, environment };
  }
  if (!userId || !getStoredBackendToken()) throw new Error("Sign in to enable device notifications.");

  const PushNotifications = await loadPushPlugin();
  if (!PushNotifications) {
    return { permission: "unsupported", configured: false, token: null, environment };
  }

  const permissionResult = await requestNativeNotificationPermission();
  if (permissionResult.permission !== "granted") {
    return { ...permissionResult, token: null, environment };
  }

  await ensureAndroidNotificationChannel(PushNotifications, environment);
  installNativeNotificationListeners();

  const token = await new Promise(async (resolve, reject) => {
    let settled = false;
    let registrationHandle = null;
    let errorHandle = null;
    let timeoutId = null;

    const cleanup = async () => {
      window.clearTimeout(timeoutId);
      try {
        await registrationHandle?.remove?.();
        await errorHandle?.remove?.();
      } catch {}
    };

    const finish = async (callback, value) => {
      if (settled) return;
      settled = true;
      await cleanup();
      callback(value);
    };

    try {
      registrationHandle = await PushNotifications.addListener("registration", (registrationToken) => {
        finish(resolve, registrationToken?.value || registrationToken?.token || "");
      });
      errorHandle = await PushNotifications.addListener("registrationError", (registrationError) => {
        const message = registrationError?.error || registrationError?.message || "Native push registration failed. Check Firebase google-services.json and Android configuration.";
        finish(reject, new Error(message));
      });
      timeoutId = window.setTimeout(() => {
        finish(reject, new Error("Native push registration timed out. Check Firebase google-services.json, Play services, and Android build configuration."));
      }, 15000);
      await PushNotifications.register();
    } catch (error) {
      await finish(reject, error);
    }
  });

  await saveNativeToken({ token, platform: environment.platform });

  return {
    permission: "granted",
    configured: true,
    token,
    channel: channelForPlatform(environment.platform),
    environment,
  };
}

export async function getNativeNotificationStatus() {
  const environment = getNotificationEnvironment();
  if (!environment.supportsNativePush) return { permission: "unsupported", configured: false, environment };

  const PushNotifications = await loadPushPlugin();
  if (!PushNotifications) return { permission: "unsupported", configured: false, environment };

  const status = await PushNotifications.checkPermissions();
  const permission = normalizePermission(status?.receive);
  return { permission, configured: permission === "granted", environment };
}

export function installNativeNotificationListeners() {
  const environment = getNotificationEnvironment();
  if (!environment.supportsNativePush || listenersInstalled) return;

  listenersInstalled = true;
  loadPushPlugin().then(async (PushNotifications) => {
    if (!PushNotifications) return;

    try {
      await ensureAndroidNotificationChannel(PushNotifications, environment);
    } catch (error) {
      console.warn("Unable to create CLARA Android notification channel:", error);
    }

    PushNotifications.addListener("registrationError", (error) => {
      console.error("Native push registration error:", error);
    });

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      window.dispatchEvent(new CustomEvent("clara:native-push-received", { detail: notification }));
      void showForegroundNativeNotification(notification, environment).catch((error) => {
        console.warn("Unable to display foreground CLARA push notification:", error);
      });
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
      try {
        safeRouteFromNotification(event?.notification?.data || {});
      } catch (error) {
        console.warn("Unable to route native notification tap:", error);
      }
    });
  }).catch((error) => {
    listenersInstalled = false;
    console.error("Unable to install native notification listeners:", error);
  });
}
