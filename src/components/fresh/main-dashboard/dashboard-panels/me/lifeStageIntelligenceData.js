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

function readSavedLifeStageProfile() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
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

  return mapped.map(({ remainder, ...item }) => item);
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
    "Working Students are balancing education, income, survival, and future-building while time scarcity and uneven money rhythm shape daily decisions.",
    {
      setup: ["Family-supported with some work", "Self-supporting student", "Working mainly for school costs", "Helping family while studying", "Side hustle / extra-income student"],
      rhythm: ["Allowance + work income", "Fixed part-time pay", "Irregular side hustle income", "Project / seasonal income", "Mostly allowance with occasional work"],
      workload: ["Manageable class-work load", "Tight but still controlled", "Heavy school-work overlap", "Little time to rest", "Almost no margin / survival mode"],
      pressure: ["Tuition or school costs", "Daily food and transport", "Work-school schedule conflict", "Family contribution", "Debt or borrowed money"],
      coping: ["I spend on small rewards to feel okay", "I avoid checking my money", "I borrow or delay payments", "I cut my needs too much", "I ask for help before it gets worse"],
      goal: ["Finish school without burning out", "Avoid debt", "Build savings slowly", "Help family without losing stability", "Control stress spending"],
    },
    [
      card("energy", "Burnout Risk", 78, "School, work, commute, money, and recovery pressure can drain energy fast."),
      card("pressure", "Financial Pressure", 72, "Tuition, daily costs, irregular income, and responsibility can tighten the whole month."),
      card("stability", "Emotional Spending Risk", 62, "Small rewards can become a coping pattern when rest and control feel limited."),
      card("growth", "Future Potential", 84, "Balancing school and work can build resilience, discipline, and future earning power."),
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
    caption: "School costs, transport, meals, and work hours are competing for the same limited income. CLARA should protect basics before strict saving.",
    overview: "This Working Student profile shows survival-budget pressure. The main risk is not careless spending; it is repeated essential costs arriving faster than income, rest, and planning energy can recover.",
    indicators: [
      card("energy", "Recovery Gap", 88, "Influence share: low recovery time can shape spending through skipped meals, late-night convenience food, transport shortcuts, and delayed tracking."),
      card("pressure", "Essential-Cost Load", 84, "Influence share: fixed school needs and repeated costs like commute, food, mobile data, and school materials can squeeze the week."),
      card("stability", "Cash Buffer Risk", 66, "Influence share: a tight week becomes risky when there is no small buffer for sudden projects, fare changes, food gaps, or emergency school payments."),
      card("growth", "Stability Potential", 81, "Influence share: essentials protection, school-money separation, and realistic weekly caps can stabilize this pattern."),
    ],
    struggles: ["tuition timing", "commute and meals", "school project spikes", "low recovery", "small cash gaps"],
    recommendations: ["Weekly essentials cap", "Transport buffer", "School-cost wallet", "Meal protection", "Micro-emergency fund"],
  },
  familyLinked: {
    title: "Family-linked responsibility",
    caption: "Your money decisions are connected to home support. Family contribution, school needs, food, and transport can compete, so budgeting needs boundaries instead of guilt.",
    overview: "This Working Student profile shows shared-responsibility pressure. Helping family may be meaningful, but CLARA should help define limits so school stability and daily essentials do not collapse quietly.",
    indicators: [
      card("energy", "Responsibility Load", 84, "Influence share: family-linked responsibility can shape fatigue because the student role and support role use the same income and energy."),
      card("pressure", "Shared-Money Pressure", 86, "Influence share: family help becomes heavier when requests overlap with tuition timing, school projects, transport, or personal essentials."),
      card("stability", "Boundary Risk", 63, "Influence share: helping without a clear weekly limit can weaken school stability and daily needs."),
      card("growth", "Support Balance", 82, "Influence share: a fixed family-support rule can protect both family care and the student's own essentials."),
    ],
    struggles: ["family contribution", "guilt spending", "shared pressure", "school-cost conflict", "weak personal buffer"],
    recommendations: ["Family support limit", "Essentials-first rule", "School wallet", "Personal safety buffer", "Support without guilt"],
  },
  highFatigue: {
    title: "High-fatigue schedule",
    caption: "School and work appear to be overlapping heavily. Commute, deadlines, and irregular meals can push convenience spending because time, not only money, is limited.",
    overview: "This Working Student profile shows schedule-cost pressure. When time is scarce, spending often shifts toward shortcuts: food outside, rush transport, forgotten tracking, and small comfort purchases.",
    indicators: [
      card("energy", "Fatigue Load", 90, "Influence share: fatigue can shape money behavior through late tracking, missed meals, rushed transport, comfort buys, and low review energy."),
      card("pressure", "Schedule-Cost Pressure", 76, "Influence share: class, work, commute, and deadlines can create food, fare, printing, load/data, and convenience costs."),
      card("stability", "Convenience Spend Risk", 70, "Influence share: convenience spending grows when the schedule removes time for cheaper meals, planned transport, or calm decisions."),
      card("growth", "Recovery Potential", 78, "Influence share: recovery rules, meal planning, and transport buffers can reduce pressure without strict restriction."),
    ],
    struggles: ["commute fatigue", "missed meals", "convenience spending", "late tracking", "work-school overlap"],
    recommendations: ["Recovery budget", "Meal plan shortcut", "Commute buffer", "Low-energy tracking", "Rest protection"],
  },
  delayedPayment: {
    title: "Delayed-payment cycle",
    caption: "Money pressure may already be moving from one week into the next. Borrowing, delayed payments, or tuition timing can make the month feel like repair mode.",
    overview: "This Working Student profile shows stacked-pressure risk. CLARA should prioritize repayment rhythm, no-new-debt boundaries, and a small emergency fare/food buffer before flexible spending.",
    indicators: [
      card("energy", "Debt Stress Load", 82, "Influence share: borrowed money can shape confidence, expense checking, and decision-making because old pressure stays active."),
      card("pressure", "Repayment Pressure", 88, "Influence share: repayment timing should be protected before rewards, flexible spending, or non-urgent school extras."),
      card("stability", "Cash-Flow Stability", 58, "Influence share: cash flow becomes unstable when income timing does not match tuition, commute, food, and repayment deadlines."),
      card("growth", "Recovery Potential", 74, "Influence share: no-new-debt rules, repayment rhythm, and a small fare/food buffer can gradually return control."),
    ],
    struggles: ["borrowed money", "delayed payments", "cash-flow mismatch", "repayment pressure", "survival gaps"],
    recommendations: ["No-new-debt rule", "Repayment rhythm", "Emergency fare buffer", "Debt-first sorting", "Payment calendar"],
  },
  recoverySpending: {
    title: "Recovery-spending rhythm",
    caption: "Your spending may be recovery-driven. After school, work, commute, and pressure, small food, drink, or digital purchases can become quick relief.",
    overview: "This Working Student profile shows reward-frequency risk. The issue is usually not one purchase; it is repeated small relief spending when rest, meals, and emotional recovery are missing.",
    indicators: [
      card("energy", "Emotional Fatigue", 80, "Influence share: relief spending often rises after long class-work days, commute fatigue, irregular meals, or repeated academic pressure."),
      card("pressure", "Daily Pressure", 73, "Influence share: repeated small demands like food, fare, mobile data, school materials, group needs, and time pressure can build up quietly."),
      card("stability", "Reward Frequency Risk", 78, "Influence share: small rewards become risky when they repeat often enough to drain the month."),
      card("growth", "Reward Control", 80, "Influence share: a planned reward limit protects emotional relief without letting stress control the wallet."),
    ],
    struggles: ["small reward spending", "irregular meals", "digital micro-spending", "stress recovery", "comfort purchases"],
    recommendations: ["Reward limit", "Low-cost recovery list", "Meal protection", "Spending pause", "Weekly leak review"],
  },
  selfFunded: {
    title: "Self-funded student builder",
    caption: "You are carrying more of school and daily life yourself. Income timing, tuition needs, transport, meals, and emergency margin need clear protection.",
    overview: "This Working Student profile shows independence-load pressure. The user may be disciplined, but the system should avoid unrealistic saving pressure and focus on stable essentials first.",
    indicators: [
      card("energy", "Independence Load", 79, "Influence share: carrying personal costs while studying can raise fatigue when school deadlines and income timing collide."),
      card("pressure", "Essential Pressure", 82, "Influence share: tuition, commute, meals, mobile data, and school materials are harder to safely delay."),
      card("stability", "Buffer Stability", 58, "Influence share: one missed side-income payment or extra school cost can affect the whole week when the buffer is small."),
      card("growth", "Discipline Potential", 86, "Influence share: realistic caps can turn self-funding pressure into disciplined stability."),
    ],
    struggles: ["self-supporting costs", "income timing", "tuition pressure", "small buffer", "essential expenses"],
    recommendations: ["Essentials-first plan", "School wallet", "Income timing map", "Minimum buffer", "Realistic saving rule"],
  },
  stableStretched: {
    title: "Stable but stretched",
    caption: "Your setup still has room for control, but the week is already stretched. This is the best time to build caps for food, fare, load/data, and small rewards.",
    overview: "This Working Student profile is not yet in crisis, but small leaks can grow when school and work get heavier. CLARA should build rhythm early.",
    indicators: [
      card("energy", "Fatigue Watch", 70, "Influence share: pressure is present, but weekly limits and recovery planning can prevent deeper fatigue."),
      card("pressure", "Cost Pressure", 64, "Influence share: transport, food, data, and school materials may already need clearer planning."),
      card("stability", "Routine Stability", 52, "Influence share: the routine is still forming, so a simple weekly rhythm matters before pressure increases."),
      card("growth", "Future Potential", 88, "Influence share: ambition plus protected essentials can make this a strong building season."),
    ],
    struggles: ["early fatigue", "small leaks", "routine building", "weekly caps", "school-work rhythm"],
    recommendations: ["Weekly cap", "Fare and food limit", "Simple tracker", "Small reward rule", "Savings slowly"],
  },
  developingRhythm: {
    title: "Developing money rhythm",
    caption: "You are learning, earning, adjusting, and building direction with limited margin. CLARA should watch repeated costs before they become monthly leaks.",
    overview: "This Working Student profile shows a developing rhythm. The priority is to notice repeated micro-spending while protecting school, transport, meals, and energy.",
    indicators: [
      card("energy", "Burnout Watch", 76, "Influence share: school, work, commute, and future pressure draw from the same energy source."),
      card("pressure", "Financial Pressure", 69, "Influence share: repeated small expenses matter when income is limited, even if no single week feels extreme."),
      card("stability", "Micro-Spend Risk", 60, "Influence share: food, transport, mobile data, digital, or social spending can become hidden monthly patterns."),
      card("growth", "Future Potential", 86, "Influence share: effort, sacrifice, and future orientation can become long-term stability when guided well."),
    ],
    struggles: ["micro-spending", "limited margin", "school costs", "commute and food", "social pressure"],
    recommendations: ["Micro-spend review", "Weekly essentials", "Transport buffer", "Basic savings rhythm", "Energy-aware budgeting"],
  },
};

function getWorkingStudentSnapshot() {
  const saved = readSavedLifeStageProfile();
  const setup = clean(saved.setup);
  const rhythm = clean(saved.rhythm);
  const workload = clean(saved.workload);
  const pressure = clean(saved.pressure);
  const coping = clean(saved.coping);
  const goal = clean(saved.goal);

  const familyScore = (hasAny(setup, ["helping family"]) ? 2 : 0) + (hasAny(pressure, ["family contribution"]) ? 2 : 0) + (hasAny(goal, ["help family"]) ? 2 : 0);
  const debtScore = (hasAny(pressure, ["debt", "borrowed"]) ? 2 : 0) + (hasAny(coping, ["borrow", "delay payments"]) ? 2 : 0) + (hasAny(goal, ["avoid debt"]) ? 1 : 0);
  const survivalScore = (hasAny(setup, ["self-supporting", "school costs"]) ? 2 : 0) + (hasAny(rhythm, ["irregular", "project", "seasonal"]) ? 1 : 0) + (hasAny(workload, ["almost no margin", "survival", "little time to rest"]) ? 2 : 0) + (hasAny(pressure, ["daily food", "transport", "debt", "borrowed"]) ? 1 : 0) + (hasAny(coping, ["cut my needs", "borrow", "avoid checking"]) ? 1 : 0);
  const burnoutScore = (hasAny(workload, ["heavy", "little time", "almost no margin", "survival"]) ? 2 : 0) + (hasAny(pressure, ["schedule conflict", "work-school"]) ? 2 : 0) + (hasAny(goal, ["burning out"]) ? 1 : 0);
  const rewardScore = (hasAny(coping, ["small rewards", "feel okay"]) ? 2 : 0) + (hasAny(goal, ["stress spending"]) ? 2 : 0);
  const stableScore = (hasAny(workload, ["manageable", "tight but still controlled"]) ? 1 : 0) + (hasAny(rhythm, ["fixed", "allowance + work", "mostly allowance"]) ? 1 : 0) + (hasAny(coping, ["ask for help"]) ? 1 : 0) + (hasAny(goal, ["build savings", "finish school"]) ? 1 : 0);

  let key = "developingRhythm";
  if (debtScore >= 3) key = "delayedPayment";
  else if (familyScore >= 4) key = "familyLinked";
  else if (survivalScore >= 5) key = "essentialCost";
  else if (burnoutScore >= 4) key = "highFatigue";
  else if (rewardScore >= 2) key = "recoverySpending";
  else if (hasAny(setup, ["self-supporting", "school costs"])) key = "selfFunded";
  else if (stableScore >= 3) key = "stableStretched";

  const snapshot = WORKING_STUDENT_SNAPSHOTS[key] || WORKING_STUDENT_SNAPSHOTS.developingRhythm;
  const signalStrength = snapshot.indicators.map((item) => {
    let value = item.value;
    if (item.category === "energy") value += burnoutScore + Math.max(0, survivalScore - 3);
    if (item.category === "pressure") value += familyScore + debtScore + Math.max(0, survivalScore - 3);
    if (item.category === "stability") value += rewardScore - Math.max(0, stableScore - 2);
    if (item.category === "growth") value += Math.max(0, stableScore - 2) - Math.max(0, debtScore - 3);
    return { ...item, value: clamp(value) };
  });

  const indicators = normalizeInfluenceBreakdown(signalStrength);
  return { ...snapshot, indicators };
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
    return LIFE_STAGE_INTELLIGENCE["Working Student"].fields;
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

export function getStageDefinition(stageName) {
  const normalized = normalizeLifeStage(stageName);
  if (normalized === "Working Student") return WORKING_STUDENT_DEFINITION;
  return LIFE_STAGE_INTELLIGENCE[normalized] || LIFE_STAGE_INTELLIGENCE[DEFAULT_STAGE.stage];
}