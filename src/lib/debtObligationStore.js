import {
  LOCAL_FINANCE_STORES,
  getLocalRecords,
  upsertLocalRecord,
  softDeleteLocalRecord,
} from "@/lib/localFinanceStore";
import { appendPaidDebtOccurrence, getDebtOccurrenceState } from "@/lib/debtOccurrenceState";
import {
  DEBT_OBLIGATION_RECORD_KIND,
  getDebtBalance,
  getDebtDueDay,
  getDebtInterestRate,
  getDebtObligationMode,
  getDebtStatus,
  getNextDebtDueDate,
  getDebtTitleValue,
  getMonthlyDebtPayment,
  isActiveDebtObligation,
  summarizeDebtObligationsPure,
} from "@/lib/debtObligationMath";

export {
  DEBT_OBLIGATION_RECORD_KIND,
  getDebtBalance,
  getDebtDueDay,
  getDebtInterestRate,
  getDebtObligationMode,
  getDebtStatus,
  getNextDebtDueDate,
  getMonthlyDebtPayment,
  isActiveDebtObligation,
  isDebtLinkedExpense,
  toDebtNumber,
} from "@/lib/debtObligationMath";

export const DEBT_OBLIGATION_STORE =
  LOCAL_FINANCE_STORES?.privatePreferences || "private_preferences";
export const DEFAULT_DEBT_OBLIGATION_ID = "debt_obligation_primary";
export const DEBT_OBLIGATIONS_UPDATED_EVENT = "clara:debt-obligations-updated";

function emitDebtObligationsUpdated(localUserId, reason) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(DEBT_OBLIGATIONS_UPDATED_EVENT, {
      detail: { localUserId, reason },
    })
  );
}

const normalizeLocalUserId = (localUserId) => {
  const safeLocalUserId = String(localUserId || "").trim();
  if (!safeLocalUserId) {
    throw new Error("localUserId is required to save CLARA debt obligations.");
  }
  return safeLocalUserId;
};

const normalizeString = (value) => String(value ?? "").trim();

export const createDebtObligationId = () => {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return `debt_obligation_${globalThis.crypto.randomUUID()}`;
  }
  return `debt_obligation_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeDebtType = (value) => {
  const normalized = normalizeString(value).toLowerCase();
  return normalized || "credit_card";
};

export const getDebtTitle = getDebtTitleValue;

const normalizeDebtRecord = (record = {}) => {
  const balance = getDebtBalance(record);
  const monthlyPayment = getMonthlyDebtPayment(record);
  const interestRate = getDebtInterestRate(record);
  const obligationMode = getDebtObligationMode(record);
  const dueDay = getDebtDueDay(record);
  const nextDueDate = dueDay ? getNextDebtDueDate(record) : null;
  const recurringDueDate = nextDueDate
    ? `${nextDueDate.getFullYear()}-${String(nextDueDate.getMonth() + 1).padStart(2, "0")}-${String(nextDueDate.getDate()).padStart(2, "0")}`
    : record.dueDate || record.due_date || "";
  return {
    ...record,
    obligationMode,
    obligation_mode: obligationMode,
    totalDebt: balance,
    balance,
    amount: balance,
    monthlyDebt: monthlyPayment,
    monthlyPayment,
    monthly_payment: monthlyPayment,
    interestRate,
    interest_rate: interestRate,
    dueDate: recurringDueDate,
    due_date: recurringDueDate,
    dueDay: dueDay || null,
    due_day: dueDay || null,
    status: getDebtStatus(record),
  };
};

const sortByNewest = (records = []) =>
  [...records].sort((left, right) => {
    const leftTime = new Date(
      left?.updatedAt || left?.updated_at || left?.createdAt || left?.created_at || 0
    ).getTime();
    const rightTime = new Date(
      right?.updatedAt || right?.updated_at || right?.createdAt || right?.created_at || 0
    ).getTime();
    return rightTime - leftTime;
  });

export async function getDebtObligations(localUserId) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const records = await getLocalRecords(DEBT_OBLIGATION_STORE, safeLocalUserId);
  return sortByNewest(
    (records || []).map(normalizeDebtRecord).filter(isActiveDebtObligation)
  );
}

export async function upsertDebtObligation(localUserId, payload = {}) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const now = new Date().toISOString();
  const balance = getDebtBalance(payload);
  const monthlyPayment = getMonthlyDebtPayment(payload);
  const interestRate = getDebtInterestRate(payload);
  const debtType = normalizeDebtType(payload.debtType ?? payload.type);
  const title =
    normalizeString(
      payload.title || payload.name || payload.lender || payload.creditor || payload.label
    ) || getDebtTitleValue({ debtType, type: debtType });
  const explicitMode = normalizeString(payload.obligationMode || payload.obligation_mode).toLowerCase();
  const obligationMode = ["recurring", "monthly", "ongoing"].includes(explicitMode)
    ? "recurring"
    : ["balance", "payoff", "debt"].includes(explicitMode)
      ? "balance"
      : balance > 0
        ? "balance"
        : "recurring";

  if (balance <= 0 && monthlyPayment <= 0) {
    throw new Error("Enter at least the balance or monthly payment first.");
  }
  if (obligationMode === "balance" && balance <= 0) {
    throw new Error("Enter the remaining balance for a payoff debt.");
  }
  if (monthlyPayment <= 0) {
    throw new Error("Enter the monthly payment for this obligation.");
  }

  const recordId = normalizeString(payload.id) || createDebtObligationId();
  const createdAt = payload.createdAt || payload.created_at || now;
  const dueDay = getDebtDueDay(payload);
  const record = {
    ...(payload || {}),
    id: recordId,
    recordKind: DEBT_OBLIGATION_RECORD_KIND,
    localUserId: safeLocalUserId,
    title,
    name: title,
    label: title,
    lender: normalizeString(payload.lender || payload.creditor) || title,
    type: debtType,
    debtType,
    obligationMode,
    obligation_mode: obligationMode,
    totalDebt: balance,
    balance,
    amount: balance,
    monthlyDebt: monthlyPayment,
    monthlyPayment,
    monthly_payment: monthlyPayment,
    interestRate,
    interest_rate: interestRate,
    dueDate: payload.dueDate || payload.due_date || "",
    due_date: payload.due_date || payload.dueDate || "",
    dueDay: dueDay || null,
    due_day: dueDay || null,
    notes: payload.notes || "",
    status: payload.status || "active",
    paidAt: null,
    paid_at: null,
    createdAt,
    created_at: createdAt,
    updatedAt: now,
    updated_at: now,
    deletedAt: null,
    deleted_at: null,
    syncStatus: payload.syncStatus || "local_only",
    source: "local",
  };

  const result = await upsertLocalRecord(
    DEBT_OBLIGATION_STORE,
    record,
    safeLocalUserId
  );
  emitDebtObligationsUpdated(safeLocalUserId, "upsert");
  return result;
}


export async function markDebtOccurrencePaid(localUserId, id, options = {}) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const safeId = normalizeString(id);
  if (!safeId) throw new Error("Debt obligation id is required.");

  const records = await getLocalRecords(DEBT_OBLIGATION_STORE, safeLocalUserId);
  const current = (records || []).find((record) => normalizeString(record?.id) === safeId);
  if (!current) throw new Error("Debt / Obligation could not be found.");

  const occurrence = getDebtOccurrenceState(current, options.referenceDate || new Date());
  const dueDate = normalizeString(options.dueDate || occurrence?.dueDate).slice(0, 10);
  if (!dueDate) throw new Error("There is no due occurrence to mark as paid.");

  const mode = getDebtObligationMode(current);
  const plannedOccurrenceAmount = Math.max(
    0,
    Number(getMonthlyDebtPayment(current) || occurrence?.amount || 0)
  );
  const paymentAmount = Math.max(
    0,
    Number(options.amount || plannedOccurrenceAmount || 0)
  );
  const currentBalance = getDebtBalance(current);
  const nextBalance = mode === "balance" ? Math.max(currentBalance - paymentAmount, 0) : currentBalance;
  const completed = mode === "balance" && nextBalance <= 0;
  const now = new Date().toISOString();
  const priorHistory = Array.isArray(current.paymentHistory)
    ? current.paymentHistory
    : Array.isArray(current.payment_history)
      ? current.payment_history
      : [];
  const paymentEntry = {
    id: `legacy_debt_payment_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    amount: paymentAmount,
    dueDate,
    due_date: dueDate,
    paidAt: now,
    paid_at: now,
    source: "legacy_mark_paid",
  };
  const paymentHistory = [...priorHistory, paymentEntry];
  const occurrencePaidAmount = paymentHistory.reduce((sum, entry) => {
    const entryDueDate = normalizeString(entry?.dueDate || entry?.due_date).slice(0, 10);
    const amount = Math.max(0, Number(entry?.amount || 0));
    return entryDueDate === dueDate ? sum + amount : sum;
  }, 0);
  const expectedOccurrenceAmount =
    mode === "balance"
      ? Math.min(plannedOccurrenceAmount || currentBalance, currentBalance)
      : plannedOccurrenceAmount;
  const occurrenceSatisfied =
    completed ||
    (expectedOccurrenceAmount > 0 && occurrencePaidAmount >= expectedOccurrenceAmount);
  const existingPaidOccurrences = Array.isArray(current.paidOccurrences)
    ? current.paidOccurrences
    : Array.isArray(current.paid_occurrences)
      ? current.paid_occurrences
      : [];
  const paidOccurrences = occurrenceSatisfied
    ? appendPaidDebtOccurrence(current, dueDate)
    : existingPaidOccurrences;

  const record = {
    ...current,
    id: safeId,
    localUserId: safeLocalUserId,
    paymentHistory,
    payment_history: paymentHistory,
    paidOccurrences,
    paid_occurrences: paidOccurrences,
    lastPaidOccurrenceDate: occurrenceSatisfied
      ? dueDate
      : current.lastPaidOccurrenceDate || current.last_paid_occurrence_date || null,
    last_paid_occurrence_date: occurrenceSatisfied
      ? dueDate
      : current.last_paid_occurrence_date || current.lastPaidOccurrenceDate || null,
    lastPaymentAmount: paymentAmount,
    last_payment_amount: paymentAmount,
    lastPaidAt: now,
    last_paid_at: now,
    paidAt: completed ? now : current.paidAt || current.paid_at || null,
    paid_at: completed ? now : current.paid_at || current.paidAt || null,
    totalDebt: nextBalance,
    balance: nextBalance,
    amount: nextBalance,
    status: completed ? "completed" : "active",
    updatedAt: now,
    updated_at: now,
  };

  const result = await upsertLocalRecord(DEBT_OBLIGATION_STORE, record, safeLocalUserId);
  emitDebtObligationsUpdated(safeLocalUserId, "occurrence_paid");
  return result;
}

export async function deleteDebtObligation(localUserId, id) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const safeId = normalizeString(id);
  if (!safeId) throw new Error("Debt obligation id is required.");
  const result = await softDeleteLocalRecord(
    DEBT_OBLIGATION_STORE,
    safeId,
    safeLocalUserId
  );
  if (result) emitDebtObligationsUpdated(safeLocalUserId, "delete");
  return result;
}

export function summarizeDebtObligations(records = [], options = {}) {
  return summarizeDebtObligationsPure(records, options);
}
