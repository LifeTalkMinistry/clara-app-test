const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

const YOUNG_PRO_SIGNALS = [
  {
    id: "ypWorkStress",
    icon: "💼",
    label: "Work Stress",
    awarenessTitle: "Work pressure can affect spending.",
    guidanceTitle: "Create a workday boundary.",
    awareness: "Work stress can make convenience spending feel like recovery after a long shift.",
    guidance: "Set one workday spending boundary before the pressure starts.",
  },
  {
    id: "ypBills",
    icon: "🧾",
    label: "Bills",
    awarenessTitle: "Bills can create quiet pressure.",
    guidanceTitle: "Protect the fixed costs first.",
    awareness: "Bills can make salary feel assigned before it arrives, especially when due dates stack close together.",
    guidance: "Separate bill money first before spending on anything optional.",
  },
  {
    id: "ypLifestyle",
    icon: "🛋️",
    label: "Lifestyle",
    awarenessTitle: "Lifestyle pressure can grow quietly.",
    guidanceTitle: "Choose comfort with a limit.",
    awareness: "Lifestyle pressure can show up through food, outfits, gadgets, events, or social expectations.",
    guidance: "Choose one lifestyle limit for today. Keep the experience, but protect the budget boundary first.",
  },
  {
    id: "ypCareer",
    icon: "📈",
    label: "Career Pressure",
    awarenessTitle: "Career pressure can change choices.",
    guidanceTitle: "Invest without panic.",
    awareness: "Career pressure can make courses, tools, clothes, networking, or upgrades feel urgent.",
    guidance: "Pick one career investment that truly moves you forward, then delay the rest until the budget is safer.",
  },
  {
    id: "ypBurnout",
    icon: "😵",
    label: "Burnout",
    awarenessTitle: "Burnout can weaken money control.",
    guidanceTitle: "Lower the decision load.",
    awareness: "Burnout can turn spending into escape, convenience, or emotional recovery before you notice the routine.",
    guidance: "Lower the decision load today. Keep one money rule simple enough to follow even while tired.",
  },
  {
    id: "ypPayday",
    icon: "💸",
    label: "Payday Timing",
    awarenessTitle: "Payday timing affects discipline.",
    guidanceTitle: "Assign money before spending.",
    awareness: "Payday can create a false feeling of extra money before bills, savings, and daily needs are assigned.",
    guidance: "Assign the paycheck first: bills, savings, food, transport, then lifestyle. Spend only from what remains.",
  },
];

const DAILY_VARIATIONS = [
  "This pattern matters more when it repeats quietly across the week.",
  "It may look small today, but it can shape your monthly breathing room.",
  "CLARA is watching this because it connects emotion, routine, and money behavior.",
  "This is not about guilt. It is about noticing the pressure before it chooses for you.",
  "The goal is not perfection. The goal is to catch the pattern early.",
  "A small boundary here can protect bigger goals later.",
  "This signal usually becomes stronger when the day feels heavy or rushed.",
  "When life feels busy, this is one of the first areas where discipline can soften.",
  "This is where awareness can prevent a small leak from becoming normal.",
  "A calm decision here can keep your next paycheck safer.",
];

const STATE = {
  signalId: YOUNG_PRO_SIGNALS[0].id,
  mode: "awareness",
};

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeStage(value) {
  return clean(value).toLowerCase().replace(/[\s_-]+/g, "");
}

function isYoungProfessionalStage(value) {
  const stage = normalizeStage(value);
  return stage === "youngprofessional" || stage === "youngprofessionals" || stage === "youngpro";
}

function readStage() {
  try {
    return clean(JSON.parse(window.localStorage.getItem(LIFE_STAGE_KEY) || "{}").stage);
  } catch {
    return "";
  }
}

function signalOffset(signalId) {
  return String(signalId || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function getDailyIndex(signalId, length) {
  const now = new Date();
  const dayNumber = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86400000);
  return (dayNumber + signalOffset(signalId)) % Math.max(length || 1, 1);
}

function getSignal(signalId) {
  return YOUNG_PRO_SIGNALS.find((signal) => signal.id === signalId) || YOUNG_PRO_SIGNALS[0];
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

function findHeartNode(card) {
  return card?.querySelector("svg")?.closest("div") || null;
}

function getCopy(signalId, mode) {
  const signal = getSignal(signalId);
  const variation = DAILY_VARIATIONS[getDailyIndex(signal.id, DAILY_VARIATIONS.length)];
  return {
    title: mode === "guidance" ? signal.guidanceTitle : signal.awarenessTitle,
    body: `${mode === "guidance" ? signal.guidance : signal.awareness} ${variation}`,
  };
}

function renderYoungProIcons() {
  if (!isYoungProfessionalStage(readStage())) return false;

  const track = document.querySelector("[data-clara-pressure-signals='true'] .clara-pressure-track");
  if (!track) return false;

  const signature = YOUNG_PRO_SIGNALS.map((signal) => signal.id).join("|");
  if (track.dataset.youngProSignature === signature && track.dataset.youngProActive === "true") return true;

  track.dataset.youngProSignature = signature;
  track.dataset.youngProActive = "true";
  track.innerHTML = YOUNG_PRO_SIGNALS.map((signal) => `
    <button type="button" class="clara-pressure-chip" data-clara-pressure-signal="${signal.id}" aria-label="Show ${signal.label} awareness" title="${signal.label}">
      <span aria-hidden="true">${signal.icon}</span><strong>${signal.label}</strong>
    </button>
  `).join("");

  return true;
}

function setActiveIcon(signalId) {
  document.querySelectorAll("[data-clara-pressure-signal]").forEach((button) => {
    button.dataset.active = button.dataset.claraPressureSignal === signalId ? "true" : "false";
  });
}

function applyCardState(signalId = STATE.signalId, mode = STATE.mode, animate = false) {
  if (!isYoungProfessionalStage(readStage())) return;

  const card = findSupportCard();
  const { title, body } = findTextNodes(card);
  if (!card || !title || !body) return;

  STATE.signalId = getSignal(signalId).id;
  STATE.mode = mode === "guidance" ? "guidance" : "awareness";

  card.dataset.claraSupportCard = "true";
  card.dataset.claraSignalCardActive = "true";
  card.dataset.claraYoungProSignalCard = "true";
  card.dataset.claraSelectedSignal = STATE.signalId;
  card.dataset.claraSignalMode = STATE.mode;

  const heart = findHeartNode(card);
  if (heart) {
    heart.dataset.claraYoungProHeartCta = "true";
    heart.setAttribute("role", "button");
    heart.setAttribute("tabindex", "0");
    heart.title = STATE.mode === "guidance" ? "Showing gentle guidance" : "Show gentle guidance";
    heart.setAttribute("aria-label", heart.title);
  }

  const copy = getCopy(STATE.signalId, STATE.mode);
  if (clean(title.textContent) === copy.title && clean(body.textContent) === copy.body) return;

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

function handleSignalClick(event) {
  if (!isYoungProfessionalStage(readStage())) return;

  const button = event.target?.closest?.("[data-clara-pressure-signal]");
  const signalId = button?.dataset?.claraPressureSignal;
  if (!button || !YOUNG_PRO_SIGNALS.some((signal) => signal.id === signalId)) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  STATE.signalId = signalId;
  STATE.mode = "awareness";
  setActiveIcon(STATE.signalId);
  applyCardState(STATE.signalId, "awareness", true);
}

function handleHeartClick(event) {
  if (!isYoungProfessionalStage(readStage())) return;

  const heart = event.target?.closest?.("[data-clara-young-pro-heart-cta='true']");
  if (!heart) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  STATE.mode = "guidance";
  setActiveIcon(STATE.signalId);
  applyCardState(STATE.signalId, "guidance", true);
}

function installStyles() {
  if (document.getElementById("clara-young-pro-signal-style")) return;

  const style = document.createElement("style");
  style.id = "clara-young-pro-signal-style";
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

function maintainYoungProSignals() {
  installStyles();
  if (!isYoungProfessionalStage(readStage())) return;
  if (!renderYoungProIcons()) return;

  STATE.signalId = getSignal(STATE.signalId).id;
  setActiveIcon(STATE.signalId);
  applyCardState(STATE.signalId, STATE.mode, false);
}

function installYoungProfessionalSignals() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_YOUNG_PRO_SIGNAL_STATES__) return;
  window.__CLARA_YOUNG_PRO_SIGNAL_STATES__ = true;

  document.addEventListener("click", handleSignalClick, true);
  document.addEventListener("click", handleHeartClick, true);
  window.addEventListener("resize", maintainYoungProSignals, { passive: true });

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      maintainYoungProSignals();
    });
  };

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener("storage", schedule, { passive: true });
  document.addEventListener("click", () => window.setTimeout(schedule, 80), { passive: true });
  window.setTimeout(schedule, 120);
  window.setTimeout(schedule, 450);
  schedule();
}

try {
  installYoungProfessionalSignals();
} catch (error) {
  console.warn("CLARA Young Professional signal bridge failed:", error);
}
