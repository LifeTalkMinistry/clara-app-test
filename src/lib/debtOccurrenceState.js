import { buildDebtObligationScheduleProjection } from "./financialCardScheduleProjection.js";
import { financialDateKey, normalizeFinancialDateKey } from "./clara-financial-day.js";

const text = (value) => String(value ?? "").trim();
const dateKey = (value) =>
  value instanceof Date
    ? financialDateKey(value)
    : normalizeFinancialDateKey(value) || financialDateKey(value);

function getRawStructuredPaymentHistory(record = {}) {
  const history = Array.isArray(record?.paymentHistory)
    ? record.paymentHistory
    : Array.isArray(record?.payment_history)
      ? record.payment_history
      : [];
  return history.filter(Boolean);
}

function paymentActualDate(entry = {}) {
  return dateKey(
    entry?.actualPaymentDate ||
      entry?.actual_payment_date ||
      entry?.paymentDate ||
      entry?.payment_date ||
      entry?.paidAt ||
      entry?.paid_at ||
      entry?.recordedAt ||
      entry?.recorded_at ||
      entry?.createdAt ||
      entry?.created_at
  );
}

function latestScheduledOccurrenceOnOrBefore(record = {}, targetDate = "") {
  const target = dateKey(targetDate);
  if (!target) return "";
  const referenceDate = new Date(`${target}T12:00:00+08:00`);
  const events = buildDebtObligationScheduleProjection([record], { referenceDate })
    .filter((event) => text(event?.direction || "out").toLowerCase() === "out")
    .map((event) => dateKey(event?.date))
    .filter(Boolean)
    .sort();
  return [...events].reverse().find((date) => date <= target) || "";
}

function legacyFutureDueDateRemap(record = {}) {
  const remap = new Map();
  getRawStructuredPaymentHistory(record).forEach((entry) => {
    if (text(entry?.source).toLowerCase() !== "legacy_mark_paid") return;
    const storedDueDate = dateKey(entry?.dueDate || entry?.due_date);
    const actualDate = paymentActualDate(entry);
    if (!storedDueDate || !actualDate || storedDueDate <= actualDate) return;

    const intendedOccurrence = latestScheduledOccurrenceOnOrBefore(record, actualDate);
    if (!intendedOccurrence || intendedOccurrence >= storedDueDate) return;
    remap.set(storedDueDate, intendedOccurrence);
  });
  return remap;
}

function getStructuredPaymentHistory(record = {}) {
  const remap = legacyFutureDueDateRemap(record);
  return getRawStructuredPaymentHistory(record).map((entry) => {
    const storedDueDate = dateKey(entry?.dueDate || entry?.due_date);
    const reconciledDueDate = remap.get(storedDueDate);
    if (!reconciledDueDate) return entry;
    return {
      ...entry,
      dueDate: reconciledDueDate,
      due_date: reconciledDueDate,
      legacyOriginalDueDate: storedDueDate,
      legacy_original_due_date: storedDueDate,
    };
  });
}

function hasStructuredPaymentHistory(record = {}) {
  return getStructuredPaymentHistory(record).length > 0;
}

export function getDebtOccurrencePayments(record = {}, dueDate = "") {
  const target = dateKey(dueDate);
  if (!target) return [];
  return getStructuredPaymentHistory(record).filter(
    (entry) => dateKey(entry?.dueDate || entry?.due_date) === target
  );
}

export function getDebtOccurrencePaidAmount(record = {}, dueDate = "") {
  return getDebtOccurrencePayments(record, dueDate).reduce(
    (sum, entry) => sum + Math.max(0, Number(entry?.amount || 0)),
    0
  );
}

function getStructuredOccurrencePaidAmount(record = {}, dueDate = "") {
  return getDebtOccurrencePaidAmount(record, dueDate);
}

export function getPaidDebtOccurrenceDates(record = {}) {
  const raw =
    record?.paidOccurrences ||
    record?.paid_occurrences ||
    record?.paidOccurrenceDates ||
    record?.paid_occurrence_dates ||
    [];
  const values = Array.isArray(raw) ? raw : [];
  const remap = legacyFutureDueDateRemap(record);
  return [...new Set(values
    .map((entry) => dateKey(entry?.dueDate || entry?.due_date || entry))
    .map((date) => remap.get(date) || date)
    .filter(Boolean))];
}

export function getSkippedDebtOccurrenceDates(record = {}) {
  const raw =
    record?.skippedOccurrences ||
    record?.skipped_occurrences ||
    record?.skippedOccurrenceDates ||
    record?.skipped_occurrence_dates ||
    [];
  const values = Array.isArray(raw) ? raw : [];
  return [...new Set(values.map((entry) => dateKey(entry?.dueDate || entry?.due_date || entry)).filter(Boolean))];
}

export function isDebtOccurrenceSkipped(record = {}, dueDate = "") {
  const target = dateKey(dueDate);
  return Boolean(target && getSkippedDebtOccurrenceDates(record).includes(target));
}

export function appendSkippedDebtOccurrence(record = {}, dueDate = "") {
  const target = dateKey(dueDate);
  if (!target) return getSkippedDebtOccurrenceDates(record);
  return [...new Set([...getSkippedDebtOccurrenceDates(record), target])].sort();
}

export function isDebtOccurrencePaid(record = {}, dueDate = "", _expectedAmount = 0) {
  const target = dateKey(dueDate);
  if (!target) return false;
  if (getPaidDebtOccurrenceDates(record).includes(target)) return true;

  const remap = legacyFutureDueDateRemap(record);
  const explicitStored = dateKey(
    record?.lastPaidOccurrenceDate ||
      record?.last_paid_occurrence_date ||
      record?.paidOccurrenceDate ||
      record?.paid_occurrence_date
  );
  const explicit = remap.get(explicitStored) || explicitStored;
  if (explicit && explicit === target) return true;

  // A Debt / Obligation occurrence is a user decision boundary, not an automatic
  // arrears calculator. Once the user records any positive payment for the exact
  // due occurrence, that occurrence is resolved for the cycle. The actual amount
  // remains in paymentHistory for Wallet/audit truth; CLARA must not invent the
  // unpaid difference as another current-cycle commitment unless the user creates
  // a new obligation for it explicitly.
  if (hasStructuredPaymentHistory(record)) {
    return getStructuredOccurrencePaidAmount(record, target) > 0;
  }

  const legacyPaid = dateKey(record?.lastPaidAt || record?.last_paid_at || record?.paidAt || record?.paid_at);
  return Boolean(legacyPaid && legacyPaid >= target);
}

export function getDebtOccurrenceState(record = {}, referenceDate = new Date()) {
  const today = financialDateKey(referenceDate);
  const events = buildDebtObligationScheduleProjection([record], { referenceDate })
    .filter((event) => text(event?.direction || "out").toLowerCase() === "out")
    .sort((a, b) => dateKey(a?.date).localeCompare(dateKey(b?.date)));

  // A recurring obligation represents one active period at a time. Do not walk
  // backward through every older unpaid calendar occurrence when the user taps
  // Pay Obligation. The active period is the latest scheduled occurrence on or
  // before today. Older periods remain historical data unless the user explicitly
  // records/corrects them through the historical-payment flow.
  const currentDue =
    [...events]
      .reverse()
      .find((event) => dateKey(event?.date) <= today) || null;

  if (currentDue && isDebtOccurrenceSkipped(record, currentDue?.date)) {
    const dueDate = dateKey(currentDue.date);
    return {
      state: "skipped",
      dueDate,
      amount: Math.max(0, Number(currentDue?.amount || 0)),
      event: currentDue,
    };
  }

  if (
    currentDue &&
    !isDebtOccurrencePaid(record, currentDue?.date, currentDue?.amount)
  ) {
    const dueDate = dateKey(currentDue.date);
    return {
      state: dueDate < today ? "overdue" : "due_today",
      dueDate,
      amount: Math.max(0, Number(currentDue?.amount || 0)),
      event: currentDue,
    };
  }

  const next =
    events.find(
      (event) =>
        dateKey(event?.date) > today &&
        !isDebtOccurrenceSkipped(record, event?.date) &&
        !isDebtOccurrencePaid(record, event?.date, event?.amount)
    ) || null;
  if (next) {
    return {
      state: "upcoming",
      dueDate: dateKey(next.date),
      amount: Math.max(0, Number(next?.amount || 0)),
      event: next,
    };
  }

  return { state: "none", dueDate: "", amount: 0, event: null };
}

export function appendPaidDebtOccurrence(record = {}, dueDate = "") {
  const target = dateKey(dueDate);
  if (!target) return getPaidDebtOccurrenceDates(record);
  return [...new Set([...getPaidDebtOccurrenceDates(record), target])].sort();
}