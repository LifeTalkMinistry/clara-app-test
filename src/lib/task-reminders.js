const COMPLETE_SUBMISSION_STATUSES = new Set([
  "pending",
  "submitted",
  "reviewed",
  "approved",
  "completed",
]);

export const DEFAULT_TASK_REMINDER_SETTINGS = {
  reminders_enabled: true,
  reminder_mode: "in_app_only",
  reminder_frequency: "once_daily",
  preferred_times: ["09:00"],
  snooze_default_minutes: 30,
  only_notify_if_incomplete: true,
};

export const TASK_REMINDER_EVENT = "clara-task-reminder-completed";

export const REMINDER_MODE_OPTIONS = [
  { value: "in_app_only", label: "In-app only" },
  { value: "push_and_in_app", label: "Push and in-app" },
  { value: "push_only", label: "Push only" },
];

export const REMINDER_FREQUENCY_OPTIONS = [
  { value: "once_daily", label: "Once daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "custom", label: "Custom times" },
];

const DEFAULT_TIME_SETS = {
  once_daily: ["09:00"],
  twice_daily: ["09:00", "18:00"],
  custom: ["09:00", "13:00", "18:00"],
};

function normalizeString(value) {
  return String(value ?? "").trim();
}

export function modeSupportsInApp(mode) {
  return mode === "in_app_only" || mode === "push_and_in_app";
}

export function modeSupportsPush(mode) {
  return mode === "push_only" || mode === "push_and_in_app";
}

export function normalizeReminderTime(value) {
  const raw = normalizeString(value);
  if (!raw) return "";

  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "";

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return "";
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return "";

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function timeToMinutes(value) {
  const normalized = normalizeReminderTime(value);
  if (!normalized) return null;

  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatReminderTime(value) {
  const normalized = normalizeReminderTime(value);
  if (!normalized) return "";

  const [hours, minutes] = normalized.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sanitizeReminderTimes(times, frequency = "once_daily") {
  const rawTimes = Array.isArray(times)
    ? times
    : typeof times === "string"
      ? times.split(",")
      : [];

  const normalized = [...new Set(rawTimes.map(normalizeReminderTime).filter(Boolean))].sort(
    (left, right) => timeToMinutes(left) - timeToMinutes(right)
  );

  const defaults = DEFAULT_TIME_SETS[frequency] || DEFAULT_TIME_SETS.once_daily;

  if (frequency === "once_daily") {
    return [normalized[0] || defaults[0]];
  }

  if (frequency === "twice_daily") {
    return [normalized[0] || defaults[0], normalized[1] || defaults[1]];
  }

  return normalized.length > 0 ? normalized.slice(0, 3) : defaults;
}

export function coerceTaskReminderSettings(value = {}) {
  const reminderMode = REMINDER_MODE_OPTIONS.some((option) => option.value === value.reminder_mode)
    ? value.reminder_mode
    : DEFAULT_TASK_REMINDER_SETTINGS.reminder_mode;

  const reminderFrequency = REMINDER_FREQUENCY_OPTIONS.some(
    (option) => option.value === value.reminder_frequency
  )
    ? value.reminder_frequency
    : DEFAULT_TASK_REMINDER_SETTINGS.reminder_frequency;

  const snoozeDefaultMinutes = Number(value.snooze_default_minutes);

  return {
    reminders_enabled:
      typeof value.reminders_enabled === "boolean"
        ? value.reminders_enabled
        : DEFAULT_TASK_REMINDER_SETTINGS.reminders_enabled,
    reminder_mode: reminderMode,
    reminder_frequency: reminderFrequency,
    preferred_times: sanitizeReminderTimes(value.preferred_times, reminderFrequency),
    snooze_default_minutes:
      Number.isFinite(snoozeDefaultMinutes) && snoozeDefaultMinutes > 0
        ? snoozeDefaultMinutes
        : DEFAULT_TASK_REMINDER_SETTINGS.snooze_default_minutes,
    only_notify_if_incomplete:
      typeof value.only_notify_if_incomplete === "boolean"
        ? value.only_notify_if_incomplete
        : DEFAULT_TASK_REMINDER_SETTINGS.only_notify_if_incomplete,
  };
}

export function getReminderWindows(settings, now = new Date()) {
  const normalizedSettings = coerceTaskReminderSettings(settings);
  const dateKey = getLocalDateKey(now);

  return sanitizeReminderTimes(
    normalizedSettings.preferred_times,
    normalizedSettings.reminder_frequency
  ).map((time) => ({
    time,
    label: formatReminderTime(time),
    minutes: timeToMinutes(time),
    dateKey,
    windowKey: `${dateKey}:${time.replace(":", "")}`,
  }));
}

export function getActiveReminderWindow(settings, now = new Date()) {
  const windows = getReminderWindows(settings, now);
  if (windows.length === 0) return null;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let activeIndex = -1;

  for (let index = 0; index < windows.length; index += 1) {
    if (windows[index].minutes <= currentMinutes) {
      activeIndex = index;
    }
  }

  if (activeIndex === -1) return null;

  const currentWindow = windows[activeIndex];
  const nextWindow = windows[activeIndex + 1] || null;

  return {
    ...currentWindow,
    startsAtMinutes: currentWindow.minutes,
    endsAtMinutes: nextWindow?.minutes ?? 24 * 60,
    nextWindow,
  };
}

export function getNextReminderWindow(settings, now = new Date()) {
  const windows = getReminderWindows(settings, now);
  if (windows.length === 0) return null;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return windows.find((window) => window.minutes > currentMinutes) || null;
}

export function getReminderSnoozeChoices(defaultMinutes = 30) {
  return [...new Set([defaultMinutes, 30, 60, 180])]
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right)
    .map((value) => ({
      value,
      label: value >= 60 ? `${Math.round(value / 60)} hr` : `${value} min`,
    }));
}

export function isTaskReminderComplete(task) {
  if (!task) return true;

  if (task?.submissionMeta?.isComplete) return true;

  const status = normalizeString(task?.submission?.status).toLowerCase();
  return COMPLETE_SUBMISSION_STATUSES.has(status);
}

export function buildReminderStatePayload({
  userId,
  task,
  reminderWindow,
  patch = {},
}) {
  return {
    user_id: userId,
    task_id: normalizeString(task?.id || ""),
    task_day: Number(task?.day || task?.day_number || 0) || null,
    reminder_date: reminderWindow?.dateKey || getLocalDateKey(new Date()),
    reminder_window_key: reminderWindow?.windowKey || "",
    last_shown_at: patch.last_shown_at ?? null,
    last_acknowledged_at: patch.last_acknowledged_at ?? null,
    snoozed_until: patch.snoozed_until ?? null,
    dismissed_for_day: patch.dismissed_for_day ?? false,
    dismissed_in_window: patch.dismissed_in_window ?? false,
    last_action: patch.last_action ?? null,
  };
}

export function shouldSurfaceTaskReminder({
  task,
  settings,
  reminderState,
  reminderWindow,
  now = new Date(),
}) {
  const normalizedSettings = coerceTaskReminderSettings(settings);

  if (!task || !reminderWindow) return false;
  if (task.state && !["active", "available"].includes(task.state)) return false;
  if (!normalizedSettings.reminders_enabled) return false;
  if (!modeSupportsInApp(normalizedSettings.reminder_mode)) return false;
  if (normalizedSettings.only_notify_if_incomplete && isTaskReminderComplete(task)) {
    return false;
  }

  if (!reminderState) return true;
  if (reminderState.last_acknowledged_at) return false;
  if (reminderState.dismissed_in_window || reminderState.dismissed_for_day) return false;

  const snoozedUntil = reminderState.snoozed_until
    ? new Date(reminderState.snoozed_until)
    : null;

  if (snoozedUntil && !Number.isNaN(snoozedUntil.getTime()) && snoozedUntil > now) {
    return false;
  }

  if (!reminderState.last_shown_at) return true;
  return reminderState.last_action === "snoozed";
}

export function shouldSuppressVisibleReminder({
  task,
  settings,
  reminderState,
  reminderWindow,
  now = new Date(),
}) {
  const normalizedSettings = coerceTaskReminderSettings(settings);

  if (!task || !reminderWindow) return true;
  if (task.state && !["active", "available"].includes(task.state)) return true;
  if (!normalizedSettings.reminders_enabled) return true;
  if (!modeSupportsInApp(normalizedSettings.reminder_mode)) return true;
  if (normalizedSettings.only_notify_if_incomplete && isTaskReminderComplete(task)) {
    return true;
  }

  if (!reminderState) return false;
  if (reminderState.last_acknowledged_at) return true;
  if (reminderState.dismissed_in_window || reminderState.dismissed_for_day) return true;

  const snoozedUntil = reminderState.snoozed_until
    ? new Date(reminderState.snoozed_until)
    : null;

  return Boolean(
    snoozedUntil && !Number.isNaN(snoozedUntil.getTime()) && snoozedUntil > now
  );
}

export async function fetchTaskReminderSettings({ supabase, userId }) {
  if (!supabase || !userId) return coerceTaskReminderSettings();

  const { data, error } = await supabase
    .from("user_task_reminder_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return coerceTaskReminderSettings(data || {});
}

export async function upsertTaskReminderSettings({ supabase, userId, settings }) {
  if (!supabase || !userId) {
    return coerceTaskReminderSettings(settings);
  }

  const normalizedSettings = coerceTaskReminderSettings(settings);
  const payload = {
    user_id: userId,
    ...normalizedSettings,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_task_reminder_settings")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw error;
  return coerceTaskReminderSettings(data || normalizedSettings);
}

export async function fetchTaskReminderState({
  supabase,
  userId,
  taskId,
  reminderDate,
  windowKey,
}) {
  if (!supabase || !userId || !taskId || !reminderDate || !windowKey) return null;

  const { data, error } = await supabase
    .from("user_task_reminder_states")
    .select("*")
    .eq("user_id", userId)
    .eq("task_id", normalizeString(taskId))
    .eq("reminder_date", reminderDate)
    .eq("reminder_window_key", windowKey)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function upsertTaskReminderState({
  supabase,
  userId,
  task,
  reminderWindow,
  patch,
}) {
  if (!supabase || !userId || !task?.id || !reminderWindow?.windowKey) return null;

  const payload = buildReminderStatePayload({
    userId,
    task,
    reminderWindow,
    patch,
  });

  const { data, error } = await supabase
    .from("user_task_reminder_states")
    .upsert(payload, {
      onConflict: "user_id,task_id,reminder_date,reminder_window_key",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data || payload;
}
