const SIGNAL_CARD_COPY = {
  tired: {
    awarenessTitle: "Energy pressure is showing up.",
    awarenessBody: "Tired days can lead to shortcuts, comfort spending, or skipped tracking.",
    guidanceTitle: "Make tired days easier.",
    guidanceBody: "Use one small rule: prepare fare, set a food limit, or do one quick budget check.",
  },
  stress: {
    awarenessTitle: "Stress may be asking for relief.",
    awarenessBody: "Pressure can make spending feel like comfort, control, or a short break.",
    guidanceTitle: "Name the pressure first.",
    guidanceBody: "Before buying, name what feels heavy. Then set a small limit before spending.",
  },
  sleepy: {
    awarenessTitle: "Low sleep weakens control.",
    awarenessBody: "Sleepy weeks can make snacks, caffeine, rides, or shortcuts feel automatic.",
    guidanceTitle: "Delay bigger decisions.",
    guidanceBody: "Pause bigger purchases. Rest first, then check the budget with a clearer mind.",
  },
  hungry: {
    awarenessTitle: "Hunger can trigger impulse spending.",
    awarenessBody: "Delayed meals can make snacks, drinks, delivery, or treats feel urgent.",
    guidanceTitle: "Protect a small food buffer.",
    guidanceBody: "Plan a small food amount early. Eating on time protects spending control.",
  },
  pressure: {
    awarenessTitle: "Time pressure becomes money pressure.",
    awarenessBody: "Rushed days can create extra transport, food, or last-minute school costs.",
    guidanceTitle: "Prepare one thing early.",
    guidanceBody: "Pick one repeated pressure point and prepare it before the rush begins.",
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
  if (mode === "guidance") return { title: copy.guidanceTitle, body: copy.guidanceBody };
  return { title: copy.awarenessTitle, body: copy.awarenessBody };
}

function setActiveIcon(signalId) {
  document.querySelectorAll("[data-clara-pressure-signal]").forEach((button) => {
    button.dataset.active = button.dataset.claraPressureSignal === signalId ? "true" : "false";
  });
}

function applyImportantStyle(node, styles) {
  if (!node) return;
  Object.entries(styles).forEach(([property, value]) => {
    node.style.setProperty(property, value, "important");
  });
}

function prepareCardLayout(card, title, body) {
  applyImportantStyle(card, {
    height: "",
    "min-height": "",
    "max-height": "",
    overflow: "hidden",
  });

  applyImportantStyle(title, {
    "max-width": "calc(100% - 66px)",
    "font-size": "13px",
    "line-height": "1.15",
    margin: "0 0 4px",
    overflow: "visible",
    "text-overflow": "clip",
    "white-space": "normal",
    display: "block",
  });

  applyImportantStyle(body, {
    "max-width": "calc(100% - 66px)",
    "font-size": "10.5px",
    "line-height": "1.28",
    margin: "0",
    overflow: "visible",
    "text-overflow": "clip",
    "white-space": "normal",
    display: "block",
    "max-height": "none",
    "-webkit-line-clamp": "unset",
    "line-clamp": "unset",
    "-webkit-box-orient": "unset",
  });

  const heart = card.querySelector("button");
  if (heart) {
    applyImportantStyle(heart, {
      right: "14px",
      top: "50%",
      transform: "translateY(-50%)",
    });
  }
}

function applyCardState(signalId = STATE.signalId, mode = STATE.mode, animate = false) {
  if (!signalId) return;
  const card = findSupportCard();
  const { title, body } = findTextNodes(card);
  if (!card || !title || !body) return;

  prepareCardLayout(card, title, body);

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
    prepareCardLayout(card, title, body);
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
  window.addEventListener("resize", maintainState, { passive: true });

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