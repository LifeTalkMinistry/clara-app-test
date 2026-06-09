import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchTaskReminderSettings,
  fetchTaskReminderState,
  getActiveReminderWindow,
  shouldSurfaceTaskReminder,
  upsertTaskReminderSettings,
  upsertTaskReminderState,
} from "@/lib/task-reminders";
import {
  buildNotificationContract,
  isNotificationEventAllowed,
} from "@/lib/notifications/notificationRegistry";
import {
  createNotification,
  listNotifications,
  markNotificationActed,
  markNotificationDelivered,
  snoozeNotification,
  cleanupOldNotifications,
} from "@/lib/notifications/localNotificationRepository";
import {
  getZonedDateParts,
  isInsideQuietHours,
  readNotificationPreferences,
} from "@/lib/notifications/notificationPreferences";
import { evaluateFinancialNotifications } from "@/lib/notifications/financialNotificationEvaluator";
import {
  getNotificationPermissionState,
  showDeviceNotification,
} from "@/lib/push-notifications";

const DAILY_COMPLETION_PREFIX = "clara_daily_money_check_in_completed_";

function dailyCompletionKey(userId, dateKey) {
  return `${DAILY_COMPLETION_PREFIX}${userId}:${dateKey}`;
}

function isDailyCheckInCompleted(userId, dateKey) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(dailyCompletionKey(userId, dateKey)) === "true";
}

export function markDailyMoneyCheckInCompleted(userId, dateKey) {
  if (typeof window === "undefined" || !userId || !dateKey) return;
  window.localStorage.setItem(dailyCompletionKey(userId, dateKey), "true");
  window.dispatchEvent(
    new CustomEvent("clara:daily-money-check-in-completed", {
      detail: { userId, dateKey },
    })
  );
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
}

function shouldDelayForQuietHours(notification, preferences) {
  if (!isInsideQuietHours(preferences)) return false;
  return !["critical", "warning"].includes(notification?.severity);
}

function taskDeliveryPreferencesDiffer(settings, preferences) {
  return (
    settings.timezone !== preferences.timezone ||
    settings.quiet_hours_enabled !== preferences.quietHoursEnabled ||
    settings.quiet_hours_start !== preferences.quietHoursStart ||
    settings.quiet_hours_end !== preferences.quietHoursEnd
  );
}

export default function useClaraNotificationRuntime({
  userId,
  budgets = [],
  expenses = [],
  savingsGoals = [],
  activeTask = null,
  navigate,
} = {}) {
  const evaluatingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return undefined;

    let timer = null;

    const openDestination = (destination) => {
      if (!destination) return;
      if (typeof navigate === "function") navigate(destination);
    };

    const deliverStoredNotification = async (notification, preferences) => {
      if (!notification || notification.deliveredAt || notification.dismissedAt) return;
      if (notification.snoozedUntil && new Date(notification.snoozedUntil) > new Date()) return;
      if (shouldDelayForQuietHours(notification, preferences)) return;

      const isDaily = notification.eventType === "daily_money_check_in";
      const dateKey = notification.metadata?.dateKey || "";

      toast(notification.title, {
        description: notification.body,
        duration: 9000,
        action: notification.destination
          ? {
              label: isDaily ? "Check now" : "Open",
              onClick: () => {
                markNotificationActed(userId, notification.id).catch(() => {});
                if (isDaily && dateKey) markDailyMoneyCheckInCompleted(userId, dateKey);
                openDestination(notification.destination);
              },
            }
          : undefined,
      });

      if (
        preferences.deliveryMode === "device_and_in_app" &&
        getNotificationPermissionState() === "granted"
      ) {
        try {
          await showDeviceNotification({
            title: notification.title,
            body: notification.body,
            url: notification.destination || "/dashboard",
            tag: notification.dedupeKey,
            eventType: notification.eventType,
          });
        } catch (error) {
          console.warn("CLARA device notification delivery failed:", error);
        }
      }

      await markNotificationDelivered(userId, notification.id);
    };

    const evaluateDailyCheckIn = async (preferences) => {
      if (!preferences.dailyCheckIn) return;
      const zoned = getZonedDateParts(preferences.timezone);
      if (zoned.minutes < timeToMinutes(preferences.preferredTime)) return;
      if (isDailyCheckInCompleted(userId, zoned.dateKey)) return;

      const notification = buildNotificationContract({
        eventType: "daily_money_check_in",
        dedupeKey: `daily_money_check_in:${zoned.dateKey}`,
        title: "Your daily money check-in",
        body: "Take one minute to check what your money can safely handle today.",
        userId,
        destination: "/dashboard",
        metadata: { dateKey: zoned.dateKey },
      });
      await createNotification(notification);
    };

    const evaluateTaskReminder = async (preferences) => {
      if (!activeTask || !preferences.tasksAndCoaching) return;
      if (!isNotificationEventAllowed("task_still_incomplete", preferences)) return;

      let settings;
      try {
        settings = await fetchTaskReminderSettings({ supabase, userId });

        if (taskDeliveryPreferencesDiffer(settings, preferences)) {
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
        }
      } catch (error) {
        console.warn("CLARA task reminder settings could not be loaded:", error);
        return;
      }

      const reminderWindow = getActiveReminderWindow(settings, new Date());
      if (!reminderWindow) return;
      if (isInsideQuietHours(preferences)) return;

      let reminderState = null;
      try {
        reminderState = await fetchTaskReminderState({
          supabase,
          userId,
          taskId: activeTask.id,
          reminderDate: reminderWindow.dateKey,
          windowKey: reminderWindow.windowKey,
        });
      } catch (error) {
        console.warn("CLARA task reminder state could not be loaded:", error);
        return;
      }

      if (
        !shouldSurfaceTaskReminder({
          task: activeTask,
          settings,
          reminderState,
          reminderWindow,
          now: new Date(),
        })
      ) {
        return;
      }

      const eventType = activeTask.isToday ? "today_task_ready" : "task_still_incomplete";
      const dedupeKey = `${eventType}:${activeTask.id}:${reminderWindow.dateKey}:${reminderWindow.time.replace(":", "")}`;
      const result = await createNotification(
        buildNotificationContract({
          eventType,
          dedupeKey,
          title: activeTask.isToday ? "Today’s CLARA task is ready" : "Your CLARA task is still waiting",
          body: activeTask.title
            ? `${activeTask.title} is still incomplete. Open it when you are ready to continue.`
            : "Your active program task is still incomplete.",
          userId,
          destination: "/lifeos",
          metadata: {
            taskId: activeTask.id,
            taskDay: activeTask.day || activeTask.day_number || null,
            reminderWindowKey: reminderWindow.windowKey,
          },
        })
      );

      const snoozedUntil = result.notification.snoozedUntil
        ? new Date(result.notification.snoozedUntil)
        : null;
      const snoozeExpired = Boolean(
        snoozedUntil &&
        !Number.isNaN(snoozedUntil.getTime()) &&
        snoozedUntil <= new Date() &&
        !result.notification.dismissedAt &&
        !result.notification.actedAt
      );

      if (!result.created && !snoozeExpired) return;

      toast(result.notification.title, {
        description: result.notification.body,
        duration: 12000,
        action: {
          label: "Open task",
          onClick: () => {
            markNotificationActed(userId, result.notification.id).catch(() => {});
            upsertTaskReminderState({
              supabase,
              userId,
              task: activeTask,
              reminderWindow,
              patch: {
                last_acknowledged_at: new Date().toISOString(),
                last_action: "opened",
              },
            }).catch(() => {});
            openDestination("/lifeos");
          },
        },
        cancel: {
          label: "Later",
          onClick: () => {
            const snoozeMinutes = Number(settings.snooze_default_minutes || preferences.snoozeMinutes || 30);
            const nextSnoozedUntil = new Date(Date.now() + snoozeMinutes * 60_000).toISOString();
            snoozeNotification(userId, result.notification.id, snoozeMinutes).catch(() => {});
            upsertTaskReminderState({
              supabase,
              userId,
              task: activeTask,
              reminderWindow,
              patch: {
                snoozed_until: nextSnoozedUntil,
                last_action: "snoozed",
              },
            }).catch(() => {});
          },
        },
      });

      await Promise.all([
        markNotificationDelivered(userId, result.notification.id),
        upsertTaskReminderState({
          supabase,
          userId,
          task: activeTask,
          reminderWindow,
          patch: {
            last_shown_at: new Date().toISOString(),
            last_action: "shown",
          },
        }),
      ]);
    };

    const evaluate = async () => {
      if (evaluatingRef.current || !mountedRef.current) return;
      evaluatingRef.current = true;

      try {
        const preferences = readNotificationPreferences(userId);
        await evaluateFinancialNotifications({
          userId,
          preferences,
          budgets,
          expenses,
          savingsGoals,
        });
        await evaluateDailyCheckIn(preferences);
        await evaluateTaskReminder(preferences);

        const pending = await listNotifications(userId, {
          undeliveredOnly: true,
          limit: 12,
        });
        for (const notification of pending) {
          if (["today_task_ready", "task_still_incomplete"].includes(notification.eventType)) continue;
          await deliverStoredNotification(notification, preferences);
        }
        await cleanupOldNotifications(userId);
      } catch (error) {
        console.warn("CLARA notification evaluation failed:", error);
      } finally {
        evaluatingRef.current = false;
      }
    };

    const schedule = () => {
      clearInterval(timer);
      timer = window.setInterval(evaluate, 60_000);
    };

    evaluate();
    schedule();

    const eventNames = [
      "focus",
      "clara:finance-data-updated",
      "clara-finance-updated",
      "clara-local-finance-updated",
      "clara:notification-preferences-updated",
      "clara:daily-money-check-in-completed",
    ];
    eventNames.forEach((eventName) => window.addEventListener(eventName, evaluate));

    return () => {
      clearInterval(timer);
      eventNames.forEach((eventName) => window.removeEventListener(eventName, evaluate));
    };
  }, [activeTask, budgets, expenses, navigate, savingsGoals, userId]);
}
