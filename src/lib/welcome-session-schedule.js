export const WELCOME_SESSION_FORM_URL = (
  import.meta.env.VITE_CLARA_WELCOME_SESSION_FORM_URL || ""
).trim();

const BOOKING_WINDOW_DAYS = 90;
const MINIMUM_LEAD_DAYS = 1;

const DAILY_TIME_SLOTS = [
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
];

function getFirstBookableDate(fromDate = new Date()) {
  const firstBookableDate = new Date(fromDate);
  firstBookableDate.setHours(12, 0, 0, 0);
  firstBookableDate.setDate(firstBookableDate.getDate() + MINIMUM_LEAD_DAYS);
  return firstBookableDate;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function buildWelcomeSessionSlots(fromDate = new Date()) {
  const firstBookableDate = getFirstBookableDate(fromDate);
  const slots = [];

  for (let dayOffset = 0; dayOffset < BOOKING_WINDOW_DAYS; dayOffset += 1) {
    const date = new Date(firstBookableDate);
    date.setDate(firstBookableDate.getDate() + dayOffset);

    // Sunday is Max's fixed day off. Monday through Saturday remain bookable.
    if (date.getDay() === 0) continue;

    DAILY_TIME_SLOTS.forEach((timeLabel, slotIndex) => {
      slots.push({
        id: `${toDateKey(date)}-${timeLabel.replace(/\W/g, "")}-${slotIndex}`,
        date,
        dateKey: toDateKey(date),
        monthKey: toMonthKey(date),
        dateLabel: new Intl.DateTimeFormat("en-PH", {
          month: "short",
          day: "numeric",
          weekday: "short",
        }).format(date),
        fullDateLabel: new Intl.DateTimeFormat("en-PH", {
          month: "long",
          day: "numeric",
          year: "numeric",
          weekday: "long",
        }).format(date),
        timeLabel,
        status: "available",
      });
    });
  }

  return slots;
}

// This is the number of 30-minute appointments available on each working day.
export const WELCOME_SESSION_AVAILABLE_SLOT_COUNT = DAILY_TIME_SLOTS.length;
