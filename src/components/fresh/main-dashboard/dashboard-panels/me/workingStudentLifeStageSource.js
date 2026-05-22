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

function signal(label, category, note, insight, action, trendType = "wave") {
  return { label, category, note, insight, action, trendType };
}

export const WORKING_STUDENT_SIGNAL_DEFINITIONS = {
  emotionalFatigue: signal("Emotional Fatigue", "energy", "School, work, commute, and responsibility load are draining energy right now.", "Fatigue can turn simple decisions into shortcut spending, skipped tracking, or comfort purchases.", "Protect one low-energy routine for food, commute, and quick check-ins before the week gets heavy.", "volatile"),
  financialInstability: signal("Financial Instability", "stability", "Income rhythm or money timing is unstable enough to affect planning.", "The issue may be rhythm: expenses can feel fixed while money arrives unevenly.", "Separate essentials first, then let flexible spending adjust based on the real income week.", "wave"),
  rewardSpendingRisk: signal("Reward Spending Risk", "spending", "Spending may be acting as reward, comfort, or emotional relief after effort.", "The risk is not one reward; it is repeated relief spending becoming the easiest recovery habit.", "Keep rewards, but set the amount and timing before stress peaks.", "spike"),
  recoveryWeakness: signal("Recovery Weakness", "energy", "Rest, reset time, or safe recovery options may be weak right now.", "When rest disappears, spending often becomes the fastest available form of recovery.", "Add one no-spend recovery option and one prepared low-cost fallback for tired days.", "downward"),
  survivalPressure: signal("Survival Pressure", "pressure", "Daily essentials like food, fare, school basics, or emergency margin are under pressure.", "This is not careless spending; this is essential-cost pressure taking up space in the week.", "Protect food, fare, school materials, and attendance costs before flexible spending.", "volatile"),
  mentalOverload: signal("Mental Overload", "energy", "Too many decisions, unclear priorities, or cognitive pressure are competing for attention.", "Overload can make even simple budgeting feel heavier than it should.", "Reduce the plan to one priority and one simple money rule for the current week.", "spike"),
  routineInstability: signal("Routine Instability", "stability", "Schedule or life rhythm is unstable, even when income is not the only issue.", "The budget may fail when it assumes a perfect week that the student does not actually have.", "Use flexible weekly caps instead of one rigid routine.", "wave"),
  convenienceSpendingRisk: signal("Convenience Spending Risk", "spending", "Spending may be used to save time or energy on rushed days.", "Convenience spending often comes from exhaustion, not laziness.", "Prepare one cheaper convenience substitute before the hardest part of the day.", "spike"),
  borrowingRisk: signal("Borrowing Risk", "pressure", "The user may need debt or borrowing to survive timing gaps.", "Borrowing often appears when timing fails before income arrives.", "Protect a tiny food/fare gap buffer before optional spending.", "volatile"),
  familyBurden: signal("Family Burden", "pressure", "Family responsibility is affecting personal money stability.", "The pressure is care plus boundary difficulty, not just financial generosity.", "Create a support limit that protects family care and the student’s own essentials.", "wave"),
  tuitionPressure: signal("Tuition Pressure", "pressure", "Education continuity, school payments, deadlines, and materials are the main pressure.", "When school costs are active, many spending choices feel connected to the future.", "Reserve school-cost money before rewards, social spending, or flexible purchases.", "upward"),
  burnoutRisk: signal("Burnout Risk", "energy", "A compounded warning is forming from fatigue, weak recovery, and pressure stacking together.", "Burnout risk rises when effort becomes the only answer to every pressure.", "Protect rest as part of budgeting, not as a reward after everything else.", "downward"),
  pressureCarryover: signal("Pressure Carryover", "pressure", "Old financial pressure is entering the current week or month.", "The month can feel like repair mode when old pressure controls new income.", "Give repayment a predictable rhythm and prevent one new shortfall from stacking again.", "wave"),
  budgetDiscipline: signal("Budget Discipline", "stability", "There is still planning capacity, boundary-setting, or a strength-based control signal.", "Discipline grows when the rule is realistic enough to survive student life.", "Keep the next rule small, repeatable, and tied to the student’s real week.", "stable"),
  emotionalRecoveryDependence: signal("Emotional Recovery Dependence", "energy", "Spending may be becoming a form of emotional recovery.", "This pattern usually appears when the day feels too heavy to end without relief.", "Build a short recovery menu that includes free and low-cost options.", "spike"),
};

export const WORKING_STUDENT_SNAPSHOT_BOUNDARIES = {
  emotionalFatigue: { family: "energy", role: "current energy drain", priority: 84, shouldNotDuplicateWith: ["recoveryWeakness", "mentalOverload", "burnoutRisk"], appearsWhen: "School, work, commute, or responsibilities are draining emotional and physical energy.", priorityRule: "Show when tiredness is the clearest active pressure, but suppress if burnoutRisk becomes the stronger compounded pattern." },
  recoveryWeakness: { family: "energy", role: "lack of recovery system", priority: 74, shouldNotDuplicateWith: ["emotionalFatigue"], appearsWhen: "The user is not only tired, but has weak rest, low reset time, or uses spending as recovery.", priorityRule: "Show only if recovery-related answers are stronger than general tiredness." },
  mentalOverload: { family: "energy", role: "decision pressure", priority: 70, shouldNotDuplicateWith: ["emotionalFatigue", "burnoutRisk"], appearsWhen: "Too many decisions, unclear priorities, or cognitive pressure are shaping money behavior.", priorityRule: "Show when decision pressure is distinct from general tiredness." },
  burnoutRisk: { family: "energy", role: "compounded warning", priority: 96, compounded: true, shouldNotDuplicateWith: ["emotionalFatigue", "recoveryWeakness", "mentalOverload"], appearsWhen: "Fatigue, weak recovery, and another major pressure are all present together.", priorityRule: "Appear only when multiple energy and pressure signals are high together." },
  emotionalRecoveryDependence: { family: "energy", role: "spending-as-recovery support signal", priority: 52, shouldNotDuplicateWith: ["rewardSpendingRisk", "recoveryWeakness"], appearsWhen: "Spending is becoming a form of emotional recovery, not just a reward.", priorityRule: "Support Reward Spending Risk unless emotional recovery is clearly dominant." },
  financialInstability: { family: "stability", role: "money timing instability", priority: 88, shouldNotDuplicateWith: ["routineInstability"], appearsWhen: "Income rhythm or money timing is unstable.", priorityRule: "Show when money rhythm is the primary stability problem." },
  routineInstability: { family: "stability", role: "life rhythm instability", priority: 72, shouldNotDuplicateWith: ["financialInstability"], appearsWhen: "Schedule or routine is unstable even when income is not the main issue.", priorityRule: "Show when time/routine instability is distinct from income instability." },
  budgetDiscipline: { family: "stability", role: "strength-based control", priority: 45, strength: true, shouldNotDuplicateWith: [], appearsWhen: "The user selected planning, control, savings, boundaries, or protection goals.", priorityRule: "Do not dominate over urgent survival pressure." },
  survivalPressure: { family: "pressure", role: "daily essentials pressure", priority: 90, shouldNotDuplicateWith: ["tuitionPressure"], appearsWhen: "Food, fare, school basics, or emergency margin are under pressure.", priorityRule: "Allow with tuitionPressure only when daily essentials and school costs are separately strong." },
  tuitionPressure: { family: "pressure", role: "education continuity pressure", priority: 86, shouldNotDuplicateWith: ["survivalPressure"], appearsWhen: "Education continuity, school payments, deadlines, and materials are the main pressure.", priorityRule: "Allow with survivalPressure only when school costs and daily essentials are separately strong." },
  familyBurden: { family: "pressure", role: "family responsibility pressure", priority: 82, shouldNotDuplicateWith: [], appearsWhen: "Family responsibility is affecting personal money stability.", priorityRule: "Show when family responsibility is explicit enough to shape the money pattern." },
  borrowingRisk: { family: "pressure", role: "new borrowing risk", priority: 80, shouldNotDuplicateWith: ["pressureCarryover"], appearsWhen: "The user may need debt or borrowing to survive gaps.", priorityRule: "Show when borrowing risk is more immediate than old-pressure recovery." },
  pressureCarryover: { family: "pressure", role: "old pressure entering current week", priority: 78, shouldNotDuplicateWith: ["borrowingRisk", "financialInstability"], appearsWhen: "Old shortfalls, repayment, or delay patterns are affecting current choices.", priorityRule: "Show only when old pressure, repayment, or delay patterns are selected." },
  rewardSpendingRisk: { family: "spending", role: "reward or comfort spending", priority: 82, shouldNotDuplicateWith: ["emotionalRecoveryDependence"], appearsWhen: "Spending is used as a reward, comfort, or emotional relief after effort.", priorityRule: "Show when relief or reward spending is distinct from convenience spending." },
  convenienceSpendingRisk: { family: "spending", role: "time or energy-saving spending", priority: 76, shouldNotDuplicateWith: ["rewardSpendingRisk"], appearsWhen: "Spending is used to save time or energy.", priorityRule: "Show when convenience is about energy/time shortcuts, not emotional reward." },
};

function canonicalizeOption(value) {
  const cleaned = cleanWorkingStudentValue(value);
  return DISPLAY_TO_CANONICAL[cleaned] || cleaned;
}

function mergeSignals(base = {}, incoming = {}) {
  const next = { ...base };
  Object.entries(incoming || {}).forEach(([key, value]) => {
    if (!WORKING_STUDENT_SIGNAL_DEFINITIONS[key]) return;
    next[key] = (next[key] || 0) + Math.max(0, Number(value) || 0);
  });
  return next;
}

function addSignals(target, signals = {}) {
  Object.entries(signals || {}).forEach(([key, raw]) => {
    const value = Math.max(0, Number(raw) || 0);
    if (!value || !WORKING_STUDENT_SIGNAL_DEFINITIONS[key]) return;
    target[key] = (target[key] || 0) + value;
  });
}

function getAllWorkingStudentOptions() {
  const options = new Set(WORKING_STUDENT_ROOTS);
  Object.values(WORKING_STUDENT_BRANCHES).forEach((branch) => {
    (branch.rhythm || []).forEach((option) => options.add(option));
    ["workload", "pressure", "coping", "goal"].forEach((key) => {
      Object.values(branch[key] || {}).flat().forEach((option) => options.add(option));
    });
  });
  return Array.from(options);
}

const STEP_DEFAULT_SIGNALS = {
  setup: { budgetDiscipline: 6, routineInstability: 4 },
  rhythm: { financialInstability: 6, budgetDiscipline: 4 },
  workload: { emotionalFatigue: 6, routineInstability: 5 },
  pressure: { survivalPressure: 6, mentalOverload: 4 },
  coping: { rewardSpendingRisk: 4, pressureCarryover: 4 },
  goal: { budgetDiscipline: 8 },
};

const STEP_DEFAULT_META = {
  setup: { pressureType: "environment", emotionalTone: "forming responsibility", financialInterpretation: "This answer shapes the base environment CLARA uses to understand the student’s money behavior.", coachingDirection: "Start by protecting the realities of the student’s current setup." },
  rhythm: { pressureType: "income", emotionalTone: "adjusting to money timing", financialInterpretation: "This answer explains how income rhythm affects planning, spending, and stability.", coachingDirection: "Match the budget rhythm to how money actually arrives." },
  workload: { pressureType: "energy", emotionalTone: "managing capacity", financialInterpretation: "This answer shows how time and energy may affect spending discipline.", coachingDirection: "Use money rules that can survive the student’s real weekly load." },
  pressure: { pressureType: "pressure", emotionalTone: "protecting essentials", financialInterpretation: "This answer identifies what is currently competing for financial attention.", coachingDirection: "Protect the highest-pressure area before flexible spending." },
  coping: { pressureType: "behavior", emotionalTone: "responding to stress", financialInterpretation: "This answer shows what the student tends to do when pressure becomes heavy.", coachingDirection: "Create a safer replacement behavior before pressure peaks." },
  goal: { pressureType: "protection", emotionalTone: "choosing what to guard", financialInterpretation: "This answer clarifies what the student most needs to protect next.", coachingDirection: "Turn the protection goal into one small weekly rule." },
};

function getOptionStep(option) {
  const canonical = canonicalizeOption(option);
  if (WORKING_STUDENT_ROOTS.includes(canonical)) return "setup";
  for (const branch of Object.values(WORKING_STUDENT_BRANCHES)) {
    if ((branch.rhythm || []).includes(canonical)) return "rhythm";
    for (const key of ["workload", "pressure", "coping", "goal"]) {
      if (Object.values(branch[key] || {}).some((list) => list.includes(canonical))) return key;
    }
  }
  return "setup";
}

function primarySignalKey(signals = {}) {
  return Object.entries(signals).sort((a, b) => b[1] - a[1])[0]?.[0] || "budgetDiscipline";
}

function display(option) {
  const canonical = canonicalizeOption(option);
  return WORKING_STUDENT_DISPLAY_LABELS[canonical] || canonical;
}

function buildMeaning(option, signals, key) {
  const title = display(option);
  const primary = WORKING_STUDENT_SIGNAL_DEFINITIONS[primarySignalKey(signals)] || WORKING_STUDENT_SIGNAL_DEFINITIONS.budgetDiscipline;
  const stepMeta = STEP_DEFAULT_META[key] || STEP_DEFAULT_META.setup;
  return `Selecting “${title}” tells CLARA this part of student life is shaping the current money pattern. It mostly connects to ${primary.label.toLowerCase()} because ${primary.insight.toLowerCase()} ${stepMeta.coachingDirection}`;
}

function profileFromSignals(option, key, config = {}) {
  const signals = mergeSignals(STEP_DEFAULT_SIGNALS[key] || {}, config.signals || {});
  const primary = WORKING_STUDENT_SIGNAL_DEFINITIONS[primarySignalKey(signals)] || WORKING_STUDENT_SIGNAL_DEFINITIONS.budgetDiscipline;
  const stepMeta = STEP_DEFAULT_META[key] || STEP_DEFAULT_META.setup;
  return {
    title: config.title || display(option),
    meaning: config.meaning || buildMeaning(option, signals, key),
    signals,
    tags: Array.from(new Set([key, ...(config.tags || []), primarySignalKey(signals)])),
    pressureType: config.pressureType || stepMeta.pressureType,
    emotionalTone: config.emotionalTone || stepMeta.emotionalTone,
    financialInterpretation: config.financialInterpretation || stepMeta.financialInterpretation,
    snapshotInfluence: config.snapshotInfluence || Object.keys(signals),
    coachingDirection: config.coachingDirection || stepMeta.coachingDirection,
  };
}

const PROFILE_GROUPS = [
  {
    options: ["Mostly supported, trying to earn extra", "Allowance is the base, work is extra", "Fixed part-time pay for personal needs", "Manageable but inconsistent", "Enough control if I plan early", "I can pause when I plan early", "Build discipline before bigger responsibilities", "Save small without guilt", "Use extra income with purpose", "Control is still available", "I avoid strict tracking"],
    signals: { budgetDiscipline: 16, routineInstability: 6 },
    tags: ["supported_independence", "early_discipline"],
    pressureType: "growth",
    emotionalTone: "learning responsibility with support",
    financialInterpretation: "Support still exists, but independence and small money decisions are becoming more real.",
    coachingDirection: "Use simple limits while the student still has room to practice discipline.",
  },
  {
    options: ["Extra income disappears into small spending", "Manageable but leak-prone", "Busy enough to justify small rewards", "Social and school costs overlap", "Food, fare, and school extras", "Social or reward spending", "Social spending pressure", "Small rewards after school/work", "I spend small amounts without noticing", "I reward myself after effort", "Control small leaks", "Keep rewards but set limits", "Repeated small expenses", "Control micro-spending"],
    signals: { rewardSpendingRisk: 22, emotionalRecoveryDependence: 10, convenienceSpendingRisk: 6 },
    tags: ["small_leaks", "reward_spending", "student_social_pressure"],
    pressureType: "behavior",
    emotionalTone: "seeking small relief",
    financialInterpretation: "Repeated small purchases may be carrying comfort, social belonging, or recovery after effort.",
    coachingDirection: "Keep rewards visible and pre-limited before stress or social pressure decides the amount.",
  },
  {
    options: ["Working mainly to continue school", "Fixed work income for tuition", "Irregular income for school requirements", "Project/seasonal work before deadlines", "Allowance is not enough for school costs", "Class and work are both required", "School deadlines create work pressure", "Little room when fees are near", "Income waves around school deadlines", "Tuition and school payments", "Projects, printing, and materials", "Daily fare and food while attending", "Fear of stopping school", "I cut personal needs to pay school costs", "I delay non-school payments", "Protect school continuity", "Avoid debt from school pressure", "Keep food and fare stable", "Finish school safely", "Tuition or school deadlines"],
    signals: { tuitionPressure: 26, survivalPressure: 12, financialInstability: 8 },
    tags: ["school_continuity", "tuition_pressure", "education_protection"],
    pressureType: "school",
    emotionalTone: "protecting education",
    financialInterpretation: "Education costs are directly shaping spending choices and can make every peso feel tied to continuity.",
    coachingDirection: "Reserve school money, fare, and materials before any flexible spending.",
  },
  {
    options: ["Helping family while studying", "Part of my income goes home", "I give when family needs appear", "Allowance/work money gets shared", "I earn extra to support family", "School, work, and home needs overlap", "I feel responsible even when tired", "Family requests change the week", "I still try to keep school stable", "Family contribution", "Guilt when I protect my own money", "School costs competing with home needs", "Weak personal buffer", "I give even when my budget is tight", "I delay my own needs", "I hide money stress", "I try to set limits but feel guilty", "Help family without losing stability", "Set a support boundary", "Protect school and daily needs", "Build a personal safety buffer"],
    signals: { familyBurden: 26, survivalPressure: 10, emotionalFatigue: 8 },
    tags: ["family_responsibility", "shared_money", "boundary_pressure"],
    pressureType: "family",
    emotionalTone: "responsible but stretched",
    financialInterpretation: "Family support can share the same money needed for school, food, fare, and personal stability.",
    coachingDirection: "Create a support boundary that protects care and the student’s own essentials.",
  },
  {
    options: ["Trying to survive school mostly alone", "Fixed low-income work", "Irregular side hustle survival income", "Borrowing between pay cycles", "Project/seasonal income with gaps", "School and survival costs compete daily", "Food and fare need careful planning", "No room for surprise expenses", "I am tired but have to continue", "Food and transport survival", "No emergency margin", "Borrowing risk when timing fails", "I cut meals or needs to stretch money", "I avoid checking when money is low", "I borrow to survive the gap", "Build the smallest emergency buffer", "Stop survival borrowing", "Protect food and fare first", "Protect a tiny food/fare buffer"],
    signals: { survivalPressure: 28, borrowingRisk: 16, recoveryWeakness: 8 },
    tags: ["survival_mode", "food_fare_pressure", "thin_margin"],
    pressureType: "survival",
    emotionalTone: "stretched but continuing",
    financialInterpretation: "Daily essentials may be competing with school costs and leaving little room for mistakes.",
    coachingDirection: "Protect a tiny food/fare buffer before flexible spending.",
  },
  {
    options: ["Balancing school, work, and exhaustion", "Fixed pay but low recovery", "Irregular income plus heavy schedule", "Work shifts disrupt school rhythm", "Extra work happens when deadlines hit", "Heavy school-work overlap", "Little time to rest", "Commute drains energy", "Deadlines and shifts collide", "Convenience spending from exhaustion", "Rushed food and transport", "Missed tracking because I am tired", "Work-school schedule conflict", "I buy comfort after hard days", "I choose convenience to save energy", "I forget to track expenses", "I push rest aside", "Create low-energy money rules", "Reduce convenience leaks", "Protect rest as part of budgeting", "I take extra work even when tired", "I overwork when pressure hits", "Finish school without burning out"],
    signals: { emotionalFatigue: 24, recoveryWeakness: 18, mentalOverload: 14, convenienceSpendingRisk: 12, burnoutRisk: 10 },
    tags: ["exhaustion", "school_work_overlap", "low_recovery", "convenience_spending"],
    pressureType: "energy",
    emotionalTone: "drained but pushing through",
    financialInterpretation: "Money decisions may weaken when school and work are already using most of the student’s energy.",
    coachingDirection: "Use low-energy money rules and cheaper convenience options before pressure peaks.",
  },
  {
    options: ["Building a future while financially unstable", "Income changes month to month", "Side hustle income is growing slowly", "Support and work income both fluctuate", "Some weeks are strong, some are tight", "I am ambitious but stretched", "My routine changes often", "I am learning while earning", "Future pressure makes me anxious", "Unstable income rhythm", "Future goals feel far", "I do not know what to prioritize first", "I switch plans often", "I spend when I feel stuck", "I start saving then stop", "I need clearer priorities", "Create a simple money rhythm", "Protect future goals slowly", "Choose one priority first"],
    signals: { financialInstability: 24, routineInstability: 18, mentalOverload: 10, budgetDiscipline: 8 },
    tags: ["unstable_income", "future_pressure", "priority_confusion"],
    pressureType: "stability",
    emotionalTone: "ambitious but uncertain",
    financialInterpretation: "Income and routine changes can make progress feel inconsistent even when effort is present.",
    coachingDirection: "Choose one priority and build a simple rhythm around the actual income week.",
  },
  {
    options: ["Trying to recover from constant financial pressure", "Money arrives after expenses are due", "I borrow then repay repeatedly", "Income is unstable and pressure carries over", "Debt or delayed payments affect the week", "The month feels like repair mode", "Old pressure affects current choices", "I feel tired from catching up", "There is little room to reset", "Repayment pressure", "Cash-flow timing mismatch", "Borrowing again before the next income", "Avoiding money because it feels heavy", "I delay payments to survive", "I avoid checking the full picture", "I borrow again when daily costs hit", "I cut needs too much", "Stop pressure from stacking", "Build a no-new-debt rule", "Create a repayment rhythm"],
    signals: { pressureCarryover: 26, borrowingRisk: 22, financialInstability: 12, recoveryWeakness: 8 },
    tags: ["repair_mode", "debt_cycle", "cash_flow_mismatch"],
    pressureType: "recovery",
    emotionalTone: "catching up from old pressure",
    financialInterpretation: "Old shortfalls may already be shaping current spending and income timing.",
    coachingDirection: "Give repayment a small rhythm and prevent one new shortfall from stacking again.",
  },
];

const OPTION_PROFILE_OVERRIDES = {
  "Mostly supported, trying to earn extra": {
    title: "Learning independence with support",
    meaning: "You may still have support around you, but you are slowly learning what financial responsibility feels like. Many students in this stage become more careful with spending because independence starts feeling real.",
    signals: { budgetDiscipline: 18, routineInstability: 8, rewardSpendingRisk: 7 },
    tags: ["supported_independence", "early_money_maturity", "planning_signal"],
    pressureType: "growth",
    emotionalTone: "supported but becoming independent",
    financialInterpretation: "Support still exists, but personal money choices are becoming part of identity and responsibility.",
    coachingDirection: "Practice small limits and give extra money a clear purpose.",
  },
  "Working mainly to continue school": {
    title: "Working to protect school",
    meaning: "This usually means earning money is not about luxury; it is about keeping school possible. Tuition, projects, fare, food, and deadline pressure can make every peso feel connected to your future.",
    signals: { tuitionPressure: 30, survivalPressure: 16, financialInstability: 10 },
    tags: ["school_continuity", "tuition_pressure"],
    pressureType: "school",
    emotionalTone: "protecting education under pressure",
    financialInterpretation: "Work income is tied directly to keeping education moving.",
    coachingDirection: "Protect school payments and daily attendance costs first.",
  },
  "Helping family while studying": {
    title: "Studying while helping family",
    meaning: "This means your student life is also carrying home responsibility. Money decisions can feel emotional because helping others and protecting your own school needs may happen at the same time.",
    signals: { familyBurden: 34, survivalPressure: 14, emotionalFatigue: 8 },
    tags: ["family_responsibility", "shared_money"],
    pressureType: "family",
    emotionalTone: "caring but pressured",
    financialInterpretation: "Family responsibility can compete with school continuity and personal essentials.",
    coachingDirection: "Set a support boundary that protects both family care and school stability.",
  },
  "Trying to survive school mostly alone": {
    title: "Mostly self-supporting",
    meaning: "This means you are carrying a larger part of school and daily survival yourself. Decisions often become less about comfort and more about stability, timing, and avoiding setbacks.",
    signals: { survivalPressure: 32, financialInstability: 20, borrowingRisk: 13, recoveryWeakness: 10 },
    tags: ["self_supporting", "survival_pressure"],
    pressureType: "survival",
    emotionalTone: "independent but stretched",
    financialInterpretation: "Daily survival and school progress may depend on the same limited money pool.",
    coachingDirection: "Protect food, fare, and a tiny buffer before anything flexible.",
  },
  "Balancing school, work, and exhaustion": {
    title: "Exhausted by school-work overlap",
    meaning: "This means your schedule may be using the same energy that your money discipline needs. When school and work overlap heavily, convenience spending and missed tracking can happen simply because you are tired.",
    signals: { emotionalFatigue: 30, mentalOverload: 24, recoveryWeakness: 18, convenienceSpendingRisk: 16, burnoutRisk: 16 },
    tags: ["exhaustion", "school_work_overlap", "low_recovery"],
    pressureType: "energy",
    emotionalTone: "tired but still continuing",
    financialInterpretation: "Energy pressure can become money pressure through convenience, comfort, and missed tracking.",
    coachingDirection: "Make the budget usable on tired days, not only on ideal days.",
  },
  "Building a future while financially unstable": {
    title: "Building with unstable income",
    meaning: "This means you are trying to move forward even when money does not arrive in a predictable rhythm. Planning can feel harder because strong weeks and tight weeks ask for different decisions.",
    signals: { financialInstability: 28, routineInstability: 18, mentalOverload: 10, budgetDiscipline: 8 },
    tags: ["unstable_income", "future_building"],
    pressureType: "stability",
    emotionalTone: "hopeful but uncertain",
    financialInterpretation: "Future goals are present, but uneven money rhythm makes consistency harder.",
    coachingDirection: "Use flexible rules that adjust between strong and tight weeks.",
  },
  "Trying to recover from constant financial pressure": {
    title: "Recovering from money pressure",
    meaning: "This means old financial pressure may still be affecting the current week. Borrowing, delayed payments, or cash-flow gaps can make life feel like repair mode even when you are trying to reset.",
    signals: { pressureCarryover: 30, borrowingRisk: 22, financialInstability: 16, recoveryWeakness: 12 },
    tags: ["repair_mode", "old_pressure", "cash_flow_gap"],
    pressureType: "recovery",
    emotionalTone: "trying to reset",
    financialInterpretation: "Current choices may already be influenced by old shortfalls or repayment timing.",
    coachingDirection: "Stop pressure from stacking before chasing a perfect reset.",
  },
};

function buildWorkingStudentOptionProfiles() {
  const profiles = {};
  getAllWorkingStudentOptions().forEach((option) => {
    const key = getOptionStep(option);
    profiles[option] = profileFromSignals(option, key);
  });

  PROFILE_GROUPS.forEach((group) => {
    group.options.forEach((option) => {
      const canonical = canonicalizeOption(option);
      const key = getOptionStep(canonical);
      const current = profiles[canonical] || profileFromSignals(canonical, key);
      profiles[canonical] = {
        ...current,
        signals: mergeSignals(current.signals, group.signals),
        tags: Array.from(new Set([...(current.tags || []), ...(group.tags || [])])),
        pressureType: group.pressureType || current.pressureType,
        emotionalTone: group.emotionalTone || current.emotionalTone,
        financialInterpretation: group.financialInterpretation || current.financialInterpretation,
        coachingDirection: group.coachingDirection || current.coachingDirection,
      };
      profiles[canonical].meaning = current.meaning && current.meaning !== buildMeaning(canonical, current.signals, key)
        ? current.meaning
        : buildMeaning(canonical, profiles[canonical].signals, key);
      profiles[display(canonical)] = profiles[canonical];
    });
  });

  Object.entries(OPTION_PROFILE_OVERRIDES).forEach(([option, override]) => {
    const canonical = canonicalizeOption(option);
    const key = getOptionStep(canonical);
    profiles[canonical] = profileFromSignals(canonical, key, override);
    profiles[display(canonical)] = profiles[canonical];
  });

  Object.entries(WORKING_STUDENT_DISPLAY_LABELS).forEach(([raw, label]) => {
    if (profiles[raw]) profiles[label] = profiles[raw];
  });

  return profiles;
}

export const WORKING_STUDENT_OPTION_PROFILES = buildWorkingStudentOptionProfiles();

export const WORKING_STUDENT_SIGNAL_CATEGORIES = Object.fromEntries(
  Object.entries(WORKING_STUDENT_SNAPSHOT_BOUNDARIES).map(([key, item]) => [WORKING_STUDENT_SIGNAL_DEFINITIONS[key]?.label, item.family]).filter(([label]) => Boolean(label))
);

export const WORKING_STUDENT_CARD_NOTES = Object.fromEntries(
  Object.values(WORKING_STUDENT_SIGNAL_DEFINITIONS).map((item) => [item.label, item.note])
);

export const WORKING_STUDENT_MODAL_INSIGHTS = Object.fromEntries(
  Object.values(WORKING_STUDENT_SIGNAL_DEFINITIONS).map((item) => [
    item.label,
    { insight: item.note, signal: item.insight, move: item.action },
  ])
);

export const WORKING_STUDENT_OPTION_MEANINGS = Object.fromEntries(
  Object.entries(WORKING_STUDENT_OPTION_PROFILES).map(([key, profile]) => [
    key,
    { title: profile.title, meaning: profile.meaning, signals: profile.signals },
  ])
);

export const workingStudentBehaviorEngine = {
  stage: WORKING_STUDENT_STAGE_KEY,
  questions: WORKING_STUDENT_QUESTION_ORDER,
  options: WORKING_STUDENT_BRANCHES,
  displayLabels: WORKING_STUDENT_DISPLAY_LABELS,
  optionProfiles: WORKING_STUDENT_OPTION_PROFILES,
  optionMeanings: WORKING_STUDENT_OPTION_MEANINGS,
  signalDefinitions: WORKING_STUDENT_SIGNAL_DEFINITIONS,
  snapshotBoundaries: WORKING_STUDENT_SNAPSHOT_BOUNDARIES,
};

function fallbackUnknownOptionProfile(value, key = "setup") {
  const canonical = canonicalizeOption(value);
  return profileFromSignals(canonical, key, {
    title: display(canonical) || "Working Student signal",
    meaning: "This choice is not yet mapped, so CLARA will treat it as a light Working Student signal until a structured profile is added.",
    signals: STEP_DEFAULT_SIGNALS[key] || { budgetDiscipline: 4 },
    tags: ["unknown_fallback", key],
    pressureType: STEP_DEFAULT_META[key]?.pressureType || "environment",
    emotionalTone: "still being understood",
    financialInterpretation: STEP_DEFAULT_META[key]?.financialInterpretation || "This answer needs a structured profile.",
    coachingDirection: STEP_DEFAULT_META[key]?.coachingDirection || "Add a structured profile for this option.",
  });
}

export function getWorkingStudentOptionProfile(value, key = "setup") {
  const canonical = canonicalizeOption(value);
  return WORKING_STUDENT_OPTION_PROFILES[canonical] || WORKING_STUDENT_OPTION_PROFILES[display(canonical)] || fallbackUnknownOptionProfile(canonical, key);
}

function getLastAnsweredKey(answers = {}) {
  return [...WORKING_STUDENT_QUESTION_ORDER].reverse().find((key) => cleanWorkingStudentValue(answers[key])) || "setup";
}

function getProgressKeys(rawAnswers = {}, currentKey = "setup") {
  const currentIndex = Math.max(0, WORKING_STUDENT_QUESTION_ORDER.indexOf(currentKey));
  return WORKING_STUDENT_QUESTION_ORDER.slice(0, currentIndex + 1).filter((key) => cleanWorkingStudentValue(rawAnswers[key]));
}

function buildAnswerProfiles(answers = {}, keys = WORKING_STUDENT_QUESTION_ORDER) {
  return keys
    .filter((key) => cleanWorkingStudentValue(answers[key]))
    .map((key) => {
      const value = canonicalizeOption(answers[key]);
      const profile = getWorkingStudentOptionProfile(value, key);
      return {
        key,
        value,
        displayLabel: getWorkingStudentDisplayLabel(value),
        title: profile.title,
        meaning: profile.meaning,
        signals: profile.signals,
        tags: profile.tags,
        pressureType: profile.pressureType,
        emotionalTone: profile.emotionalTone,
        financialInterpretation: profile.financialInterpretation,
        coachingDirection: profile.coachingDirection,
      };
    });
}

function collectSignalsFromProfiles(answerProfiles = []) {
  const signals = {};
  answerProfiles.forEach((profile) => addSignals(signals, profile.signals));
  return signals;
}

function buildProgressiveSignals(rawAnswers = {}, selectedAnswers = {}, currentKey = "setup") {
  const progressiveSignals = {};
  const memory = [];
  const progressKeys = getProgressKeys(rawAnswers, currentKey);
  buildAnswerProfiles({ ...selectedAnswers, ...rawAnswers }, progressKeys).forEach((profile) => {
    addSignals(progressiveSignals, profile.signals);
    memory.push({
      key: profile.key,
      value: profile.value,
      label: profile.displayLabel,
      title: profile.title,
      body: profile.meaning,
      tags: profile.tags,
      pressureType: profile.pressureType,
      emotionalTone: profile.emotionalTone,
      financialInterpretation: profile.financialInterpretation,
      coachingDirection: profile.coachingDirection,
    });
  });
  return { progressiveSignals, memory };
}

function topSignalRows(signalMap = {}, limit = 3) {
  return Object.entries(signalMap)
    .map(([key, value]) => ({ key, value: Math.max(0, Number(value) || 0), ...(WORKING_STUDENT_SIGNAL_DEFINITIONS[key] || {}) }))
    .filter((item) => item.value > 0 && item.label)
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function joinLabels(items = []) {
  const labels = items.map((item) => item.label).filter(Boolean);
  if (labels.length <= 1) return labels[0] || "your current situation";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function buildBehavioralMemory(rawAnswers = {}, selectedAnswers = {}, currentKey = "setup", progressiveSignals = {}) {
  const progressKeys = getProgressKeys(rawAnswers, currentKey);
  const answered = progressKeys.map((key) => ({
    key,
    value: canonicalizeOption(rawAnswers[key] || selectedAnswers[key]),
    label: getWorkingStudentDisplayLabel(rawAnswers[key] || selectedAnswers[key]),
  }));
  const dominantSignals = topSignalRows(progressiveSignals, 4).map((item) => ({ key: item.key, label: item.label, value: item.value }));
  return {
    step: currentKey,
    depth: answered.length,
    answered,
    dominantSignals,
    stabilityState: dominantSignals.find((item) => ["Financial Instability", "Routine Instability", "Budget Discipline"].includes(item.label))?.label || "Still forming",
    emotionalStrain: dominantSignals.find((item) => ["Emotional Fatigue", "Recovery Weakness", "Mental Overload", "Burnout Risk"].includes(item.label))?.label || "Still forming",
    protectionPriority: dominantSignals.find((item) => ["Tuition Pressure", "Survival Pressure", "Family Burden", "Borrowing Risk", "Pressure Carryover"].includes(item.label))?.label || "Still forming",
  };
}

function buildContinuityContext(rawAnswers = {}, selectedAnswers = {}, currentKey = "setup", currentProfile, behavioralMemory, progressiveSignals = {}) {
  const progressKeys = getProgressKeys(rawAnswers, currentKey);
  const setupLabel = getWorkingStudentDisplayLabel(rawAnswers.setup || selectedAnswers.setup);
  const rhythmLabel = getWorkingStudentDisplayLabel(rawAnswers.rhythm || selectedAnswers.rhythm);
  const workloadLabel = getWorkingStudentDisplayLabel(rawAnswers.workload || selectedAnswers.workload);
  const pressureLabel = getWorkingStudentDisplayLabel(rawAnswers.pressure || selectedAnswers.pressure);
  const topSignals = topSignalRows(progressiveSignals, 3);
  const signalText = joinLabels(topSignals);

  if (progressKeys.length <= 1 || currentKey === "setup") {
    return { title: currentProfile.title, body: currentProfile.meaning };
  }

  const templates = {
    rhythm: `Because your starting setup already points to ${setupLabel}, this money rhythm adds a clearer financial layer. ${currentProfile.meaning} CLARA should now read this as part of ${signalText.toLowerCase()}, not as a separate answer.`,
    workload: `With ${setupLabel} and ${rhythmLabel} already in the picture, this workload answer shows how much energy the situation may be using. ${currentProfile.meaning} The money pattern now connects to time, routine, and recovery, not just income.`,
    pressure: `Because your setup, money rhythm, and weekly load are already connected, this pressure answer shows what is becoming hardest to protect. ${currentProfile.meaning} CLARA should watch ${signalText.toLowerCase()} as the current real-life pressure pattern.`,
    coping: `Given the pressure around ${pressureLabel}, this response shows how you may try to survive heavier days. ${currentProfile.meaning} The important part is that this behavior is reacting to your situation, not standing alone.`,
    goal: `After seeing ${setupLabel}, ${rhythmLabel}, ${workloadLabel}, and ${pressureLabel}, this protection goal shows what your system needs to guard first. ${currentProfile.meaning} Final guidance should protect ${signalText.toLowerCase()} before asking for perfect discipline.`,
  };

  return {
    title: `${currentProfile.title} in context`,
    body: templates[currentKey] || `${currentProfile.meaning} CLARA is connecting this answer with the earlier pattern so the interpretation keeps building instead of restarting.`,
    memory: behavioralMemory,
  };
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

function hasProfileTag(answerProfiles = [], tag) {
  return answerProfiles.some((profile) => (profile.tags || []).includes(tag));
}

function hasPressureType(answerProfiles = [], pressureType) {
  return answerProfiles.some((profile) => profile.pressureType === pressureType);
}

function scoreOf(rawSignals = {}, key) {
  return Math.max(0, Number(rawSignals[key]) || 0);
}

function secondaryInsightFor(suppressedKey, visibleKey) {
  const suppressed = WORKING_STUDENT_SIGNAL_DEFINITIONS[suppressedKey]?.label || suppressedKey;
  const visible = WORKING_STUDENT_SIGNAL_DEFINITIONS[visibleKey]?.label || visibleKey;
  return `${suppressed} is also present, but CLARA grouped it under ${visible} to keep the snapshot clean and non-repetitive.`;
}

function shouldShowCompoundedSignal(key, rawSignals, answerProfiles) {
  if (key === "burnoutRisk") {
    return scoreOf(rawSignals, "emotionalFatigue") >= 34 && scoreOf(rawSignals, "recoveryWeakness") >= 24 && (scoreOf(rawSignals, "mentalOverload") >= 18 || scoreOf(rawSignals, "survivalPressure") >= 18);
  }
  if (key === "emotionalRecoveryDependence") {
    return scoreOf(rawSignals, "rewardSpendingRisk") >= 20 && (scoreOf(rawSignals, "recoveryWeakness") >= 16 || scoreOf(rawSignals, "emotionalFatigue") >= 20) && scoreOf(rawSignals, key) > scoreOf(rawSignals, "rewardSpendingRisk");
  }
  if (key === "pressureCarryover") {
    return (scoreOf(rawSignals, "borrowingRisk") >= 14 || scoreOf(rawSignals, "financialInstability") >= 18) && (hasProfileTag(answerProfiles, "repair_mode") || hasProfileTag(answerProfiles, "debt_cycle") || hasProfileTag(answerProfiles, "cash_flow_mismatch") || hasPressureType(answerProfiles, "recovery"));
  }
  if (key === "budgetDiscipline") {
    const hasPlanningSignal = ["planning_signal", "early_discipline", "supported_independence", "future_building", "priority_confusion"].some((tag) => hasProfileTag(answerProfiles, tag)) || hasPressureType(answerProfiles, "growth") || hasPressureType(answerProfiles, "protection");
    const urgentPressure = Math.max(scoreOf(rawSignals, "survivalPressure"), scoreOf(rawSignals, "tuitionPressure"), scoreOf(rawSignals, "borrowingRisk"));
    return hasPlanningSignal && scoreOf(rawSignals, key) >= Math.max(12, urgentPressure * 0.45);
  }
  return true;
}

function preferredSuppressTarget(key, rawSignals) {
  const targetMap = {
    burnoutRisk: ["emotionalFatigue", "recoveryWeakness", "mentalOverload"],
    recoveryWeakness: ["emotionalFatigue", "burnoutRisk"],
    mentalOverload: ["emotionalFatigue", "burnoutRisk", "routineInstability"],
    emotionalRecoveryDependence: ["rewardSpendingRisk", "recoveryWeakness", "emotionalFatigue"],
    routineInstability: ["financialInstability", "mentalOverload"],
    pressureCarryover: ["borrowingRisk", "financialInstability"],
    borrowingRisk: ["pressureCarryover", "survivalPressure"],
    budgetDiscipline: ["survivalPressure", "financialInstability"],
  };
  return (targetMap[key] || [])
    .filter((target) => scoreOf(rawSignals, target) > 0)
    .sort((a, b) => scoreOf(rawSignals, b) - scoreOf(rawSignals, a))[0];
}

function createSnapshotCandidate(key, raw) {
  const definition = WORKING_STUDENT_SIGNAL_DEFINITIONS[key];
  const boundary = WORKING_STUDENT_SNAPSHOT_BOUNDARIES[key] || {};
  return {
    key,
    raw,
    label: definition?.label,
    category: boundary.family || definition?.category || "stability",
    note: definition?.note,
    insight: definition?.insight,
    action: definition?.action,
    trendType: definition?.trendType,
    role: boundary.role,
    suppressedSignals: [],
    secondaryInsights: [],
    boundary,
  };
}

export function resolveWorkingStudentSnapshotCandidates(rawSignals = {}, answerProfiles = []) {
  const candidateMap = {};
  const suppressedMap = {};

  const suppressInto = (sourceKey, targetKey, reason) => {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    suppressedMap[targetKey] = suppressedMap[targetKey] || [];
    suppressedMap[targetKey].push({ sourceKey, reason: reason || secondaryInsightFor(sourceKey, targetKey) });
  };

  Object.entries(rawSignals).forEach(([key, rawValue]) => {
    const raw = Math.max(0, Number(rawValue) || 0);
    if (!raw || !WORKING_STUDENT_SIGNAL_DEFINITIONS[key]) return;
    if (!shouldShowCompoundedSignal(key, rawSignals, answerProfiles)) {
      suppressInto(key, preferredSuppressTarget(key, rawSignals), secondaryInsightFor(key, preferredSuppressTarget(key, rawSignals)));
      return;
    }
    candidateMap[key] = createSnapshotCandidate(key, raw);
  });

  if (candidateMap.burnoutRisk) {
    ["emotionalFatigue", "recoveryWeakness", "mentalOverload"].forEach((key) => {
      if (candidateMap[key] && candidateMap[key].raw < candidateMap.burnoutRisk.raw * 0.92) {
        suppressInto(key, "burnoutRisk", secondaryInsightFor(key, "burnoutRisk"));
        delete candidateMap[key];
      }
    });
  }

  if (candidateMap.rewardSpendingRisk && candidateMap.emotionalRecoveryDependence && candidateMap.emotionalRecoveryDependence.raw <= candidateMap.rewardSpendingRisk.raw * 1.15) {
    suppressInto("emotionalRecoveryDependence", "rewardSpendingRisk", secondaryInsightFor("emotionalRecoveryDependence", "rewardSpendingRisk"));
    delete candidateMap.emotionalRecoveryDependence;
  }

  if (candidateMap.borrowingRisk && candidateMap.pressureCarryover) {
    const keep = hasPressureType(answerProfiles, "recovery") || hasProfileTag(answerProfiles, "repair_mode") ? "pressureCarryover" : "borrowingRisk";
    const drop = keep === "pressureCarryover" ? "borrowingRisk" : "pressureCarryover";
    if (candidateMap[drop].raw < candidateMap[keep].raw * 1.2) {
      suppressInto(drop, keep, secondaryInsightFor(drop, keep));
      delete candidateMap[drop];
    }
  }

  if (candidateMap.survivalPressure && candidateMap.tuitionPressure) {
    const survivalStrong = hasPressureType(answerProfiles, "survival") || hasProfileTag(answerProfiles, "food_fare_pressure") || candidateMap.survivalPressure.raw >= 34;
    const tuitionStrong = hasPressureType(answerProfiles, "school") || hasProfileTag(answerProfiles, "tuition_pressure") || candidateMap.tuitionPressure.raw >= 34;
    if (!(survivalStrong && tuitionStrong)) {
      const keep = candidateMap.survivalPressure.raw >= candidateMap.tuitionPressure.raw ? "survivalPressure" : "tuitionPressure";
      const drop = keep === "survivalPressure" ? "tuitionPressure" : "survivalPressure";
      suppressInto(drop, keep, secondaryInsightFor(drop, keep));
      delete candidateMap[drop];
    }
  }

  let candidates = Object.values(candidateMap).sort((a, b) => {
    const boundaryA = WORKING_STUDENT_SNAPSHOT_BOUNDARIES[a.key] || {};
    const boundaryB = WORKING_STUDENT_SNAPSHOT_BOUNDARIES[b.key] || {};
    return b.raw - a.raw || (boundaryB.priority || 0) - (boundaryA.priority || 0) || a.label.localeCompare(b.label);
  });

  const visible = [];
  const familyCounts = {};
  let compoundedUsed = false;

  candidates.forEach((candidate) => {
    const boundary = WORKING_STUDENT_SNAPSHOT_BOUNDARIES[candidate.key] || {};
    const family = boundary.family || candidate.category || "stability";
    const target = visible.find((item) => item.category === family) || visible[0];
    if (boundary.compounded && compoundedUsed) {
      suppressInto(candidate.key, target?.key, secondaryInsightFor(candidate.key, target?.key));
      return;
    }
    if ((familyCounts[family] || 0) >= 2) {
      suppressInto(candidate.key, target?.key, secondaryInsightFor(candidate.key, target?.key));
      return;
    }
    visible.push(candidate);
    familyCounts[family] = (familyCounts[family] || 0) + 1;
    if (boundary.compounded) compoundedUsed = true;
  });

  while (visible.length > 4) {
    const extra = visible.pop();
    const target = visible.find((item) => item.category === extra.category) || visible[0];
    suppressInto(extra.key, target?.key, secondaryInsightFor(extra.key, target?.key));
  }

  const finalCandidates = visible.map((candidate) => {
    const suppressed = suppressedMap[candidate.key] || [];
    return {
      ...candidate,
      suppressedSignals: suppressed.map((item) => item.sourceKey),
      secondaryInsights: suppressed.map((item) => item.reason),
    };
  });

  if (finalCandidates.length) return finalCandidates;
  return Object.entries(rawSignals)
    .map(([key, raw]) => createSnapshotCandidate(key, Math.max(0, Number(raw) || 0)))
    .filter((item) => item.raw > 0 && item.label)
    .sort((a, b) => b.raw - a.raw)
    .slice(0, 4);
}

function buildSnapshotDistribution(signals = {}, answerProfiles = []) {
  const candidates = resolveWorkingStudentSnapshotCandidates(signals, answerProfiles);
  return normalizeDistribution(candidates).map((item) => {
    const secondaryText = (item.secondaryInsights || []).join(" ");
    return {
      key: item.key,
      label: item.label,
      value: item.value,
      status: distributionStatus(item.value),
      category: item.category,
      note: item.note,
      insight: secondaryText ? `${item.insight} ${secondaryText}` : item.insight,
      action: item.action,
      trendType: item.trendType,
      role: item.role,
      suppressedSignals: item.suppressedSignals || [],
      secondaryInsights: item.secondaryInsights || [],
    };
  });
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

function summarizeProfiles(answerProfiles = []) {
  const tags = Array.from(new Set(answerProfiles.flatMap((profile) => profile.tags || [])));
  const tones = Array.from(new Set(answerProfiles.map((profile) => profile.emotionalTone).filter(Boolean)));
  const interpretations = answerProfiles.map((profile) => profile.financialInterpretation).filter(Boolean);
  const coachingDirections = answerProfiles.map((profile) => profile.coachingDirection).filter(Boolean);
  return { tags, tones, interpretations, coachingDirections };
}

function buildAiPayload(answers, answerProfiles, signals, distribution, evolvedSummary, behavioralMemory) {
  const profileSummary = summarizeProfiles(answerProfiles);
  return {
    stage: WORKING_STUDENT_STAGE_KEY,
    answers,
    answerProfiles,
    behavioralMemory,
    dominantSignals: distribution.map((item) => ({ key: item.key, label: item.label, value: item.value })),
    tags: profileSummary.tags,
    emotionalTone: profileSummary.tones.slice(0, 3).join(" + ") || "still being understood",
    financialInterpretation: profileSummary.interpretations.slice(0, 3),
    recommendedCoachingDirection: distribution[0]?.action || profileSummary.coachingDirections[0] || "Start with one small protection rule for the current week.",
    summary: evolvedSummary.body,
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

export function validateWorkingStudentOptionProfiles() {
  const allOptions = getAllWorkingStudentOptions();
  const missingProfiles = allOptions.filter((option) => !WORKING_STUDENT_OPTION_PROFILES[option]);
  const invalidSignals = [];
  allOptions.forEach((option) => {
    const profile = WORKING_STUDENT_OPTION_PROFILES[option];
    if (!profile) return;
    if (!profile.signals || !Object.keys(profile.signals).length) invalidSignals.push({ option, signal: "NO_SIGNALS" });
    Object.keys(profile.signals || {}).forEach((signalKey) => {
      if (!WORKING_STUDENT_SIGNAL_DEFINITIONS[signalKey]) invalidSignals.push({ option, signal: signalKey });
    });
  });
  return { valid: missingProfiles.length === 0 && invalidSignals.length === 0, missingProfiles, invalidSignals };
}

export function getWorkingStudentBehaviorProfile(rawAnswers = {}, options = {}) {
  const selectedAnswers = completeWorkingStudentDraft({ ...rawAnswers, stage: WORKING_STUDENT_STAGE_KEY });
  const currentKey = options.currentQuestionKey || getLastAnsweredKey(rawAnswers);
  const currentValue = rawAnswers[currentKey] || selectedAnswers[currentKey];
  const currentProfile = getWorkingStudentOptionProfile(currentValue, currentKey);
  const answerProfiles = buildAnswerProfiles(selectedAnswers);
  const signals = collectSignalsFromProfiles(answerProfiles);

  if (!Object.keys(signals).length) addSignals(signals, { budgetDiscipline: 34, routineInstability: 26, financialInstability: 22, recoveryWeakness: 18 });

  const { progressiveSignals, memory } = buildProgressiveSignals(rawAnswers, selectedAnswers, currentKey);
  const behavioralMemory = buildBehavioralMemory(rawAnswers, selectedAnswers, currentKey, progressiveSignals);
  const currentContext = buildContinuityContext(rawAnswers, selectedAnswers, currentKey, currentProfile, behavioralMemory, progressiveSignals);
  const snapshotDistribution = buildSnapshotDistribution(signals, answerProfiles);
  const evolvedSummary = buildEvolvedSummary(selectedAnswers, snapshotDistribution);

  return {
    stage: WORKING_STUDENT_STAGE_KEY,
    selectedAnswers,
    answerProfiles,
    currentContext,
    evolvedSummary,
    behavioralMemory: { ...behavioralMemory, memory },
    signals,
    progressiveSignals,
    snapshotDistribution,
    aiPayload: buildAiPayload(selectedAnswers, answerProfiles, signals, snapshotDistribution, evolvedSummary, behavioralMemory),
  };
}

export function normalizeWorkingStudentInfluenceSplit(weights = {}) {
  const rows = Object.entries(weights).map(([label, raw]) => {
    const definition = Object.values(WORKING_STUDENT_SIGNAL_DEFINITIONS).find((item) => item.label === label) || {};
    return { label, raw: Math.max(0, Number(raw) || 0), ...definition };
  });
  return normalizeDistribution(rows).map((item) => ({ label: item.label, value: item.value, category: item.category || "stability", note: item.note || "CLARA pressure split signal." }));
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
    caption: dominant.note || "CLARA is reading how school, work, money timing, energy, and responsibility currently share the student’s pressure.",
    overview: behavior.evolvedSummary.body,
    hero: behavior.evolvedSummary.body,
    supportTitle: behavior.evolvedSummary.headline,
    supportBody: secondary.label ? `${dominant.label} is the largest share, while ${secondary.label} is also visible in the pattern.` : "CLARA is building the current Working Student pressure distribution.",
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
      role: item.role,
      suppressedSignals: item.suppressedSignals,
      secondaryInsights: item.secondaryInsights,
    })),
  };
}

export function getWorkingStudentQuestionContext(key, value, draft = {}) {
  const behavior = getWorkingStudentBehaviorProfile({ ...draft, [key]: value, stage: WORKING_STUDENT_STAGE_KEY }, { currentQuestionKey: key });
  return { key, value: canonicalizeOption(value), title: behavior.currentContext.title, summary: behavior.currentContext.body, body: behavior.currentContext.body };
}

export function buildWorkingStudentDraft(previous = {}) {
  return completeWorkingStudentDraft({ ...previous, stage: WORKING_STUDENT_STAGE_KEY });
}

export const WORKING_STUDENT_LIFE_STAGE_SOURCE = {
  stage: WORKING_STUDENT_STAGE_KEY,
  roots: WORKING_STUDENT_ROOTS,
  branches: WORKING_STUDENT_BRANCHES,
  displayLabels: WORKING_STUDENT_DISPLAY_LABELS,
  optionProfiles: WORKING_STUDENT_OPTION_PROFILES,
  optionMeanings: WORKING_STUDENT_OPTION_MEANINGS,
  signalDefinitions: WORKING_STUDENT_SIGNAL_DEFINITIONS,
  snapshotBoundaries: WORKING_STUDENT_SNAPSHOT_BOUNDARIES,
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
    getWorkingStudentOptionProfile,
    getWorkingStudentBehaviorProfile,
    resolveWorkingStudentSnapshotCandidates,
    validateWorkingStudentOptionProfiles,
    normalizeWorkingStudentInfluenceSplit,
    getWorkingStudentScores,
    getWorkingStudentArchetype,
    getWorkingStudentSnapshot,
    getWorkingStudentQuestionContext,
    buildWorkingStudentDraft,
  },
};

export default WORKING_STUDENT_LIFE_STAGE_SOURCE;
