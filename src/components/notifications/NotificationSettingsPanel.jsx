import { useCallback, useEffect, useRef, useState } from "react";
import {
  BellRing,
  ChevronDown,
  Clock3,
  Goal,
  Megaphone,
  ShieldCheck,
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

const SNOOZE_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 180, label: "3 hours" },
];

const EXPENSE_LOG_FREQUENCY_OPTIONS = [
  { value: 1, label: "Once a day" },
  { value: 2, label: "Twice a day" },
  { value: 3, label: "Three times a day" },
];

const EXPENSE_LOG_SNOOZE_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
];

const EXPENSE_LOG_TIME_FALLBACKS = ["12:30", "21:00", "09:00"];

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

function getExpenseLogFrequency(preferences) {
  const frequency = Number(preferences.expenseLogFrequency);
  return [1, 2, 3].includes(frequency) ? frequency : 2;
}

function getExpenseLogTimes(preferences, frequency) {
  const savedTimes = Array.isArray(preferences.expenseLogTimes) ? preferences.expenseLogTimes : [];
  return Array.from({ length: frequency }, (_, index) =>
    savedTimes[index] || EXPENSE_LOG_TIME_FALLBACKS[index] || EXPENSE_LOG_TIME_FALLBACKS[0]
  );
}

function ExpenseLogReminderCard({ preferences, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const frequency = getExpenseLogFrequency(preferences);
  const reminderTimes = getExpenseLogTimes(preferences, frequency);
  const statusSummary = preferences.dailyCheckIn
    ? `On • ${frequency} reminder${frequency === 1 ? "" : "s"}/day`
    : "Off";

  const updateReminderTime = (index, value) => {
    const nextTimes = [...reminderTimes];
    nextTimes[index] = value;
    onChange("expenseLogTimes", nextTimes);
  };

  return (
    <div className="overflow-hidden rounded-[22px] border border-emerald-300/15 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.11),transparent_40%),rgba(255,255,255,0.035)] shadow-[0_14px_34px_rgba(0,0,0,0.12)]">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition hover:bg-white/[0.035]"
      >
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/10 text-emerald-100">
            <Clock3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Expense log reminder</p>
            <p className="mt-1 text-xs leading-5 text-white/50">Remind me to record today’s spending</p>
            <p className={`mt-1 text-[11px] font-black ${preferences.dailyCheckIn ? "text-emerald-100/70" : "text-white/35"}`}>
              {statusSummary}
            </p>
          </div>
        </div>
        <ChevronDown className={`mt-2 h-4 w-4 shrink-0 text-white/45 transition ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-white/10 px-4 pb-4 pt-3">
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/15 p-3.5">
            <FieldLabel title="Status" description="Turn expense logging reminders on or off." />
            <Switch
              checked={preferences.dailyCheckIn}
              onCheckedChange={(checked) => onChange("dailyCheckIn", checked)}
              className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-white/15"
            />
          </div>

          <div>
            <FieldLabel title="How many reminders?" description="Choose how often CLARA should remind you in a day." />
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {EXPENSE_LOG_FREQUENCY_OPTIONS.map((option) => {
                const selected = frequency === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange("expenseLogFrequency", option.value)}
                    className={`rounded-2xl border px-3 py-2.5 text-xs font-black transition ${selected
                      ? "border-emerald-300/35 bg-emerald-300/15 text-emerald-50"
                      : "border-white/10 bg-white/[0.035] text-white/55 hover:bg-white/[0.06]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <FieldLabel title="Reminder times" description="Set when CLARA should remind you to log spending." />
            <div className="mt-2 grid grid-cols-1 gap-2">
              {reminderTimes.map((time, index) => (
                <label key={`${frequency}-${index}`} className="block rounded-2xl border border-white/10 bg-black/15 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                    Reminder {index + 1}
                  </span>
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => updateReminderTime(index, event.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-[#07131f] px-3 text-xs font-semibold text-white outline-none"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/15 p-3.5">
            <FieldLabel title="Stop after I log today" description="Once an expense is logged, CLARA stops reminding for that day." />
            <Switch
              checked={preferences.expenseLogStopAfterLogged}
              onCheckedChange={(checked) => onChange("expenseLogStopAfterLogged", checked)}
              className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-white/15"
            />
          </div>

          <label className="block">
            <FieldLabel title="Snooze" description="How long to wait when expense reminders are snoozed." />
            <select
              value={String(preferences.expenseLogSnoozeMinutes)}
              onChange={(event) => onChange("expenseLogSnoozeMinutes", Number(event.target.value))}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#07131f] px-3 text-sm font-semibold text-white outline-none"
            >
              {EXPENSE_LOG_SNOOZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
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
        reminders_enabled:
          taskApplicable === true
            ? Boolean(nextPreferences.tasksAndCoaching)
            : taskReminderSettings.settings.reminders_enabled,
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
      if (result.permission === "unsupported") {
        setError(result.reason || "Device notifications are unavailable here, but CLARA will still use in-app notifications.");
        return;
      }
      if (result.permission === "denied") {
        setError("Notification permission is blocked. Enable it in your browser or device settings.");
        return;
      }
      if (!result.configured) {
        setError(result.reason || "Permission was granted, but push delivery is not fully configured for this environment.");
        return;
      }

      const next = updatePreference("deliveryMode", "device_and_in_app");
      await syncTaskSettings(next, { reminder_mode: "push_and_in_app" });
      setNotice("Device notifications are enabled on this device.");
    } catch (pushError) {
      console.error("Device notification setup failed:", pushError);
      setError(pushError?.message || "Device notifications are unavailable here, but CLARA will still use in-app notifications.");
    }
  }, [syncTaskSettings, taskReminderSettings, updatePreference]);

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
          <ExpenseLogReminderCard
            preferences={preferences}
            onChange={changePreference}
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
            <FieldLabel title="Task snooze duration" description="Used when you choose Later on task reminders." />
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
