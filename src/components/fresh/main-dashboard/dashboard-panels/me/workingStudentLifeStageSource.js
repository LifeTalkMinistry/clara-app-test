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

const context = (title, summary) => ({ title, summary });

export const WORKING_STUDENT_CONTEXT_COPY = {
  "Mostly supported, trying to earn extra": context("Supported independence", "CLARA sees support in your environment, but also a chance to build discipline early. This path should watch small leaks, social pressure, and how extra income disappears before it becomes useful."),
  "Working mainly to continue school": context("School protection path", "CLARA sees school continuity as the anchor. The goal is not strict saving first; it is protecting tuition, projects, food, fare, and deadlines so school does not get interrupted."),
  "Helping family while studying": context("Shared responsibility path", "CLARA sees a student role and a support role happening together. This path needs care, but also boundaries so family help does not quietly weaken school stability."),
  "Trying to survive school mostly alone": context("Self-support survival path", "CLARA sees limited backup and smaller room for mistakes. The first protection is food, fare, school needs, and a tiny buffer before aggressive goals."),
  "Balancing school, work, and exhaustion": context("Energy-pressure path", "CLARA sees time and energy turning into money pressure. This path should watch convenience spending, missed tracking, and recovery needs without blaming the user."),
  "Building a future while financially unstable": context("Future-builder path", "CLARA sees ambition with unstable rhythm. This path is not crisis by default; it needs one clear priority, small repeatable wins, and protection from micro-spending."),
  "Trying to recover from constant financial pressure": context("Recovery path", "CLARA sees pressure carrying over from previous weeks. This path should lower the repair-mode feeling through repayment rhythm, no-new-debt rules, and a tiny food/fare buffer."),
  "Enough control if I plan early": context("Control signal", "CLARA sees this as a good moment to build rhythm before pressure grows. The user still has room to choose, not just react."),
  "I can pause when I plan early": context("Planning control", "CLARA sees a protective habit: when the user prepares early, spending decisions become calmer and less reactive."),
  "Finish school without burning out": context("Graduation with recovery", "CLARA should protect both the school goal and the user's energy. Finishing should not require breaking down."),
  "Build the smallest emergency buffer": context("Tiny buffer first", "CLARA should start with the smallest realistic protection layer. For this path, even food/fare backup can create emotional relief."),
  "Create low-energy money rules": context("Low-energy rules", "CLARA should not demand perfect tracking from an exhausted user. The better move is a simple rule that still works on tired days."),
  "Choose one priority first": context("One priority first", "CLARA sees priority confusion as the real pressure. The next step is not doing everything; it is choosing one thing to protect first."),
  "Create a repayment rhythm": context("Repayment rhythm", "CLARA should reduce repair mode by making repayment predictable, even if the amount starts small."),
  "Food, fare, and school extras": context("Daily student-cost pressure", "CLARA sees food, fare, and school extras as repeated costs that can quietly shape the whole week."),
  "Tuition and school payments": context("Tuition-first pressure", "CLARA sees school payments as the anchor pressure because they directly affect continuity, attendance, and future stability."),
  "Family contribution": context("Family support pressure", "CLARA reads support as a real financial load, not just generosity. The safest plan sets a boundary before school, food, transport, and recovery get weakened."),
  "Convenience spending from exhaustion": context("Exhaustion-to-convenience signal", "CLARA sees time and recovery pressure turning into convenience costs. The user needs lower-friction rules, not stricter guilt."),
  "Repayment pressure": context("Repayment pressure", "CLARA sees repayment timing as a first-priority signal because old pressure can control the current week."),
  "I reward myself after effort": context("Relief spending signal", "CLARA reads this as recovery seeking. The problem is not one reward; the risk is repeated relief spending becoming the easiest way to end a hard day."),
  "I borrow to survive the gap": context("Borrowing gap signal", "CLARA reads this as a cash-flow timing problem. The system should detect the gap earlier so borrowing does not become the normal bridge."),
  "I choose convenience to save energy": context("Low-energy response", "CLARA reads convenience as an energy-saving response. The better move is to prepare one cheaper low-energy option before pressure hits."),
  "I need clearer priorities": context("Priority clarity signal", "CLARA sees unclear priority order as the pressure. The next move is to choose one thing to protect first."),
};

export const WORKING_STUDENT_SIGNAL_CATEGORIES = {
  "Essential-Cost Load": "pressure",
  "Recovery Gap": "energy",
  "Cash Buffer Risk": "stability",
  "Stability Potential": "growth",
  "Shared-Money Pressure": "pressure",
  "Responsibility Load": "energy",
  "Boundary Risk": "stability",
  "Support Balance": "growth",
  "Fatigue Load": "energy",
  "Schedule-Cost Pressure": "pressure",
  "Convenience Spend Risk": "stability",
  "Recovery Potential": "growth",
  "Repayment Pressure": "pressure",
  "Debt Stress Load": "energy",
  "Cash-Flow Stability": "stability",
  "Reward Frequency Risk": "stability",
  "Emotional Fatigue": "energy",
  "Daily Pressure": "pressure",
  "Reward Control": "growth",
  "Essential Pressure": "pressure",
  "Independence Load": "energy",
  "Buffer Stability": "stability",
  "Discipline Potential": "growth",
  "Fatigue Watch": "energy",
  "Cost Pressure": "pressure",
  "Routine Stability": "stability",
  "Future Potential": "growth",
  "Burnout Watch": "energy",
  "Financial Pressure": "pressure",
  "Micro-Spend Risk": "stability",
};

export const WORKING_STUDENT_CARD_NOTES = {
  "Recovery Gap": "Low recovery can turn normal spending into shortcut decisions: late food, rushed rides, skipped tracking, and small comfort buys.",
  "Essential-Cost Load": "School fees, fare, meals, mobile data, and project costs are the core load because they directly affect attendance and stability.",
  "Cash Buffer Risk": "One surprise fare, project, food gap, or payment delay can disturb the whole week when no tiny buffer exists.",
  "Stability Potential": "Stability improves when essentials are separated first and weekly caps match real student life instead of perfect-budget pressure.",
  "Responsibility Load": "Family-linked responsibility can drain the same income and energy that school also needs.",
  "Shared-Money Pressure": "Family help becomes heavy when requests overlap with tuition, transport, meals, or urgent school needs.",
  "Boundary Risk": "The risk is support without structure: helping until personal food, fare, school, or rest becomes unstable.",
  "Support Balance": "A fixed support rule protects both family care and the student’s own survival base.",
  "Fatigue Load": "Heavy class-work overlap can show through missed meals, convenience spending, rushed transport, and low tracking energy.",
  "Schedule-Cost Pressure": "Some costs come from rushing, not carelessness: transport shortcuts, food outside, printing, data top-ups, and forgotten materials.",
  "Convenience Spend Risk": "Convenience becomes risky when it turns into the default response to exhaustion.",
  "Recovery Potential": "Small food, commute, and recovery rules can lower pressure faster than strict restriction alone.",
  "Debt Stress Load": "Borrowed money keeps old pressure active and can make even normal expenses feel heavier.",
  "Repayment Pressure": "Repayment should be planned before flexible spending so the week does not restart in repair mode.",
  "Cash-Flow Stability": "Timing mismatch matters: money can be enough in total but arrive after school, fare, food, or repayment is due.",
  "Emotional Fatigue": "Fatigue can make spending feel like recovery after class, work, commute, deadlines, or family pressure.",
  "Daily Pressure": "Food, fare, data, school materials, and rushed routine costs create quiet friction through repetition.",
  "Reward Frequency Risk": "The issue is not one reward. The issue is repeated relief spending becoming part of the weekly recovery routine.",
  "Reward Control": "Control means rewards are still allowed, but the amount and timing are chosen before stress peaks.",
  "Independence Load": "Self-funding school and daily life builds maturity but raises pressure when income timing and school deadlines collide.",
  "Essential Pressure": "Tuition, meals, fare, data, and materials are hard to safely delay, so they should not compete with impulse decisions.",
  "Buffer Stability": "A small buffer protects peace when one income delay or school cost arrives unexpectedly.",
  "Discipline Potential": "Discipline grows through realistic caps, not through saving rules that ignore survival costs.",
  "Fatigue Watch": "Fatigue is not full crisis yet, but the pattern needs recovery planning before spending becomes relief.",
  "Cost Pressure": "Food, fare, data, and school needs may already require clearer limits even if the situation still feels manageable.",
  "Routine Stability": "The routine is still forming, so a simple repeatable weekly rhythm matters more than a strict plan.",
  "Future Potential": "Effort and ambition are present, but future progress needs protection from burnout and small leaks.",
  "Burnout Watch": "Energy pressure is visible before crisis. CLARA should protect recovery so spending does not become the only relief.",
  "Financial Pressure": "Repeated small expenses can explain more than one big purchase when income is limited.",
  "Micro-Spend Risk": "Small buys matter because they are easy to ignore and easy to repeat.",
};

export const WORKING_STUDENT_SNAPSHOTS = {
  essentialCost: {
    key: "essentialCost",
    title: "Essential-cost pressure",
    caption: "School costs, transport, meals, mobile data, and work hours are competing for the same limited income. CLARA should protect basics before strict saving.",
    overview: "This Working Student profile shows survival-budget pressure. The main risk is not careless spending; it is repeated essential costs arriving faster than income, rest, and planning energy can recover.",
    hero: "Your week is being shaped by school costs, fare, food, mobile data, and work hours competing with limited income and recovery time. CLARA should protect basics first before strict saving.",
    supportTitle: "This looks like essential-cost pressure.",
    supportBody: "The pressure is not careless spending. It is repeated school and daily survival costs arriving faster than money, rest, and planning energy can recover.",
    struggles: ["tuition timing", "commute and meals", "school project spikes", "low recovery", "small cash gaps"],
    recommendations: ["Weekly essentials cap", "Transport buffer", "School-cost wallet", "Meal protection", "Micro-emergency fund"],
    weights: { "Essential-Cost Load": 36, "Recovery Gap": 27, "Cash Buffer Risk": 23, "Stability Potential": 14 },
  },
  familyLinked: {
    key: "familyLinked",
    title: "Family-linked responsibility",
    caption: "Your money decisions are connected to home support. Family contribution, school needs, food, and transport can compete, so budgeting needs boundaries instead of guilt.",
    overview: "This Working Student profile shows shared-responsibility pressure. Helping family may be meaningful, but CLARA should help define limits so school stability and daily essentials do not collapse quietly.",
    hero: "Your student money is connected to home support. School needs, food, fare, family contribution, and guilt pressure can compete, so CLARA should protect boundaries before generosity becomes instability.",
    supportTitle: "You’re carrying shared pressure.",
    supportBody: "Helping at home can be meaningful, but it needs a clear limit so school, meals, transport, and recovery are not quietly sacrificed.",
    struggles: ["family contribution", "guilt spending", "shared pressure", "school-cost conflict", "weak personal buffer"],
    recommendations: ["Family support limit", "Essentials-first rule", "School wallet", "Personal safety buffer", "Support without guilt"],
    weights: { "Shared-Money Pressure": 34, "Responsibility Load": 29, "Boundary Risk": 24, "Support Balance": 13 },
  },
  highFatigue: {
    key: "highFatigue",
    title: "High-fatigue schedule",
    caption: "School and work appear to be overlapping heavily. Commute, deadlines, and irregular meals can push convenience spending because time, not only money, is limited.",
    overview: "This Working Student profile shows schedule-cost pressure. When time is scarce, spending often shifts toward shortcuts: food outside, rush transport, forgotten tracking, and small comfort purchases.",
    hero: "School, work, commute, deadlines, and irregular meals are colliding. Time pressure is likely becoming money pressure through convenience choices and rushed decisions.",
    supportTitle: "Time pressure is becoming money pressure.",
    supportBody: "When the schedule is heavy, spending often rises because planning energy is drained, not because the user lacks discipline.",
    struggles: ["commute fatigue", "missed meals", "convenience spending", "late tracking", "work-school overlap"],
    recommendations: ["Recovery budget", "Meal plan shortcut", "Commute buffer", "Low-energy tracking", "Rest protection"],
    weights: { "Fatigue Load": 36, "Schedule-Cost Pressure": 28, "Convenience Spend Risk": 22, "Recovery Potential": 14 },
  },
  delayedPayment: {
    key: "delayedPayment",
    title: "Delayed-payment cycle",
    caption: "Money pressure may already be moving from one week into the next. Borrowing, delayed payments, or tuition timing can make the month feel like repair mode.",
    overview: "This Working Student profile shows stacked-pressure risk. CLARA should prioritize repayment rhythm, no-new-debt boundaries, and a small emergency fare/food buffer before flexible spending.",
    hero: "Money pressure may already be rolling into the next week. Borrowing, delayed payments, tuition timing, and daily gaps can make the month feel like repair mode.",
    supportTitle: "Pressure may be stacking.",
    supportBody: "The first protection is preventing old shortfalls from controlling the current week through repayment rhythm and a no-new-debt boundary.",
    struggles: ["borrowed money", "delayed payments", "cash-flow mismatch", "repayment pressure", "survival gaps"],
    recommendations: ["No-new-debt rule", "Repayment rhythm", "Emergency fare buffer", "Debt-first sorting", "Payment calendar"],
    weights: { "Repayment Pressure": 38, "Debt Stress Load": 28, "Cash-Flow Stability": 24, "Recovery Potential": 10 },
  },
  recoverySpending: {
    key: "recoverySpending",
    title: "Recovery-spending rhythm",
    caption: "Your spending may be recovery-driven. After school, work, commute, and pressure, small food, drink, or digital purchases can become quick relief.",
    overview: "This Working Student profile shows reward-frequency risk. The issue is usually not one purchase; it is repeated small relief spending when rest, meals, and emotional recovery are missing.",
    hero: "Your spending may be acting as recovery. After class, work, commute, and emotional pressure, small food, drink, delivery, or digital purchases can become quick relief.",
    supportTitle: "Small rewards may be carrying recovery.",
    supportBody: "This pattern usually appears when rest is low, meals are irregular, and the day feels too heavy to end without a small reward.",
    struggles: ["small reward spending", "irregular meals", "digital micro-spending", "stress recovery", "comfort purchases"],
    recommendations: ["Reward limit", "Low-cost recovery list", "Meal protection", "Spending pause", "Weekly leak review"],
    weights: { "Reward Frequency Risk": 33, "Emotional Fatigue": 30, "Daily Pressure": 24, "Reward Control": 13 },
  },
  selfFunded: {
    key: "selfFunded",
    title: "Self-funded student builder",
    caption: "You are carrying more of school and daily life yourself. Income timing, tuition needs, transport, meals, and emergency margin need clear protection.",
    overview: "This Working Student profile shows independence-load pressure. The user may be disciplined, but the system should avoid unrealistic saving pressure and focus on stable essentials first.",
    hero: "You are carrying more of school and daily life yourself. Tuition, meals, fare, mobile data, income timing, and emergency margin need clear protection before aggressive saving.",
    supportTitle: "Independence needs structure.",
    supportBody: "Self-supporting students can be disciplined and still be vulnerable when school deadlines and income timing collide.",
    struggles: ["self-supporting costs", "income timing", "tuition pressure", "small buffer", "essential expenses"],
    recommendations: ["Essentials-first plan", "School wallet", "Income timing map", "Minimum buffer", "Realistic saving rule"],
    weights: { "Essential Pressure": 34, "Independence Load": 29, "Buffer Stability": 24, "Discipline Potential": 13 },
  },
  stableStretched: {
    key: "stableStretched",
    title: "Stable but stretched",
    caption: "Your setup still has room for control, but the week is already stretched. This is the best time to build caps for food, fare, load/data, and small rewards.",
    overview: "This Working Student profile is not yet in crisis, but small leaks can grow when school and work get heavier. CLARA should build rhythm early.",
    hero: "Your setup still has control, but the week is already stretched. CLARA should build simple caps before small food, fare, data, and reward leaks grow under heavier pressure.",
    supportTitle: "Build rhythm before pressure grows.",
    supportBody: "This does not look like crisis yet. It looks like the right moment to build weekly rhythm while control is still available.",
    struggles: ["early fatigue", "small leaks", "routine building", "weekly caps", "school-work rhythm"],
    recommendations: ["Weekly cap", "Fare and food limit", "Simple tracker", "Small reward rule", "Savings slowly"],
    weights: { "Fatigue Watch": 29, "Cost Pressure": 28, "Routine Stability": 25, "Future Potential": 18 },
  },
  developingRhythm: {
    key: "developingRhythm",
    title: "Developing money rhythm",
    caption: "You are learning, earning, adjusting, and building direction with limited margin. CLARA should watch repeated costs before they become monthly leaks.",
    overview: "This Working Student profile shows a developing rhythm. The priority is to notice repeated micro-spending while protecting school, transport, meals, and energy.",
    hero: "You are learning, earning, adjusting, and building direction with limited margin. CLARA should watch repeated small costs before they become the hidden monthly pattern.",
    supportTitle: "Your effort has direction.",
    supportBody: "Many working students are not failing financially; they are trying to build a future while school, food, fare, mobile data, and social pressure repeat every week.",
    struggles: ["micro-spending", "limited margin", "school costs", "commute and food", "social pressure"],
    recommendations: ["Micro-spend review", "Weekly essentials", "Transport buffer", "Basic savings rhythm", "Energy-aware budgeting"],
    weights: { "Burnout Watch": 29, "Financial Pressure": 28, "Micro-Spend Risk": 25, "Future Potential": 18 },
  },
};

const modal = (insight, signal, move) => ({ insight, signal, move });

export const WORKING_STUDENT_MODAL_INSIGHTS = {
  "Reward Frequency Risk": modal("CLARA is reading repeated relief spending as the strongest part of this pattern. This usually appears when pressure relief becomes part of the weekly routine, not just a one-time reward.", "Watch snacks, drinks, delivery, digital buys, or deserve-ko-to spending that appears after class-work pressure, commute fatigue, or emotional heaviness.", "Set the reward limit before stress hits. Keep the reward, but decide the amount and frequency while your mind is still calm."),
  "Emotional Fatigue": modal("CLARA is reading fatigue as a money signal. When energy is low, the brain looks for fast recovery, and small spending can feel like the easiest form of rest.", "Watch spending after long shifts, heavy class days, low sleep, skipped meals, commute stress, or family pressure.", "Prepare one low-cost recovery option before the hard part of the day: food, water, rest, a packed snack, or a no-spend reset."),
  "Daily Pressure": modal("CLARA is reading daily friction: small costs that repeat often enough to shape the whole week.", "Watch fare, quick meals, mobile data, printing, school supplies, group contributions, and rushed purchases.", "Create a mini daily essentials cap so routine pressure stays separate from random spending."),
  "Reward Control": modal("CLARA is reading the protection side of this pattern. Control is still available when rewards are planned instead of reactive.", "Watch planned rewards becoming repeat purchases after stress peaks.", "Choose the amount, reason, and limit before spending. Control means bounded reward, not zero reward."),
  "Essential-Cost Load": modal("CLARA is reading school and survival costs as the main load. These expenses affect attendance, routine, and stability, so they need first protection.", "Watch tuition timing, fare, meals, printing, projects, load/data, and school materials arriving in the same week.", "Separate school and daily essentials first before rewards, savings, or flexible spending."),
  "Recovery Gap": modal("CLARA is reading low recovery as a spending trigger. Tired days often create shortcut costs.", "Watch skipped meals, rushed transport, late-night food, convenience spending, and delayed tracking.", "Add a small food, rest, or transport backup before the week gets heavy."),
  "Cash Buffer Risk": modal("CLARA is reading vulnerability to small surprises. One extra school or daily cost can force borrowing when no buffer exists.", "Watch sudden fare changes, project costs, food gaps, urgent class spending, and emergency payments.", "Build the smallest possible fare or food buffer before adding flexible spending."),
  "Responsibility Load": modal("CLARA is reading double-role pressure: student responsibility plus home responsibility using the same energy source.", "Watch decisions made from guilt, fear of disappointing others, or trying to solve everything at once.", "Protect school, food, fare, and recovery before committing extra support."),
  "Shared-Money Pressure": modal("CLARA is reading family support as a major money pressure because it competes with school and daily essentials.", "Watch last-minute family help, delayed school needs, or giving extra before personal essentials are protected.", "Set a weekly support limit that protects both family care and your school stability."),
  "Boundary Risk": modal("CLARA is reading generosity without structure as the risk, not generosity itself.", "Watch support that pushes food, fare, school costs, or rest into shortage.", "Create a clear support boundary before requests happen."),
  "Fatigue Load": modal("CLARA is reading schedule fatigue as the dominant pressure. Heavy overlap can make convenience feel necessary.", "Watch convenience meals, rushed transport, missed tracking, comfort buys, and spending after long class-work days.", "Prepare one low-energy plan for food, commute, and tracking."),
  "Schedule-Cost Pressure": modal("CLARA is reading the schedule itself as a cost generator.", "Watch transport shortcuts, food outside, printing, data top-ups, and last-minute materials caused by rushing.", "Build a weekly schedule-cost allowance before the week starts."),
  "Convenience Spend Risk": modal("CLARA is reading convenience as a repeated response to low time and low energy.", "Watch purchases that solve stress quickly but repeat often, especially food, transport, and delivery.", "Replace one convenience habit with a cheaper prepared option."),
  "Debt Stress Load": modal("CLARA is reading old pressure still affecting current decisions.", "Watch avoidance, delayed checking, and borrowing again to cover daily gaps.", "Use a no-new-debt rule and protect a small repayment rhythm."),
  "Repayment Pressure": modal("CLARA is reading repayment timing as the strongest part of the debt cycle.", "Watch spending before repayment, then borrowing again near the next deadline.", "Place repayment first in the weekly plan, even if the amount is small."),
  "Cash-Flow Stability": modal("CLARA is reading timing mismatch: money arrives after the costs are already due.", "Watch weeks where allowance, salary, or side income arrives after food, fare, school costs, or repayment deadlines.", "Map income dates against school and daily expense dates."),
  "Independence Load": modal("CLARA is reading self-funding as both strength and pressure.", "Watch income gaps, school deadlines, and personal essentials competing at the same time.", "Protect essentials first before trying to save aggressively."),
  "Essential Pressure": modal("CLARA is reading essential costs as harder to delay safely.", "Watch essentials being paid late because flexible spending happened first.", "Use an essentials-first wallet or category."),
  "Buffer Stability": modal("CLARA is reading a small-buffer need, not a perfect emergency fund need.", "Watch weeks with no backup for food, fare, data, or urgent school needs.", "Build the smallest possible buffer before adding new spending goals."),
  "Burnout Watch": modal("CLARA is reading early burnout pressure before it becomes crisis.", "Watch spending after exhaustion, deadlines, low sleep, or emotional overload.", "Add one recovery habit that does not require spending."),
  "Financial Pressure": modal("CLARA is reading limited money plus repeated small expenses.", "Watch food, fare, mobile data, digital, and social spending that repeats quietly.", "Review the top repeating micro-spend once per week."),
  "Micro-Spend Risk": modal("CLARA is reading small spending as the hidden pattern to watch.", "Watch purchases that feel too small to track but happen often.", "Set a weekly micro-spend ceiling."),
  "Future Potential": modal("CLARA is reading effort and future orientation as a real protection signal.", "Watch pressure that makes the plan feel impossible and causes full abandonment.", "Keep progress small and repeatable instead of strict and unrealistic."),
};

export function cleanWorkingStudentValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasAny(value, terms) {
  const text = cleanWorkingStudentValue(value).toLowerCase();
  return terms.some((term) => text.includes(cleanWorkingStudentValue(term).toLowerCase()));
}

export function getWorkingStudentBranch(setup) {
  return WORKING_STUDENT_BRANCHES[cleanWorkingStudentValue(setup)] || WORKING_STUDENT_BRANCHES[WORKING_STUDENT_ROOTS[0]];
}

export function getWorkingStudentOptions(draft = {}, key) {
  const setup = WORKING_STUDENT_ROOTS.includes(cleanWorkingStudentValue(draft.setup)) ? cleanWorkingStudentValue(draft.setup) : WORKING_STUDENT_ROOTS[0];
  const branch = getWorkingStudentBranch(setup);
  if (key === "setup") return WORKING_STUDENT_ROOTS;
  if (key === "rhythm") return branch.rhythm || [];
  if (key === "workload") return branch.workload?.[cleanWorkingStudentValue(draft.rhythm)] || branch.workload?.default || [];
  if (key === "pressure") return branch.pressure?.[cleanWorkingStudentValue(draft.workload)] || branch.pressure?.default || [];
  if (key === "coping") return branch.coping?.[cleanWorkingStudentValue(draft.pressure)] || branch.coping?.default || [];
  if (key === "goal") return branch.goal?.[cleanWorkingStudentValue(draft.coping)] || branch.goal?.default || [];
  return [];
}

export function completeWorkingStudentDraft(raw = {}) {
  const next = { stage: WORKING_STUDENT_STAGE_KEY, ...raw };
  WORKING_STUDENT_QUESTION_ORDER.forEach((key) => {
    const options = getWorkingStudentOptions(next, key);
    if (!options.includes(cleanWorkingStudentValue(next[key]))) next[key] = options[0];
  });
  return next;
}

export function resetWorkingStudentAfter(draft = {}, key) {
  const next = { ...draft };
  (WORKING_STUDENT_RESET_AFTER[key] || []).forEach((item) => delete next[item]);
  return next;
}

export function getWorkingStudentDisplayLabel(value) {
  const cleaned = cleanWorkingStudentValue(value);
  return WORKING_STUDENT_DISPLAY_LABELS[cleaned] || cleaned;
}

export function normalizeWorkingStudentInfluenceSplit(weights = {}) {
  const rows = Object.entries(weights).map(([label, raw], index) => ({ label, raw: Math.max(0, Number(raw) || 0), index }));
  const total = rows.reduce((sum, row) => sum + row.raw, 0) || 1;
  const mapped = rows.map((row) => {
    const exact = (row.raw / total) * 100;
    return { ...row, value: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = 100 - mapped.reduce((sum, row) => sum + row.value, 0);
  mapped.slice().sort((a, b) => b.rest - a.rest || a.index - b.index).forEach((row) => {
    if (left <= 0) return;
    row.value += 1;
    left -= 1;
  });
  return mapped
    .sort((a, b) => b.value - a.value || a.index - b.index)
    .map(({ label, value }) => ({
      label,
      value,
      category: WORKING_STUDENT_SIGNAL_CATEGORIES[label] || "stability",
      note: WORKING_STUDENT_CARD_NOTES[label] || "CLARA pressure split signal.",
    }));
}

export function getWorkingStudentScores(profile = {}) {
  const completed = completeWorkingStudentDraft(profile);
  const setup = cleanWorkingStudentValue(completed.setup);
  const rhythm = cleanWorkingStudentValue(completed.rhythm);
  const workload = cleanWorkingStudentValue(completed.workload);
  const pressure = cleanWorkingStudentValue(completed.pressure);
  const coping = cleanWorkingStudentValue(completed.coping);
  const goal = cleanWorkingStudentValue(completed.goal);

  const familyScore =
    (hasAny(setup, ["family"]) ? 2 : 0) +
    (hasAny(pressure, ["family", "guilt", "support", "home"]) ? 2 : 0) +
    (hasAny(coping, ["give", "limits", "guilty", "hide money stress"]) ? 1 : 0) +
    (hasAny(goal, ["family", "support boundary"]) ? 2 : 0);

  const debtScore =
    (hasAny(setup, ["recover", "financial pressure"]) ? 2 : 0) +
    (hasAny(pressure, ["debt", "borrow", "repayment", "cash-flow"]) ? 2 : 0) +
    (hasAny(coping, ["borrow", "delay payments", "delay payments to survive"]) ? 2 : 0) +
    (hasAny(goal, ["debt", "repayment", "no-new-debt"]) ? 1 : 0);

  const survivalScore =
    (hasAny(setup, ["survive", "alone", "continue school"]) ? 2 : 0) +
    (hasAny(rhythm, ["irregular", "project", "seasonal", "gaps", "not enough"]) ? 1 : 0) +
    (hasAny(workload, ["no room", "survival", "little time", "tired", "fees are near"]) ? 2 : 0) +
    (hasAny(pressure, ["food", "fare", "transport", "tuition", "emergency", "school deadlines"]) ? 1 : 0) +
    (hasAny(coping, ["cut", "borrow", "avoid checking", "overwork"]) ? 1 : 0);

  const burnoutScore =
    (hasAny(setup, ["exhaustion"]) ? 2 : 0) +
    (hasAny(workload, ["heavy", "little time", "commute", "deadlines", "tired", "overlap", "collide"]) ? 2 : 0) +
    (hasAny(pressure, ["convenience", "rushed", "missed tracking", "schedule conflict", "work-school"]) ? 2 : 0) +
    (hasAny(goal, ["burning out", "low-energy", "rest"]) ? 1 : 0);

  const rewardScore =
    (hasAny(pressure, ["reward", "small rewards", "social"]) ? 1 : 0) +
    (hasAny(coping, ["reward", "comfort", "small", "convenience", "feel okay"]) ? 2 : 0) +
    (hasAny(goal, ["reward", "stress", "leaks", "micro"]) ? 2 : 0);

  const stableScore =
    (hasAny(setup, ["supported", "future"]) ? 1 : 0) +
    (hasAny(rhythm, ["fixed", "allowance", "base"]) ? 1 : 0) +
    (hasAny(workload, ["manageable", "control", "plan early"]) ? 1 : 0) +
    (hasAny(coping, ["ask for help", "pause", "plan early"]) ? 1 : 0) +
    (hasAny(goal, ["savings", "finish", "rhythm", "discipline", "purpose", "priority"]) ? 1 : 0);

  return { familyScore, debtScore, survivalScore, burnoutScore, rewardScore, stableScore, setup, rhythm, workload, pressure, coping, goal };
}

export function getWorkingStudentArchetype(profile = {}) {
  const scores = getWorkingStudentScores(profile);
  if (scores.debtScore >= 3) return WORKING_STUDENT_SNAPSHOTS.delayedPayment;
  if (scores.familyScore >= 4) return WORKING_STUDENT_SNAPSHOTS.familyLinked;
  if (scores.survivalScore >= 5) return WORKING_STUDENT_SNAPSHOTS.essentialCost;
  if (scores.burnoutScore >= 4) return WORKING_STUDENT_SNAPSHOTS.highFatigue;
  if (scores.rewardScore >= 2) return WORKING_STUDENT_SNAPSHOTS.recoverySpending;
  if (hasAny(scores.setup, ["survive", "alone"])) return WORKING_STUDENT_SNAPSHOTS.selfFunded;
  if (scores.stableScore >= 3) return WORKING_STUDENT_SNAPSHOTS.stableStretched;
  return WORKING_STUDENT_SNAPSHOTS.developingRhythm;
}

export function getWorkingStudentSnapshot(profile = {}) {
  const archetype = getWorkingStudentArchetype(profile);
  return {
    ...archetype,
    indicators: normalizeWorkingStudentInfluenceSplit(archetype.weights),
  };
}

export function getWorkingStudentQuestionContext(key, value, draft = {}) {
  const cleaned = cleanWorkingStudentValue(value);
  const direct = WORKING_STUDENT_CONTEXT_COPY[cleaned];
  if (direct) return { ...direct, key, value: cleaned };
  const displayLabel = getWorkingStudentDisplayLabel(cleaned);
  const completed = completeWorkingStudentDraft({ ...draft, [key]: cleaned });
  const snapshot = getWorkingStudentSnapshot(completed);
  return {
    key,
    value: cleaned,
    title: displayLabel || "Working Student signal",
    summary: snapshot.overview || "CLARA will use this answer with the previous answers to shape the Working Student snapshot.",
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
  contextCopy: WORKING_STUDENT_CONTEXT_COPY,
  snapshots: WORKING_STUDENT_SNAPSHOTS,
  cardNotes: WORKING_STUDENT_CARD_NOTES,
  modalInsights: WORKING_STUDENT_MODAL_INSIGHTS,
  helpers: {
    cleanWorkingStudentValue,
    getWorkingStudentBranch,
    getWorkingStudentOptions,
    completeWorkingStudentDraft,
    resetWorkingStudentAfter,
    getWorkingStudentDisplayLabel,
    normalizeWorkingStudentInfluenceSplit,
    getWorkingStudentScores,
    getWorkingStudentArchetype,
    getWorkingStudentSnapshot,
    getWorkingStudentQuestionContext,
    buildWorkingStudentDraft,
  },
};

export default WORKING_STUDENT_LIFE_STAGE_SOURCE;
