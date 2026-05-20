const FLOW_MARKER = "CLARA CONTEXT BOARD";

const STEP_META = {
  "CURRENT SETUP": {
    key: "setup",
    label: "CURRENT SETUP",
    question: "Which setup feels closest to your real life right now?",
    index: 0,
  },
  "MONEY RHYTHM": {
    key: "rhythm",
    label: "MONEY RHYTHM",
    question: "How does money usually come into your week or month?",
    index: 1,
  },
  "WEEKLY LOAD": {
    key: "workload",
    label: "WEEKLY LOAD",
    question: "How stretched does your normal week feel?",
    index: 2,
  },
  "PRESSURE RIGHT NOW": {
    key: "pressure",
    label: "PRESSURE RIGHT NOW",
    question: "What is putting the most pressure on your money right now?",
    index: 3,
  },
  "PRESSURE RESPONSE": {
    key: "coping",
    label: "WHEN PRESSURE HITS",
    question: "What do you usually do when money pressure gets heavy?",
    index: 4,
  },
  "WHEN PRESSURE HITS": {
    key: "coping",
    label: "WHEN PRESSURE HITS",
    question: "What do you usually do when money pressure gets heavy?",
    index: 4,
  },
  "PROTECTION GOAL": {
    key: "goal",
    label: "WHAT TO PROTECT",
    question: "What are you trying to protect most right now?",
    index: 5,
  },
  "WHAT TO PROTECT": {
    key: "goal",
    label: "WHAT TO PROTECT",
    question: "What are you trying to protect most right now?",
    index: 5,
  },
};

const OPTION_EXPLANATIONS = {
  "Family-supported with some work":
    "This means you still have some support, but you are also starting to carry part of your own money responsibility.\n\nCLARA will treat this as a transition stage, not full dependence and not full independence yet.",
  "Self-supporting student":
    "This means you are carrying most of your own daily needs while still studying.\n\nCLARA will treat your budget with more protection because school and survival are both part of your load.",
  "Working mainly for school costs":
    "This means your work is directly connected to keeping your education going.\n\nCLARA will treat school expenses as a priority that needs to be protected early.",
  "Helping family while studying":
    "This means your money is not only for yourself. Family responsibility is also part of your student life.\n\nCLARA will watch for balance so helping others does not weaken your own stability.",
  "Side hustle / extra-income student":
    "This means you are creating extra money through flexible effort.\n\nCLARA will watch your time, energy, and income consistency so the side hustle helps instead of exhausting you.",

  "Allowance + work income":
    "This means your money comes from both support and personal effort.\n\nCLARA will treat your income as mixed, so timing and spending boundaries matter.",
  "Fixed part-time pay":
    "This means your income has a more predictable rhythm.\n\nCLARA can help you plan around paydays, limits, and the basic needs that must be covered first.",
  "Irregular side hustle income":
    "This means your income may change from week to week.\n\nCLARA will treat strong income days carefully so they can help cover weaker days.",
  "Project / seasonal income":
    "This means your money may arrive in waves instead of a steady flow.\n\nCLARA will help you stretch stronger periods across slower periods.",
  "Mostly allowance with occasional work":
    "This means allowance is still your base, while occasional work gives extra room.\n\nCLARA will help separate basic money from flexible money so extra income does not disappear too quickly.",

  "Manageable class-work load":
    "This means your schedule still has room for control.\n\nCLARA will treat this as a good time to build simple habits before pressure becomes heavier.",
  "Tight but still controlled":
    "This means your week is stretched, but not fully out of control.\n\nCLARA will keep guidance simple because decision fatigue can slowly affect spending.",
  "Heavy school-work overlap":
    "This means school and work are starting to compete for the same time and energy.\n\nCLARA will watch for convenience spending, fatigue spending, and rushed decisions.",
  "Little time to rest":
    "This means recovery time is becoming limited.\n\nCLARA will treat rest and energy as part of your money behavior, not a separate issue.",
  "Almost no margin / survival mode":
    "This means there is very little room for mistakes right now.\n\nCLARA will focus on protection first instead of expecting a perfect budget.",

  "Tuition or school costs":
    "This means school expenses are the main pressure point.\n\nCLARA will help protect tuition, requirements, and education-related costs before optional spending.",
  "Daily food and transport":
    "This means daily survival costs are carrying the pressure.\n\nCLARA will watch small repeated expenses because they can quietly drain your week.",
  "Work-school schedule conflict":
    "This means your pressure is not only financial. Time and schedule conflict are also affecting your decisions.\n\nCLARA will watch for spending caused by speed, convenience, or exhaustion.",
  "Family contribution":
    "This means helping family is part of your money pressure.\n\nCLARA will help you support others without forgetting your own school and daily needs.",
  "Debt or borrowed money":
    "This means borrowed money is already part of the pressure.\n\nCLARA will focus on preventing the same shortfall from repeating week after week.",

  "I spend on small rewards to feel okay":
    "This means spending may sometimes become emotional relief.\n\nCLARA will not treat this as failure. It will help you find safer ways to feel okay without hurting your budget.",
  "I avoid checking my money":
    "This means checking your money may feel stressful or heavy.\n\nCLARA will keep money check-ins lighter, shorter, and easier to face.",
  "I borrow or delay payments":
    "This means you may be solving today’s pressure by pushing some of it forward.\n\nCLARA will help spot gaps earlier before delay becomes a repeating cycle.",
  "I cut my needs too much":
    "This means you may be sacrificing too much just to keep obligations covered.\n\nCLARA will protect basic needs like food, rest, health, and school essentials.",
  "I ask for help before it gets worse":
    "This means you know how to reach for support before the pressure becomes heavier.\n\nCLARA will help turn that support into a clear plan, not just emergency rescue.",

  "Finish school without burning out":
    "This means your goal is not only to finish school, but to finish with your energy still intact.\n\nCLARA will protect both graduation and recovery.",
  "Avoid debt":
    "This means your main goal is to prevent borrowed money from becoming normal.\n\nCLARA will help you catch shortfalls earlier and protect essentials first.",
  "Build savings slowly":
    "This means you want progress without forcing an unrealistic savings plan.\n\nCLARA will focus on small, steady protection instead of pressure-based saving.",
  "Help family without losing stability":
    "This means you want to support family while still protecting your own life.\n\nCLARA will help separate help money from school, food, transport, and personal needs.",
  "Control stress spending":
    "This means you want to understand pressure before it turns into repeated spending.\n\nCLARA will help create relief options that do not quietly damage your budget.",
};

const STAGE_NAMES = [
  "Working Student",
  "Young Professional",
  "Living with Partner",
  "Family Household",
  "Single Parent",
  "Full-Time Earner",
  "Freelance Season",
  "Business Builder",
];

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const loud = (value) => clean(value).toUpperCase();

function isVisible(node) {
  return !!node && !!(node.offsetWidth || node.offsetHeight || node.getClientRects?.().length);
}

function getStepMeta(text) {
  return STEP_META[loud(text)] || null;
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

function isStagePickerOpen() {
  const buttons = Array.from(document.querySelectorAll("main button") || []);
  const labels = buttons.map((button) => clean(button.innerText || button.textContent));
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
    const clone = bars[bars.length - 1].cloneNode(false);
    group.appendChild(clone);
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

  const bars = ensureSixProgressBars(group);
  bars.forEach((bar, index) => {
    const active = index === activeIndex;
    bar.style.setProperty("width", active ? "2rem" : "1.65rem", "important");
    bar.style.setProperty("height", "0.25rem", "important");
    bar.style.setProperty("border-radius", "9999px", "important");
    bar.style.setProperty("background", active ? "rgb(165 243 252)" : "rgba(255, 255, 255, 0.12)", "important");
    bar.style.setProperty("box-shadow", active ? "0 0 16px rgba(125, 211, 252, 0.35)" : "none", "important");
    bar.style.setProperty("opacity", active ? "1" : "0.6", "important");
    bar.style.setProperty("transition", "background 160ms ease, opacity 160ms ease, width 160ms ease", "important");
  });
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

function buildSimpleBoard(selectedValue) {
  return {
    title: selectedValue || "Selected answer",
    summary:
      OPTION_EXPLANATIONS[selectedValue] ||
      "This choice helps CLARA understand the situation you are selecting right now.\n\nCLARA will use this as a simple signal when giving guidance later.",
  };
}

function polishContextBoard() {
  const active = findActiveQuestionSection();
  const { header, summary, title } = findStageBoard();
  if (!active || !header || !summary || !title) return;

  const selectedValue = getSelectedOption(active.section);
  const board = buildSimpleBoard(selectedValue);
  const signature = `${active.meta.key}:${selectedValue}`;

  updateSimpleProgress(header, active.meta.index);

  if (title.dataset.claraSimpleBoardSignature !== signature) {
    title.textContent = board.title;
    title.dataset.claraSimpleBoardSignature = signature;
  }

  if (summary.dataset.claraSimpleBoardSignature !== signature) {
    summary.textContent = board.summary;
    summary.dataset.claraSimpleBoardSignature = signature;
    summary.classList.add("clara-flow-board-summary");
    summary.style.setProperty("white-space", "pre-line", "important");
    summary.style.setProperty("line-height", "1.55", "important");
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
  console.warn("CLARA life stage setup flow polish failed:", error);
}
