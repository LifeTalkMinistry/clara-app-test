import {
  DEBT_OBLIGATION_RECORD_KIND,
  DEBT_OBLIGATION_STORE,
  getDebtObligations,
  toDebtNumber,
} from "@/lib/debtObligationStore";
import { upsertLocalRecord } from "@/lib/localFinanceStore";

const EMERGENCY_BUDGET_KEY = "protected-emergency-fund";
const SAVINGS_BUDGET_PREFIX = "protected-savings-";

const toAmount = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/php/gi, "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const text = (value) => String(value ?? "").trim();
const lower = (value) => text(value).toLowerCase();
const activeRows = (rows = []) =>
  (Array.isArray(rows) ? rows : []).filter((row) => !row?.deletedAt && !row?.deleted_at);

const firstAmount = (source = {}, keys = []) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return toAmount(value);
  }
  return 0;
};

const getExpenseBudgetKey = (expense = {}) =>
  text(
    expense?.budgetListKey ||
      expense?.budget_list_key ||
      expense?.budget_category_id ||
      expense?.budgetCategoryId
  );

const getExplicitTarget = (expense = {}) => {
  const type = lower(
    expense?.linked_target_type ||
      expense?.linkedTargetType ||
      expense?.protection_type ||
      expense?.protectionType
  );
  const id = text(
    expense?.linked_target_id ||
      expense?.linkedTargetId ||
      expense?.source_savings_goal_id ||
      expense?.sourceSavingsGoalId ||
      expense?.source_debt_id ||
      expense?.sourceDebtId
  );

  if (["savings", "emergency", "debt"].includes(type)) return { type, id };
  return null;
};

async function resolveManualExpenseTarget({ expense, localUserId, repository }) {
  if (!expense) return null;

  const explicit = getExplicitTarget(expense);
  if (explicit) return explicit;

  const budgetKey = getExpenseBudgetKey(expense);
  if (budgetKey === EMERGENCY_BUDGET_KEY) return { type: "emergency", id: "" };
  if (budgetKey.startsWith(SAVINGS_BUDGET_PREFIX)) {
    return {
      type: "savings",
      id: budgetKey.slice(SAVINGS_BUDGET_PREFIX.length),
    };
  }

  const directDebtId = text(expense?.source_debt_id || expense?.sourceDebtId);
  if (directDebtId) return { type: "debt", id: directDebtId };

  const budgetId = text(expense?.budget_category_id || expense?.budgetCategoryId || budgetKey);
  if (!budgetId || typeof repository?.getBudgets !== "function") return null;

  const budgets = activeRows(await repository.getBudgets(localUserId));
  const linkedBudget = budgets.find((row) => {
    const id = text(row?.id || row?.key);
    return id && id === budgetId;
  });
  if (!linkedBudget) return null;

  const debtId = text(linkedBudget?.source_debt_id || linkedBudget?.sourceDebtId);
  const isDebt =
    linkedBudget?.is_commitment === true ||
    linkedBudget?.isCommitment === true ||
    lower(linkedBudget?.commitment_type || linkedBudget?.commitmentType) === "debt" ||
    Boolean(debtId);

  return isDebt && debtId ? { type: "debt", id: debtId } : null;
}

const sameTarget = (left, right) =>
  Boolean(left && right && left.type === right.type && text(left.id) === text(right.id));

async function applySavingsDelta({ localUserId, targetId, delta, repository }) {
  if (!targetId || typeof repository?.getSavingsGoals !== "function" || typeof repository?.upsertSavingsGoal !== "function") {
    throw new Error("Savings Goal link is unavailable for this manual expense.");
  }

  const goals = activeRows(await repository.getSavingsGoals(localUserId));
  const goal = goals.find((item) => text(item?.id || item?.goal_id || item?.key) === text(targetId));
  if (!goal) throw new Error("The linked Savings Goal could not be found.");

  const current = firstAmount(goal, [
    "saved_amount",
    "savedAmount",
    "current_amount",
    "currentAmount",
    "saved",
    "current",
    "amount",
  ]);
  const next = Math.max(current + delta, 0);
  const now = new Date().toISOString();

  return repository.upsertSavingsGoal(localUserId, {
    ...goal,
    id: goal.id || targetId,
    saved_amount: next,
    savedAmount: next,
    current_amount: next,
    currentAmount: next,
    saved: next,
    current: next,
    updatedAt: now,
    updated_at: now,
  });
}

async function applyEmergencyDelta({ localUserId, delta, repository }) {
  if (typeof repository?.getEmergencyFund !== "function" || typeof repository?.upsertEmergencyFund !== "function") {
    throw new Error("Emergency Fund link is unavailable for this manual expense.");
  }

  const fund = (await repository.getEmergencyFund(localUserId)) || {};
  const current = firstAmount(fund, [
    "protectedBalance",
    "protected_balance",
    "reserveBalance",
    "reserve_balance",
    "savedAmount",
    "saved_amount",
    "currentAmount",
    "current_amount",
    "amount",
    "balance",
    "moneyLeft",
  ]);
  const next = Math.max(current + delta, 0);
  const now = new Date().toISOString();

  return repository.upsertEmergencyFund(localUserId, {
    ...fund,
    savedAmount: next,
    saved_amount: next,
    currentAmount: next,
    current_amount: next,
    amount: next,
    balance: next,
    moneyLeft: next,
    protectedBalance: next,
    protected_balance: next,
    reserveBalance: next,
    reserve_balance: next,
    updatedAt: now,
    updated_at: now,
  });
}

async function applyDebtDelta({ localUserId, targetId, delta }) {
  if (!targetId) throw new Error("Debt / Obligation link is missing its target.");

  const obligations = activeRows(await getDebtObligations(localUserId));
  const debt = obligations.find((item) => text(item?.id) === text(targetId));
  if (!debt) throw new Error("The linked Debt / Obligation could not be found.");

  const current = toDebtNumber(
    debt?.totalDebt ?? debt?.balance ?? debt?.amount ?? debt?.debt_balance ?? 0
  );
  const next = Math.max(current - delta, 0);
  const now = new Date().toISOString();
  const record = {
    ...debt,
    id: debt.id,
    recordKind: DEBT_OBLIGATION_RECORD_KIND,
    localUserId: text(debt.localUserId || localUserId),
    totalDebt: next,
    balance: next,
    amount: next,
    debt_balance: next,
    updatedAt: now,
    updated_at: now,
    deletedAt: null,
    deleted_at: null,
    syncStatus: debt.syncStatus || "local_only",
    source: "local",
  };

  const result = await upsertLocalRecord(DEBT_OBLIGATION_STORE, record, localUserId);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("clara:debt-obligations-updated", {
        detail: { localUserId, debtId: debt.id, balance: next },
      })
    );
  }

  return result;
}

async function applyTargetDelta({ localUserId, target, delta, repository }) {
  if (!target || !Number.isFinite(delta) || delta === 0) return null;

  if (target.type === "savings") {
    return applySavingsDelta({ localUserId, targetId: target.id, delta, repository });
  }
  if (target.type === "emergency") {
    return applyEmergencyDelta({ localUserId, delta, repository });
  }
  if (target.type === "debt") {
    return applyDebtDelta({ localUserId, targetId: target.id, delta });
  }
  return null;
}

export async function syncManualExpenseLinkedTargetChange({
  localUserId,
  before = null,
  after = null,
  repository,
} = {}) {
  const beforeTarget = await resolveManualExpenseTarget({ before, expense: before, localUserId, repository });
  const afterTarget = await resolveManualExpenseTarget({ after, expense: after, localUserId, repository });
  const beforeAmount = before ? Math.abs(toAmount(before.amount)) : 0;
  const afterAmount = after ? Math.abs(toAmount(after.amount)) : 0;

  if (!beforeTarget && !afterTarget) return null;

  if (sameTarget(beforeTarget, afterTarget)) {
    return applyTargetDelta({
      localUserId,
      target: afterTarget,
      delta: afterAmount - beforeAmount,
      repository,
    });
  }

  if (beforeTarget && beforeAmount > 0) {
    await applyTargetDelta({
      localUserId,
      target: beforeTarget,
      delta: -beforeAmount,
      repository,
    });
  }

  if (afterTarget && afterAmount > 0) {
    return applyTargetDelta({
      localUserId,
      target: afterTarget,
      delta: afterAmount,
      repository,
    });
  }

  return null;
}

export const MANUAL_EXPENSE_LINK_KEYS = {
  emergency: EMERGENCY_BUDGET_KEY,
  savingsPrefix: SAVINGS_BUDGET_PREFIX,
};
