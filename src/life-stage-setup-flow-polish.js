const FLOW_MARKER = "CLARA CONTEXT BOARD";

const STEP_META = {
  "CURRENT SETUP": {
    key: "setup",
    label: "CURRENT SETUP",
    question: "Which setup feels closest to your real life right now?",
    title: "Starting Context",
    summary: "CLARA is reading the starting environment first.\n\nThis is only the first shape of your current life situation.",
  },
  "MONEY RHYTHM": {
    key: "rhythm",
    label: "MONEY RHYTHM",
    question: "How does money usually come into your week or month?",
    title: "Money Rhythm Emerging",
    summary: "The meaning is changing now.\n\nCLARA is reading how your money timing affects control, pressure, and planning.",
  },
  "WEEKLY LOAD": {
    key: "workload",
    label: "WEEKLY LOAD",
    question: "How stretched does your normal week feel?",
    title: "Capacity Check",
    summary: "The focus now moves from income to capacity.\n\nCLARA is reading your money behavior through time, energy, routine, and recovery.",
  },
  "PRESSURE RIGHT NOW": {
    key: "pressure",
    label: "PRESSURE RIGHT NOW",
    question: "What is putting the most pressure on your money right now?",
    title: "Protection Priority",
    summary: "The priority is becoming clearer.\n\nCLARA is identifying what must stay stable first before optional spending gets room.",
  },
  "PRESSURE RESPONSE": {
    key: "coping",
    label: "WHEN PRESSURE HITS",
    question: "What do you usually do when money pressure gets heavy?",
    title: "Behavior Pattern Detected",
    summary: "This is now a behavior signal.\n\nCLARA is reading how pressure changes your decisions so guidance can feel realistic.",
  },
  "WHEN PRESSURE HITS": {
    key: "coping",
    label: "WHEN PRESSURE HITS",
    question: "What do you usually do when money pressure gets heavy?",
    title: "Behavior Pattern Detected",
    summary: "This is now a behavior signal.\n\nCLARA is reading how pressure changes your decisions so guidance can feel realistic.",
  },
  "PROTECTION GOAL": {
    key: "goal",
    label: "WHAT TO PROTECT",
    question: "What are you trying to protect most right now?",
    title: "Direction Is Clearer",
    summary: "CLARA now has a clearer protection direction.\n\nThe plan should fit your rhythm, pressure level, and energy limits.",
  },
  "WHAT TO PROTECT": {
    key: "goal",
    label: "WHAT TO PROTECT",
    question: "What are you trying to protect most right now?",
    title: "Direction Is Clearer",
    summary: "CLARA now has a clearer protection direction.\n\nThe plan should fit your rhythm, pressure level, and energy limits.",
  },
};

const OPTION_TITLES = {
  "Family-supported with some work": "Starting to Carry More",
  "Self-supporting student": "Carrying It Yourself",
  "Working mainly for school costs": "Working for the Future",
  "Helping family while studying": "Studying With Responsibility",
  "Side hustle / extra-income student": "Building Extra Room",
  "Allowance + work income": "Shifting Into Responsibility",
  "Fixed part-time pay": "Steadier Ground",
  "Irregular side hustle income": "Uneven Income Days",
  "Project / seasonal income": "Income in Waves",
  "Mostly allowance with occasional work": "Support With Effort",
  "Manageable class-work load": "Still Manageable",
  "Tight but still controlled": "Tight but Steerable",
  "Heavy school-work overlap": "Pressure Is Building",
  "Little time to rest": "Energy Is Getting Thin",
  "Almost no margin / survival mode": "Protection First",
  "Tuition or school costs": "School Must Stay Protected",
  "Daily food and transport": "Daily Costs Are Heavy",
  "Work-school schedule conflict": "Time Is Colliding",
  "Family contribution": "Family Pressure Is Present",
  "Debt or borrowed money": "Debt Pressure Is Active",
  "I spend on small rewards to feel okay": "Relief Spending Pattern",
  "I avoid checking my money": "Money Feels Heavy",
  "I borrow or delay payments": "Delaying to Survive",
  "I cut my needs too much": "Over-Sacrifice Risk",
  "I ask for help before it gets worse": "You Reach Early",
  "Finish school without burning out": "Graduate Without Burning Out",
  "Avoid debt": "Stay Out of Debt",
  "Build savings slowly": "Build Slowly but Safely",
  "Help family without losing stability": "Help Without Breaking",
  "Control stress spending": "Protect From Stress Spending",
};

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

function polishContextBoard() {
  const active = findActiveQuestionSection();
  const { summary, title } = findStageBoard();
  if (!active || !summary || !title) return;

  const selectedValue = getSelectedOption(active.section);
  const nextTitle = OPTION_TITLES[selectedValue] || active.meta.title;
  const nextSummary = active.meta.summary;
  const signature = `${active.meta.key}:${selectedValue}`;

  if (title.dataset.claraBoardSignature !== signature) {
    title.textContent = nextTitle;
    title.dataset.claraBoardSignature = signature;
  }
  if (summary.dataset.claraBoardSignature !== signature) {
    summary.textContent = nextSummary;
    summary.dataset.claraBoardSignature = signature;
    summary.classList.add("clara-flow-board-summary");
    summary.style.setProperty("white-space", "pre-line", "important");
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
