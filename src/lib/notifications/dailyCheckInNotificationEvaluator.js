import { getEligibleDayKey } from "@/lib/challenge-schedule";
import { loadState } from "@/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInPersistence";
import {
  buildNotificationContract,
  isNotificationEventAllowed,
} from "@/lib/notifications/notificationRegistry";
import {
  createNotification,
  dismissNotification,
  getNotificationByDedupeKey,
} from "@/lib/notifications/localNotificationRepository";
import {
  getZonedDateParts,
  isInsideQuietHours,
} from "@/lib/notifications/notificationPreferences";

const DAILY_CHECK_IN_EVENT_TYPE = "daily_check_in_reminder";
const DEFAULT_DAILY_CHECK_IN_TIME = "09:00";

function timeToMinutes(value, fallback = DEFAULT_DAILY_CHECK_IN_TIME) {
  const match = String(value || fallback).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 9 * 60;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return 9 * 60;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return 9 * 60;
  return hour * 60 + minute;
}

function hasCompletedEligibleDay(userId, eligibleDay) {
  const state = loadState(userId, eligibleDay);
  return Boolean(
    state?.checkInEvents?.some((event) => event?.eligibleDay === eligibleDay) ||
      state?.completedDates?.includes(eligibleDay)
  );
}

async function retirePendingReminder(userId, dedupeKey) {
  const existing = await getNotificationByDedupeKey(userId, dedupeKey);
  if (!existing || existing.deliveredAt || existing.dismissedAt) return;
  await dismissNotification(userId, existing.id);
}

export async function evaluateDailyCheckInNotification({
  userId,
  preferences = {},
  now = new Date(),
} = {}) {
  if (!userId) return [];

  // Daily Awareness and the streak engine share the same authoritative eligible-day state.
  // If the user already entered the qualifying CLARA experience today, no reminder is needed.
  const eligibleDay = getEligibleDayKey(now);
  const dedupeKey = `${DAILY_CHECK_IN_EVENT_TYPE}:${eligibleDay}`;

  if (
    preferences.dailyCheckIn === false ||
    !isNotificationEventAllowed(DAILY_CHECK_IN_EVENT_TYPE, preferences)
  ) {
    await retirePendingReminder(userId, dedupeKey);
    return [];
  }

  if (hasCompletedEligibleDay(userId, eligibleDay)) {
    await retirePendingReminder(userId, dedupeKey);
    return [];
  }

  // Re-evaluation after quiet hours checks the authoritative awareness state again
  // before creating or delivering a reminder.
  if (isInsideQuietHours(preferences, now)) return [];

  const zoned = getZonedDateParts(preferences.timezone, now);
  if (zoned.minutes < timeToMinutes(preferences.preferredTime)) return [];

  const notification = buildNotificationContract({
    eventType: DAILY_CHECK_IN_EVENT_TYPE,
    dedupeKey,
    title: "Your Daily Awareness is waiting",
    body: "Open CLARA and check your financial position today to keep your awareness streak active.",
    userId,
    destination: "/dashboard",
    metadata: {
      dateKey: eligibleDay,
      eligibleDay,
      reminderKind: "daily_awareness",
    },
  });

  const result = await createNotification(notification);
  return result.created ? [result.notification] : [];
}
