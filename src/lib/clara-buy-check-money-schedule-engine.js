import {
  CLARA_MONEY_ROUTINE_WEEKDAYS,
  readClaraMoneyRoutine,
} from "./clara-money-schedule-repository.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_HORIZON_DAYS = 62;

const clean = (value = "") => String(value ?? "").replace(/\s+/g, " ").trim();
const safeList = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const safeRecord = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

function toCentavos(value) {
  if (Number.isInteger(value) && value >= 0) return value;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0;
}

function startOfLocalDay(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const raw = clean(value);
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mondayOfWeek(date) {
  const distance = (date.getDay() + 6) % 7;
  return addDays(date, -distance);
}

function routineFromContext(context = {}) {
  const supplied =
    context.moneyRoutine ||
    context.moneyScheduleRoutine ||
    context.claraMoneyRoutine ||
    null;

  if (supplied && typeof supplied === "object") return supplied;

  const owner = context.user || context.userId || context.user_id || context.localUserId || context.local_user_id || null;
  if (!owner) return null;

  try {
    return readClaraMoneyRoutine(owner);
  } catch (error) {
    console.warn("[CLARA Buy Check] Money Schedule routine could not be read safely.", error);
    return null;
  }
}

function normalizeRoutineDay(rawDay = {}, weekday) {
  const day = safeRecord(rawDay);
  const explicitTotal = Number(day.totalCentavos ?? day.total_centavos);
  const itemTotal = safeList(day.items).reduce((sum, item) => {
    const itemRecord = safeRecord(item);
    const centavos = Number(itemRecord.amountCentavos ?? itemRecord.amount_centavos);
    if (Number.isInteger(centavos) && centavos >= 0) return sum + centavos;
    return sum + toCentavos(itemRecord.amount);
  }, 0);
  const totalCentavos = Number.isInteger(explicitTotal) && explicitTotal >= 0
    ? explicitTotal
    : itemTotal;

  return {
    key: weekday.key,
    name: weekday.name,
    weekdayIndex: weekday.weekdayIndex,
    totalCentavos,
  };
}

function normalizeRoutineDays(routine = {}) {
  const rawDays = safeList(routine.days);
  return CLARA_MONEY_ROUTINE_WEEKDAYS.map((weekday) => {
    const matching = rawDays.find((day) => {
      const record = safeRecord(day);
      const key = clean(record.key).toLowerCase();
      const name = clean(record.name).toLowerCase();
      return key === weekday.key || name === weekday.name.toLowerCase();
    });
    return normalizeRoutineDay(matching || {}, weekday);
  });
}

function emptyResult() {
  return {
    connected: false,
    active: false,
    weeklyRoutineTotal: 0,
    passedRoutine: { days: [], amount: 0 },
    remainingRoutine: { days: [], amount: 0 },
    remainingAssumedRoutineSpending: 0,
    horizonStart: null,
    horizonEnd: null,
    horizonBasis: "none",
    includesToday: true,
    repeatMode: "until_updated",
  };
}

function analyzeMoneyScheduleRoutine(context = {}, incomeRunway = {}, options = {}) {
  const now = startOfLocalDay(options.now || new Date()) || startOfLocalDay(new Date());
  const routine = routineFromContext(context);
  if (!routine || routine.active === false) return emptyResult();

  const days = normalizeRoutineDays(routine);
  const weeklyTotalCentavos = days.reduce((sum, day) => sum + day.totalCentavos, 0);
  const weekStart = mondayOfWeek(now);
  const passedDays = [];
  let passedCentavos = 0;

  for (let cursor = weekStart; cursor < now; cursor = addDays(cursor, 1)) {
    const routineDay = days.find((day) => day.weekdayIndex === cursor.getDay());
    if (!routineDay || routineDay.totalCentavos <= 0) continue;
    passedCentavos += routineDay.totalCentavos;
    passedDays.push(routineDay.name);
  }

  const nextIncomeDay = startOfLocalDay(incomeRunway.estimatedNextIncomeDate);
  const weekEnd = addDays(weekStart, 6);
  let horizonEnd = nextIncomeDay && nextIncomeDay >= now ? nextIncomeDay : weekEnd;
  let horizonBasis = nextIncomeDay && nextIncomeDay >= now ? "next_income_inclusive" : "current_week_end";
  const maximumEnd = addDays(now, MAX_HORIZON_DAYS);

  if (horizonEnd > maximumEnd) {
    horizonEnd = maximumEnd;
    horizonBasis = `${horizonBasis}_capped_${MAX_HORIZON_DAYS}_days`;
  }

  const byWeekday = new Map();
  let remainingCentavos = 0;

  for (let cursor = new Date(now); cursor <= horizonEnd; cursor = addDays(cursor, 1)) {
    const routineDay = days.find((day) => day.weekdayIndex === cursor.getDay());
    if (!routineDay || routineDay.totalCentavos <= 0) continue;

    remainingCentavos += routineDay.totalCentavos;
    const current = byWeekday.get(routineDay.key) || {
      day: routineDay.name,
      weekdayIndex: routineDay.weekdayIndex,
      occurrences: 0,
      amountPerOccurrenceCentavos: routineDay.totalCentavos,
      totalCentavos: 0,
    };
    current.occurrences += 1;
    current.totalCentavos += routineDay.totalCentavos;
    byWeekday.set(routineDay.key, current);
  }

  const remainingDays = CLARA_MONEY_ROUTINE_WEEKDAYS
    .map((weekday) => byWeekday.get(weekday.key))
    .filter(Boolean)
    .map((entry) => ({
      day: entry.day,
      occurrences: entry.occurrences,
      amountPerOccurrence: entry.amountPerOccurrenceCentavos / 100,
      totalAmount: entry.totalCentavos / 100,
    }));

  return {
    connected: true,
    active: true,
    weeklyRoutineTotal: weeklyTotalCentavos / 100,
    passedRoutine: {
      days: passedDays,
      amount: passedCentavos / 100,
    },
    remainingRoutine: {
      days: remainingDays,
      amount: remainingCentavos / 100,
    },
    remainingAssumedRoutineSpending: remainingCentavos / 100,
    horizonStart: formatDateKey(now),
    horizonEnd: formatDateKey(horizonEnd),
    horizonBasis,
    includesToday: true,
    repeatMode: clean(routine.repeatMode || routine.repeat_mode || "until_updated") || "until_updated",
  };
}

export { analyzeMoneyScheduleRoutine };
