import { createFinanceRepository as createCoreFinanceRepository } from "./financeRepositoryCore.js";
import {
  isBudgetExpenseScopeInitialized,
  isDerivedActiveBudgetHeader,
  seedFreshBudgetExpenseScope,
} from "./budgetExpenseIsolation.js";

export * from "./financeRepositoryCore.js";

const shouldSeedExpenseScope = (budget = {}) =>
  isDerivedActiveBudgetHeader(budget) && !isBudgetExpenseScopeInitialized(budget);

async function seedExpenseScope(repository, localUserId, budget = {}) {
  if (!shouldSeedExpenseScope(budget)) return budget;
  const expenses = await repository.getExpenses(localUserId);
  return seedFreshBudgetExpenseScope(budget, expenses);
}

function decorateBudgetExpenseIsolation(repository) {
  if (!repository || typeof repository !== "object") return repository;

  return {
    ...repository,

    async getBudgets(localUserId, options = {}) {
      const rows = await repository.getBudgets(localUserId, options);
      const budgets = Array.isArray(rows) ? rows : [];
      const legacyActiveHeader = budgets.find(
        (row) => row?.id && shouldSeedExpenseScope(row),
      );

      if (!legacyActiveHeader) return rows;

      try {
        // One-time migration for an already-active budget created before fresh-session
        // isolation existed. Everything that already exists becomes historical to this
        // budget; only expenses created after this baseline can affect it.
        const seeded = await seedExpenseScope(repository, localUserId, legacyActiveHeader);
        const saved = await repository.updateBudget(localUserId, legacyActiveHeader.id, seeded);
        const resolved = saved || seeded;

        return budgets.map((row) =>
          String(row?.id || "") === String(legacyActiveHeader.id) ? resolved : row,
        );
      } catch (error) {
        console.warn("CLARA could not initialize the fresh budget expense boundary:", error);
        return rows;
      }
    },

    async addBudget(localUserId, budget, ...args) {
      const scopedBudget = await seedExpenseScope(repository, localUserId, budget);
      return repository.addBudget(localUserId, scopedBudget, ...args);
    },

    async updateBudget(localUserId, budgetId, patch, ...args) {
      const scopedPatch = await seedExpenseScope(repository, localUserId, patch);
      return repository.updateBudget(localUserId, budgetId, scopedPatch, ...args);
    },

    async upsertBudget(localUserId, budget, ...args) {
      const scopedBudget = await seedExpenseScope(repository, localUserId, budget);
      return repository.upsertBudget(localUserId, scopedBudget, ...args);
    },
  };
}

export function createFinanceRepository(options = {}) {
  return decorateBudgetExpenseIsolation(createCoreFinanceRepository(options));
}

export const financeRepository = createFinanceRepository();

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
