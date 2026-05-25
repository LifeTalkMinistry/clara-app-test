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
  return clean(stage).replace(/-/g, " ").toLowerCase();
}

function stageOpening(stage) {
  const normalized = humanStageName(stage);
  if (stage === WORKING_STUDENT_STAGE_KEY) return "As a working student";
  if (stage === YOUNG_PROFESSIONAL_STAGE_KEY) return "As a young professional";
  if (stage === LIVING_WITH_PARTNER_STAGE_KEY) return "When you're building life with someone";
  if (normalized.includes("family")) return "Inside a family household";
  if (normalized.includes("single parent")) return "As a single parent";
  if (normalized.includes("full-time")) return "With full-time income";
  if (normalized.includes("freelance")) return "In a freelance season";
  if (normalized.includes("business")) return "When building a business";
  return "In this season";
}

function sentenceForSetup(stage, label) {
  return `Hmm, I see. “${label}” sounds like the setup that is shaping your money right now. ${stageOpening(stage)}, that can affect how much pressure, support, or responsibility you carry before budgeting even starts.`;
}

function sentenceForRhythm(stage, label) {
  return `Hmm, I see. “${label}” shows how money tends to move around your week or month. When the rhythm feels like this, the budget can feel calm in one moment and tight in another.`;
}

function sentenceForWorkload(stage, label) {
  return `Hmm, I see. “${label}” says a lot about the weight behind your routine. When time or energy is stretched, even small money decisions can feel heavier than they look.`;
}

function sentenceForPressure(stage, label) {
  return `Hmm, I see. “${label}” is taking space right now. It may not look huge from the outside, but once it keeps showing up, the whole budget can start to feel tighter.`;
}

function sentenceForCoping(stage, label) {
  return `Hmm, I see. “${label}” looks like the kind of response that can appear when pressure gets heavy. It may be less about one decision and more about what stress does to your energy in the moment.`;
}

function sentenceForGoal(stage, label) {
  return `Hmm, I see. “${label}” feels like the stability you are trying to protect. That says something important about what would make this season feel safer and less scattered.`;
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
    "Supported, learning independence": "Hmm, I see. Support is still there, but you are already learning what it feels like to handle money on your own. This is that in-between season where independence is growing before bigger responsibilities fully arrive.",
    "Working to protect school": "Hmm, I see. Work is not just extra effort here; it is connected to keeping school moving. Tuition, requirements, fare, and attendance can make money decisions feel heavier than they look.",
    "Studying while helping family": "Hmm, I see. Your money is not only about your own needs. Helping family while studying can feel meaningful, but it can also make every personal budget decision carry more emotion.",
    "Mostly self-supporting": "Hmm, I see. You are carrying school and daily survival with limited support. Food, fare, school costs, and timing gaps can make even small amounts feel important.",
    "Exhausted by school-work overlap": "Hmm, I see. This is not only a money issue; energy is part of it too. When school, work, and rest collide, spending can turn into shortcuts, comfort, or skipped tracking just to get through the day.",
    "Building with unstable income": "Hmm, I see. The ambition is there, but the money rhythm still shifts. That can make planning feel hard because the future is clear, while the income is not always steady yet.",
    "Recovering from money pressure": "Hmm, I see. Past money stress is still touching the current season. Even new income can feel less free when old pressure, delayed needs, or recovery spending is still present.",
  },
  [YOUNG_PROFESSIONAL_STAGE_KEY]: {
    "First stable job": "Hmm, I see. The income is becoming steadier, but the rhythm of adult responsibility is still forming. Bills, commute, food, and personal choices can feel new because this season is still adjusting.",
    "Independent with bills": "Hmm, I see. Independence now comes with real monthly obligations. Rent, utilities, food, and commute can make each spending choice feel more serious than before.",
    "Career + family support": "Hmm, I see. Your salary is carrying both personal growth and family responsibility. Progress can feel slower when home support and career needs compete for the same income.",
    "Career growth pressure": "Hmm, I see. Ambition is starting to affect money decisions. Courses, tools, image, or networking may feel important because career progress feels urgent.",
    "Salary disappears fast": "Hmm, I see. The salary looks stable when it arrives, but it does not stay long enough to feel secure. Repeated costs, lifestyle upgrades, or automatic payments may be quietly taking space.",
    "Shift/BPO routine": "Hmm, I see. Your schedule and energy are part of the money pattern. Sleep, commute, calls, and recovery time can strongly affect food, transport, and comfort spending.",
    "Debt/pay-later recovery": "Hmm, I see. Old obligations are still entering the current salary. Payday can feel less free when past balances or repayments are already waiting.",
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
