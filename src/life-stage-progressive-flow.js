const LIFE_STAGE_MODAL_SELECTOR =
  "#root div[class*='fixed'][class*='inset-y-0'][class*='left-1/2'][class*='z-[9999]']";

const progressiveState = {
  screen: "",
  phase: 0,
};

const HUMAN_CONTEXT_TERMS = {
  "support system present": "you still have support while also working",
  "independent survival load": "you are carrying more of your own expenses",
  "family-linked responsibility": "family responsibility is part of your student life",
  "work-school adjustment": "you are still adjusting to the work-school rhythm",
  "flexible income behavior": "your income depends on flexible work",
  "mixed income support": "money comes from both support and work",
  "predictable earning base": "your pay rhythm is relatively predictable",
  "income instability detected": "income can change from week to week",
  "wave-based cash flow": "money arrives in waves instead of evenly",
  "allowance-led stability": "allowance still gives you a small base",
  "control still available": "your routine still has room for control",
  "early strain forming": "your routine is starting to feel tight",
  "high schedule overlap": "work, school, and personal needs are overlapping",
  "recovery capacity low": "there is very little room to recover",
  "education-cost pressure": "school costs are carrying the main pressure",
  "daily-cost drain": "daily food and transport can quietly drain the week",
  "energy-trigger spending risk": "low energy can trigger convenience or relief spending",
  "shared financial pressure": "family support is part of the money pressure",
  "debt-cycle risk": "borrowed money can create pressure across weeks",
  "stress-reward spending": "small rewards may be acting as stress relief",
  "money-avoidance pattern": "checking money may feel emotionally heavy",
  "delayed-pressure cycle": "survival choices may be pushing pressure into the future",
  "over-sacrifice risk": "you may be cutting back even on needs",
  "support-seeking habit": "you know how to reach for support when pressure rises",
  "graduation protection": "finishing school safely is the main protection goal",
  "debt prevention priority": "avoiding new debt pressure is the main protection goal",
  "slow-savings priority": "building a small buffer is the main protection goal",
  "wise family support": "helping family without losing stability is the main protection goal",
  "stress-spending control": "controlling stress spending is the main protection goal",
};

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function humanizeTerm(value) {
  const cleaned = cleanText(value).replace(/[.!?]+$/, "").toLowerCase();
  return HUMAN_CONTEXT_TERMS[cleaned] || cleaned;
}

function splitHumanTerms(value) {
  return String(value || "")
    .split(/,\s+and\s+|,\s+|\s+and\s+/)
    .map(humanizeTerm)
    .filter(Boolean);
}

function joinHumanTerms(items) {
  const filtered = items.filter(Boolean);
  if (filtered.length <= 1) return filtered[0] || "";
  if (filtered.length === 2) return `${filtered[0]} and ${filtered[1]}`;
  return `${filtered.slice(0, -1).join(", ")}, and ${filtered[filtered.length - 1]}`;
}

function humanizeContextCopy(value) {
  let next = cleanText(value);

  next = next.replace(
    /This becomes the starting environment CLARA will use before reading your income rhythm, weekly load, pressure, and spending response\./,
    "CLARA will use this as the base of your profile, then read your income rhythm, weekly load, pressure, and spending response against this starting environment."
  );

  next = next.replace(
    /Because your setup already suggests ([^,.]+), this rhythm tells CLARA whether your support system is stable, stretched, or vulnerable to timing gaps\./,
    (_, setup) =>
      `Because ${humanizeTerm(setup)}, CLARA reads this income rhythm as more than a payment schedule—it shows whether your week is financially steady or vulnerable to timing gaps.`
  );

  next = next.replace(
    /With (.*?) and (.*?) already in the profile, CLARA now treats your energy level as part of the money pattern, not a separate issue\./,
    (_, setup, rhythm) =>
      `Because ${humanizeTerm(setup)} and ${humanizeTerm(rhythm)}, CLARA reads your energy level as part of your money behavior—not as a separate issue.`
  );

  next = next.replace(
    /Since your profile already shows (.*?), (.*?), and (.*?), this pressure becomes the first area CLARA should protect in your budget\./,
    (_, setup, rhythm, workload) =>
      `Because ${humanizeTerm(setup)}, ${humanizeTerm(rhythm)}, and ${humanizeTerm(workload)}, this pressure is likely the first area your budget needs to protect.`
  );

  next = next.replace(
    /Connected with (.*?) and (.*?), CLARA can now tell whether spending is a pressure response instead of just a normal expense choice\./,
    (_, workload, pressure) =>
      `Because ${humanizeTerm(workload)} and ${humanizeTerm(pressure)}, CLARA checks whether this spending is really relief, avoidance, or survival pressure—not just a normal expense.`
  );

  next = next.replace(
    /Based on (.*?), CLARA now has enough context to turn this into a protection plan instead of a generic student profile\./,
    (_, rawList) =>
      `Because ${joinHumanTerms(splitHumanTerms(rawList))}, CLARA can shape a protection plan around your real student life instead of treating you like a generic budget user.`
  );

  return next;
}

function getLifeStageModal() {
  if (typeof document === "undefined") return null;
  return document.querySelector(LIFE_STAGE_MODAL_SELECTOR);
}

function scrollLifeStageMainToTop(modal) {
  const main = modal?.querySelector("main");
  if (!main) return;
  main.scrollTop = 0;
  try {
    main.scrollTo({ top: 0, left: 0, behavior: "instant" });
  } catch {
    main.scrollTo?.(0, 0);
  }
}

function getCurrentSetupScreen(modal) {
  const title = cleanText(modal?.querySelector("header h3")?.textContent).toLowerCase();

  if (title.includes("shape the environment")) return "environment";
  if (title.includes("set your focus")) return "focus";
  if (title) return "stage";
  return "";
}

function getProgressivePanel(modal) {
  const sections = Array.from(modal?.querySelectorAll("main section") || []);
  const panel = sections.find((section) =>
    String(section.className || "").includes("space-y-5")
  );

  if (!panel) return { panel: null, groups: [] };

  const groups = Array.from(panel.children || []).filter((child) => {
    const label = cleanText(child.querySelector("p")?.textContent);
    return Boolean(label && child.querySelector("button"));
  });

  return { panel, groups };
}

function getFooterButtons(modal) {
  const buttons = Array.from(modal?.querySelectorAll("footer button") || []);
  return {
    backButton: buttons[0] || null,
    primaryButton: buttons[1] || null,
  };
}

function resetProgressiveMarkup(modal) {
  const markedNodes = Array.from(
    modal?.querySelectorAll(
      "[data-clara-progressive-flow], [data-clara-progressive-phase], [data-clara-progressive-screen], [data-clara-progressive-group], [data-clara-progressive-visible]"
    ) || []
  );

  markedNodes.forEach((node) => {
    node.removeAttribute("data-clara-progressive-flow");
    node.removeAttribute("data-clara-progressive-phase");
    node.removeAttribute("data-clara-progressive-screen");
    node.removeAttribute("data-clara-progressive-group");
    node.removeAttribute("data-clara-progressive-visible");
    node.style.removeProperty("display");
  });
}

function setGroupVisibility(group, visible) {
  if (!group) return;
  group.dataset.claraProgressiveVisible = visible ? "true" : "false";
  group.style.setProperty("display", visible ? "block" : "none", "important");
}

function getProgressDots(modal) {
  const header = modal?.querySelector("header");
  const progressWrap = Array.from(header?.children || []).find((child) => {
    const dots = Array.from(child.children || []);
    return dots.length >= 3 && dots.every((dot) => String(dot.className || "").includes("rounded-full"));
  });

  return Array.from(progressWrap?.children || []);
}

function getActiveProgressCount(screen) {
  if (screen === "stage") return 1;
  if (screen === "environment") return progressiveState.phase === 1 ? 3 : 2;
  if (screen === "focus") return progressiveState.phase === 1 ? 5 : 4;
  return 0;
}

function applyProgressDots(modal, screen) {
  const dots = getProgressDots(modal);
  if (!dots.length) return;

  const activeCount = getActiveProgressCount(screen);

  dots.forEach((dot, index) => {
    const active = index < activeCount;
    dot.style.setProperty("width", active ? "3rem" : "2.5rem", "important");
    dot.style.setProperty("background", active ? "rgb(165 243 252)" : "rgba(255, 255, 255, 0.085)", "important");
    dot.style.setProperty("box-shadow", active ? "0 0 18px rgba(125, 211, 252, 0.34)" : "none", "important");
    dot.style.setProperty("opacity", "1", "important");
  });
}

function applyProgressiveFlow() {
  const modal = getLifeStageModal();
  if (!modal) return;

  const screen = getCurrentSetupScreen(modal);

  if (progressiveState.screen !== screen) {
    progressiveState.screen = screen;
    progressiveState.phase = 0;
    resetProgressiveMarkup(modal);
    window.requestAnimationFrame(() => scrollLifeStageMainToTop(modal));
  }

  applyProgressDots(modal, screen);

  const { panel, groups } = getProgressivePanel(modal);

  if (!panel || !["environment", "focus"].includes(screen) || groups.length < 2) {
    if (!["environment", "focus"].includes(screen)) resetProgressiveMarkup(modal);
    return;
  }

  const [firstGroup, secondGroup] = groups;
  const isSecondPhase = progressiveState.phase === 1;

  panel.dataset.claraProgressiveFlow = "true";
  panel.dataset.claraProgressivePhase = isSecondPhase ? "second" : "first";
  panel.dataset.claraProgressiveScreen = screen;

  firstGroup.dataset.claraProgressiveGroup = "first";
  secondGroup.dataset.claraProgressiveGroup = "second";

  setGroupVisibility(firstGroup, !isSecondPhase);
  setGroupVisibility(secondGroup, isSecondPhase);
}

function handleProgressiveClick(event) {
  const modal = getLifeStageModal();
  if (!modal) return;

  const screen = getCurrentSetupScreen(modal);
  if (!["environment", "focus"].includes(screen)) return;

  const { panel, groups } = getProgressivePanel(modal);
  if (!panel || groups.length < 2) return;

  const { backButton, primaryButton } = getFooterButtons(modal);
  const target = event.target?.closest?.("button");
  if (!target) return;

  if (target === primaryButton && progressiveState.phase === 0) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    progressiveState.phase = 1;
    window.requestAnimationFrame(() => {
      scrollLifeStageMainToTop(modal);
      applyProgressiveFlow();
    });
    return;
  }

  if (target === backButton && progressiveState.phase === 1) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    progressiveState.phase = 0;
    window.requestAnimationFrame(() => {
      scrollLifeStageMainToTop(modal);
      applyProgressiveFlow();
    });
  }
}

function getContextBoardHeader(modal) {
  const header = modal?.querySelector("header");
  if (!header) return null;

  const eyebrow = cleanText(header.querySelector("p")?.textContent).toLowerCase();
  return eyebrow.includes("clara context board") ? header : null;
}

function polishContextBoard() {
  const modal = getLifeStageModal();
  const header = getContextBoardHeader(modal);
  if (!header) return;

  const paragraphs = Array.from(header.querySelectorAll("p") || []);
  const boardCopy = paragraphs.find((paragraph) => {
    const text = cleanText(paragraph.textContent);
    return text.startsWith("CLARA sees") || text.startsWith("CLARA will");
  });

  if (boardCopy) {
    const current = cleanText(boardCopy.textContent);
    const next = humanizeContextCopy(current);
    if (next && next !== current) boardCopy.textContent = next;
  }

  const chipWrap = Array.from(header.querySelectorAll("div") || []).find((node) => {
    const chips = Array.from(node.children || []);
    return chips.length > 0 && chips.every((child) => child.tagName === "SPAN");
  });

  if (chipWrap) {
    chipWrap.style.setProperty("display", "none", "important");
  }
}

function installLifeStageProgressiveFlow() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_LIFE_STAGE_PROGRESSIVE_FLOW__) return;
  window.__CLARA_LIFE_STAGE_PROGRESSIVE_FLOW__ = true;

  document.addEventListener("click", handleProgressiveClick, true);

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(() => {
      applyProgressiveFlow();
      polishContextBoard();
    });
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.requestAnimationFrame(() => {
    applyProgressiveFlow();
    polishContextBoard();
  });
}

try {
  installLifeStageProgressiveFlow();
} catch (error) {
  console.warn("CLARA life stage progressive flow failed:", error);
}
