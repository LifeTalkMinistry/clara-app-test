/**
 * CLARA Finance Repository
 *
 * Phase 2C — Finance Repository Layer Only
 *
 * This file creates a dormant finance repository abstraction that will later
 * become the single access point for CLARA finance data.
 *
 * It is intentionally not imported into Dashboard, Expenses, Wallets, Budgets,
 * SavingsGoals, or any runtime app page yet.
 *
 * This module does not:
 * - redesign UI
 * - change dashboard behavior
 * - migrate Supabase data
 * - replace existing Supabase reads/writes in app pages
 * - connect IndexedDB to the live dashboard
 * - implement Private Sync
 * - implement encryption
 * - implement backup/export/import
 *
 * Architecture references:
 * - docs/clara-data-boundary.md
 * - src/lib/localFinanceStore.js
 */

import {
  LOCAL_FINANCE_STORES,
  getLocalRecords,
  getLocalRecordById,
  upsertLocalRecord,
  softDeleteLocalRecord,
} from "./localFinanceStore.js";

export const FINANCE_REPOSITORY_MODE_LOCAL = "local";
export const FINANCE_REPOSITORY_MODE_SUPABASE_LEGACY = "supabase_legacy";

export const DEFAULT_FINANCE_REPOSITORY_MODE = FINANCE_REPOSITORY_MODE_LOCAL;

const SORT_ASC = "asc";
const SORT_DESC = "desc";

function requireLocalUserId(localUserId) {
  const safeLocalUserId = String(localUserId || "").trim();

  if (!safeLocalUserId) {
    throw new Error(
      "localUserId is required for private finance repository operations. Refusing to use a guest/global fallback key."
    );
  }

  return safeLocalUserId;
}

function assertObjectPayload(payload, label) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`${label} must be an object.`);
  }
}

function normalizeOptions(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    return {};
  }

  return options;
}

function applyReadOptions(records, options = {}) {
  const safeOptions = normalizeOptions(options);
  let rows = Array.isArray(records) ? [...records] : [];

  if (safeOptions.includeDeleted !== true) {
    rows = rows.filter((record) => !record?.deletedAt);
  }

  if (safeOptions.where && typeof safeOptions.where === "object") {
    rows = rows.filter((record) =>
      Object.entries(safeOptions.where).every(([key, value]) => record?.[key] === value)
    );
  }

  if (safeOptions.sortBy) {
    const sortBy = safeOptions.sortBy;
    const sortDirection = safeOptions.sortDirection === SORT_ASC ? SORT_ASC : SORT_DESC;

    rows.sort((leftRecord, rightRecord) => {
      const left = leftRecord?.[sortBy] ?? "";
      const right = rightRecord?.[sortBy] ?? "";

      if (left === right) return 0;
      if (sortDirection === SORT_ASC) return left > right ? 1 : -1;
      return left < right ? 1 : -1;
    });
  }

  if (Number.isFinite(safeOptions.limit) && safeOptions.limit > 0) {
    rows = rows.slice(0, safeOptions.limit);
  }

  return rows;
}

function makeRepositoryRecord(payload, source = "finance_repository") {
  assertObjectPayload(payload, "Finance repository payload");

  return {
    ...payload,
    source: payload.source || source,
  };
}

async function getLocalStoreRecords(storeName, localUserId, options = {}) {
  const safeLocalUserId = requireLocalUserId(localUserId);
  const records = await getLocalRecords(storeName, safeLocalUserId);
  return applyReadOptions(records, options);
}

async function addLocalStoreRecord(storeName, localUserId, payload, label) {
  const safeLocalUserId = requireLocalUserId(localUserId);
  assertObjectPayload(payload, label);
  return upsertLocalRecord(storeName, makeRepositoryRecord(payload), safeLocalUserId);
}

async function updateLocalStoreRecord(storeName, localUserId, id, patch, label) {
  const safeLocalUserId = requireLocalUserId(localUserId);

  if (!id) {
    throw new Error(`${label} id is required.`);
  }

  assertObjectPayload(patch, `${label} patch`);

  const existingRecord = await getLocalRecordById(storeName, id, safeLocalUserId);

  if (!existingRecord) {
    throw new Error(`${label} not found for this local user.`);
  }

  return upsertLocalRecord(
    storeName,
    makeRepositoryRecord({
      ...existingRecord,
      ...patch,
      id: existingRecord.id,
      localUserId: safeLocalUserId,
      createdAt: existingRecord.createdAt,
    }),
    safeLocalUserId
  );
}

async function deleteLocalStoreRecord(storeName, localUserId, id, label) {
  const safeLocalUserId = requireLocalUserId(localUserId);

  if (!id) {
    throw new Error(`${label} id is required.`);
  }

  return softDeleteLocalRecord(storeName, id, safeLocalUserId);
}

function createLocalFinanceRepository() {
  return {
    async getExpenses(localUserId, options = {}) {
      return getLocalStoreRecords(LOCAL_FINANCE_STORES.expenses, localUserId, {
        sortBy: "createdAt",
        sortDirection: SORT_DESC,
        ...options,
      });
    },

    async addExpense(localUserId, expense) {
      return addLocalStoreRecord(
        LOCAL_FINANCE_STORES.expenses,
        localUserId,
        expense,
        "Expense"
      );
    },

    async updateExpense(localUserId, expenseId, patch) {
      return updateLocalStoreRecord(
        LOCAL_FINANCE_STORES.expenses,
        localUserId,
        expenseId,
        patch,
        "Expense"
      );
    },

    async deleteExpense(localUserId, expenseId) {
      return deleteLocalStoreRecord(
        LOCAL_FINANCE_STORES.expenses,
        localUserId,
        expenseId,
        "Expense"
      );
    },

    async getWallets(localUserId, options = {}) {
      return getLocalStoreRecords(LOCAL_FINANCE_STORES.wallets, localUserId, {
        sortBy: "createdAt",
        sortDirection: SORT_ASC,
        ...options,
      });
    },

    async addWallet(localUserId, wallet) {
      return addLocalStoreRecord(
        LOCAL_FINANCE_STORES.wallets,
        localUserId,
        wallet,
        "Wallet"
      );
    },

    async updateWallet(localUserId, walletId, patch) {
      return updateLocalStoreRecord(
        LOCAL_FINANCE_STORES.wallets,
        localUserId,
        walletId,
        patch,
        "Wallet"
      );
    },

    async deleteWallet(localUserId, walletId) {
      return deleteLocalStoreRecord(
        LOCAL_FINANCE_STORES.wallets,
        localUserId,
        walletId,
        "Wallet"
      );
    },

    async getWalletTransactions(localUserId, options = {}) {
      return getLocalStoreRecords(LOCAL_FINANCE_STORES.walletTransactions, localUserId, {
        sortBy: "createdAt",
        sortDirection: SORT_DESC,
        ...options,
      });
    },

    async insertWalletTransaction(localUserId, transaction) {
      return addLocalStoreRecord(
        LOCAL_FINANCE_STORES.walletTransactions,
        localUserId,
        transaction,
        "Wallet transaction"
      );
    },

    async transferBetweenWallets(localUserId, transferPayload) {
      return addLocalStoreRecord(
        LOCAL_FINANCE_STORES.transfers,
        localUserId,
        transferPayload,
        "Transfer payload"
      );
    },

    async getBudgets(localUserId, options = {}) {
      return getLocalStoreRecords(LOCAL_FINANCE_STORES.budgets, localUserId, {
        sortBy: "updatedAt",
        sortDirection: SORT_DESC,
        ...options,
      });
    },

    async upsertBudget(localUserId, budget) {
      return addLocalStoreRecord(
        LOCAL_FINANCE_STORES.budgets,
        localUserId,
        budget,
        "Budget"
      );
    },

    async getSavingsGoals(localUserId, options = {}) {
      return getLocalStoreRecords(LOCAL_FINANCE_STORES.savingsGoals, localUserId, {
        sortBy: "createdAt",
        sortDirection: SORT_ASC,
        ...options,
      });
    },

    async upsertSavingsGoal(localUserId, goal) {
      return addLocalStoreRecord(
        LOCAL_FINANCE_STORES.savingsGoals,
        localUserId,
        goal,
        "Savings goal"
      );
    },

    async getEmergencyFund(localUserId) {
      const safeLocalUserId = requireLocalUserId(localUserId);
      const records = await getLocalRecords(LOCAL_FINANCE_STORES.emergencyFund, safeLocalUserId);
      return records.find((record) => !record.deletedAt) || null;
    },

    async upsertEmergencyFund(localUserId, emergencyFund) {
      const safeLocalUserId = requireLocalUserId(localUserId);
      assertObjectPayload(emergencyFund, "Emergency fund");
      const existingEmergencyFund = await this.getEmergencyFund(safeLocalUserId);

      return upsertLocalRecord(
        LOCAL_FINANCE_STORES.emergencyFund,
        makeRepositoryRecord({
          ...existingEmergencyFund,
          ...emergencyFund,
          id:
            emergencyFund.id ||
            existingEmergencyFund?.id ||
            `emergency_fund:${safeLocalUserId}`,
        }),
        safeLocalUserId
      );
    },
  };
}

function createUnsupportedModeRepository(mode) {
  const createReservedMethod = (methodName) => async () => {
    throw new Error(
      `${methodName} is not available because finance repository mode '${mode}' is reserved for a future phase.`
    );
  };

  return {
    getExpenses: createReservedMethod("getExpenses"),
    addExpense: createReservedMethod("addExpense"),
    updateExpense: createReservedMethod("updateExpense"),
    deleteExpense: createReservedMethod("deleteExpense"),
    getWallets: createReservedMethod("getWallets"),
    addWallet: createReservedMethod("addWallet"),
    updateWallet: createReservedMethod("updateWallet"),
    deleteWallet: createReservedMethod("deleteWallet"),
    getWalletTransactions: createReservedMethod("getWalletTransactions"),
    insertWalletTransaction: createReservedMethod("insertWalletTransaction"),
    transferBetweenWallets: createReservedMethod("transferBetweenWallets"),
    getBudgets: createReservedMethod("getBudgets"),
    upsertBudget: createReservedMethod("upsertBudget"),
    getSavingsGoals: createReservedMethod("getSavingsGoals"),
    upsertSavingsGoal: createReservedMethod("upsertSavingsGoal"),
    getEmergencyFund: createReservedMethod("getEmergencyFund"),
    upsertEmergencyFund: createReservedMethod("upsertEmergencyFund"),
  };
}

export function createFinanceRepository(options = {}) {
  const mode = options.mode || DEFAULT_FINANCE_REPOSITORY_MODE;

  if (mode === FINANCE_REPOSITORY_MODE_LOCAL) {
    return createLocalFinanceRepository();
  }

  return createUnsupportedModeRepository(mode);
}

// Dormant default repository export for future phases.
// Do not import into runtime app pages until Phase 2D or later.
export const financeRepository = createFinanceRepository();

export async function getExpenses(localUserId, options) {
  return financeRepository.getExpenses(localUserId, options);
}

export async function addExpense(localUserId, expense) {
  return financeRepository.addExpense(localUserId, expense);
}

export async function updateExpense(localUserId, expenseId, patch) {
  return financeRepository.updateExpense(localUserId, expenseId, patch);
}

export async function deleteExpense(localUserId, expenseId) {
  return financeRepository.deleteExpense(localUserId, expenseId);
}

export async function getWallets(localUserId, options) {
  return financeRepository.getWallets(localUserId, options);
}

export async function addWallet(localUserId, wallet) {
  return financeRepository.addWallet(localUserId, wallet);
}

export async function updateWallet(localUserId, walletId, patch) {
  return financeRepository.updateWallet(localUserId, walletId, patch);
}

export async function deleteWallet(localUserId, walletId) {
  return financeRepository.deleteWallet(localUserId, walletId);
}

export async function getWalletTransactions(localUserId, options) {
  return financeRepository.getWalletTransactions(localUserId, options);
}

export async function insertWalletTransaction(localUserId, transaction) {
  return financeRepository.insertWalletTransaction(localUserId, transaction);
}

export async function transferBetweenWallets(localUserId, transferPayload) {
  return financeRepository.transferBetweenWallets(localUserId, transferPayload);
}

export async function getBudgets(localUserId, options) {
  return financeRepository.getBudgets(localUserId, options);
}

export async function upsertBudget(localUserId, budget) {
  return financeRepository.upsertBudget(localUserId, budget);
}

export async function getSavingsGoals(localUserId, options) {
  return financeRepository.getSavingsGoals(localUserId, options);
}

export async function upsertSavingsGoal(localUserId, goal) {
  return financeRepository.upsertSavingsGoal(localUserId, goal);
}

export async function getEmergencyFund(localUserId) {
  return financeRepository.getEmergencyFund(localUserId);
}

export async function upsertEmergencyFund(localUserId, emergencyFund) {
  return financeRepository.upsertEmergencyFund(localUserId, emergencyFund);
}
