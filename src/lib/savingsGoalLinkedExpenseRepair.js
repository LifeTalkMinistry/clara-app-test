import { isSavingsGoalActive } from "./savingsGoalLifecycle.js";

const SAVINGS_BUDGET_PREFIX = "protected-savings-";

const numberValue = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/php/gi, "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const text = (value) => String(value ?? "").trim();
const normalized = (value) =>
  text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const activeRows = (rows = []) =>
  (Array.isArray(rows) ? rows : []).filter((row) => !row?.deletedAt && !row?.deleted_at);

export const getCanonicalSavingsAmount = (goal = {}) => {
  const candidates = [
    goal?.saved_amount,
    goal?.savedAmount,
    goal?.current_amount,
    goal?.currentAmount,
    goal?.saved,
    goal?.current,
    goal?.amount_saved,
    goal?.amountSaved,
    goal?.progress_amount,
    goal?.amount,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === "") continue;
    return Math.max(0, numberValue(candidate));
  }

  return 0;
};

const getGoalId = (goal = {}) => text(goal?.id || goal?.goal_id || goal?.key);
const getGoalTitle = (goal = {}) =>
  normalized(goal?.title || goal?.name || goal?.goal_name || goal?.label);

const getExpenseAmount = (expense = {}) =>
  Math.abs(numberValue(expense?.amount ?? expense?.spent ?? expense?.value ?? expense?.total));

const getExpenseBudgetKey = (expense = {}) =>
  text(
    expense?.budgetListKey ||
      expense?.budget_list_key ||
      expense?.budget_category_id ||
      expense?.budgetCategoryId,
  );

const getExpenseLinkedType = (expense = {}) =>
  normalized(
    expense?.linked_target_type ||
      expense?.linkedTargetType ||
      expense?.protection_type ||
      expense?.protectionType,
  );

const getExpenseLinkedId = (expense = {}) =>
  text(
    expense?.linked_target_id ||
      expense?.linkedTargetId ||
      expense?.source_savings_goal_id ||
      expense?.sourceSavingsGoalId,
  );

const getExpenseIdentityText = (expense = {}) =>
  normalized(
    expense?.budget_category ||
      expense?.budgetCategory ||
      expense?.expense_category ||
      expense?.category ||
      expense?.title ||
      expense?.name,
  );

const isSavingsUsageExpense = (expense = {}) => {
  const identity = normalized([
    expense?.source_type,
    expense?.sourceType,
    expense?.type,
    expense?.category,
    expense?.title,
    expense?.notes,
  ].filter(Boolean).join(" "));

  return identity.includes("savings goal usage") || identity.includes("savings goal used");
};

const hasSavingsUseActivity = (goal = {}) => {
  const logs = [
    goal?.savingsActivityLog,
    goal?.savings_activity_log,
    goal?.activityLog,
    goal?.activity_log,
  ].find(Array.isArray) || [];

  return logs.some((entry) => {
    const type = normalized(entry?.type || entry?.action || entry?.event_type || entry?.eventType);
    return type === "use" || type === "withdraw" || type === "withdrawal" || type === "spent";
  });
};

const expenseLinksToGoal = (expense = {}, goal = {}) => {
  if (isSavingsUsageExpense(expense)) return false;
  const goalId = getGoalId(goal);
  if (!goalId) return false;

  const linkedType = getExpenseLinkedType(expense);
  const linkedId = getExpenseLinkedId(expense);
  if (linkedType === "savings" && linkedId && linkedId === goalId) return true;
  if (linkedId && linkedId === goalId) return true;

  const budgetKey = getExpenseBudgetKey(expense);
  if (budgetKey === `${SAVINGS_BUDGET_PREFIX}${goalId}`) return true;

  // Older Manual Log rows did not always persist the synthetic protected key.
  // Exact category/title equality is the safest backwards-compatible fallback.
  const goalTitle = getGoalTitle(goal);
  return Boolean(goalTitle && getExpenseIdentityText(expense) === goalTitle);
};

export const getLinkedSavingsExpenseTotal = (goal = {}, expenses = []) =>
  activeRows(expenses).reduce((sum, expense) => {
    return expenseLinksToGoal(expense, goal) ? sum + getExpenseAmount(expense) : sum;
  }, 0);

export const reconcileSavingsGoalWithLinkedExpenses = (goal = {}, expenses = []) => {
  const stored = getCanonicalSavingsAmount(goal);
  const linkedExpenseTotal = getLinkedSavingsExpenseTotal(goal, expenses);

  // A linked savings expense proves at least that amount has been allocated to the goal.
  // Do not enforce this floor after a recorded withdrawal/use because current savings can
  // legitimately be lower than historical contributions.
  const repaired = hasSavingsUseActivity(goal)
    ? stored
    : Math.max(stored, linkedExpenseTotal);

  return {
    ...goal,
    saved_amount: repaired,
    savedAmount: repaired,
    current_amount: repaired,
    currentAmount: repaired,
    saved: repaired,
    current: repaired,
    amount_saved: repaired,
    amountSaved: repaired,
    linkedSavingsExpenseTotal: linkedExpenseTotal,
    linked_savings_expense_total: linkedExpenseTotal,
  };
};

export const reconcileSavingsGoalsWithLinkedExpenses = (goals = [], expenses = []) =>
  (Array.isArray(goals) ? goals : [])
    .filter(isSavingsGoalActive)
    .map((goal) => reconcileSavingsGoalWithLinkedExpenses(goal, expenses));
