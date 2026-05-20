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
  "when pressure hits": "coping",
  "protection goal": "goal",
  "what to protect": "goal",
};

const WORKING_STUDENT_DEFAULTS = {
  setup: "Family-supported with some work",
  rhythm: "Allowance + work income",
  workload: "Manageable class-work load",
  pressure: "Tuition or school costs",
  coping: "I spend on small rewards to feel okay",
  goal: "Finish school without burning out",
};

const WORKING_STUDENT_EVOLUTION = {
  setup: {
    "Family-supported with some work": {
      title: "Starting to Carry More",
      base: "You still have support, but financial responsibility is starting to move closer to you.",
      role: "a student transitioning from dependence into earned responsibility",
      responsibility: "shared support and growing independence",
      protection: "your support system and your own effort",
    },
    "Self-supporting student": {
      title: "Carrying It Yourself",
      base: "You are not only studying. You are also carrying much of your own survival.",
      role: "a student already holding adult-level responsibility",
      responsibility: "school, daily needs, and personal survival",
      protection: "your ability to stay in school while covering real needs",
    },
    "Working mainly for school costs": {
      title: "Working for the Future",
      base: "Your work is directly connected to keeping school moving.",
      role: "a student whose income is protecting education first",
      responsibility: "education costs that cannot be ignored",
      protection: "tuition, requirements, and school continuity",
    },
    "Helping family while studying": {
      title: "Studying With Responsibility",
      base: "Your student life is not only about you. Family responsibility is part of your money reality.",
      role: "a student balancing education with family contribution",
      responsibility: "personal goals and family pressure at the same time",
      protection: "your school path while still helping wisely",
    },
    "Side hustle / extra-income student": {
      title: "Building Extra Room",
      base: "You are trying to create more room through extra income.",
      role: "a student using initiative to create flexibility",
      responsibility: "opportunity, time, and energy management",
      protection: "your income effort without stretching yourself too thin",
    },
  },
  rhythm: {
    "Allowance + work income": {
      title: "Mixed Money Rhythm",
      rhythm: "a mix of support and earned income",
      meaning: "each peso can feel split between what is given and what you had to work for",
      planning: "weekly protection around both allowance timing and work income",
    },
    "Fixed part-time pay": {
      title: "Predictable Work Income",
      rhythm: "a clearer work-pay rhythm",
      meaning: "your money has more structure, but the margin may still be limited",
      planning: "a simple weekly plan built around predictable paydays",
    },
    "Irregular side hustle income": {
      title: "Uneven Income Days",
      rhythm: "income that can change from week to week",
      meaning: "good income days may need to carry weaker days",
      planning: "buffer protection before flexible income disappears into daily spending",
    },
    "Project / seasonal income": {
      title: "Income in Waves",
      rhythm: "money that arrives in waves",
      meaning: "your stability depends on stretching strong periods across quiet periods",
      planning: "holding money longer instead of treating every arrival as extra",
    },
    "Mostly allowance with occasional work": {
      title: "Allowance-Led Rhythm",
      rhythm: "allowance as the base with occasional earned income",
      meaning: "extra work can become breathing room if it does not get spent too quickly",
      planning: "separating survival money from flexible money",
    },
  },
  workload: {
    "Manageable class-work load": {
      title: "Still Manageable",
      energy: "your week still has room for control",
      meaning: "this is a habit-building window before pressure becomes heavier",
      risk: "low urgency, but small routines matter now",
    },
    "Tight but still controlled": {
      title: "Tight but Steerable",
      energy: "your week is stretched but still steerable",
      meaning: "you can still make intentional choices if the plan stays simple",
      risk: "decision fatigue can start to affect spending",
    },
    "Heavy school-work overlap": {
      title: "Pressure Is Building",
      energy: "school and work are starting to compete for the same energy",
      meaning: "money decisions are now connected to time, fatigue, and convenience",
      risk: "convenience spending can rise when recovery time gets squeezed",
    },
    "Little time to rest": {
      title: "Running With Less Room",
      energy: "recovery time is getting thin",
      meaning: "your spending control may weaken when tiredness becomes normal",
      risk: "quick food, transport, and comfort spending can become harder to resist",
    },
    "Almost no margin / survival mode": {
      title: "Protection First",
      energy: "there is almost no room to breathe",
      meaning: "CLARA should read this as protection mode, not perfect-budget mode",
      risk: "one mistake can create a chain reaction across school, food, transport, or debt",
    },
  },
  pressure: {
    "Tuition or school costs": {
      title: "School Must Stay Protected",
      pressure: "education costs are the pressure point",
      protect: "tuition, requirements, and school continuity",
      warning: "falling behind here can affect more than money",
    },
    "Daily food and transport": {
      title: "Daily Costs Are Heavy",
      pressure: "food and transport are carrying the pressure",
      protect: "daily survival basics before optional spending",
      warning: "small repeated costs can quietly drain the month",
    },
    "Work-school schedule conflict": {
      title: "Time Is Colliding",
      pressure: "time conflict is becoming money pressure",
      protect: "recovery, schedule stability, and decisions made under fatigue",
      warning: "spending may happen for speed, convenience, or relief",
    },
    "Family contribution": {
      title: "Family Pressure Is Present",
      pressure: "family support is part of the financial load",
      protect: "your own stability while helping others wisely",
      warning: "giving without boundaries can weaken your school and daily needs",
    },
    "Debt or borrowed money": {
      title: "Debt Pressure Is Active",
      pressure: "borrowed money is already part of the situation",
      protect: "debt prevention, repayment rhythm, and emergency breathing room",
      warning: "one tight week can become a repeating cycle if not protected early",
    },
  },
  coping: {
    "I spend on small rewards to feel okay": {
      title: "Relief Spending Pattern",
      response: "small rewards may be acting as emotional recovery",
      interpretation: "this is not just spending; it may be your way of feeling okay after pressure",
      coaching: "create safer relief before comfort spending quietly reduces breathing room",
    },
    "I avoid checking my money": {
      title: "Money Feels Heavy",
      response: "avoiding your balance may feel safer in the moment",
      interpretation: "the pressure may already feel emotionally loaded",
      coaching: "make money-checking lighter, shorter, and less scary",
    },
    "I borrow or delay payments": {
      title: "Delaying to Survive",
      response: "borrowing or delaying may be helping you get through urgent gaps",
      interpretation: "your system may be solving today while pushing pressure into later",
      coaching: "spot shortfalls earlier before delay becomes the pattern",
    },
    "I cut my needs too much": {
      title: "Over-Sacrifice Risk",
      response: "you may be protecting obligations by cutting too much from yourself",
      interpretation: "survival discipline is present, but it may be costing food, rest, or health",
      coaching: "protect basic needs as non-negotiable, not optional",
    },
    "I ask for help before it gets worse": {
      title: "You Reach Early",
      response: "you know how to ask for help before pressure gets worse",
      interpretation: "support is not weakness here; it is part of your protection strategy",
      coaching: "turn help into a clear plan instead of emergency rescue",
    },
  },
  goal: {
    "Finish school without burning out": {
      title: "Graduate Without Burning Out",
      direction: "protect graduation while keeping your energy and health intact",
      coaching: "budget around school survival, recovery, and realistic daily spending",
    },
    "Avoid debt": {
      title: "Stay Out of Debt",
      direction: "prevent borrowed-money pressure before it becomes the default answer",
      coaching: "build early warnings for shortfalls and protect essentials first",
    },
    "Build savings slowly": {
      title: "Build Slowly but Safely",
      direction: "create small savings without forcing an unrealistic plan",
      coaching: "use gentle consistency instead of pressure-based saving",
    },
    "Help family without losing stability": {
      title: "Help Without Breaking",
      direction: "support family while keeping your own school path stable",
      coaching: "separate help money from school, food, transport, and personal survival needs",
    },
    "Control stress spending": {
      title: "Protect From Stress Spending",
      direction: "understand pressure before it turns into repeated emotional spending",
      coaching: "create relief options that do not quietly damage your budget",
    },
  },
};

const state = {
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

function isSelectedButton(button) {
  const className = String(button?.className || "");
  return (
    button?.getAttribute?.("aria-pressed") === "true" ||
    button?.getAttribute?.("data-selected") === "true" ||
    className.includes("border-cyan") ||
    className.includes("text-cyan-50") ||
    className.includes("bg-cyan")
  );
}

function getActiveButtonByLabels(root, labels) {
  const buttons = Array.from(root?.querySelectorAll("button") || []);
  const labeledButtons = buttons.filter((button) => labels.includes(cleanText(button.innerText || button.textContent)));

  return labeledButtons.find(isSelectedButton) || labeledButtons[0] || null;
}

function getActiveStage(modal) {
  const activeStageButton = getActiveButtonByLabels(modal, STAGE_ORDER);
  return cleanText(activeStageButton?.innerText || activeStageButton?.textContent);
}

function getSectionKeyFromEyebrow(value) {
  return SECTION_BY_EYEBROW[cleanText(value).toLowerCase()] || null;
}

function getActiveQuestion(modal) {
  const sections = Array.from(modal?.querySelectorAll("main section, section") || []);
  const section = sections.find((node) => getSectionKeyFromEyebrow(node.querySelector("p")?.textContent));

  if (!section) return { key: null, value: "" };

  const key = getSectionKeyFromEyebrow(section.querySelector("p")?.textContent);
  const labels = Object.keys(WORKING_STUDENT_EVOLUTION[key] || {});
  const activeButton = getActiveButtonByLabels(section, labels);

  return { key, value: cleanText(activeButton?.innerText || activeButton?.textContent) };
}

function getContext(key, value) {
  const fallbackValue = WORKING_STUDENT_DEFAULTS[key];
  return WORKING_STUDENT_EVOLUTION[key]?.[value] || WORKING_STUDENT_EVOLUTION[key]?.[fallbackValue] || {};
}

function getSelection(key) {
  return state.selections[key] || WORKING_STUDENT_DEFAULTS[key];
}

function buildResolvedContext(activeKey) {
  const activeIndex = SECTION_ORDER.indexOf(activeKey);
  if (activeIndex < 0) return null;

  return SECTION_ORDER.slice(0, activeIndex + 1).reduce((context, key) => {
    const value = getSelection(key);
    context[key] = {
      value,
      ...getContext(key, value),
    };
    return context;
  }, {});
}

function getRhythmTitle(setupValue, rhythmValue, fallbackTitle) {
  const combo = `${setupValue}|${rhythmValue}`;
  const titles = {
    "Family-supported with some work|Allowance + work income": "Shifting Into Responsibility",
    "Family-supported with some work|Mostly allowance with occasional work": "Support With Growing Effort",
    "Self-supporting student|Fixed part-time pay": "Carrying a Steady Load",
    "Self-supporting student|Irregular side hustle income": "Carrying an Uneven Load",
    "Working mainly for school costs|Project / seasonal income": "Protecting School in Waves",
    "Helping family while studying|Allowance + work income": "Shared Support, Shared Pressure",
    "Side hustle / extra-income student|Irregular side hustle income": "Flexible but Stretched",
  };
  return titles[combo] || fallbackTitle || "Money Pattern Emerging";
}

function getWorkloadTitle(workloadValue, fallbackTitle) {
  if (workloadValue === "Heavy school-work overlap") return "Pressure Is Building";
  if (workloadValue === "Little time to rest") return "Energy Is Getting Thin";
  if (workloadValue === "Almost no margin / survival mode") return "Protection First";
  return fallbackTitle || "Energy Context Emerging";
}

function buildEvolvedContext(activeKey) {
  const context = buildResolvedContext(activeKey);
  if (!context) return null;

  const setup = context.setup;
  const rhythm = context.rhythm;
  const workload = context.workload;
  const pressure = context.pressure;
  const coping = context.coping;
  const goal = context.goal;

  if (activeKey === "setup") {
    return {
      title: setup.title,
      narrative: `${setup.base}\n\nCLARA is starting from your environment: ${setup.role}.`,
      insight: "CLARA is beginning to read where responsibility first touches your student life.",
    };
  }

  if (activeKey === "rhythm") {
    return {
      title: getRhythmTitle(setup.value, rhythm.value, rhythm.title),
      narrative: `${setup.base}\n\nWith ${rhythm.rhythm}, this becomes ${setup.role} with money shaped by ${rhythm.meaning}.`,
      insight: `CLARA is now watching income timing so it can protect ${rhythm.planning}.`,
    };
  }

  if (activeKey === "workload") {
    return {
      title: getWorkloadTitle(workload.value, workload.title),
      narrative: `${setup.role} with ${rhythm.rhythm} now has an energy layer: ${workload.energy}.\n\nThis means CLARA should not read spending as only a budget issue. It is also connected to time, fatigue, and recovery.`,
      insight: `CLARA is beginning to detect the risk: ${workload.risk}.`,
    };
  }

  if (activeKey === "pressure") {
    return {
      title: pressure.title,
      narrative: `${workload.energy}, and ${pressure.pressure}.\n\nThe context is evolving toward protection: CLARA should guard ${pressure.protect} before optional spending gets room.`,
      insight: `CLARA is learning that ${pressure.warning}.`,
    };
  }

  if (activeKey === "coping") {
    return {
      title: coping.title,
      narrative: `${pressure.pressure}, while ${workload.energy}.\n\nUnder that pressure, ${coping.response}. CLARA should treat this gently because ${coping.interpretation}.`,
      insight: `Next coaching direction: ${coping.coaching}.`,
    };
  }

  if (activeKey === "goal") {
    return {
      title: goal.title,
      narrative: `The full Working Student picture is clearer now: ${setup.role}, with ${rhythm.rhythm}, where ${workload.energy}, and ${pressure.pressure}.\n\nThe protection direction is to ${goal.direction}.`,
      insight: `CLARA should coach this through one practical lens: ${goal.coaching}.`,
    };
  }

  return null;
}

function buildBoardText(board) {
  return [board.narrative, board.insight].filter(Boolean).join("\n\n");
}

function inferWorkingStudentFromQuestion(key, value) {
  return Boolean(key && WORKING_STUDENT_EVOLUTION[key]?.[value]);
}

function applyEvolvedContext() {
  const modal = getLifeStageModal();
  const header = getContextBoardHeader(modal);
  if (!modal || !header) return;

  const detectedStage = getActiveStage(modal) || state.stage;
  if (detectedStage && detectedStage !== state.stage) {
    state.stage = detectedStage;
    state.selections = { ...WORKING_STUDENT_DEFAULTS };
  }

  const { key, value } = getActiveQuestion(modal);
  if (key && value) state.selections[key] = value;

  if (!state.stage && inferWorkingStudentFromQuestion(key, value)) state.stage = "Working Student";
  if (state.stage !== "Working Student" || !key) return;

  const board = buildEvolvedContext(key);
  if (!board) return;

  const { title, summary } = getBoardTextNodes(header);
  const boardText = buildBoardText(board);
  const signature = `${state.stage}:${key}:${SECTION_ORDER.map((sectionKey) => getSelection(sectionKey)).join("|")}`;

  if (title && cleanText(title.textContent) !== board.title) title.textContent = board.title;

  if (summary && summary.dataset.claraEvolutionSignature !== signature) {
    summary.textContent = boardText;
    summary.dataset.claraEvolutionSignature = signature;
    summary.style.setProperty("white-space", "pre-line", "important");
    summary.style.setProperty("max-height", "220px", "important");
    summary.style.setProperty("overflow-y", "auto", "important");
    summary.style.setProperty("padding-right", "0.25rem", "important");
    summary.style.setProperty("line-height", "1.55", "important");
  }
}

function installLifeStageStatementStack() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_LIFE_STAGE_CONTEXT_EVOLUTION__) return;
  window.__CLARA_LIFE_STAGE_CONTEXT_EVOLUTION__ = true;

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      applyEvolvedContext();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class", "style", "aria-pressed", "data-selected"],
  });

  document.addEventListener("click", () => window.requestAnimationFrame(schedule), true);
  schedule();
}

try {
  installLifeStageStatementStack();
} catch (error) {
  console.warn("CLARA life stage context evolution failed:", error);
}
