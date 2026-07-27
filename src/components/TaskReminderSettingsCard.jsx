import { useState } from "react";
import { BellRing, Clock3, Smartphone, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  REMINDER_FREQUENCY_OPTIONS,
  REMINDER_MODE_OPTIONS,
  sanitizeReminderTimes,
} from "@/lib/task-reminders";
import {
  sendRealPushTestNotification,
  showTestDeviceNotification,
} from "@/lib/notifications/deviceNotifications";

const SNOOZE_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 180, label: "3 hours" },
];

function FieldLabel({ icon: Icon, title, description }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-300/85" />
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <p className="mt-1 text-xs leading-6 text-white/52">{description}</p>
    </div>
  );
}

export default function TaskReminderSettingsCard({
  settings,
  onChange,
  loading = false,
  pushSupported = false,
  permissionState = "default",
  pushConfigured = false,
  pushEnabling = false,
  localTestSending = false,
  realPushTestSending = false,
  onEnablePush,
}) {
  const [localTestBusy, setLocalTestBusy] = useState(false);
  const [realTestBusy, setRealTestBusy] = useState(false);
  const [deviceTestNotice, setDeviceTestNotice] = useState("");
  const [deviceTestError, setDeviceTestError] = useState("");

  const activeTimes = sanitizeReminderTimes(
    settings.preferred_times,
    settings.reminder_frequency
  );

  const expectedTimeInputs =
    settings.reminder_frequency === "once_daily"
      ? 1
      : settings.reminder_frequency === "twice_daily"
        ? 2
        : 3;

  const displayedTimes = Array.from({ length: expectedTimeInputs }, (_, index) => {
    return activeTimes[index] || "";
  });

  const updateTimes = (nextValue, index) => {
    const nextTimes = [...displayedTimes];
    nextTimes[index] = nextValue;
    onChange({
      ...settings,
      preferred_times: sanitizeReminderTimes(nextTimes, settings.reminder_frequency),
    });
  };

  const permissionLabel =
    permissionState === "granted"
      ? "Device permission granted"
      : permissionState === "denied"
        ? "Device permission denied"
        : permissionState === "unsupported"
          ? "Device push is unavailable here"
          : "Device permission not enabled";

  const permissionHelp =
    permissionState === "denied"
      ? "Android is blocking CLARA notifications. Open Android Settings → Apps → CLARA (or Chrome) → Notifications and allow them."
      : permissionState === "default"
        ? "Tap Enable phone notifications. Android should show an Allow notifications prompt."
        : permissionState === "granted" && !pushConfigured
          ? "Android permission is allowed, but this device still needs a Web Push subscription. Tap Enable phone notifications."
          : pushConfigured
            ? "This device is subscribed. Local test checks Android display; real push checks server-to-phone delivery."
            : "In-app reminders still work even when device push is unavailable.";

  const runLocalTest = async () => {
    setDeviceTestNotice("");
    setDeviceTestError("");
    setLocalTestBusy(true);

    try {
      const result = await showTestDeviceNotification();
      setDeviceTestNotice(
        `Local test created successfully${result?.permission ? ` • permission: ${result.permission}` : ""}. Check the Android notification shade now.`
      );
    } catch (error) {
      setDeviceTestError(
        error?.message ||
          "Local notification test failed before Android could display it."
      );
    } finally {
      setLocalTestBusy(false);
    }
  };

  const runRealPushTest = async () => {
    setDeviceTestNotice("");
    setDeviceTestError("");
    setRealTestBusy(true);

    try {
      const result = await sendRealPushTestNotification();
      const sent = Number(result?.sent || result?.nativeSent || 0);
      const failed = Number(result?.failed || 0);
      setDeviceTestNotice(
        sent > 0
          ? `CLARA server accepted the real push for ${sent} device${sent === 1 ? "" : "s"}. Check the Android notification shade or lock screen.`
          : `The real push test finished but no device accepted it${failed ? ` • failed: ${failed}` : ""}.`
      );
    } catch (error) {
      setDeviceTestError(
        error?.message || "Real server push test failed before delivery."
      );
    } finally {
      setRealTestBusy(false);
    }
  };

  const localBusy = localTestBusy || localTestSending;
  const realBusy = realTestBusy || realPushTestSending;

  return (
    <div className="rounded-[28px] border border-emerald-400/10 bg-[linear-gradient(180deg,rgba(5,17,31,1)_0%,rgba(6,18,29,0.94)_100%)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300/72">
              Task Reminders
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              Control how CLARA nudges you
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/58">
              Keep reminders intentional, mobile-friendly, and only active when your
              daily task still needs attention.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Status</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {settings.reminders_enabled ? "Active" : "Paused"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-start justify-between gap-4">
            <FieldLabel
              icon={BellRing}
              title="Enable task reminders"
              description="Turn reminders on only when you want CLARA to surface incomplete daily tasks."
            />
            <Switch
              checked={settings.reminders_enabled}
              disabled={loading}
              onCheckedChange={(checked) =>
                onChange({ ...settings, reminders_enabled: checked })
              }
              className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-white/15"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <FieldLabel
              icon={Zap}
              title="Reminder mode"
              description="Choose where reminders appear when today's task still needs action."
            />
            <Select
              value={settings.reminder_mode}
              onValueChange={(value) => onChange({ ...settings, reminder_mode: value })}
              disabled={loading}
            >
              <SelectTrigger className="mt-3 h-11 rounded-2xl border-white/10 bg-black/20 text-white">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#07131f] text-white">
                {REMINDER_MODE_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="focus:bg-white/10 focus:text-white"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <FieldLabel
              icon={Clock3}
              title="Reminder cadence"
              description="Set how many reminder windows CLARA should use during the day."
            />
            <Select
              value={settings.reminder_frequency}
              onValueChange={(value) =>
                onChange({
                  ...settings,
                  reminder_frequency: value,
                  preferred_times: sanitizeReminderTimes(settings.preferred_times, value),
                })
              }
              disabled={loading}
            >
              <SelectTrigger className="mt-3 h-11 rounded-2xl border-white/10 bg-black/20 text-white">
                <SelectValue placeholder="Select cadence" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#07131f] text-white">
                {REMINDER_FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="focus:bg-white/10 focus:text-white"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <FieldLabel
            icon={Clock3}
            title="Preferred reminder time"
            description="Pick the time windows when it is actually useful for CLARA to remind you."
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {displayedTimes.map((timeValue, index) => (
              <Input
                key={`reminder-time-${index + 1}`}
                type="time"
                value={timeValue}
                disabled={loading}
                onChange={(event) => updateTimes(event.target.value, index)}
                className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
              />
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <FieldLabel
              icon={Clock3}
              title="Default snooze"
              description="This becomes the first Later option in the in-app reminder."
            />
            <Select
              value={String(settings.snooze_default_minutes)}
              onValueChange={(value) =>
                onChange({ ...settings, snooze_default_minutes: Number(value) || 30 })
              }
              disabled={loading}
            >
              <SelectTrigger className="mt-3 h-11 rounded-2xl border-white/10 bg-black/20 text-white">
                <SelectValue placeholder="Select snooze time" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#07131f] text-white">
                {SNOOZE_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={String(option.value)}
                    className="focus:bg-white/10 focus:text-white"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-4">
              <FieldLabel
                icon={BellRing}
                title="Only notify when incomplete"
                description="Suppress reminders automatically once your task is already submitted or done."
              />
              <Switch
                checked={settings.only_notify_if_incomplete}
                disabled={loading}
                onCheckedChange={(checked) =>
                  onChange({ ...settings, only_notify_if_incomplete: checked })
                }
                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-white/15"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-start justify-between gap-4">
            <FieldLabel
              icon={Smartphone}
              title="Device push notifications"
              description="CLARA can show Android/iPhone system notifications outside the app when this device allows them."
            />
            <button
              type="button"
              onClick={() => {
                setDeviceTestNotice("");
                setDeviceTestError("");
                onEnablePush?.();
              }}
              disabled={!pushSupported || pushEnabling}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                !pushSupported || pushEnabling
                  ? "cursor-not-allowed border border-white/10 bg-white/5 text-white/35"
                  : "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
              }`}
            >
              {pushEnabling ? "Connecting..." : pushConfigured ? "Refresh Push" : "Enable phone notifications"}
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-semibold text-white">
              {pushConfigured ? "Push ready on this device" : permissionLabel}
            </p>
            <p className="mt-1 text-xs leading-6 text-white/52">
              {pushSupported ? permissionHelp : "In-app reminders still work even when device push is unavailable."}
            </p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={runLocalTest}
              disabled={localBusy}
              className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-xs font-black text-white/70 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {localBusy ? "Sending local test..." : "Send local device test"}
            </button>
            <button
              type="button"
              onClick={runRealPushTest}
              disabled={realBusy}
              className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-xs font-black text-cyan-50 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {realBusy ? "Sending real push..." : "Send real push test"}
            </button>
          </div>

          {deviceTestNotice ? (
            <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-xs font-semibold leading-5 text-emerald-100">
              {deviceTestNotice}
            </div>
          ) : null}

          {deviceTestError ? (
            <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3 text-xs font-semibold leading-5 text-rose-100">
              {deviceTestError}
            </div>
          ) : null}

          <div className="mt-3 grid gap-2 text-[11px] leading-5 text-white/45">
            <p className="rounded-2xl border border-white/10 bg-black/20 p-3">
              Local test = generated by this phone. It now asks for notification permission automatically when needed.
            </p>
            <p className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.06] p-3 text-cyan-50/60">
              Real push test = sent from CLARA’s server-side Web Push channel. The result or exact error now appears directly here instead of at the top of the Notifications page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
