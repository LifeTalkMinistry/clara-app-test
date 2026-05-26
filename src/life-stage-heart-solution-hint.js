import { getSelectedLifeStageKey, normalizeLifeStageKey, readSelectedLifeStageProfile } from "./life-stage-flow";

let lastManualSignalClick = null;

const SOLUTION_HINT_TEXTS = new Set(["Tap for solution", "Solution shown", "Reveal guidance", "Guidance ready"]);

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getStage() {
  const profile = readSelectedLifeStageProfile?.() || {};
  return normalizeLifeStageKey(profile.stage || getSelectedLifeStageKey());
}

function findLifeStageHero() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h2")?.textContent);
    return heading && section.querySelector("p")?.textContent?.toLowerCase?.().includes("your life stage");
  });
}

function findSupportCard() {
  const hero = findLifeStageHero();
  if (!hero) return null;

  let current = hero.nextElementSibling;
  while (current) {
    if (current.matches?.("[data-clara-pressure-signals='true']")) {
      current = current.nextElementSibling;
      continue;
    }
    if (clean(current.querySelector?.("h3")?.textContent) || current.querySelector?.("svg")) return current;
    current = current.nextElementSibling;
  }
  return null;
}

function findHeart(card) {
  return card?.querySelector?.("[data-clara-heart-cta='true']")
    || card?.querySelector?.("svg")?.closest?.("button,[role='button'],div");
}

function removeHint(card) {
  card?.querySelectorAll?.("[data-clara-solution-hint='true']")?.forEach((hint) => hint.remove?.());
}

function removeDuplicateHints(card, keepHint) {
  card?.querySelectorAll?.("[data-clara-solution-hint='true']")?.forEach((hint) => {
    if (hint !== keepHint) hint.remove?.();
  });
}

function removeEmbeddedSolutionLabels(heart) {
  if (!heart) return;

  heart.querySelectorAll?.("[data-clara-solution-hint='true']")?.forEach((hint) => hint.remove?.());

  Array.from(heart.querySelectorAll?.("span,strong,small,em,b,i") || []).forEach((node) => {
    if (node.querySelector?.("svg")) return;
    if (SOLUTION_HINT_TEXTS.has(clean(node.textContent))) node.remove?.();
  });
}

function getSelectedSignal(card) {
  return clean(card?.dataset?.claraSelectedSignal)
    || clean(document.querySelector("[data-clara-pressure-signal][data-active='true']")?.dataset?.claraPressureSignal);
}

function hasManualSignalSelection(card) {
  const stage = getStage();
  const selectedSignal = getSelectedSignal(card);
  return !!lastManualSignalClick
    && lastManualSignalClick.stage === stage
    && selectedSignal
    && selectedSignal !== "default"
    && lastManualSignalClick.signalId === selectedSignal;
}

function ensureStyles() {
  if (document.getElementById("clara-life-stage-heart-solution-hint-styles")) return;
  const style = document.createElement("style");
  style.id = "clara-life-stage-heart-solution-hint-styles";
  style.textContent = `
    #root [data-clara-support-card="true"] {
      position: relative !important;
    }

    #root [data-clara-solution-hint="true"] {
      position: absolute !important;
      right: clamp(19px, 6.4vw, 29px) !important;
      top: clamp(15px, 2svh, 21px) !important;
      z-index: 12 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: auto !important;
      max-width: 106px !important;
      min-height: 17px !important;
      padding: 3px 8px !important;
      border-radius: 999px !important;
      border: 1px solid rgba(255, 255, 255, 0.14) !important;
      background:
        radial-gradient(circle at 20% 0%, rgba(125, 211, 252, 0.24), transparent 42%),
        linear-gradient(135deg, rgba(124, 58, 237, 0.42), rgba(15, 23, 42, 0.50)) !important;
      color: rgba(248, 253, 255, 0.88) !important;
      font-family: inherit !important;
      font-size: 7.2px !important;
      line-height: 1 !important;
      font-weight: 900 !important;
      letter-spacing: 0.035em !important;
      text-transform: none !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      pointer-events: none !important;
      user-select: none !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.16),
        0 8px 20px rgba(0, 0, 0, 0.22),
        0 0 18px rgba(168, 85, 247, 0.16) !important;
      backdrop-filter: blur(14px) saturate(1.14) !important;
      -webkit-backdrop-filter: blur(14px) saturate(1.14) !important;
    }

    #root [data-clara-support-card="true"][data-clara-signal-mode="guidance"] [data-clara-solution-hint="true"] {
      color: rgba(165, 243, 252, 0.92) !important;
      border-color: rgba(125, 211, 252, 0.22) !important;
      background:
        radial-gradient(circle at 20% 0%, rgba(34, 211, 238, 0.22), transparent 42%),
        linear-gradient(135deg, rgba(14, 165, 233, 0.34), rgba(79, 70, 229, 0.34)) !important;
    }

    #root [data-clara-support-card="true"] [data-clara-heart-cta="true"] {
      position: relative !important;
      z-index: 11 !important;
    }

    #root [data-clara-support-card="true"] [data-clara-heart-cta="true"]::after {
      content: none !important;
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

function ensureHint() {
  ensureStyles();

  const stage = getStage();
  const card = findSupportCard();
  const heart = findHeart(card);
  if (!stage || !card || !heart) return;

  card.dataset.claraSupportCard = "true";
  heart.dataset.claraHeartCta = "true";
  heart.setAttribute("role", "button");
  heart.setAttribute("tabindex", "0");
  heart.setAttribute("aria-label", "Show guidance for selected signal");
  removeEmbeddedSolutionLabels(heart);

  if (!hasManualSignalSelection(card)) {
    removeHint(card);
    return;
  }

  let hint = card.querySelector("[data-clara-solution-hint='true']");
  if (!hint) {
    hint = document.createElement("span");
    hint.dataset.claraSolutionHint = "true";
    hint.setAttribute("aria-hidden", "true");
    card.appendChild(hint);
  }

  removeDuplicateHints(card, hint);

  const mode = clean(card.dataset.claraSignalMode) === "guidance" ? "guidance" : "awareness";
  const nextText = mode === "guidance" ? "Guidance ready" : "Reveal guidance";
  if (hint.textContent !== nextText) hint.textContent = nextText;
}

function installLifeStageHeartSolutionHint() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_LIFE_STAGE_HEART_SOLUTION_HINT__) return;
  window.__CLARA_LIFE_STAGE_HEART_SOLUTION_HINT__ = true;

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      ensureHint();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "data-clara-signal-mode", "data-clara-selected-signal", "data-clara-signal-card-active", "data-active"] });

  document.addEventListener("click", (event) => {
    const signal = event.target?.closest?.("[data-clara-pressure-signal]");
    if (signal) {
      lastManualSignalClick = {
        stage: getStage(),
        signalId: clean(signal.dataset.claraPressureSignal),
      };
    }
    schedule();
    window.setTimeout(ensureHint, 80);
    window.setTimeout(ensureHint, 180);
  }, true);

  window.addEventListener("clara:life-stage-profile-updated", () => {
    lastManualSignalClick = null;
    schedule();
  }, { passive: true });
  window.addEventListener("storage", () => {
    lastManualSignalClick = null;
    schedule();
  }, { passive: true });
  schedule();
}

try {
  installLifeStageHeartSolutionHint();
} catch (error) {
  console.warn("CLARA life stage heart solution hint failed:", error);
}
