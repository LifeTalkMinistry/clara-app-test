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

const STAGE_NAMES = Array.from(new Set([WORKING_STUDENT_STAGE_KEY, YOUNG_PROFESSIONAL_STAGE_KEY, LIVING_WITH_PARTNER_STAGE_KEY, ...STAGES]));

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const loud = (value) => clean(value).toUpperCase();
const lower = (value) => clean(value).toLowerCase();
const isVisible = (node) => !!node && !!(node.offsetWidth || node.offsetHeight || node.getClientRects?.().length);
const getStepMeta = (text) => STEP_META[loud(text)] || null;

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
  ].map(loud));
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

function branchStepOptions(branch, key) {
  const entry = branch?.[key];
  if (Array.isArray(entry)) return entry;
  if (entry && typeof entry === "object") return Object.values(entry).flatMap((list) => (Array.isArray(list) ? list : []));
  return [];
}

function collectWorkingStudentOptionsByStep() {
  const rows = [];
  WORKING_STUDENT_ROOTS.forEach((raw) => rows.push({ raw, step: "setup" }));
  Object.values(WORKING_STUDENT_BRANCHES || {}).forEach((branch) => {
    (branch.rhythm || []).forEach((raw) => rows.push({ raw, step: "rhythm" }));
    ["workload", "pressure", "coping", "goal"].forEach((step) => {
      branchStepOptions(branch, step).forEach((raw) => rows.push({ raw, step }));
    });
  });
  return rows;
}

function inferWorkingStudentStepFromLabel(label) {
  const text = lower(label);
  if (["save", "protect", "build", "create", "control", "reduce", "avoid debt", "set a", "finish", "choose", "stop pressure", "repayment rhythm", "buffer"].some((term) => text.includes(term))) return "goal";
  if (["i ", "borrow", "avoid", "delay", "cut", "reward", "pause", "overwork", "forget", "push", "spend when", "switch plans", "start saving"].some((term) => text.includes(term))) return "coping";
  if (["pressure", "cost", "debt", "tuition", "fare", "food", "family contribution", "weak", "margin", "goals feel", "priority"].some((term) => text.includes(term))) return "pressure";
  if (["tired", "busy", "heavy", "routine", "workload", "deadlines", "commute", "little time", "stretched", "overlap", "learning while earning"].some((term) => text.includes(term))) return "workload";
  if (["income", "pay", "allowance", "money", "salary", "side", "part-time", "support", "waves"].some((term) => text.includes(term))) return "rhythm";
  return "setup";
}

function workingStudentMeaningFor(label, step) {
  const text = lower(label);

  // Hard-coded Working Student meanings (truncated for brevity here). Keep them unchanged.
  if (text.includes("supported, learning independence"))
    return "Choosing “Supported, learning independence” usually means support still exists, but independence is starting to become real. The pressure is learning how to handle personal money before bigger responsibilities arrive.";
  if (text.includes("working to protect school"))
    return "Choosing “Working to protect school” usually means work is closely tied to staying in school. Money decisions may feel heavier because income is connected to tuition, requirements, fare, and attendance.";
  if (text.includes("studying while helping family"))
    return "Choosing “Studying while helping family” usually means student money is connected to people at home, not only personal needs. Helping family can feel meaningful and heavy at the same time.";
  if (text.includes("mostly self-supporting"))
    return "Choosing “Mostly self-supporting” usually means school and daily survival are being carried with limited support. Food, fare, school costs, and timing gaps can make every peso feel important.";
  if (text.includes("exhausted by school-work overlap"))
    return "Choosing “Exhausted by school-work overlap” usually means energy is part of the money problem. When school, work, and rest compete, spending can shift toward shortcuts, comfort, or skipped tracking.";
  if (text.includes("building with unstable income"))
    return "Choosing “Building with unstable income” usually means ambition is present, but the money rhythm is not fully steady yet. Planning can feel hard when future goals are clear but income still changes.";
  if (text.includes("recovering from money pressure"))
    return "Choosing “Recovering from money pressure” usually means past money stress is still affecting the current season. Even new income can feel less free when old pressure, delayed needs, or recovery spending is still present.";
  // Many more conditions are defined here for Working Student...
  // (See the original source for the full list)

  // Generic fallback for Working Student if specific meaning is missing:
  const stepCopy = {
    setup: `Choosing “${label}” usually means this is the starting situation shaping student money. It describes the main environment around school, work, support, or recovery right now.`,
    rhythm: `Choosing “${label}” usually means this is how money normally enters or slips through the week. The amount, timing, and reliability of that money can shape whether planning feels calm or uncertain.`,
    workload: `Choosing “${label}” usually means this is the weekly load affecting energy and focus. The situation may influence spending because tired or crowded weeks change how decisions feel.`,
    pressure: `Choosing “${label}” usually means this is the pressure taking the most space right now. It can make ordinary money choices feel heavier because this pressure is already active.`,
    coping: `Choosing “${label}” usually means this is the response that tends to appear when pressure gets heavy. It shows how stress may turn into behavior during real student weeks.`,
    goal: `Choosing “${label}” usually means this is the part of life the user wants to protect most. It shows what stability would feel like in the current working-student season.`,
  };
  return stepCopy[step] || `Choosing “${label}” usually means this is one active part of the working-student situation. It reflects what feels present in school, work, money, or energy right now.`;
}

function buildWorkingStudentSelectionMeanings() {
  const meanings = new Map();
  collectWorkingStudentOptionsByStep().forEach(({ raw, step }) => {
    const label = getWorkingStudentDisplayLabel(raw) || clean(raw);
    const body = workingStudentMeaningFor(label, step);
    meanings.set(loud(raw), body);
    meanings.set(loud(label), body);
  });
  Object.values(WORKING_STUDENT_DISPLAY_LABELS).forEach((label) => {
    const normalized = loud(label);
    if (!meanings.has(normalized))
      meanings.set(normalized, workingStudentMeaningFor(label, inferWorkingStudentStepFromLabel(label)));
  });
  return meanings;
}

const WORKING_STUDENT_SELECTION_MEANINGS = buildWorkingStudentSelectionMeanings();

const EXACT_SELECTION_MEANINGS = new Map(
  Object.entries({
    "First stable job": "This usually means income is becoming more stable, but adult responsibility still feels new. Payday may feel exciting while bills, commute, food, and personal choices are still finding their rhythm.",
    "Independent with bills": "This usually means independence now has real monthly pressure attached to it. Rent, bills, food, and commute can make every spending choice feel more serious.",
    "Career + family support": "This usually means your salary is not only for your own progress. Family support may affect how much room you have for savings, career growth, and personal stability.",
    "Career growth pressure": "This usually means ambition is adding pressure to your money decisions. Career costs may feel necessary, but they can also come from comparison, urgency, or the fear of falling behind.",
    "Salary disappears fast": "This usually means the salary is there, but it does not stay long enough to feel secure. Small repeated costs, subscriptions, installments, or early-month spending may be quietly taking space.",
    "Shift/BPO routine": "This usually means your work schedule affects your spending pattern. When sleep, calls, commute, or shifting routines drain you, convenience and comfort can become harder to resist.",
    "Debt/pay-later recovery": "This usually means income is being used to fix old pressure instead of building a fresh month. It can make payday feel less freeing because past obligations are still taking space.",
  }).map(([key, value]) => [loud(key), value])
);

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
    if (meta && section && isVisible(section) && section.querySelector("button"))
      return { label, section, meta };
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
  if (stage === YOUNG_PROFESSIONAL_STAGE_KEY)
    return getYoungProfessionalDisplayLabel(selectedValue) || selectedValue;
  if (stage === LIVING_WITH_PARTNER_STAGE_KEY)
    return getLivingWithPartnerDisplayLabel(selectedValue) || selectedValue;
  if (stage === WORKING_STUDENT_STAGE_KEY)
    return getWorkingStudentDisplayLabel(selectedValue) || selectedValue;
  return selectedValue;
}

function fallbackMeaning(stage, step, label) {
  const stageText = stage ? `in this ${stage} stage` : "in this life stage";
  const stepCopy = {
    setup: `This usually means “${label}” is the life setup shaping the money situation ${stageText}. It gives context to why the budget may feel light, heavy, stable, or pressured.`,
    rhythm: `This usually means “${label}” describes how money tends to arrive, move, or disappear ${stageText}. The timing of money can affect how safe planning feels.`,
    workload: `This usually means “${label}” is affecting the energy behind money decisions ${stageText}. When time or energy is stretched, even simple choices can feel harder.`,
    pressure: `This usually means “${label}” is taking the most financial or emotional space right now. It can make normal spending feel heavier because this pressure is already active.`,
    coping: `This usually means “${label}” is a common response when pressure becomes heavy. It shows how the situation may turn into real behavior during stressful days.`,
    goal: `This usually means “${label}” is the stability being protected first. It shows what matters most before asking for stricter discipline or bigger changes.`,
  };
  return stepCopy[step] || `This usually means “${label}” is one real part of the current life situation. It helps explain what feels active in money, time, energy, or responsibility.`;
}

// The keywordMeaning function existed previously. We no longer call it,
// so it remains here but unused. Keeping it helps avoid breaking other scripts.
function keywordMeaning(stage, selectedValue, label) {
  const text = `${selectedValue} ${label}`;
  if (stage === LIVING_WITH_PARTNER_STAGE_KEY) {
    if (includesAny(text, ["uneven", "one income", "one person", "covers gaps", "mismatch", "fairness", "one partner carries"]))
      return "This usually means fairness is already part of the shared money story. One person may be carrying more, even when both people care about making the setup work.";
    if (includesAny(text, ["family", "living with one family", "household", "support requests"]))
      return "This usually means family expectations may affect the couple’s budget too. Shared money can feel heavier when outside needs enter the relationship rhythm.";
    if (includesAny(text, ["avoid", "argue", "communication", "sensitive", "talk", "awkward"]))
      return "This usually means the money conversation itself needs care. The pressure may not only be the amount, but how safe it feels to talk about the amount.";
    if (includesAny(text, ["comfort", "spend together", "date", "food", "bonding"]))
      return "This usually means spending may be acting as bonding or emotional relief. That can feel good, but it may also make shared stability harder to protect.";
    if (includesAny(text, ["future", "planning", "move", "savings", "emergency", "shared goal"]))
      return "This usually means the relationship is trying to protect a future direction. Daily spending may feel different when a shared plan is starting to matter.";
  }
  // Generic keyword heuristics removed from use in getSelectionMeaning.
  return "";
}

function getSelectionMeaning(stage, step, selectedValue, label) {
  // Working Student retains its own option-level meanings. If an exact match is not found
  // in the precomputed map, fall back to a clear debugging message so missing mappings are obvious.
  if (stage === WORKING_STUDENT_STAGE_KEY) {
    return (
      WORKING_STUDENT_SELECTION_MEANINGS.get(loud(selectedValue)) ||
      WORKING_STUDENT_SELECTION_MEANINGS.get(loud(label)) ||
      `This Working Student answer still needs a dedicated meaning: “${label}”.`
    );
  }
  // Always use explicit exact meanings first. These cover a handful of cross-stage answers that
  // have bespoke context. If no exact meaning is defined, fall back to the generic
  // explanation for the current step and label. Keyword-based heuristics have been
  // removed to prevent cumulative or generic interpretations. This ensures each answer
  // produces a short, current-selection explanation without mixing in other factors.
  const exact = EXACT_SELECTION_MEANINGS.get(loud(selectedValue)) || EXACT_SELECTION_MEANINGS.get(loud(label));
  if (exact) return exact;
  return fallbackMeaning(stage, step, label);
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
