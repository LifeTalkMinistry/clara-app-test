import {
  WORKING_STUDENT_STAGE_KEY,
  WORKING_STUDENT_ROOTS,
  WORKING_STUDENT_BRANCHES,
  WORKING_STUDENT_DISPLAY_LABELS,
  getWorkingStudentDisplayLabel,
} from "./components/fresh/main-dashboard/dashboard-panels/me/workingStudentLifeStageSource";
import {
  YOUNG_PROFESSIONAL_STAGE_KEY,
  YOUNG_PROFESSIONAL_ROOTS,
  YOUNG_PROFESSIONAL_BRANCHES,
  YOUNG_PROFESSIONAL_DISPLAY_LABELS,
  getYoungProfessionalDisplayLabel,
} from "./components/fresh/main-dashboard/dashboard-panels/me/youngProfessionalLifeStageSource";
import {
  LIVING_WITH_PARTNER_STAGE_KEY,
  LIVING_WITH_PARTNER_ROOTS,
  LIVING_WITH_PARTNER_BRANCHES,
  getLivingWithPartnerDisplayLabel,
} from "./components/fresh/main-dashboard/dashboard-panels/me/livingWithPartnerLifeStageSource";
import { LIFE_STAGE_INTELLIGENCE, STAGES } from "./components/fresh/main-dashboard/dashboard-panels/me/lifeStageIntelligenceData";

const FLOW_MARKER = "CLARA CONTEXT BOARD";
const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

const STEP_META = {
  "CURRENT SETUP": { key: "setup", label: "CURRENT SETUP", question: "Which setup feels closest to your real life right now?", index: 0 },
  "MONEY RHYTHM": { key: "rhythm", label: "MONEY RHYTHM", question: "How does money usually come into your week or month?", index: 1 },
  "WEEKLY LOAD": { key: "workload", label: "WEEKLY LOAD", question: "How stretched does your normal week feel?", index: 2 },
  "PRESSURE RIGHT NOW": { key: "pressure", label: "PRESSURE RIGHT NOW", question: "What is putting the most pressure on your money right now?", index: 3 },
  "PRESSURE RESPONSE": { key: "coping", label: "WHEN PRESSURE HITS", question: "What do you usually do when money pressure gets heavy?", index: 4 },
  "WHEN PRESSURE HITS": { key: "coping", label: "WHEN PRESSURE HITS", question: "What do you usually do when money pressure gets heavy?", index: 4 },
  "PROTECTION GOAL": { key: "goal", label: "WHAT TO PROTECT", question: "What are you trying to protect most right now?", index: 5 },
  "WHAT TO PROTECT": { key: "goal", label: "WHAT TO PROTECT", question: "What are you trying to protect most right now?", index: 5 },
};

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const loud = (value) => clean(value).toUpperCase();
const lower = (value) => clean(value).toLowerCase();
const isVisible = (node) => !!node && !!(node.offsetWidth || node.offsetHeight || node.getClientRects?.().length);
const getStepMeta = (text) => STEP_META[loud(text)] || null;

const STAGE_NAMES = Array.from(
  new Set([
    WORKING_STUDENT_STAGE_KEY,
    YOUNG_PROFESSIONAL_STAGE_KEY,
    LIVING_WITH_PARTNER_STAGE_KEY,
    ...STAGES,
  ].filter(Boolean))
);

function collectBranchOptions(branches = {}) {
  const values = [];
  Object.values(branches || {}).forEach((branch) => {
    Object.values(branch || {}).forEach((entry) => {
      if (Array.isArray(entry)) values.push(...entry);
      else if (entry && typeof entry === "object") {
        Object.values(entry).forEach((list) => {
          if (Array.isArray(list)) values.push(...list);
        });
      }
    });
  });
  return values;
}

function branchStepOptions(branch, key) {
  const entry = branch?.[key];
  if (Array.isArray(entry)) return entry;
  if (entry && typeof entry === "object") {
    return Object.values(entry).flatMap((list) => (Array.isArray(list) ? list : []));
  }
  return [];
}

function collectFieldOptions(fields = {}) {
  return Object.values(fields || {}).flatMap((value) => (Array.isArray(value) ? value : []));
}

function makeOptionSet({ roots = [], branches = {}, fields = {}, displayLabels = {} } = {}) {
  return new Set([
    ...roots,
    ...collectBranchOptions(branches),
    ...collectFieldOptions(fields),
    ...Object.keys(displayLabels),
    ...Object.values(displayLabels),
  ].filter(Boolean).map(loud));
}

const STAGE_OPTION_SETS = STAGE_NAMES.reduce((sets, stage) => {
  sets[stage] = makeOptionSet({ fields: LIFE_STAGE_INTELLIGENCE[stage]?.fields || {} });
  return sets;
}, {});

STAGE_OPTION_SETS[WORKING_STUDENT_STAGE_KEY] = makeOptionSet({
  roots: WORKING_STUDENT_ROOTS,
  branches: WORKING_STUDENT_BRANCHES,
  fields: LIFE_STAGE_INTELLIGENCE[WORKING_STUDENT_STAGE_KEY]?.fields || {},
  displayLabels: WORKING_STUDENT_DISPLAY_LABELS,
});

STAGE_OPTION_SETS[YOUNG_PROFESSIONAL_STAGE_KEY] = makeOptionSet({
  roots: YOUNG_PROFESSIONAL_ROOTS,
  branches: YOUNG_PROFESSIONAL_BRANCHES,
  fields: LIFE_STAGE_INTELLIGENCE[YOUNG_PROFESSIONAL_STAGE_KEY]?.fields || {},
  displayLabels: YOUNG_PROFESSIONAL_DISPLAY_LABELS,
});

STAGE_OPTION_SETS[LIVING_WITH_PARTNER_STAGE_KEY] = makeOptionSet({
  roots: LIVING_WITH_PARTNER_ROOTS,
  branches: LIVING_WITH_PARTNER_BRANCHES,
  fields: LIFE_STAGE_INTELLIGENCE[LIVING_WITH_PARTNER_STAGE_KEY]?.fields || {},
});

function getDisplayLabel(stage, raw) {
  if (stage === WORKING_STUDENT_STAGE_KEY) return getWorkingStudentDisplayLabel(raw) || raw;
  if (stage === YOUNG_PROFESSIONAL_STAGE_KEY) return getYoungProfessionalDisplayLabel(raw) || raw;
  if (stage === LIVING_WITH_PARTNER_STAGE_KEY) return getLivingWithPartnerDisplayLabel(raw) || raw;
  return raw;
}

function collectSourceRows(stage) {
  const rows = [];
  if (stage === WORKING_STUDENT_STAGE_KEY) {
    WORKING_STUDENT_ROOTS.forEach((raw) => rows.push({ stage, raw, step: "setup" }));
    Object.values(WORKING_STUDENT_BRANCHES || {}).forEach((branch) => {
      (branch.rhythm || []).forEach((raw) => rows.push({ stage, raw, step: "rhythm" }));
      ["workload", "pressure", "coping", "goal"].forEach((step) => {
        branchStepOptions(branch, step).forEach((raw) => rows.push({ stage, raw, step }));
      });
    });
    Object.values(WORKING_STUDENT_DISPLAY_LABELS || {}).forEach((raw) => rows.push({ stage, raw, step: inferStepFromLabel(raw) }));
    return rows;
  }

  if (stage === YOUNG_PROFESSIONAL_STAGE_KEY) {
    YOUNG_PROFESSIONAL_ROOTS.forEach((raw) => rows.push({ stage, raw, step: "setup" }));
    Object.values(YOUNG_PROFESSIONAL_BRANCHES || {}).forEach((branch) => {
      (branch.rhythm || []).forEach((raw) => rows.push({ stage, raw, step: "rhythm" }));
      ["workload", "pressure", "coping", "goal"].forEach((step) => {
        branchStepOptions(branch, step).forEach((raw) => rows.push({ stage, raw, step }));
      });
    });
    Object.values(YOUNG_PROFESSIONAL_DISPLAY_LABELS || {}).forEach((raw) => rows.push({ stage, raw, step: inferStepFromLabel(raw) }));
    return rows;
  }

  if (stage === LIVING_WITH_PARTNER_STAGE_KEY) {
    LIVING_WITH_PARTNER_ROOTS.forEach((raw) => rows.push({ stage, raw, step: "setup" }));
    Object.values(LIVING_WITH_PARTNER_BRANCHES || {}).forEach((branch) => {
      (branch.rhythm || []).forEach((raw) => rows.push({ stage, raw, step: "rhythm" }));
      ["workload", "pressure", "coping", "goal"].forEach((step) => {
        branchStepOptions(branch, step).forEach((raw) => rows.push({ stage, raw, step }));
      });
    });
    return rows;
  }

  const fields = LIFE_STAGE_INTELLIGENCE[stage]?.fields || {};
  Object.entries(fields).forEach(([step, options]) => {
    if (Array.isArray(options)) options.forEach((raw) => rows.push({ stage, raw, step }));
  });
  return rows;
}

function inferStepFromLabel(label) {
  const text = lower(label);
  if (["save", "protect", "build", "create", "control", "reduce", "avoid debt", "buffer", "rule", "goal", "rhythm", "automatic"].some((term) => text.includes(term))) return "goal";
  if (["i ", "borrow", "avoid", "delay", "cut", "reward", "pause", "overwork", "forget", "push", "spend", "move money", "set aside"].some((term) => text.includes(term))) return "coping";
  if (["pressure", "cost", "debt", "bill", "rent", "food", "fare", "family", "buffer", "margin", "gap", "emergency"].some((term) => text.includes(term))) return "pressure";
  if (["tired", "busy", "heavy", "routine", "workload", "deadline", "commute", "rest", "shift", "sleep", "burnout", "schedule"].some((term) => text.includes(term))) return "workload";
  if (["income", "pay", "allowance", "money", "salary", "side", "part-time", "cutoff", "commission", "cash-flow"].some((term) => text.includes(term))) return "rhythm";
  return "setup";
}

function humanStageName(stage) {
  return clean(stage).replace(/-/g, " ");
}

function sentenceForSetup(stage, label) {
  return `Choosing “${label}” usually means this is the main life setup shaping the money situation in the ${humanStageName(stage)} stage. It describes the environment around responsibility, support, stability, or pressure right now.`;
}

function sentenceForRhythm(stage, label) {
  return `Choosing “${label}” usually means this is how money tends to arrive, move, or disappear in the ${humanStageName(stage)} stage. The timing and reliability of that money can change how safe planning feels.`;
}

function sentenceForWorkload(stage, label) {
  return `Choosing “${label}” usually means time, energy, or routine is affecting the way money decisions feel. When the week is stretched, even simple choices can feel heavier than they look.`;
}

function sentenceForPressure(stage, label) {
  return `Choosing “${label}” usually means this pressure is taking the most financial or emotional space right now. It can make normal spending feel more sensitive because the concern is already active.`;
}

function sentenceForCoping(stage, label) {
  return `Choosing “${label}” usually means this is the response that tends to appear when pressure gets heavy. It shows how the situation can turn into real behavior during stressful days.`;
}

function sentenceForGoal(stage, label) {
  return `Choosing “${label}” usually means this is the part of life the user wants to protect most. It shows what stability would feel like before bigger changes or stricter discipline are introduced.`;
}

const STEP_MEANING_BUILDERS = {
  setup: sentenceForSetup,
  rhythm: sentenceForRhythm,
  workload: sentenceForWorkload,
  pressure: sentenceForPressure,
  coping: sentenceForCoping,
  goal: sentenceForGoal,
};

const BESPOKE_MEANINGS = {
  [WORKING_STUDENT_STAGE_KEY]: {
    "Supported, learning independence": "Choosing “Supported, learning independence” usually means support still exists, but independence is starting to become real. The pressure is learning how to handle personal money before bigger responsibilities arrive.",
    "Working to protect school": "Choosing “Working to protect school” usually means work is closely tied to staying in school. Money decisions may feel heavier because income is connected to tuition, requirements, fare, and attendance.",
    "Studying while helping family": "Choosing “Studying while helping family” usually means student money is connected to people at home, not only personal needs. Helping family can feel meaningful and heavy at the same time.",
    "Mostly self-supporting": "Choosing “Mostly self-supporting” usually means school and daily survival are being carried with limited support. Food, fare, school costs, and timing gaps can make every peso feel important.",
    "Exhausted by school-work overlap": "Choosing “Exhausted by school-work overlap” usually means energy is part of the money problem. When school, work, and rest compete, spending can shift toward shortcuts, comfort, or skipped tracking.",
    "Building with unstable income": "Choosing “Building with unstable income” usually means ambition is present, but the money rhythm is not fully steady yet. Planning can feel hard when future goals are clear but income still changes.",
    "Recovering from money pressure": "Choosing “Recovering from money pressure” usually means past money stress is still affecting the current season. Even new income can feel less free when old pressure, delayed needs, or recovery spending is still present.",
  },
  [YOUNG_PROFESSIONAL_STAGE_KEY]: {
    "First stable job": "Choosing “First stable job” usually means income is becoming steadier, but the full rhythm of adult responsibility is still forming. Bills, commute, food, and personal choices may feel new because this stage is still adjusting.",
    "Independent with bills": "Choosing “Independent with bills” usually means independence now has real monthly obligations attached to it. Rent, utilities, food, and commute can make every spending choice feel more serious.",
    "Career + family support": "Choosing “Career + family support” usually means salary is carrying both personal growth and family responsibility. Progress can feel slower when home support and career needs compete for the same income.",
    "Career growth pressure": "Choosing “Career growth pressure” usually means ambition is affecting money decisions. Courses, tools, image, or networking may feel important because career progress feels urgent.",
    "Salary disappears fast": "Choosing “Salary disappears fast” usually means income looks stable at first but does not stay long enough to feel secure. Repeated costs, lifestyle upgrades, or automatic payments may be quietly taking space.",
    "Shift/BPO routine": "Choosing “Shift/BPO routine” usually means schedule and energy are part of the money pattern. Sleep, commute, calls, and recovery time can strongly affect food, transport, and comfort spending.",
    "Debt/pay-later recovery": "Choosing “Debt/pay-later recovery” usually means old obligations are still entering the current salary. Payday may feel less free when past balances or repayments are already waiting.",
  },
};

function createMeaning(stage, step, label) {
  const bespoke = BESPOKE_MEANINGS[stage]?.[label];
  if (bespoke) return bespoke;
  const builder = STEP_MEANING_BUILDERS[step] || sentenceForSetup;
  return builder(stage, label);
}

function buildLifeStageSelectionMeanings() {
  const meanings = {};
  STAGE_NAMES.forEach((stage) => {
    meanings[stage] = new Map();
    collectSourceRows(stage).forEach(({ raw, step }) => {
      const label = getDisplayLabel(stage, clean(raw));
      const body = createMeaning(stage, step, label);
      meanings[stage].set(loud(raw), body);
      meanings[stage].set(loud(label), body);
    });
    Object.entries(BESPOKE_MEANINGS[stage] || {}).forEach(([label, body]) => {
      meanings[stage].set(loud(label), body);
    });
  });
  return meanings;
}

const LIFE_STAGE_SELECTION_MEANINGS = buildLifeStageSelectionMeanings();

function readProfile() {
  try {
    return JSON.parse(window.localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function isSelectedButton(button) {
  const className = String(button?.className || "");
  return className.includes("border-cyan") || className.includes("text-cyan-50") || className.includes("bg-cyan");
}

function getSelectedOption(section) {
  const buttons = Array.from(section?.querySelectorAll("button") || []);
  const selected = buttons.find(isSelectedButton) || buttons[0];
  return clean(selected?.innerText || selected?.textContent || "");
}

function getVisibleOptions(section) {
  return Array.from(section?.querySelectorAll("button") || [])
    .map((button) => clean(button.innerText || button.textContent))
    .filter(Boolean);
}

function inferStageFromActiveSection(active) {
  const options = getVisibleOptions(active?.section).map(loud);
  const candidates = Object.entries(STAGE_OPTION_SETS)
    .map(([stage, set]) => ({ stage, score: options.filter((option) => set.has(option)).length }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.stage.localeCompare(b.stage));
  return candidates[0]?.stage || "";
}

function currentStage(active = null) {
  const inferred = inferStageFromActiveSection(active);
  if (inferred) return inferred;
  return clean(readProfile().stage) || WORKING_STUDENT_STAGE_KEY;
}

function findActiveQuestionSection() {
  for (const label of Array.from(document.querySelectorAll("section p"))) {
    const meta = getStepMeta(label.textContent);
    const section = label.closest("section");
    if (meta && section && isVisible(section) && section.querySelector("button")) return { label, section, meta };
  }
  return null;
}

function findStageBoard() {
  const marker = Array.from(document.querySelectorAll("p")).find((node) => loud(node.textContent) === FLOW_MARKER);
  const header = marker?.closest("header");
  const title = header?.querySelector("h3");
  const summary = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { header, title, summary };
}

function isStagePickerOpen() {
  const labels = Array.from(document.querySelectorAll("main button") || []).map((button) => clean(button.innerText || button.textContent));
  return STAGE_NAMES.some((stage) => labels.includes(stage));
}

function getProgressGroup(header) {
  return Array.from(header?.querySelectorAll("div") || []).find((group) => {
    const bars = Array.from(group.children || []).filter((child) => child.dataset.claraMovingTile !== "true");
    return bars.length >= 3 && bars.every((bar) => String(bar.className || "").includes("rounded-full"));
  });
}

function ensureSixProgressBars(group) {
  let bars = Array.from(group?.children || []).filter((child) => child.dataset.claraMovingTile !== "true");
  if (!bars.length) return [];
  while (bars.length < 6) {
    group.appendChild(bars[bars.length - 1].cloneNode(false));
    bars = Array.from(group.children || []).filter((child) => child.dataset.claraMovingTile !== "true");
  }
  Array.from(group.querySelectorAll("[data-clara-moving-tile='true']") || []).forEach((node) => node.remove());
  return bars.slice(0, 6);
}

function updateSimpleProgress(header, activeIndex) {
  const group = getProgressGroup(header);
  if (!group) return;
  if (isStagePickerOpen()) {
    group.style.setProperty("display", "none", "important");
    return;
  }
  group.style.setProperty("display", "flex", "important");
  group.style.setProperty("gap", "0.45rem", "important");
  group.style.setProperty("align-items", "center", "important");
  group.style.setProperty("position", "relative", "important");
  ensureSixProgressBars(group).forEach((bar, index) => {
    const active = index === activeIndex;
    bar.style.setProperty("width", active ? "2rem" : "1.65rem", "important");
    bar.style.setProperty("height", "0.25rem", "important");
    bar.style.setProperty("border-radius", "9999px", "important");
    bar.style.setProperty("background", active ? "rgb(165 243 252)" : "rgba(255,255,255,.12)", "important");
    bar.style.setProperty("box-shadow", active ? "0 0 16px rgba(125,211,252,.35)" : "none", "important");
    bar.style.setProperty("opacity", active ? "1" : ".6", "important");
    bar.style.setProperty("transition", "background 160ms ease, opacity 160ms ease, width 160ms ease", "important");
  });
}

function polishQuestionCards() {
  Array.from(document.querySelectorAll("section p")).forEach((label) => {
    const meta = getStepMeta(label.textContent);
    const section = label.closest("section");
    if (!meta || !section || !section.querySelector("button")) return;
    label.textContent = meta.label;
    const next = label.nextElementSibling;
    if (next?.dataset?.claraFlowQuestion === "true") {
      if (next.textContent !== meta.question) next.textContent = meta.question;
      return;
    }
    const question = document.createElement("p");
    question.dataset.claraFlowQuestion = "true";
    question.className = "clara-flow-question";
    question.textContent = meta.question;
    label.insertAdjacentElement("afterend", question);
  });
}

function titleFor(stage, selectedValue) {
  return getDisplayLabel(stage, selectedValue) || selectedValue;
}

function getSelectionMeaning(stage, step, selectedValue, label) {
  return LIFE_STAGE_SELECTION_MEANINGS[stage]?.get(loud(selectedValue))
    || LIFE_STAGE_SELECTION_MEANINGS[stage]?.get(loud(label))
    || `This ${stage} answer still needs a dedicated meaning: “${label}”.`;
}

function getBoardFromCurrentSelection(active) {
  const selectedValue = getSelectedOption(active.section);
  const stage = currentStage(active);
  const label = titleFor(stage, selectedValue);
  return {
    stage,
    selectedValue,
    title: label || selectedValue,
    body: getSelectionMeaning(stage, active.meta.key, selectedValue, label || selectedValue),
  };
}

function polishContextBoard() {
  const active = findActiveQuestionSection();
  const { header, summary, title } = findStageBoard();
  if (!active || !header || !summary || !title) return;
  const board = getBoardFromCurrentSelection(active);
  const signature = `${board.stage}:${active.meta.key}:${board.selectedValue}:${board.title}:${board.body}`;
  updateSimpleProgress(header, active.meta.index);
  if (title.dataset.claraSimpleBoardSignature !== signature) {
    title.textContent = board.title;
    title.dataset.claraSimpleBoardSignature = signature;
  }
  if (summary.dataset.claraSimpleBoardSignature !== signature) {
    summary.textContent = board.body;
    summary.dataset.claraSimpleBoardSignature = signature;
    summary.classList.add("clara-flow-board-summary");
    summary.style.setProperty("white-space", "normal", "important");
    summary.style.setProperty("line-height", "1.5", "important");
  }
}

function polishFlow() {
  polishQuestionCards();
  polishContextBoard();
}

function installLifeStageSetupFlowPolish() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraLifeStageSetupFlowPolishInstalled) return;
  window.__claraLifeStageSetupFlowPolishInstalled = true;
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      polishFlow();
    });
  };
  schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
  document.addEventListener("click", schedule, true);
  window.addEventListener("storage", schedule);
}

try {
  installLifeStageSetupFlowPolish();
} catch (error) {
  console.warn("CLARA life stage setup flow polish failed:", error);
}
