export const WEEKLY_MONEY_CHECK_UPDATED_EVENT = "clara:weekly-money-check-updated";
export const WEEKLY_MONEY_CHECK_PROGRESS_EVENT = "clara:weekly-money-check-progress";
export const WEEKLY_MONEY_CHECK_COMPLETED_EVENT = "clara:weekly-money-check-completed";

export const WEEKLY_MONEY_CHECK_DAY_OPTIONS = [
  { value: 0, short: "Sun", label: "Sunday" },
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
];

const STORAGE_PREFIX = "clara_weekly_money_check_v1";
const RECENT_COMPLETION_DAYS = 2;

// This store owns the weekly ritual schedule. Calendar should derive from this
// source later instead of maintaining a second copy of the check-in schedule.
const cleanText = (value) => String(value ?? "").trim();

const finiteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeOwnerId = (ownerId) => cleanText(ownerId) || "local-user";

export function toWeeklyMoneyCheckDateKey(value = new Date()) {
  if (typeof value === "string") {
    const literal = value.trim().match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/);
    if (literal && !value.includes("T")) return literal[1];
  }
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromDateKey(value) {
  const match = cleanText(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date(NaN);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
}

function addDays(dateKey, days) {
  const date = fromDateKey(dateKey);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + Number(days || 0));
  return toWeeklyMoneyCheckDateKey(date);
}

function daysBetween(startKey, endKey) {
  const start = fromDateKey(startKey);
  const end = fromDateKey(endKey);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function timestampDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : toWeeklyMoneyCheckDateKey(date);
}

function normalizeCheckInDay(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 6 ? number : null;
}

function storageKey(ownerId) {
  return `${STORAGE_PREFIX}_${normalizeOwnerId(ownerId)}`;
}

function emptyState() {
  return {
    version: 1,
    enabled: false,
    checkInDay: null,
    scheduleStartedOn: "",
    inProgressStartedAt: null,
    progress: {
      walletsChecked: 0,
      walletCount: 0,
    },
    lastCompletedAt: null,
    lastResult: null,
    updatedAt: null,
  };
}

function normalizeResult(result = null) {
  if (!result || typeof result !== "object") return null;
  const expected = finiteNumberOrNull(result.expected ?? result.expectedAmount);
  const actual = finiteNumberOrNull(result.actual ?? result.actualAmount);
  const explicitDifference = finiteNumberOrNull(result.difference);
  const difference = explicitDifference ?? (
    expected !== null && actual !== null ? actual - expected : null
  );
  const status = cleanText(result.status || result.alignmentStatus || "").toLowerCase();
  return {
    expected,
    actual,
    difference,
    status,
    headline: cleanText(result.headline || result.title),
    message: cleanText(result.message || result.summary),
    unexplained: finiteNumberOrNull(result.unexplained ?? result.unexplainedAmount),
  };
}

export function normalizeWeeklyMoneyCheck(value = {}) {
  const checkInDay = normalizeCheckInDay(value.checkInDay ?? value.check_in_day);
  const scheduleStartedOn = toWeeklyMoneyCheckDateKey(
    value.scheduleStartedOn || value.schedule_started_on || new Date(),
  );
  const progressSource = value.progress && typeof value.progress === "object" ? value.progress : {};
  return {
    ...emptyState(),
    ...value,
    version: 1,
    enabled: value.enabled === true && checkInDay !== null,
    checkInDay,
    scheduleStartedOn,
    inProgressStartedAt: value.inProgressStartedAt || value.in_progress_started_at || null,
    progress: {
      walletsChecked: Math.max(0, Number(progressSource.walletsChecked ?? progressSource.wallets_checked) || 0),
      walletCount: Math.max(0, Number(progressSource.walletCount ?? progressSource.wallet_count) || 0),
    },
    lastCompletedAt: value.lastCompletedAt || value.last_completed_at || null,
    lastResult: normalizeResult(value.lastResult || value.last_result),
    updatedAt: value.updatedAt || value.updated_at || null,
  };
}

export function readWeeklyMoneyCheck(ownerId) {
  if (typeof window === "undefined" || !window.localStorage) return emptyState();
  try {
    const raw = window.localStorage.getItem(storageKey(ownerId));
    return raw ? normalizeWeeklyMoneyCheck(JSON.parse(raw)) : emptyState();
  } catch {
    return emptyState();
  }
}

function emitUpdated(ownerId, state, reason) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WEEKLY_MONEY_CHECK_UPDATED_EVENT, {
      detail: {
        ownerId: normalizeOwnerId(ownerId),
        reason,
        state,
      },
    }),
  );
}

function writeWeeklyMoneyCheck(ownerId, nextState, reason) {
  const next = normalizeWeeklyMoneyCheck({
    ...nextState,
    updatedAt: new Date().toISOString(),
  });
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(storageKey(ownerId), JSON.stringify(next));
    emitUpdated(ownerId, next, reason);
  }
  return next;
}

export function setWeeklyMoneyCheckDay(ownerId, checkInDay, referenceDate = new Date()) {
  const safeDay = normalizeCheckInDay(checkInDay);
  if (safeDay === null) throw new Error("Choose a valid weekly check-in day.");
  const current = readWeeklyMoneyCheck(ownerId);
  return writeWeeklyMoneyCheck(
    ownerId,
    {
      ...current,
      enabled: true,
      checkInDay: safeDay,
      scheduleStartedOn: toWeeklyMoneyCheckDateKey(referenceDate),
      inProgressStartedAt: null,
      progress: { walletsChecked: 0, walletCount: 0 },
    },
    "schedule-changed",
  );
}

export function clearWeeklyMoneyCheckSchedule(ownerId) {
  return writeWeeklyMoneyCheck(ownerId, emptyState(), "schedule-cleared");
}

export function startWeeklyMoneyCheck(ownerId) {
  const current = readWeeklyMoneyCheck(ownerId);
  if (!current.enabled || current.checkInDay === null) {
    throw new Error("Set a weekly check-in day before starting your money check.");
  }
  return writeWeeklyMoneyCheck(
    ownerId,
    {
      ...current,
      inProgressStartedAt: new Date().toISOString(),
      progress: {
        walletsChecked: 0,
        walletCount: current.progress?.walletCount || 0,
      },
    },
    "cross-check-started",
  );
}

export function updateWeeklyMoneyCheckProgress(ownerId, progress = {}) {
  const current = readWeeklyMoneyCheck(ownerId);
  return writeWeeklyMoneyCheck(
    ownerId,
    {
      ...current,
      inProgressStartedAt: current.inProgressStartedAt || new Date().toISOString(),
      progress: {
        walletsChecked: Math.max(0, Number(progress.walletsChecked ?? progress.wallets_checked) || 0),
        walletCount: Math.max(0, Number(progress.walletCount ?? progress.wallet_count) || 0),
      },
    },
    "cross-check-progress",
  );
}

export function completeWeeklyMoneyCheck(ownerId, result = {}) {
  const current = readWeeklyMoneyCheck(ownerId);
  return writeWeeklyMoneyCheck(
    ownerId,
    {
      ...current,
      inProgressStartedAt: null,
      progress: {
        walletsChecked: Math.max(
          current.progress?.walletsChecked || 0,
          current.progress?.walletCount || 0,
        ),
        walletCount: current.progress?.walletCount || 0,
      },
      lastCompletedAt: new Date().toISOString(),
      lastResult: normalizeResult(result),
    },
    "cross-check-completed",
  );
}

export function getWeeklyMoneyCheckScheduleDates(value = {}, referenceDate = new Date()) {
  const state = normalizeWeeklyMoneyCheck(value);
  const today = toWeeklyMoneyCheckDateKey(referenceDate);
  if (!state.enabled || state.checkInDay === null || !today) {
    return { firstDue: null, currentDue: null, nextDue: null };
  }

  const startedOn = state.scheduleStartedOn || today;
  const started = fromDateKey(startedOn);
  if (Number.isNaN(started.getTime())) {
    return { firstDue: null, currentDue: null, nextDue: null };
  }

  const firstOffset = (state.checkInDay - started.getDay() + 7) % 7;
  const firstDue = addDays(startedOn, firstOffset);
  if (today < firstDue) {
    return { firstDue, currentDue: null, nextDue: firstDue };
  }

  const cyclesSinceFirst = Math.floor(Math.max(0, daysBetween(firstDue, today)) / 7);
  const currentDue = addDays(firstDue, cyclesSinceFirst * 7);
  const nextDue = addDays(currentDue, 7);
  return { firstDue, currentDue, nextDue };
}

export function getWeeklyMoneyCheckViewState(value = {}, referenceDate = new Date()) {
  const state = normalizeWeeklyMoneyCheck(value);
  const today = toWeeklyMoneyCheckDateKey(referenceDate);
  if (!state.enabled || state.checkInDay === null) {
    return {
      state: "setup",
      today,
      currentDue: null,
      nextDue: null,
      overdueDays: 0,
      lastResult: state.lastResult,
      progress: state.progress,
    };
  }

  const schedule = getWeeklyMoneyCheckScheduleDates(state, referenceDate);
  if (!schedule.currentDue) {
    return {
      state: "waiting",
      today,
      currentDue: null,
      nextDue: schedule.nextDue,
      overdueDays: 0,
      lastResult: state.lastResult,
      progress: state.progress,
    };
  }

  const lastCompletedDate = timestampDateKey(state.lastCompletedAt);
  const inProgressDate = timestampDateKey(state.inProgressStartedAt);
  const completedThisCycle = Boolean(
    lastCompletedDate &&
    lastCompletedDate >= schedule.currentDue &&
    lastCompletedDate < schedule.nextDue
  );
  const inProgressThisCycle = Boolean(
    inProgressDate &&
    inProgressDate >= schedule.currentDue &&
    inProgressDate < schedule.nextDue
  );

  if (completedThisCycle) {
    const completionAge = Math.max(0, daysBetween(lastCompletedDate, today));
    return {
      state: completionAge <= RECENT_COMPLETION_DAYS ? "completed" : "waiting",
      today,
      currentDue: schedule.currentDue,
      nextDue: schedule.nextDue,
      overdueDays: 0,
      lastResult: state.lastResult,
      progress: state.progress,
    };
  }

  if (inProgressThisCycle) {
    return {
      state: "in_progress",
      today,
      currentDue: schedule.currentDue,
      nextDue: schedule.nextDue,
      overdueDays: Math.max(0, daysBetween(schedule.currentDue, today)),
      lastResult: state.lastResult,
      progress: state.progress,
    };
  }

  return {
    state: "ready",
    today,
    currentDue: schedule.currentDue,
    nextDue: schedule.nextDue,
    overdueDays: Math.max(0, daysBetween(schedule.currentDue, today)),
    lastResult: state.lastResult,
    progress: state.progress,
  };
}

export function getWeeklyMoneyCheckDayLabel(checkInDay) {
  return WEEKLY_MONEY_CHECK_DAY_OPTIONS.find((option) => option.value === Number(checkInDay))?.label || "";
}

export const __weeklyMoneyCheckTestUtils = {
  storageKey,
  addDays,
  daysBetween,
  normalizeCheckInDay,
  normalizeResult,
};
