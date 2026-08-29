export const CLARA_FINANCIAL_TIME_ZONE = "Asia/Manila";

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function validDateParts(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

export function normalizeFinancialDateKey(value = "") {
  const match = String(value ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!validDateParts(year, month, day)) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function financialDateKey(value = new Date()) {
  if (typeof value === "string" && DATE_KEY_RE.test(value.trim())) {
    return normalizeFinancialDateKey(value);
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CLARA_FINANCIAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

export function addFinancialDays(dateKey, days = 0) {
  const normalized = normalizeFinancialDateKey(dateKey);
  if (!normalized) return "";
  const [year, month, day] = normalized.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + Number(days || 0)));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

export function compareFinancialDateKeys(left, right) {
  return normalizeFinancialDateKey(left).localeCompare(normalizeFinancialDateKey(right));
}

export function financialWeekdayIndex(dateKey) {
  const normalized = normalizeFinancialDateKey(dateKey);
  if (!normalized) return -1;
  const [year, month, day] = normalized.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function enumerateFinancialDates(startInclusive, endExclusive) {
  const start = normalizeFinancialDateKey(startInclusive);
  const end = normalizeFinancialDateKey(endExclusive);
  if (!start || !end || start >= end) return [];
  const result = [];
  for (let cursor = start; cursor < end; cursor = addFinancialDays(cursor, 1)) {
    result.push(cursor);
  }
  return result;
}
