import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Flag,
  MessageCircle,
  ShieldCheck,
  Target,
  WalletCards,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import useTaskReminderSettings from "@/hooks/useTaskReminderSettings";
import useNotificationPreferences from "@/hooks/useNotificationPreferences";
import { hasStoredNotificationPreferences } from "@/lib/notifications/notificationPreferences";

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

const PRIORITY_STYLES = Object.freeze({
  Critical: "border-[#a4384b]/45 bg-[#f32645]/8 text-[#ffc0cb]",
  Important: "border-[#9c8330]/45 bg-[#ffd84a]/8 text-[#ffe681]",
  Passive: "border-[#2f73bb]/45 bg-[#0867ff]/8 text-[#b8d8ff]/80",
});

function FieldLabel({ title, description }) {
  return (
    <div>
      <p className="text-sm font-bold text-white">{title}</p>
      {description ? (
        <p className="mt-1 text-xs leading-5 text-white/45">{description}</p>
      ) : null}
    </div>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
        PRIORITY_STYLES[priority] || PRIORITY_STYLES.Important
      }`}
    >
      {priority}
    </span>
  );
}

function NotificationFamilyCard({
  icon: Icon,
  title,
  description,
  priority = "Important",
  enabled = true,
  onToggle,
  locked = false,
  statusText = "",
  children = null,
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(children);

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#1d4b7b]/45 bg-[#06142a] shadow-[0_14px_34px_rgba(0,0,0,0.16)]">
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#2f73bb]/45 bg-[#0867ff]/9 text-[#b8d8ff]">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-white">{title}</p>
            <PriorityBadge priority={priority} />
          </div>
          <p className="mt-1 text-xs leading-5 text-white/50">{description}</p>
          {statusText ? (
            <p className="mt-1 text-[11px] font-bold text-white/35">{statusText}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 pt-1">
          {locked ? (
            <span className="rounded-full border border-[#9c8330]/40 bg-[#ffd84a]/7 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#ffe681]">
              Always on
            </span>
          ) : (
            <Switch
              checked={enabled}
              onCheckedChange={onToggle}
              aria-label={`${title} notifications`}
              className="data-[state=checked]:bg-[#0867ff] data-[state=unchecked]:bg-white/15"
            />
          )}

          {hasDetails ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              aria-label={`${expanded ? "Collapse" : "Expand"} ${title}`}
              aria-expanded={expanded}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white/45 transition hover:bg-[#0a203a] hover:text-white/80"
            >
              <ChevronDown
                className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          ) : null}
        </div>
      </div>

      {hasDetails && expanded ? (
        <div className="border-t border-[#1d4b7b]/45 px-4 pb-4 pt-3">{children}</div>
      ) : null}
    </div>
  );
}

function getExpenseLogFrequency(preferences) {
  const frequency = Number(preferences.expenseLogFrequency);
  return [1, 2, 3].includes(frequency) ? frequency : 2;
}

function getExpenseLogTimes(preferences, frequency) {
  const savedTimes = Array.isArray(preferences.expenseLogTimes)
    ? preferences.expenseLogTimes
    : [];
  return Array.from({ length: frequency }, (_, index) =>
    savedTimes[index] ||
    EXPENSE_LOG_TIME_FALLBACKS[index] ||
    EXPENSE_LOG_TIME_FALLBACKS[0]
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
  if (preferences.weeklyMoneyReview === false) return "Off";
  const dayValue = Number(preferences.weeklyMoneyReviewDay);
  const dayLabel =
    WEEKLY_REVIEW_DAY_OPTIONS.find((option) => option.value === dayValue)?.label ||
    "Sunday";
  return `On • ${dayLabel} ${formatReviewTimeLabel(
    preferences.weeklyMoneyReviewTime || "20:00"
  )}`;
}

function ExpenseLoggingDetails({ preferences, onChange }) {
  const frequency = getExpenseLogFrequency(preferences);
  const reminderTimes = getExpenseLogTimes(preferences, frequency);

  const updateReminderTime = (index, value) => {
    const nextTimes = [...reminderTimes];
    nextTimes[index] = value;
    onChange("expenseLogTimes", nextTimes);
  };

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel
          title="How many reminders?"
          description="Choose how often CLARA should remind you to log spending."
        />
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {EXPENSE_LOG_FREQUENCY_OPTIONS.map((option) => {
            const selected = frequency === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange("expenseLogFrequency", option.value)}
                className={`rounded-2xl border px-3 py-2.5 text-xs font-black transition ${
                  selected
                    ? "border-[#4f96ff]/60 bg-[#0867ff]/14 text-[#d7eaff]"
                    : "border-[#1d4b7b]/45 bg-[#07162b] text-white/55 hover:bg-[#0a203a]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <FieldLabel
          title="Reminder times"
          description="Set the times when CLARA should ask whether you spent anything."
        />
        <div className="mt-2 grid grid-cols-1 gap-2">
          {reminderTimes.map((time, index) => (
            <label
              key={`${frequency}-${index}`}
              className="block rounded-2xl border border-[#1d4b7b]/45 bg-[#040d1c] p-3"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                Reminder {index + 1}
              </span>
              <input
                type="time"
                value={time}
                onChange={(event) => updateReminderTime(index, event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-[#1d4b7b]/45 bg-[#040d1c] px-3 text-xs font-semibold text-white outline-none"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#1d4b7b]/45 bg-[#040d1c] p-3.5">
        <FieldLabel
          title="Stop after I log today"
          description="Once an expense is logged, CLARA stops expense reminders for that day."
        />
        <Switch
          checked={preferences.expenseLogStopAfterLogged}
          onCheckedChange={(checked) => onChange("expenseLogStopAfterLogged", checked)}
          className="data-[state=checked]:bg-[#0867ff] data-[state=unchecked]:bg-white/15"
        />
      </div>

      <label className="block">
        <FieldLabel
          title="Snooze"
          description="How long CLARA should wait after you snooze an expense reminder."
        />
        <select
          value={String(preferences.expenseLogSnoozeMinutes)}
          onChange={(event) =>
            onChange("expenseLogSnoozeMinutes", Number(event.target.value))
          }
          className="mt-2 h-11 w-full rounded-2xl border border-[#1d4b7b]/45 bg-[#040d1c] px-3 text-sm font-semibold text-white outline-none"
        >
          {EXPENSE_LOG_SNOOZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function WeeklyReviewDetails({ preferences, onChange }) {
  return (
    <div className="space-y-4">
      <label className="block">
        <FieldLabel
          title="Review day"
          description="Choose when CLARA should prepare your weekly money review."
        />
        <select
          value={String(preferences.weeklyMoneyReviewDay ?? 0)}
          onChange={(event) =>
            onChange("weeklyMoneyReviewDay", Number(event.target.value))
          }
          className="mt-2 h-11 w-full rounded-2xl border border-[#1d4b7b]/45 bg-[#040d1c] px-3 text-sm font-semibold text-white outline-none"
        >
          {WEEKLY_REVIEW_DAY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block rounded-2xl border border-[#1d4b7b]/45 bg-[#040d1c] p-3">
        <FieldLabel
          title="Review time"
          description="Set when CLARA should remind you to review your week."
        />
        <input
          type="time"
          value={preferences.weeklyMoneyReviewTime || "20:00"}
          onChange={(event) => onChange("weeklyMoneyReviewTime", event.target.value)}
          className="mt-2 h-10 w-full rounded-xl border border-[#1d4b7b]/45 bg-[#040d1c] px-3 text-xs font-semibold text-white outline-none"
        />
      </label>
    </div>
  );
}

function AccountUpdatesDetails({ preferences, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#2f73bb]/35 bg-[#0867ff]/7 p-3.5">
        <FieldLabel
          title="Security & account alerts"
          description="New-device login, password, payment, account-action, and required privacy notices."
        />
        <span className="rounded-full border border-[#9c8330]/40 bg-[#ffd84a]/7 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#ffe681]">
          Always on
        </span>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#1d4b7b]/45 bg-[#040d1c] p-3.5">
        <FieldLabel
          title="CLARA product updates"
          description="Major feature releases, maintenance notices, and important CLARA announcements."
        />
        <Switch
          checked={preferences.productUpdates}
          onCheckedChange={(checked) => onChange("productUpdates", checked)}
          className="data-[state=checked]:bg-[#0867ff] data-[state=unchecked]:bg-white/15"
        />
      </div>
    </div>
  );
}

function QuietHoursDetails({ preferences, onChange }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#1d4b7b]/45 bg-[#040d1c] p-3.5">
        <FieldLabel
          title="Quiet hours"
          description="Pause normal reminders during your sleeping or focus hours. Critical alerts may still appear."
        />
        <Switch
          checked={preferences.quietHoursEnabled}
          onCheckedChange={(checked) => onChange("quietHoursEnabled", checked, { syncTask: true })}
          className="data-[state=checked]:bg-[#0867ff] data-[state=unchecked]:bg-white/15"
        />
      </div>

      {preferences.quietHoursEnabled ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-2xl border border-[#1d4b7b]/45 bg-[#040d1c] p-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">Start</span>
            <input
              type="time"
              value={preferences.quietHoursStart || "22:00"}
              onChange={(event) =>
                onChange("quietHoursStart", event.target.value, { syncTask: true })
              }
              className="mt-1.5 h-10 w-full rounded-xl border border-[#1d4b7b]/45 bg-[#040d1c] px-3 text-xs font-semibold text-white outline-none"
            />
          </label>
          <label className="rounded-2xl border border-[#1d4b7b]/45 bg-[#040d1c] p-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">End</span>
            <input
              type="time"
              value={preferences.quietHoursEnd || "07:00"}
              onChange={(event) =>
                onChange("quietHoursEnd", event.target.value, { syncTask: true })
              }
              className="mt-1.5 h-10 w-full rounded-xl border border-[#1d4b7b]/45 bg-[#040d1c] px-3 text-xs font-semibold text-white outline-none"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

export default function NotificationSettingsPanel({ userId, embedded = false }) {
  const {
    userId: notificationOwnerId,
    preferences,
    updatePreference,
    setPreferences,
  } = useNotificationPreferences(userId);
  const taskReminderSettings = useTaskReminderSettings(notificationOwnerId);
  const hadStoredPreferencesOnMount = useRef(
    hasStoredNotificationPreferences(notificationOwnerId)
  );
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (taskReminderSettings.loading) return;
    if (hadStoredPreferencesOnMount.current) return;
    hadStoredPreferencesOnMount.current = true;

    if (taskReminderSettings.settings.reminders_enabled === false) {
      setPreferences((current) => ({ ...current, tasksAndCoaching: false }));
    }
  }, [
    setPreferences,
    taskReminderSettings.loading,
    taskReminderSettings.settings.reminders_enabled,
  ]);

  const syncTaskSettings = useCallback(
    async (nextPreferences, patch = {}) => {
      if (!notificationOwnerId) return;
      const nextTaskSettings = {
        ...taskReminderSettings.settings,
        ...patch,
        reminders_enabled: Boolean(nextPreferences.tasksAndCoaching),
        timezone: nextPreferences.timezone,
        quiet_hours_enabled: nextPreferences.quietHoursEnabled,
        quiet_hours_start: nextPreferences.quietHoursStart,
        quiet_hours_end: nextPreferences.quietHoursEnd,
      };
      await taskReminderSettings.saveSettings(nextTaskSettings);
    },
    [notificationOwnerId, taskReminderSettings]
  );

  const changePreferences = useCallback(
    async (patch, options = {}) => {
      setNotice("");
      setError("");
      const next = setPreferences((current) => ({ ...current, ...patch }));

      if (options.syncTask) {
        try {
          await syncTaskSettings(next, options.taskPatch || {});
        } catch (saveError) {
          console.error("Notification task settings sync failed:", saveError);
          setError(
            "Your notification choice was saved, but notification delivery could not be updated."
          );
        }
      }

      return next;
    },
    [setPreferences, syncTaskSettings]
  );

  const changePreference = useCallback(
    (key, value, options = {}) =>
      changePreferences({ [key]: value }, options),
    [changePreferences]
  );

  const enableDeviceNotifications = useCallback(async () => {
    setNotice("");
    setError("");

    try {
      const result = await taskReminderSettings.enablePush();
      if (result.permission === "unsupported") {
        setError(
          result.reason ||
            "Device notifications are unavailable here, but CLARA will still use in-app notifications."
        );
        return;
      }
      if (result.permission === "denied") {
        setError(
          "Notification permission is blocked. Enable it in your browser or device settings."
        );
        return;
      }
      if (!result.configured) {
        setError(
          result.reason ||
            "Permission was granted, but push delivery is not fully configured for this environment."
        );
        return;
      }

      const next = updatePreference("deliveryMode", "device_and_in_app");
      await syncTaskSettings(next, { reminder_mode: "push_and_in_app" });
      setNotice("Phone notifications are enabled for this device.");
    } catch (pushError) {
      console.error("Device notification setup failed:", pushError);
      setError(
        pushError?.message ||
          "Device notifications are unavailable here, but CLARA will still use in-app notifications."
      );
    }
  }, [syncTaskSettings, taskReminderSettings, updatePreference]);

  const useInAppOnly = useCallback(async () => {
    const next = updatePreference("deliveryMode", "in_app");
    try {
      await syncTaskSettings(next, { reminder_mode: "in_app_only" });
      setNotice("CLARA will use in-app notifications on this account.");
      setError("");
    } catch (saveError) {
      console.error("In-app delivery update failed:", saveError);
      setError("Your app preference was saved, but notification delivery could not be updated.");
    }
  }, [syncTaskSettings, updatePreference]);

  const coachingScheduleEnabled =
    preferences.tasksAndCoaching !== false &&
    preferences.scheduleAndCalendar !== false;

  const deliveryWantsDevice = preferences.deliveryMode === "device_and_in_app";
  const phoneDeliveryReady = Boolean(
    deliveryWantsDevice &&
      taskReminderSettings.pushSupported &&
      taskReminderSettings.permissionState === "granted" &&
      taskReminderSettings.pushConfigured
  );

  return (
    <div className="space-y-5">
      {notice ? (
        <div className="rounded-2xl border border-[#2d6dae]/45 bg-[#0867ff]/8 px-4 py-3 text-xs font-semibold text-[#c5e0ff]">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-[#a4384b]/45 bg-[#f32645]/8 px-4 py-3 text-xs font-semibold text-[#ffc0cb]">
          {error}
        </div>
      ) : null}

      <section className="rounded-[20px] border border-[#1d4b7b]/45 bg-[#06142a] px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-black text-white">Phone notifications</p>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-white/40">
              {phoneDeliveryReady ? "On" : "Off"}
            </span>
            <Switch
              checked={phoneDeliveryReady}
              disabled={taskReminderSettings.pushEnabling}
              onCheckedChange={(checked) => {
                if (checked) {
                  void enableDeviceNotifications();
                } else {
                  void useInAppOnly();
                }
              }}
              aria-label="Phone notifications"
              className="shrink-0 data-[state=checked]:bg-[#0867ff] data-[state=unchecked]:bg-white/15"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 px-1">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
            Notification families
          </p>
        </div>

        <div className="space-y-3">
          <NotificationFamilyCard
            icon={CheckCircle2}
            title="Daily Check-In"
            description="Remind me when today’s CLARA check-in is still incomplete."
            priority="Important"
            enabled={preferences.dailyCheckIn}
            onToggle={(checked) => changePreference("dailyCheckIn", checked)}
          />

          <NotificationFamilyCard
            icon={WalletCards}
            title="Expense Logging"
            description="Remind me to record today’s spending at the times I choose."
            priority="Important"
            enabled={preferences.expenseLogging}
            onToggle={(checked) => changePreference("expenseLogging", checked)}
            statusText={
              preferences.expenseLogging
                ? `${getExpenseLogFrequency(preferences)} reminder${
                    getExpenseLogFrequency(preferences) === 1 ? "" : "s"
                  }/day`
                : "Off"
            }
          >
            <ExpenseLoggingDetails preferences={preferences} onChange={changePreference} />
          </NotificationFamilyCard>

          <NotificationFamilyCard
            icon={CalendarDays}
            title="Weekly Money Review"
            description="Review your spending, leaks, progress, and next move once a week."
            priority="Important"
            enabled={preferences.weeklyMoneyReview}
            onToggle={(checked) => changePreference("weeklyMoneyReview", checked)}
            statusText={formatWeeklyReviewStatus(preferences)}
          >
            <WeeklyReviewDetails preferences={preferences} onChange={changePreference} />
          </NotificationFamilyCard>

          <NotificationFamilyCard
            icon={Bell}
            title="Budget & Money Alerts"
            description="Budget limits, low Money Left, unusual spending, and money-risk warnings."
            priority="Important"
            enabled={preferences.moneyAlerts}
            onToggle={(checked) => changePreference("moneyAlerts", checked)}
          />

          <NotificationFamilyCard
            icon={Target}
            title="Goals & Financial Progress"
            description="Savings goals, Emergency Fund milestones, and debt payoff progress."
            priority="Passive"
            enabled={preferences.goalsAndReviews}
            onToggle={(checked) => changePreference("goalsAndReviews", checked)}
          />

          <NotificationFamilyCard
            icon={WalletCards}
            title="Bills & Obligations"
            description="Upcoming bills, debt obligations, scheduled payments, and overdue reminders."
            priority="Critical"
            enabled={preferences.billsAndObligations}
            onToggle={(checked) => changePreference("billsAndObligations", checked)}
          />

          <NotificationFamilyCard
            icon={Flag}
            title="Streaks & 30-Day Challenge"
            description="Streak-at-risk warnings, Challenge actions, milestones, results, and achievements."
            priority="Critical"
            enabled={preferences.streaksAndChallenge}
            onToggle={(checked) => changePreference("streaksAndChallenge", checked)}
          />

          <NotificationFamilyCard
            icon={CalendarDays}
            title="Coaching & Schedule"
            description="Coaching sessions, CLARA tasks, saved schedule events, bills, and payday reminders."
            priority="Important"
            enabled={coachingScheduleEnabled}
            onToggle={(checked) =>
              changePreferences(
                {
                  tasksAndCoaching: checked,
                  scheduleAndCalendar: checked,
                },
                { syncTask: true }
              )
            }
          />

          <NotificationFamilyCard
            icon={MessageCircle}
            title="Message Notifications"
            description="Get notified when another user or CLARA Support sends you a new message."
            priority="Important"
            enabled={preferences.messageNotifications}
            onToggle={(checked) => changePreference("messageNotifications", checked)}
          />

          <NotificationFamilyCard
            icon={MessageCircle}
            title="Community & Accountability"
            description="Replies, mentions, Circle activity, and meaningful accountability interactions."
            priority="Passive"
            enabled={preferences.communityAndAccountability}
            onToggle={(checked) =>
              changePreference("communityAndAccountability", checked)
            }
          />

          <NotificationFamilyCard
            icon={ShieldCheck}
            title="Account & CLARA Updates"
            description="Security and account notices stay on; CLARA product communication is optional."
            priority="Critical"
            locked
            statusText={`Security always on • Product updates ${preferences.productUpdates ? "on" : "off"}`}
          >
            <AccountUpdatesDetails preferences={preferences} onChange={changePreference} />
          </NotificationFamilyCard>
        </div>
      </section>

      <section>
        <div className="mb-3 px-1">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
            Notification behavior
          </p>
        </div>
        <NotificationFamilyCard
          icon={ShieldCheck}
          title="Quiet Hours"
          description="Control when normal CLARA reminders should stay quiet."
          priority="Important"
          enabled={preferences.quietHoursEnabled}
          onToggle={(checked) =>
            changePreference("quietHoursEnabled", checked, { syncTask: true })
          }
          statusText={
            preferences.quietHoursEnabled
              ? `${formatReviewTimeLabel(preferences.quietHoursStart)} – ${formatReviewTimeLabel(
                  preferences.quietHoursEnd
                )}`
              : "Off"
          }
        >
          <QuietHoursDetails preferences={preferences} onChange={changePreference} />
        </NotificationFamilyCard>
      </section>

      {!embedded ? (
        <p className="px-1 text-[11px] leading-5 text-white/35">
          Security, payment, account-action, and legally required notices remain available even when optional CLARA updates are off.
        </p>
      ) : null}
    </div>
  );
}
