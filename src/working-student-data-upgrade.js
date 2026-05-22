const LIFE_STAGE_PROFILE_KEY = "clara_life_stage_profile_v1";
const BOARD_LABEL = "CLARA CONTEXT BOARD";

const SOURCE_DISCLAIMER =
  "These sources inform CLARA’s working-student pressure model. The percentage is a 100% split of the detected pattern, not a direct published statistic.";

const HIERARCHY_LABELS = ["High Risk", "High", "Moderate", "Low Priority"];

const WORKING_STUDENT_OPTIONS = new Set([
  "Family-supported with some work",
  "Self-supporting student",
  "Working mainly for school costs",
  "Helping family while studying",
  "Side hustle / extra-income student",
  "Allowance + work income",
  "Fixed part-time pay",
  "Irregular side hustle income",
  "Project / seasonal income",
  "Mostly allowance with occasional work",
  "Manageable class-work load",
  "Tight but still controlled",
  "Heavy school-work overlap",
  "Little time to rest",
  "Almost no margin / survival mode",
  "Tuition or school costs",
  "Daily food and transport",
  "Work-school schedule conflict",
  "Family contribution",
  "Debt or borrowed money",
  "I spend on small rewards to feel okay",
  "I avoid checking my money",
  "I borrow or delay payments",
  "I cut my needs too much",
  "I ask for help before it gets worse",
  "Finish school without burning out",
  "Avoid debt",
  "Build savings slowly",
  "Help family without losing stability",
  "Control stress spending",
]);

const QUESTION_COPY = {
  "Family-supported with some work": {
    title: "Transition Support Pattern",
    body:
      "CLARA reads this as a mixed-responsibility setup: support is still present, but work is starting to carry real food, fare, school, or personal costs. The risk is usually small leaks before full independence becomes clear.",
  },
  "Self-supporting student": {
    title: "Self-Funded Pressure Pattern",
    body:
      "CLARA reads this as a high-responsibility setup. School, food, fare, mobile data, and emergency margin are all competing with the same income, so strict saving should come after essentials protection.",
  },
  "Working mainly for school costs": {
    title: "School-Cost Protection Pattern",
    body:
      "CLARA reads school as the anchor pressure. Tuition, projects, printing, transport, and class requirements should be protected before flexible spending, because one missed school cost can disrupt the whole routine.",
  },
  "Helping family while studying": {
    title: "Shared Responsibility Pattern",
    body:
      "CLARA reads this as a family-linked student profile. Helping at home may be meaningful, but the model must protect school, food, transport, and rest so support does not quietly become instability.",
  },
  "Side hustle / extra-income student": {
    title: "Extra-Income Builder Pattern",
    body:
      "CLARA reads this as effort with uneven rhythm. Extra income can help, but it can also hide fatigue when time, class load, and irregular earnings are not planned together.",
  },
  "Allowance + work income": {
    title: "Mixed Money Rhythm",
    body:
      "CLARA reads this as shared timing: allowance may cover basics while work income creates room. The important signal is whether extra income becomes protection or disappears into small recovery spending.",
  },
  "Fixed part-time pay": {
    title: "Predictable Pay Rhythm",
    body:
      "CLARA reads this as a planning advantage. Fixed pay can support weekly caps, but only if school costs, fare, food, and small rewards are separated before the week becomes busy.",
  },
  "Irregular side hustle income": {
    title: "Uneven Income Rhythm",
    body:
      "CLARA reads income timing as unstable. Strong earning days should protect weaker days because daily student costs keep repeating even when side hustle income slows down.",
  },
  "Project / seasonal income": {
    title: "Income in Waves",
    body:
      "CLARA reads this as feast-and-famine timing. The pressure is not only how much arrives, but whether school fees, commute, food, and repayments come before the next wave arrives.",
  },
  "Mostly allowance with occasional work": {
    title: "Support With Effort Rhythm",
    body:
      "CLARA reads this as a gentle transition stage. Occasional work can become useful buffer money, but it needs a boundary so it does not vanish into unplanned food, fare, or reward spending.",
  },
  "Manageable class-work load": {
    title: "Stable Capacity Signal",
    body:
      "CLARA reads this as a good setup for early habit-building. Because pressure is not yet extreme, the best move is to create simple caps before school and work become heavier.",
  },
  "Tight but still controlled": {
    title: "Stretched but Steerable Signal",
    body:
      "CLARA reads this as controlled pressure. The week is already tight, so guidance should be short, realistic, and focused on repeated costs instead of perfect budgeting.",
  },
  "Heavy school-work overlap": {
    title: "Schedule Collision Signal",
    body:
      "CLARA reads this as time pressure turning into money pressure. Heavy overlap commonly creates rushed meals, fare shortcuts, convenience buys, and delayed expense checking.",
  },
  "Little time to rest": {
    title: "Recovery Gap Signal",
    body:
      "CLARA reads rest as part of money behavior. Low recovery can make small purchases feel necessary because the body is asking for relief, not because the user is careless.",
  },
  "Almost no margin / survival mode": {
    title: "Protection-First Signal",
    body:
      "CLARA reads this as very low room for mistakes. The plan should protect food, fare, school costs, and repayment timing first before asking the user to save or restrict harder.",
  },
  "Tuition or school costs": {
    title: "School Cost Pressure",
    body:
      "CLARA reads school expenses as the main anchor. Tuition, requirements, and deadlines must be protected because they directly affect attendance, continuity, and future stability.",
  },
  "Daily food and transport": {
    title: "Daily Survival Friction",
    body:
      "CLARA reads daily costs as the repeated pressure. Food, fare, load/data, and school materials may look small one by one, but they can dominate the weekly pattern through repetition.",
  },
  "Work-school schedule conflict": {
    title: "Time-Money Collision",
    body:
      "CLARA reads the conflict as more than scheduling. When class and work collide, spending often rises through convenience, rushing, missed meals, and last-minute materials.",
  },
  "Family contribution": {
    title: "Family Support Pressure",
    body:
      "CLARA reads support as a real financial load, not just generosity. The safest plan sets a support boundary before school, food, transport, and recovery get weakened.",
  },
  "Debt or borrowed money": {
    title: "Stacked Pressure Signal",
    body:
      "CLARA reads borrowing as pressure moving forward in time. The goal is to stop old shortfalls from controlling the current week through repayment rhythm and no-new-debt rules.",
  },
  "I spend on small rewards to feel okay": {
    title: "Relief Spending Signal",
    body:
      "CLARA reads this as recovery seeking. The problem is not one reward; the risk is repeated relief spending becoming the easiest way to end a hard day.",
  },
  "I avoid checking my money": {
    title: "Avoidance Under Pressure",
    body:
      "CLARA reads avoidance as emotional load. Money checking may feel heavy when the user already feels tired, guilty, or behind, so guidance should make check-ins lighter and safer.",
  },
  "I borrow or delay payments": {
    title: "Delay-to-Survive Pattern",
    body:
      "CLARA reads this as a cash-flow timing problem. The system should detect the gap earlier so borrowing does not become the normal bridge between school, food, fare, and income dates.",
  },
  "I cut my needs too much": {
    title: "Over-Sacrifice Pattern",
    body:
      "CLARA reads this as stability risk. Cutting food, rest, transport, or health too much can make the budget look disciplined while quietly weakening energy and decision control.",
  },
  "I ask for help before it gets worse": {
    title: "Early Support Signal",
    body:
      "CLARA reads this as a protective behavior. Asking early can prevent rescue cycles when it is turned into a clear plan instead of only emergency support.",
  },
  "Finish school without burning out": {
    title: "Graduation + Recovery Goal",
    body:
      "CLARA reads the goal as both academic and emotional protection. The plan should protect energy, attendance, food, fare, and school costs so finishing does not require breaking down.",
  },
  "Avoid debt": {
    title: "Debt Prevention Goal",
    body:
      "CLARA reads this as a prevention priority. The system should catch shortfalls early, protect essentials first, and reduce repeated borrowing triggers.",
  },
  "Build savings slowly": {
    title: "Slow Stability Goal",
    body:
      "CLARA reads this as realistic growth. Small savings only works when food, fare, school costs, and recovery needs are not being ignored just to save faster.",
  },
  "Help family without losing stability": {
    title: "Support Boundary Goal",
    body:
      "CLARA reads this as care with protection. The plan should separate help money from school money, daily essentials, and personal emergency margin.",
  },
  "Control stress spending": {
    title: "Stress Spending Control Goal",
    body:
      "CLARA reads this as a recovery-design goal. The solution is not removing all rewards, but choosing limits before stress makes the decision.",
  },
};

const ARCHETYPES = {
  essentialCost: {
    key: "essentialCost",
    label: "Essential-cost pressure",
    hero:
      "Your week is being shaped by school costs, fare, food, mobile data, and work hours competing with limited income and recovery time. CLARA should protect basics first before strict saving.",
    supportTitle: "This looks like essential-cost pressure.",
    supportBody:
      "The pressure is not careless spending. It is repeated school and daily survival costs arriving faster than money, rest, and planning energy can recover.",
    struggles: ["tuition timing", "daily fare", "food gaps", "school project spikes", "low recovery"],
    recommendations: ["School-cost wallet", "Fare and food buffer", "Weekly essentials cap", "Micro-emergency fund"],
    weights: {
      "Essential-Cost Load": 36,
      "Recovery Gap": 27,
      "Cash Buffer Risk": 23,
      "Stability Potential": 14,
    },
  },
  familyLinked: {
    key: "familyLinked",
    label: "Family-linked responsibility",
    hero:
      "Your student money is connected to home support. School needs, food, fare, family contribution, and guilt pressure can compete, so CLARA should protect boundaries before generosity becomes instability.",
    supportTitle: "You’re carrying shared pressure.",
    supportBody:
      "Helping at home can be meaningful, but it needs a clear limit so school, meals, transport, and recovery are not quietly sacrificed.",
    struggles: ["family contribution", "guilt pressure", "school-cost conflict", "weak personal buffer", "shared money"],
    recommendations: ["Support boundary", "Essentials-first rule", "School wallet", "Personal safety buffer"],
    weights: {
      "Shared-Money Pressure": 34,
      "Responsibility Load": 29,
      "Boundary Risk": 24,
      "Support Balance": 13,
    },
  },
  highFatigue: {
    key: "highFatigue",
    label: "High-fatigue schedule",
    hero:
      "School, work, commute, deadlines, and irregular meals are colliding. Time pressure is likely becoming money pressure through convenience choices and rushed decisions.",
    supportTitle: "Time pressure is becoming money pressure.",
    supportBody:
      "When the schedule is heavy, spending often rises because planning energy is drained, not because the user lacks discipline.",
    struggles: ["commute fatigue", "missed meals", "rushed spending", "late tracking", "class-work overlap"],
    recommendations: ["Low-energy meal plan", "Commute buffer", "Recovery rule", "One-minute tracking"],
    weights: {
      "Fatigue Load": 36,
      "Schedule-Cost Pressure": 28,
      "Convenience Spend Risk": 22,
      "Recovery Potential": 14,
    },
  },
  delayedPayment: {
    key: "delayedPayment",
    label: "Delayed-payment cycle",
    hero:
      "Money pressure may already be rolling into the next week. Borrowing, delayed payments, tuition timing, and daily gaps can make the month feel like repair mode.",
    supportTitle: "Pressure may be stacking.",
    supportBody:
      "The first protection is preventing old shortfalls from controlling the current week through repayment rhythm and a no-new-debt boundary.",
    struggles: ["borrowed money", "delayed payments", "repayment timing", "cash-flow mismatch", "survival gaps"],
    recommendations: ["No-new-debt rule", "Repayment calendar", "Fare/food buffer", "Debt-first sorting"],
    weights: {
      "Repayment Pressure": 38,
      "Debt Stress Load": 28,
      "Cash-Flow Stability": 24,
      "Recovery Potential": 10,
    },
  },
  recoverySpending: {
    key: "recoverySpending",
    label: "Recovery-spending rhythm",
    hero:
      "Your spending may be acting as recovery. After class, work, commute, and emotional pressure, small food, drink, delivery, or digital purchases can become quick relief.",
    supportTitle: "Small rewards may be carrying recovery.",
    supportBody:
      "This pattern usually appears when rest is low, meals are irregular, and the day feels too heavy to end without a small reward.",
    struggles: ["small rewards", "irregular meals", "comfort food", "digital micro-spending", "pressure peaks"],
    recommendations: ["Reward limit", "Low-cost recovery list", "Meal protection", "Weekly leak review"],
    weights: {
      "Reward Frequency Risk": 33,
      "Emotional Fatigue": 30,
      "Daily Pressure": 24,
      "Reward Control": 13,
    },
  },
  selfFunded: {
    key: "selfFunded",
    label: "Self-funded student builder",
    hero:
      "You are carrying more of school and daily life yourself. Tuition, meals, fare, mobile data, income timing, and emergency margin need clear protection before aggressive saving.",
    supportTitle: "Independence needs structure.",
    supportBody:
      "Self-supporting students can be disciplined and still be vulnerable when school deadlines and income timing collide.",
    struggles: ["self-funded costs", "tuition timing", "income gaps", "small buffer", "daily essentials"],
    recommendations: ["Essentials-first plan", "School wallet", "Income-date map", "Minimum buffer"],
    weights: {
      "Essential Pressure": 34,
      "Independence Load": 29,
      "Buffer Stability": 24,
      "Discipline Potential": 13,
    },
  },
  stableStretched: {
    key: "stableStretched",
    label: "Stable but stretched",
    hero:
      "Your setup still has control, but the week is already stretched. CLARA should build simple caps before small food, fare, data, and reward leaks grow under heavier pressure.",
    supportTitle: "Build rhythm before pressure grows.",
    supportBody:
      "This does not look like crisis yet. It looks like the right moment to build weekly rhythm while control is still available.",
    struggles: ["early fatigue", "small leaks", "routine building", "weekly caps", "school-work rhythm"],
    recommendations: ["Weekly cap", "Fare and food limit", "Simple tracker", "Small reward rule"],
    weights: {
      "Fatigue Watch": 29,
      "Cost Pressure": 28,
      "Routine Stability": 25,
      "Future Potential": 18,
    },
  },
  developingRhythm: {
    key: "developingRhythm",
    label: "Developing money rhythm",
    hero:
      "You are learning, earning, adjusting, and building direction with limited margin. CLARA should watch repeated small costs before they become the hidden monthly pattern.",
    supportTitle: "Your effort has direction.",
    supportBody:
      "Many working students are not failing financially; they are trying to build a future while school, food, fare, mobile data, and social pressure repeat every week.",
    struggles: ["micro-spending", "limited margin", "school costs", "commute and food", "social pressure"],
    recommendations: ["Micro-spend review", "Weekly essentials", "Transport buffer", "Basic savings rhythm"],
    weights: {
      "Burnout Watch": 29,
      "Financial Pressure": 28,
      "Micro-Spend Risk": 25,
      "Future Potential": 18,
    },
  },
};

const CARD_NOTES = {
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

const MODAL_INSIGHTS = {
  "Reward Frequency Risk": {
    insight: "CLARA is reading repeated relief spending as the strongest part of this pattern. This usually appears when pressure relief becomes part of the weekly routine, not just a one-time reward.",
    signal: "Watch snacks, drinks, delivery, digital buys, or deserve-ko-to spending that appears after class-work pressure, commute fatigue, or emotional heaviness.",
    move: "Set the reward limit before stress hits. Keep the reward, but decide the amount and frequency while your mind is still calm.",
  },
  "Emotional Fatigue": {
    insight: "CLARA is reading fatigue as a money signal. When energy is low, the brain looks for fast recovery, and small spending can feel like the easiest form of rest.",
    signal: "Watch spending after long shifts, heavy class days, low sleep, skipped meals, commute stress, or family pressure.",
    move: "Prepare one low-cost recovery option before the hard part of the day: food, water, rest, a packed snack, or a no-spend reset.",
  },
  "Daily Pressure": {
    insight: "CLARA is reading daily friction: small costs that repeat often enough to shape the whole week.",
    signal: "Watch fare, quick meals, mobile data, printing, school supplies, group contributions, and rushed purchases.",
    move: "Create a mini daily essentials cap so routine pressure stays separate from random spending.",
  },
  "Reward Control": {
    insight: "CLARA is reading the protection side of this pattern. Control is still available when rewards are planned instead of reactive.",
    signal: "Watch planned rewards becoming repeat purchases after stress peaks.",
    move: "Choose the amount, reason, and limit before spending. Control means bounded reward, not zero reward.",
  },
  "Essential-Cost Load": {
    insight: "CLARA is reading school and survival costs as the main load. These expenses affect attendance, routine, and stability, so they need first protection.",
    signal: "Watch tuition timing, fare, meals, printing, projects, load/data, and school materials arriving in the same week.",
    move: "Separate school and daily essentials first before rewards, savings, or flexible spending.",
  },
  "Recovery Gap": {
    insight: "CLARA is reading low recovery as a spending trigger. Tired days often create shortcut costs.",
    signal: "Watch skipped meals, rushed transport, late-night food, convenience spending, and delayed tracking.",
    move: "Add a small food, rest, or transport backup before the week gets heavy.",
  },
  "Cash Buffer Risk": {
    insight: "CLARA is reading vulnerability to small surprises. One extra school or daily cost can force borrowing when no buffer exists.",
    signal: "Watch sudden fare changes, project costs, food gaps, urgent class spending, and emergency payments.",
    move: "Build the smallest possible fare or food buffer before adding flexible spending.",
  },
  "Responsibility Load": {
    insight: "CLARA is reading double-role pressure: student responsibility plus home responsibility using the same energy source.",
    signal: "Watch decisions made from guilt, fear of disappointing others, or trying to solve everything at once.",
    move: "Protect school, food, fare, and recovery before committing extra support.",
  },
  "Shared-Money Pressure": {
    insight: "CLARA is reading family support as a major money pressure because it competes with school and daily essentials.",
    signal: "Watch last-minute family help, delayed school needs, or giving extra before personal essentials are protected.",
    move: "Set a weekly support limit that protects both family care and your school stability.",
  },
  "Boundary Risk": {
    insight: "CLARA is reading generosity without structure as the risk, not generosity itself.",
    signal: "Watch support that pushes food, fare, school costs, or rest into shortage.",
    move: "Create a clear support boundary before requests happen.",
  },
  "Fatigue Load": {
    insight: "CLARA is reading schedule fatigue as the dominant pressure. Heavy overlap can make convenience feel necessary.",
    signal: "Watch convenience meals, rushed transport, missed tracking, comfort buys, and spending after long class-work days.",
    move: "Prepare one low-energy plan for food, commute, and tracking.",
  },
  "Schedule-Cost Pressure": {
    insight: "CLARA is reading the schedule itself as a cost generator.",
    signal: "Watch transport shortcuts, food outside, printing, data top-ups, and last-minute materials caused by rushing.",
    move: "Build a weekly schedule-cost allowance before the week starts.",
  },
  "Convenience Spend Risk": {
    insight: "CLARA is reading convenience as a repeated response to low time and low energy.",
    signal: "Watch purchases that solve stress quickly but repeat often, especially food, transport, and delivery.",
    move: "Replace one convenience habit with a cheaper prepared option.",
  },
  "Debt Stress Load": {
    insight: "CLARA is reading old pressure still affecting current decisions.",
    signal: "Watch avoidance, delayed checking, and borrowing again to cover daily gaps.",
    move: "Use a no-new-debt rule and protect a small repayment rhythm.",
  },
  "Repayment Pressure": {
    insight: "CLARA is reading repayment timing as the strongest part of the debt cycle.",
    signal: "Watch spending before repayment, then borrowing again near the next deadline.",
    move: "Place repayment first in the weekly plan, even if the amount is small.",
  },
  "Cash-Flow Stability": {
    insight: "CLARA is reading timing mismatch: money arrives after the costs are already due.",
    signal: "Watch weeks where allowance, salary, or side income arrives after food, fare, school costs, or repayment deadlines.",
    move: "Map income dates against school and daily expense dates.",
  },
  "Independence Load": {
    insight: "CLARA is reading self-funding as both strength and pressure.",
    signal: "Watch income gaps, school deadlines, and personal essentials competing at the same time.",
    move: "Protect essentials first before trying to save aggressively.",
  },
  "Essential Pressure": {
    insight: "CLARA is reading essential costs as harder to delay safely.",
    signal: "Watch essentials being paid late because flexible spending happened first.",
    move: "Use an essentials-first wallet or category.",
  },
  "Buffer Stability": {
    insight: "CLARA is reading a small-buffer need, not a perfect emergency fund need.",
    signal: "Watch weeks with no backup for food, fare, data, or urgent school needs.",
    move: "Build the smallest possible buffer before adding new spending goals.",
  },
  "Burnout Watch": {
    insight: "CLARA is reading early burnout pressure before it becomes crisis.",
    signal: "Watch spending after exhaustion, deadlines, low sleep, or emotional overload.",
    move: "Add one recovery habit that does not require spending.",
  },
  "Financial Pressure": {
    insight: "CLARA is reading limited money plus repeated small expenses.",
    signal: "Watch food, fare, mobile data, digital, and social spending that repeats quietly.",
    move: "Review the top repeating micro-spend once per week.",
  },
  "Micro-Spend Risk": {
    insight: "CLARA is reading small spending as the hidden pattern to watch.",
    signal: "Watch purchases that feel too small to track but happen often.",
    move: "Set a weekly micro-spend ceiling.",
  },
  "Future Potential": {
    insight: "CLARA is reading effort and future orientation as a real protection signal.",
    signal: "Watch pressure that makes the plan feel impossible and causes full abandonment.",
    move: "Keep progress small and repeatable instead of strict and unrealistic.",
  },
};

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function loud(value) {
  return clean(value).toUpperCase();
}

function hasAny(value, terms) {
  const text = clean(value).toLowerCase();
  return terms.some((term) => text.includes(clean(term).toLowerCase()));
}

function readProfile() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LIFE_STAGE_PROFILE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function setText(node, value) {
  if (!node) return;
  const next = String(value || "");
  if (node.textContent !== next) node.textContent = next;
}

function isWorkingStudentActive() {
  const profile = readProfile();
  if (clean(profile.stage) === "Working Student") return true;
  return Array.from(document.querySelectorAll("h2, h3, p, button")).some((node) => clean(node.textContent).startsWith("Working Student"));
}

function scores(profile) {
  const setup = clean(profile.setup);
  const rhythm = clean(profile.rhythm);
  const workload = clean(profile.workload);
  const pressure = clean(profile.pressure);
  const coping = clean(profile.coping);
  const goal = clean(profile.goal);

  const familyScore =
    (hasAny(setup, ["helping family"]) ? 2 : 0) +
    (hasAny(pressure, ["family contribution"]) ? 2 : 0) +
    (hasAny(goal, ["help family"]) ? 2 : 0);

  const debtScore =
    (hasAny(pressure, ["debt", "borrowed"]) ? 2 : 0) +
    (hasAny(coping, ["borrow", "delay payments"]) ? 2 : 0) +
    (hasAny(goal, ["avoid debt"]) ? 1 : 0);

  const survivalScore =
    (hasAny(setup, ["self-supporting", "school costs"]) ? 2 : 0) +
    (hasAny(rhythm, ["irregular", "project", "seasonal"]) ? 1 : 0) +
    (hasAny(workload, ["almost no margin", "survival", "little time to rest"]) ? 2 : 0) +
    (hasAny(pressure, ["daily food", "transport", "debt", "borrowed"]) ? 1 : 0) +
    (hasAny(coping, ["cut my needs", "borrow", "avoid checking"]) ? 1 : 0);

  const burnoutScore =
    (hasAny(workload, ["heavy", "little time", "almost no margin", "survival"]) ? 2 : 0) +
    (hasAny(pressure, ["schedule conflict", "work-school"]) ? 2 : 0) +
    (hasAny(goal, ["burning out"]) ? 1 : 0);

  const rewardScore =
    (hasAny(coping, ["small rewards", "feel okay"]) ? 2 : 0) +
    (hasAny(goal, ["stress spending"]) ? 2 : 0);

  const stableScore =
    (hasAny(workload, ["manageable", "tight but still controlled"]) ? 1 : 0) +
    (hasAny(rhythm, ["fixed", "allowance + work", "mostly allowance"]) ? 1 : 0) +
    (hasAny(coping, ["ask for help"]) ? 1 : 0) +
    (hasAny(goal, ["build savings", "finish school"]) ? 1 : 0);

  return { familyScore, debtScore, survivalScore, burnoutScore, rewardScore, stableScore, setup };
}

function pickArchetype(profile) {
  const s = scores(profile);
  if (s.debtScore >= 3) return ARCHETYPES.delayedPayment;
  if (s.familyScore >= 4) return ARCHETYPES.familyLinked;
  if (s.survivalScore >= 5) return ARCHETYPES.essentialCost;
  if (s.burnoutScore >= 4) return ARCHETYPES.highFatigue;
  if (s.rewardScore >= 2) return ARCHETYPES.recoverySpending;
  if (hasAny(s.setup, ["self-supporting", "school costs"])) return ARCHETYPES.selfFunded;
  if (s.stableScore >= 3) return ARCHETYPES.stableStretched;
  return ARCHETYPES.developingRhythm;
}

function normalizeWeights(weights) {
  const rows = Object.entries(weights || {}).map(([label, raw], index) => ({ label, raw: Math.max(0, Number(raw) || 0), index }));
  const total = rows.reduce((sum, row) => sum + row.raw, 0) || 1;
  const mapped = rows.map((row) => {
    const exact = (row.raw / total) * 100;
    return { ...row, value: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = 100 - mapped.reduce((sum, row) => sum + row.value, 0);
  mapped
    .slice()
    .sort((a, b) => b.rest - a.rest || a.index - b.index)
    .forEach((row) => {
      if (left <= 0) return;
      row.value += 1;
      left -= 1;
    });
  return mapped.sort((a, b) => b.value - a.value || a.index - b.index);
}

function findSectionByHeading(text) {
  return Array.from(document.querySelectorAll("section")).find((section) => clean(section.querySelector("h3")?.textContent) === text) || null;
}

function findHero() {
  const heading = Array.from(document.querySelectorAll("h2")).find((node) => clean(node.textContent).startsWith("Working Student"));
  if (!heading) return null;
  const copy = Array.from(heading.parentElement?.querySelectorAll("p") || []).find((node) => !/your life stage/i.test(clean(node.textContent)));
  return { heading, copy };
}

function patchHeroAndSupport(archetype) {
  const hero = findHero();
  if (hero?.copy) {
    setText(hero.copy, archetype.hero);
    hero.copy.dataset.claraWorkingStudentDataV2 = archetype.key;
  }

  const support = findSectionByHeading("You’re not alone.") ||
    Array.from(document.querySelectorAll("section")).find((section) => section.querySelector("[data-clara-working-student-support='true']"));
  if (!support) return;
  const title = support.querySelector("h3");
  const body = title?.nextElementSibling || support.querySelector("p");
  setText(title, archetype.supportTitle);
  setText(body, archetype.supportBody);
}

function patchQuestionBoard() {
  const boardMarker = Array.from(document.querySelectorAll("p")).find((node) => loud(node.textContent) === BOARD_LABEL);
  const header = boardMarker?.closest("header");
  const title = header?.querySelector("h3");
  const summary = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  if (!title || !summary) return;

  const labels = Array.from(document.querySelectorAll("section p"));
  for (const label of labels) {
    const section = label.closest("section");
    if (!section?.querySelector("button")) continue;
    const buttons = Array.from(section.querySelectorAll("button"));
    const hasWorkingStudentOption = buttons.some((button) => WORKING_STUDENT_OPTIONS.has(clean(button.innerText || button.textContent)));
    if (!hasWorkingStudentOption) continue;
    const selected = buttons.find((button) => {
      const className = String(button.className || "");
      return className.includes("border-cyan") || className.includes("text-cyan-50") || className.includes("bg-cyan");
    }) || buttons[0];
    const option = clean(selected?.innerText || selected?.textContent);
    const copy = QUESTION_COPY[option];
    if (!copy) return;
    setText(title, copy.title);
    setText(summary, copy.body);
    summary.style.setProperty("white-space", "pre-line", "important");
    title.dataset.claraWorkingStudentDataV2 = option;
    summary.dataset.claraWorkingStudentDataV2 = option;
    return;
  }
}

function getTrendCards(section) {
  return Array.from(section?.querySelectorAll("button") || [])
    .map((card, index) => {
      const lines = Array.from(card.querySelectorAll("p"));
      const label = clean(lines[0]?.textContent);
      const value = Number(clean(lines[1]?.textContent).replace("%", ""));
      return { card, lines, label, value, index };
    })
    .filter((item) => item.lines.length >= 2);
}

function patchTrendSnapshot(archetype) {
  const section = findSectionByHeading("Life Stage Trend Snapshot");
  if (!section) return;
  const helper = section.querySelector("h3")?.parentElement?.querySelector("p");
  setText(helper, `${archetype.label} • 100% pressure split`);

  const cards = getTrendCards(section);
  const split = normalizeWeights(archetype.weights);
  split.forEach((row, index) => {
    const item = cards[index];
    if (!item) return;
    setText(item.lines[0], row.label);
    setText(item.lines[1], `${row.value}%`);
    setText(item.lines[2], HIERARCHY_LABELS[index] || "Low Priority");
    item.card.title = CARD_NOTES[row.label] || "CLARA pressure split signal.";
    item.card.dataset.claraWorkingStudentDataV2 = archetype.key;
    item.card.dataset.claraStrategicShare = `${row.value}%`;
    item.card.dataset.claraRiskHierarchy = HIERARCHY_LABELS[index] || "Low Priority";
  });
}

function patchModal(archetype) {
  const sourceHeading = Array.from(document.querySelectorAll("p")).find((node) => {
    const text = clean(node.textContent);
    return text === "Source direction" || text === "SOURCE DIRECTION" || text === "Source detection" || text === "Sources";
  });
  const modal = sourceHeading?.closest(".absolute");
  if (!sourceHeading || !modal) return;

  const title = clean(modal.querySelector("h4")?.textContent);
  const split = normalizeWeights(archetype.weights);
  const match = split.find((item) => item.label === title);
  const insight = MODAL_INSIGHTS[title];
  if (!match && !insight) return;

  const valueNode = Array.from(modal.querySelectorAll("p")).find((node) => /^\d+%$/.test(clean(node.textContent)));
  const statusNode = valueNode?.nextElementSibling;
  const hierarchy = match ? HIERARCHY_LABELS[split.findIndex((item) => item.label === title)] || "Low Priority" : null;
  if (match) setText(valueNode, `${match.value}%`);
  if (hierarchy) setText(statusNode, hierarchy);

  if (insight) {
    const panel = modal.querySelector("[data-clara-modal-insight='true']");
    const rows = Array.from(panel?.children?.[1]?.children || []);
    const payload = [
      ["Insight", insight.insight],
      ["Pressure Signal", insight.signal],
      ["Next Move", insight.move],
    ];
    rows.forEach((row, index) => {
      const [label, text] = payload[index] || [];
      const ps = row.querySelectorAll("p");
      if (label) setText(ps[0], label);
      if (text) setText(ps[1], text);
    });
  }

  const body = Array.from(sourceHeading.closest("div")?.querySelectorAll("p") || []).find((node) => node !== sourceHeading);
  if (body) {
    setText(body, SOURCE_DISCLAIMER);
    body.hidden = false;
    body.style.display = "";
  }
}

function patchAll() {
  if (typeof document === "undefined" || !isWorkingStudentActive()) return;
  const profile = readProfile();
  const archetype = pickArchetype(profile);
  patchQuestionBoard();
  patchHeroAndSupport(archetype);
  patchTrendSnapshot(archetype);
  patchModal(archetype);
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_WORKING_STUDENT_DATA_UPGRADE__) {
  window.__CLARA_WORKING_STUDENT_DATA_UPGRADE__ = true;
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      patchAll();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener("storage", schedule, { passive: true });
  document.addEventListener("click", () => window.setTimeout(schedule, 100), { passive: true });
  window.requestAnimationFrame(schedule);
}
