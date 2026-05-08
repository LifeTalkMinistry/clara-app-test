const PLAN_RANK = {
  free: 0,
  pro: 1,
  core: 2,
  lifeos: 3,
  life_os: 3,
  coach: 3,
  coaching: 3,
  admin: 99,
};

export const normalizeFinancialPlan = (plan) =>
  String(plan || "free")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const getFinancialPlanRank = (plan) =>
  PLAN_RANK[normalizeFinancialPlan(plan)] ?? PLAN_RANK.free;

export const meetsFinancialPlanRequirement = (currentPlan, minimumPlan = "free") =>
  getFinancialPlanRank(currentPlan) >= getFinancialPlanRank(minimumPlan);
