export const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

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
  setup: "Early career",
  rhythm: "Learning rhythm",
  workload: "Busy but okay",
  pressure: "Living costs",
  coping: "I reward myself after work",
  goal: "Build habits",
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

export const LIFE_STAGE_INTELLIGENCE = {
  "Young Professional": stage(
    "Building independence",
    "Building independence while facing rising living costs and unstable growth opportunities.",
    "Young Professionals are building identity, independence, and early money habits while dealing with career pressure and lifestyle temptation.",
    {
      setup: ["First job", "Early career", "Exploring income", "Building independence", "Career switching"],
      rhythm: ["Stable salary", "Cutoff cycle", "Income still changing", "Learning rhythm", "Side income support"],
      workload: ["Manageable", "Busy but okay", "Draining routine", "Burnout season"],
      pressure: ["Living costs", "Comfort spending", "Peer/lifestyle pressure", "Family support", "Low savings buffer"],
      coping: [
        "I reward myself after work",
        "I avoid checking expenses",
        "I use credit or pay later",
        "I overspend with friends",
        "I cut fun completely",
      ],
      goal: ["Build habits", "Emergency fund first", "Reduce impulse buys", "Save first", "Control lifestyle creep"],
    },
    [
      card("pressure", "Living Pressure", 72, "Rising costs and lifestyle adjustment pressure are common in this stage."),
      card("stability", "Savings Readiness", 41, "Savings can feel low while independence and self-reward are still forming."),
      card("energy", "Decision Fatigue", 64, "New choices around work, lifestyle, and money can become mentally heavy."),
      card("growth", "Career Momentum", 58, "Early career growth is building, but it still needs structure and consistency."),
    ],
    ["lifestyle inflation", "comfort spending", "peer pressure", "low savings rhythm", "career uncertainty"],
    ["Emergency Fund", "Expense Awareness", "Skill Growth", "Debt Avoidance"],
    "Talk about what feels hardest now that you’re building your professional life."
  ),

  "Working Student": stage(
    "Stretched season",
    "Time, school, work, energy, and money all compete for attention.",
    "Working Students are balancing education, income, survival, and identity while managing limited time and uneven routines.",
    {
      setup: [
        "Family-supported + working",
        "Self-supporting student",
        "Helping family while studying",
        "First job while studying",
        "Side hustle student",
      ],
      rhythm: [
        "Allowance + work income",
        "Fixed part-time pay",
        "Irregular side income",
        "Seasonal/project income",
        "Mostly allowance, small extra work",
      ],
      workload: ["Manageable", "Tight but okay", "Heavy", "Survival mode"],
      pressure: [
        "Tuition or school costs",
        "Daily food and transport",
        "Too much work and school load",
        "Family contribution",
        "Debt or borrowed money",
      ],
      coping: [
        "I buy small rewards",
        "I avoid checking my money",
        "I borrow or delay payments",
        "I cut back too much",
        "I ask for help",
      ],
      goal: [
        "Graduate safely",
        "Avoid debt",
        "Build savings slowly",
        "Help family wisely",
        "Control stress spending",
      ],
    },
    [
      card("energy", "Burnout Risk", 76, "School, work, money, and recovery pressure can drain energy fast."),
      card("pressure", "Financial Pressure", 72, "Tuition, daily costs, irregular income, and responsibility can tighten the whole month."),
      card("stability", "Emotional Spending Risk", 62, "Small rewards can become a coping pattern when rest and control feel limited."),
      card("growth", "Future Potential", 84, "Balancing school and work can build strong resilience, discipline, and future earning power."),
    ],
    ["transport costs", "tuition pressure", "burnout spending", "irregular income", "time scarcity", "family contribution", "debt pressure"],
    ["Weekly Spending Cap", "Transport Buffer", "Study-Work Recovery", "Avoid Debt", "Stress-Spending Replacement"],
    "Tell CLARA what feels heavier right now: school, work, money, family responsibility, or energy."
  ),

  "Living with Partner": stage(
    "Shared-life season",
    "Routines, emotions, and future plans are starting to shape financial decisions.",
    "Living with a partner means financial decisions are no longer purely personal; routines, expectations, and future plans start to merge.",
    {
      setup: ["Just us together", "With my family", "With partner’s family", "Still moving around", "Planning to move in"],
      rhythm: ["Mostly stable", "Still finding rhythm", "This is new", "Temporary for now", "Income is shared unevenly"],
      workload: ["Calm routine", "Adjusting together", "Emotionally heavy", "Constantly negotiating"],
      pressure: ["Shared expenses", "Future planning", "Money communication", "Family boundaries", "Uneven contribution"],
      coping: [
        "We avoid money talks",
        "We spend for comfort",
        "One person pays more",
        "We argue about costs",
        "We plan together",
      ],
      goal: ["Build savings together", "Emergency fund first", "Plan our future", "Stability first", "Set shared money rules"],
    },
    [
      card("pressure", "Shared Expense Pressure", 70, "Shared routines can make spending feel normal faster than expected."),
      card("stability", "Relationship Stability", 62, "Financial stability depends partly on communication and shared expectations."),
      card("energy", "Emotional Load", 66, "Money can become emotional when future plans and responsibilities are involved."),
      card("growth", "Future Building Potential", 74, "A shared setup can build stronger habits when both people agree on direction."),
    ],
    ["shared expenses", "future planning pressure", "comfort spending together", "money communication", "routine adjustment"],
    ["Shared Money Rules", "Emergency Fund", "Future Planning", "Spending Communication"],
    "Tell CLARA what feels unclear or emotional about money in your shared-life setup."
  ),

  "Family Household": stage(
    "Home-centered season",
    "Family setup, household rhythm, and daily environment influence money behavior.",
    "Family Household life shapes spending through shared routines, support expectations, food costs, and responsibility pressure.",
    {
      setup: ["With parents", "With siblings", "Whole family", "Shared home", "Main contributor at home"],
      rhythm: ["Stable home", "Home is changing", "Shared routine", "Busy household", "Requests are unpredictable"],
      workload: ["Manageable home load", "Often interrupted", "Emotionally draining", "Everyone depends on me"],
      pressure: ["Household contribution", "Support pressure", "Family requests", "Personal boundaries", "Food and bills"],
      coping: [
        "I give even when tight",
        "I hide my money stress",
        "I delay my own needs",
        "I spend to escape stress",
        "I set boundaries",
      ],
      goal: ["Contribute wisely", "Build safety", "Reduce stress spending", "Personal stability", "Set family boundaries"],
    },
    [
      card("pressure", "Household Responsibility", 74, "Family needs and shared costs can affect personal money decisions."),
      card("stability", "Family Stability", 67, "Home routines can be stable, but unexpected family needs may interrupt plans."),
      card("energy", "Support Exhaustion", 71, "Emotional responsibility can make financial boundaries harder."),
      card("growth", "Long-Term Security", 70, "Clear routines and contribution rules can build stronger household security."),
    ],
    ["shared food costs", "family requests", "support pressure", "personal boundaries", "stress spending"],
    ["Household Budget Awareness", "Personal Safety Fund", "Boundary Planning", "Routine Spending Rules"],
    "Tell CLARA how your home setup affects your spending lately."
  ),

  "Single Parent": stage(
    "Protective season",
    "Essentials, stability, emotional energy, and safety need careful protection.",
    "Single Parents carry child-centered decisions, emergency risk, emotional exhaustion, and high responsibility with limited margin for mistakes.",
    {
      setup: ["One child", "Two children", "Three or more", "Co-parenting setup", "Solo without steady support"],
      rhythm: ["Stable routine", "Childcare changes", "School-heavy season", "Unpredictable days", "Support comes irregularly"],
      workload: ["Manageable care load", "Always busy", "Emotionally exhausted", "Survival parenting mode"],
      pressure: ["Daily needs", "School expenses", "Emergency risk", "Time pressure", "Childcare costs"],
      coping: [
        "I sacrifice my own needs",
        "I borrow when urgent",
        "I buy comfort for my child",
        "I avoid checking money",
        "I ask for support",
      ],
      goal: ["Protect essentials", "Emergency fund first", "Reduce debt", "Stable routine", "Protect my child’s future"],
    },
    [
      card("pressure", "Essential Load", 84, "Daily essentials often leave little room for financial mistakes."),
      card("stability", "Emergency Stability", 79, "Unexpected costs can disrupt the whole month quickly."),
      card("energy", "Energy Drain", 76, "Care, work, and planning pressure can drain emotional energy."),
      card("growth", "Protection Potential", 81, "Small systems can strongly protect your child, peace, and future stability."),
    ],
    ["childcare burden", "education costs", "emergency instability", "burnout spending", "time pressure"],
    ["Stability First", "Emergency Buffer", "Insurance Awareness", "Child Education Planning"],
    "Tell CLARA what currently feels hardest to protect for you and your child."
  ),

  "Full-Time Earner": stage(
    "Routine earning season",
    "Consistency, stress recovery, and lifestyle creep become the quiet patterns to watch.",
    "Full-Time Earners usually have predictable income, but routine fatigue, cutoff dependency, and lifestyle creep can quietly grow.",
    {
      setup: ["Corporate", "BPO/call center", "Office work", "Remote work", "Shift-based job"],
      rhythm: ["Every cutoff", "Monthly salary", "Stable salary", "Shift-based", "Overtime-dependent"],
      workload: ["Manageable workload", "Long work hours", "Routine fatigue", "Burnout cycle"],
      pressure: ["Lifestyle pressure", "Stress spending", "Family support", "Routine fatigue", "Cutoff dependency"],
      coping: [
        "I reward myself after payday",
        "I overspend during cutoff",
        "I use convenience spending",
        "I support family first",
        "I delay self-care",
      ],
      goal: ["Save consistently", "Emergency fund first", "Reduce random spending", "Build discipline", "Control payday spending"],
    },
    [
      card("pressure", "Lifestyle Pressure", 63, "Stable income can make upgrades and small leaks feel harmless."),
      card("stability", "Income Stability", 77, "Predictable pay can support strong money systems when planned well."),
      card("energy", "Routine Fatigue", 70, "Repeating work cycles can trigger reward spending and delayed self-care."),
      card("growth", "Savings Opportunity", 72, "A stable cutoff rhythm gives strong potential for automatic saving habits."),
    ],
    ["lifestyle creep", "stress spending", "cutoff dependency", "family support", "routine fatigue"],
    ["Cutoff Budget Rules", "Emergency Fund", "Stress-Spending Replacement", "Savings Automation"],
    "Tell CLARA what usually breaks your routine spending plan."
  ),

  "Freelance Season": stage(
    "Flexible income season",
    "Income timing, client flow, and buffers matter more than perfect planning.",
    "Freelance Season brings flexibility, but income timing, client delays, and self-management make financial structure essential.",
    {
      setup: ["Client-based", "Project-based", "Side hustle", "Full freelance", "Commission-based"],
      rhythm: ["Income is irregular", "Monthly clients", "Seasonal work", "Growing slowly", "Feast/famine cycle"],
      workload: ["Flexible but manageable", "Busy client season", "Overworked and unclear", "No rest structure"],
      pressure: ["Income variability", "Client delays", "Burnout risk", "Uncertain months", "Personal/business mixing"],
      coping: [
        "I spend after big payments",
        "I underprice my work",
        "I avoid planning dry months",
        "I overwork when anxious",
        "I separate my money",
      ],
      goal: ["Build buffer", "Stabilize income", "Separate wallets", "Grow clients", "Prepare for dry months"],
    },
    [
      card("pressure", "Income Variability", 83, "Income timing can move while expenses stay fixed."),
      card("stability", "Cash-Flow Stability", 45, "Cash flow needs buffers because work and payments may not arrive evenly."),
      card("energy", "Creative Burnout", 67, "Freedom can still become exhausting when work, rest, and income blur."),
      card("growth", "Freedom Potential", 80, "A good system can turn flexible work into long-term independence."),
    ],
    ["cash-flow gaps", "client delays", "overwork", "personal-business mixing", "uncertain months"],
    ["Cash Buffer", "Separate Wallets", "Client Pipeline", "Rest Planning"],
    "Tell CLARA what makes freelance income feel unstable or stressful lately."
  ),

  "Business Builder": stage(
    "Building season",
    "Personal money, operating needs, reinvestment, and pressure can easily mix.",
    "Business Builders carry growth pressure, reinvestment decisions, unstable profits, and blurred boundaries between personal and business money.",
    {
      setup: ["Just starting", "Growing already", "Side business", "Main income", "Rebuilding business"],
      rhythm: ["Reinvesting", "Sales not steady", "Monthly cycle", "Scaling up", "Cash flow swings"],
      workload: ["Manageable build", "Long operating hours", "Decision overload", "Founder burnout"],
      pressure: ["Reinvestment pressure", "Inventory pressure", "Operating costs", "Personal/business mix", "Sales uncertainty"],
      coping: [
        "I reinvest too quickly",
        "I mix personal and business money",
        "I spend when sales are good",
        "I delay paying myself",
        "I track business costs",
      ],
      goal: ["Separate money", "Build runway", "Control spending", "Grow sustainably", "Pay myself properly"],
    },
    [
      card("pressure", "Reinvestment Pressure", 76, "Growth often competes with personal needs and short-term comfort."),
      card("stability", "Business Stability", 52, "Sales, costs, and cash flow need clearer separation from personal life."),
      card("energy", "Decision Overload", 79, "Many business decisions can create mental fatigue and risky shortcuts."),
      card("growth", "Scale Potential", 84, "With structure, this stage can create long-term financial upside."),
    ],
    ["capital pressure", "inventory costs", "sales instability", "money mixing", "over-reinvestment"],
    ["Separate Wallets", "Runway Fund", "Operating Budget", "Slow Growth Plan"],
    "Tell CLARA where business money and personal money feel mixed right now."
  ),
};

export function getStageDefinition(stageName) {
  const normalized = normalizeLifeStage(stageName);
  return LIFE_STAGE_INTELLIGENCE[normalized] || LIFE_STAGE_INTELLIGENCE[DEFAULT_STAGE.stage];
}
