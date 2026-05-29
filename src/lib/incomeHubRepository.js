import {
  LOCAL_FINANCE_STORES,
  getLocalRecords,
  upsertLocalRecord,
  softDeleteLocalRecord,
} from "./localFinanceStore.js";
import { readClaraDevIdentityOverride } from "./clara-dev-simulator";

const STORE_NAME = LOCAL_FINANCE_STORES?.privatePreferences || "private_preferences";
const RECORD_KIND = "income_source";
const DEMO_LOCAL_USER_ID = "clara-demo-user";

export const INCOME_SOURCE_CATEGORIES = [
  "Salary",
  "Business",
  "Side Hustle",
  "Freelance",
  "Commission",
  "Allowance",
  "Support / Remittance",
  "Other Income",
];

export const INCOME_SOURCE_STABILITY = ["Stable", "Seasonal", "Irregular", "Testing"];

export const toIncomeHubNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const nowIso = () => new Date().toISOString();

const emitIncomeHubUpdated = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("clara-income-hub-updated"));
};

const createId = () => {
  if (globalThis?.crypto?.randomUUID) {
    return `income_source_${globalThis.crypto.randomUUID()}`;
  }

  return `income_source_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
};

function getFinanceIdentityMode() {
  try {
    return readClaraDevIdentityOverride()?.scenarioId || "real_user";
  } catch {
    return "real_user";
  }
}

export function getIncomeHubLocalUserId(user) {
  if (getFinanceIdentityMode() === "demo_user") {
    return DEMO_LOCAL_USER_ID;
  }

  const value = user?.id || user?.email || "local-user";
  return String(value || "local-user").trim() || "local-user";
}

export function normalizeIncomeSource(source = {}) {
  const timestamp = nowIso();
  const totalMoneyIn = toIncomeHubNumber(source.totalMoneyIn ?? source.total_money_in ?? source.moneyIn ?? source.money_in);
  const totalMoneyOut = toIncomeHubNumber(
    source.totalMoneyOut ?? source.total_money_out ?? source.moneyOut ?? source.money_out
  );
  const currentBalance = toIncomeHubNumber(
    source.currentBalance ?? source.current_balance ?? source.balance ?? totalMoneyIn - totalMoneyOut
  );
  const category = INCOME_SOURCE_CATEGORIES.includes(source.category) ? source.category : "Other Income";
  const stability = INCOME_SOURCE_STABILITY.includes(source.stability) ? source.stability : "Irregular";

  return {
    ...source,
    id: source.id || createId(),
    kind: RECORD_KIND,
    recordType: RECORD_KIND,
    name: String(source.name || source.title || category).trim() || category,
    category,
    stability,
    totalMoneyIn,
    total_money_in: totalMoneyIn,
    totalMoneyOut,
    total_money_out: totalMoneyOut,
    currentBalance,
    current_balance: currentBalance,
    notes: source.notes || source.description || "",
    lastActivityAt: source.lastActivityAt || source.last_activity_at || null,
    last_activity_at: source.last_activity_at || source.lastActivityAt || null,
    createdAt: source.createdAt || source.created_at || timestamp,
    created_at: source.created_at || source.createdAt || timestamp,
    updatedAt: timestamp,
    updated_at: timestamp,
    deletedAt: source.deletedAt ?? source.deleted_at ?? null,
    deleted_at: source.deleted_at ?? source.deletedAt ?? null,
    syncStatus: source.syncStatus || "local_only",
    source: source.source || "local",
  };
}

const sortNewest = (sources) =>
  [...(Array.isArray(sources) ? sources : [])].sort((a, b) => {
    const aTime = new Date(a?.lastActivityAt || a?.last_activity_at || a?.updatedAt || a?.createdAt || 0).getTime();
    const bTime = new Date(b?.lastActivityAt || b?.last_activity_at || b?.updatedAt || b?.createdAt || 0).getTime();
    return bTime - aTime;
  });

export async function getIncomeSources(localUserId) {
  const records = await getLocalRecords(STORE_NAME, localUserId);

  return sortNewest(
    (records || []).filter(
      (record) =>
        !record?.deletedAt &&
        !record?.deleted_at &&
        (record?.kind === RECORD_KIND || record?.recordType === RECORD_KIND)
    )
  );
}

export async function upsertIncomeSource(localUserId, source) {
  const savedSource = await upsertLocalRecord(STORE_NAME, normalizeIncomeSource(source), localUserId);
  emitIncomeHubUpdated();
  return savedSource;
}

export async function updateIncomeSource(localUserId, id, patch = {}) {
  if (!id) throw new Error("Income source id is required.");

  const sources = await getIncomeSources(localUserId);
  const existingSource = sources.find((source) => String(source.id) === String(id));

  if (!existingSource) {
    throw new Error("Income source not found for this local user.");
  }

  return upsertIncomeSource(localUserId, {
    ...existingSource,
    ...patch,
    id: existingSource.id,
    createdAt: existingSource.createdAt,
    created_at: existingSource.created_at,
  });
}

export async function deleteIncomeSource(localUserId, id) {
  if (!id) throw new Error("Income source id is required.");
  const deletedSource = await softDeleteLocalRecord(STORE_NAME, id, localUserId);
  emitIncomeHubUpdated();
  return deletedSource;
}
