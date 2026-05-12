import {
  LOCAL_FINANCE_STORES,
  getLocalRecords,
  upsertLocalRecord,
  softDeleteLocalRecord,
} from "@/lib/localFinanceStore";

export const INVESTMENT_RECORD_KIND = "investment_position";
export const INVESTMENT_STORE = LOCAL_FINANCE_STORES?.privatePreferences || "private_preferences";

const normalizeLocalUserId = (localUserId) => {
  const safeLocalUserId = String(localUserId || "").trim();
  if (!safeLocalUserId) throw new Error("localUserId is required to save CLARA investments.");
  return safeLocalUserId;
};

const normalizeString = (value) => String(value ?? "").trim();

export const toInvestmentNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : 0;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const createInvestmentId = () => {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return `investment_${globalThis.crypto.randomUUID()}`;
  }
  return `investment_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeInvestmentType = (value) => normalizeString(value).toLowerCase() || "business";

const isActiveInvestment = (record) =>
  record?.recordKind === INVESTMENT_RECORD_KIND && !record?.deletedAt && !record?.deleted_at;

const sortByNewest = (records = []) =>
  [...records].sort((left, right) => {
    const leftTime = new Date(left?.updatedAt || left?.updated_at || left?.createdAt || left?.created_at || 0).getTime();
    const rightTime = new Date(right?.updatedAt || right?.updated_at || right?.createdAt || right?.created_at || 0).getTime();
    return rightTime - leftTime;
  });

export const getInvestmentTitle = (record) =>
  normalizeString(record?.title || record?.name || record?.platform || record?.label || record?.investmentName) ||
  "Investment";

export const getInvestmentValue = (record) =>
  toInvestmentNumber(record?.currentValue ?? record?.value ?? record?.amount ?? record?.market_value ?? 0);

export const getInvestmentContribution = (record) =>
  toInvestmentNumber(record?.monthlyContribution ?? record?.monthly_contribution ?? record?.contribution ?? 0);

export async function getInvestments(localUserId) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const records = await getLocalRecords(INVESTMENT_STORE, safeLocalUserId);
  return sortByNewest((records || []).filter(isActiveInvestment));
}

export async function upsertInvestment(localUserId, payload = {}) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const now = new Date().toISOString();
  const currentValue = toInvestmentNumber(payload.currentValue ?? payload.value ?? payload.amount ?? 0);
  const monthlyContribution = toInvestmentNumber(
    payload.monthlyContribution ?? payload.monthly_contribution ?? payload.contribution ?? 0
  );
  const investmentType = normalizeInvestmentType(payload.investmentType ?? payload.type);
  const title = normalizeString(payload.title || payload.name || payload.platform || payload.label) ||
    getInvestmentTitle({ investmentType, type: investmentType });

  if (currentValue <= 0 && monthlyContribution <= 0) {
    throw new Error("Enter the current value or monthly contribution first.");
  }

  const recordId = normalizeString(payload.id) || createInvestmentId();
  const createdAt = payload.createdAt || payload.created_at || now;

  const record = {
    ...(payload || {}),
    id: recordId,
    recordKind: INVESTMENT_RECORD_KIND,
    localUserId: safeLocalUserId,
    title,
    name: title,
    label: title,
    type: investmentType,
    investmentType,
    currentValue,
    value: currentValue,
    amount: currentValue,
    monthlyContribution,
    monthly_contribution: monthlyContribution,
    riskType: payload.riskType || payload.risk_type || "medium",
    risk_type: payload.risk_type || payload.riskType || "medium",
    goal: payload.goal || "",
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

  return upsertLocalRecord(INVESTMENT_STORE, record, safeLocalUserId);
}

export async function deleteInvestment(localUserId, id) {
  const safeLocalUserId = normalizeLocalUserId(localUserId);
  const safeId = normalizeString(id);
  if (!safeId) throw new Error("Investment id is required.");
  return softDeleteLocalRecord(INVESTMENT_STORE, safeId, safeLocalUserId);
}

export function summarizeInvestments(records = []) {
  const safeRecords = (Array.isArray(records) ? records : []).filter(isActiveInvestment);
  const totalValue = safeRecords.reduce((sum, record) => sum + getInvestmentValue(record), 0);
  const monthlyContribution = safeRecords.reduce((sum, record) => sum + getInvestmentContribution(record), 0);

  return {
    activeCount: safeRecords.length,
    totalValue,
    monthlyContribution,
    primaryInvestment: safeRecords[0] || null,
  };
}
