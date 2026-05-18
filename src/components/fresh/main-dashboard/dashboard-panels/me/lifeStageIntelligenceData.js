export const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

export const STAGES = [
  "Young Professional",
  "Working Student",
  "Single Parent",
  "Breadwinner",
  "Living with Partner",
  "Freelance Season",
  "Fresh Graduate",
  "OFW Family",
  "Unemployed Adult",
  "First-Time Parent",
  "Family Household",
  "Business Builder",
  "Full-Time Earner",
];

export const DEFAULT_STAGE = {
  stage: "Young Professional",
  setup: "Early career",
  rhythm: "Learning rhythm",
  pressure: "Comfort spending",
  goal: "Build habits",
};

function stage(title, caption, overview, fields, indicators, struggles, recommendations, talkPrompt) {
  return { identity: { title, caption, overview }, fields, indicators, struggles, recommendations, talkPrompt };
}

export const LIFE_STAGE_INTELLIGENCE = {
  "Young Professional": stage(
    "Building independence",
    "Building independence while facing rising living costs and unstable growth opportunities.",
    "Young Professionals in the Philippines often face rising essentials, lifestyle pressure, and the emotional pull of finally earning their own money.",
    {
      setup: ["First job", "Early career", "Exploring income", "Building independence"],
      rhythm: ["Stable salary", "Cutoff cycle", "Income still changing", "Learning rhythm"],
      pressure: ["Peer pressure", "Comfort spending", "New responsibilities", "Low buffer"],
      goal: ["Build habits", "Emergency fund first", "Reduce impulse buys", "Save first"],
    },
    [
      { label: "Living pressure", value: 72, note: "Essentials and lifestyle costs compete with early savings." },
      { label: "Savings readiness", value: 41, note: "Savings can feel difficult while independence and self-reward are still forming." },
      { label: "Career stability", value: 58, note: "Early career momentum is building but still needs structure." },
    ],
    ["lifestyle inflation", "installment temptation", "food delivery habits", "peer pressure spending", "unstable savings rhythm"],
    ["Emergency Fund", "Expense Awareness", "Skill Growth", "Debt Avoidance"],
    "Talk about what feels hardest now that you’re building your professional life."
  ),
  "Young Earner": stage(
    "Building independence",
    "Building independence while facing rising living costs and unstable growth opportunities.",
    "Young Professionals in the Philippines often face rising essentials, lifestyle pressure, and the emotional pull of finally earning their own money.",
    {
      setup: ["First job", "Early career", "Exploring income", "Building independence"],
      rhythm: ["Stable salary", "Cutoff cycle", "Income still changing", "Learning rhythm"],
      pressure: ["Peer pressure", "Comfort spending", "New responsibilities", "Low buffer"],
      goal: ["Build habits", "Emergency fund first", "Reduce impulse buys", "Save first"],
    },
    [
      { label: "Living pressure", value: 72, note: "Essentials and lifestyle costs compete with early savings." },
      { label: "Savings readiness", value: 41, note: "Savings can feel difficult while independence and self-reward are still forming." },
      { label: "Career stability", value: 58, note: "Early career momentum is building but still needs structure." },
    ],
    ["lifestyle inflation", "installment temptation", "food delivery habits", "peer pressure spending", "unstable savings rhythm"],
    ["Emergency Fund", "Expense Awareness", "Skill Growth", "Debt Avoidance"],
    "Talk about what feels hardest now that you’re building your professional life."
  ),
  "Working Student": stage(
    "Stretched season",
    "Time, school, work, energy, and money all compete for attention.",
    "Working Students often carry schedule pressure, transport costs, school demands, and fatigue-driven spending.",
    {
      setup: ["Mostly school", "Mostly work", "Trying to balance", "Schedule keeps changing"],
      rhythm: ["Allowance + work", "Part-time only", "Income is irregular", "Seasonal income"],
      pressure: ["School costs", "Transport pressure", "Burnout risk", "Family expectations"],
      goal: ["Graduate safely", "Save slowly", "Avoid debt", "Help family"],
    },
    [
      { label: "Time pressure", value: 78, note: "Limited time increases convenience spending." },
      { label: "Transport burden", value: 66, note: "Daily mobility can quietly drain flexible money." },
      { label: "Burnout spending", value: 71, note: "Tiredness can make reward spending feel necessary." },
    ],
    ["transport costs", "tuition pressure", "burnout spending", "irregular income", "time management"],
    ["Weekly Spending Cap", "Transport Buffer", "Study-Work Recovery", "Avoid Debt"],
    "Tell CLARA what feels heavier right now: school, work, money, or energy."
  ),
  "Single Parent": stage(
    "Protective season",
    "Essentials, stability, emotional energy, and safety need careful protection.",
    "Single Parents often carry essential expenses, childcare pressure, emergency vulnerability, and emotional exhaustion.",
    {
      setup: ["One child", "Two children", "Three or more", "Co-parenting setup"],
      rhythm: ["Stable routine", "Childcare changes", "School-heavy season", "Unpredictable days"],
      pressure: ["Daily needs", "School expenses", "Emergency risk", "Time pressure"],
      goal: ["Protect essentials", "Emergency fund first", "Reduce debt", "Stable routine"],
    },
    [
      { label: "Essential load", value: 84, note: "Needs often leave little room for mistakes." },
      { label: "Emergency risk", value: 79, note: "Unexpected costs can disrupt the whole month." },
      { label: "Energy pressure", value: 76, note: "Fatigue can affect spending and planning capacity." },
    ],
    ["childcare burden", "education costs", "emergency instability", "burnout spending", "time pressure"],
    ["Stability First", "Emergency Buffer", "Insurance Awareness", "Child Education Planning"],
    "Tell CLARA what currently feels hardest to protect for you and your child."
  ),
  "Breadwinner": stage(
    "Support season",
    "Money decisions often carry family weight, timing pressure, and emotional responsibility.",
    "Breadwinners often balance personal goals with family support, emergency requests, and guilt-driven decisions.",
    {
      setup: ["Supporting parents", "Supporting siblings", "Whole household", "Shared obligations"],
      rhythm: ["Mostly stable", "Requests vary", "Changing lately", "Hard to predict"],
      pressure: ["Support pressure", "Guilt pressure", "Heavy lately", "Emergency requests"],
      goal: ["Protect myself too", "Build safety", "Support wisely", "Reduce pressure"],
    },
    [
      { label: "Support pressure", value: 82, note: "Family needs can override personal financial plans." },
      { label: "Boundary difficulty", value: 77, note: "Emotional responsibility makes saying no difficult." },
      { label: "Savings delay", value: 73, note: "Personal goals are often postponed for urgent support." },
    ],
    ["family obligations", "guilt spending", "emergency requests", "delayed personal savings", "support fatigue"],
    ["Support Boundaries", "Emergency Buffer", "Personal Safety Fund", "Planned Giving"],
    "Talk to CLARA about helping others while protecting yourself too."
  ),
  "Living with Partner": stage(
    "Shared-life season",
    "Routines, emotions, and future plans are starting to shape financial decisions.",
    "People living with a partner often face shared routines, emotional spending, future planning, and quiet expectations around money.",
    {
      setup: ["Just us together", "With my family", "With partner’s family", "Still moving around"],
      rhythm: ["Mostly stable", "Still finding rhythm", "This is new", "Temporary for now"],
      pressure: ["Managing okay", "Some pressure", "Heavy lately", "Emotionally sensitive"],
      goal: ["Build savings together", "Emergency fund first", "Plan our future", "Stability first"],
    },
    [
      { label: "Shared routine", value: 70, note: "Daily routines can change how spending feels normal." },
      { label: "Future pressure", value: 64, note: "Planning together can make money feel more emotional." },
      { label: "Communication need", value: 72, note: "Unspoken expectations can create financial tension." },
    ],
    ["shared expenses", "future planning pressure", "comfort spending together", "money communication", "routine changes"],
    ["Shared Money Rules", "Emergency Fund", "Future Planning", "Spending Communication"],
    "Tell CLARA what feels unclear or emotional about money in your shared-life setup."
  ),
  "Freelance Season": stage(
    "Flexible income season",
    "Income timing, client flow, and buffers matter more than perfect planning.",
    "Freelancers often face irregular income, delayed payments, and pressure to separate personal money from work money.",
    {
      setup: ["Client-based", "Project-based", "Side hustle", "Full freelance"],
      rhythm: ["Income is irregular", "Monthly clients", "Seasonal work", "Growing slowly"],
      pressure: ["Cash-flow gaps", "Client delays", "Burnout risk", "Uncertain months"],
      goal: ["Build buffer", "Stabilize income", "Separate wallets", "Grow clients"],
    },
    [
      { label: "Income variability", value: 83, note: "Income timing can move while expenses stay fixed." },
      { label: "Buffer need", value: 80, note: "Cash reserves protect low-income weeks." },
      { label: "Burnout risk", value: 67, note: "Work pressure can trigger reward spending." },
    ],
    ["cash-flow gaps", "client delays", "overwork", "personal-business mixing", "uncertain months"],
    ["Cash Buffer", "Separate Wallets", "Client Pipeline", "Rest Planning"],
    "Tell CLARA what makes freelance income feel unstable or stressful lately."
  ),
  "Fresh Graduate": stage(
    "Starting line season",
    "New income, career pressure, and independence begin forming long-term habits.",
    "Fresh Graduates often deal with job uncertainty, first-salary pressure, family expectations, and identity spending.",
    {
      setup: ["Job hunting", "First job", "Probationary", "Still exploring"],
      rhythm: ["No steady income yet", "New salary", "Changing schedule", "Learning routine"],
      pressure: ["Career pressure", "Family expectation", "Low buffer", "Self-reward spending"],
      goal: ["Find stability", "Build habits", "Save first", "Avoid debt"],
    },
    [
      { label: "Career pressure", value: 75, note: "Early career uncertainty affects money confidence." },
      { label: "Self-reward pull", value: 70, note: "First income can increase identity spending." },
      { label: "Stability need", value: 76, note: "Small systems matter before income grows." },
    ],
    ["job uncertainty", "first-salary spending", "family expectations", "low savings", "career anxiety"],
    ["Simple Budget Rhythm", "Emergency Starter Fund", "Skill Growth", "Avoid Installments"],
    "Tell CLARA what feels most uncertain after graduation."
  ),
  "OFW Family": stage(
    "Remittance season",
    "Money support crosses distance, family needs, and long-term sacrifice.",
    "OFW Families often face remittance dependency, family expectations, distance pressure, and long-term planning gaps.",
    {
      setup: ["Receiving remittance", "Sending remittance", "Shared family support", "Irregular remittance"],
      rhythm: ["Monthly support", "Irregular support", "Emergency-based", "Changing lately"],
      pressure: ["Family requests", "Distance guilt", "Emergency needs", "Savings delay"],
      goal: ["Use remittance wisely", "Build safety", "Reduce dependency", "Plan long-term"],
    },
    [
      { label: "Dependency risk", value: 78, note: "Support can become expected instead of planned." },
      { label: "Emergency requests", value: 73, note: "Distance can intensify urgent financial decisions." },
      { label: "Planning gap", value: 69, note: "Long-term goals need structure beyond remittance cycles." },
    ],
    ["remittance dependency", "family requests", "distance guilt", "savings delay", "unplanned emergencies"],
    ["Remittance Rules", "Family Budget Plan", "Emergency Fund", "Long-Term Goal Map"],
    "Talk to CLARA about the pressure around remittance and family expectations."
  ),
  "Unemployed Adult": stage(
    "Recovery season",
    "Income uncertainty, emotional pressure, and survival planning need extra gentleness.",
    "Unemployed Adults often carry uncertainty, shame pressure, survival anxiety, and dependency stress.",
    {
      setup: ["Job searching", "Resting/recovering", "Between jobs", "Dependent for now"],
      rhythm: ["No income yet", "Occasional income", "Family support", "Changing lately"],
      pressure: ["Survival pressure", "Emotional pressure", "Debt pressure", "Family expectations"],
      goal: ["Stabilize first", "Find income", "Reduce pressure", "Protect basics"],
    },
    [
      { label: "Survival pressure", value: 86, note: "Uncertain income makes every decision feel heavier." },
      { label: "Emotional load", value: 81, note: "Shame and pressure can affect spending and motivation." },
      { label: "Recovery need", value: 78, note: "Small stability steps matter before strict budgeting." },
    ],
    ["survival anxiety", "dependency stress", "debt pressure", "motivation loss", "emotional spending"],
    ["Protect Essentials", "Income Recovery Plan", "Debt Calm-Down", "Daily Stability Routine"],
    "Tell CLARA what feels most urgent while you’re trying to stabilize again."
  ),
  "First-Time Parent": stage(
    "New family season",
    "Care, protection, expenses, and identity shift all arrive at once.",
    "First-Time Parents often face baby costs, anxiety spending, emergency planning, and new household pressure.",
    {
      setup: ["Pregnancy stage", "Newborn stage", "Toddler stage", "Adjusting household"],
      rhythm: ["New routine", "Still adjusting", "Unpredictable days", "Mostly stable"],
      pressure: ["Baby expenses", "Emergency risk", "Anxiety spending", "Time pressure"],
      goal: ["Protect essentials", "Emergency fund first", "Baby needs plan", "Family stability"],
    },
    [
      { label: "New expense load", value: 82, note: "Baby-related needs can quickly change monthly spending." },
      { label: "Anxiety spending", value: 70, note: "Care pressure can make every purchase feel necessary." },
      { label: "Safety priority", value: 84, note: "Emergency planning becomes more important." },
    ],
    ["baby expenses", "anxiety spending", "sleep pressure", "emergency planning", "new household routine"],
    ["Baby Essentials Plan", "Emergency Fund", "Insurance Awareness", "Routine Stability"],
    "Tell CLARA what feels most overwhelming in this new family season."
  ),
  "Family Household": stage(
    "Home-centered season",
    "Family setup, household rhythm, and daily environment influence money behavior.",
    "Family Household life often shapes spending through shared routines, food costs, support expectations, and emotional home pressure.",
    {
      setup: ["With parents", "With siblings", "Whole family", "Shared home"],
      rhythm: ["Stable home", "Home is changing", "Shared routine", "Busy household"],
      pressure: ["Managing okay", "Some pressure", "Heavy lately", "Support pressure"],
      goal: ["Contribute wisely", "Build safety", "Reduce stress spending", "Personal stability"],
    },
    [
      { label: "Household influence", value: 74, note: "Home routines affect daily spending choices." },
      { label: "Shared pressure", value: 67, note: "Family needs can affect personal financial boundaries." },
      { label: "Stability need", value: 70, note: "Clear routines help reduce random spending." },
    ],
    ["shared food costs", "family requests", "personal boundaries", "stress spending", "routine pressure"],
    ["Household Budget Awareness", "Personal Safety Fund", "Boundary Planning", "Routine Spending Rules"],
    "Tell CLARA how your home setup affects your spending lately."
  ),
  "Business Builder": stage(
    "Building season",
    "Personal money, operating needs, reinvestment, and pressure can easily mix.",
    "Business Builders often face capital pressure, irregular sales, reinvestment decisions, and blurred personal/business money.",
    {
      setup: ["Just starting", "Growing already", "Side business", "Main income"],
      rhythm: ["Reinvesting", "Sales not steady", "Monthly cycle", "Scaling up"],
      pressure: ["Capital pressure", "Inventory pressure", "Operating costs", "Personal/business mix"],
      goal: ["Separate money", "Build runway", "Control spending", "Grow sustainably"],
    },
    [
      { label: "Capital pressure", value: 76, note: "Growth often competes with personal needs." },
      { label: "Money mixing", value: 79, note: "Business and personal wallets need separation." },
      { label: "Runway need", value: 73, note: "Sustainability matters more than fast spending." },
    ],
    ["capital pressure", "inventory costs", "sales instability", "money mixing", "over-reinvestment"],
    ["Separate Wallets", "Runway Fund", "Operating Budget", "Slow Growth Plan"],
    "Tell CLARA where business money and personal money feel mixed right now."
  ),
  "Full-Time Earner": stage(
    "Routine earning season",
    "Consistency, stress recovery, and lifestyle creep become the quiet patterns to watch.",
    "Full-Time Earners often have predictable income but still face lifestyle creep, stress spending, and routine fatigue.",
    {
      setup: ["Corporate", "BPO/call center", "Office work", "Remote work"],
      rhythm: ["Every cutoff", "Monthly salary", "Stable salary", "Shift-based"],
      pressure: ["Lifestyle creep", "Stress spending", "Family support", "Routine fatigue"],
      goal: ["Save consistently", "Emergency fund first", "Reduce random spending", "Build discipline"],
    },
    [
      { label: "Routine pressure", value: 63, note: "Predictable work can still create fatigue spending." },
      { label: "Lifestyle creep", value: 70, note: "Stable income can make upgrades feel harmless." },
      { label: "Savings opportunity", value: 72, note: "Cutoff rhythm can support strong habits." },
    ],
    ["lifestyle creep", "stress spending", "cutoff dependency", "family support", "routine fatigue"],
    ["Cutoff Budget Rules", "Emergency Fund", "Stress-Spending Replacement", "Savings Automation"],
    "Tell CLARA what usually breaks your routine spending plan."
  ),
};

export function getStageDefinition(stageName) {
  return LIFE_STAGE_INTELLIGENCE[stageName] || LIFE_STAGE_INTELLIGENCE[DEFAULT_STAGE.stage];
}
