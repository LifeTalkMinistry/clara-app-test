import {
  WORKING_STUDENT_STAGE_KEY,
  WORKING_STUDENT_ROOTS,
  buildWorkingStudentDraft as buildCanonicalWorkingStudentDraft,
  completeWorkingStudentDraft,
  getWorkingStudentOptions,
  getWorkingStudentSnapshot,
} from "./workingStudentLifeStageSource";
import {
  LIVING_WITH_PARTNER_STAGE_KEY,
  LIVING_WITH_PARTNER_ROOTS,
  completeLivingWithPartnerDraft,
  getLivingWithPartnerOptions,
  getLivingWithPartnerSnapshot,
} from "./livingWithPartnerLifeStageSource";

export const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
export const WORKING_STUDENT_BRANCH_DRAFT_KEY = "clara_working_student_branch_draft_v1";

export const STAGES = [
  "Young Professional",
  WORKING_STUDENT_STAGE_KEY,
  LIVING_WITH_PARTNER_STAGE_KEY,
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

function getWorkingStudentFields(profile = {}) {
  const draft = completeWorkingStudentDraft({ stage: WORKING_STUDENT_STAGE_KEY, ...profile });
  return {
    setup: WORKING_STUDENT_ROOTS,
    rhythm: getWorkingStudentOptions(draft, "rhythm"),
    workload: getWorkingStudentOptions(draft, "workload"),
    pressure: getWorkingStudentOptions(draft, "pressure"),
    coping: getWorkingStudentOptions(draft, "coping"),
    goal: getWorkingStudentOptions(draft, "goal"),
  };
}

function getWorkingStudentDefinition(profile = {}) {
  const snapshot = getWorkingStudentSnapshot(profile);
  return {
    identity: {
      title: snapshot.title,
      caption: snapshot.caption,
      overview: snapshot.overview,
    },
    fields: getWorkingStudentFields(profile),
    indicators: snapshot.indicators,
    struggles: snapshot.struggles,
    recommendations: snapshot.recommendations,
    talkPrompt: "Tell CLARA what feels heaviest right now: school costs, commute, family support, income timing, debt, or recovery spending.",
  };
}

function getLivingWithPartnerFields(profile = {}) {
  const draft = completeLivingWithPartnerDraft({ stage: LIVING_WITH_PARTNER_STAGE_KEY, ...profile });
  return {
    setup: LIVING_WITH_PARTNER_ROOTS,
    rhythm: getLivingWithPartnerOptions(draft, "rhythm"),
    workload: getLivingWithPartnerOptions(draft, "workload"),
    pressure: getLivingWithPartnerOptions(draft, "pressure"),
    coping: getLivingWithPartnerOptions(draft, "coping"),
    goal: getLivingWithPartnerOptions(draft, "goal"),
  };
}

function getLivingWithPartnerDefinition(profile = {}) {
  const snapshot = getLivingWithPartnerSnapshot(profile);
  return {
    identity: {
      title: snapshot.title,
      caption: snapshot.caption,
      overview: snapshot.overview,
    },
    fields: getLivingWithPartnerFields(profile),
    indicators: snapshot.indicators,
    struggles: snapshot.struggles,
    recommendations: snapshot.recommendations,
    talkPrompt: "Tell CLARA what feels unclear, unfair, or emotional about money in your shared setup.",
  };
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

  [WORKING_STUDENT_STAGE_KEY]: getWorkingStudentDefinition(),

  [LIVING_WITH_PARTNER_STAGE_KEY]: getLivingWithPartnerDefinition(),

  "Family Household": stage(
    "Home-centered season",
    "Home routines, contribution expectations, family needs, and personal boundaries influence money behavior.",
    "Family Household life shapes spending through shared food, bills, requests, emergencies, support pressure, and the emotional challenge of helping without losing personal stability.",
    {
      setup: [
        "Supporting parents or relatives",
        "Shared household bills",
        "Breadwinner pressure",
        "Family requests change the month",
        "Personal goals delayed by home needs",
        "Household emergencies",
        "Helping without losing stability",
      ],
      rhythm: [
        "Fixed household contribution",
        "Requests are unpredictable",
        "Shared food and bills",
        "Income is partly shared",
        "Emergency needs appear suddenly",
        "Support changes every month",
        "Personal money becomes backup",
      ],
      workload: [
        "Manageable contribution",
        "Often interrupted by home needs",
        "Emotionally draining support role",
        "Everyone depends on me",
        "Boundary conflict at home",
        "Household errands take energy",
        "Rest feels hard to protect",
      ],
      pressure: [
        "Food and bills",
        "Family requests",
        "Education or medical support",
        "Personal boundaries",
        "Emergency help",
        "Delayed personal goals",
        "Rescue spending pressure",
      ],
      coping: [
        "I give even when tight",
        "I hide my money stress",
        "I delay my own needs",
        "I borrow for family needs",
        "I set limits then feel guilty",
        "I cover gaps quietly",
        "I say yes before checking budget",
      ],
      goal: [
        "Contribute wisely",
        "Build personal buffer",
        "Set family boundaries",
        "Protect essentials",
        "Reduce rescue spending",
        "Keep home support sustainable",
        "Protect my own stability too",
      ],
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
      setup: [
        "Child essentials first",
        "One-income household",
        "Co-parenting support is inconsistent",
        "Emergency pressure is constant",
        "Time and money both stretched",
        "Guilt around personal spending",
        "Protecting child stability",
      ],
      rhythm: [
        "Stable income and routine",
        "Support comes regularly",
        "Support comes irregularly",
        "School expense cycles",
        "Unpredictable child needs",
        "Income arrives after essentials",
        "Bills and child costs overlap",
      ],
      workload: [
        "Manageable care load",
        "Always busy",
        "Limited childcare support",
        "Emotionally exhausted",
        "Survival parenting mode",
        "No quiet time to plan",
        "Care and work overlap",
      ],
      pressure: [
        "Daily essentials",
        "School or childcare costs",
        "Emergency or health costs",
        "Time pressure",
        "Debt or borrowed money",
        "Child needs before savings",
        "Weak safety buffer",
      ],
      coping: [
        "I sacrifice my own needs",
        "I borrow when urgent",
        "I buy comfort for my child",
        "I avoid checking money",
        "I ask for support when needed",
        "I delay my own rest",
        "I stretch food and transport",
      ],
      goal: [
        "Protect essentials",
        "Emergency fund first",
        "Reduce debt",
        "Stabilize routine",
        "Secure my child’s future",
        "Build a small safety buffer",
        "Protect parent energy too",
      ],
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
      setup: [
        "Stable salary but stretched",
        "Payday-to-payday rhythm",
        "Reward spending after work",
        "Family or personal obligations",
        "Bills and subscriptions stacking",
        "Low savings despite income",
        "Tired routine affects money",
      ],
      rhythm: [
        "Fixed monthly salary",
        "Twice-a-month cutoff",
        "Overtime-dependent pay",
        "Stable pay but tight budget",
        "Salary + side income",
        "Bills arrive before payday",
        "Payday feels strong then fades",
      ],
      workload: [
        "Predictable routine",
        "Long work hours",
        "Shift fatigue",
        "High-responsibility workload",
        "Routine burnout cycle",
        "Commute drains energy",
        "Rest days become spending days",
      ],
      pressure: [
        "Cutoff dependency",
        "Household or family support",
        "Lifestyle upgrades",
        "Debt or installment pressure",
        "Stress spending",
        "Subscriptions and bills stacking",
        "Low emergency buffer",
      ],
      coping: [
        "Payday reward spending",
        "Convenience spending after work",
        "I support others first",
        "I ignore the budget when tired",
        "I delay self-care",
        "I pay bills then guess the rest",
        "I promise to fix it next cutoff",
      ],
      goal: [
        "Save consistently",
        "Emergency fund first",
        "Control payday spending",
        "Reduce debt",
        "Build discipline",
        "Make cutoff smoother",
        "Stop salary leaks",
      ],
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
      setup: [
        "Irregular client income",
        "Strong weeks and dry weeks",
        "Late payments",
        "Project-based pressure",
        "No fixed salary safety",
        "Mixing personal and work money",
        "Building freedom while needing stability",
      ],
      rhythm: [
        "Recurring clients",
        "Project waves",
        "Feast/famine cycle",
        "Delayed payments",
        "Growing slowly",
        "Client payments arrive unevenly",
        "Income depends on active work",
      ],
      workload: [
        "Flexible but manageable",
        "Busy client season",
        "Overworked and unclear",
        "No rest structure",
        "Client pressure always on",
        "Admin work eats time",
        "Rest feels risky when unpaid",
      ],
      pressure: [
        "Income variability",
        "Client delays",
        "Dry month risk",
        "Underpricing pressure",
        "Personal/business mixing",
        "No paid leave safety",
        "Unclear monthly baseline",
      ],
      coping: [
        "I spend after big payments",
        "I underprice to keep clients",
        "I avoid planning dry months",
        "I overwork when anxious",
        "I separate my money",
        "I accept too many projects",
        "I use personal money for work costs",
      ],
      goal: [
        "Build cash buffer",
        "Stabilize income",
        "Separate wallets",
        "Prepare for dry months",
        "Grow client pipeline",
        "Set a monthly baseline",
        "Protect rest and work rhythm",
      ],
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
      setup: [
        "Reinvesting often",
        "Cash flow uncertainty",
        "Business and personal money mixing",
        "Growth pressure",
        "Inventory or operating costs",
        "Delayed profit",
        "Protecting personal stability while building",
      ],
      rhythm: [
        "Sales not steady",
        "Monthly business cycle",
        "Reinvesting heavily",
        "Cash flow swings",
        "Scaling up",
        "Profit arrives late",
        "Expenses happen before sales",
      ],
      workload: [
        "Manageable build",
        "Long operating hours",
        "Decision overload",
        "Founder burnout",
        "Team or customer pressure",
        "Always monitoring cash flow",
        "No clear off-switch yet",
      ],
      pressure: [
        "Operating costs",
        "Inventory or capital pressure",
        "Personal/business mix",
        "Sales uncertainty",
        "Reinvestment pressure",
        "Delayed owner pay",
        "Customer or supplier gaps",
      ],
      coping: [
        "I reinvest too quickly",
        "I mix personal and business money",
        "I spend when sales are good",
        "I delay paying myself",
        "I track business costs",
        "I cover business gaps personally",
        "I chase growth before stability",
      ],
      goal: [
        "Separate money",
        "Build runway",
        "Control spending",
        "Grow sustainably",
        "Pay myself properly",
        "Stabilize cash flow",
        "Protect personal life too",
      ],
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

export function getStageDefinition(stageName, profile = {}) {
  const normalized = normalizeLifeStage(stageName);
  if (normalized === WORKING_STUDENT_STAGE_KEY) {
    return getWorkingStudentDefinition(profile);
  }
  if (normalized === LIVING_WITH_PARTNER_STAGE_KEY) {
    return getLivingWithPartnerDefinition(profile);
  }
  return LIFE_STAGE_INTELLIGENCE[normalized] || LIFE_STAGE_INTELLIGENCE[DEFAULT_STAGE.stage];
}

export function buildWorkingStudentDraft(previous = {}) {
  return buildCanonicalWorkingStudentDraft(previous);
}
