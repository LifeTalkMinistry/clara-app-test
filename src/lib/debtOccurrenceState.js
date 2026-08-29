import { buildDebtObligationScheduleProjection } from "./financialCardScheduleProjection.js";
import { financialDateKey, normalizeFinancialDateKey } from "./clara-financial-day.js";

const text = (value) => String(value ?? "").trim();
const dateKey = (value) =>
  value instanceof Date
    ? financialDateKey(value)
    : normalizeFinancialDateKey(value) || financialDateKey(value);

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

export function isDebtOccurrencePaid(record = {}, dueDate = "") {
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

  // Backward compatibility for older records that only stored a payment timestamp.
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
        !isDebtOccurrencePaid(record, event?.date)
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
        !isDebtOccurrencePaid(record, event?.date)
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
