import {
  LOCAL_FINANCE_STORES,
  getLocalRecords,
  upsertLocalRecord,
  softDeleteLocalRecord,
} from "./localFinanceStore.js";
import { readClaraDevIdentityOverride } from "./clara-dev-simulator";

const STORE_NAME = LOCAL_FINANCE_STORES?.privatePreferences || "private_preferences";
const RECORD_KIND = "investment_plan";
const DEMO_LOCAL_USER_ID = "clara-demo-user";

const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const nowIso = () => new Date().toISOString();

const createId = () => {
  if (globalThis?.crypto?.randomUUID) {
    return `investment_plan_${globalThis.crypto.randomUUID()}`;
  }

  return `investment_plan_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
};

function getFinanceIdentityMode() {
  try {
    return readClaraDevIdentityOverride()?.scenarioId || "real_user";
  } catch {
    return "real_user";
  }
}

export function getInvestmentPlanLocalUserId(user) {
  if (getFinanceIdentityMode() === "demo_user") {
    return DEMO_LOCAL_USER_ID;
  }

  const value = user?.id || user?.email || "local-user";
  return String(value || "local-user").trim() || "local-user";
}

const normalizeStatus = (value = "idea_only") => {
  const normalized = String(value || "idea_only").trim().toLowerCase();

  if (["idea_only", "draft", "future_idea"].includes(normalized)) return "idea_only";
  if (["active", "active_test", "started"].includes(normalized)) return "active_test";
  if (["paused", "pause", "pause_investing"].includes(normalized)) return "paused";
  if (["completed", "done"].includes(normalized)) return "completed";

  return "idea_only";
};

export function normalizeInvestmentPlan(plan = {}) {
  const timestamp = nowIso();
  const status = normalizeStatus(plan.status);
  const requestedAmount = toNumber(plan.requestedAmount ?? plan.requested_amount ?? plan.amount);
  const approvedTestAmount = toNumber(
    plan.approvedTestAmount ?? plan.approved_test_amount ?? plan.safeRangeMax ?? plan.safe_range_max
  );

  return {
    ...plan,
    id: plan.id || createId(),
    kind: RECORD_KIND,
    recordType: RECORD_KIND,
    status,
    readinessStatus: plan.readinessStatus || plan.readiness_status || null,
    planType: plan.planType || plan.plan_type || "business",
    requestedAmount,
    requested_amount: requestedAmount,
    approvedTestAmount,
    approved_test_amount: approvedTestAmount,
    safeRangeMin: toNumber(plan.safeRangeMin ?? plan.safe_range_min ?? 0),
    safe_range_min: toNumber(plan.safeRangeMin ?? plan.safe_range_min ?? 0),
    safeRangeMax: toNumber(plan.safeRangeMax ?? plan.safe_range_max ?? approvedTestAmount),
    safe_range_max: toNumber(plan.safeRangeMax ?? plan.safe_range_max ?? approvedTestAmount),
    riskLevel: plan.riskLevel || plan.risk_level || "Low",
    risk_level: plan.riskLevel || plan.risk_level || "Low",
    timeHorizon: plan.timeHorizon || plan.time_horizon || "3–6 months",
    time_horizon: plan.timeHorizon || plan.time_horizon || "3–6 months",
    ideaReason: plan.ideaReason || plan.idea_reason || plan.reason || "",
    idea_reason: plan.ideaReason || plan.idea_reason || plan.reason || "",
    startDate: plan.startDate || plan.start_date || (status === "active_test" ? timestamp : null),
    start_date: plan.startDate || plan.start_date || (status === "active_test" ? timestamp : null),
    reviewDate: plan.reviewDate || plan.review_date || null,
    review_date: plan.reviewDate || plan.review_date || null,
    pausedAt: plan.pausedAt || plan.paused_at || (status === "paused" ? timestamp : null),
    paused_at: plan.pausedAt || plan.paused_at || (status === "paused" ? timestamp : null),
    completedAt: plan.completedAt || plan.completed_at || (status === "completed" ? timestamp : null),
    completed_at: plan.completedAt || plan.completed_at || (status === "completed" ? timestamp : null),
    notes: plan.notes || "",
    claraWarnings: Array.isArray(plan.claraWarnings)
      ? plan.claraWarnings
      : Array.isArray(plan.clara_warnings)
        ? plan.clara_warnings
        : [],
    clara_warnings: Array.isArray(plan.claraWarnings)
      ? plan.claraWarnings
      : Array.isArray(plan.clara_warnings)
        ? plan.clara_warnings
        : [],
    claraRecommendation: plan.claraRecommendation || plan.clara_recommendation || "",
    clara_recommendation: plan.claraRecommendation || plan.clara_recommendation || "",
    createdAt: plan.createdAt || plan.created_at || timestamp,
    created_at: plan.created_at || plan.createdAt || timestamp,
    updatedAt: timestamp,
    updated_at: timestamp,
    deletedAt: plan.deletedAt ?? plan.deleted_at ?? null,
    deleted_at: plan.deleted_at ?? plan.deletedAt ?? null,
    syncStatus: plan.syncStatus || "local_only",
    source: plan.source || "local",
  };
}

const sortNewest = (plans) =>
  [...(Array.isArray(plans) ? plans : [])].sort((a, b) => {
    const aTime = new Date(a?.updatedAt || a?.updated_at || a?.createdAt || 0).getTime();
    const bTime = new Date(b?.updatedAt || b?.updated_at || b?.createdAt || 0).getTime();
    return bTime - aTime;
  });

export async function getInvestmentPlans(localUserId) {
  const records = await getLocalRecords(STORE_NAME, localUserId);

  return sortNewest(
    (records || []).filter(
      (record) =>
        !record?.deletedAt &&
        !record?.deleted_at &&
        (record?.kind === RECORD_KIND || record?.recordType === RECORD_KIND)
    )
  );
}

export async function upsertInvestmentPlan(localUserId, plan) {
  return upsertLocalRecord(STORE_NAME, normalizeInvestmentPlan(plan), localUserId);
}

export async function updateInvestmentPlan(localUserId, id, patch = {}) {
  if (!id) throw new Error("Investment plan id is required.");

  const plans = await getInvestmentPlans(localUserId);
  const existingPlan = plans.find((plan) => String(plan.id) === String(id));

  if (!existingPlan) {
    throw new Error("Investment plan not found for this local user.");
  }

  return upsertInvestmentPlan(localUserId, {
    ...existingPlan,
    ...patch,
    id: existingPlan.id,
    createdAt: existingPlan.createdAt,
    created_at: existingPlan.created_at,
  });
}

export async function deleteInvestmentPlan(localUserId, id) {
  if (!id) throw new Error("Investment plan id is required.");
  return softDeleteLocalRecord(STORE_NAME, id, localUserId);
}
