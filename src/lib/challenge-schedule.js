const MANILA_TIME_ZONE = "Asia/Manila";
const UNLOCK_HOUR = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

function partsFor(date = new Date(), timeZone = MANILA_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
}

export function getChallengeTimeZone() {
  return MANILA_TIME_ZONE;
}

export function getEligibleDayBoundaryHour() {
  return UNLOCK_HOUR;
}

export function getLocalDateKey(date = new Date(), timeZone = MANILA_TIME_ZONE) {
  const parts = partsFor(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getEligibleDayKey(date = new Date()) {
  const parts = partsFor(date, MANILA_TIME_ZONE);
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  return Number(parts.hour || 0) < UNLOCK_HOUR ? addLocalDays(dateKey, -1) : dateKey;
}

export function isValidDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function dateKeyToUtcNoon(dateKey) {
  if (!isValidDateKey(dateKey)) return Number.NaN;
  const [year, month, day] = String(dateKey).split("-").map(Number);
  return Date.UTC(year, month - 1, day, 12, 0, 0, 0);
}

export function addLocalDays(dateKey, days) {
  const base = dateKeyToUtcNoon(dateKey);
  if (!Number.isFinite(base)) return null;
  const next = new Date(base + Number(days || 0) * DAY_MS);
  return next.toISOString().slice(0, 10);
}

export function compareDateKeys(left, right) {
  const leftTime = dateKeyToUtcNoon(left);
  const rightTime = dateKeyToUtcNoon(right);
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return Number.NaN;
  return leftTime - rightTime;
}

export function daysBetweenDateKeys(startDateKey, endDateKey) {
  const diff = compareDateKeys(startDateKey, endDateKey);
  if (!Number.isFinite(diff)) return 0;
  return Math.floor(diff / DAY_MS);
}

export function getChallengeDayUnlockDate(startDateKey, dayNumber) {
  return addLocalDays(startDateKey, Math.max(0, Number(dayNumber || 1) - 1));
}

export function getChallengeDayUnlockLabel(startDateKey, dayNumber) {
  const dateKey = getChallengeDayUnlockDate(startDateKey, dayNumber);
  return `${dateKey} at 6:00 AM`;
}

export function getCurrentChallengeDay(startDateKey, now = new Date()) {
  if (!startDateKey) return 0;
  const effectiveDateKey = getEligibleDayKey(now);
  const diff = daysBetweenDateKeys(startDateKey, effectiveDateKey);
  return Math.max(1, Math.min(30, diff + 1));
}

export function isChallengeDayUnlocked(startDateKey, dayNumber, now = new Date()) {
  if (!startDateKey) return false;
  if (Number(dayNumber || 0) <= 1) return true;

  const unlockDateKey = getChallengeDayUnlockDate(startDateKey, dayNumber);
  const effectiveDateKey = getEligibleDayKey(now);
  return compareDateKeys(effectiveDateKey, unlockDateKey) >= 0;
}

export function getNextUnlockAt(startDateKey, currentUnlockedDay) {
  const nextDay = Math.min(30, Number(currentUnlockedDay || 0) + 1);
  if (!startDateKey || nextDay > 30) return null;
  return getChallengeDayUnlockLabel(startDateKey, nextDay);
}
