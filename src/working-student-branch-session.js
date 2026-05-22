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
    setButtonText(button, option);
    styleSelected(button, clean(stored[key]) === option);
  });
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
  if (window.__CLARA_WORKING_STUDENT_BRANCH_SESSION__) return;
  window.__CLARA_WORKING_STUDENT_BRANCH_SESSION__ = true;

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
