const FLOW_MARKER = "CLARA CONTEXT BOARD";
const CONTEXT_LOADING_TITLE = "Hmm… let me understand your situation.";

const STEP_ORDER = [
  "CURRENT SETUP",
  "MONEY RHYTHM",
  "WEEKLY LOAD",
  "PRESSURE RIGHT NOW",
  "WHEN PRESSURE HITS",
  "WHAT TO PROTECT",
];

const STEP_META = {
  "CURRENT SETUP": {
    key: "setup",
    label: "CURRENT SETUP",
    question: "Which setup feels closest to your real life right now?",
  },
  "MONEY RHYTHM": {
    key: "rhythm",
    label: "MONEY RHYTHM",
    question: "How does money usually come into your week or month?",
  },
  "WEEKLY LOAD": {
    key: "workload",
    label: "WEEKLY LOAD",
    question: "How stretched does your normal week feel?",
  },
  "PRESSURE RIGHT NOW": {
    key: "pressure",
    label: "PRESSURE RIGHT NOW",
    question: "What is putting the most pressure on your money right now?",
  },
  "PRESSURE RESPONSE": {
    key: "coping",
    label: "WHEN PRESSURE HITS",
    question: "What do you usually do when money pressure gets heavy?",
  },
  "WHEN PRESSURE HITS": {
    key: "coping",
    label: "WHEN PRESSURE HITS",
    question: "What do you usually do when money pressure gets heavy?",
  },
  "PROTECTION GOAL": {
    key: "goal",
    label: "WHAT TO PROTECT",
    question: "What are you trying to protect most right now?",
  },
  "WHAT TO PROTECT": {
    key: "goal",
    label: "WHAT TO PROTECT",
    question: "What are you trying to protect most right now?",
  },
};

const VALUE_INSIGHTS = {
  setup: {
    "Family-supported with some work": "you have some support, but you are also starting to carry money responsibility",
    "Self-supporting student": "you carry more responsibility while studying",
    "Working mainly for school costs": "your work income is strongly tied to keeping school moving",
    "Helping family while studying": "family responsibility is part of your student life",
    "Side hustle / extra-income student": "your income opportunity is flexible but not always predictable",
  },
  rhythm: {
    "Allowance + work income": "your money is mixed between support and effort",
    "Fixed part-time pay": "your income has a predictable base, but it may still be limited",
    "Irregular side hustle income": "your money timing can change from week to week",
    "Project / seasonal income": "your income arrives in waves instead of a steady line",
    "Mostly allowance with occasional work": "allowance is the base while occasional work adds small flexibility",
  },
  workload: {
    "Manageable class-work load": "your week still has room for control",
    "Tight but still controlled": "your week is stretched, but there is still some room to steer decisions",
    "Heavy school-work overlap": "school, work, and recovery are starting to collide",
    "Little time to rest": "low recovery time can make quick spending choices more likely",
    "Almost no margin / survival mode": "your choices may be shaped by very limited time, energy, and room for mistakes",
  },
  pressure: {
    "Tuition or school costs": "education costs are the first financial area to protect",
    "Daily food and transport": "small daily costs can drain the month through frequency",
    "Work-school schedule conflict": "money pressure is connected to time conflict and limited recovery",
    "Family contribution": "helping others affects how much stability you can keep for yourself",
    "Debt or borrowed money": "borrowed money can turn short-term relief into later pressure",
  },
  coping: {
    "I spend on small rewards to feel okay": "small rewards may be acting as relief after pressure",
    "I avoid checking my money": "tracking money may feel heavy right now",
    "I borrow or delay payments": "you may be solving urgent needs first and catching up later",
    "I cut my needs too much": "over-cutting may make your plan harder to sustain",
    "I ask for help before it gets worse": "support can protect you earlier when expectations are clear",
  },
  goal: {
    "Finish school without burning out": "finishing school safely without draining your energy becomes the main priority",
    "Avoid debt": "avoiding new borrowed-money pressure becomes the main priority",
    "Build savings slowly": "small realistic savings become the main priority",
    "Help family without losing stability": "supporting family while keeping stability becomes the main priority",
    "Control stress spending": "finding safer pressure relief becomes the main priority",
  },
};

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const loud = (value) => clean(value).toUpperCase();

const state = {
  stage: "",
  setup: "",
  rhythm: "",
  workload: "",
  pressure: "",
  coping: "",
  goal: "",
};

function isVisible(node) {
  return !!node && !!(node.offsetWidth || node.offsetHeight || node.getClientRects?.().length);
}

function isContextBoardLoadingTitle(value) {
  const title = clean(value);
  return title === CONTEXT_LOADING_TITLE || (title.startsWith("Hmm") && title.includes("understand your situation"));
}

function getStepMeta(text) {
  return STEP_META[loud(text)] || null;
}

function getInsight(key, value) {
  return VALUE_INSIGHTS[key]?.[value] || value || "this answer adds context";
}

function sentence(value) {
  const text = clean(value);
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getSelectedOption(section) {
  const buttons = Array.from(section?.querySelectorAll("button") || []);
  const selected = buttons.find((button) => {
    const className = String(button.className || "");
    return className.includes("border-cyan") || className.includes("text-cyan-50");
  });
  return clean(selected?.innerText || selected?.textContent || "");
}

function findActiveQuestionSection() {
  const labels = Array.from(document.querySelectorAll("section p"));
  for (const label of labels) {
    const meta = getStepMeta(label.textContent);
    const section = label.closest("section");
    if (meta && section && isVisible(section) && section.querySelector("button")) {
      return { label, section, meta };
    }
  }
  return null;
}

function findStageBoard() {
  const marker = Array.from(document.querySelectorAll("p")).find((node) => loud(node.textContent) === FLOW_MARKER);
  const header = marker?.closest("header");
  const title = header?.querySelector("h3");
  const summary = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { marker, header, title, summary };
}

function rememberStageSelection() {
  const { title } = findStageBoard();
  const titleText = clean(title?.textContent || "");
  if (isContextBoardLoadingTitle(titleText)) return;
  if (titleText && !STEP_ORDER.includes(loud(titleText))) state.stage = titleText;
}

function rememberCurrentSelection() {
  const active = findActiveQuestionSection();
  if (!active) return null;
  const selectedValue = getSelectedOption(active.section);
  if (selectedValue) state[active.meta.key] = selectedValue;
  return { ...active, selectedValue };
}

function polishQuestionCards() {
  const labels = Array.from(document.querySelectorAll("section p"));
  labels.forEach((label) => {
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

function buildContextualSummary(activeKey, selectedValue) {
  const setup = state.setup;
  const rhythm = state.rhythm;
  const workload = state.workload;
  const pressure = state.pressure;

  if (activeKey === "setup") {
    return `${selectedValue} is your starting environment. Next, CLARA checks whether your money comes steadily, irregularly, or partly from support.`;
  }
  if (activeKey === "rhythm") {
    return `${sentence(getInsight("setup", setup))}. With ${selectedValue}, CLARA can see if your student money is predictable enough for a weekly plan or needs timing protection.`;
  }
  if (activeKey === "workload") {
    return `${sentence(getInsight("setup", setup))}, and ${getInsight("rhythm", rhythm)}. CLARA now reads your energy level as part of your money behavior, not a separate issue.`;
  }
  if (activeKey === "pressure") {
    return `${sentence(getInsight("setup", setup))}, ${getInsight("rhythm", rhythm)}, and ${getInsight("workload", workload)}. This pressure shows what your budget should protect first.`;
  }
  if (activeKey === "coping") {
    return `${sentence(getInsight("workload", workload))}, while ${getInsight("pressure", pressure)}. CLARA uses this to understand whether spending is about relief, delay, support, or routine.`;
  }
  if (activeKey === "goal") {
    return `${sentence(getInsight("setup", setup))}, ${getInsight("rhythm", rhythm)}, ${getInsight("workload", workload)}, and ${getInsight("pressure", pressure)}. Now CLARA can protect ${selectedValue.toLowerCase()} with context.`;
  }
  return `${selectedValue} adds another clue to your life-stage profile.`;
}

function polishContextBoard() {
  const { summary, title } = findStageBoard();
  if (isContextBoardLoadingTitle(title?.textContent)) return;

  rememberStageSelection();
  const active = rememberCurrentSelection();
  if (!active || !summary || !title) return;
  const selectedValue = active.selectedValue || clean(title.textContent);
  if (!selectedValue) return;
  const nextSummary = buildContextualSummary(active.meta.key, selectedValue);
  const signature = `${active.meta.key}:${selectedValue}:${state.setup}:${state.rhythm}:${state.workload}:${state.pressure}:${state.coping}:${state.goal}`;
  if (summary.dataset.claraFlowSignature !== signature) {
    summary.textContent = nextSummary;
    summary.dataset.claraFlowSignature = signature;
    summary.classList.add("clara-flow-board-summary");
  }
}

function resetIfStagePickerIsOpen() {
  const active = findActiveQuestionSection();
  if (active) return;
  const { marker } = findStageBoard();
  if (!marker) return;
  state.setup = "";
  state.rhythm = "";
  state.workload = "";
  state.pressure = "";
  state.coping = "";
  state.goal = "";
}

function polishFlow() {
  resetIfStagePickerIsOpen();
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
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });
  document.addEventListener("click", schedule, true);
}

try {
  installLifeStageSetupFlowPolish();
} catch (error) {
  console.warn("CLARA life stage setup flow failed:", error);
}
