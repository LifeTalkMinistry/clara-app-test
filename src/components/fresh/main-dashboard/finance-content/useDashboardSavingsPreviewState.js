import { useMemo } from "react";
import {
  getSavingsSaved,
  getSavingsTarget,
} from "@/utils/dashboard/dashboardHelpers";

export default function useDashboardSavingsPreviewState({
  savingsGoals = [],
} = {}) {
  const safeSavingsGoals = Array.isArray(savingsGoals) ? savingsGoals : [];

  const totalSavingsTarget = useMemo(
    () => safeSavingsGoals.reduce((sum, goal) => sum + getSavingsTarget(goal), 0),
    [safeSavingsGoals]
  );

  const totalSavingsSaved = useMemo(
    () => safeSavingsGoals.reduce((sum, goal) => sum + getSavingsSaved(goal), 0),
    [safeSavingsGoals]
  );

  const primarySavingsGoal = useMemo(
    () => safeSavingsGoals[0] || null,
    [safeSavingsGoals]
  );

  return {
    totalSavingsTarget,
    totalSavingsSaved,
    primarySavingsGoal,
  };
}
