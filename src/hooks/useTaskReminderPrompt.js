import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import useTaskReminderSettings from "@/hooks/useTaskReminderSettings";
import {
  fetchTaskReminderState,
  getActiveReminderWindow,
  getNextReminderWindow,
  getReminderSnoozeChoices,
  isTaskReminderComplete,
  shouldSuppressVisibleReminder,
  shouldSurfaceTaskReminder,
  TASK_REMINDER_EVENT,
  upsertTaskReminderState,
} from "@/lib/task-reminders";

export default function useTaskReminderPrompt({ user, task }) {
  const [reminderState, setReminderState] = useState(null);
  const [stateLoading, setStateLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const reminderSettings = useTaskReminderSettings(user?.id || null);

  useEffect(() => {
    if (!task) return undefined;

    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [task?.id]);

  const reminderWindow = useMemo(
    () => getActiveReminderWindow(reminderSettings.settings, now),
    [now, reminderSettings.settings]
  );

  const nextReminderWindow = useMemo(
    () => getNextReminderWindow(reminderSettings.settings, now),
    [now, reminderSettings.settings]
  );

  const taskComplete = useMemo(() => isTaskReminderComplete(task), [task]);
  const reminderEligible = Boolean(
    user?.id &&
      task?.id &&
      !taskComplete &&
      reminderSettings.settings.reminders_enabled
  );

  const loadReminderState = useCallback(async () => {
    if (!reminderEligible || !reminderWindow?.windowKey) {
      setReminderState(null);
      setStateLoading(false);
      return null;
    }

    try {
      setStateLoading(true);
      const nextState = await fetchTaskReminderState({
        supabase,
        userId: user.id,
        taskId: task.id,
        reminderDate: reminderWindow.dateKey,
        windowKey: reminderWindow.windowKey,
      });
      setReminderState(nextState);
      return nextState;
    } catch (error) {
      console.error("Failed loading reminder state:", error);
      setReminderState(null);
      return null;
    } finally {
      setStateLoading(false);
    }
  }, [reminderEligible, reminderWindow?.dateKey, reminderWindow?.windowKey, task?.id, user?.id]);

  useEffect(() => {
    loadReminderState();
  }, [loadReminderState]);

  const persistReminderState = useCallback(
    async (patch) => {
      if (!user?.id || !task?.id || !reminderWindow?.windowKey) return null;

      try {
        setActionLoading(true);
        const nextState = await upsertTaskReminderState({
          supabase,
          userId: user.id,
          task,
          reminderWindow,
          patch,
        });
        setReminderState(nextState);
        return nextState;
      } finally {
        setActionLoading(false);
      }
    },
    [reminderWindow, task, user?.id]
  );

  const canSurface = useMemo(
    () =>
      shouldSurfaceTaskReminder({
        task,
        settings: reminderSettings.settings,
        reminderState,
        reminderWindow,
        now,
      }),
    [now, reminderSettings.settings, reminderState, reminderWindow, task]
  );

  const shouldHide = useMemo(
    () =>
      shouldSuppressVisibleReminder({
        task,
        settings: reminderSettings.settings,
        reminderState,
        reminderWindow,
        now,
      }),
    [now, reminderSettings.settings, reminderState, reminderWindow, task]
  );

  useEffect(() => {
    if (!canSurface || !reminderWindow || !user?.id || !task?.id) return;

    setVisible(true);

    if (!reminderState?.last_shown_at || reminderState?.last_action === "snoozed") {
      persistReminderState({
        last_shown_at: new Date().toISOString(),
        last_action: "shown",
        dismissed_for_day: false,
        dismissed_in_window: false,
      });
    }
  }, [
    canSurface,
    persistReminderState,
    reminderState?.last_action,
    reminderState?.last_shown_at,
    reminderWindow,
    task?.id,
    user?.id,
  ]);

  useEffect(() => {
    if (shouldHide) {
      setVisible(false);
    }
  }, [shouldHide]);

  useEffect(() => {
    const handleTaskComplete = (event) => {
      const detail = event?.detail || {};
      if (!task?.id) return;

      if (String(detail.taskId || "") === String(task.id)) {
        setVisible(false);
        setReminderState((current) => ({
          ...(current || {}),
          last_acknowledged_at: new Date().toISOString(),
          last_action: "completed",
        }));
      }
    };

    window.addEventListener(TASK_REMINDER_EVENT, handleTaskComplete);
    return () => window.removeEventListener(TASK_REMINDER_EVENT, handleTaskComplete);
  }, [task?.id]);

  const acknowledgeReminder = useCallback(async () => {
    const timestamp = new Date().toISOString();
    setVisible(false);
    await persistReminderState({
      last_acknowledged_at: timestamp,
      last_action: "opened",
      dismissed_for_day: false,
      dismissed_in_window: false,
    });
  }, [persistReminderState]);

  const dismissReminder = useCallback(async () => {
    setVisible(false);
    await persistReminderState({
      dismissed_for_day: reminderSettings.settings.reminder_frequency === "once_daily",
      dismissed_in_window: true,
      last_action: "dismissed",
    });
  }, [persistReminderState, reminderSettings.settings.reminder_frequency]);

  const snoozeReminder = useCallback(
    async (minutes = reminderSettings.settings.snooze_default_minutes) => {
      const snoozeUntil = new Date(Date.now() + minutes * 60_000).toISOString();
      setVisible(false);
      await persistReminderState({
        snoozed_until: snoozeUntil,
        last_action: "snoozed",
        dismissed_for_day: false,
        dismissed_in_window: false,
      });
    },
    [persistReminderState, reminderSettings.settings.snooze_default_minutes]
  );

  return {
    visible,
    task,
    reminderState,
    reminderWindow,
    nextReminderWindow,
    settings: reminderSettings.settings,
    settingsLoading: reminderSettings.loading,
    stateLoading,
    actionLoading,
    snoozeChoices: getReminderSnoozeChoices(
      reminderSettings.settings.snooze_default_minutes
    ),
    acknowledgeReminder,
    dismissReminder,
    snoozeReminder,
    reloadReminderState: loadReminderState,
  };
}
