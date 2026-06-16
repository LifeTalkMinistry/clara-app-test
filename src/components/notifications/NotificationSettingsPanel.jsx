import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Switch } from "@/components/ui/switch";
import TaskReminderSettingsCard from "@/components/TaskReminderSettingsCard";
import useTaskReminderSettings from "@/hooks/useTaskReminderSettings";
import useNotificationPreferences from "@/hooks/useNotificationPreferences";
import {
  hasStoredNotificationPreferences,
} from "@/lib/notifications/notificationPreferences";

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

const WEEKLY_REVIEW_DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const EXPENSE_LOG_TIME_FALLBACKS = ["12:30", "21:00", "09:00"];

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

function formatReviewTimeLabel(value) {
  const match = String(value || "").match(/^(\d{2}):(\d{2})$/);
  if (!match) return "8:00 PM";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function formatWeeklyReviewStatus(preferences) {
  if (!preferences.weeklyMoneyReview) return "Off";
  const dayValue = Number(preferences.weeklyMoneyReviewDay);
  const dayLabel = WEEKLY_REVIEW_DAY_OPTIONS.find((option) => option.value === dayValue)?.label || "Sunday";
  return `On • ${dayLabel} ${formatReviewTimeLabel(preferences.weeklyMoneyReviewTime || "20:00")}`;
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

function WeeklyMoneyReviewCard({ preferences, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const enabled = preferences.weeklyMoneyReview !== false;

  return (
    <div className="overflow-hidden rounded-[22px] border border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_42%),rgba(255,255,255,0.035)] shadow-[0_14px_34px_rgba(0,0,0,0.12)]">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition hover:bg-white/[0.035]"
      >
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-100">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Weekly Money Review</p>
            <p className="mt-1 text-xs leading-5 text-white/50">Review your spending, leaks, progress, and next move.</p>
            <p className={`mt-1 text-[11px] font-black ${enabled ? "text-cyan-100/75" : "text-white/35"}`}>
              {formatWeeklyReviewStatus(preferences)}
            </p>
          </div>
        </div>
        <ChevronDown className={`mt-2 h-4 w-4 shrink-0 text-white/45 transition ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-white/10 px-4 pb-4 pt-3">
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/15 p-3.5">
            <FieldLabel title="Status" description="Turn weekly money review on or off." />
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => onChange("weeklyMoneyReview", checked)}
              className="data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-white/15"
            />
          </div>

          <label className="block">
            <FieldLabel title="Review day" description="Choose when CLARA should prepare your weekly money review." />
            <select
              value={String(preferences.weeklyMoneyReviewDay ?? 0)}
              onChange={(event) => onChange("weeklyMoneyReviewDay", Number(event.target.value))}
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#07131f] px-3 text-sm font-semibold text-white outline-none"
            >
              {WEEKLY_REVIEW_DAY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="block rounded-2xl border border-white/10 bg-black/15 p-3">
            <FieldLabel title="Review time" description="Set when CLARA should remind you to review your week." />
            <input
              type="time"
              value={preferences.weeklyMoneyReviewTime || "20:00"}
              onChange={(event) => onChange("weeklyMoneyReviewTime", event.target.value)}
              className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-[#07131f] px-3 text-xs font-semibold text-white outline-none"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function ScheduleCalendarReminderCard({ preferences, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const enabled = preferences.scheduleAndCalendar !== false;
  const statusSummary = enabled
    ? "On • Events, bills, and payday reminders"
    : "Off";

  return (
    <div className="overflow-hidden rounded-[22px] border border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_42%),rgba(255,255,255,0.035)] shadow-[0_14px_34px_rgba(0,0,0,0.12)]">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition hover:bg-white/[0.035]"
      >
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-100">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Schedule & Calendar reminder</p>
            <p className="mt-1 text-xs leading-5 text-white/50">Remind me about events that can affect my day or money</p>
            <p className={`mt-1 text-[11px] font-black ${enabled ? "text-cyan-100/75" : "text-white/35"}`}>
              {statusSummary}
            </p>
          </div>
        </div>
        <ChevronDown className={`mt-2 h-4 w-4 shrink-0 text-white/45 transition ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-white/10 px-4 pb-4 pt-3">
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/15 p-3.5">
            <FieldLabel title="Status" description="Turn CLARA schedule and calendar reminders on or off." />
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => onChange("scheduleAndCalendar", checked)}
              className="data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-white/15"
            />
          </div>

          <div>
            <FieldLabel title="What CLARA reminds you about" description="These reminders are created from your saved Schedule events." />
            <div className="mt-2 grid grid-cols-1 gap-2">
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <p className="text-xs font-black text-white/80">Upcoming tomorrow</p>
                <p className="mt-1 text-[11px] leading-5 text-white/45">A preparation reminder before a scheduled event happens.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <p className="text-xs font-black text-white/80">Schedule today</p>
                <p className="mt-1 text-[11px] leading-5 text-white/45">A same-day reminder for events that need your attention.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <p className="text-xs font-black text-white/80">Money-impact schedule</p>
                <p className="mt-1 text-[11px] leading-5 text-white/45">Bills, payday, payments, rent, salary, or amount-based events that can affect your spending.</p>
              </div>
            </div>
          </div>

          <p className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.06] px-3.5 py-3 text-[11px] font-semibold leading-5 text-cyan-50/60">
            CLARA avoids duplicate reminders for the same event and date, so one saved schedule will not keep creating repeated alerts.
          </p>
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
          <ExpenseLogReminderCard
            preferences={preferences}
            onChange={changePreference}
          />
          <WeeklyMoneyReviewCard
            preferences={preferences}
            onChange={changePreference}
          />
          <ScheduleCalendarReminderCard
            preferences={preferences}
            onChange={changePreference}
          />
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
