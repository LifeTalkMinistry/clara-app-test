export const WELCOME_SESSION_FORM_URL = (
  import.meta.env.VITE_CLARA_WELCOME_SESSION_FORM_URL || ""
).trim();

const SLOT_PATTERN = [
  { weekOffset: 0, timeLabel: "10:00 AM", status: "occupied" },
  { weekOffset: 0, timeLabel: "10:30 AM", status: "available" },
  { weekOffset: 1, timeLabel: "10:00 AM", status: "available" },
  { weekOffset: 1, timeLabel: "10:30 AM", status: "occupied" },
  { weekOffset: 2, timeLabel: "10:00 AM", status: "available" },
];

function getNextSaturday(fromDate = new Date()) {
  const nextSaturday = new Date(fromDate);
  nextSaturday.setHours(12, 0, 0, 0);
  const day = nextSaturday.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  nextSaturday.setDate(nextSaturday.getDate() + daysUntilSaturday);
  return nextSaturday;
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
  const firstSaturday = getNextSaturday(fromDate);

  return SLOT_PATTERN.map((slot, index) => {
    const date = new Date(firstSaturday);
    date.setDate(firstSaturday.getDate() + slot.weekOffset * 7);

    return {
      ...slot,
      id: `${toDateKey(date)}-${slot.timeLabel.replace(/\W/g, "")}-${index}`,
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
    };
  });
}

export const WELCOME_SESSION_AVAILABLE_SLOT_COUNT = SLOT_PATTERN.filter(
  (slot) => slot.status === "available",
).length;
