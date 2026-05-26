import { getSelectedLifeStageKey, normalizeLifeStageKey, readSelectedLifeStageProfile } from "./life-stage-flow";

const WORKING_STUDENT_STAGE_KEY = "Working Student";

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

function getTextNodes(card) {
  const title = card?.querySelector("h3");
  const body = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { title, body };
}

function setText(node, value) {
  const next = String(value || "");
  if (node && node.textContent !== next) node.textContent = next;
}

function isManualSignalState(card) {
  return clean(card?.dataset?.claraManualSignalSelected) === "true";
}

function clearActiveSignals() {
  document.querySelectorAll("[data-clara-pressure-signal]").forEach((button) => {
    if (button.dataset.active === "true") button.dataset.active = "false";
  });
}

const DEFAULT_STAGE_SUPPORT_COPY = {
  "Young Professional": {
    title: "Your independence is forming.",
    body: "Salary, bills, commute, career pressure, and lifestyle choices can pull from the same paycheck. Tap the signal below that feels closest to your situation, then press the heart for a solution.",
  },
  "Living with Partner": {
    title: "Shared life needs shared clarity.",
    body: "Bills, food, comfort spending, family boundaries, and future plans can sit inside the same relationship rhythm. Tap the signal below that feels closest, then press the heart for a solution.",
  },
  "Family Household": {
    title: "Home support needs structure.",
    body: "Food, bills, requests, shared needs, and personal goals can all pull from the same income. Tap the signal below that feels closest to your situation, then press the heart for a solution.",
  },
  "Single Parent": {
    title: "Your priority is protection.",
    body: "Child needs, essentials, time pressure, emergencies, and your own energy can meet in the same budget. Tap the signal below that feels closest, then press the heart for a solution.",
  },
  "Full-Time Earner": {
    title: "Your salary needs direction.",
    body: "Bills, cutoff timing, fatigue, obligations, and reward spending can quietly stretch stable income. Tap the signal below that feels closest to your situation, then press the heart for a solution.",
  },
  "Freelance Season": {
    title: "Flexible income needs a buffer.",
    body: "Client timing, dry weeks, project pressure, work costs, and rest can all affect the same cash flow. Tap the signal below that feels closest, then press the heart for a solution.",
  },
  "Business Builder": {
    title: "Growth needs boundaries.",
    body: "Sales timing, operating costs, reinvestment, owner pay, and personal stability can pull from the same money. Tap the signal below that feels closest, then press the heart for a solution.",
  },
};

function applyDefaultSupportCard() {
  const stage = getStage();
  const card = findSupportCard();
  const { title, body } = getTextNodes(card);
  if (!stage || stage === WORKING_STUDENT_STAGE_KEY || !card || !title || !body) return false;

  if (isManualSignalState(card)) return false;

  const copy = DEFAULT_STAGE_SUPPORT_COPY[stage];
  if (!copy) return false;

  card.dataset.claraSupportCard = "true";
  card.dataset.claraSignalMode = "idle";
  card.dataset.claraSelectedSignal = "default";
  card.dataset.claraSignalCardActive = "false";
  card.dataset.claraStageDefaultCard = "true";
  delete card.dataset.claraStageAwareSignal;

  clearActiveSignals();
  card.querySelector?.("[data-clara-solution-hint='true']")?.remove?.();

  setText(title, copy.title);
  setText(body, copy.body);
  return true;
}

function markManualSignal(event) {
  const signal = event.target?.closest?.("[data-clara-pressure-signal]");
  const heart = event.target?.closest?.("[data-clara-heart-cta='true']");
  if (!signal && !heart) return;

  const card = findSupportCard();
  if (!card) return;

  if (signal) {
    card.dataset.claraManualSignalSelected = "true";
    card.dataset.claraStageDefaultCard = "false";
    return;
  }

  if (heart && clean(card.dataset.claraSelectedSignal) && clean(card.dataset.claraSelectedSignal) !== "default") {
    card.dataset.claraManualSignalSelected = "true";
    card.dataset.claraStageDefaultCard = "false";
  }
}

function installLifeStageDefaultSupportCardGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_LIFE_STAGE_DEFAULT_SUPPORT_GUARD__) return;
  window.__CLARA_LIFE_STAGE_DEFAULT_SUPPORT_GUARD__ = true;

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      applyDefaultSupportCard();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "data-clara-selected-signal", "data-clara-signal-mode", "data-clara-signal-card-active"] });

  document.addEventListener("click", (event) => {
    markManualSignal(event);
    window.setTimeout(schedule, 160);
  }, true);

  window.addEventListener("clara:life-stage-profile-updated", () => {
    const card = findSupportCard();
    if (card) delete card.dataset.claraManualSignalSelected;
    schedule();
    window.setTimeout(applyDefaultSupportCard, 100);
    window.setTimeout(applyDefaultSupportCard, 220);
  }, { passive: true });

  window.addEventListener("storage", () => {
    const card = findSupportCard();
    if (card) delete card.dataset.claraManualSignalSelected;
    schedule();
  }, { passive: true });

  schedule();
  window.setTimeout(applyDefaultSupportCard, 120);
  window.setTimeout(applyDefaultSupportCard, 350);
}

try {
  installLifeStageDefaultSupportCardGuard();
} catch (error) {
  console.warn("CLARA default support card guard failed:", error);
}
