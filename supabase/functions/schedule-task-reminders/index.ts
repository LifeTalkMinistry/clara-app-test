import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const internalSecret = Deno.env.get("TASK_REMINDER_INTERNAL_SECRET") || "";
const senderUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/send-task-reminders`;

const supabase = createClient(supabaseUrl, serviceRoleKey);

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

function normalizeTime(value: unknown) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return "";
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function localClock(timezone: string, now = new Date()) {
  let safeTimezone = String(timezone || "UTC").trim() || "UTC";
  try {
    Intl.DateTimeFormat("en-US", { timeZone: safeTimezone }).format(now);
  } catch {
    safeTimezone = "UTC";
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((part) => [part.type, part.value])
  );

  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function minutesFromTime(value: string) {
  const [hours, minutes] = normalizeTime(value).split(":").map(Number);
  return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
}

function insideQuietHours(settings: Record<string, unknown>, currentMinutes: number) {
  if (settings.quiet_hours_enabled === false) return false;
  const start = minutesFromTime(String(settings.quiet_hours_start || "22:00"));
  const end = minutesFromTime(String(settings.quiet_hours_end || "07:00"));
  if (start === end) return true;
  if (start < end) return currentMinutes >= start && currentMinutes < end;
  return currentMinutes >= start || currentMinutes < end;
}

function reminderTimes(settings: Record<string, unknown>) {
  const raw = Array.isArray(settings.preferred_times) ? settings.preferred_times : [];
  const times = [...new Set(raw.map(normalizeTime).filter(Boolean))].sort();
  if (times.length) return times;
  if (settings.reminder_frequency === "twice_daily") return ["09:00", "18:00"];
  if (settings.reminder_frequency === "custom") return ["09:00", "13:00", "18:00"];
  return ["09:00"];
}

function dueTime(settings: Record<string, unknown>, currentMinutes: number) {
  return (
    reminderTimes(settings).find((time) => {
      const scheduledMinutes = minutesFromTime(time);
      return currentMinutes >= scheduledMinutes && currentMinutes < scheduledMinutes + 5;
    }) || ""
  );
}

async function getIncompleteAssignment(userId: string, localDate: string) {
  const { data, error } = await supabase
    .from("user_program_day_assignments")
    .select("task_id,day_number,unlocked_on,completed_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .is("completed_at", null)
    .lte("unlocked_on", localDate)
    .order("day_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getReminderState({
  userId,
  taskId,
  reminderDate,
  windowKey,
}: {
  userId: string;
  taskId: string;
  reminderDate: string;
  windowKey: string;
}) {
  const { data, error } = await supabase
    .from("user_task_reminder_states")
    .select("*")
    .eq("user_id", userId)
    .eq("task_id", taskId)
    .eq("reminder_date", reminderDate)
    .eq("reminder_window_key", windowKey)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

function stateSuppressesDelivery(state: Record<string, unknown> | null, now: Date) {
  if (!state) return false;
  if (state.push_sent_at || state.last_acknowledged_at || state.dismissed_in_window || state.dismissed_for_day) {
    return true;
  }
  if (state.last_shown_at) return true;
  const snoozedUntil = state.snoozed_until ? new Date(String(state.snoozed_until)) : null;
  return Boolean(snoozedUntil && !Number.isNaN(snoozedUntil.getTime()) && snoozedUntil > now);
}

async function callSender(payload: Record<string, unknown>) {
  const response = await fetch(senderUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(result?.error || `Sender returned ${response.status}`));
  }
  return result;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  if (!isAuthorized(request)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const now = new Date();
    const { data: settingsRows, error } = await supabase
      .from("user_task_reminder_settings")
      .select("*")
      .eq("reminders_enabled", true)
      .in("reminder_mode", ["push_only", "push_and_in_app"]);

    if (error) throw error;

    let sent = 0;
    let skipped = 0;
    const failures: Array<{ user_id: string; reason: string }> = [];

    for (const settings of settingsRows || []) {
      const userId = String(settings.user_id || "").trim();
      if (!userId) continue;

      const clock = localClock(String(settings.timezone || "UTC"), now);
      const time = dueTime(settings, clock.minutes);
      if (!time || insideQuietHours(settings, clock.minutes)) {
        skipped += 1;
        continue;
      }

      try {
        const assignment = await getIncompleteAssignment(userId, clock.dateKey);
        if (!assignment?.task_id) {
          skipped += 1;
          continue;
        }

        const taskId = String(assignment.task_id);
        const windowKey = `${clock.dateKey}:${time.replace(":", "")}`;
        const state = await getReminderState({
          userId,
          taskId,
          reminderDate: clock.dateKey,
          windowKey,
        });

        if (stateSuppressesDelivery(state, now)) {
          skipped += 1;
          continue;
        }

        const dedupeKey = `task_still_incomplete:${taskId}:${clock.dateKey}:${time.replace(":", "")}`;
        const senderResult = await callSender({
          user_id: userId,
          title: "Your CLARA task is still waiting",
          body: assignment.day_number
            ? `Your Day ${assignment.day_number} task is still incomplete.`
            : "Your active program task is still incomplete.",
          url: "#/lifeos",
          dedupe_key: dedupeKey,
          event_type: "task_still_incomplete",
        });

        if (Number(senderResult?.sent || 0) <= 0) {
          skipped += 1;
          continue;
        }

        const timestamp = new Date().toISOString();
        const { error: stateError } = await supabase
          .from("user_task_reminder_states")
          .upsert(
            {
              user_id: userId,
              task_id: taskId,
              task_day: assignment.day_number || null,
              reminder_date: clock.dateKey,
              reminder_window_key: windowKey,
              dedupe_key: dedupeKey,
              push_sent_at: timestamp,
              last_shown_at: timestamp,
              dismissed_for_day: false,
              dismissed_in_window: false,
              last_action: "push_sent",
              updated_at: timestamp,
            },
            { onConflict: "user_id,task_id,reminder_date,reminder_window_key" }
          );

        if (stateError) throw stateError;
        sent += 1;
      } catch (userError) {
        failures.push({
          user_id: userId,
          reason: userError instanceof Error ? userError.message : "Unknown reminder failure",
        });
      }
    }

    return jsonResponse({ sent, skipped, failures });
  } catch (error) {
    console.error("schedule-task-reminders failed:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown scheduler failure" },
      500
    );
  }
});
