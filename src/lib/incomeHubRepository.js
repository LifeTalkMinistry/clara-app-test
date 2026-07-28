import {
  LOCAL_FINANCE_STORES,
  getLocalRecords,
  upsertLocalRecord,
  softDeleteLocalRecord,
  runLocalFinanceTransaction,
} from "./localFinanceStore.js";
import {
  ACTIVE_CURRENT_STATE_KEY,
  SAMPLE_DATA_LOCAL_USER_ID,
} from "./clara-young-professional-current-state.js";

const STORE_NAME = LOCAL_FINANCE_STORES?.privatePreferences || "private_preferences";
const WALLET_STORE = LOCAL_FINANCE_STORES?.wallets || "wallets";
const WALLET_TRANSACTION_STORE = LOCAL_FINANCE_STORES?.walletTransactions || "wallet_transactions";
const RECORD_KIND = "income_source";
const INCOME_ACTIVITY_LIMIT = 60;

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
    const num = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(num) ? num : 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const nowIso = () => new Date().toISOString();

const createIncomeActivityId = (type = "activity") => {
  const safeType = String(type || "activity").replace(/[^a-zA-Z0-9_-]/g, "_");
  if (globalThis?.crypto?.randomUUID) return `income_${safeType}_${globalThis.crypto.randomUUID()}`;
  return `income_${safeType}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export function getIncomeSourceActivityLog(source = {}) {
  const log = source?.incomeActivityLog ?? source?.income_activity_log ?? [];
  return Array.isArray(log) ? log.filter(Boolean) : [];
}

export function appendIncomeSourceActivity(source = {}, activity = {}) {
  const timestamp = activity.createdAt || activity.created_at || nowIso();
  const nextActivity = {
    ...activity,
    id: activity.id || createIncomeActivityId(activity.type),
    sourceId: activity.sourceId || activity.source_id || source?.id || null,
    source_id: activity.source_id || activity.sourceId || source?.id || null,
    sourceName: activity.sourceName || activity.source_name || source?.name || "Income Source",
    source_name: activity.source_name || activity.sourceName || source?.name || "Income Source",
    createdAt: timestamp,
    created_at: timestamp,
  };

  return [nextActivity, ...getIncomeSourceActivityLog(source)]
    .filter((item, index, items) => items.findIndex((candidate) => candidate?.id === item?.id) === index)
    .slice(0, INCOME_ACTIVITY_LIMIT);
}

const emitFinanceUpdated = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("clara-finance-updated"));
};

const getWalletStoredBalance = (wallet = {}) =>
  toIncomeHubNumber(
    wallet?.balance ??
      wallet?.current_balance ??
      wallet?.wallet_balance ??
      wallet?.available_balance ??
      wallet?.starting_balance ??
      0
  );

const emitIncomeHubUpdated = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("clara-income-hub-updated"));
};

const createId = () => {
  if (globalThis?.crypto?.randomUUID) return `income_source_${globalThis.crypto.randomUUID()}`;
  return `income_source_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
};

const getSourceMoneyIn = (source) => toIncomeHubNumber(source?.totalMoneyIn ?? source?.total_money_in);
const getSourceMoneyOut = (source) => toIncomeHubNumber(source?.totalMoneyOut ?? source?.total_money_out);
const getSourceBalance = (source) =>
  toIncomeHubNumber(source?.currentBalance ?? source?.current_balance ?? getSourceMoneyIn(source) - getSourceMoneyOut(source));

function getActiveSampleDataUserId() {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(ACTIVE_CURRENT_STATE_KEY) || "null");
    if (parsed?.mode !== "current_state" || parsed?.dataMode !== "sample_data") return null;
    return String(parsed.demoLocalUserId || SAMPLE_DATA_LOCAL_USER_ID).trim() || SAMPLE_DATA_LOCAL_USER_ID;
  } catch {
    return null;
  }
}

function getIncomeHubReadUserId(localUserId) {
  const sampleUserId = getActiveSampleDataUserId();
  if (sampleUserId && String(localUserId || "") !== sampleUserId) return sampleUserId;
  return localUserId;
}

export function getIncomeHubLocalUserId(user) {
  const value = user?.id || user?.email || "local-user";
  return String(value || "local-user").trim() || "local-user";
}

export function getIncomeSourceRemovalPlan(source = {}) {
  const currentBalance = getSourceBalance(source);
  const totalMoneyIn = getSourceMoneyIn(source);
  const totalMoneyOut = getSourceMoneyOut(source);
  const hasActivity = totalMoneyIn > 0 || totalMoneyOut > 0;

  if (currentBalance > 0) {
    return {
      type: "blocked_balance",
      title: "Cannot delete yet",
      message: "This income source still has remaining money. Please transfer or clear the balance before deleting it.",
      primaryLabel: "Transfer Money",
      secondaryLabel: "Cancel",
      danger: false,
      currentBalance,
      hasActivity,
    };
  }

  if (hasActivity) {
    return {
      type: "archive",
      title: "Archive income source?",
      message:
        "This income source has past activity. To keep your records accurate, CLARA will archive it instead of permanently deleting it. It will disappear from your active income sources, but past transactions will remain in your history.",
      primaryLabel: "Archive Income Source",
      secondaryLabel: "Cancel",
      danger: true,
      currentBalance,
      hasActivity,
    };
  }

  return {
    type: "delete",
    title: "Delete income source?",
    message: "This income source has no recorded activity. You can safely delete it.",
    primaryLabel: "Delete Income Source",
    secondaryLabel: "Cancel",
    danger: true,
    currentBalance,
    hasActivity,
  };
}

export function normalizeIncomeSource(source = {}) {
  const timestamp = nowIso();
  const totalMoneyIn = toIncomeHubNumber(source.totalMoneyIn ?? source.total_money_in ?? source.moneyIn ?? source.money_in);
  const totalMoneyOut = toIncomeHubNumber(source.totalMoneyOut ?? source.total_money_out ?? source.moneyOut ?? source.money_out);
  const currentBalance = toIncomeHubNumber(source.currentBalance ?? source.current_balance ?? source.balance ?? totalMoneyIn - totalMoneyOut);
  const category = INCOME_SOURCE_CATEGORIES.includes(source.category) ? source.category : "Other Income";
  const stability = INCOME_SOURCE_STABILITY.includes(source.stability) ? source.stability : "Irregular";
  const isArchived = Boolean(source.isArchived ?? source.is_archived ?? false);
  const archivedAt = source.archivedAt || source.archived_at || null;

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
    isArchived,
    is_archived: isArchived,
    archivedAt,
    archived_at: archivedAt,
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
  const readLocalUserId = getIncomeHubReadUserId(localUserId);
  const records = await getLocalRecords(STORE_NAME, readLocalUserId);
  return sortNewest(
    (records || []).filter(
      (record) =>
        !record?.deletedAt &&
        !record?.deleted_at &&
        !record?.isArchived &&
        !record?.is_archived &&
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
  if (!existingSource) throw new Error("Income source not found for this local user.");
  return upsertIncomeSource(localUserId, { ...existingSource, ...patch, id: existingSource.id, createdAt: existingSource.createdAt, created_at: existingSource.created_at });
}

export async function addMoneyToIncomeSource(localUserId, id, rawAmount) {
  if (!id) throw new Error("Income source id is required.");
  const amount = toIncomeHubNumber(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter an amount greater than zero.");

  const updatedSource = await runLocalFinanceTransaction(
    [STORE_NAME],
    localUserId,
    async (tx) => {
      const source = await tx.get(STORE_NAME, id);
      if (!source || (source.kind !== RECORD_KIND && source.recordType !== RECORD_KIND)) {
        throw new Error("Income source was not found on this device.");
      }

      const timestamp = tx.nowIso();
      const currentIn = getSourceMoneyIn(source);
      const currentOut = getSourceMoneyOut(source);
      const nextIn = currentIn + amount;
      const nextBalance = nextIn - currentOut;
      const activityLog = appendIncomeSourceActivity(source, {
        type: "add_money",
        amount,
        balanceAfter: nextBalance,
        balance_after: nextBalance,
        createdAt: timestamp,
      });

      return tx.put(
        STORE_NAME,
        normalizeIncomeSource({
          ...source,
          totalMoneyIn: nextIn,
          total_money_in: nextIn,
          totalMoneyOut: currentOut,
          total_money_out: currentOut,
          currentBalance: nextBalance,
          current_balance: nextBalance,
          lastActivityAt: timestamp,
          last_activity_at: timestamp,
          incomeActivityLog: activityLog,
          income_activity_log: activityLog,
        }),
        source
      );
    }
  );

  emitIncomeHubUpdated();
  return updatedSource;
}

export async function transferIncomeSourceToWallet(
  localUserId,
  { sourceId, destinationWalletId, amount: rawAmount, date, notes = "" } = {}
) {
  if (!sourceId) throw new Error("Income source id is required.");
  if (!destinationWalletId) throw new Error("Choose a destination wallet.");

  const amount = toIncomeHubNumber(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter an amount greater than zero.");

  const result = await runLocalFinanceTransaction(
    [STORE_NAME, WALLET_STORE, WALLET_TRANSACTION_STORE],
    localUserId,
    async (tx) => {
      const source = await tx.get(STORE_NAME, sourceId);
      if (!source || (source.kind !== RECORD_KIND && source.recordType !== RECORD_KIND)) {
        throw new Error("Income source was not found on this device.");
      }

      const wallet = await tx.get(WALLET_STORE, destinationWalletId);
      if (!wallet) throw new Error("Destination wallet was not found on this device.");

      const currentIn = getSourceMoneyIn(source);
      const currentOut = getSourceMoneyOut(source);
      const currentBalance = getSourceBalance(source);
      if (amount > currentBalance) {
        const error = new Error("The transfer is higher than the available income-source balance.");
        error.code = "INCOME_SOURCE_INSUFFICIENT_BALANCE";
        throw error;
      }

      const timestamp = tx.nowIso();
      const localDate = String(date || "").trim() || timestamp;
      const nextOut = currentOut + amount;
      const nextSourceBalance = currentIn - nextOut;
      const nextWalletBalance = getWalletStoredBalance(wallet) + amount;
      const walletTransactionId = tx.createId(WALLET_TRANSACTION_STORE);
      const activityLog = appendIncomeSourceActivity(source, {
        type: "transfer_money",
        amount,
        destinationWalletId,
        destination_wallet_id: destinationWalletId,
        destinationWalletName: wallet?.name || wallet?.wallet_name || wallet?.title || "Wallet",
        destination_wallet_name: wallet?.name || wallet?.wallet_name || wallet?.title || "Wallet",
        walletTransactionId,
        wallet_transaction_id: walletTransactionId,
        balanceAfter: nextSourceBalance,
        balance_after: nextSourceBalance,
        createdAt: timestamp,
      });

      const walletUpdate = await tx.put(
        WALLET_STORE,
        {
          ...wallet,
          balance: nextWalletBalance,
          current_balance: nextWalletBalance,
          wallet_balance: nextWalletBalance,
          available_balance: nextWalletBalance,
          updatedAt: timestamp,
          updated_at: timestamp,
          syncStatus: "local_only",
          source: "local",
        },
        wallet
      );

      const walletTransaction = await tx.put(WALLET_TRANSACTION_STORE, {
        id: walletTransactionId,
        wallet_id: destinationWalletId,
        walletId: destinationWalletId,
        amount,
        type: "income",
        category: "Income Source Transfer",
        source_type: source?.name || "Income Source",
        sourceType: source?.name || "Income Source",
        notes: String(notes || "").trim() || `Transfer from ${source?.name || "Income Source"}`,
        date: localDate,
        transaction_date: localDate,
        created_at: localDate,
        updated_at: timestamp,
        income_source_id: source.id,
        incomeSourceId: source.id,
        income_flow_type: "income_source_transfer",
        incomeFlowType: "income_source_transfer",
        deletedAt: null,
        syncStatus: "local_only",
        source: "local",
      });

      const sourceUpdate = await tx.put(
        STORE_NAME,
        normalizeIncomeSource({
          ...source,
          totalMoneyIn: currentIn,
          total_money_in: currentIn,
          totalMoneyOut: nextOut,
          total_money_out: nextOut,
          currentBalance: nextSourceBalance,
          current_balance: nextSourceBalance,
          lastActivityAt: timestamp,
          last_activity_at: timestamp,
          incomeActivityLog: activityLog,
          income_activity_log: activityLog,
        }),
        source
      );

      return { source: sourceUpdate, wallet: walletUpdate, walletTransaction };
    }
  );

  emitIncomeHubUpdated();
  emitFinanceUpdated();
  return result;
}

export async function archiveIncomeSource(localUserId, id) {
  if (!id) throw new Error("Income source id is required.");

  const sources = await getIncomeSources(localUserId);
  const existingSource = sources.find((source) => String(source.id) === String(id));
  if (!existingSource) throw new Error("Income source not found for this local user.");

  const timestamp = nowIso();
  const archivedSource = await upsertLocalRecord(
    STORE_NAME,
    normalizeIncomeSource({
      ...existingSource,
      id: existingSource.id,
      isArchived: true,
      is_archived: true,
      archivedAt: timestamp,
      archived_at: timestamp,
      createdAt: existingSource.createdAt,
      created_at: existingSource.created_at,
    }),
    localUserId
  );

  emitIncomeHubUpdated();
  return archivedSource;
}

export async function deleteIncomeSource(localUserId, id) {
  if (!id) throw new Error("Income source id is required.");

  const sources = await getIncomeSources(localUserId);
  const existingSource = sources.find((source) => String(source.id) === String(id));
  if (!existingSource) throw new Error("Income source not found for this local user.");

  const removalPlan = getIncomeSourceRemovalPlan(existingSource);

  if (removalPlan.type === "blocked_balance") {
    const blockedError = new Error("This income source still has remaining money.");
    blockedError.code = "INCOME_SOURCE_HAS_BALANCE";
    blockedError.removalPlan = removalPlan;
    throw blockedError;
  }

  if (removalPlan.type === "archive") {
    return archiveIncomeSource(localUserId, id);
  }

  const deletedSource = await softDeleteLocalRecord(STORE_NAME, id, localUserId);
  emitIncomeHubUpdated();
  return deletedSource;
}
