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

export function getLocalDateKey(date = new Date(), timeZone = MANILA_TIME_ZONE) {
  const parts = partsFor(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateKeyToUtcNoon(dateKey) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  return Date.UTC(year, month - 1, day, 12, 0, 0, 0);
}

export function addLocalDays(dateKey, days) {
  const next = new Date(dateKeyToUtcNoon(dateKey) + Number(days || 0) * DAY_MS);
  return next.toISOString().slice(0, 10);
}

export function compareDateKeys(left, right) {
  return dateKeyToUtcNoon(left) - dateKeyToUtcNoon(right);
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

  const currentKey = getLocalDateKey(now);
  const currentParts = partsFor(now);
  const beforeUnlock = Number(currentParts.hour || 0) < UNLOCK_HOUR;
  const effectiveDateKey = beforeUnlock ? addLocalDays(currentKey, -1) : currentKey;
  const diff = Math.floor((dateKeyToUtcNoon(effectiveDateKey) - dateKeyToUtcNoon(startDateKey)) / DAY_MS);
  return Math.max(1, Math.min(30, diff + 1));
}

export function isChallengeDayUnlocked(startDateKey, dayNumber, now = new Date()) {
  if (!startDateKey) return false;
  if (Number(dayNumber || 0) <= 1) return true;

  const unlockDateKey = getChallengeDayUnlockDate(startDateKey, dayNumber);
  const currentKey = getLocalDateKey(now);
  const currentParts = partsFor(now);

  if (compareDateKeys(currentKey, unlockDateKey) > 0) return true;
  if (compareDateKeys(currentKey, unlockDateKey) < 0) return false;
  return Number(currentParts.hour || 0) >= UNLOCK_HOUR;
}

export function getNextUnlockAt(startDateKey, currentUnlockedDay) {
  const nextDay = Math.min(30, Number(currentUnlockedDay || 0) + 1);
  if (!startDateKey || nextDay > 30) return null;
  return getChallengeDayUnlockLabel(startDateKey, nextDay);
}
