const ACCESS_RANK = Object.freeze({ core: 0, builder: 1, champion: 2 });

export const CLARA_LIFE_CONTEXT_ACCESS = Object.freeze({
  CORE: "core",
  BUILDER: "builder",
  CHAMPION: "champion",
});

export const CLARA_LIFE_PROFILE_FIELDS = Object.freeze([
  { key: "age", section: "Basics", access: "core", label: "Age", input: "number", placeholder: "Example: 28", priority: 36, tags: ["age", "career", "school"] },
  { key: "employmentStatus", section: "Basics", access: "core", label: "Employment status", input: "select", options: ["Full-time employee", "Part-time employee", "Freelancer", "Self-employed", "Business owner", "Working student", "Student", "Between jobs", "Retired"], priority: 78, tags: ["work", "job", "career", "income", "office"] },
  { key: "jobTitle", section: "Basics", access: "core", label: "Job / profession", input: "text", placeholder: "Example: BPO agent", priority: 76, tags: ["work", "job", "career", "office", "uniform", "laptop"] },
  { key: "civilStatus", section: "Basics", access: "core", label: "Civil status", input: "select", options: ["Single", "In a relationship", "Married", "Separated", "Widowed"], priority: 42, tags: ["partner", "spouse", "marriage", "wedding", "family"] },
  { key: "livingSituation", section: "Basics", access: "core", label: "Living situation", input: "select", options: ["Living alone", "Living with parents", "Living with partner / spouse", "Living with relatives", "Renting with roommates", "Own household"], priority: 58, tags: ["rent", "house", "home", "move", "family"] },
  { key: "breadwinnerStatus", section: "Basics", access: "core", label: "Breadwinner role", input: "select", options: ["Not a breadwinner", "I help sometimes", "Partial breadwinner", "Primary breadwinner"], priority: 100, tags: ["family", "parent", "parents", "sibling", "support", "bill", "tuition", "medicine"] },
  { key: "dependents", section: "Basics", access: "core", label: "Who depends on you?", input: "text", placeholder: "Example: Parents and one sibling", priority: 96, tags: ["family", "parent", "parents", "child", "children", "sibling", "support", "tuition", "medicine"] },
  { key: "currentLifePriority", section: "Basics", access: "core", label: "Top life priority", input: "select", options: ["Financial stability", "Supporting family", "Building savings", "Career growth", "Starting a business", "Independence", "Education", "Preparing for marriage", "Raising a family", "Buying a home", "Getting out of debt", "Enjoying life responsibly", "Building long-term wealth"], priority: 92, tags: ["goal", "future", "save", "saving", "business", "family", "home", "debt"] },
  { key: "majorLifeGoal", section: "Basics", access: "core", label: "Major life goal", input: "text", placeholder: "Example: Start a small business next year", priority: 90, tags: ["goal", "future", "business", "school", "home", "car", "travel", "marriage"] },
  { key: "futureChange", section: "Basics", access: "core", label: "Important upcoming change", input: "textarea", placeholder: "Example: I plan to resign in four months and look for a new job.", priority: 88, tags: ["future", "resign", "move", "marriage", "baby", "business", "school", "abroad"] },

  { key: "industry", section: "Work & Family", access: "builder", label: "Industry", input: "text", placeholder: "Example: BPO / customer service", priority: 50, tags: ["work", "job", "career"] },
  { key: "workTenure", section: "Work & Family", access: "builder", label: "Time in current job", input: "text", placeholder: "Example: 2 years", priority: 46, tags: ["work", "job", "career", "stability"] },
  { key: "jobStability", section: "Work & Family", access: "builder", label: "Job stability", input: "select", options: ["Stable", "Probationary", "Contractual", "Project-based", "Seasonal", "Irregular", "Uncertain"], priority: 84, tags: ["work", "job", "career", "income", "resign", "stability"] },
  { key: "careerGoal", section: "Work & Family", access: "builder", label: "Career direction", input: "select", options: ["Stay in my current career", "Get promoted", "Find a better-paying job", "Change careers", "Work abroad", "Become self-employed", "Start a business"], priority: 70, tags: ["work", "job", "career", "promotion", "abroad", "business"] },
  { key: "dependentCount", section: "Work & Family", access: "builder", label: "Number of dependents", input: "number", placeholder: "Example: 3", priority: 86, tags: ["family", "parent", "child", "support", "tuition", "medicine"] },
  { key: "familySupport", section: "Work & Family", access: "builder", label: "Regular family support", input: "text", placeholder: "Example: I help with groceries and utilities every month", priority: 88, tags: ["family", "support", "parent", "bill", "groceries", "utilities"] },
  { key: "householdResponsibility", section: "Work & Family", access: "builder", label: "Major household responsibility", input: "text", placeholder: "Example: Rent and electricity", priority: 82, tags: ["family", "house", "home", "rent", "bill", "utilities"] },
  { key: "childrenCount", section: "Work & Family", access: "builder", label: "Children", input: "number", placeholder: "0", priority: 74, tags: ["child", "children", "family", "school", "tuition", "baby"] },

  { key: "housingPlan", section: "Plans", access: "builder", label: "Housing plan", input: "select", options: ["No major housing plan", "Move out", "Rent my own place", "Buy a home", "Build a home", "Renovate a home"], priority: 66, tags: ["rent", "house", "home", "move", "furniture", "appliance"] },
  { key: "mainTransportation", section: "Plans", access: "builder", label: "Main transportation", input: "select", options: ["Public transportation", "Motorcycle", "Car", "Bicycle", "Walking", "Mixed transportation"], priority: 48, tags: ["car", "motorcycle", "bike", "commute", "transport", "work"] },
  { key: "vehiclePlan", section: "Plans", access: "builder", label: "Vehicle plan", input: "select", options: ["No vehicle plan", "Buy a motorcycle", "Buy a car", "Replace a current vehicle", "Save for a vehicle"], priority: 64, tags: ["car", "motorcycle", "vehicle", "commute", "transport"] },
  { key: "educationPlan", section: "Plans", access: "builder", label: "Education / training plan", input: "text", placeholder: "Example: Take a certification course this year", priority: 62, tags: ["school", "tuition", "course", "training", "certification", "education", "laptop"] },
  { key: "workAbroadPlan", section: "Plans", access: "builder", label: "Work-abroad plan", input: "select", options: ["No current plan", "Considering it", "Preparing requirements", "Actively applying", "Already scheduled to leave"], priority: 62, tags: ["abroad", "passport", "visa", "career", "work"] },
  { key: "businessPlan", section: "Plans", access: "builder", label: "Business plan", input: "select", options: ["No current business plan", "Exploring an idea", "Planning to start", "Already building it", "Already operating a business"], priority: 84, tags: ["business", "capital", "startup", "inventory", "equipment", "store", "side hustle"] },
  { key: "businessType", section: "Plans", access: "builder", label: "Type of business", input: "text", placeholder: "Example: Online food business", priority: 76, tags: ["business", "capital", "startup", "inventory", "equipment", "store"] },
  { key: "businessStartTiming", section: "Plans", access: "builder", label: "Target business timing", input: "text", placeholder: "Example: Within 8 months", priority: 80, tags: ["business", "capital", "startup", "inventory", "equipment"] },
  { key: "businessCapitalNeeded", section: "Plans", access: "builder", label: "Approximate business capital", input: "text", placeholder: "Example: Around ₱80,000", priority: 82, tags: ["business", "capital", "startup", "inventory", "equipment"] },
  { key: "decisionPriority", section: "Plans", access: "builder", label: "What CLARA should prioritize", input: "select", options: ["Protecting my stability", "My family responsibilities", "My future goals", "Building my business", "Enjoying life responsibly", "Saving aggressively", "Keeping enough flexibility", "Balanced decision-making"], priority: 90, tags: ["spend", "buy", "purchase", "decision", "goal", "family", "business"] },

  { key: "spendingLifestyle", section: "Deeper Context", access: "champion", label: "Spending lifestyle", input: "select", options: ["Mostly essentials", "Balanced spender", "Convenience-focused", "Social spender", "Hobby spender", "Frequent online shopper", "Food-delivery heavy", "Travel-oriented", "Gadget-oriented", "Fashion-oriented", "Family-oriented", "Experience-oriented"], priority: 58, tags: ["spend", "shopping", "food", "travel", "gadget", "fashion", "hobby"] },
  { key: "topValues", section: "Deeper Context", access: "champion", label: "What matters most", input: "text", placeholder: "Example: Family, peace, stability and freedom", priority: 58, tags: ["goal", "family", "future", "decision"] },
  { key: "currentFocus", section: "Deeper Context", access: "champion", label: "What you are building now", input: "textarea", placeholder: "Example: I am building my emergency fund and preparing to start a business.", priority: 78, tags: ["goal", "future", "business", "saving", "stability"] },
  { key: "financialFear", section: "Deeper Context", access: "champion", label: "Situation you do not want to repeat", input: "textarea", placeholder: "Example: Borrowing just to survive before payday", priority: 60, tags: ["borrow", "debt", "payday", "risk", "emergency"] },
  { key: "spendingTrigger", section: "Deeper Context", access: "champion", label: "Spending trigger", input: "text", placeholder: "Example: Stress and late-night online shopping", priority: 64, tags: ["impulse", "stress", "shopping", "sale", "spend"] },
  { key: "nonNegotiable", section: "Deeper Context", access: "champion", label: "Money CLARA should protect", input: "textarea", placeholder: "Example: Rent, medicine and school money", priority: 86, tags: ["rent", "medicine", "school", "tuition", "family", "protect"] },
  { key: "identityStatement", section: "Deeper Context", access: "champion", label: "Who you are becoming", input: "textarea", placeholder: "Example: I am becoming someone who has peace and control with money.", priority: 42, tags: ["goal", "future", "decision"] },
]);

const LEGACY_DEFAULTS = Object.freeze({
  personality: "Balanced spender",
  status: "Employee",
  dependents: "Just me",
  responsibility: "Bills and essentials",
  incomeRhythm: "Monthly salary",
  coachingStyle: "Balanced",
});

const LEGACY_FIELD_ALIASES = Object.freeze({
  status: "employmentStatus",
  meaningfulGoal: "majorLifeGoal",
});

const QUERY_GROUPS = Object.freeze({
  family: ["family", "parent", "parents", "child", "children", "sibling", "support", "tuition", "medicine"],
  work: ["work", "job", "career", "office", "uniform", "laptop", "commute"],
  business: ["business", "capital", "startup", "inventory", "equipment", "store", "side hustle"],
  housing: ["rent", "house", "home", "move", "furniture", "appliance"],
  transport: ["car", "motorcycle", "vehicle", "commute", "transport", "bike"],
  education: ["school", "tuition", "course", "training", "certification", "education"],
});

function clean(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function cleanTier(value = "") {
  const tier = clean(value).toLowerCase();
  return ["supporter", "builder", "champion"].includes(tier) ? tier : null;
}

export function getClaraLifeContextAccess(supportTier) {
  const tier = cleanTier(supportTier);
  if (tier === "champion") return "champion";
  if (tier === "builder") return "builder";
  return "core";
}

export function canUseClaraLifeProfileField(field, supportTier) {
  const required = ACCESS_RANK[field?.access] ?? 0;
  const current = ACCESS_RANK[getClaraLifeContextAccess(supportTier)] ?? 0;
  return current >= required;
}

function inferLegacyFilledFields(profile = {}) {
  const inferred = [];
  Object.entries(profile || {}).forEach(([sourceKey, rawValue]) => {
    if (["id", "profile", "filledFields", "memoryNotes", "personalityQuizAnswers", "updatedAt", "updated_at", "createdAt", "created_at", "localUserId", "local_user_id"].includes(sourceKey)) return;
    const targetKey = LEGACY_FIELD_ALIASES[sourceKey] || sourceKey;
    const value = clean(rawValue);
    if (!value) return;
    if (Object.prototype.hasOwnProperty.call(LEGACY_DEFAULTS, sourceKey) && value === LEGACY_DEFAULTS[sourceKey]) return;
    if (CLARA_LIFE_PROFILE_FIELDS.some((field) => field.key === targetKey)) inferred.push(targetKey);
  });
  return inferred;
}

export function getClaraLifeProfileFilledFields(profile = {}) {
  const explicit = Array.isArray(profile?.filledFields)
    ? profile.filledFields.map((key) => clean(key)).filter(Boolean)
    : [];
  return [...new Set(explicit.length ? explicit : inferLegacyFilledFields(profile))];
}

export function updateClaraLifeProfileField(profile = {}, key, rawValue) {
  const value = typeof rawValue === "number" ? String(rawValue) : rawValue;
  const next = { ...(profile || {}), [key]: value };
  const filled = new Set(getClaraLifeProfileFilledFields(profile));
  if (clean(value)) filled.add(key);
  else filled.delete(key);
  next.filledFields = [...filled];
  next.lifeProfileVersion = 2;
  return next;
}

export function countClaraLifeProfileFields(profile = {}, supportTier = "champion") {
  const filled = new Set(getClaraLifeProfileFilledFields(profile));
  return CLARA_LIFE_PROFILE_FIELDS.filter((field) => filled.has(field.key) && canUseClaraLifeProfileField(field, supportTier)).length;
}

function resolvedValue(profile, field) {
  const direct = clean(profile?.[field.key]);
  if (direct) return direct;
  if (field.key === "employmentStatus") return clean(profile?.status);
  if (field.key === "majorLifeGoal") return clean(profile?.meaningfulGoal);
  return "";
}

function formatFragment(field, value) {
  const lower = value.toLowerCase();
  switch (field.key) {
    case "age": return `${value} years old`;
    case "employmentStatus": return lower;
    case "jobTitle": return `works as ${value}`;
    case "civilStatus": return lower;
    case "livingSituation": return `living situation: ${lower}`;
    case "breadwinnerStatus": return `breadwinner role: ${lower}`;
    case "dependents": return `financially supports ${value}`;
    case "currentLifePriority": return `current priority: ${value}`;
    case "majorLifeGoal": return `major goal: ${value}`;
    case "futureChange": return `upcoming change: ${value}`;
    case "industry": return `industry: ${value}`;
    case "workTenure": return `current-job tenure: ${value}`;
    case "jobStability": return `job stability: ${lower}`;
    case "careerGoal": return `career direction: ${value}`;
    case "dependentCount": return `${value} dependent${value === "1" ? "" : "s"}`;
    case "familySupport": return `regular family support: ${value}`;
    case "householdResponsibility": return `household responsibility: ${value}`;
    case "childrenCount": return `${value} child${value === "1" ? "" : "ren"}`;
    case "housingPlan": return `housing plan: ${value}`;
    case "mainTransportation": return `main transport: ${value}`;
    case "vehiclePlan": return `vehicle plan: ${value}`;
    case "educationPlan": return `education plan: ${value}`;
    case "workAbroadPlan": return `work-abroad plan: ${value}`;
    case "businessPlan": return `business status: ${value}`;
    case "businessType": return `business idea: ${value}`;
    case "businessStartTiming": return `business timing: ${value}`;
    case "businessCapitalNeeded": return `business capital target: ${value}`;
    case "decisionPriority": return `spending decisions should prioritize ${lower}`;
    case "spendingLifestyle": return `spending style: ${lower}`;
    case "topValues": return `values: ${value}`;
    case "currentFocus": return `current focus: ${value}`;
    case "financialFear": return `wants to avoid: ${value}`;
    case "spendingTrigger": return `known spending trigger: ${value}`;
    case "nonNegotiable": return `protect first: ${value}`;
    case "identityStatement": return `future-self direction: ${value}`;
    default: return `${field.label}: ${value}`;
  }
}

function queryText({ message = "", evidence = {} } = {}) {
  return clean([
    message,
    evidence?.item,
    evidence?.purpose,
    evidence?.currentSituation,
    evidence?.constraints,
    evidence?.readinessSummary,
  ].filter(Boolean).join(" ")).toLowerCase();
}

function relevanceBoost(field, query) {
  if (!query) return 0;
  const direct = (field.tags || []).some((tag) => query.includes(tag));
  if (direct) return 70;

  for (const keywords of Object.values(QUERY_GROUPS)) {
    const queryMatchesGroup = keywords.some((keyword) => query.includes(keyword));
    const fieldMatchesGroup = (field.tags || []).some((tag) => keywords.includes(tag));
    if (queryMatchesGroup && fieldMatchesGroup) return 42;
  }
  return 0;
}

export function buildClaraLifeContextStatement(profile = {}, {
  supportTier = null,
  message = "",
  evidence = {},
} = {}) {
  const filled = new Set(getClaraLifeProfileFilledFields(profile));
  if (!filled.size) return "";

  const access = getClaraLifeContextAccess(supportTier);
  const maxFragments = access === "champion" ? 10 : access === "builder" ? 8 : 5;
  const query = queryText({ message, evidence });

  const candidates = CLARA_LIFE_PROFILE_FIELDS
    .filter((field) => filled.has(field.key) && canUseClaraLifeProfileField(field, supportTier))
    .map((field) => ({
      field,
      value: resolvedValue(profile, field),
      score: Number(field.priority || 0) + relevanceBoost(field, query),
    }))
    .filter((entry) => entry.value)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFragments)
    .map(({ field, value }) => formatFragment(field, value));

  if (!candidates.length) return "";
  return `Life context: ${candidates.join("; ")}.`.slice(0, 720);
}
