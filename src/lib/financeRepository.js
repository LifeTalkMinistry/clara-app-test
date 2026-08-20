import { createFinanceRepository as createCoreFinanceRepository } from "./financeRepositoryCore.js";
import { syncManualExpenseLinkedTargetChange } from "./manualExpenseLinkedTargetSync.js";
import { reconcileSavingsGoalsWithLinkedExpenses } from "./savingsGoalLinkedExpenseRepair.js";

export * from "./financeRepositoryCore.js";

export const FINANCE_DATA_UPDATED_EVENT = "clara:finance-data-updated";
let financeDataRevision = 0;

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
