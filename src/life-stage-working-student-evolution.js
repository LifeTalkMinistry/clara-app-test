const BOARD_LABEL = "CLARA CONTEXT BOARD";

const STEP_LABELS = {
  "CURRENT SETUP": "setup",
  "MONEY RHYTHM": "rhythm",
  "WEEKLY LOAD": "workload",
  "PRESSURE RIGHT NOW": "pressure",
  "WHEN PRESSURE HITS": "coping",
  "WHAT TO PROTECT": "goal",
};

const OPTIONS = new Set([
  "Family-supported with some work",
  "Self-supporting student",
  "Working mainly for school costs",
  "Helping family while studying",
  "Side hustle / extra-income student",
  "Allowance + work income",
  "Fixed part-time pay",
  "Irregular side hustle income",
  "Project / seasonal income",
  "Mostly allowance with occasional work",
  "Manageable class-work load",
  "Tight but still controlled",
  "Heavy school-work overlap",
  "Little time to rest",
  "Almost no margin / survival mode",
  "Tuition or school costs",
  "Daily food and transport",
  "Work-school schedule conflict",
  "Family contribution",
  "Debt or borrowed money",
  "I spend on small rewards to feel okay",
  "I avoid checking my money",
  "I borrow or delay payments",
  "I cut my needs too much",
  "I ask for help before it gets worse",
  "Finish school without burning out",
  "Avoid debt",
  "Build savings slowly",
  "Help family without losing stability",
  "Control stress spending",
]);

const TITLES = {
  setup: {
    "Family-supported with some work": "Starting to Carry More",
    "Self-supporting student": "Carrying It Yourself",
    "Working mainly for school costs": "Working for the Future",
    "Helping family while studying": "Studying With Responsibility",
    "Side hustle / extra-income student": "Building Extra Room",
  },
  rhythm: {
    "Allowance + work income": "Shifting Into Responsibility",
    "Fixed part-time pay": "Steadier Ground",
    "Irregular side hustle income": "Uneven Income Days",
    "Project / seasonal income": "Income in Waves",
    "Mostly allowance with occasional work": "Support With Effort",
  },
  workload: {
    "Manageable class-work load": "Still Manageable",
    "Tight but still controlled": "Tight but Steerable",
    "Heavy school-work overlap": "Pressure Is Building",
    "Little time to rest": "Energy Is Getting Thin",
    "Almost no margin / survival mode": "Protection First",
  },
  pressure: {
    "Tuition or school costs": "School Must Stay Protected",
    "Daily food and transport": "Daily Costs Are Heavy",
    "Work-school schedule conflict": "Time Is Colliding",
    "Family contribution": "Family Pressure Is Present",
    "Debt or borrowed money": "Debt Pressure Is Active",
  },
  coping: {
    "I spend on small rewards to feel okay": "Relief Spending Pattern",
    "I avoid checking my money": "Money Feels Heavy",
    "I borrow or delay payments": "Delaying to Survive",
    "I cut my needs too much": "Over-Sacrifice Risk",
    "I ask for help before it gets worse": "You Reach Early",
  },
  goal: {
    "Finish school without burning out": "Graduate Without Burning Out",
    "Avoid debt": "Stay Out of Debt",
    "Build savings slowly": "Build Slowly but Safely",
    "Help family without losing stability": "Help Without Breaking",
    "Control stress spending": "Protect From Stress Spending",
  },
};

const SUMMARIES = {
  setup:
    "CLARA is only reading the starting environment here.\n\nThis is not the full story yet. It is the first shape of where financial responsibility begins in your student life.",
  rhythm:
    "The meaning has changed now.\n\nCLARA is no longer focused only on your setup. It is reading how money timing affects control, planning, and pressure.",
  workload:
    "The context now shifts from money source to personal capacity.\n\nCLARA is reading your financial behavior through time, energy, routine, and recovery — not just discipline.",
  pressure:
    "The priority is becoming clearer.\n\nCLARA is now identifying what must stay stable first before optional spending gets room.",
  coping:
    "This is now a behavior signal, not another separate answer.\n\nCLARA is reading how pressure changes your decisions so guidance can feel realistic, gentle, and useful.",
  goal:
    "CLARA now has a clearer protection direction.\n\nThe plan should fit your income rhythm, pressure level, and energy limits instead of forcing a perfect-budget version of your life.",
};

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const loud = (value) => clean(value).toUpperCase();

function selectedButton(button) {
  const className = String(button?.className || "");
  return className.includes("border-cyan") || className.includes("text-cyan-50") || className.includes("bg-cyan");
}

function getBoard() {
  const marker = Array.from(document.querySelectorAll("p")).find((node) => loud(node.textContent) === BOARD_LABEL);
  const header = marker?.closest("header");
  const title = header?.querySelector("h3");
  const summary = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { title, summary };
}

function getActiveStep() {
  const labels = Array.from(document.querySelectorAll("section p"));
  for (const label of labels) {
    const key = STEP_LABELS[loud(label.textContent)];
    const section = label.closest("section");
    if (!key || !section?.querySelector("button")) continue;

    const buttons = Array.from(section.querySelectorAll("button"));
    const isWorkingStudent = buttons.some((button) => OPTIONS.has(clean(button.innerText || button.textContent)));
    if (!isWorkingStudent) continue;

    const selected = buttons.find(selectedButton) || buttons[0];
    const value = clean(selected?.innerText || selected?.textContent);
    return { key, value };
  }
  return null;
}

function applyWorkingStudentEvolution() {
  const active = getActiveStep();
  if (!active) return;

  const { title, summary } = getBoard();
  if (!title || !summary) return;

  const nextTitle = TITLES[active.key]?.[active.value] || title.textContent;
  const nextSummary = SUMMARIES[active.key];
  const signature = `${active.key}:${active.value}`;

  if (title.dataset.claraTrueEvolution !== signature) {
    title.textContent = nextTitle;
    title.dataset.claraTrueEvolution = signature;
  }

  if (summary.dataset.claraTrueEvolution !== signature) {
    summary.textContent = nextSummary;
    summary.dataset.claraTrueEvolution = signature;
    summary.style.setProperty("white-space", "pre-line", "important");
  }
}

function installWorkingStudentEvolution() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraWorkingStudentEvolutionInstalled) return;
  window.__claraWorkingStudentEvolutionInstalled = true;

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scheduled = false;
        applyWorkingStudentEvolution();
      });
    });
  };

  schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });
  document.addEventListener("click", schedule, true);
}

try {
  installWorkingStudentEvolution();
} catch (error) {
  console.warn("CLARA working student evolution failed:", error);
}
