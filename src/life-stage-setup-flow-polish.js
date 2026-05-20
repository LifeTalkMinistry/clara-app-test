const FLOW_MARKER = "CLARA CONTEXT BOARD";

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

const PROFILE = {
  setup: {
    "Family-supported with some work": {
      title: "Starting to Carry More",
      signal: "Support is still present, but responsibility is beginning to move toward you.",
      identity: "a student moving from support into partial responsibility",
      anchor: "shared support",
    },
    "Self-supporting student": {
      title: "Carrying It Yourself",
      signal: "Your student life already carries adult-level survival pressure.",
      identity: "a student carrying school and daily stability alone",
      anchor: "self-support",
    },
    "Working mainly for school costs": {
      title: "Working for the Future",
      signal: "Work is directly protecting your ability to stay in school.",
      identity: "a student whose income is tied to education continuity",
      anchor: "school protection",
    },
    "Helping family while studying": {
      title: "Studying With Responsibility",
      signal: "Your money reality includes both your future and your family load.",
      identity: "a student balancing education with family responsibility",
      anchor: "shared family pressure",
    },
    "Side hustle / extra-income student": {
      title: "Building Extra Room",
      signal: "You are creating extra room, but the effort also consumes time and energy.",
      identity: "a student building income options while studying",
      anchor: "flexible effort",
    },
  },
  rhythm: {
    "Allowance + work income": {
      title: "Between Support and Effort",
      signal: "Your money now moves between what is given and what you earn.",
      rhythm: "mixed support-and-work income",
      risk: "timing gaps and blurred spending boundaries",
    },
    "Fixed part-time pay": {
      title: "Steadier Ground",
      signal: "Your income has a clearer rhythm, which gives CLARA something stable to plan around.",
      rhythm: "predictable part-time pay",
      risk: "limited margin between payday and real needs",
    },
    "Irregular side hustle income": {
      title: "Uneven Income Days",
      signal: "Your income may change from week to week, so stability depends on buffers.",
      rhythm: "irregular side-hustle income",
      risk: "strong days disappearing before weak days arrive",
    },
    "Project / seasonal income": {
      title: "Income in Waves",
      signal: "Money arrives in waves, so strong periods need to protect quiet ones.",
      rhythm: "wave-based income",
      risk: "treating temporary income as permanent room",
    },
    "Mostly allowance with occasional work": {
      title: "Support With Effort",
      signal: "Allowance is still the base, while occasional work adds breathing room.",
      rhythm: "allowance-led income with earned pockets",
      risk: "extra money getting absorbed before it becomes protection",
    },
  },
  workload: {
    "Manageable class-work load": {
      title: "Still Manageable",
      signal: "Your week still has enough room to build structure before pressure grows.",
      capacity: "manageable energy",
      risk: "habits not being built while life is still steerable",
    },
    "Tight but still controlled": {
      title: "Tight but Steerable",
      signal: "Your week is stretched, but not yet out of control.",
      capacity: "tight but steerable energy",
      risk: "decision fatigue slowly entering spending choices",
    },
    "Heavy school-work overlap": {
      title: "Pressure Is Building",
      signal: "School and work are starting to compete for the same energy.",
      capacity: "overlapping school-work pressure",
      risk: "convenience spending rising when recovery gets squeezed",
    },
    "Little time to rest": {
      title: "Energy Is Getting Thin",
      signal: "Rest is becoming limited, and money decisions may start happening through fatigue.",
      capacity: "low recovery space",
      risk: "quick spending choices replacing intentional ones",
    },
    "Almost no margin / survival mode": {
      title: "Protection First",
      signal: "There is very little room to breathe, so CLARA should stop asking for perfection.",
      capacity: "survival-mode capacity",
      risk: "one small gap affecting school, food, transport, or debt",
    },
  },
  pressure: {
    "Tuition or school costs": {
      title: "School Must Stay Protected",
      signal: "Education costs are becoming the center of protection.",
      priority: "tuition, requirements, and school continuity",
      risk: "falling behind here can disrupt more than the budget",
    },
    "Daily food and transport": {
      title: "Daily Costs Are Heavy",
      signal: "Food and transport are turning into the real pressure point.",
      priority: "daily survival costs before optional spending",
      risk: "small repeated costs quietly draining the week",
    },
    "Work-school schedule conflict": {
      title: "Time Is Colliding",
      signal: "The pressure is not only money. It is time colliding with responsibility.",
      priority: "recovery, schedule stability, and convenience decisions",
      risk: "spending for speed or relief instead of intention",
    },
    "Family contribution": {
      title: "Family Pressure Is Present",
      signal: "Helping others is now part of the financial environment.",
      priority: "supporting family without weakening your own base",
      risk: "giving too much and leaving school needs exposed",
    },
    "Debt or borrowed money": {
      title: "Debt Pressure Is Active",
      signal: "Borrowed money is already part of the pressure map.",
      priority: "debt prevention, repayment rhythm, and breathing room",
      risk: "one tight week repeating into the next",
    },
  },
  coping: {
    "I spend on small rewards to feel okay": {
      title: "Relief Spending Pattern",
      signal: "Small rewards may be acting as emotional recovery after pressure.",
      response: "relief spending",
      direction: "build safer relief before comfort spending reduces breathing room",
    },
    "I avoid checking my money": {
      title: "Money Feels Heavy",
      signal: "Avoiding your balance may be a way to reduce stress in the moment.",
      response: "money avoidance",
      direction: "make money-checking shorter, lighter, and less intimidating",
    },
    "I borrow or delay payments": {
      title: "Delaying to Survive",
      signal: "Pressure may be getting pushed forward so today can be handled first.",
      response: "delayed pressure",
      direction: "spot shortfalls earlier before delay becomes the cycle",
    },
    "I cut my needs too much": {
      title: "Over-Sacrifice Risk",
      signal: "You may be protecting obligations by removing too much from yourself.",
      response: "over-sacrifice",
      direction: "keep food, rest, health, and school basics protected",
    },
    "I ask for help before it gets worse": {
      title: "You Reach Early",
      signal: "You can reach for support before pressure becomes worse.",
      response: "early support-seeking",
      direction: "turn support into a clear plan instead of emergency rescue",
    },
  },
  goal: {
    "Finish school without burning out": {
      title: "Graduate Without Burning Out",
      signal: "The direction is not just to finish school, but to finish without breaking your energy.",
      direction: "protect graduation and recovery together",
    },
    "Avoid debt": {
      title: "Stay Out of Debt",
      signal: "The direction is to prevent borrowed-money pressure before it becomes normal.",
      direction: "build early warning signals before shortfalls become debt",
    },
    "Build savings slowly": {
      title: "Build Slowly but Safely",
      signal: "The direction is gentle consistency, not unrealistic saving pressure.",
      direction: "create small protection without forcing a perfect plan",
    },
    "Help family without losing stability": {
      title: "Help Without Breaking",
      signal: "The direction is to support others without sacrificing your school path.",
      direction: "separate help money from survival and school money",
    },
    "Control stress spending": {
      title: "Protect From Stress Spending",
      signal: "The direction is to understand pressure before it turns into repeated spending.",
      direction: "create relief options that do not damage the budget quietly",
    },
  },
};

const DEFAULTS = {
  setup: "Family-supported with some work",
  rhythm: "Allowance + work income",
  workload: "Manageable class-work load",
  pressure: "Tuition or school costs",
  coping: "I spend on small rewards to feel okay",
  goal: "Finish school without burning out",
};

const PROGRESS_BY_STEP = {
  setup: 1,
  rhythm: 2,
  workload: 3,
  pressure: 4,
  coping: 5,
  goal: 5,
};

const state = { ...DEFAULTS };

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const loud = (value) => clean(value).toUpperCase();

function isVisible(node) {
  return !!node && !!(node.offsetWidth || node.offsetHeight || node.getClientRects?.().length);
}

function getStepMeta(text) {
  return STEP_META[loud(text)] || null;
}

function getProfile(key) {
  return PROFILE[key]?.[state[key]] || PROFILE[key]?.[DEFAULTS[key]] || {};
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

function findProgressDots(header) {
  const groups = Array.from(header?.querySelectorAll("div") || []);
  const progressGroup = groups.find((group) => {
    const children = Array.from(group.children || []);
    return children.length >= 5 && children.every((child) => String(child.className || "").includes("rounded-full"));
  });
  return Array.from(progressGroup?.children || []);
}

function updateProgressDots(header, activeKey) {
  const dots = findProgressDots(header);
  const activeCount = PROGRESS_BY_STEP[activeKey] || 1;
  if (!dots.length) return;

  dots.forEach((dot, index) => {
    const active = index < activeCount;
    dot.style.setProperty("width", active ? "2.8rem" : "2.35rem", "important");
    dot.style.setProperty("height", "0.25rem", "important");
    dot.style.setProperty("border-radius", "9999px", "important");
    dot.style.setProperty("background", active ? "rgb(165 243 252)" : "rgba(255, 255, 255, 0.12)", "important");
    dot.style.setProperty("box-shadow", active ? "0 0 18px rgba(125, 211, 252, 0.34)" : "none", "important");
    dot.style.setProperty("opacity", "1", "important");
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

function buildBoard(activeKey) {
  const setup = getProfile("setup");
  const rhythm = getProfile("rhythm");
  const workload = getProfile("workload");
  const pressure = getProfile("pressure");
  const coping = getProfile("coping");
  const goal = getProfile("goal");

  if (activeKey === "setup") {
    return {
      title: setup.title,
      summary: `${setup.signal}\n\nCLARA is locating the first pressure line: where support ends, responsibility begins, and money starts affecting your student life.`,
    };
  }

  if (activeKey === "rhythm") {
    return {
      title: rhythm.title,
      summary: `${rhythm.signal}\n\nThis rewrites the first picture: you are not just ${setup.identity}; your stability now depends on how well ${rhythm.rhythm} can survive ${rhythm.risk}.`,
    };
  }

  if (activeKey === "workload") {
    return {
      title: workload.title,
      summary: `${workload.signal}\n\nCLARA now reads the same money rhythm through capacity. With ${rhythm.rhythm}, the hidden watch point becomes ${workload.risk}.`,
    };
  }

  if (activeKey === "pressure") {
    return {
      title: pressure.title,
      summary: `${pressure.signal}\n\nBecause your profile shows ${setup.anchor}, ${rhythm.rhythm}, and ${workload.capacity}, CLARA should protect ${pressure.priority} before anything else gets room.`,
    };
  }

  if (activeKey === "coping") {
    return {
      title: coping.title,
      summary: `${coping.signal}\n\nThis changes the reading from budget math to behavior. With ${pressure.priority} already under pressure, CLARA should help you ${coping.direction}.`,
    };
  }

  if (activeKey === "goal") {
    return {
      title: goal.title,
      summary: `${goal.signal}\n\nFinal direction: CLARA should help you ${goal.direction}, while respecting your ${rhythm.rhythm}, ${workload.capacity}, and ${coping.response}.`,
    };
  }

  return null;
}

function polishContextBoard() {
  const active = findActiveQuestionSection();
  const { header, summary, title } = findStageBoard();
  if (!active || !header || !summary || !title) return;

  const selectedValue = getSelectedOption(active.section);
  if (selectedValue) state[active.meta.key] = selectedValue;

  const board = buildBoard(active.meta.key);
  if (!board) return;

  const signature = `${active.meta.key}:${Object.values(state).join("|")}`;

  updateProgressDots(header, active.meta.key);

  if (title.dataset.claraBoardSignature !== signature) {
    title.textContent = board.title;
    title.dataset.claraBoardSignature = signature;
  }
  if (summary.dataset.claraBoardSignature !== signature) {
    summary.textContent = board.summary;
    summary.dataset.claraBoardSignature = signature;
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
      window.requestAnimationFrame(() => {
        scheduled = false;
        polishFlow();
      });
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
