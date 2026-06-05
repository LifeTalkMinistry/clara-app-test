const PLAN_RANK = {
  free: 0,
  pro: 1,
  pro_99: 1,
  core: 2,
  core_199: 2,
  lifeos: 3,
  admin: 99,
};

export const normalizeFinancialPlan = (plan) => String(plan || "free").trim().toLowerCase();

export const getFinancialPlanRank = (plan) => PLAN_RANK[normalizeFinancialPlan(plan)] ?? PLAN_RANK.free;

export const meetsFinancialPlanRequirement = (currentPlan, minimumPlan = "free") =>
  getFinancialPlanRank(currentPlan) >= getFinancialPlanRank(minimumPlan);
