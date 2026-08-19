import { getRecurringCashFlowOwnerId } from "./recurringCashFlowRepository.js";

export const CLARA_SCHEDULE_CREATE_EVENT = "clara:schedule:create-event";
export const CLARA_MONEY_SCHEDULE_SOURCE = "orb-money-schedule";

const SCHEDULE_STORAGE_PREFIX = "clara_schedule_events_v2";

const cleanText = (value) => String(value || "").trim();

function createId() {
  if (globalThis?.crypto?.randomUUID) {
    return `money-schedule_${globalThis.crypto.randomUUID()}`;
  }

  return `money-schedule_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

export function createClaraMoneyScheduleEvent(draft = {}) {
  const title = cleanText(draft.title);
  const date = cleanText(draft.date);
  if (!title || !date) {
    throw new Error("Money Schedule needs a title and date before it can be saved.");
  }

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
