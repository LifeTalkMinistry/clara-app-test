import { getSelectedLifeStageKey, normalizeLifeStageKey, readSelectedLifeStageProfile } from "./life-stage-flow";

const WORKING_STUDENT_STAGE_KEY = "Working Student";
let lastStageKey = "";
let lastManualSignal = null;

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

function clearActiveSignals() {
  document.querySelectorAll("[data-clara-pressure-signal]").forEach((button) => {
    button.dataset.active = "false";
  });
}

function clearSupportSignalState(card) {
  if (!card) return;
  card.dataset.claraSignalMode = "idle";
  card.dataset.claraSelectedSignal = "default";
  card.dataset.claraSignalCardActive = "false";
  card.dataset.claraStageDefaultCard = "true";
  card.dataset.claraManualSignalSelected = "false";
  delete card.dataset.claraStageAwareSignal;
  card.querySelector?.("[data-clara-solution-hint='true']")?.remove?.();
  clearActiveSignals();
}

const DEFAULT_STAGE_SUPPORT_COPY = {
  "Young Professional": {
    title: "Your independence is forming.",
    body: "Salary, bills, commute, career pressure, and lifestyle choices can pull from the same paycheck. Tap the signal below that feels closest to your situation, then press the heart for a solution.",
  },
  "Living with Partner": {
    title: "Shared life needs shared clarity.",
    body: "Many couples quietly manage rent, food, fairness, family pressure, and future plans at the same time. Tap the signal below that feels closest to your situation, then press the heart for a solution.",
  },
  "Family Household": {
    title: "Home support needs structure.",
    body: "Many family households quietly manage home bills, shared needs, support requests, personal boundaries, and family expectations at the same time. Tap the signal below that feels closest to your situation, then press the heart for a solution.",
  },
  "Single Parent": {
    title: "Your priority is protection.",
    body: "Many single parents quietly manage child needs, essentials, time pressure, emergencies, emotional energy, and future protection at the same time. Tap the signal below that feels closest to your situation, then press the heart for a solution.",
  },
  "Full-Time Earner": {
    title: "Your salary needs direction.",
    body: "Many full-time earners quietly manage salary cycles, bills, fatigue, obligations, lifestyle creep, and future goals at the same time. Tap the signal below that feels closest to your situation, then press the heart for a solution.",
  },
  "Freelance Season": {
    title: "Flexible income needs a buffer.",
    body: "Many freelancers quietly manage irregular income, client timing, dry weeks, project pressure, work costs, rest, and cash-flow buffers at the same time. Tap the signal below that feels closest to your situation, then press the heart for a solution.",
  },
  "Business Builder": {
    title: "Growth needs boundaries.",
    body: "Sales timing, operating costs, reinvestment, owner pay, and personal stability can pull from the same money. Tap the signal below that feels closest, then press the heart for a solution.",
  },
};

function isFreshManualSignalForStage(stage) {
  return !!lastManualSignal
    && lastManualSignal.stage === stage
    && Date.now() - lastManualSignal.at < 1000 * 60 * 30;
}

function hasWorkingStudentLeak(card) {
  const text = clean(card?.textContent).toLowerCase();
  return text.includes("many working students")
    || text.includes("school, commute, tiredness")
    || text.includes("your effort has direction")
    || text.includes("work pressure can affect spending");
}

function applyDefaultSupportCard({ force = false } = {}) {
  const stage = getStage();
  const card = findSupportCard();
  const { title, body } = getTextNodes(card);
  if (!stage || stage === WORKING_STUDENT_STAGE_KEY || !card || !title || !body) return false;

  const copy = DEFAULT_STAGE_SUPPORT_COPY[stage];
  if (!copy) return false;

  const stageChanged = stage !== lastStageKey;
  if (stageChanged) {
    lastStageKey = stage;
    lastManualSignal = null;
    clearSupportSignalState(card);
  }

  const shouldKeepManualSignal = isFreshManualSignalForStage(stage) && !force && !hasWorkingStudentLeak(card);
  if (shouldKeepManualSignal) return false;

  card.dataset.claraSupportCard = "true";
  card.dataset.claraSignalStage = stage;
  clearSupportSignalState(card);

  setText(title, copy.title);
  setText(body, copy.body);
  return true;
}

function markManualSignal(event) {
  const stage = getStage();
  const signal = event.target?.closest?.("[data-clara-pressure-signal]");
  const heart = event.target?.closest?.("[data-clara-heart-cta='true']");
  if (!signal && !heart) return;

  const card = findSupportCard();
  if (!card || stage === WORKING_STUDENT_STAGE_KEY) return;

  if (signal) {
    lastManualSignal = {
      stage,
      signalId: clean(signal.dataset.claraPressureSignal),
      at: Date.now(),
    };
    card.dataset.claraManualSignalSelected = "true";
    card.dataset.claraStageDefaultCard = "false";
    return;
  }

  if (heart && isFreshManualSignalForStage(stage)) {
    card.dataset.claraManualSignalSelected = "true";
    card.dataset.claraStageDefaultCard = "false";
  }
}

function installLifeStageDefaultSupportCardGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_LIFE_STAGE_DEFAULT_SUPPORT_GUARD__) return;
  window.__CLARA_LIFE_STAGE_DEFAULT_SUPPORT_GUARD__ = true;

  let scheduled = false;
  const schedule = (options = {}) => {
    if (scheduled && !options.force) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      applyDefaultSupportCard(options);
    });
  };

  const observer = new MutationObserver(() => schedule());
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true, attributeFilter: ["class", "style", "data-clara-selected-signal", "data-clara-signal-mode", "data-clara-signal-card-active", "data-active"] });

  document.addEventListener("click", (event) => {
    markManualSignal(event);
    window.setTimeout(() => schedule(), 160);
  }, true);

  const resetStage = () => {
    lastManualSignal = null;
    const card = findSupportCard();
    if (card) clearSupportSignalState(card);
    schedule({ force: true });
    window.setTimeout(() => applyDefaultSupportCard({ force: true }), 80);
    window.setTimeout(() => applyDefaultSupportCard({ force: true }), 180);
    window.setTimeout(() => applyDefaultSupportCard({ force: true }), 420);
    window.setTimeout(() => applyDefaultSupportCard({ force: true }), 900);
  };

  window.addEventListener("clara:life-stage-profile-updated", resetStage, { passive: true });
  window.addEventListener("storage", resetStage, { passive: true });

  schedule({ force: true });
  window.setTimeout(() => applyDefaultSupportCard({ force: true }), 120);
  window.setTimeout(() => applyDefaultSupportCard({ force: true }), 350);
  window.setTimeout(() => applyDefaultSupportCard({ force: true }), 850);
}

try {
  installLifeStageDefaultSupportCardGuard();
} catch (error) {
  console.warn("CLARA default support card guard failed:", error);
}
