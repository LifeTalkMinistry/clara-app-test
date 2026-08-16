import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";
import { getNotificationEnvironment } from "@/lib/notifications/notificationEnvironment";

let listenersInstalled = false;

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
  loadPushPlugin().then((PushNotifications) => {
    if (!PushNotifications) return;

    PushNotifications.addListener("registrationError", (error) => {
      console.error("Native push registration error:", error);
    });

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      window.dispatchEvent(new CustomEvent("clara:native-push-received", { detail: notification }));
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
      try {
        safeRouteFromNotification(event?.notification?.data || {});
      } catch (error) {
        console.warn("Unable to route native notification tap:", error);
      }
    });
  });
}
