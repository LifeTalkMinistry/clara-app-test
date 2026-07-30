import {
  LOCAL_FINANCE_STORES,
  getLocalRecords,
  upsertLocalRecord,
} from "./localFinanceStore.js";
import {
  DEBT_OBLIGATION_RECORD_KIND,
  getDebtBalance,
  getDebtObligationMode,
} from "./debtObligationMath.js";

const EMERGENCY_BUDGET_KEY = "protected-emergency-fund";
const SAVINGS_BUDGET_PREFIX = "protected-savings-";
const DEBT_OBLIGATION_STORE =
  LOCAL_FINANCE_STORES?.privatePreferences || "private_preferences";

const toAmount = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/php/gi, "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const text = (value) => String(value ?? "").trim();
const lower = (value) => text(value).toLowerCase();
const normalizedLabel = (value) =>
  lower(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const isSavingsUsageExpense = (expense = {}) => {
  const identity = normalizedLabel([
    expense?.source_type,
    expense?.sourceType,
    expense?.type,
    expense?.category,
    expense?.title,
    expense?.notes,
  ].filter(Boolean).join(" "));
  return identity.includes("savings goal usage") || identity.includes("savings goal used");
};
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

const getExpenseCategory = (expense = {}) =>
  text(
    expense?.budget_category ||
      expense?.budgetCategory ||
      expense?.expense_category ||
      expense?.category ||
      expense?.title ||
      expense?.name
  );

const getRecordTitle = (record = {}) =>
  text(
    record?.title ||
      record?.name ||
      record?.category ||
      record?.budget_category ||
      record?.goal_name ||
      record?.lender ||
      record?.creditor ||
      record?.label
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

async function findSavingsTargetByTitle({ category, localUserId, repository }) {
  if (!category || typeof repository?.getSavingsGoals !== "function") return null;

  const categoryKey = normalizedLabel(category);
  if (!categoryKey) return null;

  const goals = activeRows(await repository.getSavingsGoals(localUserId));
  const goal = goals.find(
    (item) => normalizedLabel(getRecordTitle(item)) === categoryKey
  );
  const goalId = text(goal?.id || goal?.goal_id || goal?.key);
  return goalId ? { type: "savings", id: goalId } : null;
}

async function findDebtTarget({ budgetId, category, localUserId, repository }) {
  const categoryKey = normalizedLabel(category);

  if (typeof repository?.getBudgets === "function") {
    const budgets = activeRows(await repository.getBudgets(localUserId));
    const linkedBudget = budgets.find((row) => {
      const id = text(row?.id || row?.key);
      const titleKey = normalizedLabel(getRecordTitle(row));
      return Boolean(
        (budgetId && id && id === budgetId) ||
          (categoryKey && titleKey && titleKey === categoryKey)
      );
    });

    if (linkedBudget) {
      const debtId = text(linkedBudget?.source_debt_id || linkedBudget?.sourceDebtId);
      const isDebt =
        linkedBudget?.is_commitment === true ||
        linkedBudget?.isCommitment === true ||
        normalizedLabel(linkedBudget?.commitment_type || linkedBudget?.commitmentType) === "debt" ||
        Boolean(debtId);

      if (isDebt && debtId) return { type: "debt", id: debtId };
    }
  }

  if (!categoryKey) return null;

  const rows = await getLocalRecords(DEBT_OBLIGATION_STORE, localUserId);
  const obligations = activeRows(rows).filter(
    (item) => item?.recordKind === DEBT_OBLIGATION_RECORD_KIND
  );
  const debt = obligations.find(
    (item) => normalizedLabel(getRecordTitle(item)) === categoryKey
  );
  return debt?.id ? { type: "debt", id: text(debt.id) } : null;
}

async function resolveManualExpenseTarget({ expense, localUserId, repository }) {
  if (!expense) return null;
  if (isSavingsUsageExpense(expense)) return null;

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

  const category = getExpenseCategory(expense);
  const categoryKey = normalizedLabel(category);
  if (categoryKey === "emergency fund") return { type: "emergency", id: "" };

  const savingsTarget = await findSavingsTargetByTitle({
    category,
    localUserId,
    repository,
  });
  if (savingsTarget) return savingsTarget;

  const budgetId = text(expense?.budget_category_id || expense?.budgetCategoryId || budgetKey);
  return findDebtTarget({ budgetId, category, localUserId, repository });
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

  const rows = await getLocalRecords(DEBT_OBLIGATION_STORE, localUserId);
  const obligations = activeRows(rows).filter(
    (item) => item?.recordKind === DEBT_OBLIGATION_RECORD_KIND
  );
  const debt = obligations.find((item) => text(item?.id) === text(targetId));
  if (!debt) throw new Error("The linked Debt / Obligation could not be found.");

  const current = getDebtBalance(debt);
  const mode = getDebtObligationMode(debt);
  const next = mode === "recurring" ? current : Math.max(current - delta, 0);
  const now = new Date().toISOString();
  const completed = mode === "balance" && next <= 0;
  const record = {
    ...debt,
    id: debt.id,
    recordKind: DEBT_OBLIGATION_RECORD_KIND,
    localUserId: text(debt.localUserId || localUserId),
    obligationMode: mode,
    obligation_mode: mode,
    totalDebt: next,
    balance: next,
    amount: next,
    debt_balance: next,
    status: completed ? "completed" : "active",
    paidAt: completed ? now : null,
    paid_at: completed ? now : null,
    lastPaymentAmount: delta > 0 ? delta : debt.lastPaymentAmount || null,
    last_payment_amount: delta > 0 ? delta : debt.last_payment_amount || null,
    lastPaidAt: delta > 0 ? now : debt.lastPaidAt || null,
    last_paid_at: delta > 0 ? now : debt.last_paid_at || null,
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
        detail: {
          localUserId,
          debtId: debt.id,
          balance: next,
          status: record.status,
          obligationMode: mode,
        },
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
  const beforeTarget = await resolveManualExpenseTarget({ expense: before, localUserId, repository });
  const afterTarget = await resolveManualExpenseTarget({ expense: after, localUserId, repository });
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
