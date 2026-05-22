import {
  WORKING_STUDENT_STAGE_KEY,
  WORKING_STUDENT_ROOTS,
  buildWorkingStudentDraft as buildCanonicalWorkingStudentDraft,
  completeWorkingStudentDraft,
  getWorkingStudentOptions,
  getWorkingStudentSnapshot,
} from "./workingStudentLifeStageSource";

export const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
export const WORKING_STUDENT_BRANCH_DRAFT_KEY = "clara_working_student_branch_draft_v1";

export const STAGES = [
  "Young Professional",
  WORKING_STUDENT_STAGE_KEY,
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

export function getStageDefinition(stageName, profile = {}) {
  const normalized = normalizeLifeStage(stageName);
  if (normalized === WORKING_STUDENT_STAGE_KEY) {
    return getWorkingStudentDefinition(profile);
  }
  return LIFE_STAGE_INTELLIGENCE[normalized] || LIFE_STAGE_INTELLIGENCE[DEFAULT_STAGE.stage];
}

export function buildWorkingStudentDraft(previous = {}) {
  return buildCanonicalWorkingStudentDraft(previous);
}
