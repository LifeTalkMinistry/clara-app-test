import { getSavingsGoals } from "@/lib/financeRepository";
import { getDebtObligations } from "@/lib/debtObligationStore";
import { getEffectiveDemoFinanceLocalUserId } from "@/lib/demo/activeDemoProfile";
import {
  buildDebtObligationScheduleProjection,
  buildSavingsGoalScheduleProjection,
} from "@/lib/financialCardScheduleProjection";

export {
  DEBT_OBLIGATION_SCHEDULE_SOURCE,
  SAVINGS_GOAL_SCHEDULE_SOURCE,
  buildDebtObligationScheduleProjection,
  buildSavingsGoalScheduleProjection,
  isFinancialCardScheduleProjection,
} from "@/lib/financialCardScheduleProjection";

export async function loadFinancialCardScheduleProjections({
  referenceDate = new Date(),
} = {}) {
  const financeLocalUserId = getEffectiveDemoFinanceLocalUserId();
  const [savingsGoals, debtObligations] = await Promise.all([
    getSavingsGoals(financeLocalUserId),
    getDebtObligations(financeLocalUserId),
  ]);

  return {
    savingsGoalEvents: buildSavingsGoalScheduleProjection(savingsGoals),
    debtEvents: buildDebtObligationScheduleProjection(debtObligations, {
      referenceDate,
    }),
    financeLocalUserId,
  };
}
