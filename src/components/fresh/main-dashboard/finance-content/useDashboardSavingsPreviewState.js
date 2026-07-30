import { useMemo } from "react";

const readSavingsNumber = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;

    const normalized =
      typeof value === "string"
        ? value.replace(/[₱,\s]/g, "")
        : value;
    const parsed = Number(normalized);

    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
};

const getSavingsSaved = (goal = {}) =>
  readSavingsNumber(
    goal?.saved_amount,
    goal?.savedAmount,
    goal?.current_amount,
    goal?.currentAmount,
    goal?.saved,
    goal?.progress_amount,
    goal?.progressAmount,
    goal?.amount_saved,
    goal?.amountSaved
  );

const getSavingsTarget = (goal = {}) =>
  readSavingsNumber(
    goal?.target_amount,
    goal?.targetAmount,
    goal?.goal_amount,
    goal?.goalAmount,
    goal?.target,
    goal?.goal,
    goal?.amount_target,
    goal?.amountTarget,
    goal?.desired_amount,
    goal?.desiredAmount,
    goal?.amount
  );

const isActiveSavingsGoal = (goal) =>
  Boolean(goal && !goal?.deletedAt && !goal?.deleted_at);

export default function useDashboardSavingsPreviewState({
  savingsGoals = [],
} = {}) {
  const activeSavingsGoals = useMemo(
    () =>
      (Array.isArray(savingsGoals) ? savingsGoals : []).filter(
        isActiveSavingsGoal
      ),
    [savingsGoals]
  );

  const totalSavingsTarget = useMemo(
    () =>
      activeSavingsGoals.reduce(
        (sum, goal) => sum + getSavingsTarget(goal),
        0
      ),
    [activeSavingsGoals]
  );

  const totalSavingsSaved = useMemo(
    () =>
      activeSavingsGoals.reduce(
        (sum, goal) => sum + getSavingsSaved(goal),
        0
      ),
    [activeSavingsGoals]
  );

  const primarySavingsGoal = useMemo(
    () => activeSavingsGoals[0] || null,
    [activeSavingsGoals]
  );

  return {
    totalSavingsTarget,
    totalSavingsSaved,
    primarySavingsGoal,
  };
}
