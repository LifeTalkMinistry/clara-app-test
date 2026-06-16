import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const internalSecret = Deno.env.get("TASK_REMINDER_INTERNAL_SECRET") || "";
const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@clara.app";
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID") || "";
const firebaseClientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL") || "";
const firebasePrivateKey = (Deno.env.get("FIREBASE_PRIVATE_KEY") || "").replace(/\\n/g, "\n");

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
let fcmAccessTokenCache: { token: string; expiresAt: number } | null = null;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isAuthorized(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  return Boolean(token && (token === serviceRoleKey || token === internalSecret));
}

function base64UrlFromString(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlFromBuffer(value: ArrayBuffer) {
  const bytes = new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string) {
  const clean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function createServiceAccountJwt() {
  if (!firebaseClientEmail || !firebasePrivateKey) {
    throw new Error("Firebase service account secrets are not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: firebaseClientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64UrlFromString(JSON.stringify(header))}.${base64UrlFromString(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(firebasePrivateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );
  return `${unsigned}.${base64UrlFromBuffer(signature)}`;
}

async function getFcmAccessToken() {
  if (fcmAccessTokenCache && fcmAccessTokenCache.expiresAt > Date.now() + 60000) {
    return fcmAccessTokenCache.token;
  }

  const assertion = await createServiceAccountJwt();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error_description || data?.error || "Unable to fetch Firebase access token.");
  }

  fcmAccessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
  };
  return fcmAccessTokenCache.token;
}

function buildNotificationPayload(payload: Record<string, unknown>) {
  return {
    title: String(payload.title || "CLARA").trim(),
    body: String(payload.body || "Your guided task is ready.").trim(),
    url: String(payload.url || "#/dashboard").trim(),
    dedupeKey: String(payload.dedupe_key || payload.dedupeKey || "").trim(),
    eventType: String(payload.event_type || payload.eventType || "task_still_incomplete").trim(),
    icon: payload.icon || "favicon.svg",
    badge: payload.badge || "favicon.svg",
  };
}

function isExpiredWebPush(error: unknown) {
  const statusCode = Number((error as { statusCode?: number })?.statusCode || 0);
  return [404, 410].includes(statusCode);
}

function isInvalidFcmResponse(status: number, text: string) {
  return [400, 404].includes(status) && /UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT/i.test(text);
}

async function deactivateDevice(id: string) {
  await supabase
    .from("user_notification_devices")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
}

async function sendUniversalDevice(device: Record<string, any>, notification: Record<string, unknown>) {
  if (device.channel === "web_push") {
    if (!device.subscription) return { sent: 0, webSent: 0, nativeSent: 0, deactivated: 0, skipped: 1 };

    try {
      await webpush.sendNotification(device.subscription, JSON.stringify(notification));
      return { sent: 1, webSent: 1, nativeSent: 0, deactivated: 0, skipped: 0 };
    } catch (error) {
      if (isExpiredWebPush(error)) {
        await deactivateDevice(device.id);
        return { sent: 0, webSent: 0, nativeSent: 0, deactivated: 1, skipped: 0 };
      }
      console.error("Universal web push send failed:", device.endpoint, error);
      return { sent: 0, webSent: 0, nativeSent: 0, deactivated: 0, skipped: 1 };
    }
  }

  if (device.channel === "fcm") {
    if (!firebaseProjectId || !firebaseClientEmail || !firebasePrivateKey) {
      console.warn("FCM skipped because Firebase secrets are not configured.");
      return { sent: 0, webSent: 0, nativeSent: 0, deactivated: 0, skipped: 1 };
    }
    if (!device.token) return { sent: 0, webSent: 0, nativeSent: 0, deactivated: 0, skipped: 1 };

    try {
      const accessToken = await getFcmAccessToken();
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: device.token,
              notification: {
                title: notification.title,
                body: notification.body,
              },
              data: {
                url: String(notification.url || "#/dashboard"),
                dedupeKey: String(notification.dedupeKey || ""),
                eventType: String(notification.eventType || "task_still_incomplete"),
              },
              android: {
                priority: "HIGH",
                notification: {
                  channel_id: "clara_reminders",
                },
              },
            },
          }),
        }
      );

      const text = await response.text();
      if (!response.ok) {
        if (isInvalidFcmResponse(response.status, text)) {
          await deactivateDevice(device.id);
          return { sent: 0, webSent: 0, nativeSent: 0, deactivated: 1, skipped: 0 };
        }
        console.error("FCM send failed:", response.status, text);
        return { sent: 0, webSent: 0, nativeSent: 0, deactivated: 0, skipped: 1 };
      }

      return { sent: 1, webSent: 0, nativeSent: 1, deactivated: 0, skipped: 0 };
    } catch (error) {
      console.error("FCM send failed:", error);
      return { sent: 0, webSent: 0, nativeSent: 0, deactivated: 0, skipped: 1 };
    }
  }

  if (device.channel === "apns") {
    console.warn("APNs notification skipped until iOS native push provider is configured.");
    return { sent: 0, webSent: 0, nativeSent: 0, deactivated: 0, skipped: 1 };
  }

  return { sent: 0, webSent: 0, nativeSent: 0, deactivated: 0, skipped: 1 };
}

async function sendLegacyWebPush(userId: string, notification: Record<string, unknown>) {
  const { data: subscriptions, error } = await supabase
    .from("user_push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) throw error;

  let sent = 0;
  let deactivated = 0;
  let skipped = 0;

  for (const subscriptionRow of subscriptions || []) {
    if (!subscriptionRow.subscription) {
      skipped += 1;
      continue;
    }

    try {
      await webpush.sendNotification(subscriptionRow.subscription, JSON.stringify(notification));
      sent += 1;
    } catch (error) {
      if (isExpiredWebPush(error)) {
        await supabase
          .from("user_push_subscriptions")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", subscriptionRow.id);
        deactivated += 1;
        continue;
      }
      console.error("Legacy web push send failed for endpoint:", subscriptionRow.endpoint, error);
      skipped += 1;
    }
  }

  return { sent, webSent: sent, nativeSent: 0, deactivated, skipped };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  if (!isAuthorized(request)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = await request.json();
    const userId = String(payload.user_id || "").trim();
    const notification = buildNotificationPayload(payload);

    if (!userId) {
      return jsonResponse({ error: "user_id is required" }, 400);
    }
    if (!notification.dedupeKey) {
      return jsonResponse({ error: "dedupe_key is required" }, 400);
    }

    const { data: reminderSettings, error: settingsError } = await supabase
      .from("user_task_reminder_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (settingsError) throw settingsError;

    if (
      !reminderSettings ||
      !reminderSettings.reminders_enabled ||
      !["push_only", "push_and_in_app"].includes(reminderSettings.reminder_mode)
    ) {
      return jsonResponse({
        sent: 0,
        webSent: 0,
        nativeSent: 0,
        deactivated: 0,
        skipped: 1,
        dedupe_key: notification.dedupeKey,
        reason: "User reminder settings do not allow push notifications",
      });
    }

    const universalResult = await supabase
      .from("user_notification_devices")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    const devices = universalResult.error ? [] : universalResult.data || [];
    if (universalResult.error) {
      console.warn("Universal notification device lookup failed; falling back to legacy web push:", universalResult.error);
    }

    let totals = { sent: 0, webSent: 0, nativeSent: 0, deactivated: 0, skipped: 0 };

    if (devices.length) {
      for (const device of devices) {
        const result = await sendUniversalDevice(device, notification);
        totals = {
          sent: totals.sent + result.sent,
          webSent: totals.webSent + result.webSent,
          nativeSent: totals.nativeSent + result.nativeSent,
          deactivated: totals.deactivated + result.deactivated,
          skipped: totals.skipped + result.skipped,
        };
      }
    } else {
      totals = await sendLegacyWebPush(userId, notification);
    }

    return jsonResponse({ ...totals, dedupe_key: notification.dedupeKey });
  } catch (error) {
    console.error("send-task-reminders failed:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});
