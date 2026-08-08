import { normalizePlanKey } from "@/lib/membership";

export const normalizeFinancialPlan = (plan) => normalizePlanKey(plan);

// Plan rank remains for compatibility with older stored records. Normal CLARA
// financial cards no longer depend on a paid plan.
export const getFinancialPlanRank = () => 1;

export const meetsFinancialPlanRequirement = () => true;
