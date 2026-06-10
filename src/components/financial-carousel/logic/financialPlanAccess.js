import { COMMITTED_PLAN_KEY, normalizePlanKey } from "@/lib/membership";
const PLAN_RANK = { free: 0, [COMMITTED_PLAN_KEY]: 1, admin: 99, advertiser: 99 };
export const normalizeFinancialPlan = (plan) => normalizePlanKey(plan);
export const getFinancialPlanRank = (plan) => PLAN_RANK[normalizeFinancialPlan(plan)] ?? PLAN_RANK.free;
export const meetsFinancialPlanRequirement = (currentPlan, minimumPlan = "free") =>
  getFinancialPlanRank(currentPlan) >= getFinancialPlanRank(minimumPlan);
