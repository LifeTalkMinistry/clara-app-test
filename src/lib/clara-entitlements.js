export const CLARA_PRODUCTS = {
  pro: {
    planKey: "pro_99",
    tierType: "pro_tools",
    productId: "pro_99",
    productType: "subscription",
    price: 99,
    continuationMonths: 0,
    coachingCredits: 0,
    completedTier: 1,
  },
  program: {
    planKey: "core_599",
    tierType: "clara_program",
    productId: "core_199",
    productType: "one_time",
    price: 199,
    continuationMonths: 1,
    coachingCredits: 0,
    completedTier: 2,
  },
  coaching: {
    planKey: "coaching_1299",
    tierType: "clara_coaching",
    productId: "life_os_499",
    productType: "one_time",
    price: 499,
    continuationMonths: 2,
    coachingCredits: 2,
    completedTier: 3,
  },
};

export const CLARA_PRODUCT_IDS = Object.values(CLARA_PRODUCTS).reduce((acc, product) => {
  acc[product.planKey] = product.productId;
  return acc;
}, {});

const PRODUCT_BY_ID = Object.values(CLARA_PRODUCTS).reduce((acc, product) => {
  acc[product.productId] = product;
  return acc;
}, {});

const PRODUCT_BY_PLAN = Object.values(CLARA_PRODUCTS).reduce((acc, product) => {
  acc[product.planKey] = product;
  return acc;
}, {});

const DAY_MS = 24 * 60 * 60 * 1000;

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function getClaraProductByPlan(planKey) {
  return PRODUCT_BY_PLAN[normalize(planKey)] || null;
}

export function getClaraProductById(productId) {
  return PRODUCT_BY_ID[String(productId ?? "").trim()] || null;
}

export function isProgramPlan(planKey) {
  const product = getClaraProductByPlan(planKey);
  return product?.planKey === "core_599" || product?.planKey === "coaching_1299";
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isFuture(value, now = new Date()) {
  const date = toDate(value);
  return Boolean(date && date.getTime() > now.getTime());
}

function addMonths(dateValue, months) {
  const date = toDate(dateValue) || new Date();
  const next = new Date(date);
  next.setMonth(next.getMonth() + Number(months || 0));
  return next;
}

export function getProgramWindowEnd(startedAt) {
  const start = toDate(startedAt);
  if (!start) return null;
  return new Date(start.getTime() + 30 * DAY_MS);
}

export function getHighestCompletedTier(profile = {}) {
  return Math.max(
    Number(profile.highest_completed_tier || 0),
    profile.has_completed_coaching_tier_1299 ? 3 : 0,
    profile.has_completed_program_tier_599 ? 2 : 0
  );
}

export function getEligiblePlanKeys(profile = {}) {
  const highest = getHighestCompletedTier(profile);
  if (highest >= 3) return ["pro_99"];
  if (highest === 2) return ["pro_99", "coaching_1299"];
  return ["pro_99", "core_599", "coaching_1299"];
}

export function canOfferPlan(profile = {}, planKey) {
  return getEligiblePlanKeys(profile).includes(normalize(planKey));
}

export function getCoachingCredits(profile = {}) {
  const total = Number(profile.coaching_credits_total || 0);
  const used = Number(profile.coaching_credits_used || 0);
  return {
    total,
    used,
    remaining: Math.max(0, Number(profile.coaching_credits_remaining ?? total - used)),
  };
}

export function deriveEffectiveEntitlements(profile = {}, now = new Date()) {
  const proSubscriptionActive =
    normalize(profile.pro_subscription_status) === "active" ||
    normalize(profile.subscription_status) === "active" ||
    isFuture(profile.pro_subscription_expires_at, now);

  const programStarted = Boolean(profile.challenge_started || profile.program_started_at);
  const programCompleted = Boolean(profile.program_completed_at);
  const programStart = toDate(profile.program_started_at || profile.challenge_started_at);
  const programEnd = toDate(profile.program_ends_at) || getProgramWindowEnd(programStart);
  const programActive = Boolean(
    programStarted &&
      !programCompleted &&
      programEnd &&
      programEnd.getTime() > now.getTime()
  );

  const continuationActive =
    Boolean(profile.program_completed_at) &&
    isFuture(profile.continuation_pro_ends_at, now) &&
    (!profile.continuation_pro_starts_at ||
      !toDate(profile.continuation_pro_starts_at) ||
      toDate(profile.continuation_pro_starts_at).getTime() <= now.getTime());

  const hasProAccess = proSubscriptionActive || programActive || continuationActive;
  const hasProgramAccess =
    programActive ||
    (!programCompleted &&
      ["core_599", "coaching_1299"].includes(normalize(profile.plan)) &&
      normalize(profile.entitlement_status || profile.status) !== "revoked");

  let effectivePlan = "free";
  if (hasProgramAccess) {
    effectivePlan = normalize(profile.tier_type) === "clara_coaching" || normalize(profile.plan) === "coaching_1299"
      ? "coaching_1299"
      : "core_599";
  } else if (hasProAccess) {
    effectivePlan = "pro_99";
  }

  return {
    effectivePlan,
    hasProAccess,
    hasProgramAccess,
    proSubscriptionActive,
    programActive,
    programCompleted,
    continuationActive,
    programStarted,
    programStart,
    programEnd,
    continuationStartsAt: toDate(profile.continuation_pro_starts_at),
    continuationEndsAt: toDate(profile.continuation_pro_ends_at),
    highestCompletedTier: getHighestCompletedTier(profile),
    coachingCredits: getCoachingCredits(profile),
  };
}

export function buildProgramCompletionPatch(profile = {}, completedAt = new Date()) {
  const planProduct = getClaraProductByPlan(profile.plan);
  const tierType = normalize(profile.tier_type);
  const isCoaching = planProduct?.planKey === "coaching_1299" || tierType === "clara_coaching";
  const isProgram = planProduct?.planKey === "core_599" || tierType === "clara_program";
  const continuationMonths = isCoaching ? 2 : isProgram ? 1 : 0;
  const startsAt = toDate(completedAt) || new Date();
  const endsAt = continuationMonths > 0 ? addMonths(startsAt, continuationMonths) : null;
  const highestCompletedTier = Math.max(getHighestCompletedTier(profile), isCoaching ? 3 : isProgram ? 2 : 0);

  return {
    program_completed_at: startsAt.toISOString(),
    continuation_pro_starts_at: startsAt.toISOString(),
    continuation_pro_ends_at: endsAt ? endsAt.toISOString() : null,
    entitlement_status: endsAt ? "continuation_pro" : "completed",
    has_completed_program_tier_599: Boolean(profile.has_completed_program_tier_599 || isProgram),
    has_completed_coaching_tier_1299: Boolean(profile.has_completed_coaching_tier_1299 || isCoaching),
    highest_completed_tier: highestCompletedTier,
    plan: endsAt ? "pro_99" : "free",
    status: endsAt ? "approved" : "free",
    enrollment_status: endsAt ? "active" : "completed",
    is_enrolled: false,
    program_active: false,
  };
}
