import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Goal,
  Megaphone,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Switch } from "@/components/ui/switch";
import TaskReminderSettingsCard from "@/components/TaskReminderSettingsCard";
import useTaskReminderSettings from "@/hooks/useTaskReminderSettings";
import useNotificationPreferences from "@/hooks/useNotificationPreferences";
import {
  hasStoredNotificationPreferences,
} from "@/lib/notifications/notificationPreferences";
import {
  getNotificationPermissionState,
  showTestNotification,
  supportsPushNotifications,
} from "@/lib/push-notifications";

const SNOOZE_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 180, label: "3 hours" },
];

function statusCopy({ pushSupported, permissionState, pushConfigured }) {
  if (!pushSupported) {
    return {
      title: "Not supported",
      body: "This browser cannot receive device notifications. In-app notifications still work.",
    };
  }
  if (permissionState === "denied") {
    return {
      title: "Permission blocked",
      body: "Enable notifications in your browser or device settings, then return here.",
    };
  }
  if (permissionState === "granted" && pushConfigured) {
    return {
      title: "Enabled on this device",
      body: "This device is connected for supported CLARA reminders.",
    };
  }
  if (permissionState === "granted") {
    return {
      title: "Permission granted, setup incomplete",
      body: "Permission is ready, but push delivery still needs to finish connecting.",
    };
  }
  return {
    title: "Not enabled",
    body: "CLARA will keep using in-app notifications until you enable this device.",
  };
}

function CategoryRow({ icon: Icon, title, description, note, checked, disabled, onChange }) {
  return (
    <div className={`flex items-start justify-between gap-4 rounded-[22px] border border-white/10 bg-white/[0.035] px-4 py-4 ${disabled ? "opacity-55" : ""}`}>
      <div className="flex min-w-0 gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-emerald-200">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-white/50">{description}</p>
          {note ? <p className="mt-1 text-[11px] font-semibold text-emerald-100/55">{note}</p> : null}
        </div>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        className="mt-1 shrink-0 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-white/15"
      />
    </div>
  );
}

function FieldLabel({ title, description }) {
  return (
    <div>
      <p className="text-sm font-bold text-white">{title}</p>
      {description ? <p className="mt-1 text-xs leading-5 text-white/45">{description}</p> : null}
    </div>
  );
}

export default function NotificationSettingsPanel({ userId, embedded = false }) {
  const { preferences, updatePreference, setPreferences } = useNotificationPreferences(userId);
  const taskReminderSettings = useTaskReminderSettings(userId);
  const hadStoredPreferencesOnMount = useRef(hasStoredNotificationPreferences(userId));
  const [taskApplicable, setTaskApplicable] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);

  const pushSupported = useMemo(() => supportsPushNotifications(), []);
  const deviceStatus = statusCopy({
    pushSupported,
    permissionState: taskReminderSettings.permissionState,
    pushConfigured: taskReminderSettings.pushConfigured,
  });

  useEffect(() => {
    let mounted = true;

    const loadApplicability = async () => {
      if (!userId) {
        if (mounted) setTaskApplicable(false);
        return;
      }

      try {
        const [programResult, assignmentResult] = await Promise.all([
          supabase
            .from("user_programs")
            .select("id,is_active,challenge_started")
            .eq("user_id", userId)
            .eq("is_active", true)
            .limit(1),
          supabase
            .from("user_program_day_assignments")
            .select("id")
            .eq("user_id", userId)
            .eq("is_active", true)
            .is("completed_at", null)
            .limit(1),
        ]);

        const hasProgram = !programResult.error && Boolean(programResult.data?.length);
        const hasAssignment = !assignmentResult.error && Boolean(assignmentResult.data?.length);
        if (mounted) setTaskApplicable(hasProgram || hasAssignment);
      } catch {
        if (mounted) setTaskApplicable(false);
      }
    };

    loadApplicability();
    return () => {
      mounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (taskReminderSettings.loading) return;
    if (hadStoredPreferencesOnMount.current) return;
    hadStoredPreferencesOnMount.current = true;

    if (taskReminderSettings.settings.reminders_enabled === false) {
      setPreferences((current) => ({ ...current, tasksAndCoaching: false }));
    }
  }, [setPreferences, taskReminderSettings.loading, taskReminderSettings.settings.reminders_enabled]);

  const syncTaskSettings = useCallback(
    async (nextPreferences, patch = {}) => {
      if (!userId) return;
      const nextTaskSettings = {
        ...taskReminderSettings.settings,
        ...patch,
        reminders_enabled: Boolean(nextPreferences.tasksAndCoaching && taskApplicable),
        timezone: nextPreferences.timezone,
        quiet_hours_enabled: nextPreferences.quietHoursEnabled,
        quiet_hours_start: nextPreferences.quietHoursStart,
        quiet_hours_end: nextPreferences.quietHoursEnd,
      };
      await taskReminderSettings.saveSettings(nextTaskSettings);
    },
    [taskApplicable, taskReminderSettings, userId]
  );

  const changePreference = useCallback(
    async (key, value, options = {}) => {
      setNotice("");
      setError("");
      const next = updatePreference(key, value);

      if (options.syncTask) {
        try {
          await syncTaskSettings(next, options.taskPatch || {});
        } catch (saveError) {
          console.error("Notification task settings sync failed:", saveError);
          setError("Your app preference was saved, but task reminder delivery could not be updated.");
        }
      }

      return next;
    },
    [syncTaskSettings, updatePreference]
  );

  const enableDeviceNotifications = useCallback(async () => {
    setNotice("");
    setError("");

    try {
      const result = await taskReminderSettings.enablePush();
      if (result.permission === "denied") {
        setError("Notification permission is blocked. Enable it in your browser or device settings.");
        return;
      }
      if (!result.configured) {
        setError("Permission was granted, but push delivery is not fully configured for this environment.");
        return;
      }

      const next = updatePreference("deliveryMode", "device_and_in_app");
      await syncTaskSettings(next, { reminder_mode: "push_and_in_app" });
      setNotice("Device notifications are enabled on this device.");
    } catch (pushError) {
      console.error("Device notification setup failed:", pushError);
      setError(pushError?.message || "Unable to enable device notifications right now.");
    }
  }, [syncTaskSettings, taskReminderSettings, updatePreference]);

  const runTestNotification = useCallback(async () => {
    setTesting(true);
    setNotice("");
    setError("");

    try {
      await showTestNotification();
      setNotice("Test notification sent to this device.");
    } catch (testError) {
      setError(testError?.message || "Unable to show a test notification.");
    } finally {
      setTesting(false);
    }
  }, []);

  const tasksDisabled = taskApplicable !== true;

  return (
    <div className="space-y-4">
      {notice ? (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-xs font-semibold text-emerald-100">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-xs font-semibold text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="rounded-[26px] border border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_42%),rgba(255,255,255,0.045)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white">Device notifications</p>
              <p className="mt-1 text-xs font-semibold text-cyan-100/70">{deviceStatus.title}</p>
              <p className="mt-1 text-xs leading-5 text-white/45">{deviceStatus.body}</p>
            </div>
          </div>
          {taskReminderSettings.pushConfigured ? (
            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-300" />
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={enableDeviceNotifications}
            disabled={!pushSupported || taskReminderSettings.pushEnabling || taskReminderSettings.permissionState === "denied"}
            className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-xs font-black text-cyan-50 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {taskReminderSettings.pushEnabling
              ? "Connecting..."
              : taskReminderSettings.pushConfigured
                ? "Refresh device connection"
                : "Enable device notifications"}
          </button>

          {pushSupported ? (
            <button
              type="button"
              onClick={runTestNotification}
              disabled={testing || getNotificationPermissionState() !== "granted"}
              className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {testing ? "Sending..." : "Test notification"}
            </button>
          ) : null}
        </div>
      </section>

      <section>
        <div className="mb-3 px-1">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">Notification categories</p>
        </div>
        <div className="space-y-3">
          <CategoryRow
            icon={WalletCards}
            title="Money alerts"
            description="Budget limits and important money risks"
            note="Default: On"
            checked={preferences.moneyAlerts}
            onChange={(checked) => changePreference("moneyAlerts", checked)}
          />
          <CategoryRow
            icon={Clock3}
            title="Daily money check-in"
            description="One reminder at your chosen time"
            note="Default: On"
            checked={preferences.dailyCheckIn}
            onChange={(checked) => changePreference("dailyCheckIn", checked)}
          />
          <CategoryRow
            icon={Goal}
            title="Goals & reviews"
            description="Savings progress and financial reviews"
            note="Default: On"
            checked={preferences.goalsAndReviews}
            onChange={(checked) => changePreference("goalsAndReviews", checked)}
          />
          <CategoryRow
            icon={BellRing}
            title="Tasks & coaching"
            description={
              tasksDisabled
                ? "Available when you have an active program or assignment"
                : "Assignments and active-program reminders"
            }
            note="Conditional"
            checked={preferences.tasksAndCoaching && !tasksDisabled}
            disabled={tasksDisabled}
            onChange={(checked) => changePreference("tasksAndCoaching", checked, { syncTask: true })}
          />
          <CategoryRow
            icon={Megaphone}
            title="Product updates"
            description="Major CLARA announcements only"
            note="Default: Off"
            checked={preferences.productUpdates}
            onChange={(checked) => changePreference("productUpdates", checked)}
          />
        </div>
      </section>

      <section className="rounded-[26px] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-violet-200">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Delivery preferences</p>
            <p className="mt-1 text-xs text-white/45">Control timing without changing critical account notices.</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <FieldLabel title="Delivery mode" description="In-app works without device permission." />
            <select
              value={preferences.deliveryMode}
              onChange={(event) => {
                const mode = event.target.value;
                changePreference("deliveryMode", mode, {
                  syncTask: true,
                  taskPatch: {
                    reminder_mode: mode === "device_and_in_app" ? "push_and_in_app" : "in_app_only",
                  },
                });
              }}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#07131f] px-3 text-sm font-semibold text-white outline-none"
            >
              <option value="in_app">In-app only</option>
              <option value="device_and_in_app">Device and in-app</option>
            </select>
          </label>

          <label className="block">
            <FieldLabel title="Reminder time" description="Used for your daily money check-in." />
            <input
              type="time"
              value={preferences.preferredTime}
              onChange={(event) => changePreference("preferredTime", event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#07131f] px-3 text-sm font-semibold text-white outline-none"
            />
          </label>

          <div className="rounded-2xl border border-white/10 bg-black/15 p-3.5">
            <div className="flex items-start justify-between gap-4">
              <FieldLabel title="Quiet hours" description="Noncritical reminders wait until quiet hours end." />
              <Switch
                checked={preferences.quietHoursEnabled}
                onCheckedChange={(checked) => changePreference("quietHoursEnabled", checked, { syncTask: true })}
                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-white/15"
              />
            </div>
            {preferences.quietHoursEnabled ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">Starts</span>
                  <input
                    type="time"
                    value={preferences.quietHoursStart}
                    onChange={(event) => changePreference("quietHoursStart", event.target.value, { syncTask: true })}
                    className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-[#07131f] px-3 text-xs font-semibold text-white outline-none"
                  />
                </label>
                <label>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">Ends</span>
                  <input
                    type="time"
                    value={preferences.quietHoursEnd}
                    onChange={(event) => changePreference("quietHoursEnd", event.target.value, { syncTask: true })}
                    className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-[#07131f] px-3 text-xs font-semibold text-white outline-none"
                  />
                </label>
              </div>
            ) : null}
          </div>

          <label className="block">
            <FieldLabel title="Snooze duration" description="Used when you choose Later on an active reminder." />
            <select
              value={String(preferences.snoozeMinutes)}
              onChange={(event) => changePreference("snoozeMinutes", Number(event.target.value), { syncTask: true, taskPatch: { snooze_default_minutes: Number(event.target.value) } })}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#07131f] px-3 text-sm font-semibold text-white outline-none"
            >
              {SNOOZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {!tasksDisabled ? (
        <details className="group rounded-[26px] border border-white/10 bg-white/[0.025] p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-2 py-2 text-sm font-bold text-white/75">
            Advanced task reminder schedule
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </summary>
          <div className="mt-3">
            <TaskReminderSettingsCard
              settings={taskReminderSettings.settings}
              onChange={taskReminderSettings.setSettings}
              loading={taskReminderSettings.loading || taskReminderSettings.saving}
              pushSupported={taskReminderSettings.pushSupported}
              permissionState={taskReminderSettings.permissionState}
              pushConfigured={taskReminderSettings.pushConfigured}
              pushEnabling={taskReminderSettings.pushEnabling}
              onEnablePush={enableDeviceNotifications}
            />
            <button
              type="button"
              disabled={!taskReminderSettings.dirty || taskReminderSettings.saving}
              onClick={async () => {
                try {
                  await taskReminderSettings.saveSettings();
                  setNotice("Task reminder schedule updated.");
                } catch {
                  setError("Unable to save the task reminder schedule.");
                }
              }}
              className="mt-3 w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-45"
            >
              {taskReminderSettings.saving ? "Saving..." : "Save task reminder schedule"}
            </button>
          </div>
        </details>
      ) : null}

      {!embedded ? (
        <p className="px-1 text-[11px] leading-5 text-white/35">
          Security, payment, account, and legally required notices stay available independently of these optional categories.
        </p>
      ) : null}
    </div>
  );
}
