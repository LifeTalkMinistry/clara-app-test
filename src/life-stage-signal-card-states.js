const SIGNAL_CARD_COPY = {
  tired: {
    awarenessTitle: "Energy pressure is showing up.",
    awarenessBody:
      "School, work, commute, and responsibility may be draining energy. Many working students spend more on shortcuts, comfort, or skipped tracking when tired.",
    guidanceTitle: "Make tired days easier.",
    guidanceBody:
      "Use one small rule before the day gets heavy: set a food limit, prepare fare, or do one quick budget check. Small structure can reduce stress spending.",
  },
  stress: {
    awarenessTitle: "Stress may be asking for relief.",
    awarenessBody:
      "School, work, family needs, or money timing may feel crowded. Spending can become a fast way to feel comfort, control, or a short break.",
    guidanceTitle: "Name the pressure first.",
    guidanceBody:
      "Before buying, name what is active: school, work, family, time, or money. Then set a small limit so relief does not become a repeated pattern.",
  },
  sleepy: {
    awarenessTitle: "Low sleep weakens control.",
    awarenessBody:
      "Sleepy weeks can make money discipline feel heavier. Spending may become automatic through snacks, caffeine, rides, or easy shortcuts.",
    guidanceTitle: "Delay bigger decisions.",
    guidanceBody:
      "When sleep is low, pause bigger purchases. Save the decision, rest if possible, then check your budget when your mind has more space.",
  },
  hungry: {
    awarenessTitle: "Hunger can trigger impulse spending.",
    awarenessBody:
      "Delayed meals can make spending feel urgent. Hunger often turns small food choices into bigger snack, drink, delivery, or treat spending.",
    guidanceTitle: "Protect a small food buffer.",
    guidanceBody:
      "Plan a small food amount before the day gets long. Eating on time protects both your body and your spending control.",
  },
  pressure: {
    awarenessTitle: "Time pressure becomes money pressure.",
    awarenessBody:
      "Rushed days often cost more. Working students may pay extra for transport, convenience food, forgotten school needs, or last-minute fixes.",
    guidanceTitle: "Prepare one thing early.",
    guidanceBody:
      "Choose one repeated pressure point — fare, food, school materials, or timing — and prepare it earlier. One prepared area can reduce rushed spending.",
  },
};

const STATE = { signalId: null, mode: "awareness" };
const BODY_LIMIT = 142;

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function limitText(value, limit = BODY_LIMIT) {
  const text = clean(value);
  if (text.length <= limit) return text;
  const sliced = text.slice(0, limit + 1);
  const safe = sliced.slice(0, Math.max(sliced.lastIndexOf(" "), limit - 12)).trim();
  return `${safe}…`;
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
    return { title: copy.guidanceTitle, body: limitText(copy.guidanceBody) };
  }
  return {
    title: copy.awarenessTitle,
    body: limitText(`${copy.awarenessBody} Tap the heart for a gentle next step.`),
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
    #root [data-clara-support-card="true"] {
      min-height: clamp(136px, 17.5svh, 168px) !important;
      padding: clamp(18px, 4.8vw, 23px) clamp(18px, 5vw, 24px) !important;
      overflow: hidden !important;
    }
    #root [data-clara-support-card="true"] h3,
    #root [data-clara-support-card="true"] h3 + p {
      transition: opacity 160ms ease, transform 160ms ease !important;
    }
    #root [data-clara-support-card="true"] h3 {
      max-width: calc(100% - 64px) !important;
      font-size: clamp(13px, 3.5vw, 15px) !important;
      line-height: 1.15 !important;
      margin-bottom: 6px !important;
    }
    #root [data-clara-support-card="true"] h3 + p {
      max-width: calc(100% - 60px) !important;
      font-size: clamp(10.25px, 2.72vw, 11.5px) !important;
      line-height: 1.36 !important;
      letter-spacing: -0.01em !important;
      display: block !important;
      overflow: visible !important;
      text-overflow: clip !important;
      white-space: normal !important;
      -webkit-line-clamp: unset !important;
      -webkit-box-orient: unset !important;
    }
    #root [data-clara-support-card="true"] button {
      right: clamp(14px, 4vw, 20px) !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
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