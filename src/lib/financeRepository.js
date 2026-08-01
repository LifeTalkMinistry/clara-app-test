import { createFinanceRepository as createCoreFinanceRepository } from "./financeRepositoryCore.js";
import { getStoredBackendUser } from "./clara-backend-client.js";
import { syncServerFinance } from "./server-finance-sync.js";
import { syncManualExpenseLinkedTargetChange } from "./manualExpenseLinkedTargetSync.js";
import { reconcileSavingsGoalsWithLinkedExpenses } from "./savingsGoalLinkedExpenseRepair.js";

export * from "./financeRepositoryCore.js";

const MUTATION_PREFLIGHT_HOOK = "__claraPrepareServerFinanceMutation";

async function findExpenseById(repository, localUserId, expenseId) {
  if (!expenseId || typeof repository?.getExpenses !== "function") return null;
  const rows = await repository.getExpenses(localUserId, { includeDeleted: true });
  return (
    (Array.isArray(rows) ? rows : []).find(
      (row) => String(row?.id || "") === String(expenseId)
    ) || null
  );
}

async function prepareServerVersionBeforeMutation(localUserId) {
  const user = getStoredBackendUser();
  const storedUserId = String(user?.id || "").trim();
  const targetUserId = String(localUserId || "").trim();

  if (!user || !storedUserId || storedUserId !== targetUserId) return;

  try {
    const runtimeHook = globalThis?.[MUTATION_PREFLIGHT_HOOK];
    if (typeof runtimeHook === "function") {
      await runtimeHook({ localUserId: targetUserId });
      return;
    }

    await syncServerFinance({ user });
  } catch {
    // Preserve offline-first behavior. The local mutation remains available and
    // the sync bridge uploads it after connectivity returns.
  }
}

function decorateFinanceRepository(repository) {
  if (!repository || typeof repository !== "object") return repository;

  return {
    ...repository,

    async addExpense(localUserId, expense, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      const result = await repository.addExpense(localUserId, expense, ...args);
      const savedExpense = result?.expense || result || expense;

      await syncManualExpenseLinkedTargetChange({
        localUserId,
        before: null,
        after: savedExpense,
        repository,
      });

      return result;
    },

    async updateExpense(localUserId, expenseId, patch, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      const before = await findExpenseById(repository, localUserId, expenseId);
      const result = await repository.updateExpense(
        localUserId,
        expenseId,
        patch,
        ...args
      );
      const after = result?.expense || (before ? { ...before, ...(patch || {}) } : patch);

      await syncManualExpenseLinkedTargetChange({
        localUserId,
        before,
        after,
        repository,
      });

      return result;
    },

    async deleteExpense(localUserId, expenseId, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
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

      return result;
    },

    async addWallet(localUserId, wallet, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      return repository.addWallet(localUserId, wallet, ...args);
    },

    async updateWallet(localUserId, walletId, patch, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      return repository.updateWallet(localUserId, walletId, patch, ...args);
    },

    async deleteWallet(localUserId, walletId, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      return repository.deleteWallet(localUserId, walletId, ...args);
    },

    async insertWalletTransaction(localUserId, transaction, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      return repository.insertWalletTransaction(localUserId, transaction, ...args);
    },

    async updateWalletTransaction(localUserId, transactionId, patch, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      return repository.updateWalletTransaction(
        localUserId,
        transactionId,
        patch,
        ...args
      );
    },

    async deleteWalletTransaction(localUserId, transactionId, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      return repository.deleteWalletTransaction(localUserId, transactionId, ...args);
    },

    async addIncome(localUserId, income, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      return repository.addIncome(localUserId, income, ...args);
    },

    async addMoney(localUserId, payload, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      return repository.addIncome(localUserId, payload, ...args);
    },

    async transferBetweenWallets(localUserId, payload, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      return repository.transferBetweenWallets(localUserId, payload, ...args);
    },

    async addBudget(localUserId, budget, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      return repository.addBudget(localUserId, budget, ...args);
    },

    async updateBudget(localUserId, budgetId, patch, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      return repository.updateBudget(localUserId, budgetId, patch, ...args);
    },

    async deleteBudget(localUserId, budgetId, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      return repository.deleteBudget(localUserId, budgetId, ...args);
    },

    async upsertBudget(localUserId, budget, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      return repository.upsertBudget(localUserId, budget, ...args);
    },

    async upsertSavingsGoal(localUserId, goal, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      return repository.upsertSavingsGoal(localUserId, goal, ...args);
    },

    async upsertEmergencyFund(localUserId, emergencyFund, ...args) {
      await prepareServerVersionBeforeMutation(localUserId);
      return repository.upsertEmergencyFund(localUserId, emergencyFund, ...args);
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

export async function updateWalletTransaction(
  localUserId,
  transactionId,
  patch,
  options
) {
  return financeRepository.updateWalletTransaction(
    localUserId,
    transactionId,
    patch,
    options
  );
}

export async function deleteWalletTransaction(localUserId, transactionId, options) {
  return financeRepository.deleteWalletTransaction(localUserId, transactionId, options);
}

export async function deleteIncome(localUserId, transactionId, options) {
  return financeRepository.deleteWalletTransaction(localUserId, transactionId, options);
}

export async function addIncome(localUserId, income, options) {
  return financeRepository.addIncome(localUserId, income, options);
}

export async function addMoney(localUserId, payload, options) {
  return financeRepository.addMoney(localUserId, payload, options);
}

export async function transferBetweenWallets(localUserId, payload, options) {
  return financeRepository.transferBetweenWallets(localUserId, payload, options);
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
