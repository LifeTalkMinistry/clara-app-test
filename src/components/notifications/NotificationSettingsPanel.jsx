import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ShieldCheck,
  Target,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import useTaskReminderSettings from "@/hooks/useTaskReminderSettings";
import useNotificationPreferences from "@/hooks/useNotificationPreferences";
import { hasStoredNotificationPreferences } from "@/lib/notifications/notificationPreferences";

const WEEKLY_REVIEW_DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

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

function NotificationFamilyCard({
  icon: Icon,
  title,
  description,
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
          <p className="text-sm font-black text-white">{title}</p>
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

function formatTimeLabel(value) {
  const match = String(value || "").match(/^(\d{2}):(\d{2})$/);
  if (!match) return "8:00 PM";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function formatWeeklyCrossCheckStatus(preferences) {
  if (preferences.weeklyMoneyReview === false) return "Off";
  const dayValue = Number(preferences.weeklyMoneyReviewDay);
  const dayLabel =
    WEEKLY_REVIEW_DAY_OPTIONS.find((option) => option.value === dayValue)?.label ||
    "Sunday";
  return `On • ${dayLabel} ${formatTimeLabel(
    preferences.weeklyMoneyReviewTime || "20:00"
  )}`;
}

function DailyAwarenessDetails({ preferences, onChange }) {
  return (
    <label className="block rounded-2xl border border-[#1d4b7b]/45 bg-[#040d1c] p-3">
      <FieldLabel
        title="Reminder time"
        description="Choose when CLARA should remind you if today’s Daily Awareness is still incomplete."
      />
      <input
        type="time"
        value={preferences.preferredTime || "09:00"}
        onChange={(event) => onChange("preferredTime", event.target.value)}
        className="mt-2 h-10 w-full rounded-xl border border-[#1d4b7b]/45 bg-[#040d1c] px-3 text-xs font-semibold text-white outline-none"
      />
    </label>
  );
}

function WeeklyCrossCheckDetails({ preferences, onChange }) {
  return (
    <div className="space-y-4">
      <label className="block">
        <FieldLabel
          title="Cross-Check day"
          description="Choose the day CLARA should remind you to complete your Weekly Cross-Check."
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
          title="Cross-Check time"
          description="Set when CLARA should remind you to review your actual money position for the week."
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

function AccountSecurityDetails({ preferences, onChange }) {
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
          description="Pause normal reminders during your sleeping or focus hours. Security and required account alerts may still appear."
        />
        <Switch
          checked={preferences.quietHoursEnabled}
          onCheckedChange={(checked) =>
            onChange("quietHoursEnabled", checked, { syncTask: true })
          }
          className="data-[state=checked]:bg-[#0867ff] data-[state=unchecked]:bg-white/15"
        />
      </div>

      {preferences.quietHoursEnabled ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-2xl border border-[#1d4b7b]/45 bg-[#040d1c] p-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
              Start
            </span>
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
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
              End
            </span>
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

function SectionLabel({ children }) {
  return (
    <div className="mb-3 px-1">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
        {children}
      </p>
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

  useEffect(() => {
    const patch = {};

    // These legacy families are no longer part of the V1 notification surface.
    // Retire their stored switches so hidden reminder runtimes cannot keep firing.
    if (preferences.expenseLogging !== false) patch.expenseLogging = false;
    if (preferences.moneyAlerts !== false) patch.moneyAlerts = false;
    if (preferences.billsAndObligations !== false) patch.billsAndObligations = false;
    if (preferences.messageNotifications !== false) patch.messageNotifications = false;
    if (preferences.communityAndAccountability !== false) {
      patch.communityAndAccountability = false;
    }

    // Daily Awareness now owns streak reminder preference instead of exposing
    // a second competing Streaks & Challenge notification family.
    const awarenessEnabled = preferences.dailyCheckIn !== false;
    if (preferences.streaksAndChallenge !== awarenessEnabled) {
      patch.streaksAndChallenge = awarenessEnabled;
    }

    if (Object.keys(patch).length > 0) {
      setPreferences((current) => ({ ...current, ...patch }));
    }
  }, [
    preferences.billsAndObligations,
    preferences.communityAndAccountability,
    preferences.dailyCheckIn,
    preferences.expenseLogging,
    preferences.messageNotifications,
    preferences.moneyAlerts,
    preferences.streaksAndChallenge,
    setPreferences,
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
            "Push notifications are unavailable here, but CLARA will still use in-app notifications."
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
      setNotice("Push notifications are enabled for this device.");
    } catch (pushError) {
      console.error("Device notification setup failed:", pushError);
      setError(
        pushError?.message ||
          "Push notifications are unavailable here, but CLARA will still use in-app notifications."
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
      setError(
        "Your app preference was saved, but notification delivery could not be updated."
      );
    }
  }, [syncTaskSettings, updatePreference]);

  const scheduleAndCommitmentsEnabled =
    preferences.tasksAndCoaching !== false &&
    preferences.scheduleAndCalendar !== false;

  const deliveryWantsDevice = preferences.deliveryMode === "device_and_in_app";
  const pushDeliveryReady = Boolean(
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
          <div>
            <p className="text-sm font-black text-white">Push Notifications</p>
            <p className="mt-1 text-xs leading-5 text-white/45">
              Allow CLARA reminders to reach this device outside the app.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-white/40">
              {pushDeliveryReady ? "On" : "Off"}
            </span>
            <Switch
              checked={pushDeliveryReady}
              disabled={taskReminderSettings.pushEnabling}
              onCheckedChange={(checked) => {
                if (checked) {
                  void enableDeviceNotifications();
                } else {
                  void useInAppOnly();
                }
              }}
              aria-label="Push notifications"
              className="shrink-0 data-[state=checked]:bg-[#0867ff] data-[state=unchecked]:bg-white/15"
            />
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>Accountability</SectionLabel>
        <div className="space-y-3">
          <NotificationFamilyCard
            icon={CheckCircle2}
            title="Daily Awareness"
            description="Remind me if I have not checked in with my financial position in CLARA today."
            enabled={preferences.dailyCheckIn}
            onToggle={(checked) =>
              changePreferences({
                dailyCheckIn: checked,
                streaksAndChallenge: checked,
              })
            }
            statusText={
              preferences.dailyCheckIn
                ? `Reminder • ${formatTimeLabel(preferences.preferredTime || "09:00")}`
                : "Off"
            }
          >
            <DailyAwarenessDetails
              preferences={preferences}
              onChange={changePreference}
            />
          </NotificationFamilyCard>

          <NotificationFamilyCard
            icon={CalendarDays}
            title="Weekly Cross-Check"
            description="Remind me to verify my actual money position and prepare for the coming week."
            enabled={preferences.weeklyMoneyReview}
            onToggle={(checked) => changePreference("weeklyMoneyReview", checked)}
            statusText={formatWeeklyCrossCheckStatus(preferences)}
          >
            <WeeklyCrossCheckDetails
              preferences={preferences}
              onChange={changePreference}
            />
          </NotificationFamilyCard>
        </div>
      </section>

      <section>
        <SectionLabel>Progress & Schedule</SectionLabel>
        <div className="space-y-3">
          <NotificationFamilyCard
            icon={Target}
            title="Goals & Milestones"
            description="Savings goal progress and meaningful financial milestones when available."
            enabled={preferences.goalsAndReviews}
            onToggle={(checked) => changePreference("goalsAndReviews", checked)}
          />

          <NotificationFamilyCard
            icon={CalendarDays}
            title="Schedule & Commitments"
            description="Saved schedule events, upcoming money commitments, CLARA tasks, and sessions."
            enabled={scheduleAndCommitmentsEnabled}
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
        </div>
      </section>

      <section>
        <SectionLabel>CLARA</SectionLabel>
        <NotificationFamilyCard
          icon={ShieldCheck}
          title="Account & Security"
          description="Security and required account notices stay on. Product communication is optional."
          locked
          statusText={`Security always on • Product updates ${
            preferences.productUpdates ? "on" : "off"
          }`}
        >
          <AccountSecurityDetails
            preferences={preferences}
            onChange={changePreference}
          />
        </NotificationFamilyCard>
      </section>

      <section>
        <SectionLabel>Notification Behavior</SectionLabel>
        <NotificationFamilyCard
          icon={ShieldCheck}
          title="Quiet Hours"
          description="Choose when normal CLARA reminders should stay quiet."
          enabled={preferences.quietHoursEnabled}
          onToggle={(checked) =>
            changePreference("quietHoursEnabled", checked, { syncTask: true })
          }
          statusText={
            preferences.quietHoursEnabled
              ? `${formatTimeLabel(preferences.quietHoursStart)} – ${formatTimeLabel(
                  preferences.quietHoursEnd
                )}`
              : "Off"
          }
        >
          <QuietHoursDetails
            preferences={preferences}
            onChange={changePreference}
          />
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
