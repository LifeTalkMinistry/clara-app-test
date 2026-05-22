const DIAGNOSIS_ID = "clara-life-stage-diagnosis-reveal";

const REACTION_LABELS = {
  opening: "Oh… I see. Show me more.",
  chips: "Hmm… that makes sense.",
  rhythm: "Okay… why does this matter?",
  trigger: "So that’s the pattern.",
  meter: "Okay, let’s protect it.",
  final: "Take me to my Me page",
};

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getActiveStory(root) {
  return root?.querySelector(".story-card[data-kind]") || null;
}

function getActiveKind(root) {
  return clean(getActiveStory(root)?.getAttribute("data-kind"));
}

function applyReactionButton(root) {
  if (!root) return;

  const nextButton = root.querySelector(".next-button");
  if (!nextButton) return;

  const kind = getActiveKind(root);
  const label = REACTION_LABELS[kind] || "Okay CLARA, continue.";

  if (nextButton.textContent !== label) {
    nextButton.textContent = label;
  }

  nextButton.dataset.claraReactionButton = "true";
  nextButton.setAttribute("aria-label", label);
}

function enhanceRoot(root) {
  if (!root) return;

  applyReactionButton(root);

  if (root.dataset.claraReactionButtonsMounted === "true") return;
  root.dataset.claraReactionButtonsMounted = "true";

  const observer = new MutationObserver(() => applyReactionButton(root));
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-kind", "style"],
  });
}

function installLifeStageStoryReactionButtons() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_LIFE_STAGE_REACTION_BUTTONS__) return;
  window.__CLARA_LIFE_STAGE_REACTION_BUTTONS__ = true;

  const ensure = () => enhanceRoot(document.getElementById(DIAGNOSIS_ID));

  const observer = new MutationObserver(ensure);
  observer.observe(document.body, { childList: true, subtree: true });

  window.requestAnimationFrame(ensure);
}

try {
  installLifeStageStoryReactionButtons();
} catch (error) {
  console.warn("CLARA life snapshot reaction buttons failed:", error);
}
