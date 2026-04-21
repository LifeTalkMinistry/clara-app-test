export const CURRENT_PLAN_KEYS = ["free", "entry", "core", "coaching"];

export const LEGACY_PLAN_ALIASES = {
  free: "free",
  basic: "entry",
  diy: "entry",
  entry: "entry",
  transformation: "core",
  diwm: "core",
  student: "core",
  core: "core",
  elite: "coaching",
  ldit: "coaching",
  coaching: "coaching",
};

export const PLAN_LABELS = {
  free: "Free",
  entry: "PRO Tools",
  core: "CLARA Program",
  coaching: "CLARA Coaching",
};

export const PLAN_BADGE_STYLES = {
  free: "bg-white/10 text-white border-white/10",
  entry: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20",
  core: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  coaching: "bg-amber-500/15 text-amber-300 border-amber-400/20",
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
    key: "coaching",
    label: "Coaching",
    description: "Session booking and coaching request management.",
    modes: ["off", "teaser", "full"],
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
  "/savings-goals": "savings_goals",
  "/tasks": "tasks",
  "/modules": "modules",
  "/community": "community",
  "/messages": "messages",
  "/coaching": "coaching",
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
      savings_goals: "off",
      tasks: "off",
      modules: "off",
      community: "off",
      messages: "off",
      coaching: "off",
      news: "full",
      referrals: "off",
    },
  },
  entry: {
    key: "entry",
    name: "PRO Tools",
    price: 99,
    description: "Unlock CLARA's PRO financial tools with a monthly Google Play subscription.",
    features: [
      "Feed and full financial tools",
      "Budgets, analytics, goals, and referrals",
      "PRO-only tools access",
      "Monthly subscription through Google Play",
    ],
    cta_label: "Subscribe to PRO",
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
      savings_goals: "full",
      tasks: "off",
      modules: "off",
      community: "full",
      messages: "full",
      coaching: "teaser",
      news: "full",
      referrals: "full",
    },
  },
  core: {
    key: "core",
    name: "CLARA Program",
    price: 599,
    description: "Unlock the 30-day CLARA Program with PRO during the program and +1 month continuation PRO after completion.",
    features: [
      "Feed and full 30-day guided system",
      "Includes PRO access during the program",
      "+1 month continuation PRO after program completion",
      "One-time Google Play purchase",
    ],
    cta_label: "Unlock Program",
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
      savings_goals: "full",
      tasks: "full",
      modules: "full",
      community: "full",
      messages: "full",
      coaching: "teaser",
      news: "full",
      referrals: "full",
    },
  },
  coaching: {
    key: "coaching",
    name: "CLARA Coaching",
    price: 1299,
    description: "Unlock the 30-day CLARA Program, 2 coaching sessions, and +2 months continuation PRO after completion.",
    features: [
      "Feed and full 30-day guided system",
      "Includes PRO access during the program",
      "+2 months continuation PRO after program completion",
      "2 coaching session credits",
    ],
    cta_label: "Unlock Coaching",
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
      savings_goals: "full",
      tasks: "full",
      modules: "full",
      community: "full",
      messages: "full",
      coaching: "full",
      news: "full",
      referrals: "full",
    },
  },
};

export function normalizePlanKey(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return LEGACY_PLAN_ALIASES[normalized] || (CURRENT_PLAN_KEYS.includes(normalized) ? normalized : "free");
}

export function isPaidPlan(planKey) {
  const normalized = normalizePlanKey(planKey);
  return normalized !== "free";
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
