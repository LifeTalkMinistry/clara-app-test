/**
 * CLARA Finance Repository
 *
 * Phase 2C — Finance Repository Layer Only
 * Phase 2D-2A — Supabase Legacy addExpense Preparation Only
 * Phase 2D-3A — Supabase Legacy update/delete Expense Preparation Only
 * Phase 2D-4B — Supabase Legacy wallet CRUD Preparation Only
 * Phase LOCAL-1 — Dormant Local Finance Transaction Engine Only
 *
 * This file creates a dormant finance repository abstraction that will later
 * become the single access point for CLARA finance data.
 *
 * This module does not:
 * - redesign UI
 * - change dashboard behavior
 * - migrate Supabase data
 * - replace all existing Supabase reads/writes in app pages/hooks
 * - connect IndexedDB to the live dashboard
 * - make live wallet writes local
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
  runLocalFinanceTransaction,
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

function defaultGenerateId(prefix = "finance") {
  const safePrefix = String(prefix || "finance").replace(/[^a-zA-Z0-9_-]/g, "_");

  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${safePrefix}_${crypto.randomUUID()}`;
  }

  return `${safePrefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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

async function defaultDeleteById(supabaseClient, table, id) {
  const { error } = await supabaseClient.from(table).delete().eq("id", id);
  if (error) throw error;
  return true;
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
    expenses: Array.isArray(merged.expenses)
      ? merged.expenses
      : Array.isArray(repositoryOptions.expenses)
        ? repositoryOptions.expenses
        : [],
    walletTransactions: Array.isArray(merged.walletTransactions)
      ? merged.walletTransactions
      : Array.isArray(repositoryOptions.walletTransactions)
        ? repositoryOptions.walletTransactions
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

async function runSupabaseLegacyDeleteById({ context, table, id }) {
  return defaultDeleteById(context.supabaseClient, table, id);
}

function getSupabaseLegacyUser(localUserId, context) {
  const safeLocalUserId = requireLocalUserId(localUserId);

  return {
    id: context.user?.id || safeLocalUserId || null,
    email: context.user?.email || null,
  };
}

function findSupabaseLegacyExpense(context, expenseId) {
  return (context.expenses || []).find((expense) => String(expense?.id) === String(expenseId));
}

function findSupabaseLegacyLinkedExpenseTransaction(context, expense) {
  if (!expense) return null;

  return (context.walletTransactions || []).find(
    (txn) =>
      String(txn?.expense_id || "") === String(expense.id) ||
      (String(txn?.type || "").toLowerCase() === "expense" &&
        String(txn?.wallet_id || "") === String(expense?.wallet_id || "") &&
        context.toNumber(txn?.amount) === context.toNumber(expense?.amount))
  );
}

async function insertSupabaseLegacyWalletTransaction({ context, payload, user }) {
  const now = new Date().toISOString();

  return runSupabaseLegacyInsert({
    context,
    table: "wallet_transactions",
    payload: {
      id: payload.id || context.generateId("wallet_transaction"),
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
      updated_at: payload.updated_at || now,
      user_id: user?.id || null,
      user_email: user?.email || null,
      created_by: user?.email || null,
    },
  });
}

async function updateSupabaseLegacyWalletBalance({ context, walletId, amountChange }) {
  const safeWalletId = String(walletId || "").trim();

  if (!safeWalletId) return null;

  let liveWallet = null;

  try {
    const { data, error } = await context.supabaseClient
      .from("wallets")
      .select("*")
      .eq("id", safeWalletId)
      .limit(1);

    if (!error && Array.isArray(data) && data[0]) {
      liveWallet = data[0];
    }
  } catch {
    liveWallet = null;
  }

  const fallbackWallet = (context.wallets || []).find(
    (item) => String(item.id) === safeWalletId
  );

  const wallet = liveWallet || fallbackWallet;

  if (!wallet) return null;

  const currentBalance = context.toNumber(
    wallet?.balance ??
      wallet?.current_balance ??
      wallet?.wallet_balance ??
      wallet?.available_balance ??
      wallet?.starting_balance ??
      0
  );

  const updatedBalance = currentBalance + context.toNumber(amountChange);
  const operationTime = new Date().toISOString();

  return runSupabaseLegacyUpdateById({
    context,
    table: "wallets",
    id: safeWalletId,
    payload: {
      balance: updatedBalance,
      updated_at: operationTime,
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

function makeLocalOperationRecord({
  storeName,
  localUserId,
  payload,
  existingRecord = null,
  operationTime,
  idPrefix,
}) {
  assertObjectPayload(payload, "Local finance operation payload");

  const safeLocalUserId = requireLocalUserId(localUserId);
  const id =
    payload.id ||
    existingRecord?.id ||
    defaultGenerateId(idPrefix || storeName || "local_finance_record");

  if (payload.localUserId && String(payload.localUserId).trim() !== safeLocalUserId) {
    throw new Error("Local finance operation localUserId does not match the current local user.");
  }

  if (existingRecord?.localUserId && existingRecord.localUserId !== safeLocalUserId) {
    throw new Error("Cannot update a local finance record owned by another local user.");
  }

  return {
    ...existingRecord,
    ...payload,
    id,
    localUserId: safeLocalUserId,
    createdAt: payload.createdAt || existingRecord?.createdAt || operationTime,
    updatedAt: operationTime,
    deletedAt: payload.deletedAt ?? existingRecord?.deletedAt ?? null,
    syncStatus: payload.syncStatus || "local_only",
    source: "local",
  };
}

function getWalletBalance(wallet) {
  return defaultToNumber(
    wallet?.balance ??
      wallet?.current_balance ??
      wallet?.wallet_balance ??
      wallet?.available_balance ??
      wallet?.starting_balance ??
      0
  );
}

function makeLocalWalletBalancePatch(wallet, nextBalance, operationTime) {
  return {
    ...wallet,
    balance: nextBalance,
    updatedAt: operationTime,
    updated_at: operationTime,
    syncStatus: "local_only",
    source: "local",
  };
}

function normalizeAmountOrThrow(value, label = "Amount") {
  const amount = defaultToNumber(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return amount;
}

function getExpenseWalletId(expense) {
  return normalizeString(expense?.wallet_id ?? expense?.walletId);
}

function getTransferSourceWalletId(transferPayload) {
  return normalizeString(
    transferPayload?.from_wallet_id ??
      transferPayload?.fromWalletId ??
      transferPayload?.source_wallet_id ??
      transferPayload?.sourceWalletId ??
      transferPayload?.wallet_id
  );
}

function getTransferDestinationWalletId(transferPayload) {
  return normalizeString(
    transferPayload?.to_wallet_id ??
      transferPayload?.toWalletId ??
      transferPayload?.destination_wallet_id ??
      transferPayload?.destinationWalletId ??
      transferPayload?.related_wallet_id
  );
}

function findLocalLinkedExpenseTransaction(walletTransactions, expenseId) {
  return (walletTransactions || []).find(
    (txn) =>
      !txn?.deletedAt &&
      (String(txn?.expense_id || "") === String(expenseId) ||
        String(txn?.expenseId || "") === String(expenseId))
  );
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
      const safeLocalUserId = requireLocalUserId(localUserId);
      assertObjectPayload(expense, "Expense");

      const operationTime = new Date().toISOString();
      const amount = normalizeAmountOrThrow(expense.amount, "Expense amount");
      const walletId = getExpenseWalletId(expense);
      const expenseId = expense.id || defaultGenerateId("expense");
      const expenseDate = defaultGetSafeDate(
        expense.date || expense.created_at || expense.createdAt || operationTime
      );

      return runLocalFinanceTransaction(
        [
          LOCAL_FINANCE_STORES.expenses,
          LOCAL_FINANCE_STORES.wallets,
          LOCAL_FINANCE_STORES.walletTransactions,
        ],
        safeLocalUserId,
        async (tx) => {
          let walletUpdate = null;
          let walletTransaction = null;

          if (walletId) {
            const wallet = await tx.get(LOCAL_FINANCE_STORES.wallets, walletId);

            if (!wallet) {
              throw new Error("Wallet not found for this local user.");
            }

            walletUpdate = makeLocalWalletBalancePatch(
              wallet,
              getWalletBalance(wallet) - amount,
              operationTime
            );

            await tx.putRaw(LOCAL_FINANCE_STORES.wallets, walletUpdate);
          }

          const expenseRecord = makeLocalOperationRecord({
            storeName: LOCAL_FINANCE_STORES.expenses,
            localUserId: safeLocalUserId,
            operationTime,
            idPrefix: "expense",
            payload: {
              ...expense,
              id: expenseId,
              wallet_id: walletId || null,
              amount,
              date: expenseDate,
              created_at: expense.created_at || expenseDate,
              updated_at: operationTime,
              deletedAt: null,
              syncStatus: "local_only",
              source: "local",
            },
          });

          await tx.putRaw(LOCAL_FINANCE_STORES.expenses, expenseRecord);

          if (walletId) {
            walletTransaction = makeLocalOperationRecord({
              storeName: LOCAL_FINANCE_STORES.walletTransactions,
              localUserId: safeLocalUserId,
              operationTime,
              idPrefix: "wallet_transaction",
              payload: {
                id: expense.wallet_transaction_id || defaultGenerateId("wallet_transaction"),
                wallet_id: walletId,
                amount,
                type: "expense",
                category: expense.category || null,
                need_type: expense.need_type || null,
                planning_status: defaultNormalizePlanningStatus(expense.planning_status),
                unplanned_reason: expense.unplanned_reason || null,
                expense_id: expenseId,
                notes: expense.notes || "",
                created_at: expenseDate,
                updated_at: operationTime,
                deletedAt: null,
                syncStatus: "local_only",
                source: "local",
              },
            });

            await tx.putRaw(LOCAL_FINANCE_STORES.walletTransactions, walletTransaction);
          }

          return {
            expense: expenseRecord,
            walletUpdate,
            walletTransaction,
          };
        }
      );
    },

    async updateExpense(localUserId, expenseId, patch) {
      const safeLocalUserId = requireLocalUserId(localUserId);

      if (!expenseId) {
        throw new Error("Expense id is required.");
      }

      assertObjectPayload(patch, "Expense patch");

      const operationTime = new Date().toISOString();

      return runLocalFinanceTransaction(
        [
          LOCAL_FINANCE_STORES.expenses,
          LOCAL_FINANCE_STORES.wallets,
          LOCAL_FINANCE_STORES.walletTransactions,
        ],
        safeLocalUserId,
        async (tx) => {
          const oldExpense = await tx.get(LOCAL_FINANCE_STORES.expenses, expenseId);

          if (!oldExpense) {
            throw new Error("Expense not found for this local user.");
          }

          const oldAmount = defaultToNumber(oldExpense.amount);
          const nextAmount =
            patch.amount !== undefined
              ? normalizeAmountOrThrow(patch.amount, "Expense amount")
              : oldAmount;

          const oldWalletId = getExpenseWalletId(oldExpense);
          const nextWalletId =
            patch.wallet_id !== undefined || patch.walletId !== undefined
              ? getExpenseWalletId(patch)
              : oldWalletId;

          const walletUpdates = [];

          if (oldWalletId && nextWalletId && oldWalletId === nextWalletId) {
            const netAmountChange = oldAmount - nextAmount;

            if (netAmountChange !== 0) {
              const wallet = await tx.get(LOCAL_FINANCE_STORES.wallets, oldWalletId);

              if (!wallet) {
                throw new Error("Wallet not found for this local user.");
              }

              const walletUpdate = makeLocalWalletBalancePatch(
                wallet,
                getWalletBalance(wallet) + netAmountChange,
                operationTime
              );

              await tx.putRaw(LOCAL_FINANCE_STORES.wallets, walletUpdate);
              walletUpdates.push(walletUpdate);
            }
          } else {
            if (oldWalletId) {
              const oldWallet = await tx.get(LOCAL_FINANCE_STORES.wallets, oldWalletId);

              if (!oldWallet) {
                throw new Error("Old wallet not found for this local user.");
              }

              const oldWalletUpdate = makeLocalWalletBalancePatch(
                oldWallet,
                getWalletBalance(oldWallet) + oldAmount,
                operationTime
              );

              await tx.putRaw(LOCAL_FINANCE_STORES.wallets, oldWalletUpdate);
              walletUpdates.push(oldWalletUpdate);
            }

            if (nextWalletId) {
              const nextWallet = await tx.get(LOCAL_FINANCE_STORES.wallets, nextWalletId);

              if (!nextWallet) {
                throw new Error("New wallet not found for this local user.");
              }

              const nextWalletUpdate = makeLocalWalletBalancePatch(
                nextWallet,
                getWalletBalance(nextWallet) - nextAmount,
                operationTime
              );

              await tx.putRaw(LOCAL_FINANCE_STORES.wallets, nextWalletUpdate);
              walletUpdates.push(nextWalletUpdate);
            }
          }

          const nextPlanningStatus =
            patch.planning_status !== undefined
              ? defaultNormalizePlanningStatus(patch.planning_status)
              : defaultNormalizePlanningStatus(oldExpense.planning_status);

          const nextExpenseDate = defaultGetSafeDate(
            patch.date ||
              patch.created_at ||
              oldExpense.date ||
              oldExpense.created_at ||
              oldExpense.createdAt ||
              operationTime
          );

          const updatedExpense = makeLocalOperationRecord({
            storeName: LOCAL_FINANCE_STORES.expenses,
            localUserId: safeLocalUserId,
            existingRecord: oldExpense,
            operationTime,
            idPrefix: "expense",
            payload: {
              ...oldExpense,
              ...patch,
              id: oldExpense.id,
              localUserId: safeLocalUserId,
              wallet_id: nextWalletId || null,
              amount: nextAmount,
              date: nextExpenseDate,
              planning_status: nextPlanningStatus,
              updated_at: operationTime,
              syncStatus: "local_only",
              source: "local",
            },
          });

          await tx.putRaw(LOCAL_FINANCE_STORES.expenses, updatedExpense);

          const walletTransactions = await tx.getAllForUser(
            LOCAL_FINANCE_STORES.walletTransactions,
            true
          );
          const linkedTxn = findLocalLinkedExpenseTransaction(walletTransactions, expenseId);

          let walletTransaction = null;

          if (nextWalletId) {
            walletTransaction = makeLocalOperationRecord({
              storeName: LOCAL_FINANCE_STORES.walletTransactions,
              localUserId: safeLocalUserId,
              existingRecord: linkedTxn || null,
              operationTime,
              idPrefix: "wallet_transaction",
              payload: {
                ...(linkedTxn || {}),
                id: linkedTxn?.id || defaultGenerateId("wallet_transaction"),
                wallet_id: nextWalletId,
                amount: nextAmount,
                type: "expense",
                category: updatedExpense.category || null,
                need_type: updatedExpense.need_type || null,
                planning_status: nextPlanningStatus,
                unplanned_reason: updatedExpense.unplanned_reason || null,
                expense_id: expenseId,
                notes: updatedExpense.notes || "",
                created_at:
                  linkedTxn?.created_at ||
                  updatedExpense.date ||
                  updatedExpense.created_at ||
                  operationTime,
                updated_at: operationTime,
                deletedAt: null,
                syncStatus: "local_only",
                source: "local",
              },
            });

            await tx.putRaw(LOCAL_FINANCE_STORES.walletTransactions, walletTransaction);
          } else if (linkedTxn) {
            walletTransaction = {
              ...linkedTxn,
              deletedAt: operationTime,
              updatedAt: operationTime,
              updated_at: operationTime,
              syncStatus: "local_deleted",
              source: "local",
            };

            await tx.putRaw(LOCAL_FINANCE_STORES.walletTransactions, walletTransaction);
          }

          return {
            expense: updatedExpense,
            walletUpdates,
            walletTransaction,
          };
        }
      );
    },

    async deleteExpense(localUserId, expenseId) {
      const safeLocalUserId = requireLocalUserId(localUserId);

      if (!expenseId) {
        throw new Error("Expense id is required.");
      }

      const operationTime = new Date().toISOString();

      return runLocalFinanceTransaction(
        [
          LOCAL_FINANCE_STORES.expenses,
          LOCAL_FINANCE_STORES.wallets,
          LOCAL_FINANCE_STORES.walletTransactions,
        ],
        safeLocalUserId,
        async (tx) => {
          const expense = await tx.get(LOCAL_FINANCE_STORES.expenses, expenseId);

          if (!expense) {
            return {
              deletedExpenseId: null,
              walletUpdate: null,
              deletedWalletTransactionId: null,
            };
          }

          const amount = defaultToNumber(expense.amount);
          const walletId = getExpenseWalletId(expense);
          let walletUpdate = null;

          if (walletId) {
            const wallet = await tx.get(LOCAL_FINANCE_STORES.wallets, walletId);

            if (!wallet) {
              throw new Error("Wallet not found for this local user.");
            }

            walletUpdate = makeLocalWalletBalancePatch(
              wallet,
              getWalletBalance(wallet) + amount,
              operationTime
            );

            await tx.putRaw(LOCAL_FINANCE_STORES.wallets, walletUpdate);
          }

          const deletedExpense = {
            ...expense,
            deletedAt: operationTime,
            updatedAt: operationTime,
            updated_at: operationTime,
            syncStatus: "local_deleted",
            source: "local",
          };

          await tx.putRaw(LOCAL_FINANCE_STORES.expenses, deletedExpense);

          const walletTransactions = await tx.getAllForUser(
            LOCAL_FINANCE_STORES.walletTransactions,
            true
          );
          const linkedTxn = findLocalLinkedExpenseTransaction(walletTransactions, expenseId);
          let deletedWalletTransaction = null;

          if (linkedTxn) {
            deletedWalletTransaction = {
              ...linkedTxn,
              deletedAt: operationTime,
              updatedAt: operationTime,
              updated_at: operationTime,
              syncStatus: "local_deleted",
              source: "local",
            };

            await tx.putRaw(LOCAL_FINANCE_STORES.walletTransactions, deletedWalletTransaction);
          }

          return {
            deletedExpenseId: expenseId,
            expense: deletedExpense,
            walletUpdate,
            deletedWalletTransactionId: deletedWalletTransaction?.id || null,
            walletTransaction: deletedWalletTransaction,
          };
        }
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
        {
          ...wallet,
          balance: defaultToNumber(wallet?.balance ?? wallet?.starting_balance ?? 0),
          starting_balance: defaultToNumber(wallet?.starting_balance ?? wallet?.balance ?? 0),
          syncStatus: wallet?.syncStatus || "local_only",
          source: wallet?.source || "local",
        },
        "Wallet"
      );
    },

    async updateWallet(localUserId, walletId, patch) {
      return updateLocalStoreRecord(
        LOCAL_FINANCE_STORES.wallets,
        localUserId,
        walletId,
        {
          ...patch,
          ...(patch?.balance !== undefined
            ? { balance: defaultToNumber(patch.balance) }
            : {}),
          ...(patch?.starting_balance !== undefined
            ? { starting_balance: defaultToNumber(patch.starting_balance) }
            : {}),
          syncStatus: patch?.syncStatus || "local_only",
          source: patch?.source || "local",
        },
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
        {
          ...transaction,
          amount: defaultToNumber(transaction?.amount),
          syncStatus: transaction?.syncStatus || "local_only",
          source: transaction?.source || "local",
        },
        "Wallet transaction"
      );
    },

    async addIncome(localUserId, incomePayload) {
      const safeLocalUserId = requireLocalUserId(localUserId);
      assertObjectPayload(incomePayload, "Income payload");

      const operationTime = new Date().toISOString();
      const amount = normalizeAmountOrThrow(incomePayload.amount, "Income amount");
      const walletId = normalizeString(incomePayload.wallet_id ?? incomePayload.walletId);

      if (!walletId) {
        throw new Error("wallet_id is required for local income.");
      }

      return runLocalFinanceTransaction(
        [LOCAL_FINANCE_STORES.wallets, LOCAL_FINANCE_STORES.walletTransactions],
        safeLocalUserId,
        async (tx) => {
          const wallet = await tx.get(LOCAL_FINANCE_STORES.wallets, walletId);

          if (!wallet) {
            throw new Error("Wallet not found for this local user.");
          }

          const walletUpdate = makeLocalWalletBalancePatch(
            wallet,
            getWalletBalance(wallet) + amount,
            operationTime
          );

          await tx.putRaw(LOCAL_FINANCE_STORES.wallets, walletUpdate);

          const walletTransaction = makeLocalOperationRecord({
            storeName: LOCAL_FINANCE_STORES.walletTransactions,
            localUserId: safeLocalUserId,
            operationTime,
            idPrefix: "wallet_transaction",
            payload: {
              id: incomePayload.id || defaultGenerateId("wallet_transaction"),
              wallet_id: walletId,
              amount,
              type: "income",
              category: incomePayload.category || null,
              source_type: incomePayload.source_type || incomePayload.sourceType || "income",
              tag: incomePayload.tag || null,
              notes: incomePayload.notes || "",
              created_at:
                incomePayload.created_at ||
                incomePayload.date ||
                incomePayload.createdAt ||
                operationTime,
              updated_at: operationTime,
              deletedAt: null,
              syncStatus: "local_only",
              source: "local",
            },
          });

          await tx.putRaw(LOCAL_FINANCE_STORES.walletTransactions, walletTransaction);

          return {
            walletUpdate,
            walletTransaction,
          };
        }
      );
    },

    async transferBetweenWallets(localUserId, transferPayload) {
      const safeLocalUserId = requireLocalUserId(localUserId);
      assertObjectPayload(transferPayload, "Transfer payload");

      const operationTime = new Date().toISOString();
      const amount = normalizeAmountOrThrow(transferPayload.amount, "Transfer amount");
      const fromWalletId = getTransferSourceWalletId(transferPayload);
      const toWalletId = getTransferDestinationWalletId(transferPayload);

      if (!fromWalletId) {
        throw new Error("Source wallet id is required for local transfer.");
      }

      if (!toWalletId) {
        throw new Error("Destination wallet id is required for local transfer.");
      }

      if (fromWalletId === toWalletId) {
        throw new Error("Source and destination wallets must be different.");
      }

      const transferGroupId =
        transferPayload.transfer_group_id ||
        transferPayload.transferGroupId ||
        transferPayload.id ||
        defaultGenerateId("transfer_group");

      return runLocalFinanceTransaction(
        [
          LOCAL_FINANCE_STORES.wallets,
          LOCAL_FINANCE_STORES.walletTransactions,
          LOCAL_FINANCE_STORES.transfers,
        ],
        safeLocalUserId,
        async (tx) => {
          const fromWallet = await tx.get(LOCAL_FINANCE_STORES.wallets, fromWalletId);
          const toWallet = await tx.get(LOCAL_FINANCE_STORES.wallets, toWalletId);

          if (!fromWallet) {
            throw new Error("Source wallet not found for this local user.");
          }

          if (!toWallet) {
            throw new Error("Destination wallet not found for this local user.");
          }

          const fromWalletUpdate = makeLocalWalletBalancePatch(
            fromWallet,
            getWalletBalance(fromWallet) - amount,
            operationTime
          );

          const toWalletUpdate = makeLocalWalletBalancePatch(
            toWallet,
            getWalletBalance(toWallet) + amount,
            operationTime
          );

          await tx.putRaw(LOCAL_FINANCE_STORES.wallets, fromWalletUpdate);
          await tx.putRaw(LOCAL_FINANCE_STORES.wallets, toWalletUpdate);

          const transferOutTransaction = makeLocalOperationRecord({
            storeName: LOCAL_FINANCE_STORES.walletTransactions,
            localUserId: safeLocalUserId,
            operationTime,
            idPrefix: "wallet_transaction",
            payload: {
              id: defaultGenerateId("wallet_transaction"),
              wallet_id: fromWalletId,
              related_wallet_id: toWalletId,
              amount,
              type: "transfer_out",
              transfer_group_id: transferGroupId,
              notes: transferPayload.notes || "",
              created_at: transferPayload.created_at || transferPayload.date || operationTime,
              updated_at: operationTime,
              deletedAt: null,
              syncStatus: "local_only",
              source: "local",
            },
          });

          const transferInTransaction = makeLocalOperationRecord({
            storeName: LOCAL_FINANCE_STORES.walletTransactions,
            localUserId: safeLocalUserId,
            operationTime,
            idPrefix: "wallet_transaction",
            payload: {
              id: defaultGenerateId("wallet_transaction"),
              wallet_id: toWalletId,
              related_wallet_id: fromWalletId,
              amount,
              type: "transfer_in",
              transfer_group_id: transferGroupId,
              notes: transferPayload.notes || "",
              created_at: transferPayload.created_at || transferPayload.date || operationTime,
              updated_at: operationTime,
              deletedAt: null,
              syncStatus: "local_only",
              source: "local",
            },
          });

          const transferSummary = makeLocalOperationRecord({
            storeName: LOCAL_FINANCE_STORES.transfers,
            localUserId: safeLocalUserId,
            operationTime,
            idPrefix: "transfer",
            payload: {
              ...transferPayload,
              id: transferPayload.id || transferGroupId,
              transfer_group_id: transferGroupId,
              from_wallet_id: fromWalletId,
              to_wallet_id: toWalletId,
              amount,
              notes: transferPayload.notes || "",
              created_at: transferPayload.created_at || transferPayload.date || operationTime,
              updated_at: operationTime,
              deletedAt: null,
              syncStatus: "local_only",
              source: "local",
            },
          });

          await tx.putRaw(LOCAL_FINANCE_STORES.walletTransactions, transferOutTransaction);
          await tx.putRaw(LOCAL_FINANCE_STORES.walletTransactions, transferInTransaction);
          await tx.putRaw(LOCAL_FINANCE_STORES.transfers, transferSummary);

          return {
            transfer: transferSummary,
            walletUpdates: {
              fromWallet: fromWalletUpdate,
              toWallet: toWalletUpdate,
            },
            walletTransactions: {
              transferOut: transferOutTransaction,
              transferIn: transferInTransaction,
            },
          };
        }
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
        {
          ...budget,
          syncStatus: budget?.syncStatus || "local_only",
          source: budget?.source || "local",
        },
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
        {
          ...goal,
          syncStatus: goal?.syncStatus || "local_only",
          source: goal?.source || "local",
        },
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
        makeRepositoryRecord(
          {
            ...existingEmergencyFund,
            ...emergencyFund,
            id:
              emergencyFund.id ||
              existingEmergencyFund?.id ||
              `emergency_fund:${safeLocalUserId}`,
            syncStatus: emergencyFund.syncStatus || "local_only",
            source: emergencyFund.source || "local",
          },
          "local"
        ),
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
        id: expense.id || context.generateId("expense"),
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

    async updateExpense(localUserId, expenseId, patch, callOptions = {}) {
      const context = getSupabaseLegacyContext(repositoryOptions, callOptions);
      const user = getSupabaseLegacyUser(localUserId, context);
      const oldExpense = findSupabaseLegacyExpense(context, expenseId);
      const normalizedUpdates = { ...(patch || {}) };

      if (!expenseId) {
        throw new Error("Expense id is required.");
      }

      assertObjectPayload(normalizedUpdates, "Expense patch");

      if (patch?.amount !== undefined) {
        normalizedUpdates.amount = context.toNumber(patch.amount);
      }

      if (patch?.date !== undefined) {
        normalizedUpdates.date = context.getSafeDate(patch.date);
      }

      if (patch?.planning_status !== undefined) {
        normalizedUpdates.planning_status = context.normalizePlanningStatus(
          patch.planning_status
        );
      }

      const nextPlanningStatus =
        normalizedUpdates.planning_status || oldExpense?.planning_status || "planned";

      if (nextPlanningStatus === "unplanned") {
        const reason = String(
          normalizedUpdates.unplanned_reason ?? oldExpense?.unplanned_reason ?? ""
        ).trim();

        if (!reason) throw new Error("Reason is required for unplanned expenses.");
        normalizedUpdates.unplanned_reason = reason;
      } else if (patch?.planning_status !== undefined) {
        normalizedUpdates.unplanned_reason = null;
      }

      const oldWalletId = String(oldExpense?.wallet_id || "").trim() || null;

      const rawNextWalletId =
        normalizedUpdates.wallet_id !== undefined
          ? normalizedUpdates.wallet_id
          : oldExpense?.wallet_id;

      const nextWalletId = String(rawNextWalletId || "").trim() || null;

      if (normalizedUpdates.wallet_id !== undefined) {
        normalizedUpdates.wallet_id = nextWalletId;
      }

      const oldAmount = context.toNumber(oldExpense?.amount);

      const nextAmount =
        normalizedUpdates.amount !== undefined
          ? context.toNumber(normalizedUpdates.amount)
          : oldAmount;

      const updatedExpense = await runSupabaseLegacyUpdateById({
        context,
        table: "expenses",
        id: expenseId,
        payload: normalizedUpdates,
      });

      if (oldWalletId && nextWalletId && oldWalletId === nextWalletId) {
        const netAmountChange = oldAmount - nextAmount;

        if (netAmountChange !== 0) {
          await updateSupabaseLegacyWalletBalance({
            context,
            walletId: oldWalletId,
            amountChange: netAmountChange,
          });
        }
      } else {
        if (oldWalletId) {
          await updateSupabaseLegacyWalletBalance({
            context,
            walletId: oldWalletId,
            amountChange: oldAmount,
          });
        }

        if (nextWalletId) {
          await updateSupabaseLegacyWalletBalance({
            context,
            walletId: nextWalletId,
            amountChange: -nextAmount,
          });
        }
      }

      const linkedTxn = findSupabaseLegacyLinkedExpenseTransaction(context, {
        ...oldExpense,
        id: expenseId,
      });

      const operationTime = new Date().toISOString();

      const txnPayload = {
        wallet_id: nextWalletId,
        amount: nextAmount,
        type: "expense",
        expense_id: expenseId,
        category: normalizedUpdates.category ?? oldExpense?.category ?? null,
        need_type: normalizedUpdates.need_type ?? oldExpense?.need_type ?? null,
        planning_status: nextPlanningStatus,
        unplanned_reason:
          nextPlanningStatus === "unplanned"
            ? normalizedUpdates.unplanned_reason ?? oldExpense?.unplanned_reason ?? null
            : null,
        notes: normalizedUpdates.notes ?? oldExpense?.notes ?? "",
        created_at:
          normalizedUpdates.date ||
          linkedTxn?.created_at ||
          oldExpense?.date ||
          operationTime,
        updated_at: operationTime,
      };

      if (linkedTxn?.id) {
        await runSupabaseLegacyUpdateById({
          context,
          table: "wallet_transactions",
          id: linkedTxn.id,
          payload: txnPayload,
        });
      } else if (nextWalletId) {
        await insertSupabaseLegacyWalletTransaction({
          context,
          user,
          payload: txnPayload,
        });
      }

      return {
        expense: updatedExpense,
        walletTransaction: linkedTxn || null,
      };
    },

    async deleteExpense(localUserId, expenseId, callOptions = {}) {
      const context = getSupabaseLegacyContext(repositoryOptions, callOptions);
      getSupabaseLegacyUser(localUserId, context);
      const expense = findSupabaseLegacyExpense(context, expenseId);

      if (!expenseId) {
        throw new Error("Expense id is required.");
      }

      await runSupabaseLegacyDeleteById({
        context,
        table: "expenses",
        id: expenseId,
      });

      if (expense?.wallet_id) {
        await updateSupabaseLegacyWalletBalance({
          context,
          walletId: expense.wallet_id,
          amountChange: context.toNumber(expense.amount),
        });
      }

      const linkedTxn = findSupabaseLegacyLinkedExpenseTransaction(context, {
        ...expense,
        id: expenseId,
      });

      if (linkedTxn?.id) {
        await runSupabaseLegacyDeleteById({
          context,
          table: "wallet_transactions",
          id: linkedTxn.id,
        });
      }

      return {
        deletedExpenseId: expenseId,
        deletedWalletTransactionId: linkedTxn?.id || null,
      };
    },

    getWallets: createNotImplementedRepositoryMethod("getWallets", mode),

    async addWallet(localUserId, wallet, callOptions = {}) {
      const context = getSupabaseLegacyContext(repositoryOptions, callOptions);
      const user = getSupabaseLegacyUser(localUserId, context);

      assertObjectPayload(wallet, "Wallet");

      const starting = context.toNumber(wallet.balance ?? wallet.starting_balance ?? 0);

      const payload = {
        ...wallet,
        id: wallet.id || context.generateId("wallet"),
        balance: starting,
        starting_balance: starting,
        user_id: user?.id || null,
        user_email: user?.email || null,
        created_by: user?.email || null,
      };

      return runSupabaseLegacyInsert({
        context,
        table: "wallets",
        payload,
      });
    },

    async updateWallet(localUserId, walletId, patch, callOptions = {}) {
      const context = getSupabaseLegacyContext(repositoryOptions, callOptions);
      getSupabaseLegacyUser(localUserId, context);

      const safeWalletId = normalizeString(walletId);

      if (!safeWalletId) {
        throw new Error("Wallet id is required.");
      }

      assertObjectPayload(patch, "Wallet patch");

      const normalizedUpdates = {
        ...patch,
        updated_at: new Date().toISOString(),
      };

      if (patch.balance !== undefined) {
        normalizedUpdates.balance = context.toNumber(patch.balance);
      }

      if (patch.starting_balance !== undefined) {
        normalizedUpdates.starting_balance = context.toNumber(patch.starting_balance);
      }

      return runSupabaseLegacyUpdateById({
        context,
        table: "wallets",
        id: safeWalletId,
        payload: normalizedUpdates,
      });
    },

    async deleteWallet(localUserId, walletId, callOptions = {}) {
      const context = getSupabaseLegacyContext(repositoryOptions, callOptions);
      getSupabaseLegacyUser(localUserId, context);

      const safeWalletId = normalizeString(walletId);

      if (!safeWalletId) {
        throw new Error("Wallet id is required.");
      }

      await runSupabaseLegacyDeleteById({
        context,
        table: "wallets",
        id: safeWalletId,
      });

      return {
        deletedWalletId: safeWalletId,
      };
    },

    getWalletTransactions: createNotImplementedRepositoryMethod("getWalletTransactions", mode),
    insertWalletTransaction: createNotImplementedRepositoryMethod("insertWalletTransaction", mode),
    addIncome: createNotImplementedRepositoryMethod("addIncome", mode),
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
    addIncome: createReservedMethod("addIncome"),
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
// Do not import into runtime app pages/hooks until specifically routed.
export const financeRepository = createFinanceRepository();

export async function getExpenses(localUserId, options) {
  return financeRepository.getExpenses(localUserId, options);
}

export async function addExpense(localUserId, expense, options) {
  return financeRepository.addExpense(localUserId, expense, options);
}

export async function updateExpense(localUserId, expenseId, patch, options) {
  return financeRepository.updateExpense(localUserId, expenseId, patch, options);
}

export async function deleteExpense(localUserId, expenseId, options) {
  return financeRepository.deleteExpense(localUserId, expenseId, options);
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

export async function addIncome(localUserId, incomePayload) {
  return financeRepository.addIncome(localUserId, incomePayload);
}

export async function addMoney(localUserId, incomePayload) {
  return financeRepository.addIncome(localUserId, incomePayload);
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
