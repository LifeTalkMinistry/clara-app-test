import { createFinanceRepository as createCoreFinanceRepository } from "./financeRepositoryCore.js";
import { syncManualExpenseLinkedTargetChange } from "./manualExpenseLinkedTargetSync.js";
import { reconcileSavingsGoalsWithLinkedExpenses } from "./savingsGoalLinkedExpenseRepair.js";

export * from "./financeRepositoryCore.js";

export const FINANCE_DATA_UPDATED_EVENT = "clara:finance-data-updated";
let financeDataRevision = 0;

const LEGACY_UNREVERSED_INCOME_DELETE_CUTOFF = Date.parse("2026-08-25T00:09:11Z");
const LEGACY_INCOME_TYPES = new Set([
  "income",
  "add",
  "cash_in",
  "deposit",
  "opening_balance",
  "credit",
  "add_funds",
  "add_money",
]);
const NON_EARNED_LEGACY_SOURCE_TYPES = new Set([
  "savings_wallet_reconciliation",
  "balance_correction",
]);
const legacyIncomeRepairPromises = new Map();

const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getWalletId = (wallet) => String(wallet?.id || wallet?.wallet_id || wallet?.walletId || "").trim();
const getWalletBalance = (wallet) =>
  toNumber(
    wallet?.balance ??
      wallet?.current_balance ??
      wallet?.wallet_balance ??
      wallet?.available_balance ??
      wallet?.starting_balance ??
      0
  );

const getLegacyRepairIds = (wallet) => {
  const value =
    wallet?.legacyDeletedIncomeReconciledIds ??
    wallet?.legacy_deleted_income_reconciled_ids ??
    [];
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
};

const isLegacyUnreversedDeletedIncome = (transaction) => {
  const deletedAt = transaction?.deletedAt || transaction?.deleted_at;
  if (!deletedAt) return false;

  const deletedTime = new Date(deletedAt).getTime();
  if (!Number.isFinite(deletedTime) || deletedTime > LEGACY_UNREVERSED_INCOME_DELETE_CUTOFF) {
    return false;
  }

  if (
    transaction?.legacyReconciledAt ||
    transaction?.legacy_reconciled_at ||
    transaction?.balanceReversedAt ||
    transaction?.balance_reversed_at
  ) {
    return false;
  }

  const type = String(transaction?.type || "").trim().toLowerCase();
  if (!LEGACY_INCOME_TYPES.has(type)) return false;

  const sourceType = String(
    transaction?.source_type || transaction?.sourceType || ""
  )
    .trim()
    .toLowerCase();
  if (NON_EARNED_LEGACY_SOURCE_TYPES.has(sourceType)) return false;

  const walletId = String(transaction?.wallet_id || transaction?.walletId || "").trim();
  const amount = Math.abs(toNumber(transaction?.amount));
  return Boolean(transaction?.id && walletId && amount > 0);
};

async function repairLegacyDeletedIncomeBalanceEffects(repository, localUserId) {
  const key = String(localUserId || "").trim();
  if (!key || !repository) return { repaired: 0, amount: 0 };

  if (legacyIncomeRepairPromises.has(key)) {
    return legacyIncomeRepairPromises.get(key);
  }

  const repairPromise = (async () => {
    const [transactions, wallets] = await Promise.all([
      repository.getWalletTransactions(key, { includeDeleted: true }),
      repository.getWallets(key, { includeDeleted: true }),
    ]);

    const walletMap = new Map(
      (Array.isArray(wallets) ? wallets : []).map((wallet) => [getWalletId(wallet), wallet])
    );
    const candidates = (Array.isArray(transactions) ? transactions : []).filter(
      isLegacyUnreversedDeletedIncome
    );

    let repaired = 0;
    let repairedAmount = 0;

    for (const transaction of candidates) {
      const transactionId = String(transaction.id);
      const walletId = String(transaction.wallet_id || transaction.walletId || "").trim();
      const amount = Math.abs(toNumber(transaction.amount));
      const wallet = walletMap.get(walletId);
      if (!wallet || !amount) continue;

      const alreadyReconciledIds = getLegacyRepairIds(wallet);
      if (alreadyReconciledIds.includes(transactionId)) {
        await repository.updateWalletTransaction(key, transactionId, {
          legacyReconciledAt: new Date().toISOString(),
          legacy_reconciled_at: new Date().toISOString(),
          balanceReversedAt: new Date().toISOString(),
          balance_reversed_at: new Date().toISOString(),
          reversalReason: "legacy_deleted_income_reconciliation",
          reversal_reason: "legacy_deleted_income_reconciliation",
        });
        continue;
      }

      const now = new Date().toISOString();
      const nextRepairIds = [...new Set([...alreadyReconciledIds, transactionId])];
      const nextBalance = getWalletBalance(wallet) - amount;

      const updatedWallet = await repository.updateWallet(key, walletId, {
        balance: nextBalance,
        legacyDeletedIncomeReconciledIds: nextRepairIds,
        legacy_deleted_income_reconciled_ids: nextRepairIds,
        lastLegacyIncomeRepairAt: now,
        last_legacy_income_repair_at: now,
      });

      walletMap.set(walletId, updatedWallet?.wallet || updatedWallet || {
        ...wallet,
        balance: nextBalance,
        legacyDeletedIncomeReconciledIds: nextRepairIds,
      });

      await repository.updateWalletTransaction(key, transactionId, {
        legacyReconciledAt: now,
        legacy_reconciled_at: now,
        balanceReversedAt: now,
        balance_reversed_at: now,
        reversalReason: "legacy_deleted_income_reconciliation",
        reversal_reason: "legacy_deleted_income_reconciliation",
      });

      repaired += 1;
      repairedAmount += amount;
    }

    return { repaired, amount: repairedAmount };
  })();

  legacyIncomeRepairPromises.set(key, repairPromise);

  try {
    return await repairPromise;
  } catch (error) {
    legacyIncomeRepairPromises.delete(key);
    throw error;
  }
}

export function getFinanceDataRevision() {
  return financeDataRevision;
}

export function emitFinanceDataUpdated(localUserId, source) {
  financeDataRevision += 1;
  const revision = financeDataRevision;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(FINANCE_DATA_UPDATED_EVENT, {
        detail: { localUserId, source, revision },
      })
    );
  }
  return revision;
}

async function findExpenseById(repository, localUserId, expenseId) {
  if (!expenseId || typeof repository?.getExpenses !== "function") return null;
  const rows = await repository.getExpenses(localUserId, { includeDeleted: true });
  return (Array.isArray(rows) ? rows : []).find(
    (row) => String(row?.id || "") === String(expenseId)
  ) || null;
}

function decorateFinanceRepository(repository) {
  if (!repository || typeof repository !== "object") return repository;

  const emit = (localUserId, source, result) => {
    emitFinanceDataUpdated(localUserId, source);
    return result;
  };

  return {
    ...repository,

    async getWallets(localUserId, options, ...args) {
      const repair = await repairLegacyDeletedIncomeBalanceEffects(repository, localUserId);
      if (repair.repaired > 0) {
        emitFinanceDataUpdated(localUserId, "wallet:legacy-income-delete-repair");
      }
      return repository.getWallets(localUserId, options, ...args);
    },

    async addExpense(localUserId, expense, ...args) {
      const result = await repository.addExpense(localUserId, expense, ...args);
      const savedExpense = result?.expense || result || expense;
      await syncManualExpenseLinkedTargetChange({
        localUserId,
        before: null,
        after: savedExpense,
        repository,
      });
      return emit(localUserId, "expense:add", result);
    },

    async updateExpense(localUserId, expenseId, patch, ...args) {
      const before = await findExpenseById(repository, localUserId, expenseId);
      const result = await repository.updateExpense(localUserId, expenseId, patch, ...args);
      const after = result?.expense || (before ? { ...before, ...(patch || {}) } : patch);
      await syncManualExpenseLinkedTargetChange({
        localUserId,
        before,
        after,
        repository,
      });
      return emit(localUserId, "expense:update", result);
    },

    async deleteExpense(localUserId, expenseId, ...args) {
      const before = await findExpenseById(repository, localUserId, expenseId);
      const result = await repository.deleteExpense(localUserId, expenseId, ...args);
      if (before) {
        await syncManualExpenseLinkedTargetChange({
          localUserId,
          before,
          after: null,
          repository,
        });
      }
      return emit(localUserId, "expense:delete", result);
    },

    async addWallet(localUserId, wallet, ...args) {
      const result = await repository.addWallet(localUserId, wallet, ...args);
      return emit(localUserId, "wallet:add", result);
    },

    async updateWallet(localUserId, walletId, patch, ...args) {
      const result = await repository.updateWallet(localUserId, walletId, patch, ...args);
      return emit(localUserId, "wallet:update", result);
    },

    async deleteWallet(localUserId, walletId, ...args) {
      const result = await repository.deleteWallet(localUserId, walletId, ...args);
      return emit(localUserId, "wallet:delete", result);
    },

    async insertWalletTransaction(localUserId, transaction, ...args) {
      const result = await repository.insertWalletTransaction(localUserId, transaction, ...args);
      return emit(localUserId, "wallet_transaction:add", result);
    },

    async updateWalletTransaction(localUserId, transactionId, patch, ...args) {
      const result = await repository.updateWalletTransaction(localUserId, transactionId, patch, ...args);
      return emit(localUserId, "wallet_transaction:update", result);
    },

    async deleteWalletTransaction(localUserId, transactionId, ...args) {
      const result = await repository.deleteWalletTransaction(localUserId, transactionId, ...args);
      return emit(localUserId, "wallet_transaction:delete", result);
    },

    async addIncome(localUserId, income, ...args) {
      const result = await repository.addIncome(localUserId, income, ...args);
      return emit(localUserId, "income:add", result);
    },

    async transferBetweenWallets(localUserId, transfer, ...args) {
      const result = await repository.transferBetweenWallets(localUserId, transfer, ...args);
      return emit(localUserId, "wallet_transfer:add", result);
    },

    async addBudget(localUserId, budget, ...args) {
      const result = await repository.addBudget(localUserId, budget, ...args);
      return emit(localUserId, "budget:add", result);
    },

    async updateBudget(localUserId, budgetId, patch, ...args) {
      const result = await repository.updateBudget(localUserId, budgetId, patch, ...args);
      return emit(localUserId, "budget:update", result);
    },

    async deleteBudget(localUserId, budgetId, ...args) {
      const result = await repository.deleteBudget(localUserId, budgetId, ...args);
      return emit(localUserId, "budget:delete", result);
    },

    async upsertBudget(localUserId, budget, ...args) {
      const result = await repository.upsertBudget(localUserId, budget, ...args);
      return emit(localUserId, "budget:upsert", result);
    },

    async upsertSavingsGoal(localUserId, goal, ...args) {
      const result = await repository.upsertSavingsGoal(localUserId, goal, ...args);
      return emit(localUserId, "savings_goal:upsert", result);
    },

    async upsertEmergencyFund(localUserId, emergencyFund, ...args) {
      const result = await repository.upsertEmergencyFund(localUserId, emergencyFund, ...args);
      return emit(localUserId, "emergency_fund:upsert", result);
    },
  };
}

export function createFinanceRepository(options = {}) {
  return decorateFinanceRepository(createCoreFinanceRepository(options));
}

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
export async function addWallet(localUserId, wallet, options) {
  return financeRepository.addWallet(localUserId, wallet, options);
}
export async function updateWallet(localUserId, walletId, patch, options) {
  return financeRepository.updateWallet(localUserId, walletId, patch, options);
}
export async function deleteWallet(localUserId, walletId, options) {
  return financeRepository.deleteWallet(localUserId, walletId, options);
}

export async function getWalletTransactions(localUserId, options) {
  return financeRepository.getWalletTransactions(localUserId, options);
}
export async function insertWalletTransaction(localUserId, transaction, options) {
  return financeRepository.insertWalletTransaction(localUserId, transaction, options);
}
export async function updateWalletTransaction(localUserId, transactionId, patch, options) {
  return financeRepository.updateWalletTransaction(localUserId, transactionId, patch, options);
}
export async function deleteWalletTransaction(localUserId, transactionId, options) {
  return financeRepository.deleteWalletTransaction(localUserId, transactionId, options);
}
export async function deleteIncome(localUserId, transactionId, options) {
  return financeRepository.deleteWalletTransaction(localUserId, transactionId, options);
}
export async function addIncome(localUserId, incomePayload, options) {
  return financeRepository.addIncome(localUserId, incomePayload, options);
}
export async function addMoney(localUserId, incomePayload, options) {
  return financeRepository.addIncome(localUserId, incomePayload, options);
}

export async function transferBetweenWallets(localUserId, transferPayload, options) {
  return financeRepository.transferBetweenWallets(localUserId, transferPayload, options);
}
export async function getTransfers(localUserId, options) {
  return financeRepository.getTransfers(localUserId, options);
}

export async function getBudgets(localUserId, options) {
  return financeRepository.getBudgets(localUserId, options);
}
export async function addBudget(localUserId, budget, options) {
  return financeRepository.addBudget(localUserId, budget, options);
}
export async function updateBudget(localUserId, budgetId, patch, options) {
  return financeRepository.updateBudget(localUserId, budgetId, patch, options);
}
export async function deleteBudget(localUserId, budgetId, options) {
  return financeRepository.deleteBudget(localUserId, budgetId, options);
}
export async function upsertBudget(localUserId, budget, options) {
  return financeRepository.upsertBudget(localUserId, budget, options);
}

export async function getSavingsGoals(localUserId, options) {
  const [goals, expenses] = await Promise.all([
    financeRepository.getSavingsGoals(localUserId, options),
    financeRepository.getExpenses(localUserId),
  ]);
  return reconcileSavingsGoalsWithLinkedExpenses(goals, expenses);
}
export async function upsertSavingsGoal(localUserId, goal, options) {
  return financeRepository.upsertSavingsGoal(localUserId, goal, options);
}

export async function getEmergencyFund(localUserId, options) {
  return financeRepository.getEmergencyFund(localUserId, options);
}
export async function upsertEmergencyFund(localUserId, emergencyFund, options) {
  return financeRepository.upsertEmergencyFund(localUserId, emergencyFund, options);
}
