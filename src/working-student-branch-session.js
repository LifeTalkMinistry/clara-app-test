const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
const BRANCH_DRAFT_KEY = "clara_working_student_branch_draft_v1";

const STEP_KEY_BY_LABEL = {
  "CURRENT SETUP": "setup",
  "MONEY RHYTHM": "rhythm",
  "WEEKLY LOAD": "workload",
  "PRESSURE RIGHT NOW": "pressure",
  "PRESSURE RESPONSE": "coping",
  "WHEN PRESSURE HITS": "coping",
  "PROTECTION GOAL": "goal",
  "WHAT TO PROTECT": "goal",
};

const RESET_AFTER = {
  setup: ["rhythm", "workload", "pressure", "coping", "goal"],
  rhythm: ["workload", "pressure", "coping", "goal"],
  workload: ["pressure", "coping", "goal"],
  pressure: ["coping", "goal"],
  coping: ["goal"],
  goal: [],
};

const ROOT_OPTIONS = [
  "Mostly supported, trying to earn extra",
  "Working mainly to continue school",
  "Helping family while studying",
  "Trying to survive school mostly alone",
  "Balancing school, work, and exhaustion",
  "Building a future while financially unstable",
  "Trying to recover from constant financial pressure",
];

const DISPLAY_LABELS = {
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
  "I want independence but still rely on support": "Independence while supported",
  "I spend small amounts without noticing": "Small spending goes unnoticed",
  "I reward myself after effort": "I reward myself after effort",
  "I avoid strict tracking": "I avoid strict tracking",
  "I can pause when I plan early": "I can pause when prepared",
  "Build discipline before bigger responsibilities": "Build discipline early",
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

  "Part of my income goes home": "Part of income goes home",
  "I give when family needs appear": "I give when family needs appear",
  "Allowance/work money gets shared": "Allowance/work money gets shared",
  "I earn extra to support family": "I earn extra for family",
  "School, work, and home needs overlap": "School, work, and home overlap",
  "I feel responsible even when tired": "I feel responsible while tired",
  "Family requests change the week": "Family needs change the week",
  "I still try to keep school stable": "I try to keep school stable",
  "Guilt when I protect my own money": "Guilt when I protect my money",
  "School costs competing with home needs": "School costs vs home needs",
  "Weak personal buffer": "Weak personal buffer",
  "I give even when my budget is tight": "I give even when tight",
  "I delay my own needs": "I delay my own needs",
  "I hide money stress": "I hide money stress",
  "I try to set limits but feel guilty": "I set limits but feel guilty",
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

const CONTEXT_COPY = {
  "Mostly supported, trying to earn extra": [
    "Supported independence",
    "CLARA sees support in your environment, but also a chance to build discipline early. This path should watch small leaks, social pressure, and how extra income disappears before it becomes useful.",
  ],
  "Working mainly to continue school": [
    "School protection path",
    "CLARA sees school continuity as the anchor. The goal is not strict saving first; it is protecting tuition, projects, food, fare, and deadlines so school does not get interrupted.",
  ],
  "Helping family while studying": [
    "Shared responsibility path",
    "CLARA sees a student role and a support role happening together. This path needs care, but also boundaries so family help does not quietly weaken school stability.",
  ],
  "Trying to survive school mostly alone": [
    "Self-support survival path",
    "CLARA sees limited backup and smaller room for mistakes. The first protection is food, fare, school needs, and a tiny buffer before aggressive goals.",
  ],
  "Balancing school, work, and exhaustion": [
    "Energy-pressure path",
    "CLARA sees time and energy turning into money pressure. This path should watch convenience spending, missed tracking, and recovery needs without blaming the user.",
  ],
  "Building a future while financially unstable": [
    "Future-builder path",
    "CLARA sees ambition with unstable rhythm. This path is not crisis by default; it needs one clear priority, small repeatable wins, and protection from micro-spending.",
  ],
  "Trying to recover from constant financial pressure": [
    "Recovery path",
    "CLARA sees pressure carrying over from previous weeks. This path should lower the repair-mode feeling through repayment rhythm, no-new-debt rules, and a tiny food/fare buffer.",
  ],
  "Control is still available": ["Control signal", "CLARA sees this as a good moment to build rhythm before pressure grows. The user still has room to choose, not just react."],
  "I can pause when I plan early": ["Planning control", "CLARA sees a protective habit: when the user prepares early, spending decisions become calmer and less reactive."],
  "Finish school without burning out": ["Graduation with recovery", "CLARA should protect both the school goal and the user's energy. Finishing should not require breaking down."],
  "Build the smallest emergency buffer": ["Tiny buffer first", "CLARA should start with the smallest realistic protection layer. For this path, even food/fare backup can create emotional relief."],
  "Create low-energy money rules": ["Low-energy rules", "CLARA should not demand perfect tracking from an exhausted user. The better move is a simple rule that still works on tired days."],
  "Choose one priority first": ["One priority first", "CLARA sees priority confusion as the real pressure. The next step is not doing everything; it is choosing one thing to protect first."],
  "Create a repayment rhythm": ["Repayment rhythm", "CLARA should reduce repair mode by making repayment predictable, even if the amount starts small."],
};

const BRANCHES = {
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

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const loud = (value) => clean(value).toUpperCase();
const ORDER = ["setup", "rhythm", "workload", "pressure", "coping", "goal"];
const displayFor = (value) => DISPLAY_LABELS[clean(value)] || clean(value);

function readJson(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "{}") || {};
  } catch {
    return {};
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value || {}));
  } catch {
    // Optional temporary branch context.
  }
}

function writeAndNotify(key, value) {
  writeJson(key, value);
  try {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(value || {}) }));
  } catch {
    window.dispatchEvent(new Event("storage"));
  }
}

function getButtonLabel(button) {
  return clean(button?.querySelector?.("span")?.textContent || button?.innerText || button?.textContent);
}

function branchFor(setup) {
  return BRANCHES[clean(setup)] || BRANCHES[ROOT_OPTIONS[0]];
}

function optionsFor(draft, key) {
  const setup = ROOT_OPTIONS.includes(clean(draft.setup)) ? clean(draft.setup) : ROOT_OPTIONS[0];
  const branch = branchFor(setup);
  if (key === "setup") return ROOT_OPTIONS;
  if (key === "rhythm") return branch.rhythm;
  if (key === "workload") return branch.workload?.[clean(draft.rhythm)] || branch.workload?.default || [];
  if (key === "pressure") return branch.pressure?.[clean(draft.workload)] || branch.pressure?.default || [];
  if (key === "coping") return branch.coping?.[clean(draft.pressure)] || branch.coping?.default || [];
  if (key === "goal") return branch.goal?.[clean(draft.coping)] || branch.goal?.default || [];
  return [];
}

function completeDraft(raw = {}) {
  const next = { stage: "Working Student", ...raw };
  ORDER.forEach((key) => {
    const options = optionsFor(next, key);
    if (!options.includes(clean(next[key]))) next[key] = options[0];
  });
  return next;
}

function resetAfter(draft, key) {
  const next = { ...draft };
  (RESET_AFTER[key] || []).forEach((item) => delete next[item]);
  return next;
}

function rememberSelection(key, value) {
  if (!key || !value) return;
  const currentProfile = readJson(LIFE_STAGE_KEY);
  const currentDraft = readJson(BRANCH_DRAFT_KEY);
  const merged = { stage: "Working Student", ...currentProfile, ...currentDraft, [key]: value };
  const next = completeDraft(resetAfter(merged, key));
  writeAndNotify(BRANCH_DRAFT_KEY, next);
}

function detectStepSection() {
  const sections = Array.from(document.querySelectorAll("section"));
  for (const section of sections) {
    const label = clean(section.querySelector("p")?.textContent);
    const key = STEP_KEY_BY_LABEL[loud(label)];
    if (key && section.querySelector("button")) return { section, key };
  }
  return { section: null, key: null };
}

function isWorkingStudentFlowActive() {
  const headings = Array.from(document.querySelectorAll("h2, h3, p, button"));
  return headings.some((node) => clean(node.textContent).startsWith("Working Student")) || clean(readJson(BRANCH_DRAFT_KEY).stage) === "Working Student";
}

function setButtonText(button, text) {
  const label = button?.querySelector?.("span");
  if (label && clean(label.textContent) !== text) label.textContent = text;
}

function styleSelected(button, active) {
  if (!button) return;
  if (active) {
    button.dataset.claraBranchSelected = "true";
    button.style.borderColor = "rgba(103, 248, 255, 0.42)";
    button.style.background = "linear-gradient(135deg, rgba(45,212,191,.16), rgba(59,130,246,.12) 48%, rgba(91,63,209,.16))";
    button.style.color = "rgba(240,253,255,.96)";
  } else if (button.dataset.claraBranchSelected === "true") {
    delete button.dataset.claraBranchSelected;
    button.style.borderColor = "";
    button.style.background = "";
    button.style.color = "";
  }
}

function findContextBoard() {
  const marker = Array.from(document.querySelectorAll("p")).find((node) => loud(node.textContent) === "CLARA CONTEXT BOARD");
  const header = marker?.closest("header");
  const title = header?.querySelector("h3");
  const summary = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { title, summary };
}

function patchContextBoard(stored, key) {
  const value = clean(stored?.[key]);
  const copy = CONTEXT_COPY[value];
  if (!copy) return;
  const { title, summary } = findContextBoard();
  if (!title || !summary) return;
  if (clean(title.textContent) !== copy[0]) title.textContent = copy[0];
  if (clean(summary.textContent) !== copy[1]) summary.textContent = copy[1];
}

function patchCurrentOptions() {
  if (typeof document === "undefined") return;
  const { section, key } = detectStepSection();
  if (!section || !key || !isWorkingStudentFlowActive()) return;

  const stored = completeDraft({ ...readJson(LIFE_STAGE_KEY), ...readJson(BRANCH_DRAFT_KEY), stage: "Working Student" });
  const options = optionsFor(stored, key);
  if (!options.length) return;

  const buttons = Array.from(section.querySelectorAll("button"));
  buttons.forEach((button, index) => {
    const option = options[index];
    if (!option) {
      button.style.display = "none";
      return;
    }
    button.style.display = "";
    button.dataset.claraBranchOption = option;
    setButtonText(button, displayFor(option));
    styleSelected(button, clean(stored[key]) === option);
  });

  patchContextBoard(stored, key);
}

function saveFinalBranchProfileSoon() {
  const writeFinal = () => {
    const current = readJson(LIFE_STAGE_KEY);
    const branch = completeDraft({ ...current, ...readJson(BRANCH_DRAFT_KEY), stage: "Working Student" });
    const finalProfile = { ...current, ...branch, stage: "Working Student", updatedAt: new Date().toISOString() };
    writeAndNotify(LIFE_STAGE_KEY, finalProfile);
    writeAndNotify(BRANCH_DRAFT_KEY, finalProfile);
  };
  window.setTimeout(writeFinal, 0);
  window.setTimeout(writeFinal, 80);
  window.setTimeout(writeFinal, 240);
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_WORKING_STUDENT_BRANCH_SESSION_V2__) return;
  window.__CLARA_WORKING_STUDENT_BRANCH_SESSION_V2__ = true;

  let scheduled = false;
  const schedulePatch = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      patchCurrentOptions();
    });
  };

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target?.closest?.("button");
      if (!button) return;
      const value = clean(button.dataset.claraBranchOption || getButtonLabel(button));

      if (value === "Working Student") {
        const base = completeDraft({ stage: "Working Student", setup: ROOT_OPTIONS[0] });
        writeAndNotify(BRANCH_DRAFT_KEY, base);
        window.setTimeout(schedulePatch, 60);
        return;
      }

      const { key } = detectStepSection();
      if (key && optionsFor(completeDraft(readJson(BRANCH_DRAFT_KEY)), key).includes(value)) {
        rememberSelection(key, value);
        window.setTimeout(schedulePatch, 30);
        window.setTimeout(schedulePatch, 120);
        return;
      }

      if (/apply stage/i.test(value)) saveFinalBranchProfileSoon();
      window.setTimeout(schedulePatch, 80);
    },
    true
  );

  const observer = new MutationObserver(schedulePatch);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener("storage", schedulePatch, { passive: true });
  window.requestAnimationFrame(schedulePatch);
}

try {
  install();
} catch (error) {
  console.warn("CLARA working student branch session failed:", error);
}
