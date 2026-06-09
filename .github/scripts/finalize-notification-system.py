from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path, old, new, label):
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


runtime = ROOT / "src/hooks/useClaraNotificationRuntime.js"
replace_once(
    runtime,
    '''import {
  getZonedDateParts,
  isInsideQuietHours,
  readNotificationPreferences,
} from "@/lib/notifications/notificationPreferences";''',
    '''import {
  getZonedDateParts,
  hasStoredNotificationPreferences,
  isInsideQuietHours,
  readNotificationPreferences,
} from "@/lib/notifications/notificationPreferences";''',
    "runtime preference imports",
)
replace_once(
    runtime,
    '''function taskDeliveryPreferencesDiffer(settings, preferences) {
  return (
    settings.timezone !== preferences.timezone ||
    settings.quiet_hours_enabled !== preferences.quietHoursEnabled ||
    settings.quiet_hours_start !== preferences.quietHoursStart ||
    settings.quiet_hours_end !== preferences.quietHoursEnd
  );
}''',
    '''function taskDeliveryPreferencesDiffer(settings, preferences, syncEnabledState) {
  return (
    (syncEnabledState && settings.reminders_enabled !== preferences.tasksAndCoaching) ||
    settings.timezone !== preferences.timezone ||
    settings.quiet_hours_enabled !== preferences.quietHoursEnabled ||
    settings.quiet_hours_start !== preferences.quietHoursStart ||
    settings.quiet_hours_end !== preferences.quietHoursEnd
  );
}''',
    "runtime task preference comparison",
)
replace_once(
    runtime,
    '''    const evaluateTaskReminder = async (preferences) => {
      if (!activeTask || !preferences.tasksAndCoaching) return;
      if (!isNotificationEventAllowed("task_still_incomplete", preferences)) return;

      let settings;''',
    '''    const evaluateTaskReminder = async (preferences) => {
      if (!activeTask) return;

      const syncEnabledState = hasStoredNotificationPreferences(userId);
      let settings;''',
    "runtime task early return",
)
replace_once(
    runtime,
    '''        if (taskDeliveryPreferencesDiffer(settings, preferences)) {
          settings = await upsertTaskReminderSettings({
            supabase,
            userId,
            settings: {
              ...settings,
              timezone: preferences.timezone,
              quiet_hours_enabled: preferences.quietHoursEnabled,
              quiet_hours_start: preferences.quietHoursStart,
              quiet_hours_end: preferences.quietHoursEnd,
            },
          });
        }''',
    '''        if (taskDeliveryPreferencesDiffer(settings, preferences, syncEnabledState)) {
          settings = await upsertTaskReminderSettings({
            supabase,
            userId,
            settings: {
              ...settings,
              reminders_enabled: syncEnabledState
                ? preferences.tasksAndCoaching
                : settings.reminders_enabled,
              timezone: preferences.timezone,
              quiet_hours_enabled: preferences.quietHoursEnabled,
              quiet_hours_start: preferences.quietHoursStart,
              quiet_hours_end: preferences.quietHoursEnd,
            },
          });
        }''',
    "runtime task settings synchronization",
)
replace_once(
    runtime,
    '''      const reminderWindow = getActiveReminderWindow(settings, new Date());''',
    '''      if (!preferences.tasksAndCoaching) return;
      if (!isNotificationEventAllowed("task_still_incomplete", preferences)) return;

      const reminderWindow = getActiveReminderWindow(settings, new Date());''',
    "runtime category gate after synchronization",
)

settings_panel = ROOT / "src/components/notifications/NotificationSettingsPanel.jsx"
replace_once(
    settings_panel,
    '''        reminders_enabled: Boolean(nextPreferences.tasksAndCoaching && taskApplicable),''',
    '''        reminders_enabled:
          taskApplicable === true
            ? Boolean(nextPreferences.tasksAndCoaching)
            : taskReminderSettings.settings.reminders_enabled,''',
    "settings applicability-safe task toggle",
)

scheduler = ROOT / "supabase/functions/schedule-task-reminders/index.ts"
replace_once(
    scheduler,
    '''function dueTime(settings: Record<string, unknown>, currentTime: string) {
  return reminderTimes(settings).find((time) => time === currentTime) || "";
}''',
    '''function dueTime(settings: Record<string, unknown>, currentMinutes: number) {
  return (
    reminderTimes(settings).find((time) => {
      const scheduledMinutes = minutesFromTime(time);
      return currentMinutes >= scheduledMinutes && currentMinutes < scheduledMinutes + 5;
    }) || ""
  );
}''',
    "scheduler tolerance window",
)
replace_once(
    scheduler,
    '''      const time = dueTime(settings, clock.time);''',
    '''      const time = dueTime(settings, clock.minutes);''',
    "scheduler due time call",
)

print("Final CLARA notification safety patch applied.")
