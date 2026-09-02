import { getRecurringCashFlowOwnerId } from "./recurringCashFlowRepository.js";
import {
  financialDateKey,
  normalizeFinancialDateKey,
} from "./clara-financial-day.js";

export const CLARA_SCHEDULE_CREATE_EVENT = "clara:schedule:create-event";
export const CLARA_MONEY_SCHEDULE_UPDATED_EVENT = "clara:money-schedule-updated";
export const CLARA_MONEY_SCHEDULE_SOURCE = "orb-money-schedule";
export const CLARA_MONEY_ROUTINE_UPDATED_EVENT = "clara:money-routine-updated";
export const CLARA_MONEY_ROUTINE_SOURCE = "orb-money-schedule-routine";

const SCHEDULE_STORAGE_PREFIX = "clara_schedule_events_v2";
const ROUTINE_STORAGE_PREFIX = "clara_money_schedule_routine_v1";

export const CLARA_MONEY_ROUTINE_WEEKDAYS = Object.freeze([
  { key: "monday", name: "Monday", weekdayIndex: 1 },
  { key: "tuesday", name: "Tuesday", weekdayIndex: 2 },
  { key: "wednesday", name: "Wednesday", weekdayIndex: 3 },
  { key: "thursday", name: "Thursday", weekdayIndex: 4 },
  { key: "friday", name: "Friday", weekdayIndex: 5 },
  { key: "saturday", name: "Saturday", weekdayIndex: 6 },
  { key: "sunday", name: "Sunday", weekdayIndex: 0 },
]);

const cleanText = (value) => String(value || "").trim();

function createId(prefix = "money-schedule") {
  if (globalThis?.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function cleanMoneyText(value) {
  const cleaned = String(value ?? "")
    .replace(/php/gi, "")
    .replace(/[₱,\s]/g, "")
    .replace(/[^0-9.]/g, "");
  if (!cleaned) return "";

  const parts = cleaned.split(".");
  const integerPart = parts.shift() || "0";
  const decimalPart = parts.join("").slice(0, 2);
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}

function moneyTextToCentavos(value) {
  const cleaned = cleanMoneyText(value);
  if (!cleaned) return 0;
  const [whole = "0", fraction = ""] = cleaned.split(".");
  const wholeNumber = Number(whole || 0);
  const fractionNumber = Number((fraction || "").padEnd(2, "0").slice(0, 2) || 0);
  if (!Number.isFinite(wholeNumber) || !Number.isFinite(fractionNumber)) return 0;
  return Math.max(0, Math.round(wholeNumber * 100 + fractionNumber));
}

function centavosToMoneyText(value) {
  const centavos = Math.max(0, Math.round(Number(value) || 0));
  const whole = Math.floor(centavos / 100);
  const fraction = String(centavos % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

function readStoredEvents(storageKey) {
  if (typeof window === "undefined" || !window.localStorage) return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getClaraMoneyScheduleStorageKey(user) {
  return `${SCHEDULE_STORAGE_PREFIX}_${getRecurringCashFlowOwnerId(user)}`;
}

export function getClaraMoneyRoutineStorageKey(user) {
  return `${ROUTINE_STORAGE_PREFIX}_${getRecurringCashFlowOwnerId(user)}`;
}

function normalizeRoutineItem(item = {}, index = 0) {
  const label = cleanText(item.label || item.title || item.name || item.category);
  const requestedCentavos = Number(item.amountCentavos ?? item.amount_centavos);
  const amountCentavos = Number.isInteger(requestedCentavos) && requestedCentavos >= 0
    ? requestedCentavos
    : moneyTextToCentavos(item.amount);

  if (!label || amountCentavos <= 0) return null;

  return {
    id: cleanText(item.id) || createId(`routine-item-${index + 1}`),
    label,
    amountCentavos,
    amount_centavos: amountCentavos,
    amount: centavosToMoneyText(amountCentavos),
  };
}

function normalizeBasisDayKey(value, ownDayKey = "") {
  const raw = cleanText(value).toLowerCase();
  if (!raw) return "";

  const canonical = CLARA_MONEY_ROUTINE_WEEKDAYS.find(
    (candidate) => candidate.key === raw || candidate.name.toLowerCase() === raw
  );

  if (!canonical || canonical.key === ownDayKey) return "";
  return canonical.key;
}

function normalizeRoutineDay(day = {}, fallback = CLARA_MONEY_ROUTINE_WEEKDAYS[0]) {
  const canonical =
    CLARA_MONEY_ROUTINE_WEEKDAYS.find((candidate) => candidate.key === cleanText(day.key).toLowerCase()) ||
    CLARA_MONEY_ROUTINE_WEEKDAYS.find((candidate) => candidate.name.toLowerCase() === cleanText(day.name).toLowerCase()) ||
    fallback;
  const items = (Array.isArray(day.items) ? day.items : [])
    .map((item, index) => normalizeRoutineItem(item, index))
    .filter(Boolean);
  const totalCentavos = items.reduce((sum, item) => sum + item.amountCentavos, 0);
  const basisDayKey = normalizeBasisDayKey(
    day.basisDayKey || day.basis_day_key || day.basedOnDayKey || day.based_on_day_key,
    canonical.key
  );

  return {
    key: canonical.key,
    name: canonical.name,
    weekdayIndex: canonical.weekdayIndex,
    weekday_index: canonical.weekdayIndex,
    basisDayKey: basisDayKey || null,
    basis_day_key: basisDayKey || null,
    items,
    totalCentavos,
    total_centavos: totalCentavos,
    total: centavosToMoneyText(totalCentavos),
  };
}

function normalizeRoutine(value = {}) {
  const rawDays = Array.isArray(value.days) ? value.days : [];
  const days = CLARA_MONEY_ROUTINE_WEEKDAYS.map((weekday) => {
    const matching = rawDays.find((day) =>
      cleanText(day?.key).toLowerCase() === weekday.key ||
      cleanText(day?.name).toLowerCase() === weekday.name.toLowerCase()
    );
    return normalizeRoutineDay(matching || {}, weekday);
  });
  const weeklyTotalCentavos = days.reduce((sum, day) => sum + day.totalCentavos, 0);
  const createdAt = cleanText(value.createdAt || value.created_at);
  const updatedAt = cleanText(value.updatedAt || value.updated_at) || new Date().toISOString();

  return {
    version: 1,
    id: cleanText(value.id) || createId("money-routine"),
    type: "weekly_daily_expense_routine",
    cadence: "weekly",
    repeatMode: "until_updated",
    repeat_mode: "until_updated",
    active: value.active !== false,
    source: CLARA_MONEY_ROUTINE_SOURCE,
    days,
    weeklyTotalCentavos,
    weekly_total_centavos: weeklyTotalCentavos,
    weeklyTotal: centavosToMoneyText(weeklyTotalCentavos),
    weekly_total: centavosToMoneyText(weeklyTotalCentavos),
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt,
  };
}

export function readClaraMoneyRoutine(user) {
  if (typeof window === "undefined" || !window.localStorage) return null;

  try {
    const raw = window.localStorage.getItem(getClaraMoneyRoutineStorageKey(user));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeRoutine(parsed);
  } catch {
    return null;
  }
}

export function saveClaraMoneyRoutine({ user, days } = {}) {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("Money Schedule is unavailable on this device right now.");
  }

  const suppliedKeys = new Set(
    (Array.isArray(days) ? days : [])
      .filter(Boolean)
      .map((day) => cleanText(day?.key).toLowerCase())
      .filter(Boolean)
  );
  const hasEveryDay = CLARA_MONEY_ROUTINE_WEEKDAYS.every((weekday) => suppliedKeys.has(weekday.key));

  if (!Array.isArray(days) || !hasEveryDay) {
    throw new Error("Finish Monday through Sunday before saving your routine.");
  }

  const existing = readClaraMoneyRoutine(user);
  const now = new Date().toISOString();
  const createdAt = existing
    ? cleanText(existing.createdAt || existing.created_at)
    : now;
  const routine = normalizeRoutine({
    ...(existing || {}),
    days,
    active: true,
    createdAt,
    created_at: createdAt,
    updatedAt: now,
    updated_at: now,
  });

  window.localStorage.setItem(getClaraMoneyRoutineStorageKey(user), JSON.stringify(routine));
  window.dispatchEvent(
    new CustomEvent(CLARA_MONEY_ROUTINE_UPDATED_EVENT, {
      detail: {
        ownerId: getRecurringCashFlowOwnerId(user),
        routine,
      },
    })
  );

  return routine;
}

export function isRetroactiveClaraMoneyScheduleDate(value, now = new Date()) {
  const targetDate = normalizeFinancialDateKey(value);
  const today = financialDateKey(now);
  return Boolean(targetDate && today && targetDate < today);
}

export function assertClaraMoneyScheduleDateAllowed(value, now = new Date()) {
  if (!isRetroactiveClaraMoneyScheduleDate(value, now)) return true;
  const error = new Error(
    "Past spending belongs in Log Expense. Money Schedule can only create plans for today or later."
  );
  error.code = "MONEY_SCHEDULE_RETROACTIVE_CREATE_BLOCKED";
  throw error;
}

export function createClaraMoneyScheduleEvent(draft = {}) {
  const title = cleanText(draft.title);
  const date = cleanText(draft.date);
  if (!title || !date) {
    throw new Error("Money Schedule needs a title and date before it can be saved.");
  }

  assertClaraMoneyScheduleDateAllowed(date);

  const direction = cleanText(draft.direction).toLowerCase() === "in" ? "in" : "out";
  const amountKnown = draft.amountKnown !== false;
  const amountText = amountKnown ? cleanMoneyText(draft.amount) : "";
  const amountNumber = amountText ? Number(amountText) : 0;

  if (amountKnown && (!Number.isFinite(amountNumber) || amountNumber <= 0)) {
    throw new Error("Enter the expected amount, or choose “Not sure yet”.");
  }

  const type = cleanText(draft.type) || (direction === "in" ? "Payday" : "Personal");
  const note = cleanText(draft.note);

  return {
    id: cleanText(draft.id) || createId(),
    title,
    date,
    time: cleanText(draft.time),
    type,
    amount: amountText,
    note,
    affectsMoney: true,
    direction,
    source: CLARA_MONEY_SCHEDULE_SOURCE,
    userConfirmed: true,
    impactBreakdown: [
      {
        label: direction === "in" ? "Money in" : "Money out",
        amount: amountKnown ? amountNumber : 0,
        direction,
        scheduleType: type,
        pendingAmount: !amountKnown,
        source: CLARA_MONEY_SCHEDULE_SOURCE,
      },
    ],
  };
}

export function appendClaraMoneyScheduleEvent({ user, draft } = {}) {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("Money Schedule is unavailable on this device right now.");
  }

  const event = createClaraMoneyScheduleEvent(draft);
  const storageKey = getClaraMoneyScheduleStorageKey(user);
  const currentEvents = readStoredEvents(storageKey);

  if (!currentEvents.some((item) => String(item?.id) === String(event.id))) {
    window.localStorage.setItem(storageKey, JSON.stringify([...currentEvents, event]));
    window.dispatchEvent(
      new CustomEvent(CLARA_MONEY_SCHEDULE_UPDATED_EVENT, {
        detail: { ownerId: getRecurringCashFlowOwnerId(user), reason: "append", eventId: event.id },
      })
    );
  }

  // If the Calendar is already mounted elsewhere, hand it the same event so its
  // React state updates immediately. The Calendar listener deduplicates by id.
  window.dispatchEvent(
    new CustomEvent(CLARA_SCHEDULE_CREATE_EVENT, {
      detail: event,
    })
  );

  return event;
}
