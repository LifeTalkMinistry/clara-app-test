import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  coerceTaskReminderSettings,
  DEFAULT_TASK_REMINDER_SETTINGS,
  fetchTaskReminderSettings,
  upsertTaskReminderSettings,
} from "@/lib/task-reminders";
import {
  enableDeviceNotifications,
  getDeviceNotificationEnvironment,
  getDeviceNotificationPermissionState,
  getExistingDeviceNotificationConnection,
} from "@/lib/notifications/deviceNotifications";

function getInitialPermissionState(environment) {
  if (!environment?.supportsAnyDevicePush) return "unsupported";
  if (environment.preferredChannel === "web_push" && typeof Notification !== "undefined") {
    return Notification.permission;
  }
  return "default";
}

export default function useTaskReminderSettings(userId) {
  const [settings, setSettings] = useState(DEFAULT_TASK_REMINDER_SETTINGS);
  const [initialSettings, setInitialSettings] = useState(DEFAULT_TASK_REMINDER_SETTINGS);
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [pushEnabling, setPushEnabling] = useState(false);
  const [notificationEnvironment, setNotificationEnvironment] = useState(getDeviceNotificationEnvironment());
  const [permissionState, setPermissionState] = useState(() =>
    getInitialPermissionState(getDeviceNotificationEnvironment())
  );
  const [pushConfigured, setPushConfigured] = useState(false);

  const pushSupported = useMemo(
    () => notificationEnvironment.supportsAnyDevicePush,
    [notificationEnvironment.supportsAnyDevicePush]
  );

  const refreshPushStatus = useCallback(async () => {
    const environment = getDeviceNotificationEnvironment();
    setNotificationEnvironment(environment);

    try {
      const permission = await getDeviceNotificationPermissionState();
      setPermissionState(permission);
    } catch (error) {
      console.error("Failed checking device notification permission:", error);
      setPermissionState(environment.supportsAnyDevicePush ? "default" : "unsupported");
    }

    if (!environment.supportsAnyDevicePush) {
      setPushConfigured(false);
      return;
    }

    try {
      const connection = await getExistingDeviceNotificationConnection({ userId });
      setPushConfigured(Boolean(connection));
    } catch (error) {
      console.error("Failed checking device notification connection:", error);
      setPushConfigured(false);
    }
  }, [userId]);

  const loadSettings = useCallback(async () => {
    if (!userId) {
      setSettings(DEFAULT_TASK_REMINDER_SETTINGS);
      setInitialSettings(DEFAULT_TASK_REMINDER_SETTINGS);
      setLoading(false);
      return DEFAULT_TASK_REMINDER_SETTINGS;
    }

    try {
      setLoading(true);
      const nextSettings = await fetchTaskReminderSettings({ supabase, userId });
      setSettings(nextSettings);
      setInitialSettings(nextSettings);
      return nextSettings;
    } catch (error) {
      console.error("Failed loading task reminder settings:", error);
      const fallback = coerceTaskReminderSettings();
      setSettings(fallback);
      setInitialSettings(fallback);
      return fallback;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    refreshPushStatus();
  }, [refreshPushStatus]);

  const saveSettings = useCallback(
    async (nextSettings = settings) => {
      if (!userId) return coerceTaskReminderSettings(nextSettings);

      try {
        setSaving(true);
        const savedSettings = await upsertTaskReminderSettings({
          supabase,
          userId,
          settings: nextSettings,
        });
        setSettings(savedSettings);
        setInitialSettings(savedSettings);
        return savedSettings;
      } finally {
        setSaving(false);
      }
    },
    [settings, userId]
  );

  const enablePush = useCallback(async () => {
    if (!userId) {
      throw new Error("Sign in to enable push notifications.");
    }

    try {
      setPushEnabling(true);
      const result = await enableDeviceNotifications({ userId });
      setPermissionState(result.permission);
      if (result.environment) setNotificationEnvironment(result.environment);
      await refreshPushStatus();
      return result;
    } finally {
      setPushEnabling(false);
    }
  }, [refreshPushStatus, userId]);

  const dirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(initialSettings);
  }, [initialSettings, settings]);

  return {
    settings,
    setSettings,
    initialSettings,
    loading,
    saving,
    dirty,
    saveSettings,
    reloadSettings: loadSettings,
    notificationEnvironment,
    pushSupported,
    permissionState,
    pushConfigured,
    pushEnabling,
    enablePush,
    refreshPushStatus,
  };
}
