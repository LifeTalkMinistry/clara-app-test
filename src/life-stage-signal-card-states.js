const SIGNAL_CARD_COPY = {
  tired: {
    awarenessTitle: "Energy pressure is showing up.",
    awarenessBody:
      "Many working students spend differently when school, work, commute, and responsibility are already draining energy. Convenience spending, skipped tracking, or small comfort purchases can become easier than planning.",
    guidanceTitle: "Make the plan easier on tired days.",
    guidanceBody:
      "Try reducing the number of decisions you need to make when your energy is low. A simple food limit, prepared fare plan, or one quick budget check can lower stress spending without requiring a perfect routine.",
  },
  stress: {
    awarenessTitle: "Stress may be asking for relief.",
    awarenessBody:
      "This signal often appears when school pressure, work expectations, family needs, or money timing feels mentally crowded. Spending can become a quick way to feel control, comfort, or a small break.",
    guidanceTitle: "Separate pressure from purchase.",
    guidanceBody:
      "Before buying, name the active pressure first: school, work, family, time, or money timing. Once the pressure is clear, even a small spending limit can stop relief from becoming a repeated pattern.",
  },
  sleepy: {
    awarenessTitle: "Low sleep weakens control.",
    awarenessBody:
      "Sleepy weeks can make financial discipline feel heavier than usual. Working students may spend automatically on caffeine, snacks, rides, or shortcuts because the mind has less energy to pause.",
    guidanceTitle: "Delay bigger decisions.",
    guidanceBody:
      "When sleep is low, save bigger purchase decisions for later. Rest first when possible, then check the budget when your mind has more room to compare what feels good with what is safe.",
  },
  hungry: {
    awarenessTitle: "Hunger can trigger impulse spending.",
    awarenessBody:
      "When meals are delayed by class, commute, or work, spending can become emotional and urgent. Hunger often turns small food choices into bigger snack, drink, delivery, or treat spending.",
    guidanceTitle: "Protect a small food buffer.",
    guidanceBody:
      "A small planned food amount can prevent bigger unplanned spending later. Eating on time is not just physical care; it also protects decision control during long student-work days.",
  },
  pressure: {
    awarenessTitle: "Time pressure becomes money pressure.",
    awarenessBody:
      "When the day is rushed, people often pay more just to keep moving. For working students, this can show up through transport, convenience food, forgotten school materials, or last-minute costs.",
    guidanceTitle: "Prepare one pressure early.",
    guidanceBody:
      "Choose one repeated pressure point — fare, food, school materials, or work-day timing — and prepare it earlier than usual. Even one prepared area can reduce rushed spending.",
  },
};

const STATE = { signalId: null, mode: "awareness" };

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
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

function findTextNodes(card) {
  const title = card?.querySelector("h3");
  const body = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { title, body };
}

function getCopy(signalId, mode) {
  const copy = SIGNAL_CARD_COPY[signalId] || SIGNAL_CARD_COPY.tired;
  if (mode === "guidance") {
    return { title: copy.guidanceTitle, body: copy.guidanceBody };
  }
  return {
    title: copy.awarenessTitle,
    body: `${copy.awarenessBody} Press the heart to see small ways to protect yourself from this.`,
  };
}

function setActiveIcon(signalId) {
  document.querySelectorAll("[data-clara-pressure-signal]").forEach((button) => {
    button.dataset.active = button.dataset.claraPressureSignal === signalId ? "true" : "false";
  });
}

function applyCardState(signalId = STATE.signalId, mode = STATE.mode, animate = false) {
  if (!signalId) return;
  const card = findSupportCard();
  const { title, body } = findTextNodes(card);
  if (!card || !title || !body) return;

  const copy = getCopy(signalId, mode);
  if (clean(title.textContent) === copy.title && clean(body.textContent) === copy.body) return;

  card.dataset.claraSupportCard = "true";
  card.dataset.claraSignalCardActive = "true";
  card.dataset.claraSelectedSignal = signalId;
  card.dataset.claraSignalMode = mode;

  const heart = card.querySelector("button");
  if (heart) {
    heart.title = mode === "guidance" ? "Showing gentle guidance" : "Show gentle guidance";
    heart.setAttribute("aria-label", heart.title);
  }

  const commit = () => {
    title.textContent = copy.title;
    body.textContent = copy.body;
    title.style.opacity = "1";
    body.style.opacity = "1";
    title.style.transform = "translateY(0)";
    body.style.transform = "translateY(0)";
  };

  if (!animate) {
    commit();
    return;
  }

  title.style.opacity = "0";
  body.style.opacity = "0";
  title.style.transform = "translateY(4px)";
  body.style.transform = "translateY(4px)";
  window.setTimeout(commit, 90);
}

function installStyles() {
  if (document.getElementById("clara-signal-card-state-style")) return;
  const style = document.createElement("style");
  style.id = "clara-signal-card-state-style";
  style.textContent = `
    #root [data-clara-support-card="true"] h3,
    #root [data-clara-support-card="true"] h3 + p {
      transition: opacity 160ms ease, transform 160ms ease !important;
    }
    #root [data-clara-pressure-signal][data-active="true"] {
      border-color: rgba(165,243,252,.36) !important;
      background: radial-gradient(circle at 50% 0%, rgba(125,211,252,.20), rgba(255,255,255,.06)) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 0 18px rgba(34,211,238,.16) !important;
    }
    #root [data-clara-support-card="true"][data-clara-signal-mode="guidance"] {
      box-shadow: 0 20px 54px rgba(0,0,0,.22), 0 0 24px rgba(244,114,182,.10), inset 0 1px 0 rgba(255,255,255,.07) !important;
    }
  `;
  document.head.appendChild(style);
}

function handleSignalClick(event) {
  const button = event.target?.closest?.("[data-clara-pressure-signal]");
  if (!button) return;

  const signalId = button.dataset.claraPressureSignal;
  if (!SIGNAL_CARD_COPY[signalId]) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  STATE.signalId = signalId;
  STATE.mode = "awareness";
  setActiveIcon(signalId);
  applyCardState(signalId, "awareness", true);
}

function handleHeartClick(event) {
  const card = findSupportCard();
  if (!card || !STATE.signalId) return;

  const button = event.target?.closest?.("button");
  if (!button || !card.contains(button)) return;
  if (event.target?.closest?.("[data-clara-pressure-signal]")) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  STATE.mode = "guidance";
  setActiveIcon(STATE.signalId);
  applyCardState(STATE.signalId, "guidance", true);
}

function maintainState() {
  installStyles();
  if (STATE.signalId) {
    setActiveIcon(STATE.signalId);
    applyCardState(STATE.signalId, STATE.mode, false);
  }
}

function installSignalCardStates() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_SIGNAL_CARD_STATES__) return;
  window.__CLARA_SIGNAL_CARD_STATES__ = true;

  document.addEventListener("click", handleSignalClick, true);
  document.addEventListener("click", handleHeartClick, true);

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      maintainState();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener("storage", schedule, { passive: true });
  schedule();
}

try {
  installSignalCardStates();
} catch (error) {
  console.warn("CLARA signal card state bridge failed:", error);
}
