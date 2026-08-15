import { getEligibleDayKey } from "@/lib/challenge-schedule";
import { loadState } from "@/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInPersistence";
import {
  buildNotificationContract,
  isNotificationEventAllowed,
} from "@/lib/notifications/notificationRegistry";
import { createNotification } from "@/lib/notifications/localNotificationRepository";
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

export async function evaluateDailyCheckInNotification({
  userId,
  preferences = {},
  now = new Date(),
} = {}) {
  if (!userId) return [];
  if (preferences.dailyCheckIn === false) return [];
  if (!isNotificationEventAllowed(DAILY_CHECK_IN_EVENT_TYPE, preferences)) return [];

  // Do not create a reminder while quiet hours are active. Re-evaluation after
  // quiet hours will first re-check the authoritative check-in state, which
  // prevents a stale reminder from surfacing after the user already checked in.
  if (isInsideQuietHours(preferences, now)) return [];

  const zoned = getZonedDateParts(preferences.timezone, now);
  if (zoned.minutes < timeToMinutes(preferences.preferredTime)) return [];

  // The Daily Money Tip / streak engine owns what counts as today's check-in.
  // Its eligible-day key includes the existing challenge day-boundary policy.
  const eligibleDay = getEligibleDayKey(now);
  if (hasCompletedEligibleDay(userId, eligibleDay)) return [];

  const notification = buildNotificationContract({
    eventType: DAILY_CHECK_IN_EVENT_TYPE,
    dedupeKey: `${DAILY_CHECK_IN_EVENT_TYPE}:${eligibleDay}`,
    title: "Today’s CLARA check-in is waiting",
    body: "Tap today’s Daily Money Tip to complete your check-in and keep your progress moving.",
    userId,
    destination: "/dashboard",
    metadata: {
      dateKey: eligibleDay,
      eligibleDay,
      reminderKind: "daily_check_in",
    },
  });

  const result = await createNotification(notification);
  return result.created ? [result.notification] : [];
}
