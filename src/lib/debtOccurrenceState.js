import { buildDebtObligationScheduleProjection } from "./financialCardScheduleProjection.js";
import { financialDateKey, normalizeFinancialDateKey } from "./clara-financial-day.js";

const text = (value) => String(value ?? "").trim();
const dateKey = (value) =>
  value instanceof Date
    ? financialDateKey(value)
    : normalizeFinancialDateKey(value) || financialDateKey(value);

function getStructuredPaymentHistory(record = {}) {
  const history = Array.isArray(record?.paymentHistory)
    ? record.paymentHistory
    : Array.isArray(record?.payment_history)
      ? record.payment_history
      : [];
  return history.filter(Boolean);
}

function hasStructuredPaymentHistory(record = {}) {
  return getStructuredPaymentHistory(record).length > 0;
}

function getStructuredOccurrencePaidAmount(record = {}, dueDate = "") {
  const target = dateKey(dueDate);
  if (!target) return 0;
  return getStructuredPaymentHistory(record).reduce((sum, entry) => {
    const entryDueDate = dateKey(entry?.dueDate || entry?.due_date);
    const amount = Math.max(0, Number(entry?.amount || 0));
    return entryDueDate === target ? sum + amount : sum;
  }, 0);
}

export function getPaidDebtOccurrenceDates(record = {}) {
  const raw =
    record?.paidOccurrences ||
    record?.paid_occurrences ||
    record?.paidOccurrenceDates ||
    record?.paid_occurrence_dates ||
    [];
  const values = Array.isArray(raw) ? raw : [];
  return [...new Set(values.map((entry) => dateKey(entry?.dueDate || entry?.due_date || entry)).filter(Boolean))];
}

export function isDebtOccurrencePaid(record = {}, dueDate = "", expectedAmount = 0) {
  const target = dateKey(dueDate);
  if (!target) return false;
  if (getPaidDebtOccurrenceDates(record).includes(target)) return true;

  const explicit = dateKey(
    record?.lastPaidOccurrenceDate ||
      record?.last_paid_occurrence_date ||
      record?.paidOccurrenceDate ||
      record?.paid_occurrence_date
  );
  if (explicit && explicit === target) return true;

  // Modern records own occurrence truth through paymentHistory + paidOccurrences.
  // A partial payment still updates lastPaidAt for audit/history, so using that
  // timestamp as a paid-occurrence signal would incorrectly skip the remainder.
  // Keep the timestamp fallback only for genuinely old records that predate
  // structured per-occurrence payment history.
  if (hasStructuredPaymentHistory(record)) {
    const requiredAmount = Math.max(0, Number(expectedAmount || 0));
    if (requiredAmount > 0) {
      return getStructuredOccurrencePaidAmount(record, target) >= requiredAmount;
    }
    return false;
  }

  const legacyPaid = dateKey(record?.lastPaidAt || record?.last_paid_at || record?.paidAt || record?.paid_at);
  return Boolean(legacyPaid && legacyPaid >= target);
}

export function getDebtOccurrenceState(record = {}, referenceDate = new Date()) {
  const today = financialDateKey(referenceDate);
  const events = buildDebtObligationScheduleProjection([record], { referenceDate })
    .filter((event) => text(event?.direction || "out").toLowerCase() === "out")
    .sort((a, b) => dateKey(a?.date).localeCompare(dateKey(b?.date)));

  // Pay Obligation always targets the earliest unpaid scheduled occurrence first.
  const earliestDue =
    events.find(
      (event) =>
        dateKey(event?.date) <= today &&
        !isDebtOccurrencePaid(record, event?.date, event?.amount)
    ) || null;
  if (earliestDue) {
    const dueDate = dateKey(earliestDue.date);
    return {
      state: dueDate < today ? "overdue" : "due_today",
      dueDate,
      amount: Math.max(0, Number(earliestDue?.amount || 0)),
      event: earliestDue,
    };
  }

  const next =
    events.find(
      (event) =>
        dateKey(event?.date) > today &&
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
