import useBudgetCardLogicCore, {
  getBudgetMessage,
  safeNumber,
} from "./useBudgetCardLogicCore";

export * from "./useBudgetCardLogicCore";

export default function useBudgetCardLogic(options = {}) {
  const result = useBudgetCardLogicCore(options);
  const declared = safeNumber(result?.declared);
  const spent = safeNumber(result?.spent);
  const remaining = Math.max(declared - spent, 0);

  return {
    ...result,
    remaining,
    message: getBudgetMessage(
      result?.hasDeclaredBudget,
      result?.hasCategories,
      result?.progress,
      remaining,
    ),
    budgetPace: result?.budgetPace
      ? {
          ...result.budgetPace,
          safeDailyPace: remaining,
        }
      : result?.budgetPace,
  };
}
