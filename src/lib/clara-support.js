export const SUPPORT_TIERS = Object.freeze({
  supporter: Object.freeze({
    // Backend compatibility key. Product-facing name is Take Control.
    key: "supporter",
    membershipKey: "core",
    name: "Take Control",
    price: 99,
    productId: "clara_supporter_99",
    positioning: "Start being intentional with your money.",
    benefits: Object.freeze([
      "CLARA ORB",
      "Ask Before You Spend",
      "Means Score",
      "Wallet",
      "Money Schedule",
      "Weekly Cross-Check",
    ]),
  }),
  builder: Object.freeze({
    // Backend compatibility key. Product-facing name is Stay Consistent.
    key: "builder",
    membershipKey: "personal",
    name: "Stay Consistent",
    price: 149,
    productId: "clara_builder_249",
    recommended: true,
    positioning: "More continuity, personalization, and accountability.",
    benefits: Object.freeze([
      "Everything in Take Control",
      "Unlimited AI",
      "Personalized guidance",
      "Personal context",
      "Reminders",
      "Follow-ups",
    ]),
  }),
  champion: Object.freeze({
    // Backend compatibility key. Product-facing name is Don't Do It Alone.
    key: "champion",
    membershipKey: "partner",
    name: "Don't Do It Alone",
    price: 299,
    productId: "clara_champion_499",
    positioning: "Add a real person to your accountability system.",
    benefits: Object.freeze([
      "Everything in Stay Consistent",
      "One 30-minute human accountability session each month",
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

  // Canonical users.plan may represent an administrator-assigned membership
  // with no billing expiration. Billing-backed records still require a future
  // expiration timestamp.
  if (String(record.source || "").toLowerCase() === "account_plan") {
    return record.active !== false;
  }

  const expiresAt = Date.parse(record.support_expires_at || record.support_expiration_date || "");
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt > Number(now);
}

export function getSupportDisplayState(record, now = Date.now()) {
  if (!isSupportRecordActive(record, now)) {
    return { active: false, label: "Membership", compactLabel: "CLARA", tier: null };
  }

  return {
    active: true,
    label: "Active",
    compactLabel: "CLARA",
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
