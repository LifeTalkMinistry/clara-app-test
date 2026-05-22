export const WORKING_STUDENT_STAGE_KEY = "Working Student";

export const WORKING_STUDENT_QUESTION_ORDER = ["setup", "rhythm", "workload", "pressure", "coping", "goal"];

export const WORKING_STUDENT_RESET_AFTER = {
  setup: ["rhythm", "workload", "pressure", "coping", "goal"],
  rhythm: ["workload", "pressure", "coping", "goal"],
  workload: ["pressure", "coping", "goal"],
  pressure: ["coping", "goal"],
  coping: ["goal"],
  goal: [],
};

export const WORKING_STUDENT_ROOTS = [
  "Mostly supported, trying to earn extra",
  "Working mainly to continue school",
  "Helping family while studying",
  "Trying to survive school mostly alone",
  "Balancing school, work, and exhaustion",
  "Building a future while financially unstable",
  "Trying to recover from constant financial pressure",
];

export const WORKING_STUDENT_BRANCHES = {
  "Mostly supported, trying to earn extra": {
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

export const WORKING_STUDENT_DISPLAY_LABELS = {
  "Mostly supported, trying to earn extra": "Supported, learning independence",
  "Working mainly to continue school": "Working to protect school",
  "Helping family while studying": "Studying while helping family",
  "Trying to survive school mostly alone": "Mostly self-supporting",
  "Balancing school, work, and exhaustion": "Exhausted by school-work overlap",
  "Building a future while financially unstable": "Building with unstable income",
  "Trying to recover from constant financial pressure": "Recovering from money pressure",
  "Allowance is the base, work is extra": "Allowance base + extra work",
  "Fixed part-time pay for personal needs": "Fixed part-time pay",
  "Occasional side income when available": "Occasional side income",
  "Extra income disappears into small spending": "Extra money leaks fast",
  "Manageable but inconsistent": "Manageable, but uneven",
  "Busy during exam or work weeks": "Busy during exam/work weeks",
  "Social and school costs overlap": "Social + school costs overlap",
  "Enough control if I plan early": "Control is still available",
  "Manageable but leak-prone": "Manageable, but leak-prone",
  "Busy enough to justify small rewards": "Busy enough to reward myself",
  "Food, fare, and school extras": "Food, fare, school extras",
  "Social or reward spending": "Social/reward spending",
  "Saving feels inconsistent": "Saving feels inconsistent",
  "I want independence but still rely on support": "Independence while supported",
  "I spend small amounts without noticing": "Small spending goes unnoticed",
  "I reward myself after effort": "I reward myself after effort",
  "I avoid strict tracking": "I avoid strict tracking",
  "I can pause when I plan early": "I can pause when prepared",
  "Build discipline before bigger responsibilities": "Build discipline early",
  "Save small without guilt": "Save small without guilt",
  "Control small leaks": "Control small leaks",
  "Use extra income with purpose": "Give extra income a purpose",
  "Keep rewards but set limits": "Keep rewards, set limits",
  "Fixed work income for tuition": "Fixed work income for tuition",
  "Irregular income for school requirements": "Irregular income for school needs",
  "Project/seasonal work before deadlines": "Project work before deadlines",
  "Allowance is not enough for school costs": "Allowance cannot cover school",
  "Class and work are both required": "Class and work are both required",
  "School deadlines create work pressure": "School deadlines create pressure",
  "Little room when fees are near": "Little room near payment dates",
  "I keep going even when tired": "I keep going while tired",
  "Income waves around school deadlines": "Income waves near deadlines",
  "Tuition and school payments": "Tuition/school payments",
  "Projects, printing, and materials": "Projects, printing, materials",
  "Daily fare and food while attending": "Daily fare and food",
  "Fear of stopping school": "Fear of stopping school",
  "I cut personal needs to pay school costs": "I cut needs for school costs",
  "I delay non-school payments": "I delay non-school payments",
  "I take extra work even when tired": "I work extra while tired",
  "I avoid spending on myself": "I avoid spending on myself",
  "Protect school continuity": "Protect school continuity",
  "Avoid debt from school pressure": "Avoid school-related debt",
  "Keep food and fare stable": "Keep food and fare stable",
  "Finish school without burning out": "Finish school without burning out",
  "Part of my income goes home": "Part of income goes home",
  "I give when family needs appear": "I give when family needs appear",
  "Allowance/work money gets shared": "Allowance/work money gets shared",
  "I earn extra to support family": "I earn extra for family",
  "School, work, and home needs overlap": "School, work, and home overlap",
  "I feel responsible even when tired": "I feel responsible while tired",
  "Family requests change the week": "Family needs change the week",
  "I still try to keep school stable": "I try to keep school stable",
  "Family contribution": "Family contribution",
  "Guilt when I protect my own money": "Guilt when I protect my money",
  "School costs competing with home needs": "School costs vs home needs",
  "Weak personal buffer": "Weak personal buffer",
  "I give even when my budget is tight": "I give even when tight",
  "I delay my own needs": "I delay my own needs",
  "I hide money stress": "I hide money stress",
  "I try to set limits but feel guilty": "I set limits but feel guilty",
  "Help family without losing stability": "Help family without losing stability",
  "Set a support boundary": "Set a support boundary",
  "Protect school and daily needs": "Protect school and daily needs",
  "Build a personal safety buffer": "Build a personal safety buffer",
  "Fixed low-income work": "Fixed low-income work",
  "Irregular side hustle survival income": "Irregular survival income",
  "Borrowing between pay cycles": "Borrowing between pay cycles",
  "Project/seasonal income with gaps": "Project income with gaps",
  "School and survival costs compete daily": "School and survival costs compete",
  "Food and fare need careful planning": "Food/fare need careful planning",
  "No room for surprise expenses": "No room for surprise costs",
  "I am tired but have to continue": "Tired, but I must continue",
  "Food and transport survival": "Food and transport survival",
  "Tuition or school deadlines": "Tuition/school deadlines",
  "No emergency margin": "No emergency margin",
  "Borrowing risk when timing fails": "Borrowing risk when timing fails",
  "I cut meals or needs to stretch money": "I cut meals/needs to stretch money",
  "I avoid checking when money is low": "I avoid checking when low",
  "I borrow to survive the gap": "I borrow to survive gaps",
  "I overwork when pressure hits": "I overwork when pressure hits",
  "Build the smallest emergency buffer": "Build a tiny emergency buffer",
  "Stop survival borrowing": "Stop survival borrowing",
  "Protect food and fare first": "Protect food and fare first",
  "Fixed pay but low recovery": "Fixed pay, low recovery",
  "Irregular income plus heavy schedule": "Irregular income + heavy schedule",
  "Work shifts disrupt school rhythm": "Work shifts disrupt school",
  "Extra work happens when deadlines hit": "Extra work near deadlines",
  "Heavy school-work overlap": "Heavy school-work overlap",
  "Little time to rest": "Little time to rest",
  "Commute drains energy": "Commute drains energy",
  "Deadlines and shifts collide": "Deadlines and shifts collide",
  "Convenience spending from exhaustion": "Convenience spending from exhaustion",
  "Rushed food and transport": "Rushed food and transport",
  "Missed tracking because I am tired": "I miss tracking when tired",
  "Work-school schedule conflict": "Work-school schedule conflict",
  "I buy comfort after hard days": "I buy comfort after hard days",
  "I choose convenience to save energy": "I choose convenience to save energy",
  "I forget to track expenses": "I forget to track expenses",
  "I push rest aside": "I push rest aside",
  "Create low-energy money rules": "Create low-energy money rules",
  "Reduce convenience leaks": "Reduce convenience leaks",
  "Protect rest as part of budgeting": "Protect rest as part of budgeting",
  "Income changes month to month": "Income changes monthly",
  "Side hustle income is growing slowly": "Side hustle is growing slowly",
  "Support and work income both fluctuate": "Support and work both fluctuate",
  "Some weeks are strong, some are tight": "Some weeks strong, some tight",
  "I am ambitious but stretched": "Ambitious but stretched",
  "My routine changes often": "My routine changes often",
  "I am learning while earning": "Learning while earning",
  "Future pressure makes me anxious": "Future pressure makes me anxious",
  "Unstable income rhythm": "Unstable income rhythm",
  "Repeated small expenses": "Repeated small expenses",
  "Future goals feel far": "Future goals feel far",
  "I do not know what to prioritize first": "I do not know what to prioritize",
  "I switch plans often": "I switch plans often",
  "I spend when I feel stuck": "I spend when stuck",
  "I start saving then stop": "I start saving, then stop",
  "I need clearer priorities": "I need clearer priorities",
  "Create a simple money rhythm": "Create a simple money rhythm",
  "Protect future goals slowly": "Protect future goals slowly",
  "Choose one priority first": "Choose one priority first",
  "Control micro-spending": "Control micro-spending",
  "Money arrives after expenses are due": "Money arrives after bills are due",
  "I borrow then repay repeatedly": "I borrow, then repay repeatedly",
  "Income is unstable and pressure carries over": "Pressure carries into next week",
  "Debt or delayed payments affect the week": "Debt/delays affect the week",
  "The month feels like repair mode": "The month feels like repair mode",
  "Old pressure affects current choices": "Old pressure affects today",
  "I feel tired from catching up": "Tired from catching up",
  "There is little room to reset": "Little room to reset",
  "Repayment pressure": "Repayment pressure",
  "Cash-flow timing mismatch": "Cash-flow timing mismatch",
  "Borrowing again before the next income": "Borrowing before next income",
  "Avoiding money because it feels heavy": "Avoiding money because it feels heavy",
  "I delay payments to survive": "I delay payments to survive",
  "I avoid checking the full picture": "I avoid the full picture",
  "I borrow again when daily costs hit": "I borrow again for daily costs",
  "I cut needs too much": "I cut needs too much",
  "Stop pressure from stacking": "Stop pressure from stacking",
  "Build a no-new-debt rule": "Build a no-new-debt rule",
  "Create a repayment rhythm": "Create a repayment rhythm",
  "Protect a tiny food/fare buffer": "Protect a tiny food/fare buffer",
};

const DISPLAY_TO_CANONICAL = Object.entries(WORKING_STUDENT_DISPLAY_LABELS).reduce((map, [raw, label]) => {
  map[label] = raw;
  return map;
}, {});

export function cleanWorkingStudentValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value) {
  return cleanWorkingStudentValue(value).toLowerCase();
}

function hasAny(value, terms) {
  const text = lower(value);
  return terms.some((term) => text.includes(lower(term)));
}

function signal(label, category, note, insight, action, trendType = "wave") {
  return { label, category, note, insight, action, trendType };
}

export const WORKING_STUDENT_SIGNAL_DEFINITIONS = {
  emotionalFatigue: signal(
    "Emotional Fatigue",
    "energy",
    "School, work, commute, and recovery pressure may be occupying a large part of the student's money behavior.",
    "Fatigue can turn simple decisions into shortcut spending, skipped tracking, or comfort purchases.",
    "Protect one low-energy routine for food, commute, and quick check-ins before the week gets heavy.",
    "volatile"
  ),
  financialInstability: signal(
    "Financial Instability",
    "stability",
    "Income timing or income consistency may be making planning harder than the student’s discipline level suggests.",
    "The issue may be rhythm: expenses can feel fixed while money arrives unevenly.",
    "Separate essentials first, then let flexible spending adjust based on the real income week.",
    "wave"
  ),
  rewardSpendingRisk: signal(
    "Reward Spending Risk",
    "stability",
    "Small rewards may be acting as quick relief after pressure, effort, or emotionally heavy days.",
    "The risk is not one reward; it is repeated relief spending becoming the easiest recovery habit.",
    "Keep rewards, but set the amount and timing before stress peaks.",
    "spike"
  ),
  recoveryWeakness: signal(
    "Recovery Weakness",
    "energy",
    "Low rest or low recovery may be weakening planning, tracking, and spending discipline.",
    "When rest disappears, spending often becomes the fastest available form of recovery.",
    "Add one no-spend recovery option and one prepared low-cost fallback for tired days.",
    "downward"
  ),
  survivalPressure: signal(
    "Survival Pressure",
    "pressure",
    "Food, fare, school requirements, and daily basics may be competing for the same limited money.",
    "This is not careless spending; this is essential-cost pressure taking up space in the week.",
    "Protect food, fare, school materials, and attendance costs before flexible spending.",
    "volatile"
  ),
  mentalOverload: signal(
    "Mental Overload",
    "energy",
    "The student may be carrying too many decisions across school, work, money, and personal responsibilities.",
    "Overload can make even simple budgeting feel heavier than it should.",
    "Reduce the plan to one priority and one simple money rule for the current week.",
    "spike"
  ),
  routineInstability: signal(
    "Routine Instability",
    "stability",
    "Changing routines, shifting schedules, or uneven weeks may be making consistency difficult.",
    "The budget may fail when it assumes a perfect week that the student does not actually have.",
    "Use flexible weekly caps instead of one rigid routine.",
    "wave"
  ),
  convenienceSpendingRisk: signal(
    "Convenience Spending Risk",
    "stability",
    "Convenience may be becoming the natural response to low time, low energy, or rushed days.",
    "Convenience spending often comes from exhaustion, not laziness.",
    "Prepare one cheaper convenience substitute before the hardest part of the day.",
    "spike"
  ),
  borrowingRisk: signal(
    "Borrowing Risk",
    "pressure",
    "Cash-flow gaps, delayed payments, or survival needs may be pushing the student toward borrowing.",
    "Borrowing often appears when timing fails before income arrives.",
    "Protect a tiny food/fare gap buffer before optional spending.",
    "volatile"
  ),
  familyBurden: signal(
    "Family Burden",
    "pressure",
    "Family support may be sharing the same money and energy needed for school and daily stability.",
    "The pressure is care plus boundary difficulty, not just financial generosity.",
    "Create a support limit that protects family care and the student’s own essentials.",
    "wave"
  ),
  tuitionPressure: signal(
    "Tuition Pressure",
    "pressure",
    "School continuity may be the main money pressure, especially around tuition, materials, and deadlines.",
    "When school costs are active, many spending choices feel connected to the future.",
    "Reserve school-cost money before rewards, social spending, or flexible purchases.",
    "upward"
  ),
  burnoutRisk: signal(
    "Burnout Risk",
    "energy",
    "The student may be trying to keep going while rest, schedule, and money pressure are already colliding.",
    "Burnout risk rises when effort becomes the only answer to every pressure.",
    "Protect rest as part of budgeting, not as a reward after everything else.",
    "downward"
  ),
  pressureCarryover: signal(
    "Pressure Carryover",
    "pressure",
    "Old shortfalls, delayed payments, or repayment pressure may be affecting the current week.",
    "The month can feel like repair mode when old pressure controls new income.",
    "Give repayment a predictable rhythm and prevent one new shortfall from stacking again.",
    "wave"
  ),
  budgetDiscipline: signal(
    "Budget Discipline",
    "growth",
    "There is still room for planning, boundaries, or small repeatable money habits.",
    "Discipline grows when the rule is realistic enough to survive student life.",
    "Keep the next rule small, repeatable, and tied to the student’s real week.",
    "stable"
  ),
  emotionalRecoveryDependence: signal(
    "Emotional Recovery Dependence",
    "energy",
    "Spending may be carrying emotional recovery when rest, food, or support are missing.",
    "This pattern usually appears when the day feels too heavy to end without relief.",
    "Build a short recovery menu that includes free and low-cost options.",
    "spike"
  ),
};

const meaning = (title, meaningText, signals = {}) => ({ title, meaning: meaningText, signals });

export const WORKING_STUDENT_OPTION_MEANINGS = {
  "Mostly supported, trying to earn extra": meaning(
    "Learning independence with support",
    "You may still have support around you, but you are slowly learning what financial responsibility feels like. Many students in this stage become more careful with spending because independence starts feeling real.",
    { budgetDiscipline: 18, routineInstability: 8, rewardSpendingRisk: 7 }
  ),
  "Working mainly to continue school": meaning(
    "Working to protect school",
    "This usually means earning money is not about luxury; it is about keeping school possible. Tuition, projects, fare, food, and deadline pressure can make every peso feel connected to your future.",
    { tuitionPressure: 30, survivalPressure: 16, financialInstability: 10 }
  ),
  "Helping family while studying": meaning(
    "Studying while helping family",
    "This means your student life is also carrying home responsibility. Money decisions can feel emotional because helping others and protecting your own school needs may happen at the same time.",
    { familyBurden: 34, survivalPressure: 14, emotionalFatigue: 8 }
  ),
  "Trying to survive school mostly alone": meaning(
    "Mostly self-supporting",
    "This means you are carrying a larger part of school and daily survival yourself. Decisions often become less about comfort and more about stability, timing, and avoiding setbacks.",
    { survivalPressure: 32, financialInstability: 20, borrowingRisk: 13, recoveryWeakness: 10 }
  ),
  "Balancing school, work, and exhaustion": meaning(
    "Exhausted by school-work overlap",
    "This means your schedule may be using the same energy that your money discipline needs. When school and work overlap heavily, convenience spending and missed tracking can happen simply because you are tired.",
    { emotionalFatigue: 30, mentalOverload: 24, recoveryWeakness: 18, convenienceSpendingRisk: 16, burnoutRisk: 16 }
  ),
  "Building a future while financially unstable": meaning(
    "Building with unstable income",
    "This means you are trying to move forward even when money does not arrive in a predictable rhythm. Planning can feel harder because strong weeks and tight weeks ask for different decisions.",
    { financialInstability: 28, routineInstability: 18, mentalOverload: 10, budgetDiscipline: 8 }
  ),
  "Trying to recover from constant financial pressure": meaning(
    "Recovering from money pressure",
    "This means old financial pressure may still be affecting the current week. Borrowing, delayed payments, or cash-flow gaps can make life feel like repair mode even when you are trying to reset.",
    { pressureCarryover: 30, borrowingRisk: 22, financialInstability: 16, recoveryWeakness: 12 }
  ),
};

Object.entries(WORKING_STUDENT_DISPLAY_LABELS).forEach(([raw, label]) => {
  if (WORKING_STUDENT_OPTION_MEANINGS[raw] && !WORKING_STUDENT_OPTION_MEANINGS[label]) {
    WORKING_STUDENT_OPTION_MEANINGS[label] = WORKING_STUDENT_OPTION_MEANINGS[raw];
  }
});

export const WORKING_STUDENT_SIGNAL_CATEGORIES = Object.fromEntries(
  Object.values(WORKING_STUDENT_SIGNAL_DEFINITIONS).map((item) => [item.label, item.category])
);

export const WORKING_STUDENT_CARD_NOTES = Object.fromEntries(
  Object.values(WORKING_STUDENT_SIGNAL_DEFINITIONS).map((item) => [item.label, item.note])
);

export const WORKING_STUDENT_MODAL_INSIGHTS = Object.fromEntries(
  Object.values(WORKING_STUDENT_SIGNAL_DEFINITIONS).map((item) => [
    item.label,
    {
      insight: item.note,
      signal: item.insight,
      move: item.action,
    },
  ])
);

export const workingStudentBehaviorEngine = {
  stage: WORKING_STUDENT_STAGE_KEY,
  questions: WORKING_STUDENT_QUESTION_ORDER,
  options: WORKING_STUDENT_BRANCHES,
  displayLabels: WORKING_STUDENT_DISPLAY_LABELS,
  optionMeanings: WORKING_STUDENT_OPTION_MEANINGS,
  signalDefinitions: WORKING_STUDENT_SIGNAL_DEFINITIONS,
};

function canonicalizeOption(value) {
  const cleaned = cleanWorkingStudentValue(value);
  return DISPLAY_TO_CANONICAL[cleaned] || cleaned;
}

function addSignals(target, signals = {}) {
  Object.entries(signals || {}).forEach(([key, raw]) => {
    const value = Math.max(0, Number(raw) || 0);
    if (!value || !WORKING_STUDENT_SIGNAL_DEFINITIONS[key]) return;
    target[key] = (target[key] || 0) + value;
  });
}

function inferredSignals(key, value) {
  const text = `${key} ${canonicalizeOption(value)} ${getWorkingStudentDisplayLabel(value)}`;
  const signals = {};
  const add = (signalKey, amount) => addSignals(signals, { [signalKey]: amount });

  if (hasAny(text, ["allowance", "fixed", "base", "part-time", "control", "plan early", "pause", "prepared", "discipline", "priority", "purpose", "savings"])) add("budgetDiscipline", 14);
  if (hasAny(text, ["irregular", "project", "seasonal", "gaps", "fluctuate", "changes month", "some weeks", "unstable", "money arrives after", "delayed payments"])) add("financialInstability", 24);
  if (hasAny(text, ["routine changes", "shifts", "schedule", "collide", "some weeks", "busy", "inconsistent", "uneven"])) add("routineInstability", 14);
  if (hasAny(text, ["tuition", "school payments", "school costs", "school deadlines", "fear of stopping", "school continuity", "projects", "printing", "materials"])) add("tuitionPressure", 22);
  if (hasAny(text, ["food", "fare", "transport", "daily", "survival", "essentials", "no room", "emergency margin", "cut meals", "stretch money"])) add("survivalPressure", 22);
  if (hasAny(text, ["family", "home", "guilt", "goes home", "shared", "support boundary", "give even", "delay my own needs", "hide money stress"])) add("familyBurden", 22);
  if (hasAny(text, ["borrow", "repay", "debt", "cash-flow", "delay payments", "borrowing", "no-new-debt"])) add("borrowingRisk", 24);
  if (hasAny(text, ["repayment", "repair mode", "old pressure", "carries over", "avoid checking", "avoid the full picture", "money feels heavy"])) add("pressureCarryover", 18);
  if (hasAny(text, ["tired", "fatigue", "exhaust", "little time", "commute", "heavy", "overlap", "deadlines", "responsible while tired", "catching up"])) add("emotionalFatigue", 22);
  if (hasAny(text, ["overload", "prioritize", "future pressure", "anxious", "unclear", "too much", "stretched"])) add("mentalOverload", 16);
  if (hasAny(text, ["rest", "low recovery", "no recovery", "push rest", "cut needs", "avoid spending on myself", "recovery"])) add("recoveryWeakness", 18);
  if (hasAny(text, ["burn", "overwork", "burning out", "survival mode", "almost no margin"])) add("burnoutRisk", 18);
  if (hasAny(text, ["reward", "comfort", "spend", "small", "feel okay", "social", "stuck", "micro", "leaks"])) add("rewardSpendingRisk", 24);
  if (hasAny(text, ["convenience", "rushed", "missed tracking", "save energy", "forget to track"])) add("convenienceSpendingRisk", 22);
  if (hasAny(text, ["comfort", "feel okay", "hard days", "reward myself", "emotional", "relief"])) add("emotionalRecoveryDependence", 18);

  return signals;
}

function getOptionMeaning(value, key) {
  const canonical = canonicalizeOption(value);
  const display = getWorkingStudentDisplayLabel(canonical);
  const direct = WORKING_STUDENT_OPTION_MEANINGS[canonical] || WORKING_STUDENT_OPTION_MEANINGS[display];
  if (direct) return direct;

  return {
    title: display || canonical || "Working Student signal",
    meaning: "This choice helps CLARA understand how school, work, money, energy, and responsibility are shaping the student’s current situation.",
    signals: inferredSignals(key, canonical),
  };
}

function getLastAnsweredKey(answers = {}) {
  return [...WORKING_STUDENT_QUESTION_ORDER].reverse().find((key) => cleanWorkingStudentValue(answers[key])) || "setup";
}

function normalizeDistribution(rows) {
  const safeRows = rows.filter((row) => row.raw > 0);
  const total = safeRows.reduce((sum, row) => sum + row.raw, 0) || 1;
  const mapped = safeRows.map((row, index) => {
    const exact = (row.raw / total) * 100;
    return { ...row, index, value: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = 100 - mapped.reduce((sum, row) => sum + row.value, 0);
  mapped.slice().sort((a, b) => b.rest - a.rest || a.index - b.index).forEach((row) => {
    if (left <= 0) return;
    row.value += 1;
    left -= 1;
  });
  return mapped.map(({ raw, rest, index, ...row }) => row);
}

function distributionStatus(value) {
  if (value >= 30) return "Dominant";
  if (value >= 22) return "Heavy Presence";
  if (value >= 14) return "Growing Pressure";
  if (value >= 8) return "Emerging Pattern";
  return "Minor Presence";
}

function buildSnapshotDistribution(signals = {}) {
  const rows = Object.entries(signals)
    .map(([key, raw]) => ({ key, raw: Math.max(0, Number(raw) || 0), ...WORKING_STUDENT_SIGNAL_DEFINITIONS[key] }))
    .filter((row) => row.label && row.raw > 0)
    .sort((a, b) => b.raw - a.raw || a.label.localeCompare(b.label))
    .slice(0, 4);

  return normalizeDistribution(rows).map((item) => ({
    key: item.key,
    label: item.label,
    value: item.value,
    status: distributionStatus(item.value),
    category: item.category,
    note: item.note,
    insight: item.insight,
    action: item.action,
    trendType: item.trendType,
  }));
}

function buildEvolvedSummary(answers, distribution) {
  const dominant = distribution[0];
  const second = distribution[1];
  const setup = getWorkingStudentDisplayLabel(answers.setup);
  const goal = getWorkingStudentDisplayLabel(answers.goal);
  const headline = dominant ? `${dominant.label} is taking the most space right now.` : "CLARA is reading your Working Student pattern.";
  const body = dominant
    ? `Based on the full Working Student flow, CLARA sees ${dominant.label.toLowerCase()} as the strongest part of this current life-pressure split${second ? `, followed by ${second.label.toLowerCase()}` : ""}. This means guidance should protect the student’s real week first — school, work, money timing, energy, and daily essentials — before asking for a perfect budget.`
    : "CLARA will use your answers to understand how school, work, money timing, energy, and responsibility are connected.";
  return { headline, body, setup, goal };
}

function buildAiPayload(answers, signals, distribution, evolvedSummary) {
  return {
    stage: WORKING_STUDENT_STAGE_KEY,
    answers,
    dominantSignals: distribution.map((item) => ({ key: item.key, label: item.label, value: item.value })),
    summary: evolvedSummary.body,
    recommendedCoachingDirection: distribution[0]?.action || "Start with one small protection rule for the current week.",
    rawSignals: signals,
  };
}

export function getWorkingStudentBranch(setup) {
  const key = WORKING_STUDENT_ROOTS.includes(canonicalizeOption(setup)) ? canonicalizeOption(setup) : WORKING_STUDENT_ROOTS[0];
  return WORKING_STUDENT_BRANCHES[key] || WORKING_STUDENT_BRANCHES[WORKING_STUDENT_ROOTS[0]];
}

export function getWorkingStudentOptions(draft = {}, key) {
  const setup = WORKING_STUDENT_ROOTS.includes(canonicalizeOption(draft.setup)) ? canonicalizeOption(draft.setup) : WORKING_STUDENT_ROOTS[0];
  const branch = getWorkingStudentBranch(setup);
  if (key === "setup") return WORKING_STUDENT_ROOTS;
  if (key === "rhythm") return branch.rhythm || [];
  if (key === "workload") return branch.workload?.[canonicalizeOption(draft.rhythm)] || branch.workload?.default || [];
  if (key === "pressure") return branch.pressure?.[canonicalizeOption(draft.workload)] || branch.pressure?.default || [];
  if (key === "coping") return branch.coping?.[canonicalizeOption(draft.pressure)] || branch.coping?.default || [];
  if (key === "goal") return branch.goal?.[canonicalizeOption(draft.coping)] || branch.goal?.default || [];
  return [];
}

export function completeWorkingStudentDraft(raw = {}) {
  const next = { stage: WORKING_STUDENT_STAGE_KEY, ...raw };
  WORKING_STUDENT_QUESTION_ORDER.forEach((key) => {
    const options = getWorkingStudentOptions(next, key);
    const current = canonicalizeOption(next[key]);
    next[key] = options.includes(current) ? current : options[0];
  });
  return next;
}

export function resetWorkingStudentAfter(draft = {}, key) {
  const next = { ...draft };
  (WORKING_STUDENT_RESET_AFTER[key] || []).forEach((item) => delete next[item]);
  return next;
}

export function getWorkingStudentDisplayLabel(value) {
  const cleaned = canonicalizeOption(value);
  return WORKING_STUDENT_DISPLAY_LABELS[cleaned] || cleaned;
}

export function getWorkingStudentBehaviorProfile(rawAnswers = {}, options = {}) {
  const selectedAnswers = completeWorkingStudentDraft({ ...rawAnswers, stage: WORKING_STUDENT_STAGE_KEY });
  const currentKey = options.currentQuestionKey || getLastAnsweredKey(rawAnswers);
  const currentValue = selectedAnswers[currentKey];
  const currentMeaning = getOptionMeaning(currentValue, currentKey);
  const signals = {};

  WORKING_STUDENT_QUESTION_ORDER.forEach((key) => {
    const value = selectedAnswers[key];
    const meaningForAnswer = getOptionMeaning(value, key);
    addSignals(signals, meaningForAnswer.signals);
    addSignals(signals, inferredSignals(key, value));
  });

  if (!Object.keys(signals).length) {
    addSignals(signals, { budgetDiscipline: 34, routineInstability: 26, financialInstability: 22, recoveryWeakness: 18 });
  }

  const snapshotDistribution = buildSnapshotDistribution(signals);
  const evolvedSummary = buildEvolvedSummary(selectedAnswers, snapshotDistribution);

  return {
    stage: WORKING_STUDENT_STAGE_KEY,
    selectedAnswers,
    currentContext: {
      title: currentMeaning.title,
      body: currentMeaning.meaning,
    },
    evolvedSummary,
    signals,
    snapshotDistribution,
    aiPayload: buildAiPayload(selectedAnswers, signals, snapshotDistribution, evolvedSummary),
  };
}

export function normalizeWorkingStudentInfluenceSplit(weights = {}) {
  const rows = Object.entries(weights).map(([label, raw]) => {
    const definition = Object.values(WORKING_STUDENT_SIGNAL_DEFINITIONS).find((item) => item.label === label) || {};
    return { label, raw: Math.max(0, Number(raw) || 0), ...definition };
  });
  return normalizeDistribution(rows).map((item) => ({
    label: item.label,
    value: item.value,
    category: item.category || "stability",
    note: item.note || "CLARA pressure split signal.",
  }));
}

export function getWorkingStudentScores(profile = {}) {
  return getWorkingStudentBehaviorProfile(profile).signals;
}

export function getWorkingStudentArchetype(profile = {}) {
  return getWorkingStudentSnapshot(profile);
}

export function getWorkingStudentSnapshot(profile = {}) {
  const behavior = getWorkingStudentBehaviorProfile(profile);
  const dominant = behavior.snapshotDistribution[0] || {};
  const secondary = behavior.snapshotDistribution[1] || {};
  return {
    key: "canonicalDistribution",
    title: dominant.label || "Working Student pressure split",
    caption:
      dominant.note ||
      "CLARA is reading how school, work, money timing, energy, and responsibility currently share the student’s pressure.",
    overview: behavior.evolvedSummary.body,
    hero: behavior.evolvedSummary.body,
    supportTitle: behavior.evolvedSummary.headline,
    supportBody: secondary.label
      ? `${dominant.label} is the largest share, while ${secondary.label} is also visible in the pattern.`
      : "CLARA is building the current Working Student pressure distribution.",
    struggles: behavior.snapshotDistribution.map((item) => item.label),
    recommendations: behavior.snapshotDistribution.map((item) => item.action),
    weights: Object.fromEntries(behavior.snapshotDistribution.map((item) => [item.label, item.value])),
    indicators: behavior.snapshotDistribution.map((item) => ({
      label: item.label,
      value: item.value,
      category: item.category,
      note: item.note,
      insight: item.insight,
      action: item.action,
      trendType: item.trendType,
      status: item.status,
    })),
  };
}

export function getWorkingStudentQuestionContext(key, value, draft = {}) {
  const behavior = getWorkingStudentBehaviorProfile({ ...draft, [key]: value, stage: WORKING_STUDENT_STAGE_KEY }, { currentQuestionKey: key });
  return {
    key,
    value: canonicalizeOption(value),
    title: behavior.currentContext.title,
    summary: behavior.currentContext.body,
    body: behavior.currentContext.body,
  };
}

export function buildWorkingStudentDraft(previous = {}) {
  return completeWorkingStudentDraft({ ...previous, stage: WORKING_STUDENT_STAGE_KEY });
}

export const WORKING_STUDENT_LIFE_STAGE_SOURCE = {
  stage: WORKING_STUDENT_STAGE_KEY,
  roots: WORKING_STUDENT_ROOTS,
  branches: WORKING_STUDENT_BRANCHES,
  displayLabels: WORKING_STUDENT_DISPLAY_LABELS,
  optionMeanings: WORKING_STUDENT_OPTION_MEANINGS,
  signalDefinitions: WORKING_STUDENT_SIGNAL_DEFINITIONS,
  contextCopy: WORKING_STUDENT_OPTION_MEANINGS,
  snapshots: {},
  cardNotes: WORKING_STUDENT_CARD_NOTES,
  modalInsights: WORKING_STUDENT_MODAL_INSIGHTS,
  behaviorEngine: workingStudentBehaviorEngine,
  helpers: {
    cleanWorkingStudentValue,
    getWorkingStudentBranch,
    getWorkingStudentOptions,
    completeWorkingStudentDraft,
    resetWorkingStudentAfter,
    getWorkingStudentDisplayLabel,
    getWorkingStudentBehaviorProfile,
    normalizeWorkingStudentInfluenceSplit,
    getWorkingStudentScores,
    getWorkingStudentArchetype,
    getWorkingStudentSnapshot,
    getWorkingStudentQuestionContext,
    buildWorkingStudentDraft,
  },
};

export default WORKING_STUDENT_LIFE_STAGE_SOURCE;
