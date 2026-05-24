// Living with Partner now routes through the main CLARA life-stage diagnosis renderer.
// This file is intentionally kept as a safe bridge so any existing import remains stable,
// while preventing a second Living with Partner overlay from competing with src/life-stage-apply-diagnosis.js.
// It also installs the Working Student heart guidance behavior because this file is already loaded globally.

const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

const WORKING_STUDENT_GUIDANCE_COPY = {
  tired: {
    awarenessTitle: "Energy pressure is showing up.",
    guidanceTitle: "Make tired days easier.",
    guidanceBody: "Choose one low-effort rule for today: fare ready, food limit set, or one quick expense check.",
  },
  stress: {
    awarenessTitle: "Stress may be asking for relief.",
    guidanceTitle: "Name the pressure first.",
    guidanceBody: "Before spending for relief, name what feels heavy. Then choose one controlled amount instead of letting stress choose for you.",
  },
  sleepy: {
    awarenessTitle: "Low sleep weakens control.",
    guidanceTitle: "Delay bigger decisions.",
    guidanceBody: "Keep today’s money choices small. Avoid bigger purchases until your mind has more rest and patience.",
  },
  hungry: {
    awarenessTitle: "Hunger can trigger impulse spending.",
    guidanceTitle: "Protect a small food buffer.",
    guidanceBody: "Plan one affordable meal or snack before hunger decides the price. Food is care, but the pattern still needs a limit.",
  },
  pressure: {
    awarenessTitle: "Time pressure becomes money pressure.",
    guidanceTitle: "Prepare one thing early.",
    guidanceBody: "Pick one predictable cost to prepare before the rush: fare, food, school need, or load/data.",
  },
  moneyTiming: {
    awarenessTitle: "Money timing can create pressure.",
    guidanceTitle: "Protect the waiting period.",
    guidanceBody: "Until the next money arrives, protect essentials first: fare, food, school needs, then extras.",
  },
  commute: {
    awarenessTitle: "Commute pressure affects spending.",
    guidanceTitle: "Plan the travel cost early.",
    guidanceBody: "Separate fare before optional spending. Your route should have its own small budget, not pull from food or school money later.",
  },
  default: {
    awarenessTitle: "Your effort has direction.",
    guidanceTitle: "Turn awareness into one small rule.",
    guidanceBody: "Choose one thing to protect today: fare, food, school needs, savings, or rest. Start with the pressure that repeats most.",
  },
};

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function readProfile() {
  try {
    return JSON.parse(window.localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function isWorkingStudent() {
  const profile = readProfile();
  if (clean(profile.stage) === "Working Student") return true;
  const hero = findLifeStageHero();
  return clean(hero?.querySelector("h2")?.textContent) === "Working Student";
}

function findLifeStageHero() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h2")?.textContent);
    const label = section.querySelector("p")?.textContent?.toLowerCase?.() || "";
    return heading && label.includes("your life stage");
  }) || null;
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

function findTextNodes(card) {
  const title = card?.querySelector("h3");
  const body = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { title, body };
}

function findHeartNode(card) {
  return card?.querySelector("svg")?.closest("div") || null;
}

function detectSignalFromText(titleText = "", bodyText = "") {
  const title = clean(titleText).toLowerCase();
  const body = clean(bodyText).toLowerCase();
  const all = `${title} ${body}`;
  const byActive = document.querySelector("[data-clara-pressure-signal][data-active='true']")?.dataset?.claraPressureSignal;
  if (byActive && WORKING_STUDENT_GUIDANCE_COPY[byActive]) return byActive;
  const cardSignal = findSupportCard()?.dataset?.claraSelectedSignal;
  if (cardSignal && WORKING_STUDENT_GUIDANCE_COPY[cardSignal]) return cardSignal;

  for (const [key, copy] of Object.entries(WORKING_STUDENT_GUIDANCE_COPY)) {
    if (key === "default") continue;
    if (title === clean(copy.awarenessTitle).toLowerCase()) return key;
  }

  if (all.includes("commute") || all.includes("route") || all.includes("fare") || all.includes("travel")) return "commute";
  if (all.includes("money timing") || all.includes("payday") || all.includes("allowance") || all.includes("waiting period")) return "moneyTiming";
  if (all.includes("time pressure") || all.includes("rushed") || all.includes("schedule")) return "pressure";
  if (all.includes("hunger") || all.includes("food") || all.includes("meal")) return "hungry";
  if (all.includes("sleep") || all.includes("sleepy")) return "sleepy";
  if (all.includes("stress")) return "stress";
  if (all.includes("energy") || all.includes("tired") || all.includes("fatigue")) return "tired";
  return "default";
}

function markActiveSignal(signalId) {
  document.querySelectorAll("[data-clara-pressure-signal]").forEach((button) => {
    if (!button.dataset.claraPressureSignal) return;
    if (button.dataset.claraPressureSignal === signalId) button.dataset.active = "true";
  });
}

function applyWorkingStudentGuidance(event) {
  if (!isWorkingStudent()) return;
  const card = findSupportCard();
  const heart = findHeartNode(card);
  if (!card || !heart || !heart.contains(event.target)) return;

  const { title, body } = findTextNodes(card);
  if (!title || !body) return;

  const signalId = detectSignalFromText(title.textContent, body.textContent);
  const copy = WORKING_STUDENT_GUIDANCE_COPY[signalId] || WORKING_STUDENT_GUIDANCE_COPY.default;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  card.dataset.claraSupportCard = "true";
  card.dataset.claraSignalCardActive = "true";
  card.dataset.claraSelectedSignal = signalId;
  card.dataset.claraSignalMode = "guidance";
  heart.dataset.claraHeartCta = "true";
  heart.setAttribute("role", "button");
  heart.setAttribute("tabindex", "0");
  heart.setAttribute("aria-label", "Showing guidance");
  heart.title = "Showing guidance";

  title.style.opacity = "0";
  body.style.opacity = "0";
  title.style.transform = "translateY(4px)";
  body.style.transform = "translateY(4px)";

  window.setTimeout(() => {
    title.textContent = copy.guidanceTitle;
    body.textContent = copy.guidanceBody;
    title.style.opacity = "1";
    body.style.opacity = "1";
    title.style.transform = "translateY(0)";
    body.style.transform = "translateY(0)";
    markActiveSignal(signalId);
  }, 90);
}

function prepareHeartForWorkingStudent() {
  if (!isWorkingStudent()) return;
  const card = findSupportCard();
  const heart = findHeartNode(card);
  if (!card || !heart) return;
  heart.dataset.claraHeartCta = "true";
  heart.setAttribute("role", "button");
  heart.setAttribute("tabindex", "0");
  if (clean(card.dataset.claraSignalMode) !== "guidance") {
    heart.setAttribute("aria-label", "Show guidance");
    heart.title = "Show guidance";
  }
}

function installWorkingStudentHeartGuidanceBridge() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_WORKING_STUDENT_HEART_GUIDANCE_BRIDGE__) return;
  window.__CLARA_WORKING_STUDENT_HEART_GUIDANCE_BRIDGE__ = true;

  window.addEventListener("click", applyWorkingStudentGuidance, true);
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    applyWorkingStudentGuidance(event);
  }, true);

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      prepareHeartForWorkingStudent();
    });
  };

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener("storage", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  schedule();
}

try {
  installWorkingStudentHeartGuidanceBridge();
} catch (error) {
  console.warn("CLARA Working Student heart guidance bridge failed:", error);
}

export default function installLivingWithPartnerRevealBridge() {
  return null;
}
