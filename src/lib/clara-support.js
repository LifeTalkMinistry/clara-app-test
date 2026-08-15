export const SUPPORT_TIERS = Object.freeze({
  supporter: Object.freeze({
    key: "supporter",
    name: "CLARA Supporter",
    price: 99,
    productId: "clara_supporter_99",
    positioning: "Help keep CLARA free.",
    benefits: Object.freeze([
      "Supporter badge and recognition",
      "Supporter polls and product feedback",
      "Recognition for helping keep CLARA free",
    ]),
  }),
  builder: Object.freeze({
    key: "builder",
    name: "CLARA Builder",
    price: 249,
    productId: "clara_builder_249",
    recommended: true,
    positioning: "Help us build CLARA.",
    benefits: Object.freeze([
      "Everything from Supporter",
      "CLARA Builder badge",
      "Supporter development and progress updates",
      "Stronger product feedback and voting",
      "Monthly group financial coaching / Q&A with Max",
    ]),
  }),
  champion: Object.freeze({
    key: "champion",
    name: "CLARA Champion",
    price: 499,
    productId: "clara_champion_499",
    positioning: "Support the mission and personally work with Max.",
    benefits: Object.freeze([
      "Everything from Builder",
      "CLARA Champion badge",
      "One 30-minute private financial coaching session with Max per supported month",
      "Priority coaching booking",
      "Higher-level supporter recognition",
    ]),
  }),
});

export const SUPPORT_TIER_KEYS = Object.freeze(Object.keys(SUPPORT_TIERS));
export const SUPPORT_PRODUCT_IDS = Object.freeze(
  SUPPORT_TIER_KEYS.map((key) => SUPPORT_TIERS[key].productId)
);

export const SUPPORT_ENGAGEMENT_METRICS = Object.freeze([
  "daily_streak_consistency",
  "ask_before_you_spend_usage",
  "budget_completion",
  "savings_goal_activity",
  "community_engagement",
  "app_retention",
  "coaching_attendance",
  "support_retention",
]);

export function normalizeSupportTier(value) {
  const key = String(value || "").trim().toLowerCase();
  return SUPPORT_TIER_KEYS.includes(key) ? key : null;
}

export function getSupportTier(value) {
  const key = normalizeSupportTier(value);
  return key ? SUPPORT_TIERS[key] : null;
}

export function getSupportTierByProductId(productId) {
  const target = String(productId || "").trim();
  return SUPPORT_TIER_KEYS.map((key) => SUPPORT_TIERS[key]).find(
    (tier) => tier.productId === target
  ) || null;
}

export function isSupportRecordActive(record, now = Date.now()) {
  if (!record || String(record.status || "").toLowerCase() !== "active") return false;
  if (!normalizeSupportTier(record.tier || record.tierKey)) return false;

  // The canonical users.plan authority may represent an administrator-assigned
  // supporter tier with no billing expiration. Billing-backed records continue
  // to require a future support_expires_at timestamp.
  if (String(record.source || "").toLowerCase() === "account_plan") {
    return record.active !== false;
  }

  const expiresAt = Date.parse(record.support_expires_at || record.support_expiration_date || "");
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt > Number(now);
}

export function getSupportDisplayState(record, now = Date.now()) {
  if (!isSupportRecordActive(record, now)) {
    return { active: false, label: "Support", compactLabel: "💙", tier: null };
  }

  return {
    active: true,
    label: "Thank you",
    compactLabel: "💙",
    tier: normalizeSupportTier(record.tier || record.tierKey),
  };
}

export function getChampionAvailability(config = {}) {
  const cap = Number(config.champion_slot_cap);
  const used = Number(config.champion_slots_used);
  if (!Number.isInteger(cap) || cap <= 0 || !Number.isInteger(used) || used < 0) {
    return null;
  }
  return { cap, used, available: Math.max(cap - used, 0) };
}
