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
  setup: "Early-career employee",
  rhythm: "Still learning budget rhythm",
  workload: "Busy but stable",
  pressure: "Living costs",
  coping: "I reward myself after work",
  goal: "Build stable habits",
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
      setup: ["First job", "Early-career employee", "Career shifting", "Living independently", "Building side income"],
      rhythm: ["Monthly salary", "Twice-a-month cutoff", "Income still changing", "Salary + side income", "Still learning budget rhythm"],
      workload: ["Manageable routine", "Busy but stable", "Long draining days", "Burnout season"],
      pressure: ["Living costs", "Lifestyle pressure", "Family contribution", "Debt or credit pressure", "Low savings buffer"],
      coping: [
        "I reward myself after work",
        "I avoid checking expenses",
        "I use credit or pay later",
        "I overspend socially",
        "I over-restrict myself",
      ],
      goal: ["Build stable habits", "Emergency fund first", "Control lifestyle creep", "Pay down debt", "Save before spending"],
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
        "Time and energy pressure",
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
      setup: ["Newly living together", "Long-term live-in", "Living with one family", "Planning to move in", "One income supports both"],
      rhythm: ["Shared bills monthly", "Split expenses unevenly", "Mostly stable incomes", "Income mismatch", "Still learning shared rhythm"],
      workload: ["Calm and cooperative", "Adjusting roles", "Money talks feel sensitive", "Constant tension over decisions"],
      pressure: ["Rent and bills", "Uneven contribution", "Future planning", "Family boundaries", "Money communication"],
      coping: [
        "We avoid money talks",
        "We spend for comfort together",
        "One partner covers gaps",
        "We argue then ignore it",
        "We plan and review together",
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
      setup: ["Living with parents", "Supporting siblings", "Shared household", "Main contributor at home", "Multi-family home"],
      rhythm: ["Fixed contribution", "Requests are unpredictable", "Shared food and bills", "Income shared with family", "Seasonal family needs"],
      workload: ["Manageable contribution", "Often interrupted", "Emotionally draining", "Everyone depends on me", "Boundary conflict"],
      pressure: ["Food and bills", "Family requests", "Education or medical support", "Personal boundaries", "Emergency help"],
      coping: [
        "I give even when tight",
        "I hide my money stress",
        "I delay my own needs",
        "I borrow for family needs",
        "I set limits clearly",
      ],
      goal: ["Contribute wisely", "Build personal buffer", "Set family boundaries", "Protect essentials", "Reduce rescue spending"],
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
      setup: ["One child", "Multiple young children", "School-age child", "Co-parenting support", "Solo without steady support"],
      rhythm: ["Stable income and routine", "Childcare changes", "School expense cycles", "Support comes irregularly", "Unpredictable days"],
      workload: ["Manageable care load", "Always busy", "Emotionally exhausted", "Survival parenting mode"],
      pressure: ["Daily needs", "School or childcare costs", "Emergency or health costs", "Time pressure", "Debt or borrowed money"],
      coping: [
        "I sacrifice my own needs",
        "I borrow when urgent",
        "I buy comfort for my child",
        "I avoid checking money",
        "I ask for support",
      ],
      goal: ["Protect essentials", "Emergency fund first", "Reduce debt", "Stabilize routine", "Secure my child’s future"],
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
      setup: ["Office or corporate work", "BPO or shift work", "Remote worker", "Field or service work", "Supporting family"],
      rhythm: ["Monthly salary", "Twice-a-month cutoff", "Stable salary", "Overtime-dependent", "Salary + side income"],
      workload: ["Manageable workload", "Long work hours", "Shift fatigue", "Routine burnout cycle"],
      pressure: ["Cutoff dependency", "Family support", "Lifestyle pressure", "Debt or credit pressure", "Stress spending"],
      coping: [
        "I reward myself after payday",
        "I use convenience spending",
        "I support family first",
        "I ignore the budget when stressed",
        "I delay self-care",
      ],
      goal: ["Save consistently", "Emergency fund first", "Control payday spending", "Reduce debt", "Build discipline"],
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
      setup: ["Full-time freelancer", "Side hustle", "Project-based work", "Commission-based work", "Starting freelance"],
      rhythm: ["Recurring clients", "Project waves", "Feast/famine cycle", "Delayed payments", "Growing slowly"],
      workload: ["Flexible but manageable", "Busy client season", "Overworked and unclear", "No rest structure"],
      pressure: ["Income variability", "Client delays", "Dry month risk", "Underpricing pressure", "Personal/business mixing"],
      coping: [
        "I spend after big payments",
        "I underprice to keep clients",
        "I avoid planning dry months",
        "I overwork when anxious",
        "I separate my money",
      ],
      goal: ["Build cash buffer", "Stabilize income", "Separate wallets", "Prepare for dry months", "Grow client pipeline"],
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
      setup: ["Just starting", "Side business", "Main income business", "Growing already", "Rebuilding or pivoting"],
      rhythm: ["Sales not steady", "Monthly business cycle", "Reinvesting heavily", "Cash flow swings", "Scaling up"],
      workload: ["Manageable build", "Long operating hours", "Decision overload", "Founder burnout"],
      pressure: ["Operating costs", "Inventory or capital pressure", "Personal/business mix", "Sales uncertainty", "Reinvestment pressure"],
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
