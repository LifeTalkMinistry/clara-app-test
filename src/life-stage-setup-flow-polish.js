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
  return Object.values(fields || {}).flatMap((value) => Array.isArray(value) ? value : []);
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

const EXACT_SELECTION_MEANINGS = new Map(Object.entries({
  "Supported, learning independence": "This usually means support still exists, but independence is starting to become real. The pressure is learning how to handle personal money before bigger responsibilities arrive.",
  "Working to protect school": "This usually means work is closely tied to staying in school. Money decisions may feel heavier because income is connected to tuition, requirements, fare, and attendance.",
  "Studying while helping family": "This usually means student money is connected to people at home, not only personal needs. Helping family can feel meaningful and heavy at the same time.",
  "Mostly self-supporting": "This usually means school and daily survival are being carried with limited support. Food, fare, school costs, and timing gaps can make every peso feel important.",
  "Exhausted by school-work overlap": "This usually means energy is part of the money problem. When school, work, and rest compete, spending can shift toward shortcuts, comfort, or skipped tracking.",
  "Building with unstable income": "This usually means ambition is present, but the money rhythm is not fully steady yet. Planning can feel hard when future goals are clear but income still changes.",
  "Recovering from money pressure": "This usually means past money stress is still affecting the current season. Even new income can feel less free when old pressure, delayed needs, or recovery spending is still present.",
  "Allowance base + extra work": "This usually means allowance may cover the basics while work income gives extra breathing room. The challenge is making the extra money intentional instead of letting it disappear.",
  "Fixed part-time pay": "This usually means income is more predictable, but still limited. A fixed part-time rhythm can help planning, but small leaks can still quickly reduce what is left.",
  "Occasional side income": "This usually means money comes in sometimes, but not always when needed. Planning may feel flexible and uncertain at the same time.",
  "Extra money leaks fast": "This usually means extra income is arriving, but it is being absorbed by small spending. The pressure is not one big purchase, but repeated little choices that reduce the extra.",
  "Money arrives after bills are due": "This usually means income timing is working against the actual payment schedule. The week can feel late before the money even arrives.",
  "I borrow, then repay repeatedly": "This usually means borrowing has become part of the money rhythm. Even when repayment happens, the cycle can keep the next income from feeling free.",
  "Pressure carries into next week": "This usually means the current week is still affected by the last one. Money stress can feel continuous when expenses keep arriving before recovery happens.",
  "Debt/delays affect the week": "This usually means old obligations are shaping current choices. Even normal spending can feel heavy when debt or delayed payments are already taking space.",
  "The month feels like repair mode": "This usually means money is being used to fix old pressure instead of starting fresh. It can make the current week feel like recovery before progress even begins.",
  "Old pressure affects today": "This usually means earlier money stress is still influencing present choices. Even small decisions can feel heavier when the past is not fully cleared.",
  "Tired from catching up": "This usually means recovery itself is becoming exhausting. Constantly trying to catch up can make budgeting feel heavy before the next decision even starts.",
  "Little room to reset": "This usually means there is very little space between old pressure and new needs. A small surprise can feel bigger when there is no clear reset point yet.",
  "Repayment pressure": "This usually means repayment is taking priority in the current money picture. The pressure is not only paying back, but still having enough left for daily needs.",
  "Cash-flow timing mismatch": "This usually means money and due dates are not lining up well. Even if income exists, the wrong timing can make the week feel short or stressful.",
  "Borrowing before next income": "This usually means the gap before the next income is becoming risky. Borrowing can feel like the only bridge when essentials arrive before money does.",
  "Avoiding money because it feels heavy": "This usually means the numbers may feel emotionally tiring to face. Avoiding them can give short relief, but it also shows how heavy the pressure already feels.",
  "I delay payments to survive": "This usually means survival needs are taking priority over some obligations. Delaying payments may protect the present moment, but it can also carry stress forward.",
  "I avoid the full picture": "This usually means looking at everything at once feels too heavy. Avoidance often appears when the money situation feels emotionally loaded, not because the person does not care.",
  "I borrow again for daily costs": "This usually means daily essentials are creating a gap that income cannot fully cover right now. Borrowing becomes a short-term fix for food, fare, or immediate needs.",
  "I cut needs too much": "This usually means the response to pressure may be becoming too harsh. Cutting too much can protect money briefly but weaken energy, health, or daily stability.",
  "Stop pressure from stacking": "This usually means the main goal is to stop one problem from becoming another. The focus is preventing old pressure from carrying into the next week or cutoff.",
  "Build a no-new-debt rule": "This usually means the priority is stopping the cycle before adding another obligation. It reflects a need for stability before taking on any new pressure.",
  "Create a repayment rhythm": "This usually means repayment needs a predictable place in the budget. A rhythm can make old pressure feel less random and less emotionally heavy.",
  "Protect a tiny food/fare buffer": "This usually means daily movement and meals need a small protected space. Even a tiny buffer can reduce the pressure to borrow when the week gets tight.",
  "First stable job": "This usually means income is becoming more stable, but adult responsibility still feels new. Payday may feel exciting while bills, commute, food, and personal choices are still finding their rhythm.",
  "Independent with bills": "This usually means independence now has real monthly pressure attached to it. Rent, bills, food, and commute can make every spending choice feel more serious.",
  "Career + family support": "This usually means your salary is not only for your own progress. Family support may affect how much room you have for savings, career growth, and personal stability.",
  "Career growth pressure": "This usually means ambition is adding pressure to your money decisions. Career costs may feel necessary, but they can also come from comparison, urgency, or the fear of falling behind.",
  "Salary disappears fast": "This usually means the salary is there, but it does not stay long enough to feel secure. Small repeated costs, subscriptions, installments, or early-month spending may be quietly taking space.",
  "Shift/BPO routine": "This usually means your work schedule affects your spending pattern. When sleep, calls, commute, or shifting routines drain you, convenience and comfort can become harder to resist.",
  "Debt/pay-later recovery": "This usually means income is being used to fix old pressure instead of building a fresh month. It can make payday feel less freeing because past obligations are still taking space.",
}).map(([key, value]) => [loud(key), value]));

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

function includesAny(value, terms) {
  const text = lower(value);
  return terms.some((term) => text.includes(term));
}

function titleFor(stage, selectedValue) {
  if (stage === YOUNG_PROFESSIONAL_STAGE_KEY) return getYoungProfessionalDisplayLabel(selectedValue) || selectedValue;
  if (stage === LIVING_WITH_PARTNER_STAGE_KEY) return getLivingWithPartnerDisplayLabel(selectedValue) || selectedValue;
  if (stage === WORKING_STUDENT_STAGE_KEY) return getWorkingStudentDisplayLabel(selectedValue) || selectedValue;
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

function keywordMeaning(stage, selectedValue, label) {
  const text = `${selectedValue} ${label}`;
  if (stage === LIVING_WITH_PARTNER_STAGE_KEY) {
    if (includesAny(text, ["uneven", "one income", "one person", "covers gaps", "mismatch", "fairness", "one partner carries"])) return "This usually means fairness is already part of the shared money story. One person may be carrying more, even when both people care about making the setup work.";
    if (includesAny(text, ["family", "living with one family", "household", "support requests"])) return "This usually means family expectations may affect the couple’s budget too. Shared money can feel heavier when outside needs enter the relationship rhythm.";
    if (includesAny(text, ["avoid", "argue", "communication", "sensitive", "talk", "awkward"])) return "This usually means the money conversation itself needs care. The pressure may not only be the amount, but how safe it feels to talk about the amount.";
    if (includesAny(text, ["comfort", "spend together", "date", "food", "bonding"])) return "This usually means spending may be acting as bonding or emotional relief. That can feel good, but it may also make shared stability harder to protect.";
    if (includesAny(text, ["future", "planning", "move", "savings", "emergency", "shared goal"])) return "This usually means the relationship is trying to protect a future direction. Daily spending may feel different when a shared plan is starting to matter.";
  }
  if (includesAny(text, ["debt", "repay", "repayment", "borrow", "pay-later", "pay later", "repair mode", "cash-flow", "delayed", "pressure carries"])) return "This usually means old or delayed money pressure is affecting the present. Even new income can feel less free when past obligations are still taking space.";
  if (includesAny(text, ["family", "home", "support", "contribution", "goes home"])) return "This usually means money is connected to people who depend on the user. Support can be meaningful, but it can also reduce the space for personal stability.";
  if (includesAny(text, ["tired", "exhaust", "burnout", "rest", "sleep", "commute", "shift", "heavy", "draining"])) return "This usually means energy is part of the money situation. When the body or mind is tired, spending can become a shortcut, comfort, or survival response.";
  if (includesAny(text, ["tuition", "school", "class", "projects", "printing", "materials", "fare", "attendance"])) return "This usually means school-related costs are shaping the budget. Requirements, transportation, food, and deadlines can make even small spending feel important.";
  if (includesAny(text, ["salary", "payday", "cutoff", "income", "allowance", "side income", "overtime", "sales", "commission"])) return "This usually means the money rhythm itself matters. Income may exist, but the amount and timing can decide whether the week feels stable or tight.";
  if (includesAny(text, ["reward", "social", "lifestyle", "comfort", "convenience", "spending", "leaks"])) return "This usually means spending may be connected to relief, identity, or convenience. The concern is usually the repeated pattern, not one single purchase.";
  return "";
}

function getSelectionMeaning(stage, step, selectedValue, label) {
  const exact = EXACT_SELECTION_MEANINGS.get(loud(selectedValue)) || EXACT_SELECTION_MEANINGS.get(loud(label));
  if (exact) return exact;
  return keywordMeaning(stage, selectedValue, label) || fallbackMeaning(stage, step, label);
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