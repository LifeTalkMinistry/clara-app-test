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

function setButtonText(button, text) {
  if (!button || cleanText(button.textContent) === text) return;
  button.textContent = text;
}

function applyProgressiveFlow() {
  const modal = getLifeStageModal();
  if (!modal) return;

  const screen = getCurrentSetupScreen(modal);
  const { panel, groups } = getProgressivePanel(modal);

  if (!panel || !["environment", "focus"].includes(screen) || groups.length < 2) {
    progressiveState.screen = screen;
    progressiveState.phase = 0;
    return;
  }

  if (progressiveState.screen !== screen) {
    progressiveState.screen = screen;
    progressiveState.phase = 0;
  }

  const [firstGroup, secondGroup] = groups;
  const isSecondPhase = progressiveState.phase === 1;

  panel.dataset.claraProgressiveFlow = "true";
  panel.dataset.claraProgressivePhase = isSecondPhase ? "second" : "first";
  panel.dataset.claraProgressiveScreen = screen;

  firstGroup.dataset.claraProgressiveGroup = "first";
  secondGroup.dataset.claraProgressiveGroup = "second";

  firstGroup.style.display = isSecondPhase ? "none" : "block";
  secondGroup.style.display = isSecondPhase ? "block" : "none";

  const { primaryButton } = getFooterButtons(modal);

  if (!isSecondPhase) {
    setButtonText(primaryButton, "Next");
    return;
  }

  if (screen === "environment") {
    setButtonText(primaryButton, "Continue");
  } else {
    setButtonText(primaryButton, "✓ Apply stage");
  }
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
    window.requestAnimationFrame(applyProgressiveFlow);
    return;
  }

  if (target === backButton && progressiveState.phase === 1) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    progressiveState.phase = 0;
    window.requestAnimationFrame(applyProgressiveFlow);
  }
}

function installLifeStageProgressiveFlow() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_LIFE_STAGE_PROGRESSIVE_FLOW__) return;
  window.__CLARA_LIFE_STAGE_PROGRESSIVE_FLOW__ = true;

  document.addEventListener("click", handleProgressiveClick, true);

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(applyProgressiveFlow);
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.requestAnimationFrame(applyProgressiveFlow);
}

try {
  installLifeStageProgressiveFlow();
} catch (error) {
  console.warn("CLARA life stage progressive flow failed:", error);
}
