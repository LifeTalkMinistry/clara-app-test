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
  hasStoredNotificationPreferences,
  isInsideQuietHours,
  readNotificationPreferences,
} from "@/lib/notifications/notificationPreferences";
import { evaluateFinancialNotifications } from "@/lib/notifications/financialNotificationEvaluator";
import {
  getNotificationPermissionState,
  showDeviceNotification,
} from "@/lib/push-notifications";

const DAILY_COMPLETION_PREFIX = "clara_daily_money_check_in_completed_";
const EVALUATION_COOLDOWN_MS = 10_000;
const FINANCE_EVENT_DEBOUNCE_MS = 750;
const CLEANUP_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const CLEANUP_STORAGE_PREFIX = "clara_notifications_cleanup_last_run_";

function dailyCompletionKey(userId, dateKey) {
  return `${DAILY_COMPLETION_PREFIX}${userId}:${dateKey}`;
}

function isDailyCheckInCompleted(userId, dateKey) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(dailyCompletionKey(userId, dateKey)) === "true";
}

function isDocumentVisible() {
  if (typeof document === "undefined") return true;
  return document.visibilityState !== "hidden" && document.hidden !== true;
}

function cleanupStorageKey(userId) {
  return `${CLEANUP_STORAGE_PREFIX}${userId}`;
}

function readCleanupTimestamp(userId) {
  if (typeof window === "undefined" || !userId) return 0;

  try {
    const stored = window.localStorage.getItem(cleanupStorageKey(userId));
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeCleanupTimestamp(userId, timestamp) {
  if (typeof window === "undefined" || !userId) return;

  try {
    window.localStorage.setItem(cleanupStorageKey(userId), String(timestamp));
  } catch {
    // Best effort only. Cleanup throttling should never break notifications.
  }
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

function taskDeliveryPreferencesDiffer(settings, preferences, syncEnabledState) {
  return (
    (syncEnabledState && settings.reminders_enabled !== preferences.tasksAndCoaching) ||
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
  const evaluateTimeoutRef = useRef(null);
  const lastEvaluationAtRef = useRef(0);
  const lastCleanupAtRef = useRef(0);
  const latestDataRef = useRef({ budgets, expenses, savingsGoals, activeTask, navigate });

  useEffect(() => {
    latestDataRef.current = { budgets, expenses, savingsGoals, activeTask, navigate };
  }, [activeTask, budgets, expenses, navigate, savingsGoals]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return undefined;

    lastEvaluationAtRef.current = 0;
    lastCleanupAtRef.current = readCleanupTimestamp(userId);

    const clearPendingEvaluation = () => {
      if (evaluateTimeoutRef.current !== null) {
        window.clearTimeout(evaluateTimeoutRef.current);
        evaluateTimeoutRef.current = null;
      }
    };

    const openDestination = (destination) => {
      if (!destination) return;
      const latestNavigate = latestDataRef.current.navigate;
      if (typeof latestNavigate === "function") latestNavigate(destination);
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
      const task = latestDataRef.current.activeTask;
      if (!task) return;

      const syncEnabledState = hasStoredNotificationPreferences(userId);
      let settings;
      try {
        settings = await fetchTaskReminderSettings({ supabase, userId });

        if (taskDeliveryPreferencesDiffer(settings, preferences, syncEnabledState)) {
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
        }
      } catch (error) {
        console.warn("CLARA task reminder settings could not be loaded:", error);
        return;
      }

      if (!preferences.tasksAndCoaching) return;
      if (!isNotificationEventAllowed("task_still_incomplete", preferences)) return;

      const reminderWindow = getActiveReminderWindow(settings, new Date());
      if (!reminderWindow) return;
      if (isInsideQuietHours(preferences)) return;

      let reminderState = null;
      try {
        reminderState = await fetchTaskReminderState({
          supabase,
          userId,
          taskId: task.id,
          reminderDate: reminderWindow.dateKey,
          windowKey: reminderWindow.windowKey,
        });
      } catch (error) {
        console.warn("CLARA task reminder state could not be loaded:", error);
        return;
      }

      if (
        !shouldSurfaceTaskReminder({
          task,
          settings,
          reminderState,
          reminderWindow,
          now: new Date(),
        })
      ) {
        return;
      }

      const eventType = task.isToday ? "today_task_ready" : "task_still_incomplete";
      const dedupeKey = `${eventType}:${task.id}:${reminderWindow.dateKey}:${reminderWindow.time.replace(":", "")}`;
      const result = await createNotification(
        buildNotificationContract({
          eventType,
          dedupeKey,
          title: task.isToday ? "Today’s CLARA task is ready" : "Your CLARA task is still waiting",
          body: task.title
            ? `${task.title} is still incomplete. Open it when you are ready to continue.`
            : "Your active program task is still incomplete.",
          userId,
          destination: "/lifeos",
          metadata: {
            taskId: task.id,
            taskDay: task.day || task.day_number || null,
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
              task,
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
              task,
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
          task,
          reminderWindow,
          patch: {
            last_shown_at: new Date().toISOString(),
            last_action: "shown",
          },
        }),
      ]);
    };

    const maybeCleanupOldNotifications = async () => {
      const now = Date.now();
      const lastCleanupAt = lastCleanupAtRef.current || readCleanupTimestamp(userId);
      if (now - lastCleanupAt < CLEANUP_COOLDOWN_MS) return;

      await cleanupOldNotifications(userId);
      lastCleanupAtRef.current = now;
      writeCleanupTimestamp(userId, now);
    };

    const isRuntimeActive = () => mountedRef.current && isDocumentVisible();

    const evaluate = async ({ reason = "manual", includeCleanup = false } = {}) => {
      if (!isRuntimeActive()) return;
      if (evaluatingRef.current) return;

      evaluatingRef.current = true;
      lastEvaluationAtRef.current = Date.now();

      try {
        const preferences = readNotificationPreferences(userId);
        const { budgets: latestBudgets, expenses: latestExpenses, savingsGoals: latestSavingsGoals } =
          latestDataRef.current;

        if (!isRuntimeActive()) return;
        await evaluateFinancialNotifications({
          userId,
          preferences,
          budgets: latestBudgets,
          expenses: latestExpenses,
          savingsGoals: latestSavingsGoals,
        });

        if (!isRuntimeActive()) return;
        await evaluateDailyCheckIn(preferences);

        if (!isRuntimeActive()) return;
        await evaluateTaskReminder(preferences);

        if (!isRuntimeActive()) return;
        const pending = await listNotifications(userId, {
          undeliveredOnly: true,
          limit: 12,
        });
        for (const notification of pending) {
          if (!isRuntimeActive()) return;
          if (["today_task_ready", "task_still_incomplete"].includes(notification.eventType)) continue;
          await deliverStoredNotification(notification, preferences);
        }

        if (includeCleanup && isRuntimeActive()) {
          await maybeCleanupOldNotifications();
        }
      } catch (error) {
        console.warn(`CLARA notification evaluation failed (${reason}):`, error);
      } finally {
        evaluatingRef.current = false;
      }
    };

    const scheduleEvaluation = (
      reason,
      { delay = 0, force = false, includeCleanup = false } = {}
    ) => {
      if (!isRuntimeActive()) {
        clearPendingEvaluation();
        return;
      }

      clearPendingEvaluation();

      const now = Date.now();
      const elapsed = now - lastEvaluationAtRef.current;
      const cooldownRemaining = force ? 0 : Math.max(0, EVALUATION_COOLDOWN_MS - elapsed);
      const waitMs = Math.max(delay, cooldownRemaining);

      evaluateTimeoutRef.current = window.setTimeout(() => {
        evaluateTimeoutRef.current = null;
        evaluate({ reason, includeCleanup });
      }, waitMs);
    };

    const handleFocus = () => {
      scheduleEvaluation("focus", { delay: 250 });
    };

    const handleFinanceUpdate = () => {
      scheduleEvaluation("finance", { delay: FINANCE_EVENT_DEBOUNCE_MS });
    };

    const handlePreferencesUpdate = (event) => {
      if (event?.detail?.userId && event.detail.userId !== userId) return;
      scheduleEvaluation("preferences", { delay: 250, force: true });
    };

    const handleDailyCheckInCompleted = (event) => {
      if (event?.detail?.userId && event.detail.userId !== userId) return;
      scheduleEvaluation("daily-completed", { delay: 250, force: true });
    };

    const handleVisibilityChange = () => {
      if (isDocumentVisible()) {
        scheduleEvaluation("visible", { delay: 250, force: true, includeCleanup: true });
      } else {
        clearPendingEvaluation();
      }
    };

    scheduleEvaluation("mount", { delay: 500, force: true, includeCleanup: true });

    const financeEventNames = [
      "clara:finance-data-updated",
      "clara-finance-updated",
      "clara-local-finance-updated",
    ];

    window.addEventListener("focus", handleFocus);
    financeEventNames.forEach((eventName) => window.addEventListener(eventName, handleFinanceUpdate));
    window.addEventListener("clara:notification-preferences-updated", handlePreferencesUpdate);
    window.addEventListener("clara:daily-money-check-in-completed", handleDailyCheckInCompleted);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      clearPendingEvaluation();
      window.removeEventListener("focus", handleFocus);
      financeEventNames.forEach((eventName) => window.removeEventListener(eventName, handleFinanceUpdate));
      window.removeEventListener("clara:notification-preferences-updated", handlePreferencesUpdate);
      window.removeEventListener("clara:daily-money-check-in-completed", handleDailyCheckInCompleted);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [userId]);
}