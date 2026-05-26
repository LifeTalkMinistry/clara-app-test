export const YOUNG_PROFESSIONAL_STAGE_KEY = "Young Professional";

export const YOUNG_PROFESSIONAL_QUESTION_ORDER = ["setup", "rhythm", "workload", "pressure", "coping", "goal"];

export const YOUNG_PROFESSIONAL_RESET_AFTER = {
  setup: ["rhythm", "workload", "pressure", "coping", "goal"],
  rhythm: ["workload", "pressure", "coping", "goal"],
  workload: ["pressure", "coping", "goal"],
  pressure: ["coping", "goal"],
  coping: ["goal"],
  goal: [],
};

export const YOUNG_PROFESSIONAL_ROOTS = [
  "First stable job, still adjusting",
  "Living independently with bills",
  "Supporting family while building career",
  "Career growth under pressure",
  "Salary feels stable but always disappears",
  "Shift work or BPO routine",
  "Recovering from debt or pay-later habits",
];

export const YOUNG_PROFESSIONAL_BRANCHES = {
  "First stable job, still adjusting": {
    rhythm: ["First salary rhythm", "Twice-a-month cutoff", "Monthly salary with new bills", "Salary plus small side income"],
    workload: {
      default: ["Learning work-life balance", "Busy but still manageable", "Office or commute routine is new", "Still adjusting to adult responsibilities"],
      "Twice-a-month cutoff": ["Cutoff week feels tight", "Busy but still manageable", "Office or commute routine is new", "Still adjusting to adult responsibilities"],
    },
    pressure: {
      default: ["Living costs are becoming real", "Payday reward spending", "Low emergency buffer", "Lifestyle comparison"],
      "Cutoff week feels tight": ["Cutoff dependency", "Low emergency buffer", "Living costs are becoming real", "Payday reward spending"],
    },
    coping: {
      default: ["I reward myself after payday", "I avoid tracking when busy", "I say yes to social spending", "I try to save what is left"],
      "Payday reward spending": ["I reward myself after payday", "I say yes to social spending", "I avoid tracking when busy", "I try to save what is left"],
    },
    goal: {
      default: ["Build a salary rhythm", "Save before spending", "Control payday rewards", "Start an emergency fund"],
      "I reward myself after payday": ["Control payday rewards", "Save before spending", "Build a salary rhythm", "Start an emergency fund"],
    },
  },
  "Living independently with bills": {
    rhythm: ["Bills are due before payday", "Rent and utilities monthly", "Food and commute drain the week", "Subscription and lifestyle costs stack"],
    workload: {
      default: ["Adulting tasks take mental space", "Household errands add pressure", "Work and home responsibilities overlap", "Planning is possible but tiring"],
      "Bills are due before payday": ["Adulting tasks take mental space", "Work and home responsibilities overlap", "Planning is possible but tiring", "Bill timing feels stressful"],
    },
    pressure: {
      default: ["Rent, utilities, and food", "Emergency buffer gap", "Cash-flow timing mismatch", "Convenience spending after work"],
      "Bill timing feels stressful": ["Cash-flow timing mismatch", "Rent, utilities, and food", "Emergency buffer gap", "Convenience spending after work"],
    },
    coping: {
      default: ["I delay checking balances", "I use convenience to save energy", "I move money around before payday", "I set aside bills first"],
      "Emergency buffer gap": ["I move money around before payday", "I delay checking balances", "I use convenience to save energy", "I set aside bills first"],
    },
    goal: {
      default: ["Protect fixed bills first", "Build one-month buffer slowly", "Reduce convenience leaks", "Make payday rules automatic"],
      "I set aside bills first": ["Make payday rules automatic", "Protect fixed bills first", "Build one-month buffer slowly", "Reduce convenience leaks"],
    },
  },
  "Supporting family while building career": {
    rhythm: ["Part of salary goes home", "Family requests change the month", "Support is fixed but income is tight", "I give extra when emergencies happen"],
    workload: {
      default: ["Career and family needs overlap", "I feel responsible even after work", "Rest feels guilty sometimes", "Boundaries are hard to explain"],
      "Family requests change the month": ["Family needs interrupt plans", "I feel responsible even after work", "Rest feels guilty sometimes", "Boundaries are hard to explain"],
    },
    pressure: {
      default: ["Family contribution", "Guilt when I protect my own money", "Weak personal buffer", "Career costs compete with home needs"],
      "Family needs interrupt plans": ["Family contribution", "Weak personal buffer", "Guilt when I protect my own money", "Career costs compete with home needs"],
    },
    coping: {
      default: ["I give even when tight", "I delay my own goals", "I hide money stress", "I try to set a support limit"],
      "Guilt when I protect my own money": ["I try to set a support limit", "I give even when tight", "I delay my own goals", "I hide money stress"],
    },
    goal: {
      default: ["Help family without losing stability", "Set a support boundary", "Protect my personal buffer", "Keep career growth funded"],
      "I give even when tight": ["Set a support boundary", "Help family without losing stability", "Protect my personal buffer", "Keep career growth funded"],
    },
  },
  "Career growth under pressure": {
    rhythm: ["Salary supports career upgrades", "Courses or tools feel necessary", "Networking and image costs appear", "Promotion pressure affects spending"],
    workload: {
      default: ["Workload is growing", "I feel behind others", "I am investing in myself", "Rest and ambition compete"],
      "Promotion pressure affects spending": ["I feel behind others", "Workload is growing", "I am investing in myself", "Rest and ambition compete"],
    },
    pressure: {
      default: ["Career investment pressure", "Lifestyle comparison", "Professional image spending", "Burnout from proving myself"],
      "I feel behind others": ["Career investment pressure", "Lifestyle comparison", "Burnout from proving myself", "Professional image spending"],
    },
    coping: {
      default: ["I buy tools or courses quickly", "I spend to feel more prepared", "I compare my progress", "I plan upgrades carefully"],
      "Career investment pressure": ["I buy tools or courses quickly", "I spend to feel more prepared", "I compare my progress", "I plan upgrades carefully"],
    },
    goal: {
      default: ["Invest without panic", "Separate career fund", "Control comparison spending", "Protect rest and savings"],
      "I buy tools or courses quickly": ["Invest without panic", "Separate career fund", "Control comparison spending", "Protect rest and savings"],
    },
  },
  "Salary feels stable but always disappears": {
    rhythm: ["Payday feels strong then fades", "Cutoff survival repeats", "Installments eat the salary", "Lifestyle costs grow quietly"],
    workload: {
      default: ["Routine is stable but tiring", "Spending feels automatic", "Weekends become recovery spending", "I know I should plan earlier"],
      "Cutoff survival repeats": ["Spending feels automatic", "Weekends become recovery spending", "Routine is stable but tiring", "I know I should plan earlier"],
    },
    pressure: {
      default: ["Lifestyle creep", "Cutoff dependency", "Subscriptions and installments", "Low savings despite stable income"],
      "Spending feels automatic": ["Lifestyle creep", "Subscriptions and installments", "Cutoff dependency", "Low savings despite stable income"],
    },
    coping: {
      default: ["I overspend early then restrict later", "I pay later for wants", "I ignore small recurring costs", "I want clearer payday rules"],
      "Subscriptions and installments": ["I ignore small recurring costs", "I pay later for wants", "I overspend early then restrict later", "I want clearer payday rules"],
    },
    goal: {
      default: ["Stop salary leaks", "Build automatic savings", "Control installments", "Make cutoff smoother"],
      "I overspend early then restrict later": ["Stop salary leaks", "Make cutoff smoother", "Build automatic savings", "Control installments"],
    },
  },
  "Shift work or BPO routine": {
    rhythm: ["Salary is fixed but sleep is unstable", "Night shift changes spending", "Commute and meals vary by shift", "Incentives or OT affect income"],
    workload: {
      default: ["Sleep schedule affects decisions", "Long calls or shifts drain energy", "Rest days become spending days", "Tracking feels hard after work"],
      "Night shift changes spending": ["Sleep schedule affects decisions", "Long calls or shifts drain energy", "Tracking feels hard after work", "Rest days become spending days"],
    },
    pressure: {
      default: ["Convenience food and transport", "Sleep and recovery spending", "Burnout spending risk", "Cutoff dependency"],
      "Sleep schedule affects decisions": ["Sleep and recovery spending", "Convenience food and transport", "Burnout spending risk", "Cutoff dependency"],
    },
    coping: {
      default: ["I buy comfort after shifts", "I choose convenience to survive the day", "I forget to track when tired", "I prepare shift money in advance"],
      "Burnout spending risk": ["I buy comfort after shifts", "I choose convenience to survive the day", "I forget to track when tired", "I prepare shift money in advance"],
    },
    goal: {
      default: ["Create shift-proof money rules", "Protect recovery without overspending", "Reduce convenience leaks", "Stabilize cutoff rhythm"],
      "I buy comfort after shifts": ["Protect recovery without overspending", "Create shift-proof money rules", "Reduce convenience leaks", "Stabilize cutoff rhythm"],
    },
  },
  "Recovering from debt or pay-later habits": {
    rhythm: ["Debt payments hit every cutoff", "Pay-later balances stack", "Old shortfalls use new salary", "Minimum payments keep repeating"],
    workload: {
      default: ["Money feels like repair mode", "Old choices affect current peace", "I feel tired from catching up", "There is little room to reset"],
      "Pay-later balances stack": ["Old choices affect current peace", "Money feels like repair mode", "I feel tired from catching up", "There is little room to reset"],
    },
    pressure: {
      default: ["Debt repayment pressure", "Cash-flow timing mismatch", "Borrowing again before payday", "Avoiding money because it feels heavy"],
      "Old choices affect current peace": ["Debt repayment pressure", "Borrowing again before payday", "Cash-flow timing mismatch", "Avoiding money because it feels heavy"],
    },
    coping: {
      default: ["I pay minimums and hope it improves", "I avoid checking the total", "I borrow again when short", "I want a no-new-debt rule"],
      "Debt repayment pressure": ["I pay minimums and hope it improves", "I avoid checking the total", "I borrow again when short", "I want a no-new-debt rule"],
    },
    goal: {
      default: ["Stop new debt first", "Create repayment rhythm", "Protect essentials while repaying", "Build a small no-borrow buffer"],
      "I borrow again when short": ["Stop new debt first", "Build a small no-borrow buffer", "Create repayment rhythm", "Protect essentials while repaying"],
    },
  },
};

export const YOUNG_PROFESSIONAL_DISPLAY_LABELS = {
  "First stable job, still adjusting": "First stable job",
  "Living independently with bills": "Independent with bills",
  "Supporting family while building career": "Career + family support",
  "Career growth under pressure": "Career growth pressure",
  "Salary feels stable but always disappears": "Salary disappears fast",
  "Shift work or BPO routine": "Shift/BPO routine",
  "Recovering from debt or pay-later habits": "Debt/pay-later recovery",
  "First salary rhythm": "First salary rhythm",
  "Twice-a-month cutoff": "Twice-a-month cutoff",
  "Monthly salary with new bills": "Monthly salary + new bills",
  "Salary plus small side income": "Salary + side income",
  "Learning work-life balance": "Learning work-life balance",
  "Busy but still manageable": "Busy but manageable",
  "Office or commute routine is new": "New office/commute routine",
  "Still adjusting to adult responsibilities": "Adjusting to adulting",
  "Cutoff week feels tight": "Cutoff week feels tight",
  "Living costs are becoming real": "Living costs feel real",
  "Payday reward spending": "Payday reward spending",
  "Low emergency buffer": "Low emergency buffer",
  "Lifestyle comparison": "Lifestyle comparison",
  "I reward myself after payday": "I reward myself after payday",
  "I avoid tracking when busy": "I avoid tracking when busy",
  "I say yes to social spending": "I say yes to social spending",
  "I try to save what is left": "I save what is left",
  "Build a salary rhythm": "Build salary rhythm",
  "Save before spending": "Save before spending",
  "Control payday rewards": "Control payday rewards",
  "Start an emergency fund": "Start emergency fund",
};

const DISPLAY_TO_CANONICAL = Object.entries(YOUNG_PROFESSIONAL_DISPLAY_LABELS).reduce((map, [raw, label]) => {
  map[label] = raw;
  return map;
}, {});

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function signal(label, category, note, insight, action, trendType = "wave") {
  return { label, category, note, insight, action, trendType };
}

export const YOUNG_PROFESSIONAL_SIGNAL_DEFINITIONS = {
  independencePressure: signal("Independence Pressure", "pressure", "Bills, food, commute, rent, and personal choices are becoming real responsibilities.", "Early independence can make income feel bigger on payday but smaller once obligations appear.", "Assign fixed costs first before the month starts spending for you.", "wave"),
  salaryLeak: signal("Salary Leak", "spending", "Stable income is present, but repeated small expenses, subscriptions, or wants may be draining it.", "The danger is not one purchase; it is the feeling that stable income can absorb everything.", "Use a payday split before lifestyle spending begins.", "spike"),
  familySupportPressure: signal("Family Support Pressure", "pressure", "Family contribution is shaping personal financial stability.", "Helping family can be meaningful, but it can also erase the buffer needed for independence.", "Set a support limit that protects essentials and family care together.", "wave"),
  careerPressure: signal("Career Pressure", "growth", "Career upgrades, image, tools, courses, and comparison are creating spending pressure.", "Growth spending is useful only when it is planned, not panic-driven.", "Create a career fund and separate true investment from insecurity spending.", "upward"),
  burnoutRisk: signal("Burnout Risk", "energy", "Workload, commute, shift rhythm, or pressure is draining recovery capacity.", "When recovery is weak, spending becomes the easiest way to feel human again.", "Protect rest and create one low-cost recovery option before the week becomes heavy.", "downward"),
  debtCarryover: signal("Debt Carryover", "pressure", "Old debt, pay-later balances, or repayment pressure are affecting the current salary.", "New income can feel already spent when old pressure enters the current cutoff.", "Stop new debt first, then give repayment a predictable rhythm.", "volatile"),
  socialLifestylePressure: signal("Social Lifestyle Pressure", "spending", "Social life, comparison, dates, barkada, and image spending may be shaping choices.", "Belonging and identity can quietly become a budget category without being named.", "Keep connection, but decide the amount before social pressure starts.", "spike"),
  budgetDiscipline: signal("Budget Discipline", "stability", "There is still planning capacity, boundary-setting, or a strength-based control signal.", "Salary rhythm becomes powerful when the rule is simple enough to repeat every payday.", "Keep one automatic rule: bills, savings, food, commute, then lifestyle.", "stable"),
};

export const YOUNG_PROFESSIONAL_SIGNALS = [
  { key: "independencePressure", icon: "🏠", label: "Independence" },
  { key: "salaryLeak", icon: "💸", label: "Salary Leak" },
  { key: "familySupportPressure", icon: "🤝", label: "Family Support" },
  { key: "careerPressure", icon: "📈", label: "Career" },
  { key: "burnoutRisk", icon: "🧠", label: "Burnout" },
  { key: "debtCarryover", icon: "🧾", label: "Debt" },
  { key: "socialLifestylePressure", icon: "✨", label: "Lifestyle" },
];

const YOUNG_PROFESSIONAL_SNAPSHOT_DEFINITIONS = {
  salaryLeak: {
    label: "Salary Leak",
    category: "spending",
    note: "Small daily expenses can quietly weaken the salary before major goals are protected.",
    insight: "This often happens when payday feels safe, but spending is not assigned before the week starts.",
    action: "Separate bills, savings, and daily spending before lifestyle money becomes available.",
    trendType: "spike",
  },
  billsPressure: {
    label: "Bills Pressure",
    category: "pressure",
    note: "Fixed costs like rent, utilities, food, commute, and subscriptions are taking real space.",
    insight: "Young professionals can feel stable on payday but pressured once due dates and essentials arrive.",
    action: "Move bill money first so the remaining balance is the only spendable amount.",
    trendType: "wave",
  },
  workFatigue: {
    label: "Work Fatigue",
    category: "energy",
    note: "Workload, commute, or shift rhythm may be draining the energy needed for money discipline.",
    insight: "When recovery is low, convenience spending can feel like the easiest form of rest.",
    action: "Create one tired-day rule for food, transport, or comfort spending.",
    trendType: "downward",
  },
  careerPressure: {
    label: "Career Pressure",
    category: "growth",
    note: "Career upgrades, image, skills, tools, and comparison can create spending pressure.",
    insight: "Growth spending helps only when it is planned, not when it reacts to insecurity.",
    action: "Use a career fund before buying courses, tools, or image upgrades.",
    trendType: "upward",
  },
  socialLifestyle: {
    label: "Social Lifestyle",
    category: "spending",
    note: "Social plans, dates, image, and barkada pressure can quietly become a budget category.",
    insight: "Connection matters, but saying yes without a limit can weaken savings and bills.",
    action: "Choose the social spending amount before the invite or plan starts.",
    trendType: "spike",
  },
};

const YOUNG_PROFESSIONAL_SNAPSHOT_BASE_WEIGHTS = {
  salaryLeak: 28,
  billsPressure: 24,
  workFatigue: 18,
  careerPressure: 16,
  socialLifestyle: 14,
};

const OPTION_SIGNALS = [
  { options: ["First stable job, still adjusting", "First salary rhythm", "Twice-a-month cutoff", "Living costs are becoming real", "Build a salary rhythm"], signals: { independencePressure: 24, budgetDiscipline: 8 } },
  { options: ["Living independently with bills", "Bills are due before payday", "Rent and utilities monthly", "Rent, utilities, and food", "Protect fixed bills first"], signals: { independencePressure: 28, budgetDiscipline: 8 } },
  { options: ["Supporting family while building career", "Part of salary goes home", "Family requests change the month", "Family contribution", "I give even when tight", "Set a support boundary"], signals: { familySupportPressure: 30, independencePressure: 8 } },
  { options: ["Career growth under pressure", "Courses or tools feel necessary", "Promotion pressure affects spending", "Career investment pressure", "I buy tools or courses quickly"], signals: { careerPressure: 30, socialLifestylePressure: 8 } },
  { options: ["Salary feels stable but always disappears", "Payday feels strong then fades", "Lifestyle costs grow quietly", "Lifestyle creep", "I overspend early then restrict later", "Stop salary leaks"], signals: { salaryLeak: 30, socialLifestylePressure: 10 } },
  { options: ["Shift work or BPO routine", "Salary is fixed but sleep is unstable", "Night shift changes spending", "Sleep schedule affects decisions", "I buy comfort after shifts"], signals: { burnoutRisk: 30, salaryLeak: 8 } },
  { options: ["Recovering from debt or pay-later habits", "Debt payments hit every cutoff", "Pay-later balances stack", "Debt repayment pressure", "I avoid checking the total", "Stop new debt first"], signals: { debtCarryover: 32, salaryLeak: 8 } },
  { options: ["Payday reward spending", "Lifestyle comparison", "I reward myself after payday", "I say yes to social spending", "Social spending pressure", "Professional image spending"], signals: { socialLifestylePressure: 20, salaryLeak: 14 } },
];

function canonicalize(value) {
  const cleaned = clean(value);
  return DISPLAY_TO_CANONICAL[cleaned] || cleaned;
}

function addSignals(target, incoming = {}) {
  Object.entries(incoming).forEach(([key, value]) => {
    if (!YOUNG_PROFESSIONAL_SIGNAL_DEFINITIONS[key]) return;
    target[key] = (target[key] || 0) + Math.max(0, Number(value) || 0);
  });
}

function signalsForOption(option) {
  const canonical = canonicalize(option);
  const signals = { budgetDiscipline: 3 };
  OPTION_SIGNALS.forEach((group) => {
    if (group.options.includes(canonical)) addSignals(signals, group.signals);
  });
  if (Object.keys(signals).length === 1) addSignals(signals, { independencePressure: 6 });
  return signals;
}

function topSignalKey(signals = {}) {
  return Object.entries(signals).sort((a, b) => b[1] - a[1])[0]?.[0] || "budgetDiscipline";
}

function scoreOf(scores = {}, key) {
  return Math.max(0, Number(scores[key]) || 0);
}

function normalizeSnapshotRows(rows = []) {
  const safeRows = rows.map((row, index) => ({ ...row, index, raw: Math.max(1, Number(row.raw) || 1) }));
  const total = safeRows.reduce((sum, row) => sum + row.raw, 0) || 1;
  const mapped = safeRows.map((row) => {
    const exact = (row.raw / total) * 100;
    return { ...row, value: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = 100 - mapped.reduce((sum, row) => sum + row.value, 0);
  mapped.slice().sort((a, b) => b.rest - a.rest || a.index - b.index).forEach((row) => {
    if (left <= 0) return;
    row.value += 1;
    left -= 1;
  });
  return mapped.map(({ raw, rest, index, ...row }) => row);
}

function snapshotStatus(value, index = 0) {
  if (index === 0 || value >= 28) return "Dominant";
  if (value >= 22) return "Heavy Presence";
  if (value >= 16) return "Growing Pressure";
  if (value >= 10) return "Supporting";
  return "Watch";
}

function buildYoungProfessionalSnapshotDistribution(signalScores = {}) {
  const rows = [
    {
      key: "salaryLeak",
      raw: YOUNG_PROFESSIONAL_SNAPSHOT_BASE_WEIGHTS.salaryLeak + scoreOf(signalScores, "salaryLeak") + scoreOf(signalScores, "debtCarryover") * 0.25 + scoreOf(signalScores, "socialLifestylePressure") * 0.18,
    },
    {
      key: "billsPressure",
      raw: YOUNG_PROFESSIONAL_SNAPSHOT_BASE_WEIGHTS.billsPressure + scoreOf(signalScores, "independencePressure") * 0.8 + scoreOf(signalScores, "familySupportPressure") * 0.25 + scoreOf(signalScores, "debtCarryover") * 0.2,
    },
    {
      key: "workFatigue",
      raw: YOUNG_PROFESSIONAL_SNAPSHOT_BASE_WEIGHTS.workFatigue + scoreOf(signalScores, "burnoutRisk") + scoreOf(signalScores, "salaryLeak") * 0.1,
    },
    {
      key: "careerPressure",
      raw: YOUNG_PROFESSIONAL_SNAPSHOT_BASE_WEIGHTS.careerPressure + scoreOf(signalScores, "careerPressure") + scoreOf(signalScores, "budgetDiscipline") * 0.12,
    },
    {
      key: "socialLifestyle",
      raw: YOUNG_PROFESSIONAL_SNAPSHOT_BASE_WEIGHTS.socialLifestyle + scoreOf(signalScores, "socialLifestylePressure") + scoreOf(signalScores, "careerPressure") * 0.12 + scoreOf(signalScores, "salaryLeak") * 0.08,
    },
  ];

  return normalizeSnapshotRows(rows)
    .sort((a, b) => b.value - a.value || a.index - b.index)
    .map((row, index) => {
      const definition = YOUNG_PROFESSIONAL_SNAPSHOT_DEFINITIONS[row.key];
      return {
        key: row.key,
        label: definition.label,
        value: row.value,
        status: snapshotStatus(row.value, index),
        trendType: definition.trendType,
        category: definition.category,
        note: definition.note,
        insight: definition.insight,
        action: definition.action,
      };
    });
}

export function getYoungProfessionalDisplayLabel(value) {
  const canonical = canonicalize(value);
  return YOUNG_PROFESSIONAL_DISPLAY_LABELS[canonical] || canonical;
}

function getBranch(draft = {}) {
  return YOUNG_PROFESSIONAL_BRANCHES[canonicalize(draft.setup)] || YOUNG_PROFESSIONAL_BRANCHES[YOUNG_PROFESSIONAL_ROOTS[0]];
}

function listFromBranch(branch, key, draft = {}) {
  const value = key === "workload" ? draft.rhythm : draft.workload || draft.pressure || draft.coping;
  if (Array.isArray(branch[key])) return branch[key];
  return branch[key]?.[canonicalize(value)] || branch[key]?.default || [];
}

export function getYoungProfessionalOptions(draft = {}, key) {
  const branch = getBranch(draft);
  if (key === "setup") return YOUNG_PROFESSIONAL_ROOTS;
  if (key === "rhythm") return branch.rhythm || [];
  return listFromBranch(branch, key, draft);
}

export function resetYoungProfessionalAfter(draft = {}, key) {
  const next = { ...draft };
  (YOUNG_PROFESSIONAL_RESET_AFTER[key] || []).forEach((item) => delete next[item]);
  return next;
}

export function buildYoungProfessionalDraft(previous = {}) {
  const draft = { stage: YOUNG_PROFESSIONAL_STAGE_KEY, ...previous };
  YOUNG_PROFESSIONAL_QUESTION_ORDER.forEach((key) => {
    const options = getYoungProfessionalOptions(draft, key);
    if (!options.length) return;
    if (!options.includes(canonicalize(draft[key]))) draft[key] = options[0];
    else draft[key] = canonicalize(draft[key]);
  });
  return draft;
}

export function completeYoungProfessionalDraft(previous = {}) {
  return buildYoungProfessionalDraft(previous);
}

export function getYoungProfessionalQuestionContext(questionKey, value, draft = {}) {
  const label = getYoungProfessionalDisplayLabel(value);
  const signals = signalsForOption(value);
  const signal = YOUNG_PROFESSIONAL_SIGNAL_DEFINITIONS[topSignalKey(signals)] || YOUNG_PROFESSIONAL_SIGNAL_DEFINITIONS.budgetDiscipline;
  const previous = YOUNG_PROFESSIONAL_QUESTION_ORDER.filter((key) => key !== questionKey && draft[key]).map((key) => getYoungProfessionalDisplayLabel(draft[key]));
  const previousText = previous.length ? ` Connected with ${previous.slice(0, 4).join(", ")}, this becomes part of the same young professional pattern.` : "";
  return {
    title: label,
    chip: label,
    summary: `This answer tells CLARA that ${signal.label.toLowerCase()} is influencing the way this stage feels right now. ${signal.insight}${previousText}`,
    signals,
  };
}

export function getYoungProfessionalSupportCopy(profile = {}) {
  const scores = getYoungProfessionalBehaviorProfile(profile).signalScores;
  const top = topSignalKey(scores);
  const signal = YOUNG_PROFESSIONAL_SIGNAL_DEFINITIONS[top] || YOUNG_PROFESSIONAL_SIGNAL_DEFINITIONS.independencePressure;
  return { title: signal.label, body: `${signal.note} ${signal.insight}` };
}

export function getYoungProfessionalSignalCopy(signalKey, mode = "awareness") {
  const signal = YOUNG_PROFESSIONAL_SIGNAL_DEFINITIONS[signalKey] || YOUNG_PROFESSIONAL_SIGNAL_DEFINITIONS.independencePressure;
  if (mode === "guidance") return { title: signal.label, body: signal.action };
  return { title: signal.label, body: `${signal.note} ${signal.insight}` };
}

export function getYoungProfessionalSignals() {
  return YOUNG_PROFESSIONAL_SIGNALS;
}

export function getYoungProfessionalBehaviorProfile(profile = {}) {
  const draft = completeYoungProfessionalDraft(profile);
  const signalScores = {};
  YOUNG_PROFESSIONAL_QUESTION_ORDER.forEach((key) => addSignals(signalScores, signalsForOption(draft[key])));
  addSignals(signalScores, { budgetDiscipline: 8 });
  const snapshotDistribution = buildYoungProfessionalSnapshotDistribution(signalScores);
  const primary = snapshotDistribution[0] || { label: "Salary Leak" };
  return {
    draft,
    signalScores,
    snapshotDistribution,
    title: "Building independence",
    caption: "Salary rhythm, adult responsibilities, career identity, and lifestyle pressure are forming.",
    overview: `CLARA sees ${String(primary.label).toLowerCase()} as the strongest current young professional pattern. This stage needs salary rules that protect bills, recovery, savings, and growth before lifestyle pressure takes over.`,
    struggles: snapshotDistribution.map((item) => item.label),
    recommendations: snapshotDistribution.map((item) => item.action),
  };
}

export function getYoungProfessionalSnapshot(profile = {}) {
  const behavior = getYoungProfessionalBehaviorProfile(profile);
  return {
    title: behavior.title,
    caption: behavior.caption,
    overview: behavior.overview,
    indicators: behavior.snapshotDistribution,
    struggles: behavior.struggles,
    recommendations: behavior.recommendations,
  };
}

export default {
  stageKey: YOUNG_PROFESSIONAL_STAGE_KEY,
  questionOrder: YOUNG_PROFESSIONAL_QUESTION_ORDER,
  roots: YOUNG_PROFESSIONAL_ROOTS,
  branches: YOUNG_PROFESSIONAL_BRANCHES,
  getOptions: getYoungProfessionalOptions,
  completeDraft: completeYoungProfessionalDraft,
  getQuestionContext: getYoungProfessionalQuestionContext,
  getSupportCopy: getYoungProfessionalSupportCopy,
  getSignalCopy: getYoungProfessionalSignalCopy,
  getSnapshot: getYoungProfessionalSnapshot,
};
