import {
  LOCAL_FINANCE_STORES,
  getLocalRecords,
  upsertLocalRecord,
  softDeleteLocalRecord,
} from "@/lib/localFinanceStore";

export const DEBT_OBLIGATION_RECORD_KIND = "debt_obligation";
export const DEBT_OBLIGATION_STORE =
  LOCAL_FINANCE_STORES?.privatePreferences || "private_preferences";

export const DEFAULT_DEBT_OBLIGATION_ID = "debt_obligation_primary";

const normalizeLocalUserId = (localUserId) => {
  const safeLocalUserId = String(localUserId || "").trim();

  if (!safeLocalUserId) {
    throw new Error("localUserId is required to save CLARA debt obligations.");
  }

  return safeLocalUserId;
};

const normalizeString = (value) => String(value ?? "").trim();

export const toDebtNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

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

const getDebtBalance = (record) =>
  toDebtNumber(
    record?.totalDebt ??
      record?.balance ??
      record?.amount ??
      record?.debt_balance ??
      0
  );

const getMonthlyPayment = (record) =>
  toDebtNumber(
    record?.monthlyDebt ??
      record?.monthlyPayment ??
      record?.monthly_payment ??
      record?.payment ??
      0
  );

export const getDebtTitle = (record) =>
  normalizeString(
    record?.title ||
      record?.name ||
      record?.lender ||
      record?.creditor ||
      record?.label ||
      record?.debtName
  ) || "Debt obligation";

const isActiveDebtObligation = (record) =>
  record?.recordKind === DEBT_OBLIGATION_RECORD_KIND &&
  !record?.deletedAt &&
  !record?.deleted_at;

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

  return sortByNewest((records || []).filter(isActiveDebtObligation));
}

export async function upsertDebtObligation(localUserId, payload = {}) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const now = new Date().toISOString();
  const balance = toDebtNumber(
    payload.totalDebt ?? payload.balance ?? payload.amount ?? payload.debt_balance ?? 0
  );
  const monthlyPayment = toDebtNumber(
    payload.monthlyDebt ?? payload.monthlyPayment ?? payload.monthly_payment ?? 0
  );
  const interestRate = toDebtNumber(
    payload.interestRate ?? payload.interest_rate ?? payload.interest ?? 0
  );
  const debtType = normalizeDebtType(payload.debtType ?? payload.type);
  const title =
    normalizeString(
      payload.title || payload.name || payload.lender || payload.creditor || payload.label
    ) || getDebtTitle({ debtType, type: debtType });

  if (balance <= 0 && monthlyPayment <= 0) {
    throw new Error("Enter at least the balance or monthly payment first.");
  }

  const recordId = normalizeString(payload.id) || createDebtObligationId();
  const createdAt = payload.createdAt || payload.created_at || now;

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
    notes: payload.notes || "",
    status: payload.status || "active",
    createdAt,
    created_at: createdAt,
    updatedAt: now,
    updated_at: now,
    deletedAt: null,
    deleted_at: null,
    syncStatus: payload.syncStatus || "local_only",
    source: "local",
  };

  return upsertLocalRecord(DEBT_OBLIGATION_STORE, record, safeLocalUserId);
}

export async function deleteDebtObligation(localUserId, id) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const safeId = normalizeString(id);

  if (!safeId) {
    throw new Error("Debt obligation id is required.");
  }

  return softDeleteLocalRecord(DEBT_OBLIGATION_STORE, safeId, safeLocalUserId);
}

export function summarizeDebtObligations(records = [], options = {}) {
  const safeRecords = (Array.isArray(records) ? records : []).filter(isActiveDebtObligation);
  const totalDebt = safeRecords.reduce((sum, record) => sum + getDebtBalance(record), 0);
  const monthlyDebt = safeRecords.reduce((sum, record) => sum + getMonthlyPayment(record), 0);
  const income = toDebtNumber(options.income);
  const debtRatio = income > 0 ? (monthlyDebt / income) * 100 : monthlyDebt > 0 ? 100 : 0;
  const highestInterestRate = safeRecords.reduce(
    (highest, record) => Math.max(highest, toDebtNumber(record?.interestRate ?? record?.interest_rate)),
    0
  );

  return {
    activeCount: safeRecords.length,
    totalDebt,
    monthlyDebt,
    debtRatio,
    highestInterestRate,
    primaryObligation: safeRecords[0] || null,
  };
}
