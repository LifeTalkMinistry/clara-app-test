import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { getZonedDateParts } from "../src/lib/notifications/notificationPreferences.js";
import { isNotificationEventAllowed } from "../src/lib/notifications/notificationRegistry.js";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const runtimeSource = readSource("src/hooks/useClaraNotificationRuntime.js");
const scheduleSource = readSource("src/lib/notifications/scheduleNotificationEvaluator.js");
const dailyCheckInEvaluatorSource = readSource(
  "src/lib/notifications/dailyCheckInNotificationEvaluator.js"
);
const notificationPanelSource = readSource(
  "src/components/notifications/NotificationSettingsPanel.jsx"
);
const taskReminderSettingsSource = readSource("src/hooks/useTaskReminderSettings.js");
const nativePushSource = readSource("src/lib/notifications/nativePushNotifications.js");


test("getZonedDateParts exposes the coherent dateKey/minutes contract", () => {
  const instant = new Date("2026-08-15T15:30:00.000Z");
  const zoned = getZonedDateParts("Asia/Manila", instant);

  assert.equal(zoned.dateKey, "2026-08-15");
  assert.equal(zoned.year, 2026);
  assert.equal(zoned.month, 8);
  assert.equal(zoned.day, 15);
  assert.equal(zoned.hour, 23);
  assert.equal(zoned.minute, 30);
  assert.equal(zoned.minutes, 23 * 60 + 30);
  assert.equal(
    zoned.dateKey,
    `${zoned.year}-${String(zoned.month).padStart(2, "0")}-${String(zoned.day).padStart(2, "0")}`
  );
});


test("Daily Check-In and Expense Logging registry gates are independent", () => {
  assert.equal(
    isNotificationEventAllowed("daily_check_in_reminder", {
      dailyCheckIn: true,
      expenseLogging: false,
    }),
    true
  );
  assert.equal(
    isNotificationEventAllowed("daily_check_in_reminder", {
      dailyCheckIn: false,
      expenseLogging: true,
    }),
    false
  );
  assert.equal(
    isNotificationEventAllowed("daily_money_check_in", {
      dailyCheckIn: false,
      expenseLogging: true,
    }),
    true
  );
  assert.equal(
    isNotificationEventAllowed("daily_money_check_in", {
      dailyCheckIn: true,
      expenseLogging: false,
    }),
    false
  );
});


test("Expense Logging and Schedule evaluators consume shared zoned date/time fields", () => {
  assert.match(runtimeSource, /zoned\.dateKey/);
  assert.match(runtimeSource, /zoned\.minutes/);
  assert.match(scheduleSource, /zoned\.dateKey/);
  assert.match(scheduleSource, /zoned\.minutes/);
});


test("Daily Check-In producer uses the existing check-in authority and not the expense event", () => {
  assert.match(dailyCheckInEvaluatorSource, /dailyCheckInPersistence/);
  assert.match(dailyCheckInEvaluatorSource, /loadState\(userId, eligibleDay\)/);
  assert.match(dailyCheckInEvaluatorSource, /getEligibleDayKey\(now\)/);
  assert.match(dailyCheckInEvaluatorSource, /daily_check_in_reminder/);
  assert.match(dailyCheckInEvaluatorSource, /preferences\.dailyCheckIn === false/);
  assert.match(dailyCheckInEvaluatorSource, /retirePendingReminder/);
  assert.doesNotMatch(dailyCheckInEvaluatorSource, /daily_money_check_in/);
});


test("Expense Logging keeps its canonical preference and Android duplicate-delivery guard", () => {
  assert.match(runtimeSource, /preferences\.expenseLogging/);
  assert.match(runtimeSource, /dailyCheckIn:\s*preferences\.expenseLogging/);
  assert.match(runtimeSource, /eventType === "daily_money_check_in"/);
  assert.match(runtimeSource, /reminderKind === "expense_log"/);
});


test("phone delivery toggle reflects live capability, permission, and configuration", () => {
  assert.match(notificationPanelSource, /deliveryWantsDevice/);
  assert.match(notificationPanelSource, /taskReminderSettings\.pushSupported/);
  assert.match(notificationPanelSource, /taskReminderSettings\.permissionState === "granted"/);
  assert.match(notificationPanelSource, /taskReminderSettings\.pushConfigured/);
  assert.match(notificationPanelSource, /checked=\{pushDeliveryReady\}/);
  assert.match(notificationPanelSource, /aria-label="Push notifications"/);
});

test("device capability refreshes after returning from OS or browser settings", () => {
  assert.match(taskReminderSettingsSource, /window\.addEventListener\("focus"/);
  assert.match(
    taskReminderSettingsSource,
    /document\.addEventListener\("visibilitychange"/
  );
  assert.match(taskReminderSettingsSource, /refreshPushStatus\(\)/);
});


test("notification Settings exposes one clean On/Off phone delivery control", () => {
  assert.match(notificationPanelSource, /Push notifications/);
  assert.match(notificationPanelSource, /checked=\{pushDeliveryReady\}/);
  assert.match(notificationPanelSource, /aria-label="Push notifications"/);
  assert.doesNotMatch(notificationPanelSource, /TaskReminderSettingsCard/);
  assert.doesNotMatch(notificationPanelSource, /Save advanced task schedule/);
});

test("native Android push creates the same channel used by backend FCM payloads", () => {
  assert.match(nativePushSource, /ANDROID_NOTIFICATION_CHANNEL_ID = "clara_reminders"/);
  assert.match(nativePushSource, /PushNotifications\.createChannel/);
  assert.match(nativePushSource, /ensureAndroidNotificationChannel\(PushNotifications, environment\)/);
});


test("foreground native pushes become visible local notifications and remain tappable", () => {
  assert.match(nativePushSource, /pushNotificationReceived/);
  assert.match(nativePushSource, /showForegroundNativeNotification\(notification, environment\)/);
  assert.match(nativePushSource, /LocalNotifications\.schedule/);
  assert.match(nativePushSource, /localNotificationActionPerformed/);
  assert.match(nativePushSource, /safeRouteFromNotification\(event\?\.notification\?\.extra/);
});
