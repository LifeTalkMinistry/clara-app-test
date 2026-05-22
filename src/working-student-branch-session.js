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

const ROOT_OPTIONS = new Set([
  "Mostly supported, trying to earn extra",
  "Working mainly to continue school",
  "Helping family while studying",
  "Trying to survive school mostly alone",
  "Balancing school, work, and exhaustion",
  "Building a future while financially unstable",
  "Trying to recover from constant financial pressure",
]);

const ALL_BRANCH_OPTIONS = new Set([
  ...ROOT_OPTIONS,
  "Allowance is the base, work is extra",
  "Fixed part-time pay for personal needs",
  "Occasional side income when available",
  "Extra income disappears into small spending",
  "Manageable but inconsistent",
  "Busy during exam or work weeks",
  "Social and school costs overlap",
  "Enough control if I plan early",
  "Food, fare, and school extras",
  "Social or reward spending",
  "Saving feels inconsistent",
  "I want independence but still rely on support",
  "I spend small amounts without noticing",
  "I reward myself after effort",
  "I avoid strict tracking",
  "I can pause when I plan early",
  "Build discipline before bigger responsibilities",
  "Save small without guilt",
  "Control small leaks",
  "Use extra income with purpose",
  "Fixed work income for tuition",
  "Irregular income for school requirements",
  "Project/seasonal work before deadlines",
  "Allowance is not enough for school costs",
  "Class and work are both required",
  "School deadlines create work pressure",
  "Little room when fees are near",
  "I keep going even when tired",
  "Tuition and school payments",
  "Projects, printing, and materials",
  "Daily fare and food while attending",
  "Fear of stopping school",
  "I cut personal needs to pay school costs",
  "I delay non-school payments",
  "I take extra work even when tired",
  "I avoid spending on myself",
  "Protect school continuity",
  "Avoid debt from school pressure",
  "Keep food and fare stable",
  "Finish school without burning out",
  "Part of my income goes home",
  "I give when family needs appear",
  "Allowance/work money gets shared",
  "I earn extra to support family",
  "School, work, and home needs overlap",
  "I feel responsible even when tired",
  "Family requests change the week",
  "I still try to keep school stable",
  "Family contribution",
  "Guilt when I protect my own money",
  "School costs competing with home needs",
  "Weak personal buffer",
  "I give even when my budget is tight",
  "I delay my own needs",
  "I hide money stress",
  "I try to set limits but feel guilty",
  "Help family without losing stability",
  "Set a support boundary",
  "Protect school and daily needs",
  "Build a personal safety buffer",
  "Fixed low-income work",
  "Irregular side hustle survival income",
  "Borrowing between pay cycles",
  "Project/seasonal income with gaps",
  "School and survival costs compete daily",
  "Food and fare need careful planning",
  "No room for surprise expenses",
  "I am tired but have to continue",
  "Food and transport survival",
  "Tuition or school deadlines",
  "No emergency margin",
  "Borrowing risk when timing fails",
  "I cut meals or needs to stretch money",
  "I avoid checking when money is low",
  "I borrow to survive the gap",
  "I overwork when pressure hits",
  "Build the smallest emergency buffer",
  "Finish school safely",
  "Stop survival borrowing",
  "Protect food and fare first",
  "Fixed pay but low recovery",
  "Irregular income plus heavy schedule",
  "Work shifts disrupt school rhythm",
  "Extra work happens when deadlines hit",
  "Heavy school-work overlap",
  "Little time to rest",
  "Commute drains energy",
  "Deadlines and shifts collide",
  "Convenience spending from exhaustion",
  "Rushed food and transport",
  "Missed tracking because I am tired",
  "Work-school schedule conflict",
  "I buy comfort after hard days",
  "I choose convenience to save energy",
  "I forget to track expenses",
  "I push rest aside",
  "Create low-energy money rules",
  "Reduce convenience leaks",
  "Protect rest as part of budgeting",
  "Income changes month to month",
  "Side hustle income is growing slowly",
  "Support and work income both fluctuate",
  "Some weeks are strong, some are tight",
  "I am ambitious but stretched",
  "My routine changes often",
  "I am learning while earning",
  "Future pressure makes me anxious",
  "Unstable income rhythm",
  "Repeated small expenses",
  "Future goals feel far",
  "I do not know what to prioritize first",
  "I switch plans often",
  "I spend when I feel stuck",
  "I start saving then stop",
  "I need clearer priorities",
  "Create a simple money rhythm",
  "Protect future goals slowly",
  "Choose one priority first",
  "Money arrives after expenses are due",
  "I borrow then repay repeatedly",
  "Income is unstable and pressure carries over",
  "Debt or delayed payments affect the week",
  "The month feels like repair mode",
  "Old pressure affects current choices",
  "I feel tired from catching up",
  "There is little room to reset",
  "Repayment pressure",
  "Cash-flow timing mismatch",
  "Borrowing again before the next income",
  "Avoiding money because it feels heavy",
  "I delay payments to survive",
  "I avoid checking the full picture",
  "I borrow again when daily costs hit",
  "I cut needs too much",
  "Stop pressure from stacking",
  "Build a no-new-debt rule",
  "Create a repayment rhythm",
  "Protect a tiny food/fare buffer",
]);

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const loud = (value) => clean(value).toUpperCase();

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

function detectStepKey(button) {
  const section = button?.closest?.("section");
  const label = clean(section?.querySelector?.("p")?.textContent);
  return STEP_KEY_BY_LABEL[loud(label)] || null;
}

function resetAfter(draft, key) {
  const order = ["setup", "rhythm", "workload", "pressure", "coping", "goal"];
  const index = order.indexOf(key);
  if (index < 0) return draft;
  const next = { ...draft };
  order.slice(index + 1).forEach((item) => delete next[item]);
  return next;
}

function rememberSelection(key, value) {
  if (!key || !value) return;
  const currentProfile = readJson(LIFE_STAGE_KEY);
  const currentDraft = readJson(BRANCH_DRAFT_KEY);
  const next = resetAfter({ stage: "Working Student", ...currentProfile, ...currentDraft, [key]: value }, key);
  writeJson(BRANCH_DRAFT_KEY, next);
  window.dispatchEvent(new StorageEvent("storage", { key: BRANCH_DRAFT_KEY, newValue: JSON.stringify(next) }));
}

function clearBranchDraftIfLeavingWorkingStudent(value) {
  if (value !== "Working Student") return;
  const profile = readJson(LIFE_STAGE_KEY);
  writeJson(BRANCH_DRAFT_KEY, { stage: "Working Student", setup: ROOT_OPTIONS.values().next().value, ...profile });
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_WORKING_STUDENT_BRANCH_SESSION__) return;
  window.__CLARA_WORKING_STUDENT_BRANCH_SESSION__ = true;

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target?.closest?.("button");
      if (!button) return;
      const value = clean(button.innerText || button.textContent);
      if (value === "Working Student") {
        clearBranchDraftIfLeavingWorkingStudent(value);
        return;
      }
      if (!ALL_BRANCH_OPTIONS.has(value)) return;
      const key = ROOT_OPTIONS.has(value) ? "setup" : detectStepKey(button);
      rememberSelection(key, value);
    },
    true
  );
}

try {
  install();
} catch (error) {
  console.warn("CLARA working student branch session failed:", error);
}
