export const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
export const WORKING_STUDENT_BRANCH_DRAFT_KEY = "clara_working_student_branch_draft_v1";

export const STAGES = [
  "Young Professional",
  "Working Student",
  "Living with Partner",
  "Family Household",
  "Single Parent",
  "Full-Time Earner",
  "Freelance Season",
  "Business Builder",
];

export const DEFAULT_STAGE = {
  stage: "Young Professional",
  setup: "Early-career employee",
  rhythm: "First salary rhythm",
  workload: "Learning work-life balance",
  pressure: "Living independently costs",
  coping: "Payday reward spending",
  goal: "Build money rhythm",
};

export const LEGACY_STAGE_MAP = {
  "Young Earner": "Young Professional",
  Breadwinner: "Family Household",
  "Fresh Graduate": "Young Professional",
  "OFW Family": "Family Household",
  "Unemployed Adult": "Family Household",
  "First-Time Parent": "Single Parent",
  "Freelance / Gig Worker": "Freelance Season",
  "Recovery Season": "Family Household",
  "Transitioning Life Stage": "Young Professional",
};

export function normalizeLifeStage(stageName) {
  const mapped = LEGACY_STAGE_MAP[stageName] || stageName;
  return STAGES.includes(mapped) ? mapped : DEFAULT_STAGE.stage;
}

function card(category, label, value, note) {
  return { category, label, value, note };
}

function stage(title, caption, overview, fields, indicators, struggles, recommendations, talkPrompt) {
  return { identity: { title, caption, overview }, fields, indicators, struggles, recommendations, talkPrompt };
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasAny(value, terms) {
  const text = clean(value).toLowerCase();
  return terms.some((term) => text.includes(clean(term).toLowerCase()));
}

function clamp(value, min = 38, max = 96) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function readJson(key) {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) || "{}") || {};
  } catch {
    return {};
  }
}

function readSavedLifeStageProfile() {
  return readJson(LIFE_STAGE_KEY);
}

function readWorkingStudentBranchDraft() {
  return readJson(WORKING_STUDENT_BRANCH_DRAFT_KEY);
}

function normalizeInfluenceBreakdown(items) {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.value), 0) || 1;
  const mapped = items.map((item) => {
    const exact = (Math.max(0, item.value) / total) * 100;
    const value = Math.floor(exact);
    return { ...item, value, remainder: exact - value };
  });

  let remaining = 100 - mapped.reduce((sum, item) => sum + item.value, 0);
  mapped
    .slice()
    .sort((a, b) => b.remainder - a.remainder)
    .forEach((item) => {
      if (remaining <= 0) return;
      item.value += 1;
      remaining -= 1;
    });

  return mapped.map(({ remainder, ...item }) => item).sort((a, b) => b.value - a.value);
}

const WORKING_STUDENT_ROOTS = [
  "Mostly supported, trying to earn extra",
  "Working mainly to continue school",
  "Helping family while studying",
  "Trying to survive school mostly alone",
  "Balancing school, work, and exhaustion",
  "Building a future while financially unstable",
  "Trying to recover from constant financial pressure",
];

const WORKING_STUDENT_BRANCHES = {
  "Mostly supported, trying to earn extra": {
    snapshotKey: "stableStretched",
    rhythm: ["Allowance is the base, work is extra", "Fixed part-time pay for personal needs", "Occasional side income when available", "Extra income disappears into small spending"],
    workload: {
      default: ["Manageable but inconsistent", "Busy during exam or work weeks", "Social and school costs overlap", "Enough control if I plan early"],
      "Extra income disappears into small spending": ["Manageable but leak-prone", "Busy enough to justify small rewards", "Social and school costs overlap", "Enough control if I plan early"],
    },
    pressure: {
      default: ["Food, fare, and school extras", "Social or reward spending", "Saving feels inconsistent", "I want independence but still rely on support"],
      "Social and school costs overlap": ["Food, fare, and school extras", "Social spending pressure", "Small rewards after school/work", "Saving feels inconsistent"],
    },
    coping: {
      default: ["I spend small amounts without noticing", "I reward myself after effort", "I avoid strict tracking", "I can pause when I plan early"],
      "Small rewards after school/work": ["I reward myself after effort", "I spend small amounts without noticing", "I avoid strict tracking", "I can pause when I plan early"],
    },
    goal: {
      default: ["Build discipline before bigger responsibilities", "Save small without guilt", "Control small leaks", "Use extra income with purpose"],
      "I reward myself after effort": ["Control small leaks", "Keep rewards but set limits", "Save small without guilt", "Use extra income with purpose"],
    },
  },
  "Working mainly to continue school": {
    snapshotKey: "essentialCost",
    rhythm: ["Fixed work income for tuition", "Irregular income for school requirements", "Project/seasonal work before deadlines", "Allowance is not enough for school costs"],
    workload: {
      default: ["Class and work are both required", "School deadlines create work pressure", "Little room when fees are near", "I keep going even when tired"],
      "Project/seasonal work before deadlines": ["Income waves around school deadlines", "School deadlines create work pressure", "Little room when fees are near", "I keep going even when tired"],
    },
    pressure: {
      default: ["Tuition and school payments", "Projects, printing, and materials", "Daily fare and food while attending", "Fear of stopping school"],
      "Little room when fees are near": ["Tuition and school payments", "Fear of stopping school", "Daily fare and food while attending", "Projects, printing, and materials"],
    },
    coping: {
      default: ["I cut personal needs to pay school costs", "I delay non-school payments", "I take extra work even when tired", "I avoid spending on myself"],
      "Fear of stopping school": ["I take extra work even when tired", "I cut personal needs to pay school costs", "I delay non-school payments", "I avoid spending on myself"],
    },
    goal: {
      default: ["Protect school continuity", "Avoid debt from school pressure", "Keep food and fare stable", "Finish school without burning out"],
      "I take extra work even when tired": ["Finish school without burning out", "Protect school continuity", "Keep food and fare stable", "Avoid debt from school pressure"],
    },
  },
  "Helping family while studying": {
    snapshotKey: "familyLinked",
    rhythm: ["Part of my income goes home", "I give when family needs appear", "Allowance/work money gets shared", "I earn extra to support family"],
    workload: {
      default: ["School, work, and home needs overlap", "I feel responsible even when tired", "Family requests change the week", "I still try to keep school stable"],
      "I give when family needs appear": ["Family requests change the week", "I feel responsible even when tired", "School, work, and home needs overlap", "I still try to keep school stable"],
    },
    pressure: {
      default: ["Family contribution", "Guilt when I protect my own money", "School costs competing with home needs", "Weak personal buffer"],
      "Family requests change the week": ["Family contribution", "Weak personal buffer", "Guilt when I protect my own money", "School costs competing with home needs"],
    },
    coping: {
      default: ["I give even when my budget is tight", "I delay my own needs", "I hide money stress", "I try to set limits but feel guilty"],
      "Guilt when I protect my own money": ["I try to set limits but feel guilty", "I give even when my budget is tight", "I delay my own needs", "I hide money stress"],
    },
    goal: {
      default: ["Help family without losing stability", "Set a support boundary", "Protect school and daily needs", "Build a personal safety buffer"],
      "I give even when my budget is tight": ["Set a support boundary", "Help family without losing stability", "Protect school and daily needs", "Build a personal safety buffer"],
    },
  },
  "Trying to survive school mostly alone": {
    snapshotKey: "selfFunded",
    rhythm: ["Fixed low-income work", "Irregular side hustle survival income", "Borrowing between pay cycles", "Project/seasonal income with gaps"],
    workload: {
      default: ["School and survival costs compete daily", "Food and fare need careful planning", "No room for surprise expenses", "I am tired but have to continue"],
      "Borrowing between pay cycles": ["No room for surprise expenses", "Food and fare need careful planning", "School and survival costs compete daily", "I am tired but have to continue"],
    },
    pressure: {
      default: ["Food and transport survival", "Tuition or school deadlines", "No emergency margin", "Borrowing risk when timing fails"],
      "No room for surprise expenses": ["No emergency margin", "Borrowing risk when timing fails", "Food and transport survival", "Tuition or school deadlines"],
    },
    coping: {
      default: ["I cut meals or needs to stretch money", "I avoid checking when money is low", "I borrow to survive the gap", "I overwork when pressure hits"],
      "Borrowing risk when timing fails": ["I borrow to survive the gap", "I avoid checking when money is low", "I cut meals or needs to stretch money", "I overwork when pressure hits"],
    },
    goal: {
      default: ["Build the smallest emergency buffer", "Finish school safely", "Stop survival borrowing", "Protect food and fare first"],
      "I borrow to survive the gap": ["Stop survival borrowing", "Build the smallest emergency buffer", "Protect food and fare first", "Finish school safely"],
    },
  },
  "Balancing school, work, and exhaustion": {
    snapshotKey: "highFatigue",
    rhythm: ["Fixed pay but low recovery", "Irregular income plus heavy schedule", "Work shifts disrupt school rhythm", "Extra work happens when deadlines hit"],
    workload: {
      default: ["Heavy school-work overlap", "Little time to rest", "Commute drains energy", "Deadlines and shifts collide"],
      "Work shifts disrupt school rhythm": ["Deadlines and shifts collide", "Little time to rest", "Commute drains energy", "Heavy school-work overlap"],
    },
    pressure: {
      default: ["Convenience spending from exhaustion", "Rushed food and transport", "Missed tracking because I am tired", "Work-school schedule conflict"],
      "Little time to rest": ["Convenience spending from exhaustion", "Missed tracking because I am tired", "Rushed food and transport", "Work-school schedule conflict"],
    },
    coping: {
      default: ["I buy comfort after hard days", "I choose convenience to save energy", "I forget to track expenses", "I push rest aside"],
      "Convenience spending from exhaustion": ["I choose convenience to save energy", "I buy comfort after hard days", "I forget to track expenses", "I push rest aside"],
    },
    goal: {
      default: ["Finish school without burning out", "Create low-energy money rules", "Reduce convenience leaks", "Protect rest as part of budgeting"],
      "I choose convenience to save energy": ["Create low-energy money rules", "Reduce convenience leaks", "Finish school without burning out", "Protect rest as part of budgeting"],
    },
  },
  "Building a future while financially unstable": {
    snapshotKey: "developingRhythm",
    rhythm: ["Income changes month to month", "Side hustle income is growing slowly", "Support and work income both fluctuate", "Some weeks are strong, some are tight"],
    workload: {
      default: ["I am ambitious but stretched", "My routine changes often", "I am learning while earning", "Future pressure makes me anxious"],
      "Some weeks are strong, some are tight": ["My routine changes often", "Future pressure makes me anxious", "I am ambitious but stretched", "I am learning while earning"],
    },
    pressure: {
      default: ["Unstable income rhythm", "Repeated small expenses", "Future goals feel far", "I do not know what to prioritize first"],
      "Future pressure makes me anxious": ["Future goals feel far", "I do not know what to prioritize first", "Unstable income rhythm", "Repeated small expenses"],
    },
    coping: {
      default: ["I switch plans often", "I spend when I feel stuck", "I start saving then stop", "I need clearer priorities"],
      "I do not know what to prioritize first": ["I need clearer priorities", "I switch plans often", "I start saving then stop", "I spend when I feel stuck"],
    },
    goal: {
      default: ["Create a simple money rhythm", "Protect future goals slowly", "Control micro-spending", "Choose one priority first"],
      "I need clearer priorities": ["Choose one priority first", "Create a simple money rhythm", "Protect future goals slowly", "Control micro-spending"],
    },
  },
  "Trying to recover from constant financial pressure": {
    snapshotKey: "delayedPayment",
    rhythm: ["Money arrives after expenses are due", "I borrow then repay repeatedly", "Income is unstable and pressure carries over", "Debt or delayed payments affect the week"],
    workload: {
      default: ["The month feels like repair mode", "Old pressure affects current choices", "I feel tired from catching up", "There is little room to reset"],
      "I borrow then repay repeatedly": ["Old pressure affects current choices", "The month feels like repair mode", "I feel tired from catching up", "There is little room to reset"],
    },
    pressure: {
      default: ["Repayment pressure", "Cash-flow timing mismatch", "Borrowing again before the next income", "Avoiding money because it feels heavy"],
      "Old pressure affects current choices": ["Repayment pressure", "Borrowing again before the next income", "Cash-flow timing mismatch", "Avoiding money because it feels heavy"],
    },
    coping: {
      default: ["I delay payments to survive", "I avoid checking the full picture", "I borrow again when daily costs hit", "I cut needs too much"],
      "Borrowing again before the next income": ["I borrow again when daily costs hit", "I delay payments to survive", "I avoid checking the full picture", "I cut needs too much"],
    },
    goal: {
      default: ["Stop pressure from stacking", "Build a no-new-debt rule", "Create a repayment rhythm", "Protect a tiny food/fare buffer"],
      "I delay payments to survive": ["Create a repayment rhythm", "Stop pressure from stacking", "Build a no-new-debt rule", "Protect a tiny food/fare buffer"],
    },
  },
};

function branchForSetup(setup) {
  return WORKING_STUDENT_BRANCHES[clean(setup)] || WORKING_STUDENT_BRANCHES[WORKING_STUDENT_ROOTS[0]];
}

function resolveBranchOptions(branch, key, previousValue) {
  const source = branch?.[key];
  if (Array.isArray(source)) return source;
  return source?.[clean(previousValue)] || source?.default || [];
}

function getWorkingStudentFields(profile = {}) {
  const draft = clean(profile.stage) === "Working Student" ? profile : readWorkingStudentBranchDraft();
  const saved = readSavedLifeStageProfile();
  const merged = { ...saved, ...draft };
  const setup = WORKING_STUDENT_ROOTS.includes(merged.setup) ? merged.setup : WORKING_STUDENT_ROOTS[0];
  const branch = branchForSetup(setup);
  const rhythm = resolveBranchOptions(branch, "rhythm");
  const selectedRhythm = rhythm.includes(merged.rhythm) ? merged.rhythm : rhythm[0];
  const workload = resolveBranchOptions(branch, "workload", selectedRhythm);
  const selectedWorkload = workload.includes(merged.workload) ? merged.workload : workload[0];
  const pressure = resolveBranchOptions(branch, "pressure", selectedWorkload);
  const selectedPressure = pressure.includes(merged.pressure) ? merged.pressure : pressure[0];
  const coping = resolveBranchOptions(branch, "coping", selectedPressure);
  const selectedCoping = coping.includes(merged.coping) ? merged.coping : coping[0];
  const goal = resolveBranchOptions(branch, "goal", selectedCoping);

  return {
    setup: WORKING_STUDENT_ROOTS,
    rhythm,
    workload,
    pressure,
    coping,
    goal,
  };
}

function getWorkingStudentDefaults(previous = {}) {
  const fields = getWorkingStudentFields({ stage: "Working Student", ...previous });
  const next = { stage: "Working Student" };
  ["setup", "rhythm", "workload", "pressure", "coping", "goal"].forEach((key) => {
    next[key] = fields[key]?.includes(previous[key]) ? previous[key] : fields[key]?.[0];
  });
  return next;
}

export const LIFE_STAGE_INTELLIGENCE = {
  "Young Professional": stage(
    "Building independence",
    "Early independence, career identity, lifestyle pressure, and first real money systems are forming.",
    "Young Professionals are learning how to live independently, handle salary rhythm, manage lifestyle temptation, and build stable habits before small leaks become long-term patterns.",
    {
      setup: ["First full-time job", "Early-career employee", "Career shifting", "Living independently", "Building side income"],
      rhythm: ["First salary rhythm", "Monthly salary", "Twice-a-month cutoff", "Salary + side income", "Income still changing"],
      workload: ["Manageable work routine", "Busy but stable", "Long draining days", "Learning work-life balance", "Burnout season"],
      pressure: ["Living independently costs", "Lifestyle comparison", "Family contribution", "Debt or credit pressure", "Low savings buffer"],
      coping: ["Payday reward spending", "I avoid tracking expenses", "I use credit or pay later", "Social spending pressure", "I over-restrict then splurge"],
      goal: ["Build money rhythm", "Emergency fund first", "Control lifestyle creep", "Pay down debt", "Save before spending"],
    },
    [
      card("pressure", "Independence Pressure", 72, "Rent, commute, food, social life, and early responsibility can stretch income quickly."),
      card("stability", "Savings Readiness", 43, "Savings may still be unstable while salary rhythm and personal boundaries are forming."),
      card("energy", "Decision Fatigue", 64, "Career pressure and lifestyle choices can make spending feel like emotional relief."),
      card("growth", "Career Momentum", 60, "Early income growth has strong potential when supported by structure and realistic limits."),
    ],
    ["lifestyle creep", "payday reward spending", "social comparison", "low savings rhythm", "career uncertainty"],
    ["Emergency Fund", "Payday Budget Rules", "Lifestyle Boundary", "Debt Avoidance"],
    "Tell CLARA what feels hardest about building independence right now."
  ),

  "Working Student": stage(
    "Stretched season",
    "School, work, family expectations, energy, and limited money compete in the same week.",
    "Working Students are balancing education, income, survival, family responsibility, recovery pressure, and future-building while time scarcity and uneven money rhythm shape daily decisions.",
    getWorkingStudentFields(),
    [
      card("energy", "Burnout Watch", 30, "School, work, commute, money, and recovery pressure can drain energy fast."),
      card("pressure", "Financial Pressure", 27, "Tuition, daily costs, irregular income, and responsibility can tighten the whole month."),
      card("stability", "Micro-Spend Risk", 24, "Small repeated expenses can become a coping pattern when rest and control feel limited."),
      card("growth", "Future Potential", 19, "Balancing school and work can build resilience, discipline, and future earning power."),
    ],
    ["transport costs", "tuition pressure", "burnout spending", "irregular income", "time scarcity", "family contribution", "debt pressure"],
    ["Weekly Spending Cap", "Transport Buffer", "Study-Work Recovery", "Avoid Debt", "Stress-Spending Replacement"],
    "Tell CLARA what feels heavier right now: school, work, money, family responsibility, or energy."
  ),

  "Living with Partner": stage(
    "Shared-life season",
    "Shared routines, emotional expectations, bills, boundaries, and future plans shape money decisions.",
    "Living with a partner means financial decisions are no longer purely personal; CLARA needs to understand contribution fairness, communication style, shared pressure, and comfort-spending patterns.",
    {
      setup: ["Newly living together", "Long-term live-in", "Living with one family", "Planning to move in", "One income supports both"],
      rhythm: ["Shared bills monthly", "Split expenses clearly", "Split expenses unevenly", "Income mismatch", "Still learning shared rhythm"],
      workload: ["Calm and cooperative", "Adjusting roles", "Money talks feel sensitive", "One person carries more", "Constant tension over decisions"],
      pressure: ["Rent and utilities", "Uneven contribution", "Future planning pressure", "Family boundaries", "Money communication"],
      coping: ["We avoid money talks", "We comfort-spend together", "One partner covers gaps", "We argue then ignore it", "We review money together"],
      goal: ["Set shared money rules", "Build savings together", "Emergency fund first", "Plan our future", "Reduce money conflict"],
    },
    [
      card("pressure", "Shared Expense Pressure", 70, "Shared routines can make spending feel normal faster than expected."),
      card("stability", "Relationship Stability", 62, "Financial stability depends partly on communication, fairness, and shared expectations."),
      card("energy", "Emotional Load", 66, "Money can become emotional when future plans and responsibilities are involved."),
      card("growth", "Future Building Potential", 74, "A shared setup can build stronger habits when both people agree on direction."),
    ],
    ["shared expenses", "uneven contribution", "future planning pressure", "comfort spending together", "money communication", "family boundaries"],
    ["Shared Money Rules", "Emergency Fund", "Future Planning", "Spending Communication"],
    "Tell CLARA what feels unclear, unfair, or emotional about money in your shared setup."
  ),

  "Family Household": stage(
    "Home-centered season",
    "Home routines, contribution expectations, family needs, and personal boundaries influence money behavior.",
    "Family Household life shapes spending through shared food, bills, requests, emergencies, support pressure, and the emotional challenge of helping without losing personal stability.",
    {
      setup: ["Living with parents", "Supporting siblings", "Shared household", "Main contributor at home", "Multi-family home"],
      rhythm: ["Fixed household contribution", "Requests are unpredictable", "Shared food and bills", "Income shared with family", "Seasonal family needs"],
      workload: ["Manageable contribution", "Often interrupted", "Emotionally draining", "Everyone depends on me", "Boundary conflict"],
      pressure: ["Food and bills", "Family requests", "Education or medical support", "Personal boundaries", "Emergency help"],
      coping: ["I give even when tight", "I hide my money stress", "I delay my own needs", "I borrow for family needs", "I set limits clearly"],
      goal: ["Contribute wisely", "Build personal buffer", "Set family boundaries", "Protect essentials", "Reduce rescue spending"],
    },
    [
      card("pressure", "Household Responsibility", 76, "Family needs and shared costs can affect personal money decisions."),
      card("stability", "Family Stability", 67, "Home routines can be stable, but unexpected family needs may interrupt plans."),
      card("energy", "Support Exhaustion", 72, "Emotional responsibility can make financial boundaries harder."),
      card("growth", "Long-Term Security", 70, "Clear routines and contribution rules can build stronger household security."),
    ],
    ["shared food costs", "family requests", "support pressure", "personal boundaries", "emergency help", "rescue spending"],
    ["Household Budget Awareness", "Personal Safety Fund", "Boundary Planning", "Routine Spending Rules"],
    "Tell CLARA how your home setup affects your spending, energy, or boundaries lately."
  ),

  "Single Parent": stage(
    "Protective season",
    "Child-centered essentials, time pressure, emotional energy, and emergency safety need careful protection.",
    "Single Parents carry child-centered decisions, irregular support risk, emergency pressure, and high responsibility with limited margin for mistakes.",
    {
      setup: ["One child", "Multiple young children", "School-age child", "Co-parenting support", "Solo without steady support"],
      rhythm: ["Stable income and routine", "Support comes regularly", "Support comes irregularly", "School expense cycles", "Unpredictable days"],
      workload: ["Manageable care load", "Always busy", "Limited childcare support", "Emotionally exhausted", "Survival parenting mode"],
      pressure: ["Daily essentials", "School or childcare costs", "Emergency or health costs", "Time pressure", "Debt or borrowed money"],
      coping: ["I sacrifice my own needs", "I borrow when urgent", "I buy comfort for my child", "I avoid checking money", "I ask for support when needed"],
      goal: ["Protect essentials", "Emergency fund first", "Reduce debt", "Stabilize routine", "Secure my child’s future"],
    },
    [
      card("pressure", "Essential Load", 84, "Daily essentials often leave little room for financial mistakes."),
      card("stability", "Emergency Stability", 79, "Unexpected costs can disrupt the whole month quickly."),
      card("energy", "Energy Drain", 76, "Care, work, and planning pressure can drain emotional energy."),
      card("growth", "Protection Potential", 81, "Small systems can strongly protect your child, peace, and future stability."),
    ],
    ["childcare burden", "education costs", "irregular support", "emergency instability", "burnout spending", "time pressure"],
    ["Stability First", "Emergency Buffer", "Insurance Awareness", "Child Education Planning"],
    "Tell CLARA what currently feels hardest to protect for you and your child."
  ),

  "Full-Time Earner": stage(
    "Routine earning season",
    "Stable work, salary cycles, family responsibility, fatigue, and lifestyle creep become the quiet patterns to watch.",
    "Full-Time Earners usually have predictable income, but cutoff dependency, routine fatigue, family support, and stress-reward spending can quietly weaken financial stability.",
    {
      setup: ["Stable employment", "BPO or shift work", "Remote full-time work", "Field or service work", "Full-time breadwinner"],
      rhythm: ["Fixed monthly salary", "Twice-a-month cutoff", "Overtime-dependent pay", "Stable pay but tight budget", "Salary + side income"],
      workload: ["Predictable routine", "Long work hours", "Shift fatigue", "High-responsibility workload", "Routine burnout cycle"],
      pressure: ["Cutoff dependency", "Household or family support", "Lifestyle upgrades", "Debt or installment pressure", "Stress spending"],
      coping: ["Payday reward spending", "Convenience spending", "I support others first", "I ignore the budget when tired", "I delay self-care"],
      goal: ["Save consistently", "Emergency fund first", "Control payday spending", "Reduce debt", "Build discipline"],
    },
    [
      card("pressure", "Lifestyle Pressure", 64, "Stable income can make upgrades and small leaks feel harmless."),
      card("stability", "Income Stability", 78, "Predictable pay can support strong money systems when planned well."),
      card("energy", "Routine Fatigue", 71, "Repeating work cycles can trigger reward spending and delayed self-care."),
      card("growth", "Savings Opportunity", 73, "A stable cutoff rhythm gives strong potential for automatic saving habits."),
    ],
    ["lifestyle creep", "stress spending", "cutoff dependency", "family support", "routine fatigue", "installment pressure"],
    ["Cutoff Budget Rules", "Emergency Fund", "Stress-Spending Replacement", "Savings Automation"],
    "Tell CLARA what usually breaks your routine spending plan."
  ),

  "Freelance Season": stage(
    "Flexible income season",
    "Income timing, client flow, dry months, boundaries, and buffers matter more than perfect planning.",
    "Freelance Season brings flexibility, but unstable payment timing, underpricing, overwork, and personal-business mixing make financial structure essential.",
    {
      setup: ["Full-time freelancer", "Side hustle", "Project-based work", "Commission-based work", "Starting freelance"],
      rhythm: ["Recurring clients", "Project waves", "Feast/famine cycle", "Delayed payments", "Growing slowly"],
      workload: ["Flexible but manageable", "Busy client season", "Overworked and unclear", "No rest structure", "Client pressure always on"],
      pressure: ["Income variability", "Client delays", "Dry month risk", "Underpricing pressure", "Personal/business mixing"],
      coping: ["I spend after big payments", "I underprice to keep clients", "I avoid planning dry months", "I overwork when anxious", "I separate my money"],
      goal: ["Build cash buffer", "Stabilize income", "Separate wallets", "Prepare for dry months", "Grow client pipeline"],
    },
    [
      card("pressure", "Income Variability", 83, "Income timing can move while expenses stay fixed."),
      card("stability", "Cash-Flow Stability", 45, "Cash flow needs buffers because work and payments may not arrive evenly."),
      card("energy", "Creative Burnout", 68, "Freedom can still become exhausting when work, rest, and income blur."),
      card("growth", "Freedom Potential", 80, "A good system can turn flexible work into long-term independence."),
    ],
    ["cash-flow gaps", "client delays", "underpricing", "overwork", "personal-business mixing", "dry months"],
    ["Cash Buffer", "Separate Wallets", "Client Pipeline", "Rest Planning"],
    "Tell CLARA what makes freelance income feel unstable or stressful lately."
  ),

  "Business Builder": stage(
    "Building season",
    "Operating costs, reinvestment, sales swings, personal income, and decision pressure can easily mix.",
    "Business Builders carry growth pressure, capital decisions, unstable profit, reinvestment tension, and blurred boundaries between personal and business money.",
    {
      setup: ["Just starting", "Side business", "Main income business", "Growing already", "Rebuilding or pivoting"],
      rhythm: ["Sales not steady", "Monthly business cycle", "Reinvesting heavily", "Cash flow swings", "Scaling up"],
      workload: ["Manageable build", "Long operating hours", "Decision overload", "Founder burnout", "Team or customer pressure"],
      pressure: ["Operating costs", "Inventory or capital pressure", "Personal/business mix", "Sales uncertainty", "Reinvestment pressure"],
      coping: ["I reinvest too quickly", "I mix personal and business money", "I spend when sales are good", "I delay paying myself", "I track business costs"],
      goal: ["Separate money", "Build runway", "Control spending", "Grow sustainably", "Pay myself properly"],
    },
    [
      card("pressure", "Reinvestment Pressure", 77, "Growth often competes with personal needs and short-term comfort."),
      card("stability", "Business Stability", 52, "Sales, costs, and cash flow need clearer separation from personal life."),
      card("energy", "Decision Overload", 79, "Many business decisions can create mental fatigue and risky shortcuts."),
      card("growth", "Scale Potential", 84, "With structure, this stage can create long-term financial upside."),
    ],
    ["capital pressure", "inventory costs", "sales instability", "money mixing", "over-reinvestment", "delayed owner pay"],
    ["Separate Wallets", "Runway Fund", "Operating Budget", "Owner Pay Rule", "Slow Growth Plan"],
    "Tell CLARA where business money and personal money feel mixed right now."
  ),
};

const WORKING_STUDENT_SNAPSHOTS = {
  essentialCost: {
    title: "Essential-cost pressure",
    caption: "School costs, transport, meals, mobile data, and work hours are competing for the same limited income. CLARA should protect basics before strict saving.",
    overview: "This Working Student profile shows survival-budget pressure. The main risk is not careless spending; it is repeated essential costs arriving faster than income, rest, and planning energy can recover.",
    indicators: [
      card("pressure", "Essential-Cost Load", 36, "Influence share: school needs and repeated daily costs can squeeze the week."),
      card("energy", "Recovery Gap", 27, "Influence share: low recovery time can shape spending through skipped meals and shortcut decisions."),
      card("stability", "Cash Buffer Risk", 23, "Influence share: the week becomes risky when there is no small buffer for sudden school or daily costs."),
      card("growth", "Stability Potential", 14, "Influence share: essentials protection and realistic weekly caps can stabilize this pattern."),
    ],
    struggles: ["tuition timing", "commute and meals", "school project spikes", "low recovery", "small cash gaps"],
    recommendations: ["Weekly essentials cap", "Transport buffer", "School-cost wallet", "Meal protection", "Micro-emergency fund"],
  },
  familyLinked: {
    title: "Family-linked responsibility",
    caption: "Your money decisions are connected to home support. Family contribution, school needs, food, and transport can compete, so budgeting needs boundaries instead of guilt.",
    overview: "This Working Student profile shows shared-responsibility pressure. Helping family may be meaningful, but CLARA should help define limits so school stability and daily essentials do not collapse quietly.",
    indicators: [
      card("pressure", "Shared-Money Pressure", 34, "Influence share: family help becomes heavier when it overlaps with tuition, school projects, transport, or personal essentials."),
      card("energy", "Responsibility Load", 29, "Influence share: family-linked responsibility can shape fatigue because the student and support roles use the same energy."),
      card("stability", "Boundary Risk", 24, "Influence share: helping without a clear weekly limit can weaken school stability and daily needs."),
      card("growth", "Support Balance", 13, "Influence share: a fixed family-support rule can protect both care and essentials."),
    ],
    struggles: ["family contribution", "guilt spending", "shared pressure", "school-cost conflict", "weak personal buffer"],
    recommendations: ["Family support limit", "Essentials-first rule", "School wallet", "Personal safety buffer", "Support without guilt"],
  },
  highFatigue: {
    title: "High-fatigue schedule",
    caption: "School and work appear to be overlapping heavily. Commute, deadlines, and irregular meals can push convenience spending because time, not only money, is limited.",
    overview: "This Working Student profile shows schedule-cost pressure. When time is scarce, spending often shifts toward shortcuts: food outside, rush transport, forgotten tracking, and small comfort purchases.",
    indicators: [
      card("energy", "Fatigue Load", 36, "Influence share: fatigue can shape money behavior through missed meals, comfort buys, and low review energy."),
      card("pressure", "Schedule-Cost Pressure", 28, "Influence share: class, work, commute, and deadlines can create convenience costs."),
      card("stability", "Convenience Spend Risk", 22, "Influence share: convenience spending grows when the schedule removes time for cheaper options."),
      card("growth", "Recovery Potential", 14, "Influence share: recovery rules can reduce pressure without strict restriction."),
    ],
    struggles: ["commute fatigue", "missed meals", "convenience spending", "late tracking", "work-school overlap"],
    recommendations: ["Recovery budget", "Meal plan shortcut", "Commute buffer", "Low-energy tracking", "Rest protection"],
  },
  delayedPayment: {
    title: "Delayed-payment cycle",
    caption: "Money pressure may already be moving from one week into the next. Borrowing, delayed payments, or tuition timing can make the month feel like repair mode.",
    overview: "This Working Student profile shows stacked-pressure risk. CLARA should prioritize repayment rhythm, no-new-debt boundaries, and a small emergency fare/food buffer before flexible spending.",
    indicators: [
      card("pressure", "Repayment Pressure", 38, "Influence share: repayment timing should be protected before rewards or flexible spending."),
      card("energy", "Debt Stress Load", 28, "Influence share: borrowed money can shape confidence, checking behavior, and decisions."),
      card("stability", "Cash-Flow Stability", 24, "Influence share: cash flow becomes unstable when income timing does not match school, food, fare, and repayment deadlines."),
      card("growth", "Recovery Potential", 10, "Influence share: no-new-debt rules and a small buffer can gradually return control."),
    ],
    struggles: ["borrowed money", "delayed payments", "cash-flow mismatch", "repayment pressure", "survival gaps"],
    recommendations: ["No-new-debt rule", "Repayment rhythm", "Emergency fare buffer", "Debt-first sorting", "Payment calendar"],
  },
  recoverySpending: {
    title: "Recovery-spending rhythm",
    caption: "Your spending may be recovery-driven. After school, work, commute, and pressure, small food, drink, or digital purchases can become quick relief.",
    overview: "This Working Student profile shows reward-frequency risk. The issue is usually not one purchase; it is repeated small relief spending when rest, meals, and emotional recovery are missing.",
    indicators: [
      card("stability", "Reward Frequency Risk", 33, "Influence share: small rewards become risky when they repeat often enough to drain the week."),
      card("energy", "Emotional Fatigue", 30, "Influence share: relief spending often rises after long class-work days, commute fatigue, or repeated pressure."),
      card("pressure", "Daily Pressure", 24, "Influence share: food, fare, mobile data, school materials, and time pressure build quietly."),
      card("growth", "Reward Control", 13, "Influence share: a planned reward limit protects relief without letting stress control the wallet."),
    ],
    struggles: ["small reward spending", "irregular meals", "digital micro-spending", "stress recovery", "comfort purchases"],
    recommendations: ["Reward limit", "Low-cost recovery list", "Meal protection", "Spending pause", "Weekly leak review"],
  },
  selfFunded: {
    title: "Self-funded student builder",
    caption: "You are carrying more of school and daily life yourself. Income timing, tuition needs, transport, meals, and emergency margin need clear protection.",
    overview: "This Working Student profile shows independence-load pressure. The user may be disciplined, but the system should avoid unrealistic saving pressure and focus on stable essentials first.",
    indicators: [
      card("pressure", "Essential Pressure", 34, "Influence share: tuition, commute, meals, data, and materials are harder to safely delay."),
      card("energy", "Independence Load", 29, "Influence share: carrying personal costs while studying raises fatigue when school and income timing collide."),
      card("stability", "Buffer Stability", 24, "Influence share: one missed income or extra school cost can affect the whole week."),
      card("growth", "Discipline Potential", 13, "Influence share: realistic caps can turn self-funding pressure into stable discipline."),
    ],
    struggles: ["self-supporting costs", "income timing", "tuition pressure", "small buffer", "essential expenses"],
    recommendations: ["Essentials-first plan", "School wallet", "Income timing map", "Minimum buffer", "Realistic saving rule"],
  },
  stableStretched: {
    title: "Stable but stretched",
    caption: "Your setup still has room for control, but the week is already stretched. This is the best time to build caps for food, fare, load/data, and small rewards.",
    overview: "This Working Student profile is not yet in crisis, but small leaks can grow when school and work get heavier. CLARA should build rhythm early.",
    indicators: [
      card("energy", "Fatigue Watch", 29, "Influence share: pressure is present, but weekly limits and recovery planning can prevent deeper fatigue."),
      card("pressure", "Cost Pressure", 28, "Influence share: transport, food, data, and school materials may already need clearer planning."),
      card("stability", "Routine Stability", 25, "Influence share: the routine is still forming, so a simple weekly rhythm matters before pressure increases."),
      card("growth", "Future Potential", 18, "Influence share: ambition plus protected essentials can make this a strong building season."),
    ],
    struggles: ["early fatigue", "small leaks", "routine building", "weekly caps", "school-work rhythm"],
    recommendations: ["Weekly cap", "Fare and food limit", "Simple tracker", "Small reward rule", "Savings slowly"],
  },
  developingRhythm: {
    title: "Developing money rhythm",
    caption: "You are learning, earning, adjusting, and building direction with limited margin. CLARA should watch repeated costs before they become monthly leaks.",
    overview: "This Working Student profile shows a developing rhythm. The priority is to notice repeated micro-spending while protecting school, transport, meals, and energy.",
    indicators: [
      card("energy", "Burnout Watch", 29, "Influence share: school, work, commute, and future pressure draw from the same energy source."),
      card("pressure", "Financial Pressure", 28, "Influence share: repeated small expenses matter when income is limited, even if no single week feels extreme."),
      card("stability", "Micro-Spend Risk", 25, "Influence share: food, transport, mobile data, digital, or social spending can become hidden monthly patterns."),
      card("growth", "Future Potential", 18, "Influence share: effort, sacrifice, and future orientation can become long-term stability when guided well."),
    ],
    struggles: ["micro-spending", "limited margin", "school costs", "commute and food", "social pressure"],
    recommendations: ["Micro-spend review", "Weekly essentials", "Transport buffer", "Basic savings rhythm", "Energy-aware budgeting"],
  },
};

function getWorkingStudentSnapshot(profileOverride = {}) {
  const saved = readSavedLifeStageProfile();
  const draft = readWorkingStudentBranchDraft();
  const profile = { ...saved, ...draft, ...profileOverride };
  const setup = clean(profile.setup);
  const branch = branchForSetup(setup);
  const snapshot = WORKING_STUDENT_SNAPSHOTS[branch.snapshotKey] || WORKING_STUDENT_SNAPSHOTS.developingRhythm;

  const familyScore = hasAny(setup, ["family"]) || hasAny(profile.pressure, ["family", "guilt", "support"]) ? 2 : 0;
  const debtScore = hasAny(setup, ["recover", "financial pressure"]) || hasAny(profile.pressure, ["debt", "borrow", "repayment"]) || hasAny(profile.coping, ["borrow", "delay"]) ? 2 : 0;
  const survivalScore = hasAny(setup, ["survive", "alone", "continue school"]) || hasAny(profile.pressure, ["food", "fare", "tuition", "emergency"]) ? 2 : 0;
  const burnoutScore = hasAny(setup, ["exhaustion"]) || hasAny(profile.workload, ["rest", "tired", "overlap", "commute", "deadlines"]) ? 2 : 0;
  const rewardScore = hasAny(profile.coping, ["reward", "comfort", "small", "convenience"]) || hasAny(profile.goal, ["stress", "reward", "leaks"]) ? 2 : 0;
  const stableScore = hasAny(setup, ["supported", "future"]) || hasAny(profile.goal, ["discipline", "rhythm", "slowly", "purpose"]) ? 1 : 0;

  const signalStrength = snapshot.indicators.map((item) => {
    let value = item.value;
    if (item.category === "energy") value += burnoutScore + Math.max(0, survivalScore - 1);
    if (item.category === "pressure") value += familyScore + debtScore + survivalScore;
    if (item.category === "stability") value += rewardScore + debtScore - stableScore;
    if (item.category === "growth") value += stableScore - Math.max(0, debtScore - 1);
    return { ...item, value: clamp(value, 6, 60) };
  });

  return { ...snapshot, indicators: normalizeInfluenceBreakdown(signalStrength) };
}

const WORKING_STUDENT_DEFINITION = {
  get identity() {
    const base = LIFE_STAGE_INTELLIGENCE["Working Student"].identity;
    const snapshot = getWorkingStudentSnapshot();
    return {
      title: snapshot.title || base.title,
      caption: snapshot.caption || base.caption,
      overview: snapshot.overview || base.overview,
    };
  },
  get fields() {
    return getWorkingStudentFields();
  },
  get indicators() {
    return getWorkingStudentSnapshot().indicators;
  },
  get struggles() {
    return getWorkingStudentSnapshot().struggles;
  },
  get recommendations() {
    return getWorkingStudentSnapshot().recommendations;
  },
  get talkPrompt() {
    return "Tell CLARA what feels heaviest right now: school costs, commute, family support, income timing, debt, or recovery spending.";
  },
};

export function getStageDefinition(stageName, profile = {}) {
  const normalized = normalizeLifeStage(stageName);
  if (normalized === "Working Student") {
    const fields = getWorkingStudentFields({ stage: "Working Student", ...profile });
    const snapshot = getWorkingStudentSnapshot(profile);
    return {
      identity: {
        title: snapshot.title,
        caption: snapshot.caption,
        overview: snapshot.overview,
      },
      fields,
      indicators: snapshot.indicators,
      struggles: snapshot.struggles,
      recommendations: snapshot.recommendations,
      talkPrompt: WORKING_STUDENT_DEFINITION.talkPrompt,
    };
  }
  return LIFE_STAGE_INTELLIGENCE[normalized] || LIFE_STAGE_INTELLIGENCE[DEFAULT_STAGE.stage];
}

export function buildWorkingStudentDraft(previous = {}) {
  return getWorkingStudentDefaults(previous);
}
