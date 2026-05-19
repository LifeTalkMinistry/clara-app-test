const LIFE_STAGE_MODAL_SELECTOR =
  "#root div[class*='fixed'][class*='inset-y-0'][class*='left-1/2'][class*='z-[9999]']";

const progressiveState = {
  screen: "",
  phase: 0,
};

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
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
  const boardCopy = paragraphs.find((paragraph) =>
    cleanText(paragraph.textContent).includes("CLARA is connecting")
  );

  if (boardCopy) {
    boardCopy.textContent = boardCopy.textContent.replace(
      /\s*CLARA is connecting .*? to form the full context\./,
      " Together, these details are shaping a clearer picture of your pressure, rhythm, and protection needs."
    );
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
