const PH_TIME_ZONE = "Asia/Manila";
const PH_OFFSET_MINUTES = 8 * 60;

const pad = (value) => String(value).padStart(2, "0");

export function getPHParts(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const map = {};
  formatter.formatToParts(date).forEach((part) => {
    if (part.type !== "literal") map[part.type] = part.value;
  });

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function getTodayPHDateString(value = new Date()) {
  const parts = getPHParts(value);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function getPHMonthKey(value = new Date()) {
  const parts = getPHParts(value);
  return `${parts.year}-${pad(parts.month)}`;
}

export function phLocalPartsToUtcDate({
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
}) {
  const utcMillis =
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond) -
    PH_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMillis);
}

export function buildCreatedAtFromPHDate(dateValue, baseTimeValue = new Date()) {
  const base = getPHParts(baseTimeValue);
  const [year, month, day] = String(dateValue || getTodayPHDateString())
    .split("-")
    .map(Number);

  return phLocalPartsToUtcDate({
    year: year || base.year,
    month: month || base.month,
    day: day || base.day,
    hour: base.hour,
    minute: base.minute,
    second: base.second,
  }).toISOString();
}

export function monthKeyToPHRange(monthKey = getPHMonthKey()) {
  const [year, month] = String(monthKey).split("-").map(Number);
  const safeYear = year || getPHParts().year;
  const safeMonth = month || getPHParts().month;

  const start = phLocalPartsToUtcDate({
    year: safeYear,
    month: safeMonth,
    day: 1,
  });
  const end = phLocalPartsToUtcDate({
    year: safeMonth === 12 ? safeYear + 1 : safeYear,
    month: safeMonth === 12 ? 1 : safeMonth + 1,
    day: 1,
  });

  return { start: start.toISOString(), end: end.toISOString() };
}

export function parseLooseDateToPHDate(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw === "today") return getTodayPHDateString();
  if (raw === "tomorrow") {
    const now = getPHParts();
    const date = phLocalPartsToUtcDate({
      year: now.year,
      month: now.month,
      day: now.day + 1,
    });
    return getTodayPHDateString(date);
  }

  const monthMatch = raw.match(
    /(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)(?:\s+(\d{1,2}))?(?:,\s*(\d{4}))?/i
  );
  if (!monthMatch) return raw.match(/^\d{4}-\d{2}-\d{2}$/) ? raw : "";

  const monthNames = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const month = monthNames.findIndex((name) => monthMatch[1].startsWith(name)) + 1;
  const today = getPHParts();
  const year = Number(monthMatch[3]) || today.year;
  const day = Number(monthMatch[2]) || 1;
  return `${year}-${pad(month)}-${pad(day)}`;
}

