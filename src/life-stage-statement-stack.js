const LIFE_STAGE_MODAL_SELECTOR =
  "#root div[class*='fixed'][class*='inset-y-0'][class*='left-1/2'][class*='z-[9999]']";

const STAGE_ORDER = [
  "Working Student",
  "Young Professional",
  "Living with Partner",
  "Family Household",
  "Single Parent",
  "Full-Time Earner",
  "Freelance Season",
  "Business Builder",
];

const SECTION_ORDER = ["setup", "rhythm", "workload", "pressure", "coping", "goal"];

const SECTION_BY_EYEBROW = {
  "current setup": "setup",
  "money rhythm": "rhythm",
  "weekly load": "workload",
  "pressure right now": "pressure",
  "pressure response": "coping",
  "protection goal": "goal",
};

const WORKING_STUDENT_DEFAULTS = {
  setup: "Family-supported with some work",
  rhythm: "Allowance + work income",
  workload: "Manageable class-work load",
  pressure: "Tuition or school costs",
  coping: "I spend on small rewards to feel okay",
  goal: "Finish school without burning out",
};

const WORKING_STUDENT_STATEMENTS = {
  setup: {
    "Family-supported with some work": {
      title: "Supported, but responsible",
      lines: ["You still have support.", "But money is slowly becoming your responsibility too."],
    },
    "Self-supporting student": {
      title: "Carrying it yourself",
      lines: ["You are not just studying.", "You are also carrying your own survival."],
    },
    "Working mainly for school costs": {
      title: "Working for your future",
      lines: ["Your work is protecting your education.", "Every peso has a direct connection to staying in school."],
    },
    "Helping family while studying": {
      title: "Studying with responsibility",
      lines: ["Your student life is not only about you.", "Family responsibility is part of your money reality."],
    },
    "Side hustle / extra-income student": {
      title: "Building extra income",
      lines: ["You are trying to create more room through extra income.", "That shows initiative, but it can also stretch your time and energy."],
    },
  },
  rhythm: {
    "Allowance + work income": {
      title: "Mixed money rhythm",
      lines: ["Your money comes from both support and effort.", "This can make spending feel divided between what is given and what you earned."],
    },
    "Fixed part-time pay": {
      title: "Predictable work income",
      lines: ["Your income has a clearer rhythm.", "That gives CLARA something stable to plan around."],
    },
    "Irregular side hustle income": {
      title: "Unstable income rhythm",
      lines: ["Your income may change from week to week.", "CLARA should help protect you during low-income days."],
    },
    "Project / seasonal income": {
      title: "Income comes in waves",
      lines: ["Your money may arrive in waves.", "Strong income days need to stretch across weaker days."],
    },
    "Mostly allowance with occasional work": {
      title: "Allowance-led rhythm",
      lines: ["Allowance is still your main base.", "Extra work can become a small buffer if it is not spent too quickly."],
    },
  },
  workload: {
    "Manageable class-work load": {
      title: "Still manageable",
      lines: ["Your week still has room for control.", "This is a good moment to build habits before life gets heavier."],
    },
    "Tight but still controlled": {
      title: "Tight, but controlled",
      lines: ["Your schedule is already stretched.", "But there is still enough control to keep money decisions simple and intentional."],
    },
    "Heavy school-work overlap": {
      title: "Heavy overlap",
      lines: ["School and work are starting to compete for the same energy.", "Convenience spending can become more tempting when time gets squeezed."],
    },
    "Little time to rest": {
      title: "Rest is getting thin",
      lines: ["Your schedule is starting to consume most of your recovery time.", "This can slowly affect focus, spending control, and energy."],
    },
    "Almost no margin / survival mode": {
      title: "Almost no margin",
      lines: ["There is very little room to breathe right now.", "CLARA should focus on protection first, not perfect budgeting."],
    },
  },
  pressure: {
    "Tuition or school costs": {
      title: "School costs first",
      lines: ["School costs are becoming the first thing your budget needs to protect.", "Falling behind here can affect more than money."],
    },
    "Daily food and transport": {
      title: "Daily costs matter",
      lines: ["Daily survival costs are becoming harder to ignore.", "Even small expenses may now feel emotionally heavier."],
    },
    "Work-school schedule conflict": {
      title: "Time is colliding",
      lines: ["Your pressure is not only about money.", "Work and school are colliding in ways that can make spending happen for speed, food, or relief."],
    },
    "Family contribution": {
      title: "Family pressure is present",
      lines: ["Family responsibility is now part of the pressure.", "CLARA should help you give wisely without losing your own stability."],
    },
    "Debt or borrowed money": {
      title: "Debt pressure is active",
      lines: ["Borrowed money is already part of the pressure.", "CLARA should help stop one tight week from becoming a repeating cycle."],
    },
  },
  coping: {
    "I spend on small rewards to feel okay": {
      title: "Small rewards under pressure",
      lines: ["Small rewards may be helping you recover emotionally from pressure.", "But repeated comfort spending can slowly reduce your financial breathing room."],
    },
    "I avoid checking my money": {
      title: "Money feels heavy",
      lines: ["Checking your money may feel stressful right now.", "Avoiding it can feel safer short-term, but it can create surprise pressure later."],
    },
    "I borrow or delay payments": {
      title: "Delaying to survive",
      lines: ["When pressure gets too tight, you may push payments forward or borrow to get through.", "CLARA should help reduce the gap before it repeats."],
    },
    "I cut my needs too much": {
      title: "Over-sacrifice risk",
      lines: ["You may be protecting obligations by cutting too much from yourself.", "Food, rest, health, and school needs should not become optional."],
    },
    "I ask for help before it gets worse": {
      title: "You reach for support",
      lines: ["You know how to ask for help before pressure becomes worse.", "That is a strength CLARA can build on while helping you grow more stable."],
    },
  },
  goal: {
    "Finish school without burning out": {
      title: "Graduate without burning out",
      lines: ["Your goal is not only to finish school.", "It is to reach graduation without completely exhausting yourself financially and emotionally."],
    },
    "Avoid debt": {
      title: "Protect from debt",
      lines: ["Your priority is to avoid borrowed-money pressure.", "CLARA should help spot shortfalls before debt becomes the answer."],
    },
    "Build savings slowly": {
      title: "Slow savings matter",
      lines: ["You are not trying to change everything overnight.", "Small savings can still matter when they are realistic and consistent."],
    },
    "Help family without losing stability": {
      title: "Help without breaking",
      lines: ["You want to help without losing yourself in the process.", "CLARA should protect your school, food, transport, and future while you support others."],
    },
    "Control stress spending": {
      title: "Protect from stress spending",
      lines: ["You want to understand what pressure does to your spending.", "CLARA should help you create relief that does not quietly damage your budget."],
    },
  },
};

const statementState = {
  stage: "",
  selections: { ...WORKING_STUDENT_DEFAULTS },
};

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getLifeStageModal() {
  if (typeof document === "undefined") return null;
  return document.querySelector(LIFE_STAGE_MODAL_SELECTOR);
}

function getContextBoardHeader(modal) {
  const header = modal?.querySelector("header");
  if (!header) return null;

  const eyebrow = cleanText(header.querySelector("p")?.textContent).toLowerCase();
  return eyebrow.includes("clara context board") ? header : null;
}

function getBoardTextNodes(header) {
  const title = header?.querySelector("h3") || null;
  const paragraphs = Array.from(header?.querySelectorAll("p") || []);
  const summary = paragraphs.find((paragraph) => {
    const text = cleanText(paragraph.textContent).toLowerCase();
    return text && !text.includes("clara context board");
  });

  return { title, summary: summary || null };
}

function getActiveButtonByLabels(root, labels) {
  const buttons = Array.from(root?.querySelectorAll("button") || []);
  const labeledButtons = buttons.filter((button) => labels.includes(cleanText(button.textContent)));

  return (
    labeledButtons.find((button) => String(button.className || "").includes("border-cyan-200")) ||
    labeledButtons[0] ||
    null
  );
}

function getActiveStage(modal) {
  const activeStageButton = getActiveButtonByLabels(modal, STAGE_ORDER);
  return cleanText(activeStageButton?.textContent);
}

function getActiveQuestion(modal) {
  const section = Array.from(modal?.querySelectorAll("main section") || []).find((node) =>
    Object.keys(SECTION_BY_EYEBROW).includes(cleanText(node.querySelector("p")?.textContent).toLowerCase())
  );

  if (!section) return { key: null, value: "" };

  const eyebrow = cleanText(section.querySelector("p")?.textContent).toLowerCase();
  const key = SECTION_BY_EYEBROW[eyebrow] || null;
  const labels = Object.keys(WORKING_STUDENT_STATEMENTS[key] || {});
  const activeButton = getActiveButtonByLabels(section, labels);

  return { key, value: cleanText(activeButton?.textContent) };
}

function getStatementFor(key, value) {
  return WORKING_STUDENT_STATEMENTS[key]?.[value] || null;
}

function buildStatementStack(activeKey) {
  const activeIndex = SECTION_ORDER.indexOf(activeKey);
  if (activeIndex < 0) return null;

  const visibleKeys = SECTION_ORDER.slice(0, activeIndex + 1);
  const statements = visibleKeys
    .map((key, index) => {
      const value = statementState.selections[key] || WORKING_STUDENT_DEFAULTS[key];
      const item = getStatementFor(key, value);
      if (!item) return null;

      return {
        number: index + 1,
        title: item.title,
        body: item.lines.join("\n\n"),
      };
    })
    .filter(Boolean);

  if (!statements.length) return null;

  const current = statements[statements.length - 1];
  const summary = statements
    .map((item) => `(${item.number})\n${item.body}`)
    .join("\n\n");

  return {
    title: current.title,
    summary,
  };
}

function applyStatementStack() {
  const modal = getLifeStageModal();
  const header = getContextBoardHeader(modal);
  if (!modal || !header) return;

  const detectedStage = getActiveStage(modal) || statementState.stage;
  if (detectedStage && detectedStage !== statementState.stage) {
    statementState.stage = detectedStage;
    statementState.selections = { ...WORKING_STUDENT_DEFAULTS };
  }

  const { key, value } = getActiveQuestion(modal);
  if (key && value) statementState.selections[key] = value;

  if (statementState.stage !== "Working Student" || !key) return;

  const board = buildStatementStack(key);
  if (!board) return;

  const { title, summary } = getBoardTextNodes(header);
  if (title && cleanText(title.textContent) !== board.title) title.textContent = board.title;

  if (summary && summary.textContent !== board.summary) {
    summary.textContent = board.summary;
    summary.style.setProperty("white-space", "pre-line", "important");
    summary.style.setProperty("max-height", "240px", "important");
    summary.style.setProperty("overflow-y", "auto", "important");
    summary.style.setProperty("padding-right", "0.25rem", "important");
  }
}

function installLifeStageStatementStack() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_LIFE_STAGE_STATEMENT_STACK__) return;
  window.__CLARA_LIFE_STAGE_STATEMENT_STACK__ = true;

  const observer = new MutationObserver(() => window.requestAnimationFrame(applyStatementStack));
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  document.addEventListener(
    "click",
    () => window.requestAnimationFrame(() => window.requestAnimationFrame(applyStatementStack)),
    true
  );

  window.requestAnimationFrame(applyStatementStack);
}

try {
  installLifeStageStatementStack();
} catch (error) {
  console.warn("CLARA life stage statement stack failed:", error);
}
