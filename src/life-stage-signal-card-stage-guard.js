import { getLifeStageGuidance } from "./life-stage-guidance";
import { getSelectedLifeStageKey, normalizeLifeStageKey, readSelectedLifeStageProfile } from "./life-stage-flow";

const WORKING_STUDENT_STAGE_KEY = "Working Student";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getProfile() {
  return readSelectedLifeStageProfile?.() || {};
}

function getStage() {
  const profile = getProfile();
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

function genericSignalCopy(stage, signalId, mode) {
  const guidance = mode === "guidance";

  const copy = {
    "Family Household": {
      pressure: ["Home pressure is active.", "Food, bills, requests, and shared needs can quickly reshape the month when family responsibility is part of the budget."],
      stability: ["Support needs a stable base.", "Helping at home becomes safer when your own food, bills, and personal buffer are not disappearing in the process."],
      energy: ["Family responsibility can drain energy.", "Carrying home needs can make money decisions feel emotional, especially when rest and boundaries are already thin."],
      growth: ["Your goals still need space.", "Home support matters, but personal progress also needs a protected place so everything does not become sacrifice."],
      boundaries: ["Boundaries protect support.", "A clear limit can make helping more sustainable instead of letting every request become a full-budget emergency."],
    },
    "Single Parent": {
      pressure: ["Essentials are carrying weight.", "Food, school, health, transport, and child needs can make the budget feel sensitive because every decision touches stability."],
      stability: ["Safety matters first.", "A small buffer can matter deeply when one surprise expense can affect the whole household rhythm."],
      energy: ["Care is using energy too.", "Parenting, work, and planning can make money decisions heavier when there is very little space to reset."],
      growth: ["The future is part of today.", "Child stability and future plans often sit inside the same daily choices, even when the budget is tight."],
      boundaries: ["Your needs still count.", "Protecting your own food, rest, and stability is not separate from protecting your child’s life."],
    },
    "Full-Time Earner": {
      pressure: ["Salary pressure is showing.", "A stable paycheck can still feel tight when bills, subscriptions, family needs, and daily spending all pull from it."],
      stability: ["The salary needs structure.", "Predictable income becomes more powerful when payday has a clear first move before spending starts spreading."],
      energy: ["Work fatigue can affect spending.", "Long routines can make convenience or reward spending feel like recovery after carrying the day."],
      growth: ["Stable income has potential.", "The opportunity is not only earning regularly, but keeping enough of the salary to build real security."],
      boundaries: ["Cutoff rules can protect you.", "A simple limit around payday, bills, and rewards can stop the same cycle from repeating every cutoff."],
    },
    "Freelance Season": {
      pressure: ["Income timing is the pressure.", "Client money can arrive in waves while expenses stay regular, which makes the gap between payments important."],
      stability: ["Freelance income needs a buffer.", "Strong weeks feel better when part of the money is protected for dry weeks, delayed payments, and essentials."],
      energy: ["Freedom can still feel heavy.", "Flexible work can blur rest, earning, and client pressure until the schedule quietly becomes draining."],
      growth: ["Your freedom needs structure.", "Freelance growth becomes safer when client flow, pricing, and buffers are not depending on one good week."],
      boundaries: ["Separate money creates clarity.", "When work money and personal money mix, it becomes harder to see what is safe, what is operating cost, and what must wait."],
    },
    "Business Builder": {
      pressure: ["Growth pressure is active.", "Operating costs, inventory, sales timing, and reinvestment can make business money feel urgent before profit feels stable."],
      stability: ["Cash flow needs protection.", "A business can be growing and still feel tight when expenses happen before sales fully arrive."],
      energy: ["Decision load is real.", "Building can make every money decision feel strategic, risky, and personal at the same time."],
      growth: ["Growth needs pacing.", "Reinvestment can help the business move, but it becomes safer when personal stability is not being erased."],
      boundaries: ["Business and personal money need lines.", "Clear separation helps you see what belongs to operations, what belongs to growth, and what protects your life."],
    },
  };

  const selected = copy[stage]?.[signalId];
  if (!selected) return null;

  if (!guidance) return { title: selected[0], body: selected[1] };

  return {
    title: selected[0].replace(/\.$/, "") + " — protect it.",
    body: "Start with one clear boundary around this pressure so the next decision has less confusion and less emotional weight.",
  };
}

function getStageSignalCopy(stage, signalId, mode) {
  const profile = getProfile();
  return genericSignalCopy(stage, signalId, mode)
    || getLifeStageGuidance(stage, { signalId, mode, profile });
}

function applyStageAwareCopy(signalId = null, mode = "awareness") {
  const stage = getStage();
  if (!stage || stage === WORKING_STUDENT_STAGE_KEY) return;

  const card = findSupportCard();
  const { title, body } = getTextNodes(card);
  if (!card || !title || !body) return;

  const activeSignal = signalId || clean(card.dataset.claraSelectedSignal) || "pressure";
  if (!activeSignal || activeSignal === "default") return;

  const copy = getStageSignalCopy(stage, activeSignal, mode);
  if (!copy?.title || !copy?.body) return;

  card.dataset.claraSupportCard = "true";
  card.dataset.claraSelectedSignal = activeSignal;
  card.dataset.claraSignalMode = mode;
  card.dataset.claraSignalCardActive = "true";
  card.dataset.claraStageAwareSignal = "true";

  setText(title, copy.title);
  setText(body, copy.body);
}

function installLifeStageSignalCardStageGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_SIGNAL_CARD_STAGE_GUARD__) return;
  window.__CLARA_SIGNAL_CARD_STAGE_GUARD__ = true;

  document.addEventListener("click", (event) => {
    const signal = event.target?.closest?.("[data-clara-pressure-signal]");
    const heart = event.target?.closest?.("[data-clara-heart-cta='true']");
    if (!signal && !heart) return;

    const signalId = signal?.dataset?.claraPressureSignal || clean(findSupportCard()?.dataset?.claraSelectedSignal) || "pressure";
    const currentMode = clean(findSupportCard()?.dataset?.claraSignalMode) === "guidance" ? "guidance" : "awareness";
    const nextMode = heart ? (currentMode === "guidance" ? "awareness" : "guidance") : "awareness";

    window.setTimeout(() => applyStageAwareCopy(signalId, nextMode), 0);
    window.setTimeout(() => applyStageAwareCopy(signalId, nextMode), 80);
    window.setTimeout(() => applyStageAwareCopy(signalId, nextMode), 180);
  }, true);

  window.addEventListener("clara:life-stage-profile-updated", () => {
    window.setTimeout(() => applyStageAwareCopy(null, "awareness"), 120);
  }, { passive: true });
}

try {
  installLifeStageSignalCardStageGuard();
} catch (error) {
  console.warn("CLARA signal card stage guard failed:", error);
}
