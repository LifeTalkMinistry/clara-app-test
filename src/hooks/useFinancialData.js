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

const STORE = {
  expenses: LOCAL_FINANCE_STORES?.expenses || "expenses",
  wallets: LOCAL_FINANCE_STORES?.wallets || "wallets",
  walletTransactions:
    LOCAL_FINANCE_STORES?.walletTransactions || "wallet_transactions",
  transfers: LOCAL_FINANCE_STORES?.transfers || "transfers",
  budgets: LOCAL_FINANCE_STORES?.budgets || "budgets",
  savingsGoals: LOCAL_FINANCE_STORES?.savingsGoals || "savings_goals",
  emergencyFund: LOCAL_FINANCE_STORES?.emergencyFund || "emergency_fund",
};

const INCOME_TYPES = new Set([
  "income",
  "add",
  "cash_in",
  "deposit",
  "opening_balance",
  "credit",
]);

function requireLocalUserId(localUserId) {
  const safeLocalUserId = String(localUserId || "").trim();

  if (!safeLocalUserId) {
    throw new Error(
      "localUserId is required for private finance repository operations."
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

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeAmountOrThrow(value, label = "Amount") {
  const amount = toNumber(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return amount;
}

function nowIso() {
  return new Date().toISOString();
}

function safeDate(value, fallback = nowIso()) {
  const date = new Date(value || fallback);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString();
}

function generateId(prefix = "finance") {
  const safePrefix = String(prefix || "finance").replace(/[^a-zA-Z0-9_-]/g, "_");

  if (globalThis?.crypto?.randomUUID) {
    return `${safePrefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${safePrefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function normalizePlanningStatus(value) {
  const normalized = String(value || "planned").trim().toLowerCase();

  return ["planned", "unplanned", "undocumented"].includes(normalized)
    ? normalized
    : "planned";
}

function removeDeletedRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter(
    (row) => !row?.deletedAt && !row?.deleted_at
  );
}

function applyReadOptions(records, options = {}) {
  const safeOptions = normalizeOptions(options);
  let rows = Array.isArray(records) ? [...records] : [];

  if (safeOptions.includeDeleted !== true) {
    rows = removeDeletedRows(rows);
  }

  if (safeOptions.where && typeof safeOptions.where === "object") {
    rows = rows.filter((record) =>
      Object.entries(safeOptions.where).every(
        ([key, value]) => record?.[key] === value
      )
    );
  }

  if (safeOptions.sortBy) {
    const sortBy = safeOptions.sortBy;
    const sortDirection =
      safeOptions.sortDirection === SORT_ASC ? SORT_ASC : SORT_DESC;

    rows.sort((left, right) => {
      const leftValue = left?.[sortBy] ?? "";
      const rightValue = right?.[sortBy] ?? "";

      if (leftValue === rightValue) return 0;
      if (sortDirection === SORT_ASC) return leftValue > rightValue ? 1 : -1;
      return leftValue < rightValue ? 1 : -1;
    });
  }

  if (Number.isFinite(safeOptions.limit) && safeOptions.limit > 0) {
    rows = rows.slice(0, safeOptions.limit);
  }

  return rows;
}

function getWalletId(payload) {
  return normalizeString(payload?.wallet_id ?? payload?.walletId);
}

function getFromWalletId(payload) {
  return normalizeString(
    payload?.from_wallet_id ??
      payload?.fromWalletId ??
      payload?.source_wallet_id ??
      payload?.sourceWalletId ??
      payload?.wallet_id
  );
}

function getToWalletId(payload) {
  return normalizeString(
    payload?.to_wallet_id ??
      payload?.toWalletId ??
      payload?.destination_wallet_id ??
      payload?.destinationWalletId ??
      payload?.related_wallet_id
  );
}

function getWalletBalance(wallet) {
  return toNumber(
    wallet?.balance ??
      wallet?.current_balance ??
      wallet?.wallet_balance ??
      wallet?.available_balance ??
      wallet?.starting_balance ??
      0
  );
}

function makeWalletPatch(wallet, nextBalance, timestamp) {
  return {
    ...wallet,
    balance: nextBalance,
    current_balance: wallet?.current_balance !== undefined ? nextBalance : wallet?.current_balance,
    updatedAt: timestamp,
    updated_at: timestamp,
    syncStatus: "local_only",
    source: "local",
  };
}

function makeRecord({
  storeName,
  localUserId,
  payload,
  existingRecord = null,
  operationTime = nowIso(),
  idPrefix = "finance",
}) {
  assertObjectPayload(payload, "Finance payload");

  const safeLocalUserId = requireLocalUserId(localUserId);
  const id =
    payload.id ||
    existingRecord?.id ||
    generateId(idPrefix || storeName || "finance");

  if (payload.localUserId && String(payload.localUserId) !== safeLocalUserId) {
    throw new Error("Record localUserId does not match current user.");
  }

  if (existingRecord?.localUserId && existingRecord.localUserId !== safeLocalUserId) {
    throw new Error("Cannot update a finance record owned by another user.");
  }

  return {
    ...existingRecord,
    ...payload,
    id,
    localUserId: safeLocalUserId,
    createdAt: payload.createdAt || existingRecord?.createdAt || operationTime,
    created_at: payload.created_at || existingRecord?.created_at || operationTime,
    updatedAt: operationTime,
    updated_at: operationTime,
    deletedAt: payload.deletedAt ?? payload.deleted_at ?? existingRecord?.deletedAt ?? null,
    deleted_at: payload.deleted_at ?? payload.deletedAt ?? existingRecord?.deleted_at ?? null,
    syncStatus: payload.syncStatus || "local_only",
    source: payload.source || "local",
  };
}

async function getStoreRecords(storeName, localUserId, options = {}) {
  const safeLocalUserId = requireLocalUserId(localUserId);
  const records = await getLocalRecords(storeName, safeLocalUserId);
  return applyReadOptions(records, options);
}

async function addStoreRecord(storeName, localUserId, payload, label, idPrefix) {
  const safeLocalUserId = requireLocalUserId(localUserId);
  assertObjectPayload(payload, label);

  return upsertLocalRecord(
    storeName,
    makeRecord({
      storeName,
      localUserId: safeLocalUserId,
      payload,
      idPrefix,
    }),
    safeLocalUserId
  );
}

async function updateStoreRecord(storeName, localUserId, id, patch, label, idPrefix) {
  const safeLocalUserId = requireLocalUserId(localUserId);

  if (!id) throw new Error(`${label} id is required.`);
  assertObjectPayload(patch, `${label} patch`);

  const existingRecord = await getLocalRecordById(storeName, id, safeLocalUserId);

  if (!existingRecord) {
    throw new Error(`${label} not found for this local user.`);
  }

  return upsertLocalRecord(
    storeName,
    makeRecord({
      storeName,
      localUserId: safeLocalUserId,
      existingRecord,
      payload: {
        ...existingRecord,
        ...patch,
        id: existingRecord.id,
      },
      operationTime: nowIso(),
      idPrefix,
    }),
    safeLocalUserId
  );
}

function isIncomeTransaction(transaction) {
  return INCOME_TYPES.has(String(transaction?.type || "").trim().toLowerCase());
}

function isExpenseTransaction(transaction) {
  return String(transaction?.type || "").trim().toLowerCase() === "expense";
}

function findLinkedExpenseTransaction(transactions, expenseId) {
  return (Array.isArray(transactions) ? transactions : []).find(
    (txn) =>
      !txn?.deletedAt &&
      !txn?.deleted_at &&
      (String(txn?.expense_id || "") === String(expenseId) ||
        String(txn?.expenseId || "") === String(expenseId))
  );
}

function getTransactionWalletDelta(transaction) {
  const amount = toNumber(transaction?.amount);
  const type = String(transaction?.type || "").trim().toLowerCase();

  if (type === "expense" || type === "debit" || type === "withdrawal") {
    return -amount;
  }

  if (INCOME_TYPES.has(type)) {
    return amount;
  }

  return 0;
}

export async function getExpenses(localUserId, options = {}) {
  return getStoreRecords(STORE.expenses, localUserId, {
    sortBy: "createdAt",
    sortDirection: SORT_DESC,
    ...options,
  });
}

export async function addExpense(localUserId, expense) {
  const safeLocalUserId = requireLocalUserId(localUserId);
  assertObjectPayload(expense, "Expense");

  const operationTime = nowIso();
  const amount = normalizeAmountOrThrow(expense.amount, "Expense amount");
  const walletId = getWalletId(expense);
  const expenseId = expense.id || generateId("expense");
  const expenseDate = safeDate(
    expense.date || expense.created_at || expense.createdAt || operationTime,
    operationTime
  );

  return runLocalFinanceTransaction(
    [STORE.expenses, STORE.wallets, STORE.walletTransactions],
    safeLocalUserId,
    async (tx) => {
      let walletUpdate = null;
      let walletTransaction = null;

      if (walletId) {
        const wallet = await tx.get(STORE.wallets, walletId);

        if (!wallet) {
          throw new Error("Wallet not found for this local user.");
        }

        walletUpdate = makeWalletPatch(
          wallet,
          getWalletBalance(wallet) - amount,
          operationTime
        );

        await tx.putRaw(STORE.wallets, walletUpdate);
      }

      const expenseRecord = makeRecord({
        storeName: STORE.expenses,
        localUserId: safeLocalUserId,
        operationTime,
        idPrefix: "expense",
        payload: {
          ...expense,
          id: expenseId,
          wallet_id: walletId || null,
          amount,
          date: expenseDate,
          planning_status: normalizePlanningStatus(expense.planning_status),
          deletedAt: null,
          deleted_at: null,
        },
      });

      await tx.putRaw(STORE.expenses, expenseRecord);

      if (walletId) {
        walletTransaction = makeRecord({
          storeName: STORE.walletTransactions,
          localUserId: safeLocalUserId,
          operationTime,
          idPrefix: "wallet_transaction",
          payload: {
            id: expense.wallet_transaction_id || generateId("wallet_transaction"),
            wallet_id: walletId,
            amount,
            type: "expense",
            category: expense.category || null,
            need_type: expense.need_type || null,
            planning_status: normalizePlanningStatus(expense.planning_status),
            unplanned_reason: expense.unplanned_reason || null,
            expense_id: expenseId,
            notes: expense.notes || "",
            created_at: expenseDate,
            createdAt: expenseDate,
            deletedAt: null,
            deleted_at: null,
          },
        });

        await tx.putRaw(STORE.walletTransactions, walletTransaction);
      }

      return {
        expense: expenseRecord,
        walletUpdate,
        walletTransaction,
      };
    }
  );
}

export async function updateExpense(localUserId, expenseId, patch) {
  const safeLocalUserId = requireLocalUserId(localUserId);

  if (!expenseId) throw new Error("Expense id is required.");
  assertObjectPayload(patch, "Expense patch");

  const operationTime = nowIso();

  return runLocalFinanceTransaction(
    [STORE.expenses, STORE.wallets, STORE.walletTransactions],
    safeLocalUserId,
    async (tx) => {
      const oldExpense = await tx.get(STORE.expenses, expenseId);

      if (!oldExpense) {
        throw new Error("Expense not found for this local user.");
      }

      const oldAmount = toNumber(oldExpense.amount);
      const nextAmount =
        patch.amount !== undefined
          ? normalizeAmountOrThrow(patch.amount, "Expense amount")
          : oldAmount;

      const oldWalletId = getWalletId(oldExpense);
      const nextWalletId =
        patch.wallet_id !== undefined || patch.walletId !== undefined
          ? getWalletId(patch)
          : oldWalletId;

      const walletUpdates = [];

      if (oldWalletId && nextWalletId && oldWalletId === nextWalletId) {
        const netChange = oldAmount - nextAmount;

        if (netChange !== 0) {
          const wallet = await tx.get(STORE.wallets, oldWalletId);
          if (!wallet) throw new Error("Wallet not found for this local user.");

          const walletUpdate = makeWalletPatch(
            wallet,
            getWalletBalance(wallet) + netChange,
            operationTime
          );

          await tx.putRaw(STORE.wallets, walletUpdate);
          walletUpdates.push(walletUpdate);
        }
      } else {
        if (oldWalletId) {
          const oldWallet = await tx.get(STORE.wallets, oldWalletId);
          if (!oldWallet) throw new Error("Old wallet not found for this local user.");

          const oldWalletUpdate = makeWalletPatch(
            oldWallet,
            getWalletBalance(oldWallet) + oldAmount,
            operationTime
          );

          await tx.putRaw(STORE.wallets, oldWalletUpdate);
          walletUpdates.push(oldWalletUpdate);
        }

        if (nextWalletId) {
          const nextWallet = await tx.get(STORE.wallets, nextWalletId);
          if (!nextWallet) throw new Error("New wallet not found for this local user.");

          const nextWalletUpdate = makeWalletPatch(
            nextWallet,
            getWalletBalance(nextWallet) - nextAmount,
            operationTime
          );

          await tx.putRaw(STORE.wallets, nextWalletUpdate);
          walletUpdates.push(nextWalletUpdate);
        }
      }

      const nextDate = safeDate(
        patch.date ||
          patch.created_at ||
          oldExpense.date ||
          oldExpense.created_at ||
          oldExpense.createdAt ||
          operationTime,
        operationTime
      );

      const updatedExpense = makeRecord({
        storeName: STORE.expenses,
        localUserId: safeLocalUserId,
        existingRecord: oldExpense,
        operationTime,
        idPrefix: "expense",
        payload: {
          ...oldExpense,
          ...patch,
          id: oldExpense.id,
          wallet_id: nextWalletId || null,
          amount: nextAmount,
          date: nextDate,
          planning_status:
            patch.planning_status !== undefined
              ? normalizePlanningStatus(patch.planning_status)
              : normalizePlanningStatus(oldExpense.planning_status),
        },
      });

      await tx.putRaw(STORE.expenses, updatedExpense);

      const allTransactions = await tx.getAllForUser(STORE.walletTransactions, true);
      const linkedTransaction = findLinkedExpenseTransaction(allTransactions, expenseId);

      let walletTransaction = null;

      if (nextWalletId) {
        walletTransaction = makeRecord({
          storeName: STORE.walletTransactions,
          localUserId: safeLocalUserId,
          existingRecord: linkedTransaction || null,
          operationTime,
          idPrefix: "wallet_transaction",
          payload: {
            ...(linkedTransaction || {}),
            id: linkedTransaction?.id || generateId("wallet_transaction"),
            wallet_id: nextWalletId,
            amount: nextAmount,
            type: "expense",
            category: updatedExpense.category || null,
            need_type: updatedExpense.need_type || null,
            planning_status: normalizePlanningStatus(updatedExpense.planning_status),
            unplanned_reason: updatedExpense.unplanned_reason || null,
            expense_id: expenseId,
            notes: updatedExpense.notes || "",
            deletedAt: null,
            deleted_at: null,
          },
        });

        await tx.putRaw(STORE.walletTransactions, walletTransaction);
      } else if (linkedTransaction) {
        walletTransaction = {
          ...linkedTransaction,
          deletedAt: operationTime,
          deleted_at: operationTime,
          updatedAt: operationTime,
          updated_at: operationTime,
          syncStatus: "local_deleted",
          source: "local",
        };

        await tx.putRaw(STORE.walletTransactions, walletTransaction);
      }

      return {
        expense: updatedExpense,
        walletUpdates,
        walletTransaction,
      };
    }
  );
}

export async function deleteExpense(localUserId, expenseId) {
  const safeLocalUserId = requireLocalUserId(localUserId);

  if (!expenseId) throw new Error("Expense id is required.");

  const operationTime = nowIso();

  return runLocalFinanceTransaction(
    [STORE.expenses, STORE.wallets, STORE.walletTransactions],
    safeLocalUserId,
    async (tx) => {
      const expense = await tx.get(STORE.expenses, expenseId);

      if (!expense) {
        return {
          deletedExpenseId: null,
          expense: null,
          walletUpdate: null,
          walletTransaction: null,
        };
      }

      const amount = toNumber(expense.amount);
      const walletId = getWalletId(expense);
      let walletUpdate = null;

      if (walletId) {
        const wallet = await tx.get(STORE.wallets, walletId);
        if (!wallet) throw new Error("Wallet not found for this local user.");

        walletUpdate = makeWalletPatch(
          wallet,
          getWalletBalance(wallet) + amount,
          operationTime
        );

        await tx.putRaw(STORE.wallets, walletUpdate);
      }

      const deletedExpense = {
        ...expense,
        deletedAt: operationTime,
        deleted_at: operationTime,
        updatedAt: operationTime,
        updated_at: operationTime,
        syncStatus: "local_deleted",
        source: "local",
      };

      await tx.putRaw(STORE.expenses, deletedExpense);

      const allTransactions = await tx.getAllForUser(STORE.walletTransactions, true);
      const linkedTransaction = findLinkedExpenseTransaction(allTransactions, expenseId);

      let deletedWalletTransaction = null;

      if (linkedTransaction) {
        deletedWalletTransaction = {
          ...linkedTransaction,
          deletedAt: operationTime,
          deleted_at: operationTime,
          updatedAt: operationTime,
          updated_at: operationTime,
          syncStatus: "local_deleted",
          source: "local",
        };

        await tx.putRaw(STORE.walletTransactions, deletedWalletTransaction);
      }

      return {
        deletedExpenseId: expenseId,
        expense: deletedExpense,
        walletUpdate,
        walletTransaction: deletedWalletTransaction,
      };
    }
  );
}

export async function getWallets(localUserId, options = {}) {
  return getStoreRecords(STORE.wallets, localUserId, {
    sortBy: "createdAt",
    sortDirection: SORT_ASC,
    ...options,
  });
}

export async function addWallet(localUserId, wallet) {
  assertObjectPayload(wallet, "Wallet");

  const startingBalance = toNumber(
    wallet.starting_balance ?? wallet.startingBalance ?? wallet.balance ?? 0
  );

  return addStoreRecord(
    STORE.wallets,
    localUserId,
    {
      ...wallet,
      balance: toNumber(wallet.balance ?? startingBalance),
      starting_balance: startingBalance,
      syncStatus: wallet.syncStatus || "local_only",
      source: wallet.source || "local",
    },
    "Wallet",
    "wallet"
  );
}

export async function updateWallet(localUserId, walletId, patch) {
  return updateStoreRecord(
    STORE.wallets,
    localUserId,
    walletId,
    {
      ...patch,
      ...(patch?.balance !== undefined ? { balance: toNumber(patch.balance) } : {}),
      ...(patch?.starting_balance !== undefined
        ? { starting_balance: toNumber(patch.starting_balance) }
        : {}),
      syncStatus: patch?.syncStatus || "local_only",
      source: patch?.source || "local",
    },
    "Wallet",
    "wallet"
  );
}

export async function deleteWallet(localUserId, walletId) {
  return softDeleteLocalRecord(STORE.wallets, walletId, requireLocalUserId(localUserId));
}

export async function getWalletTransactions(localUserId, options = {}) {
  return getStoreRecords(STORE.walletTransactions, localUserId, {
    sortBy: "createdAt",
    sortDirection: SORT_DESC,
    ...options,
  });
}

export async function insertWalletTransaction(localUserId, transaction) {
  assertObjectPayload(transaction, "Wallet transaction");

  return addStoreRecord(
    STORE.walletTransactions,
    localUserId,
    {
      ...transaction,
      amount: toNumber(transaction.amount),
      syncStatus: transaction.syncStatus || "local_only",
      source: transaction.source || "local",
    },
    "Wallet transaction",
    "wallet_transaction"
  );
}

export async function addIncome(localUserId, incomePayload) {
  const safeLocalUserId = requireLocalUserId(localUserId);
  assertObjectPayload(incomePayload, "Income payload");

  const operationTime = nowIso();
  const amount = normalizeAmountOrThrow(incomePayload.amount, "Income amount");
  const walletId = getWalletId(incomePayload);

  if (!walletId) {
    throw new Error("wallet_id is required for local income.");
  }

  return runLocalFinanceTransaction(
    [STORE.wallets, STORE.walletTransactions],
    safeLocalUserId,
    async (tx) => {
      const wallet = await tx.get(STORE.wallets, walletId);

      if (!wallet) {
        throw new Error("Wallet not found for this local user.");
      }

      const walletUpdate = makeWalletPatch(
        wallet,
        getWalletBalance(wallet) + amount,
        operationTime
      );

      await tx.putRaw(STORE.wallets, walletUpdate);

      const createdAt = safeDate(
        incomePayload.date ||
          incomePayload.created_at ||
          incomePayload.createdAt ||
          operationTime,
        operationTime
      );

      const walletTransaction = makeRecord({
        storeName: STORE.walletTransactions,
        localUserId: safeLocalUserId,
        operationTime,
        idPrefix: "wallet_transaction",
        payload: {
          ...incomePayload,
          id: incomePayload.id || generateId("wallet_transaction"),
          wallet_id: walletId,
          amount,
          type: incomePayload.type || "income",
          category: incomePayload.category || null,
          source_type:
            incomePayload.source_type || incomePayload.sourceType || "income",
          tag: incomePayload.tag || incomePayload.source || null,
          notes: incomePayload.notes || incomePayload.description || "",
          createdAt,
          created_at: createdAt,
          deletedAt: null,
          deleted_at: null,
        },
      });

      await tx.putRaw(STORE.walletTransactions, walletTransaction);

      return {
        walletUpdate,
        walletTransaction,
        income: walletTransaction,
      };
    }
  );
}

export const addMoney = addIncome;

export async function updateWalletTransaction(localUserId, transactionId, patch) {
  const safeLocalUserId = requireLocalUserId(localUserId);

  if (!transactionId) throw new Error("Wallet transaction id is required.");
  assertObjectPayload(patch, "Wallet transaction patch");

  const operationTime = nowIso();

  return runLocalFinanceTransaction(
    [STORE.wallets, STORE.walletTransactions],
    safeLocalUserId,
    async (tx) => {
      const oldTransaction = await tx.get(STORE.walletTransactions, transactionId);

      if (!oldTransaction) {
        throw new Error("Wallet transaction not found for this local user.");
      }

      const oldWalletId = getWalletId(oldTransaction);
      const nextWalletId =
        patch.wallet_id !== undefined || patch.walletId !== undefined
          ? getWalletId(patch)
          : oldWalletId;

      const oldDelta = getTransactionWalletDelta(oldTransaction);

      const mergedTransaction = {
        ...oldTransaction,
        ...patch,
        id: oldTransaction.id,
        wallet_id: nextWalletId || null,
        amount:
          patch.amount !== undefined
            ? normalizeAmountOrThrow(patch.amount, "Wallet transaction amount")
            : toNumber(oldTransaction.amount),
        type: patch.type || oldTransaction.type || "income",
        updatedAt: operationTime,
        updated_at: operationTime,
        syncStatus: "local_only",
        source: "local",
      };

      const nextDelta = getTransactionWalletDelta(mergedTransaction);
      const walletUpdates = [];

      if (oldWalletId && nextWalletId && oldWalletId === nextWalletId) {
        const wallet = await tx.get(STORE.wallets, oldWalletId);

        if (!wallet) {
          throw new Error("Wallet not found for this local user.");
        }

        const netChange = nextDelta - oldDelta;

        if (netChange !== 0) {
          const walletUpdate = makeWalletPatch(
            wallet,
            getWalletBalance(wallet) + netChange,
            operationTime
          );

          await tx.putRaw(STORE.wallets, walletUpdate);
          walletUpdates.push(walletUpdate);
        }
      } else {
        if (oldWalletId) {
          const oldWallet = await tx.get(STORE.wallets, oldWalletId);

          if (!oldWallet) {
            throw new Error("Old wallet not found for this local user.");
          }

          const oldWalletUpdate = makeWalletPatch(
            oldWallet,
            getWalletBalance(oldWallet) - oldDelta,
            operationTime
          );

          await tx.putRaw(STORE.wallets, oldWalletUpdate);
          walletUpdates.push(oldWalletUpdate);
        }

        if (nextWalletId) {
          const nextWallet = await tx.get(STORE.wallets, nextWalletId);

          if (!nextWallet) {
            throw new Error("New wallet not found for this local user.");
          }

          const nextWalletUpdate = makeWalletPatch(
            nextWallet,
            getWalletBalance(nextWallet) + nextDelta,
            operationTime
          );

          await tx.putRaw(STORE.wallets, nextWalletUpdate);
          walletUpdates.push(nextWalletUpdate);
        }
      }

      const updatedTransaction = makeRecord({
        storeName: STORE.walletTransactions,
        localUserId: safeLocalUserId,
        existingRecord: oldTransaction,
        operationTime,
        idPrefix: "wallet_transaction",
        payload: mergedTransaction,
      });

      await tx.putRaw(STORE.walletTransactions, updatedTransaction);

      return {
        walletTransaction: updatedTransaction,
        transaction: updatedTransaction,
        walletUpdates,
      };
    }
  );
}

export async function deleteWalletTransaction(localUserId, transactionId) {
  const safeLocalUserId = requireLocalUserId(localUserId);

  if (!transactionId) throw new Error("Wallet transaction id is required.");

  const operationTime = nowIso();

  return runLocalFinanceTransaction(
    [STORE.wallets, STORE.walletTransactions],
    safeLocalUserId,
    async (tx) => {
      const transaction = await tx.get(STORE.walletTransactions, transactionId);

      if (!transaction) {
        return {
          deletedWalletTransactionId: null,
          walletTransaction: null,
          walletUpdate: null,
        };
      }

      const walletId = getWalletId(transaction);
      const delta = getTransactionWalletDelta(transaction);
      let walletUpdate = null;

      if (walletId && delta !== 0) {
        const wallet = await tx.get(STORE.wallets, walletId);

        if (!wallet) {
          throw new Error("Wallet not found for this local user.");
        }

        walletUpdate = makeWalletPatch(
          wallet,
          getWalletBalance(wallet) - delta,
          operationTime
        );

        await tx.putRaw(STORE.wallets, walletUpdate);
      }

      const deletedTransaction = {
        ...transaction,
        deletedAt: operationTime,
        deleted_at: operationTime,
        updatedAt: operationTime,
        updated_at: operationTime,
        syncStatus: "local_deleted",
        source: "local",
      };

      await tx.putRaw(STORE.walletTransactions, deletedTransaction);

      return {
        deletedWalletTransactionId: transactionId,
        walletTransaction: deletedTransaction,
        transaction: deletedTransaction,
        walletUpdate,
      };
    }
  );
}

export async function getTransfers(localUserId, options = {}) {
  return getStoreRecords(STORE.transfers, localUserId, {
    sortBy: "createdAt",
    sortDirection: SORT_DESC,
    ...options,
  });
}

export async function transferBetweenWallets(localUserId, transferPayload) {
  const safeLocalUserId = requireLocalUserId(localUserId);
  assertObjectPayload(transferPayload, "Transfer payload");

  const operationTime = nowIso();
  const amount = normalizeAmountOrThrow(transferPayload.amount, "Transfer amount");
  const fromWalletId = getFromWalletId(transferPayload);
  const toWalletId = getToWalletId(transferPayload);

  if (!fromWalletId) throw new Error("Source wallet is required for transfer.");
  if (!toWalletId) throw new Error("Destination wallet is required for transfer.");
  if (fromWalletId === toWalletId) {
    throw new Error("Source and destination wallets must be different.");
  }

  return runLocalFinanceTransaction(
    [STORE.wallets, STORE.transfers],
    safeLocalUserId,
    async (tx) => {
      const fromWallet = await tx.get(STORE.wallets, fromWalletId);
      const toWallet = await tx.get(STORE.wallets, toWalletId);

      if (!fromWallet) throw new Error("Source wallet not found for this local user.");
      if (!toWallet) throw new Error("Destination wallet not found for this local user.");

      const fromWalletUpdate = makeWalletPatch(
        fromWallet,
        getWalletBalance(fromWallet) - amount,
        operationTime
      );

      const toWalletUpdate = makeWalletPatch(
        toWallet,
        getWalletBalance(toWallet) + amount,
        operationTime
      );

      await tx.putRaw(STORE.wallets, fromWalletUpdate);
      await tx.putRaw(STORE.wallets, toWalletUpdate);

      const createdAt = safeDate(
        transferPayload.date ||
          transferPayload.created_at ||
          transferPayload.createdAt ||
          operationTime,
        operationTime
      );

      const transfer = makeRecord({
        storeName: STORE.transfers,
        localUserId: safeLocalUserId,
        operationTime,
        idPrefix: "transfer",
        payload: {
          ...transferPayload,
          id: transferPayload.id || generateId("transfer"),
          amount,
          from_wallet_id: fromWalletId,
          to_wallet_id: toWalletId,
          source_wallet_id: fromWalletId,
          destination_wallet_id: toWalletId,
          notes: transferPayload.notes || "",
          createdAt,
          created_at: createdAt,
          deletedAt: null,
          deleted_at: null,
        },
      });

      await tx.putRaw(STORE.transfers, transfer);

      return {
        transfer,
        fromWalletUpdate,
        toWalletUpdate,
      };
    }
  );
}

export async function getBudgets(localUserId, options = {}) {
  return getStoreRecords(STORE.budgets, localUserId, {
    sortBy: "createdAt",
    sortDirection: SORT_DESC,
    ...options,
  });
}

export async function addBudget(localUserId, budget) {
  assertObjectPayload(budget, "Budget");

  return addStoreRecord(
    STORE.budgets,
    localUserId,
    {
      ...budget,
      amount: budget.amount !== undefined ? toNumber(budget.amount) : budget.amount,
      allocated_amount:
        budget.allocated_amount !== undefined
          ? toNumber(budget.allocated_amount)
          : budget.allocated_amount,
      syncStatus: budget.syncStatus || "local_only",
      source: budget.source || "local",
    },
    "Budget",
    "budget"
  );
}

export async function updateBudget(localUserId, budgetId, patch) {
  return updateStoreRecord(
    STORE.budgets,
    localUserId,
    budgetId,
    {
      ...patch,
      ...(patch?.amount !== undefined ? { amount: toNumber(patch.amount) } : {}),
      ...(patch?.allocated_amount !== undefined
        ? { allocated_amount: toNumber(patch.allocated_amount) }
        : {}),
      syncStatus: patch?.syncStatus || "local_only",
      source: patch?.source || "local",
    },
    "Budget",
    "budget"
  );
}

export async function deleteBudget(localUserId, budgetId) {
  return softDeleteLocalRecord(STORE.budgets, budgetId, requireLocalUserId(localUserId));
}

export async function upsertBudget(localUserId, budget) {
  assertObjectPayload(budget, "Budget");

  if (budget.id) {
    const existing = await getLocalRecordById(
      STORE.budgets,
      budget.id,
      requireLocalUserId(localUserId)
    );

    if (existing) {
      return updateBudget(localUserId, budget.id, budget);
    }
  }

  return addBudget(localUserId, budget);
}

export async function getSavingsGoals(localUserId, options = {}) {
  return getStoreRecords(STORE.savingsGoals, localUserId, {
    sortBy: "createdAt",
    sortDirection: SORT_ASC,
    ...options,
  });
}

export async function upsertSavingsGoal(localUserId, goal) {
  assertObjectPayload(goal, "Savings goal");

  const safeLocalUserId = requireLocalUserId(localUserId);
  const existing = goal.id
    ? await getLocalRecordById(STORE.savingsGoals, goal.id, safeLocalUserId)
    : null;

  const operationTime = nowIso();

  return upsertLocalRecord(
    STORE.savingsGoals,
    makeRecord({
      storeName: STORE.savingsGoals,
      localUserId: safeLocalUserId,
      existingRecord: existing,
      operationTime,
      idPrefix: "savings_goal",
      payload: {
        ...(existing || {}),
        ...goal,
        id: goal.id || existing?.id || generateId("savings_goal"),
        target_amount:
          goal.target_amount !== undefined
            ? toNumber(goal.target_amount)
            : goal.targetAmount !== undefined
              ? toNumber(goal.targetAmount)
              : toNumber(existing?.target_amount ?? 0),
        saved_amount:
          goal.saved_amount !== undefined
            ? toNumber(goal.saved_amount)
            : goal.savedAmount !== undefined
              ? toNumber(goal.savedAmount)
              : toNumber(existing?.saved_amount ?? 0),
        syncStatus: goal.syncStatus || "local_only",
        source: goal.source || "local",
      },
    }),
    safeLocalUserId
  );
}

export async function getEmergencyFund(localUserId, options = {}) {
  const rows = await getStoreRecords(STORE.emergencyFund, localUserId, {
    sortBy: "updatedAt",
    sortDirection: SORT_DESC,
    ...options,
  });

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function upsertEmergencyFund(localUserId, data) {
  assertObjectPayload(data, "Emergency fund");

  const safeLocalUserId = requireLocalUserId(localUserId);
  const existing = data.id
    ? await getLocalRecordById(STORE.emergencyFund, data.id, safeLocalUserId)
    : await getEmergencyFund(safeLocalUserId, { includeDeleted: false });

  const operationTime = nowIso();

  return upsertLocalRecord(
    STORE.emergencyFund,
    makeRecord({
      storeName: STORE.emergencyFund,
      localUserId: safeLocalUserId,
      existingRecord: existing,
      operationTime,
      idPrefix: "emergency_fund",
      payload: {
        ...(existing || {}),
        ...data,
        id: data.id || existing?.id || `emergency_fund_${safeLocalUserId}`,
        target_amount:
          data.target_amount !== undefined
            ? toNumber(data.target_amount)
            : data.targetAmount !== undefined
              ? toNumber(data.targetAmount)
              : toNumber(existing?.target_amount ?? 0),
        saved_amount:
          data.saved_amount !== undefined
            ? toNumber(data.saved_amount)
            : data.savedAmount !== undefined
              ? toNumber(data.savedAmount)
              : toNumber(existing?.saved_amount ?? 0),
        monthly_target:
          data.monthly_target !== undefined
            ? toNumber(data.monthly_target)
            : data.monthlyTarget !== undefined
              ? toNumber(data.monthlyTarget)
              : toNumber(existing?.monthly_target ?? 0),
        syncStatus: data.syncStatus || "local_only",
        source: data.source || "local",
      },
    }),
    safeLocalUserId
  );
}

export function createFinanceRepository() {
  return {
    getExpenses,
    addExpense,
    updateExpense,
    deleteExpense,

    getWallets,
    addWallet,
    updateWallet,
    deleteWallet,

    getWalletTransactions,
    insertWalletTransaction,
    addIncome,
    addMoney,
    updateWalletTransaction,
    deleteWalletTransaction,

    getTransfers,
    transferBetweenWallets,

    getBudgets,
    addBudget,
    updateBudget,
    deleteBudget,
    upsertBudget,

    getSavingsGoals,
    upsertSavingsGoal,

    getEmergencyFund,
    upsertEmergencyFund,
  };
}

const financeRepository = createFinanceRepository();

export default financeRepository;
