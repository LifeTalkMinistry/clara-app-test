export const CURRENT_PLAN_KEYS = ["free", "pro_99", "core_199", "life_os_499"];
export const ACCESS_LEVEL_KEYS = ["pro", "core", "life_os"];

export const LEGACY_PLAN_ALIASES = {
  free: "free",

  pro: "pro_99",
  pro99: "pro_99",
  pro_99: "pro_99",
  pro_tools: "pro_99",
  protools: "pro_99",
  clara_pro_99: "pro_99",

  core: "core_199",
  core199: "core_199",
  core_199: "core_199",
  core_599: "core_199",
  program: "core_199",
  clara_core_199: "core_199",

  life_os: "life_os_499",
  lifeos: "life_os_499",
  life_os_499: "life_os_499",
  lifeos_499: "life_os_499",
  clara_lifeos_499: "life_os_499",
  coach: "life_os_499",
  coaching: "life_os_499",
  coaching_1299: "life_os_499",
};

export const PLAN_ACCESS_LEVELS = {
  pro_99: "pro",
  core_199: "core",
  life_os_499: "life_os",
};

export const ACCESS_LEVEL_PLAN_KEYS = {
  pro: "pro_99",
  core: "core_199",
  life_os: "life_os_499",
};

export const PLAN_LABELS = {
  free: "Free",
  pro_99: "Pro",
  core_199: "Core",
  life_os_499: "Life OS",
};

export const PLAN_BADGE_STYLES = {
  free: "bg-white/10 text-white border-white/10",
  pro_99: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20",
  core_199: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  life_os_499: "bg-amber-500/15 text-amber-300 border-amber-400/20",
  admin: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/20",
};

export const FEATURE_DEFINITIONS = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Main CLARA home and overview surfaces.",
    modes: ["off", "full"],
  },
  {
    key: "feed",
    label: "Feed",
    description: "Social feed for progress sharing, wins, and daily motivation.",
    modes: ["off", "full"],
  },
  {
    key: "expenses",
    label: "Expenses",
    description: "Transaction logging and expense tracking.",
    modes: ["off", "full"],
  },
  {
    key: "wallets",
    label: "Wallets",
    description: "Wallet balances and money containers.",
    modes: ["off", "full"],
  },
  {
    key: "budgets",
    label: "Budgets",
    description: "Budget setup and budget tracking.",
    modes: ["off", "full"],
  },
  {
    key: "analytics",
    label: "Analytics",
    description: "Insights, charts, and timeframe depth.",
    modes: ["off", "limited", "full"],
  },
  {
    key: "ai",
    label: "AI Intelligence",
    description: "Tier-aware summaries, decisions, simulations, and spending guidance.",
    modes: ["off", "basic", "advanced", "life_os"],
  },
  {
    key: "customization",
    label: "Customization",
    description: "Theme, background, card styling, and emergency-fund personalization.",
    modes: ["off", "full"],
  },
  {
    key: "savings_goals",
    label: "Savings Goals",
    description: "Savings goals and emergency-fund style planning.",
    modes: ["off", "full"],
  },
  {
    key: "tasks",
    label: "Tasks",
    description: "30-day guided tasks and challenge flow.",
    modes: ["off", "preview", "full"],
  },
  {
    key: "modules",
    label: "Modules",
    description: "Weekly learning modules and playback.",
    modes: ["off", "preview", "full"],
  },
  {
    key: "community",
    label: "Community",
    description: "Private community space for deeper conversations and connection.",
    modes: ["off", "view", "full"],
  },
  {
    key: "messages",
    label: "Messages",
    description: "Private messaging and admin conversations.",
    modes: ["off", "admin_only", "full"],
  },
  {
    key: "news",
    label: "News",
    description: "News and CLARA updates.",
    modes: ["off", "full"],
  },
  {
    key: "referrals",
    label: "Referrals",
    description: "Referral and ambassador access.",
    modes: ["off", "full"],
  },
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
  basic: "Basic",
  advanced: "Advanced",
  life_os: "Life OS",
};

export const PLAN_DEFAULTS = {
  free: {
    key: "free",
    name: "Free",
    price: 0,
    description: "Start with CLARA's core money tracking and unlock more any time.",
    features: [
      "Dashboard access",
      "Feed access",
      "Expense tracking",
      "Wallet tracking",
      "News and updates",
    ],
    cta_label: "Start Free",
    active: true,
    popular: false,
    sort_order: 1,
    access_config: {
      dashboard: "full",
      feed: "full",
      expenses: "full",
      wallets: "full",
      budgets: "off",
      analytics: "limited",
      ai: "off",
      customization: "off",
      savings_goals: "off",
      tasks: "off",
      modules: "off",
      community: "off",
      messages: "off",
      news: "full",
      referrals: "off",
    },
  },
  pro_99: {
    key: "pro_99",
    name: "Pro",
    price: 99,
    product_id: "clara_pro_99",
    billing_type: "subscription",
    description: "Unlock CLARA's Pro financial tools with a monthly Google Play subscription.",
    features: [
      "Feed and full financial tools",
      "Budgets, analytics, goals, and referrals",
      "Pro tools access",
      "Monthly subscription through Google Play",
    ],
    cta_label: "Subscribe to Pro",
    active: true,
    popular: false,
    sort_order: 2,
    access_config: {
      dashboard: "full",
      feed: "full",
      expenses: "full",
      wallets: "full",
      budgets: "full",
      analytics: "full",
      ai: "off",
      customization: "off",
      savings_goals: "full",
      tasks: "off",
      modules: "off",
      community: "full",
      messages: "full",
      news: "full",
      referrals: "full",
    },
  },
  core_199: {
    key: "core_199",
    name: "Core",
    price: 199,
    product_id: "clara_core_199",
    billing_type: "subscription",
    description: "Unlock Core: the advanced daily spending system with guided support and CLARA Companion intelligence.",
    features: [
      "Complete Core financial system",
      "Advanced daily spending AI through CLARA Companion",
      "Guided spending strategy and practical next steps",
      "Activation code unlocks the full Core layer",
    ],
    cta_label: "Unlock Core",
    active: true,
    popular: true,
    sort_order: 3,
    access_config: {
      dashboard: "full",
      feed: "full",
      expenses: "full",
      wallets: "full",
      budgets: "full",
      analytics: "full",
      ai: "advanced",
      customization: "full",
      savings_goals: "full",
      tasks: "full",
      modules: "full",
      community: "full",
      messages: "full",
      news: "full",
      referrals: "full",
    },
  },
  life_os_499: {
    key: "life_os_499",
    name: "Life OS",
    price: 499,
    product_id: "clara_lifeos_499",
    billing_type: "subscription",
    description: "Unlock Life OS, CLARA's broadest decision-intelligence layer for money, planning, and life organization.",
    features: [
      "Complete Life OS operating layer",
      "Broader decision intelligence beyond daily spending",
      "Life scheduling, organization, and deeper CLARA context",
      "Activation code unlocks the full Life OS layer",
    ],
    cta_label: "Unlock Life OS",
    active: true,
    popular: false,
    sort_order: 4,
    access_config: {
      dashboard: "full",
      feed: "full",
      expenses: "full",
      wallets: "full",
      budgets: "full",
      analytics: "full",
      ai: "life_os",
      customization: "full",
      savings_goals: "full",
      tasks: "full",
      modules: "full",
      community: "full",
      messages: "full",
      news: "full",
      referrals: "full",
    },
  },
};

export function normalizePlanKey(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return LEGACY_PLAN_ALIASES[normalized] || (CURRENT_PLAN_KEYS.includes(normalized) ? normalized : "free");
}

export function normalizeAccessLevel(value, fallback = "pro") {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases = {
    pro_99: "pro",
    clara_pro_99: "pro",
    core_199: "core",
    core_599: "core",
    clara_core_199: "core",
    lifeos: "life_os",
    life_os_499: "life_os",
    lifeos_499: "life_os",
    clara_lifeos_499: "life_os",
    coaching: "life_os",
    coaching_1299: "life_os",
  };
  const resolved = aliases[normalized] || normalized;
  return ACCESS_LEVEL_KEYS.includes(resolved) ? resolved : fallback;
}

export function getAccessLevelForPlan(planKey, fallback = "pro") {
  const normalizedPlan = normalizePlanKey(planKey);
  return PLAN_ACCESS_LEVELS[normalizedPlan] || normalizeAccessLevel(planKey, fallback);
}

export function getPlanKeyForAccessLevel(accessLevel, fallback = "pro_99") {
  const normalizedAccess = normalizeAccessLevel(accessLevel);
  return ACCESS_LEVEL_PLAN_KEYS[normalizedAccess] || fallback;
}

export function isPaidPlan(planKey) {
  return normalizePlanKey(planKey) !== "free";
}

export function getFeatureDefinition(featureKey) {
  return FEATURE_DEFINITIONS.find((feature) => feature.key === featureKey) || null;
}

export function normalizeFeatureMode(featureKey, value) {
  const definition = getFeatureDefinition(featureKey);
  const normalized = String(value ?? "").trim().toLowerCase();
  const aliases = {
    "view-only": "view",
    view_only: "view",
    readonly: "view",
    read_only: "view",
    "admin-only": "admin_only",
  };
  const canonicalValue = aliases[normalized] || normalized;

  if (definition?.modes.includes(canonicalValue)) {
    return canonicalValue;
  }

  const fallbackPlanModes =
    CURRENT_PLAN_KEYS.reduce((found, key) => {
      if (found) return found;
      return PLAN_DEFAULTS[key]?.access_config?.[featureKey] || null;
    }, null) || "off";

  return definition?.modes.includes(fallbackPlanModes) ? fallbackPlanModes : definition?.modes?.[0] || "off";
}

export function normalizeAccessConfig(accessConfig = {}, planKey = "free") {
  const normalizedPlanKey = normalizePlanKey(planKey);
  const baseConfig = PLAN_DEFAULTS[normalizedPlanKey]?.access_config || PLAN_DEFAULTS.free.access_config;
  const source = accessConfig && typeof accessConfig === "object" && !Array.isArray(accessConfig) ? accessConfig : {};

  return FEATURE_DEFINITIONS.reduce((acc, feature) => {
    acc[feature.key] = normalizeFeatureMode(feature.key, source[feature.key] ?? baseConfig[feature.key]);
    return acc;
  }, {});
}

export function getPlanDefaults(planKey) {
  const normalizedPlanKey = normalizePlanKey(planKey);
  const defaults = PLAN_DEFAULTS[normalizedPlanKey] || PLAN_DEFAULTS.free;

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
    name: String(row.name || defaults.name).trim(),
    price: Number(row.price ?? defaults.price ?? 0),
    product_id: defaults.product_id || String(row.product_id || row.play_product_id || "").trim(),
    billing_type: String(row.billing_type || defaults.billing_type || "").trim(),
    description: String(row.description || defaults.description || "").trim(),
    features,
    cta_label: String(row.cta_label || defaults.cta_label || "").trim(),
    active: typeof row.active === "boolean" ? row.active : defaults.active,
    popular: typeof row.popular === "boolean" ? row.popular : defaults.popular,
    sort_order: Number(row.sort_order ?? row.display_order ?? defaults.sort_order ?? 9999),
    access_config: normalizeAccessConfig(row.access_config, planKey),
  };
}

export function mergePlans(rows = []) {
  const map = new Map();

  rows.forEach((row) => {
    const normalized = sanitizePlanRow(row);
    const existing = map.get(normalized.plan_key);

    if (!existing) {
      map.set(normalized.plan_key, normalized);
      return;
    }

    const existingUpdatedAt = new Date(existing.updated_at || existing.created_at || 0).getTime();
    const nextUpdatedAt = new Date(normalized.updated_at || normalized.created_at || 0).getTime();
    map.set(
      normalized.plan_key,
      nextUpdatedAt >= existingUpdatedAt ? normalized : existing
    );
  });

  CURRENT_PLAN_KEYS.forEach((planKey) => {
    if (!map.has(planKey)) {
      map.set(planKey, sanitizePlanRow(getPlanDefaults(planKey)));
    }
  });

  return CURRENT_PLAN_KEYS.map((planKey) => map.get(planKey)).filter(Boolean);
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
