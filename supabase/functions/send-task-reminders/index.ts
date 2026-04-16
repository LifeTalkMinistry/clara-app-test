import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@clara.app";
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = await request.json();
    const userId = String(payload.user_id || "").trim();
    const title = payload.title || "CLARA";
    const body = payload.body || "Your guided task is ready.";
    const url = payload.url || "/#/tasks?open=today";

    if (!userId) {
      return jsonResponse({ error: "user_id is required" }, 400);
    }

    const { data: reminderSettings, error: settingsError } = await supabase
      .from("user_task_reminder_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (settingsError) throw settingsError;

    if (
      reminderSettings &&
      (!reminderSettings.reminders_enabled ||
        !["push_only", "push_and_in_app"].includes(reminderSettings.reminder_mode))
    ) {
      return jsonResponse({
        sent: 0,
        skipped: true,
        reason: "User reminder settings do not allow push notifications",
      });
    }

    const { data: subscriptions, error } = await supabase
      .from("user_push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) throw error;

    if (!subscriptions?.length) {
      return jsonResponse({ sent: 0, skipped: true, reason: "No active subscriptions" });
    }

    let sentCount = 0;

    for (const subscriptionRow of subscriptions) {
      if (!subscriptionRow.subscription) continue;

      try {
        await webpush.sendNotification(
          subscriptionRow.subscription,
          JSON.stringify({
            title,
            body,
            url,
            icon: payload.icon || "/favicon.svg",
            badge: payload.badge || "/favicon.svg",
          })
        );
        sentCount += 1;
      } catch (sendError) {
        console.error("Push send failed for endpoint:", subscriptionRow.endpoint, sendError);
      }
    }

    return jsonResponse({ sent: sentCount });
  } catch (error) {
    console.error("send-task-reminders failed:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});
