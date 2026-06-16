import {
  COMMITTED_ACCESS_LEVEL,
  COMMITTED_PLAN_KEY,
  COMMITTED_PRODUCT_ID,
  CUSTOMER_ACCESS_LEVEL_KEYS,
  CUSTOMER_PLAN_KEYS,
  FREE_ACCESS_LEVEL,
  FREE_PLAN_KEY,
  LEGACY_PAID_PLAN_ALIASES,
  normalizeAccessLevel as normalizeCanonicalAccessLevel,
  normalizePlanKey as normalizeCanonicalPlanKey,
} from "@/lib/membership";

export const CURRENT_PLAN_KEYS = [...CUSTOMER_PLAN_KEYS];
export const ACCESS_LEVEL_KEYS = [...CUSTOMER_ACCESS_LEVEL_KEYS];
export const LEGACY_PLAN_ALIASES = {
  free: FREE_PLAN_KEY,
  free_version: FREE_PLAN_KEY,
  ...LEGACY_PAID_PLAN_ALIASES,
};
export const PLAN_ACCESS_LEVELS = {
  [FREE_PLAN_KEY]: FREE_ACCESS_LEVEL,
  [COMMITTED_PLAN_KEY]: COMMITTED_ACCESS_LEVEL,
};
export const ACCESS_LEVEL_PLAN_KEYS = {
  [FREE_ACCESS_LEVEL]: FREE_PLAN_KEY,
  [COMMITTED_ACCESS_LEVEL]: COMMITTED_PLAN_KEY,
};
export const PLAN_LABELS = {
  [FREE_PLAN_KEY]: "Free Version",
  [COMMITTED_PLAN_KEY]: "Committed",
};
export const PLAN_BADGE_STYLES = {
  [FREE_PLAN_KEY]: "bg-white/10 text-white border-white/10",
  [COMMITTED_PLAN_KEY]: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  admin: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/20",
  advertiser: "bg-sky-500/15 text-sky-300 border-sky-400/20",
};

export const FEATURE_DEFINITIONS = [
  { key: "dashboard", label: "Dashboard", description: "Main CLARA home and overview surfaces.", modes: ["off", "full"] },
  { key: "feed", label: "Feed", description: "Social feed for progress sharing, wins, and daily motivation.", modes: ["off", "full"] },
  { key: "expenses", label: "Expenses", description: "Transaction logging and expense tracking.", modes: ["off", "full"] },
  { key: "wallets", label: "Wallets", description: "Wallet balances and money containers.", modes: ["off", "full"] },
  { key: "budgets", label: "Budgets", description: "Budget setup and budget tracking.", modes: ["off", "full"] },
  { key: "analytics", label: "Analytics", description: "Insights, charts, and timeframe depth.", modes: ["off", "limited", "full"] },
  { key: "ai", label: "AI Intelligence", description: "CLARA summaries, decisions, simulations, and spending guidance.", modes: ["off", "full"] },
  { key: "customization", label: "Customization", description: "Theme, background, card styling, and emergency-fund personalization.", modes: ["off", "full"] },
  { key: "savings_goals", label: "Savings Goals", description: "Savings goals and emergency-fund style planning.", modes: ["off", "full"] },
  { key: "tasks", label: "Tasks", description: "Guided commitment tasks and progress actions.", modes: ["off", "preview", "full"] },
  { key: "modules", label: "Modules", description: "Weekly learning modules and playback.", modes: ["off", "preview", "full"] },
  { key: "community", label: "Community", description: "Private community space for deeper conversations and connection.", modes: ["off", "view", "full"] },
  { key: "messages", label: "Messages", description: "Private messaging and admin conversations.", modes: ["off", "admin_only", "full"] },
  { key: "coaching", label: "Guidance", description: "Guided support and accountability surfaces.", modes: ["off", "teaser", "full"] },
  { key: "news", label: "News", description: "News and CLARA updates.", modes: ["off", "full"] },
  { key: "referrals", label: "Referrals", description: "Referral and ambassador access.", modes: ["off", "full"] },
];

export const FEATURE_LABELS = FEATURE_DEFINITIONS.reduce((acc, feature) => {
  acc[feature.key] = feature.label;
  return acc;
}, {});

export const FEATURE_ROUTE_MAP = {
  "/dashboard": "dashboard",
  "/feed": "feed",
  "/expenses": "expenses",
  "/add-funds": "wallets",
  "/wallets": "wallets",
  "/budgets": "budgets",
  "/analytics": "analytics",
  "/ai": "ai",
  "/savings-goals": "savings_goals",
  "/tasks": "tasks",
  "/modules": "modules",
  "/community": "community",
  "/messages": "messages",
  "/news": "news",
  "/referrals": "referrals",
};

export const FEATURE_MODE_LABELS = {
  off: "Off",
  full: "Full",
  limited: "Limited",
  preview: "Preview",
  view: "View Only",
  admin_only: "Admin Only",
  teaser: "Teaser",
};

const FREE_ACCESS_CONFIG = {
  dashboard: "full",
  feed: "full",
  expenses: "full",
  wallets: "full",
  budgets: "full",
  analytics: "off",
  ai: "off",
  customization: "off",
  savings_goals: "off",
  tasks: "off",
  modules: "off",
  community: "off",
  messages: "off",
  coaching: "off",
  news: "full",
  referrals: "off",
};

const COMMITTED_ACCESS_CONFIG = FEATURE_DEFINITIONS.reduce((acc, feature) => {
  acc[feature.key] = feature.modes.includes("full") ? "full" : feature.modes.find((mode) => mode !== "off") || "off";
  return acc;
}, {});

export const PLAN_DEFAULTS = {
  [FREE_PLAN_KEY]: {
    key: FREE_PLAN_KEY,
    name: "Free Version",
    price: 0,
    description: "Use CLARA’s essential money tracking tools for free.",
    features: ["Dashboard access", "Expense tracking", "Wallet tracking", "Budget tracking", "News and updates"],
    cta_label: "Start Free",
    active: true,
    popular: false,
    sort_order: 1,
    access_config: FREE_ACCESS_CONFIG,
  },
  [COMMITTED_PLAN_KEY]: {
    key: COMMITTED_PLAN_KEY,
    name: "Committed",
    price: 249,
    product_id: COMMITTED_PRODUCT_ID,
    billing_type: "subscription",
    description: "Unlock the complete CLARA experience through one monthly commitment.",
    features: ["Complete CLARA financial system", "Full AI guidance", "Me and Schedule access", "Learning Hub and committed features"],
    cta_label: "Start Your Commitment",
    active: true,
    popular: true,
    sort_order: 2,
    access_config: COMMITTED_ACCESS_CONFIG,
  },
};

export function normalizePlanKey(value) {
  return normalizeCanonicalPlanKey(value);
}
export function normalizeAccessLevel(value, fallback = FREE_ACCESS_LEVEL) {
  return normalizeCanonicalAccessLevel(value, fallback);
}
export function getAccessLevelForPlan(planKey, fallback = FREE_ACCESS_LEVEL) {
  return PLAN_ACCESS_LEVELS[normalizePlanKey(planKey)] || normalizeAccessLevel(planKey, fallback);
}
export function getPlanKeyForAccessLevel(accessLevel, fallback = FREE_PLAN_KEY) {
  return ACCESS_LEVEL_PLAN_KEYS[normalizeAccessLevel(accessLevel)] || fallback;
}
export function isPaidPlan(planKey) {
  return normalizePlanKey(planKey) === COMMITTED_PLAN_KEY;
}
export function getFeatureDefinition(featureKey) {
  return FEATURE_DEFINITIONS.find((feature) => feature.key === featureKey) || null;
}
export function normalizeFeatureMode(featureKey, value) {
  const definition = getFeatureDefinition(featureKey);
  const normalized = String(value ?? "").trim().toLowerCase().replaceAll("-", "_");
  const aliases = {
    view_only: "view",
    readonly: "view",
    read_only: "view",
    basic: "full",
    advanced: "full",
    // Compatibility alias only. Older stored configs used this as a paid/full feature mode.
    life_os: "full",
  };
  const canonical = aliases[normalized] || normalized;
  if (definition?.modes.includes(canonical)) return canonical;
  return definition?.modes?.[0] || "off";
}
export function normalizeAccessConfig(accessConfig = {}, planKey = FREE_PLAN_KEY) {
  const normalizedPlanKey = normalizePlanKey(planKey);
  const baseConfig = PLAN_DEFAULTS[normalizedPlanKey]?.access_config || PLAN_DEFAULTS[FREE_PLAN_KEY].access_config;
  const source = accessConfig && typeof accessConfig === "object" && !Array.isArray(accessConfig) ? accessConfig : {};
  return FEATURE_DEFINITIONS.reduce((acc, feature) => {
    acc[feature.key] = normalizeFeatureMode(feature.key, source[feature.key] ?? baseConfig[feature.key]);
    return acc;
  }, {});
}
export function getPlanDefaults(planKey) {
  const normalizedPlanKey = normalizePlanKey(planKey);
  const defaults = PLAN_DEFAULTS[normalizedPlanKey] || PLAN_DEFAULTS[FREE_PLAN_KEY];
  return {
    plan_key: normalizedPlanKey,
    name: defaults.name,
    price: defaults.price,
    product_id: defaults.product_id,
    billing_type: defaults.billing_type,
    description: defaults.description,
    features: [...defaults.features],
    cta_label: defaults.cta_label,
    active: defaults.active,
    popular: defaults.popular,
    sort_order: defaults.sort_order,
    access_config: normalizeAccessConfig(defaults.access_config, normalizedPlanKey),
  };
}
export function sanitizePlanRow(row = {}) {
  const planKey = normalizePlanKey(row.plan_key || row.key || row.name);
  const defaults = getPlanDefaults(planKey);
  const features = Array.isArray(row.features)
    ? row.features.map((item) => String(item).trim()).filter(Boolean)
    : typeof row.features === "string"
      ? row.features.split("\n").map((item) => item.trim()).filter(Boolean)
      : defaults.features;
  return {
    ...row,
    plan_key: planKey,
    name: defaults.name,
    price: Number(defaults.price),
    product_id: defaults.product_id || "",
    billing_type: defaults.billing_type || "",
    description: String(row.description || defaults.description).trim(),
    features,
    cta_label: String(row.cta_label || defaults.cta_label).trim(),
    active: typeof row.active === "boolean" ? row.active : defaults.active,
    popular: typeof row.popular === "boolean" ? row.popular : defaults.popular,
    sort_order: Number(row.sort_order ?? row.display_order ?? defaults.sort_order),
    access_config: normalizeAccessConfig(row.access_config, planKey),
  };
}
export function mergePlans(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    const normalized = sanitizePlanRow(row);
    const existing = map.get(normalized.plan_key);
    if (!existing) return map.set(normalized.plan_key, normalized);
    const existingUpdatedAt = new Date(existing.updated_at || existing.created_at || 0).getTime();
    const nextUpdatedAt = new Date(normalized.updated_at || normalized.created_at || 0).getTime();
    map.set(normalized.plan_key, nextUpdatedAt >= existingUpdatedAt ? normalized : existing);
  });
  CURRENT_PLAN_KEYS.forEach((planKey) => {
    if (!map.has(planKey)) map.set(planKey, sanitizePlanRow(getPlanDefaults(planKey)));
  });
  return CURRENT_PLAN_KEYS.map((planKey) => map.get(planKey));
}
export function getFeatureMode(planLike, featureKey) {
  const plan = planLike?.access_config ? planLike : sanitizePlanRow({ plan_key: planLike });
  return normalizeFeatureMode(featureKey, plan?.access_config?.[featureKey]);
}
export function hasFeatureMode(planLike, featureKey, allowedModes = ["full"]) {
  const allowed = Array.isArray(allowedModes) ? allowedModes : [allowedModes];
  return allowed.includes(getFeatureMode(planLike, featureKey));
}
export function isFeatureEnabled(planLike, featureKey) {
  return getFeatureMode(planLike, featureKey) !== "off";
}
export function getFeatureSummary(planLike) {
  const plan = sanitizePlanRow(planLike);
  return FEATURE_DEFINITIONS.filter((feature) => isFeatureEnabled(plan, feature.key)).map((feature) => ({
    key: feature.key,
    label: feature.label,
    mode: getFeatureMode(plan, feature.key),
  }));
}
