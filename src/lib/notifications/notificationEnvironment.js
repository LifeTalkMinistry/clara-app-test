import { Capacitor } from "@capacitor/core";

const WEB_PLATFORM = "web";

function hasWindow() {
  return typeof window !== "undefined";
}

function getSafeCapacitor() {
  try {
    return Capacitor || null;
  } catch (error) {
    console.warn("Capacitor runtime detection failed:", error);
    return null;
  }
}

export function supportsWebPushNotifications() {
  return (
    hasWindow() &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function getNotificationEnvironment() {
  const capacitor = getSafeCapacitor();

  let isNativeRuntime = false;
  let platform = WEB_PLATFORM;

  try {
    isNativeRuntime = Boolean(capacitor?.isNativePlatform?.());
    const detectedPlatform = capacitor?.getPlatform?.();
    if (detectedPlatform === "android" || detectedPlatform === "ios") {
      platform = detectedPlatform;
    }
  } catch (error) {
    console.warn("Notification platform detection failed:", error);
    isNativeRuntime = false;
    platform = WEB_PLATFORM;
  }

  const supportsWebPush = supportsWebPushNotifications();
  const supportsNativePush = isNativeRuntime && (platform === "android" || platform === "ios");
  const preferredChannel = supportsNativePush
    ? "native_push"
    : supportsWebPush
      ? "web_push"
      : "in_app_only";

  return {
    runtime: isNativeRuntime ? "native" : "web",
    isNativeRuntime,
    platform: isNativeRuntime ? platform : WEB_PLATFORM,
    supportsWebPush,
    supportsNativePush,
    supportsAnyDevicePush: supportsNativePush || supportsWebPush,
    preferredChannel,
  };
}

export function isNativeNotificationRuntime() {
  return getNotificationEnvironment().supportsNativePush;
}
