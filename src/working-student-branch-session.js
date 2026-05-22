import {
  WORKING_STUDENT_STAGE_KEY,
  WORKING_STUDENT_QUESTION_ORDER,
  WORKING_STUDENT_RESET_AFTER,
  buildWorkingStudentDraft,
  cleanWorkingStudentValue,
  completeWorkingStudentDraft,
  getWorkingStudentDisplayLabel,
  getWorkingStudentOptions,
  getWorkingStudentQuestionContext,
  resetWorkingStudentAfter,
} from "./components/fresh/main-dashboard/dashboard-panels/me/workingStudentLifeStageSource";

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

const clean = cleanWorkingStudentValue;
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

function writeAndNotify(key, value) {
  writeJson(key, value);
  try {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(value || {}) }));
  } catch {
    window.dispatchEvent(new Event("storage"));
  }
}

function getButtonLabel(button) {
  return clean(button?.dataset?.claraBranchOption || button?.querySelector?.("span")?.textContent || button?.innerText || button?.textContent);
}

function getStoredWorkingStudentDraft() {
  return completeWorkingStudentDraft({
    ...readJson(LIFE_STAGE_KEY),
    ...readJson(BRANCH_DRAFT_KEY),
    stage: WORKING_STUDENT_STAGE_KEY,
  });
}

function rememberSelection(key, value) {
  if (!key || !value) return;
  const merged = { ...getStoredWorkingStudentDraft(), [key]: value };
  const next = completeWorkingStudentDraft(resetWorkingStudentAfter(merged, key));
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
  return (
    Array.from(document.querySelectorAll("h2, h3, p, button")).some((node) => clean(node.textContent).startsWith(WORKING_STUDENT_STAGE_KEY)) ||
    clean(readJson(BRANCH_DRAFT_KEY).stage) === WORKING_STUDENT_STAGE_KEY
  );
}

function setButtonText(button, text) {
  const label = button?.querySelector?.("span");
  if (label && clean(label.textContent) !== text) label.textContent = text;
}

function clearRuntimeActiveStyle(button) {
  if (!button) return;
  delete button.dataset.claraBranchSelected;
  button.style.borderColor = "";
  button.style.background = "";
  button.style.color = "";
  button.style.boxShadow = "";
}

function findContextBoard() {
  const marker = Array.from(document.querySelectorAll("p")).find((node) => loud(node.textContent) === "CLARA CONTEXT BOARD");
  const header = marker?.closest("header");
  const title = header?.querySelector("h3");
  const summary = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { title, summary };
}

function patchContextBoard(stored, key) {
  const context = getWorkingStudentQuestionContext(key, stored?.[key], stored);
  if (!context?.title || !context?.summary) return;
  const { title, summary } = findContextBoard();
  if (!title || !summary) return;
  if (clean(title.textContent) !== context.title) title.textContent = context.title;
  if (clean(summary.textContent) !== context.summary) summary.textContent = context.summary;
}

function patchCurrentOptions() {
  if (typeof document === "undefined") return;
  const { section, key } = detectStepSection();
  if (!section || !key || !isWorkingStudentFlowActive()) return;

  const stored = getStoredWorkingStudentDraft();
  const options = getWorkingStudentOptions(stored, key);
  if (!options.length) return;

  const buttons = Array.from(section.querySelectorAll("button"));
  buttons.forEach((button, index) => {
    const option = options[index];
    clearRuntimeActiveStyle(button);
    if (!option) {
      button.style.display = "none";
      return;
    }
    button.style.display = "";
    button.dataset.claraBranchOption = option;
    setButtonText(button, getWorkingStudentDisplayLabel(option));
  });

  patchContextBoard(stored, key);
}

function saveFinalBranchProfileSoon() {
  const writeFinal = () => {
    const current = readJson(LIFE_STAGE_KEY);
    const branch = completeWorkingStudentDraft({ ...current, ...readJson(BRANCH_DRAFT_KEY), stage: WORKING_STUDENT_STAGE_KEY });
    const finalProfile = { ...current, ...branch, stage: WORKING_STUDENT_STAGE_KEY, updatedAt: new Date().toISOString() };
    writeAndNotify(LIFE_STAGE_KEY, finalProfile);
    writeAndNotify(BRANCH_DRAFT_KEY, finalProfile);
  };
  window.setTimeout(writeFinal, 0);
  window.setTimeout(writeFinal, 80);
  window.setTimeout(writeFinal, 240);
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_WORKING_STUDENT_BRANCH_SESSION_V4__) return;
  window.__CLARA_WORKING_STUDENT_BRANCH_SESSION_V4__ = true;

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
      const value = getButtonLabel(button);

      if (value === WORKING_STUDENT_STAGE_KEY) {
        const base = buildWorkingStudentDraft({ stage: WORKING_STUDENT_STAGE_KEY });
        writeAndNotify(BRANCH_DRAFT_KEY, base);
        window.setTimeout(schedulePatch, 60);
        return;
      }

      const { key } = detectStepSection();
      const branchOption = clean(button.dataset.claraBranchOption);
      if (key && branchOption && getWorkingStudentOptions(getStoredWorkingStudentDraft(), key).includes(branchOption)) {
        rememberSelection(key, branchOption);
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
