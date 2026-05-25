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

const STAGE_NAMES = [
  WORKING_STUDENT_STAGE_KEY,
  YOUNG_PROFESSIONAL_STAGE_KEY,
  LIVING_WITH_PARTNER_STAGE_KEY,
  "Family Household",
  "Single Parent",
  "Full-Time Earner",
  "Freelance Season",
  "Business Builder",
];

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

function makeOptionSet(roots = [], branches = {}, displayLabels = {}) {
  return new Set(
    [
      ...roots,
      ...collectBranchOptions(branches),
      ...Object.keys(displayLabels),
      ...Object.values(displayLabels),
    ].map(loud)
  );
}

const STAGE_OPTION_SETS = {
  [WORKING_STUDENT_STAGE_KEY]: makeOptionSet(WORKING_STUDENT_ROOTS, WORKING_STUDENT_BRANCHES, WORKING_STUDENT_DISPLAY_LABELS),
  [YOUNG_PROFESSIONAL_STAGE_KEY]: makeOptionSet(YOUNG_PROFESSIONAL_ROOTS, YOUNG_PROFESSIONAL_BRANCHES, YOUNG_PROFESSIONAL_DISPLAY_LABELS),
  [LIVING_WITH_PARTNER_STAGE_KEY]: makeOptionSet(LIVING_WITH_PARTNER_ROOTS, LIVING_WITH_PARTNER_BRANCHES),
};

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
    .sort((a, b) => b.score - a.score);
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

function includesAny(value, terms) {
  const text = lower(value);
  return terms.some((term) => text.includes(term));
}

function titleFor(stage, selectedValue) {
  if (stage === YOUNG_PROFESSIONAL_STAGE_KEY) return getYoungProfessionalDisplayLabel(selectedValue) || selectedValue;
  if (stage === LIVING_WITH_PARTNER_STAGE_KEY) return getLivingWithPartnerDisplayLabel(selectedValue) || selectedValue;
  return getWorkingStudentDisplayLabel(selectedValue) || selectedValue;
}

function youngProfessionalMeaning(selectedValue, label) {
  if (includesAny(selectedValue, ["first stable job", "first salary", "adjusting", "adult responsibilities", "work-life balance", "cutoff week"])) {
    return `This usually means income is becoming more stable, but adult responsibility still feels new. Payday may feel exciting while bills, commute, food, and personal choices are still finding their rhythm.`;
  }
  if (includesAny(selectedValue, ["independent", "bills", "rent", "utilities", "living costs", "food and commute", "fixed bills", "one-month buffer"])) {
    return `This usually means independence now has real monthly pressure attached to it. Rent, bills, food, and commute can make every spending choice feel more serious.`;
  }
  if (includesAny(selectedValue, ["career + family", "family", "goes home", "support", "contribution", "guilt", "support limit", "home needs"])) {
    return `This usually means your salary is not only for your own progress. Family support may affect how much room you have for savings, career growth, and personal stability.`;
  }
  if (includesAny(selectedValue, ["career", "promotion", "courses", "tools", "professional image", "networking", "growth", "invest", "compare", "behind others"])) {
    return `This usually means ambition is adding pressure to your money decisions. Career costs may feel necessary, but they can also come from comparison, urgency, or the fear of falling behind.`;
  }
  if (includesAny(selectedValue, ["salary feels stable", "salary disappears", "disappears", "payday feels strong", "lifestyle", "installments", "subscriptions", "salary leaks", "overspend early", "cutoff survival"])) {
    return `This usually means the salary is there, but it does not stay long enough to feel secure. Small repeated costs, subscriptions, installments, or early-month spending may be quietly taking space.`;
  }
  if (includesAny(selectedValue, ["shift", "bpo", "night shift", "sleep", "long calls", "ot", "comfort after shifts", "convenience", "recovery spending"])) {
    return `This usually means your work schedule affects your spending pattern. When sleep, calls, commute, or shifting routines drain you, convenience and comfort can become harder to resist.`;
  }
  if (includesAny(selectedValue, ["debt", "pay-later", "pay later", "minimum", "repayment", "old shortfalls", "borrow", "no-new-debt", "repair mode", "old choices", "little room to reset", "catching up", "cash-flow timing"] )) {
    return `This usually means your income is being used to fix old pressure instead of building a fresh month. It can make payday feel less freeing because past obligations are still taking space.`;
  }
  if (includesAny(selectedValue, ["reward", "social", "comparison", "image", "prepared", "spending", "payday", "lifestyle pressure"])) {
    return `This usually means spending may be tied to identity, belonging, or recovery after work. Enjoyment is part of life, but the pressure can grow when it happens without a clear limit.`;
  }
  return `This usually describes a real young professional pressure point. It shows how salary, responsibility, lifestyle, growth, and recovery can affect everyday money choices.`;
}

function workingStudentMeaning(selectedValue, label) {
  if (includesAny(selectedValue, ["tuition", "school payment", "school cost", "school requirement", "school needs", "school deadlines", "continue school", "protect school", "fear of stopping", "printing", "materials", "projects"])) {
    return `This usually means school is already taking space in the budget before anything else. Tuition timing, requirements, fare, food, and materials can make spending feel sensitive.`;
  }
  if (includesAny(selectedValue, ["family", "home", "goes home", "shared", "give", "support boundary", "guilt"])) {
    return `This usually means student money is connected to people at home, not only personal needs. Helping family can feel meaningful and heavy at the same time.`;
  }
  if (includesAny(selectedValue, ["borrow", "debt", "repay", "repayment", "cash-flow", "delayed", "repair mode", "old pressure", "pressure carries", "no-new-debt"])) {
    return `This usually means money pressure is carrying over instead of starting fresh. Borrowing, repayment, or delayed expenses can make the next income feel already spoken for.`;
  }
  if (includesAny(selectedValue, ["tired", "exhaust", "low recovery", "little time to rest", "commute", "heavy schedule", "shifts", "deadlines", "overwork", "burning out", "comfort after hard days"])) {
    return `This usually means energy is part of the money problem. When school, work, and rest compete, spending can shift toward shortcuts, comfort, or skipped tracking.`;
  }
  if (includesAny(selectedValue, ["reward", "social", "small spending", "small rewards", "leaks", "micro", "extra money leaks"])) {
    return `This usually means small spending may be acting as relief or reward after effort. The pressure is not one purchase, but how often that pattern repeats.`;
  }
  if (includesAny(selectedValue, ["irregular", "unstable", "fluctuate", "income changes", "some weeks", "gaps", "seasonal", "side hustle"] )) {
    return `This usually means planning has to adjust around uneven money timing. It can make budgeting feel tiring because the week changes before the plan feels settled.`;
  }
  if (includesAny(selectedValue, ["food", "fare", "transport", "daily", "survival", "emergency", "stretch money", "no room", "essentials"])) {
    return `This usually means daily basics are taking up serious space. Food, fare, school attendance, and small emergency costs can make even minor spending feel important.`;
  }
  if (includesAny(selectedValue, ["save", "savings", "discipline", "plan", "priority", "purpose", "control", "pause", "prepared", "limits", "boundary", "protect"])) {
    return `This usually means you are trying to build control instead of only reacting to pressure. One small clear rule can make student money feel less scattered.`;
  }
  return `This usually describes one real part of working-student life. It shows how school, work, energy, and money pressure can affect daily decisions.`;
}

function livingWithPartnerMeaning(selectedValue, label) {
  if (includesAny(selectedValue, ["uneven", "one income", "one person", "covers gaps", "mismatch", "fairness", "one partner carries"])) {
    return `This usually means fairness is already part of the shared money story. One person may be carrying more, even when both people care about making the setup work.`;
  }
  if (includesAny(selectedValue, ["family", "living with one family", "household", "support requests"])) {
    return `This usually means family expectations may affect the couple’s budget too. Shared money can feel heavier when outside needs enter the relationship rhythm.`;
  }
  if (includesAny(selectedValue, ["avoid", "argue", "communication", "sensitive", "talk", "awkward"])) {
    return `This usually means the money conversation itself needs care. The pressure may not only be the amount, but how safe it feels to talk about the amount.`;
  }
  if (includesAny(selectedValue, ["comfort", "spend together", "date", "food", "bonding"])) {
    return `This usually means spending may be acting as bonding or emotional relief. That can feel good, but it may also make shared stability harder to protect.`;
  }
  if (includesAny(selectedValue, ["future", "planning", "move", "savings", "emergency", "shared goal"])) {
    return `This usually means the relationship is trying to protect a future direction. Daily spending may feel different when a shared plan is starting to matter.`;
  }
  return `This usually describes one real part of shared-life money. Bills, emotion, fairness, routine, and future direction can all affect the way decisions feel.`;
}

function getSelectionMeaning(stage, selectedValue, label) {
  if (stage === YOUNG_PROFESSIONAL_STAGE_KEY) return youngProfessionalMeaning(selectedValue, label);
  if (stage === LIVING_WITH_PARTNER_STAGE_KEY) return livingWithPartnerMeaning(selectedValue, label);
  return workingStudentMeaning(selectedValue, label);
}

function getBoardFromCurrentSelection(active) {
  const selectedValue = getSelectedOption(active.section);
  const stage = currentStage(active);
  const label = titleFor(stage, selectedValue);
  return {
    stage,
    selectedValue,
    title: label || selectedValue,
    body: getSelectionMeaning(stage, selectedValue, label),
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