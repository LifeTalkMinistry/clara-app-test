/**
 * CLARA Finance Repository
 *
 * Phase 2C — Finance Repository Layer Only
 * Phase 2D-2A — Supabase Legacy addExpense Preparation Only
 *
 * This file creates a dormant finance repository abstraction that will later
 * become the single access point for CLARA finance data.
 *
 * It is intentionally not imported into Dashboard, Expenses, Wallets, Budgets,
 * SavingsGoals, useFinancialData, or any runtime app page/hook yet.
 *
 * This module does not:
 * - redesign UI
 * - change dashboard behavior
 * - migrate Supabase data
 * - replace existing Supabase reads/writes in app pages/hooks
 * - connect IndexedDB to the live dashboard
 * - make live expense writes local
 * - implement Private Sync
 * - implement encryption
 * - implement backup/export/import
 *
 * Architecture references:
 * - docs/clara-data-boundary.md
 * - src/lib/localFinanceStore.js
 */

import { supabase as defaultSupabaseClient } from "./supabaseClient.js";
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

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeLower(value) {
  return normalizeString(value).toLowerCase();
}

function defaultToNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function defaultGetSafeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function defaultGenerateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function defaultNormalizePlanningStatus(value) {
  const normalized = String(value || "planned").trim().toLowerCase();
  return ["planned", "unplanned", "undocumented"].includes(normalized)
    ? normalized
    : "planned";
}

function isMissingColumnError(error) {
  const message = normalizeLower(error?.message || error?.details || error?.hint);

  return (
    error?.code === "PGRST204" ||
    error?.code === "PGRST200" ||
    error?.code === "42703" ||
    message.includes("column") ||
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("unknown")
  );
}

async function defaultSafeInsert(supabaseClient, table, payload) {
  const { error } = await supabaseClient.from(table).insert([payload]);
  if (!error) return payload;

  if (isMissingColumnError(error)) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.updated_at;
    delete fallbackPayload.user_email;
    delete fallbackPayload.owner_email;
    delete fallbackPayload.owner_id;
    delete fallbackPayload.profile_id;

    const { error: fallbackError } = await supabaseClient
      .from(table)
      .insert([fallbackPayload]);

    if (fallbackError) throw fallbackError;
    return fallbackPayload;
  }

  throw error;
}

async function defaultSafeUpdateById(supabaseClient, table, id, payload) {
  const { error } = await supabaseClient.from(table).update(payload).eq("id", id);

  if (!error) return payload;

  if (payload?.updated_at && isMissingColumnError(error)) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.updated_at;

    const { error: fallbackError } = await supabaseClient
      .from(table)
      .update(fallbackPayload)
      .eq("id", id);

    if (fallbackError) throw fallbackError;
    return fallbackPayload;
  }

  throw error;
}

function getSupabaseLegacyContext(repositoryOptions = {}, callOptions = {}) {
  const merged = {
    ...repositoryOptions,
    ...callOptions,
  };

  return {
    supabaseClient: merged.supabase || merged.supabaseClient || defaultSupabaseClient,
    user: merged.user || repositoryOptions.user || {},
    wallets: Array.isArray(merged.wallets)
      ? merged.wallets
      : Array.isArray(repositoryOptions.wallets)
        ? repositoryOptions.wallets
        : [],
    generateId:
      typeof merged.generateId === "function" ? merged.generateId : defaultGenerateId,
    toNumber: typeof merged.toNumber === "function" ? merged.toNumber : defaultToNumber,
    getSafeDate:
      typeof merged.getSafeDate === "function" ? merged.getSafeDate : defaultGetSafeDate,
    normalizePlanningStatus:
      typeof merged.normalizePlanningStatus === "function"
        ? merged.normalizePlanningStatus
        : defaultNormalizePlanningStatus,
    safeInsert: typeof merged.safeInsert === "function" ? merged.safeInsert : null,
    safeUpdateById:
      typeof merged.safeUpdateById === "function" ? merged.safeUpdateById : null,
  };
}

async function runSupabaseLegacyInsert({ context, table, payload }) {
  if (context.safeInsert) {
    const result = await context.safeInsert(table, payload);
    return result || payload;
  }

  return defaultSafeInsert(context.supabaseClient, table, payload);
}

async function runSupabaseLegacyUpdateById({ context, table, id, payload }) {
  if (context.safeUpdateById) {
    const result = await context.safeUpdateById(table, id, payload);
    return result || payload;
  }

  return defaultSafeUpdateById(context.supabaseClient, table, id, payload);
}

function getSupabaseLegacyUser(localUserId, context) {
  const safeLocalUserId = requireLocalUserId(localUserId);

  return {
    id: context.user?.id || safeLocalUserId || null,
    email: context.user?.email || null,
  };
}

async function insertSupabaseLegacyWalletTransaction({ context, payload, user }) {
  const now = new Date().toISOString();

  return runSupabaseLegacyInsert({
    context,
    table: "wallet_transactions",
    payload: {
      id: payload.id || context.generateId(),
      wallet_id: payload.wallet_id ? String(payload.wallet_id) : null,
      amount: context.toNumber(payload.amount),
      type: payload.type,
      category: payload.category || null,
      need_type: payload.need_type || null,
      planning_status: payload.planning_status || null,
      unplanned_reason: payload.unplanned_reason || null,
      expense_id: payload.expense_id || null,
      transfer_group_id: payload.transfer_group_id || null,
      related_wallet_id: payload.related_wallet_id || null,
      source_type: payload.source_type || null,
      tag: payload.tag || null,
      notes: payload.notes || "",
      created_at: payload.created_at || now,
      updated_at: now,
      user_id: user?.id || null,
      user_email: user?.email || null,
      created_by: user?.email || null,
    },
  });
}

async function updateSupabaseLegacyWalletBalance({ context, walletId, amountChange }) {
  const wallet = (context.wallets || []).find(
    (item) => String(item.id) === String(walletId)
  );

  if (!wallet) return null;

  const updatedBalance =
    context.toNumber(wallet?.derived_balance ?? wallet?.balance) + context.toNumber(amountChange);

  return runSupabaseLegacyUpdateById({
    context,
    table: "wallets",
    id: walletId,
    payload: {
      balance: updatedBalance,
      updated_at: new Date().toISOString(),
    },
  });
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

function createNotImplementedRepositoryMethod(methodName, mode) {
  return async () => {
    throw new Error(`${methodName} is not implemented yet for finance repository mode '${mode}'.`);
  };
}

function createSupabaseLegacyFinanceRepository(repositoryOptions = {}) {
  const mode = FINANCE_REPOSITORY_MODE_SUPABASE_LEGACY;

  return {
    getExpenses: createNotImplementedRepositoryMethod("getExpenses", mode),

    async addExpense(localUserId, expense, callOptions = {}) {
      const context = getSupabaseLegacyContext(repositoryOptions, callOptions);
      const user = getSupabaseLegacyUser(localUserId, context);

      assertObjectPayload(expense, "Expense");

      const amount = context.toNumber(expense.amount);
      if (!amount || amount <= 0) {
        throw new Error("Enter a valid expense amount.");
      }

      const planningStatus = context.normalizePlanningStatus(expense.planning_status);

      if (planningStatus === "unplanned" && !String(expense.unplanned_reason || "").trim()) {
        throw new Error("Reason is required for unplanned expenses.");
      }

      const payload = {
        ...expense,
        id: expense.id || context.generateId(),
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
        amount,
        date: context.getSafeDate(expense.date),
        planning_status: planningStatus,
        unplanned_reason:
          planningStatus === "unplanned"
            ? String(expense.unplanned_reason || "").trim()
            : null,
      };

      const insertedExpense = await runSupabaseLegacyInsert({
        context,
        table: "expenses",
        payload,
      });

      let walletUpdate = null;
      let walletTransaction = null;

      if (expense.wallet_id) {
        walletUpdate = await updateSupabaseLegacyWalletBalance({
          context,
          walletId: expense.wallet_id,
          amountChange: -amount,
        });

        walletTransaction = await insertSupabaseLegacyWalletTransaction({
          context,
          user,
          payload: {
            wallet_id: expense.wallet_id,
            amount,
            type: "expense",
            category: expense.category,
            need_type: expense.need_type,
            planning_status: planningStatus,
            unplanned_reason: payload.unplanned_reason,
            expense_id: payload.id,
            notes: expense.notes,
            created_at: payload.date,
          },
        });
      }

      return {
        expense: insertedExpense,
        walletUpdate,
        walletTransaction,
      };
    },

    updateExpense: createNotImplementedRepositoryMethod("updateExpense", mode),
    deleteExpense: createNotImplementedRepositoryMethod("deleteExpense", mode),
    getWallets: createNotImplementedRepositoryMethod("getWallets", mode),
    addWallet: createNotImplementedRepositoryMethod("addWallet", mode),
    updateWallet: createNotImplementedRepositoryMethod("updateWallet", mode),
    deleteWallet: createNotImplementedRepositoryMethod("deleteWallet", mode),
    getWalletTransactions: createNotImplementedRepositoryMethod("getWalletTransactions", mode),
    insertWalletTransaction: createNotImplementedRepositoryMethod("insertWalletTransaction", mode),
    transferBetweenWallets: createNotImplementedRepositoryMethod("transferBetweenWallets", mode),
    getBudgets: createNotImplementedRepositoryMethod("getBudgets", mode),
    upsertBudget: createNotImplementedRepositoryMethod("upsertBudget", mode),
    getSavingsGoals: createNotImplementedRepositoryMethod("getSavingsGoals", mode),
    upsertSavingsGoal: createNotImplementedRepositoryMethod("upsertSavingsGoal", mode),
    getEmergencyFund: createNotImplementedRepositoryMethod("getEmergencyFund", mode),
    upsertEmergencyFund: createNotImplementedRepositoryMethod("upsertEmergencyFund", mode),
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

  if (mode === FINANCE_REPOSITORY_MODE_SUPABASE_LEGACY) {
    return createSupabaseLegacyFinanceRepository(options);
  }

  return createUnsupportedModeRepository(mode);
}

// Dormant default repository export for future phases.
// Do not import into runtime app pages/hooks until Phase 2D-2B or later.
export const financeRepository = createFinanceRepository();

export async function getExpenses(localUserId, options) {
  return financeRepository.getExpenses(localUserId, options);
}

export async function addExpense(localUserId, expense, options) {
  return financeRepository.addExpense(localUserId, expense, options);
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
