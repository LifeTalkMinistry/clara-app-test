export const FREE_PLAN_KEY = "free";
export const COMMITTED_PLAN_KEY = "committed_249";
export const FREE_ACCESS_LEVEL = "free";
export const COMMITTED_ACCESS_LEVEL = "committed";
export const COMMITTED_PRODUCT_ID = "clara_commitment_249";
export const CUSTOMER_PLAN_KEYS = [FREE_PLAN_KEY, COMMITTED_PLAN_KEY];
export const CUSTOMER_ACCESS_LEVEL_KEYS = [FREE_ACCESS_LEVEL, COMMITTED_ACCESS_LEVEL];
export const DEVELOPER_MEMBERSHIP_PREVIEW_KEY = "clara_dev_membership_preview";
export const LEGACY_DEVELOPER_PLAN_PREVIEW_KEY = "clara_dev_plan_preview";

export const LEGACY_PAID_PLAN_ALIASES = Object.freeze({
  committed: COMMITTED_PLAN_KEY,
  committed_249: COMMITTED_PLAN_KEY,
  clara_commitment_249: COMMITTED_PLAN_KEY,
  pro: COMMITTED_PLAN_KEY,
  pro99: COMMITTED_PLAN_KEY,
  pro_99: COMMITTED_PLAN_KEY,
  pro_tools: COMMITTED_PLAN_KEY,
  protools: COMMITTED_PLAN_KEY,
  clara_pro_99: COMMITTED_PLAN_KEY,
  core: COMMITTED_PLAN_KEY,
  core199: COMMITTED_PLAN_KEY,
  core_199: COMMITTED_PLAN_KEY,
  core_599: COMMITTED_PLAN_KEY,
  program: COMMITTED_PLAN_KEY,
  clara_core_199: COMMITTED_PLAN_KEY,
  life_os: COMMITTED_PLAN_KEY,
  lifeos: COMMITTED_PLAN_KEY,
  life_os_499: COMMITTED_PLAN_KEY,
  lifeos_499: COMMITTED_PLAN_KEY,
  clara_lifeos_499: COMMITTED_PLAN_KEY,
  coach: COMMITTED_PLAN_KEY,
  coaching: COMMITTED_PLAN_KEY,
  coaching_1299: COMMITTED_PLAN_KEY,
  paid: COMMITTED_PLAN_KEY,
  premium: COMMITTED_PLAN_KEY,
});

export const LEGACY_PAID_ACCESS_ALIASES = Object.freeze({
  committed: COMMITTED_ACCESS_LEVEL,
  pro: COMMITTED_ACCESS_LEVEL,
  core: COMMITTED_ACCESS_LEVEL,
  life_os: COMMITTED_ACCESS_LEVEL,
  lifeos: COMMITTED_ACCESS_LEVEL,
  coach: COMMITTED_ACCESS_LEVEL,
  coaching: COMMITTED_ACCESS_LEVEL,
  paid: COMMITTED_ACCESS_LEVEL,
  premium: COMMITTED_ACCESS_LEVEL,
});

export const ACTIVE_MEMBERSHIP_STATUSES = new Set([
  "active",
  "activated",
  "approved",
  "committed",
  "paid",
  "completed",
  "confirmed",
  "verified",
  "current",
]);

export const PENDING_MEMBERSHIP_STATUSES = new Set([
  "pending",
  "processing",
  "submitted",
  "under_review",
  "awaiting_approval",
  "awaiting_review",
  "payment_pending",
  "google_play_pending",
  "google_play_processing",
  "purchase_pending",
  "purchase_processing",
  "pre_activation",
  "inactive",
  "cancelled",
  "canceled",
  "expired",
]);
