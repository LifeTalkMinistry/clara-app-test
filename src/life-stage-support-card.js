const SUPPORT_CARD_COPY = {
  "Working Student": {
    title: "You’re not behind.",
    body: "Balancing study, work, commute, and limited money can make progress feel slow. CLARA will pace the plan around survival, school needs, and small wins.",
    signal: "Support signal: protect energy before aggressive goals.",
  },
  "Young Professional": {
    title: "You’re not alone.",
    body: "Building independence while costs rise can feel heavy. CLARA will watch lifestyle pressure, first adult bills, and the gap between growth and stability.",
    signal: "Support signal: stabilize before upgrading.",
  },
  "Living with Partner": {
    title: "Shared life takes clarity.",
    body: "When routines, bills, and future plans are shared, money decisions become emotional too. CLARA will help protect fairness, communication, and stability.",
    signal: "Support signal: align money before pressure becomes conflict.",
  },
  "Family Household": {
    title: "Home pressure is real.",
    body: "Family needs can quietly pull from your budget. CLARA will help separate support, boundaries, and personal stability so helping does not erase your own plan.",
    signal: "Support signal: help wisely, not endlessly.",
  },
  "Single Parent": {
    title: "You’re carrying a lot.",
    body: "Many decisions in this stage are survival-first, not comfort-first. CLARA will protect child needs, emergency money, time pressure, and emotional energy.",
    signal: "Support signal: essentials and safety first.",
  },
  "Full-Time Earner": {
    title: "Routine can hide pressure.",
    body: "Stable income does not always mean stable behavior. CLARA will watch cutoff cycles, stress recovery, lifestyle creep, and the small leaks that repeat.",
    signal: "Support signal: turn routine into control.",
  },
  "Freelance Season": {
    title: "Irregular doesn’t mean impossible.",
    body: "Flexible income can create invisible mental pressure even during good months. CLARA will focus on buffers, client timing, and low-month protection.",
    signal: "Support signal: protect cash flow before freedom spending.",
  },
  "Business Builder": {
    title: "Growth needs protection.",
    body: "Building something can blur business risk and personal survival. CLARA will watch runway, reinvestment pressure, operating costs, and owner stability.",
    signal: "Support signal: grow without draining yourself.",
  },
};

const FALLBACK_COPY = {
  title: "You’re not alone.",
  body: "This stage can carry financial pressure that is not always visible. CLARA will adapt the pacing around your current reality.",
  signal: "Support signal: understand first, guide second.",
};

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function findLifeStageRoot() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h2")?.textContent);
    return heading && section.querySelector("p")?.textContent?.toLowerCase?.().includes("your life stage");
  });
}

function findSupportCard(hero) {
  if (!hero) return null;
  let current = hero.nextElementSibling;
  while (current) {
    const title = clean(current.querySelector("h3")?.textContent);
    if (title.includes("alone") || title.includes("behind") || title.includes("pressure") || current.querySelector("svg")) {
      return current;
    }
    current = current.nextElementSibling;
  }
  return null;
}

function getStageName(hero) {
  return clean(hero?.querySelector("h2")?.textContent) || "Young Professional";
}

function enhanceSupportCard() {
  const hero = findLifeStageRoot();
  const card = findSupportCard(hero);
  if (!hero || !card) return;

  const stage = getStageName(hero);
  const copy = SUPPORT_CARD_COPY[stage] || FALLBACK_COPY;
  const title = card.querySelector("h3");
  const body = title?.nextElementSibling;
  if (!title || !body) return;

  card.dataset.claraSupportCard = "true";
  card.dataset.claraSupportStage = stage;
  title.textContent = copy.title;
  body.textContent = copy.body;

  let signal = card.querySelector("[data-clara-support-signal='true']");
  if (!signal) {
    signal = document.createElement("p");
    signal.dataset.claraSupportSignal = "true";
    body.insertAdjacentElement("afterend", signal);
  }
  signal.textContent = copy.signal;
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_LIFE_SUPPORT_CARD__) {
  window.__CLARA_LIFE_SUPPORT_CARD__ = true;
  const observer = new MutationObserver(() => window.requestAnimationFrame(enhanceSupportCard));
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.requestAnimationFrame(enhanceSupportCard);
}
