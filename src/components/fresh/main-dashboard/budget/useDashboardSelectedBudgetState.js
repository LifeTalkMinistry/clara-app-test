import { useMemo } from "react";

const EMERGENCY_KEY = "protected-emergency-fund";
const SAVINGS_PREFIX = "protected-savings-";

const getGoalIdentity = (goal = {}) =>
  String(goal?.id || goal?.goal_id || goal?.key || "").trim();

const getGoalTitle = (goal = {}) =>
  String(goal?.title || goal?.name || goal?.goal_name || "Savings Goal").trim() ||
  "Savings Goal";

function getProtectedSelection(budgetListKey) {
  const key = String(budgetListKey || "").trim();
  if (!key) return null;

  if (key === EMERGENCY_KEY) {
    return {
      key,
      id: key,
      title: "Emergency Fund",
      isProtectedCommitment: true,
      protectionType: "emergency",
      budget: {
        id: key,
        key,
        title: "Emergency Fund",
        isProtectedCommitment: true,
        is_protected_commitment: true,
        protectionType: "emergency",
        protection_type: "emergency",
        linkedTargetType: "emergency",
        linked_target_type: "emergency",
      },
    };
  }

  if (!key.startsWith(SAVINGS_PREFIX)) return null;

  const goalId = key.slice(SAVINGS_PREFIX.length);
  const goals =
    typeof window !== "undefined" &&
    Array.isArray(window.__CLARA_BUDGET_PROTECTION_CONTEXT?.savingsGoals)
      ? window.__CLARA_BUDGET_PROTECTION_CONTEXT.savingsGoals
      : [];
  const goal = goals.find((item) => getGoalIdentity(item) === goalId) || null;
  const title = getGoalTitle(goal);

  return {
    key,
    id: key,
    title,
    isProtectedCommitment: true,
    protectionType: "savings",
    budget: {
      ...(goal || {}),
      id: key,
      key,
      title,
      isProtectedCommitment: true,
      is_protected_commitment: true,
      protectionType: "savings",
      protection_type: "savings",
      sourceSavingsGoalId: goalId,
      source_savings_goal_id: goalId,
      linkedTargetType: "savings",
      linked_target_type: "savings",
      linkedTargetId: goalId,
      linked_target_id: goalId,
    },
  };
}

export default function useDashboardSelectedBudgetState({
  financeForm = {},
  manualExpenseBudgetOptions = [],
} = {}) {
  const selectedManualExpenseBudget = useMemo(() => {
    const selected = (Array.isArray(manualExpenseBudgetOptions)
      ? manualExpenseBudgetOptions
      : []
    ).find((item) => String(item.key) === String(financeForm.budgetListKey));

    return selected || getProtectedSelection(financeForm.budgetListKey) || null;
  }, [financeForm.budgetListKey, manualExpenseBudgetOptions]);

  const selectedBudgetListLabel = useMemo(() => {
    if (financeForm.budgetListKey === "__unplanned__") return "Unplanned Spending";
    if (financeForm.budgetListKey === "__undocumented__") {
      return "Undocumented Spending";
    }
    return selectedManualExpenseBudget?.title || "Select budget list";
  }, [financeForm.budgetListKey, selectedManualExpenseBudget?.title]);

  return {
    selectedManualExpenseBudget,
    selectedBudgetListLabel,
  };
}
