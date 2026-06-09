from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path, old, new, label):
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


# Extend the existing task reminder model without replacing its behavior.
task_file = ROOT / "src/lib/task-reminders.js"
replace_once(
    task_file,
    '''export const DEFAULT_TASK_REMINDER_SETTINGS = {
  reminders_enabled: true,
  reminder_mode: "in_app_only",
  reminder_frequency: "once_daily",
  preferred_times: ["09:00"],
  snooze_default_minutes: 30,
  only_notify_if_incomplete: true,
};''',
    '''export const DEFAULT_TASK_REMINDER_SETTINGS = {
  reminders_enabled: true,
  reminder_mode: "in_app_only",
  reminder_frequency: "once_daily",
  preferred_times: ["09:00"],
  snooze_default_minutes: 30,
  only_notify_if_incomplete: true,
  timezone: "UTC",
  quiet_hours_enabled: true,
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00",
};''',
    "task reminder defaults",
)
replace_once(
    task_file,
    '''function normalizeString(value) {
  return String(value ?? "").trim();
}
''',
    '''function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeTimezone(value) {
  const timezone = normalizeString(value) || "UTC";
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return "UTC";
  }
}
''',
    "task reminder timezone helper",
)
replace_once(
    task_file,
    '''    only_notify_if_incomplete:
      typeof value.only_notify_if_incomplete === "boolean"
        ? value.only_notify_if_incomplete
        : DEFAULT_TASK_REMINDER_SETTINGS.only_notify_if_incomplete,
  };
}''',
    '''    only_notify_if_incomplete:
      typeof value.only_notify_if_incomplete === "boolean"
        ? value.only_notify_if_incomplete
        : DEFAULT_TASK_REMINDER_SETTINGS.only_notify_if_incomplete,
    timezone: normalizeTimezone(value.timezone || DEFAULT_TASK_REMINDER_SETTINGS.timezone),
    quiet_hours_enabled:
      typeof value.quiet_hours_enabled === "boolean"
        ? value.quiet_hours_enabled
        : DEFAULT_TASK_REMINDER_SETTINGS.quiet_hours_enabled,
    quiet_hours_start:
      normalizeReminderTime(value.quiet_hours_start) ||
      DEFAULT_TASK_REMINDER_SETTINGS.quiet_hours_start,
    quiet_hours_end:
      normalizeReminderTime(value.quiet_hours_end) ||
      DEFAULT_TASK_REMINDER_SETTINGS.quiet_hours_end,
  };
}''',
    "task reminder coercion",
)

# Replace the standalone Notifications page with the same canonical component.
settings_file = ROOT / "src/pages/Settings.jsx"
replace_once(
    settings_file,
    '''import TaskReminderSettingsCard from "@/components/TaskReminderSettingsCard";
import useTaskReminderSettings from "@/hooks/useTaskReminderSettings";
import { CLARA_VOICE_OPTIONS, readClaraSettings, saveClaraSettings } from "@/lib/clara-settings";''',
    '''import NotificationSettingsPanel from "@/components/notifications/NotificationSettingsPanel";
import { CLARA_VOICE_OPTIONS, readClaraSettings, saveClaraSettings } from "@/lib/clara-settings";''',
    "standalone notification imports",
)
replace_once(
    settings_file,
    '''  const taskReminderSettings = useTaskReminderSettings(userId);
''',
    "",
    "standalone task reminder hook",
)
replace_once(
    settings_file,
    '''    if (detailSection === "notifications") {
      return (
        JSON.stringify(settingsState.notifications) !==
          JSON.stringify(initialSettingsState.notifications) ||
        taskReminderSettings.dirty
      );
    }
''',
    "",
    "standalone notification dirty state",
)
replace_once(
    settings_file,
    '''      if (detailSection === "notifications") {
        await taskReminderSettings.saveSettings();
      }
''',
    "",
    "standalone notification save bridge",
)
replace_once(
    settings_file,
    '''  }, [detailSection, dirty, settingsState, taskReminderSettings, userId]);''',
    '''  }, [detailSection, dirty, settingsState, userId]);''',
    "standalone save dependencies",
)
replace_once(
    settings_file,
    '''            action={detailSection === "notifications" || detailSection === "privacy" || detailSection === "preferences" ? (''',
    '''            action={detailSection === "privacy" || detailSection === "preferences" ? (''',
    "standalone notification save button",
)
replace_once(
    settings_file,
    '''            {detailSection === "notifications" && (
              <div className="space-y-3">
                <ToggleRow label="Daily reminders" description="Receive your regular CLARA reminder, dashboard guided-path prompt, and day-start nudges." checked={settingsState.notifications.dailyReminders} onChange={() => updateNestedSetting("notifications", "dailyReminders", !settingsState.notifications.dailyReminders)} />
                <ToggleRow label="Life OS alerts" description="Get updates for Life OS activity and important progress prompts." checked={settingsState.notifications.coachingAlerts} onChange={() => updateNestedSetting("notifications", "coachingAlerts", !settingsState.notifications.coachingAlerts)} />
                <ToggleRow label="Product updates" description="Hear about meaningful feature updates and CLARA announcements." checked={settingsState.notifications.productUpdates} onChange={() => updateNestedSetting("notifications", "productUpdates", !settingsState.notifications.productUpdates)} />
                <TaskReminderSettingsCard
                  settings={taskReminderSettings.settings}
                  onChange={(nextSettings) => {
                    taskReminderSettings.setSettings(nextSettings);
                    setMessage("");
                    setError("");
                  }}
                  loading={taskReminderSettings.loading || saving}
                  pushSupported={taskReminderSettings.pushSupported}
                  permissionState={taskReminderSettings.permissionState}
                  pushConfigured={taskReminderSettings.pushConfigured}
                  pushEnabling={taskReminderSettings.pushEnabling}
                  onEnablePush={async () => {
                    try {
                      setError("");
                      setMessage("");
                      const result = await taskReminderSettings.enablePush();
                      if (!result.configured) {
                        setMessage("Push permission updated. Add your VAPID key to finish full browser push.");
                        return;
                      }
                      setMessage("Push notifications connected for this device.");
                    } catch (pushError) {
                      console.error("Push setup error:", pushError);
                      setError("Unable to enable push notifications right now.");
                    }
                  }}
                />
              </div>
            )}''',
    '''            {detailSection === "notifications" && (
              <NotificationSettingsPanel userId={userId} />
            )}''',
    "standalone notification page",
)

# Replace only the embedded Notifications detail body and remove its obsolete local state.
embedded_file = ROOT / "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx"
replace_once(
    embedded_file,
    '''import { Button } from "@/components/ui/button";
import DashboardPanelShell from "@/components/fresh/main-dashboard/dashboard-panels/DashboardPanelShell";''',
    '''import { Button } from "@/components/ui/button";
import NotificationSettingsPanel from "@/components/notifications/NotificationSettingsPanel";
import DashboardPanelShell from "@/components/fresh/main-dashboard/dashboard-panels/DashboardPanelShell";''',
    "embedded notification import",
)
replace_once(
    embedded_file,
    '''import { persistStoredNotificationSettings } from "@/components/fresh/main-dashboard/dashboard-settings/dashboardRuntimeSettings";
''',
    "",
    "embedded runtime notification import",
)
replace_once(
    embedded_file,
    '''  notificationSettings,
  openThemePicker,
  resetThemeToDefault,
  onOpenMessages,
  setNotificationSettings = () => {},
''',
    '''  openThemePicker,
  resetThemeToDefault,
  onOpenMessages,
''',
    "embedded notification props",
)
replace_once(
    embedded_file,
    '''  const [localNotifications, setLocalNotifications] = useState(() => ({
    dailyReminders: notificationSettings?.dailyReminders !== false,
    productUpdates: notificationSettings?.productUpdates !== false,
    coachingAlerts: notificationSettings?.coachingAlerts !== false,
    budgetAlerts: notificationSettings?.budgetAlerts !== false,
  }));

''',
    "",
    "embedded notification state",
)
replace_once(
    embedded_file,
    '''  useEffect(() => {
    setLocalNotifications({
      dailyReminders: notificationSettings?.dailyReminders !== false,
      productUpdates: notificationSettings?.productUpdates !== false,
      coachingAlerts: notificationSettings?.coachingAlerts !== false,
      budgetAlerts: notificationSettings?.budgetAlerts !== false,
    });
  }, [notificationSettings]);

''',
    "",
    "embedded notification sync effect",
)
replace_once(
    embedded_file,
    '''  const saveNotificationSettings = useCallback((next) => {
    try {
      const saved = persistStoredNotificationSettings(user?.id || "guest", next);
      setNotificationSettings(saved);
      dispatchClaraEvent("clara-settings-updated", { type: "notifications", notifications: saved });
    } catch (error) {
      console.error("Failed to save embedded settings:", error);
    }
  }, [setNotificationSettings, user?.id]);

  const persistNotificationToggle = useCallback((key) => {
    setLocalNotifications((prev) => {
      const next = {
        ...prev,
        [key]: !prev[key],
      };

      saveNotificationSettings(next);
      setSettingsNotice({ type: "success", message: "Notification preference updated." });
      return next;
    });
  }, [saveNotificationSettings]);

''',
    "",
    "embedded notification callbacks",
)
replace_once(
    embedded_file,
    '''  const notificationRows = [
    {
      key: "dailyReminders",
      title: "Daily reminders",
      description: "Budget nudges and daily financial check-ins",
    },
    {
      key: "budgetAlerts",
      title: "Budget alerts",
      description: "Warnings when spending gets close to your budget",
    },
    {
      key: "productUpdates",
      title: "Product updates",
      description: "New CLARA improvements and feature notices",
    },
    {
      key: "coachingAlerts",
      title: "Coaching alerts",
      description: "Program/coaching related prompts",
    },
  ];

''',
    "",
    "embedded notification rows",
)
replace_once(
    embedded_file,
    '''  const renderNotificationsPage = () => (
    <div className="space-y-4">
      <DetailHeader
        title="Notifications"
        subtitle="Choose what deserves your attention."
      />

      {renderNotice()}

      <div className="space-y-3">
        {notificationRows.map((row) => (
          <button
            key={row.key}
            type="button"
            onClick={() => persistNotificationToggle(row.key)}
            className="flex w-full items-center justify-between gap-3 rounded-[24px] border border-white/15 bg-white/[0.045] px-4 py-4 text-left transition hover:bg-white/[0.07]"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{row.title}</p>
              <p className="mt-1 text-xs leading-5 text-white/45">{row.description}</p>
            </div>

            <SettingsToggle enabled={localNotifications[row.key]} />
          </button>
        ))}
      </div>

      <div className="rounded-[24px] border border-white/15 bg-white/[0.035] p-4">
        <p className="text-sm font-bold text-white">Delivery behavior</p>
        <p className="mt-1 text-xs leading-5 text-white/45">
          These preferences are saved on this device first. You can later move them to Supabase when you add a shared user settings table.
        </p>
      </div>
    </div>
  );''',
    '''  const renderNotificationsPage = () => (
    <div className="space-y-4">
      <DetailHeader
        title="Notifications"
        subtitle="Control how and when CLARA gets your attention."
      />

      <NotificationSettingsPanel userId={user?.id} embedded />
    </div>
  );''',
    "embedded notification page",
)

# Activate the runtime only after the dashboard has resolved finance and program state.
dashboard_file = ROOT / "src/pages/Dashboard.jsx"
replace_once(
    dashboard_file,
    '''import useDashboardNotificationSettings from "@/components/fresh/main-dashboard/dashboard-settings/useDashboardNotificationSettings";
''',
    '''import useDashboardNotificationSettings from "@/components/fresh/main-dashboard/dashboard-settings/useDashboardNotificationSettings";
import useClaraNotificationRuntime from "@/hooks/useClaraNotificationRuntime";
''',
    "dashboard notification runtime import",
)
replace_once(
    dashboard_file,
    '''  const {
    floatingProgramBubble,
    closeOnboarding,
    finishOnboarding,
  } = useDashboardProgramPromptFlow({''',
    '''  useClaraNotificationRuntime({
    userId,
    budgets,
    expenses,
    savingsGoals,
    activeTask,
    navigate,
  });

  const {
    floatingProgramBubble,
    closeOnboarding,
    finishOnboarding,
  } = useDashboardProgramPromptFlow({''',
    "dashboard notification runtime call",
)

print("CLARA notification system integration applied.")
