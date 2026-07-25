import { createFinanceRepository as createCoreFinanceRepository } from "./financeRepositoryCore.js";
import { syncManualExpenseLinkedTargetChange } from "./manualExpenseLinkedTargetSync.js";
import { reconcileSavingsGoalsWithLinkedExpenses } from "./savingsGoalLinkedExpenseRepair.js";

export * from "./financeRepositoryCore.js";

async function findExpenseById(repository, localUserId, expenseId) {
  if (!expenseId || typeof repository?.getExpenses !== "function") return null;
  const rows = await repository.getExpenses(localUserId, { includeDeleted: true });
  return (Array.isArray(rows) ? rows : []).find(
    (row) => String(row?.id || "") === String(expenseId)
  ) || null;
}

function decorateFinanceRepository(repository) {
  if (!repository || typeof repository !== "object") return repository;

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

      return result;
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

      return result;
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

      return result;
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

export async function getBudgets(localUserId, options) {
  return financeRepository.getBudgets(localUserId, options);
}

export async function addBudget(localUserId, budget, options) {
  return financeRepository.addBudget(localUserId, budget, options);
}

export async function updateBudget(localUserId, budgetId, patch, options) {
  return financeRepository.updateBudget(localUserId, budgetId, patch, options);
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
