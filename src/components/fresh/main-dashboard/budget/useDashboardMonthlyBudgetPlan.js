import useDashboardMonthlyBudgetPlanCore from "./useDashboardMonthlyBudgetPlanCore";

export default function useDashboardMonthlyBudgetPlan(options = {}) {
  // The budget engine already owns the real cycle boundary through
  // tracking_started_at / reset_start_at and cycle_end. Do not remove expenses
  // by a saved id baseline here: doing so makes valid spending disappear after
  // a later budget edit or migration even though it is still inside the cycle.
  return useDashboardMonthlyBudgetPlanCore(options);
}
