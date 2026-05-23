const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

const SIGNALS = [
  ["tired", "😴", "Tired", "Work exhaustion affects spending.", "Make tired workdays safer.", "After long work hours, convenience spending can feel like recovery instead of a choice.", "Set one low-effort boundary before the day gets heavy: food, fare, coffee, or delivery limit."],
  ["stress", "🧠", "Stressed", "Stress may be asking for relief.", "Name the work pressure first.", "Career pressure, deadlines, and workplace tension can make small rewards feel necessary.", "Name the pressure before buying. If the purchase is only relief, choose a smaller planned version."],
  ["sleepy", "🌙", "Sleepy", "Low sleep weakens control.", "Delay bigger decisions.", "Low sleep can make workday spending more automatic, especially coffee, snacks, rides, and online buys.", "Avoid bigger money decisions while tired. Keep only one simple rule active until your energy returns."],
  ["hungry", "🍜", "Hungry", "Hunger can trigger impulse spending.", "Protect a food boundary.", "Busy workdays can delay meals and make food spending larger than planned.", "Plan the main meal first, then decide on drinks, snacks, or treats separately."],
  ["pressure", "⏰", "Time Pressure", "Time pressure becomes money pressure.", "Prepare one thing early.", "Rushed mornings, deadlines, and last-minute work needs can make paying for speed feel normal.", "Prepare one predictable pressure point early so rushing does not choose the price for you."],
  ["moneyTiming", "💸", "Money Timing", "Money timing can create pressure.", "Assign money before spending.", "Payday can create a false feeling of extra money before bills, savings, food, and transport are assigned.", "Assign the paycheck first: bills, savings, food, transport, then lifestyle. Spend only from what remains."],
  ["commute", "🚌", "Commute Pressure", "Commute pressure affects spending.", "Plan the travel cost early.", "Daily travel can quietly add fare, food, drinks, and convenience costs to a professional routine.", "Separate commute money before lifestyle spending so movement pressure does not borrow from essentials."],
].map(([id, icon, label, awarenessTitle, guidanceTitle, awareness, guidance]) => ({ id, icon, label, awarenessTitle, guidanceTitle, awareness, guidance }));

const DAILY = [
  "This pattern matters more when it repeats quietly across the week.",
  "It may look small today, but it can shape your monthly breathing room.",
  "CLARA is watching this because it connects emotion, routine, and money behavior.",
  "This is not about guilt. It is about noticing the pressure before it chooses for you.",
  "The goal is not perfection. The goal is to catch the pattern early.",
  "A small boundary here can protect bigger goals later.",
  "This signal usually becomes stronger when the day feels heavy or rushed.",
];

const STATE = { signalId: "tired", mode: "awareness" };

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const norm = (value) => clean(value).toLowerCase().replace(/[\s_-]+/g, "");

const isYoungPro = () => {
  try {
    const stage = JSON.parse(localStorage.getItem(LIFE_STAGE_KEY) || "{}").stage;
    return ["youngprofessional", "youngprofessionals", "youngpro"].includes(norm(stage));
  } catch {
    return false;
  }
};

const signal = (id) => SIGNALS.find((item) => item.id === id) || SIGNALS[0];
const dayIndex = (id, length) => {
  const now = new Date();
  const day = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86400000);
  const offset = String(id || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (day + offset) % length;
};

function important(node, styles) {
  if (!node) return;
  Object.entries(styles).forEach(([key, value]) => node.style.setProperty(key, value, "important"));
}

function hero() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h2")?.textContent);
    return heading && section.querySelector("p")?.textContent?.toLowerCase?.().includes("your life stage");
  });
}

function supportCard() {
  let node = hero()?.nextElementSibling || null;
  while (node) {
    if (node.matches?.("[data-clara-pressure-signals='true']")) node = node.nextElementSibling;
    else if (clean(node.querySelector?.("h3")?.textContent) || node.querySelector?.("svg")) return node;
    else node = node.nextElementSibling;
  }
  return null;
}

function snapshot(container) {
  return Array.from(container?.children || []).find((node) => node.matches?.("section[data-clara-trend-snapshot='true']"));
}

function textNodes(card) {
  const title = card?.querySelector("h3");
  const body = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { title, body };
}

function heartNode(card) {
  return card?.querySelector("svg")?.closest("div") || null;
}

function getRhythm() {
  const height = window.innerHeight || document.documentElement.clientHeight || 800;
  if (height <= 680) {
    return {
      rows: "minmax(186px, clamp(186px, 34.5svh, 222px)) 78px 40px 192px",
      supportHeight: "78px",
      supportMargin: "-14px auto 0",
      supportPadding: "10px 15px",
      dockHeight: "40px",
      dockMargin: "1px auto 0",
      dockPadding: "4px 8px",
      snapshotHeight: "192px",
    };
  }
  if (height <= 760) {
    return {
      rows: "minmax(214px, clamp(214px, 35.5svh, 260px)) 92px 42px 204px",
      supportHeight: "92px",
      supportMargin: "-22px auto 0",
      supportPadding: "13px 15px",
      dockHeight: "42px",
      dockMargin: "1px auto 0",
      dockPadding: "5px 8px",
      snapshotHeight: "204px",
    };
  }
  if (height >= 820) {
    return {
      rows: "minmax(248px, clamp(248px, 36.5svh, 292px)) 102px 46px 218px",
      supportHeight: "102px",
      supportMargin: "-28px auto 0",
      supportPadding: "15px 15px",
      dockHeight: "46px",
      dockMargin: "1px auto 0",
      dockPadding: "6px 8px",
      snapshotHeight: "218px",
    };
  }
  return {
    rows: "minmax(236px, clamp(236px, 37svh, 284px)) 102px 46px 218px",
    supportHeight: "102px",
    supportMargin: "-28px auto 0",
    supportPadding: "15px 15px",
    dockHeight: "46px",
    dockMargin: "1px auto 0",
    dockPadding: "6px 8px",
    snapshotHeight: "218px",
  };
}

function layout(card, dock) {
  const wrap = card?.parentElement;
  const heroCard = hero();
  const snap = snapshot(wrap);
  if (!wrap || !card || !heroCard) return;

  const rhythm = getRhythm();
  wrap.dataset.claraYoungProLayout = "true";
  card.dataset.claraSupportCard = "true";
  card.dataset.claraYoungProSignalCard = "true";

  important(wrap, {
    display: "grid",
    "grid-template-rows": rhythm.rows,
    gap: "0",
    "align-content": "start",
    overflow: "hidden",
  });

  important(heroCard, {
    position: "relative",
    "z-index": "3",
    height: "100%",
    "min-height": "0",
    flex: "none",
    margin: "0",
    transform: "none",
  });

  important(card, {
    position: "relative",
    "z-index": "14",
    height: rhythm.supportHeight,
    "min-height": rhythm.supportHeight,
    "max-height": rhythm.supportHeight,
    width: "calc(100% - 4px)",
    margin: rhythm.supportMargin,
    padding: rhythm.supportPadding,
    flex: "none",
    "align-self": "start",
    transform: "none",
    overflow: "hidden",
  });

  if (dock) {
    important(dock, {
      position: "relative",
      "z-index": "12",
      height: rhythm.dockHeight,
      "min-height": rhythm.dockHeight,
      "max-height": rhythm.dockHeight,
      margin: rhythm.dockMargin,
      padding: rhythm.dockPadding,
      flex: "none",
      "align-self": "start",
      transform: "none",
    });
  }

  if (snap) {
    important(snap, {
      position: "relative",
      "z-index": "4",
      height: rhythm.snapshotHeight,
      "min-height": rhythm.snapshotHeight,
      "max-height": rhythm.snapshotHeight,
      margin: "0",
      flex: "none",
      "align-self": "start",
      transform: "none",
    });
  }
}

function dockTrack() {
  const card = supportCard();
  const wrap = card?.parentElement;
  if (!card || !wrap) return null;

  let dock = Array.from(wrap.children).find((node) => node.matches?.("[data-clara-pressure-signals='true']"));
  if (!dock) {
    dock = document.createElement("div");
    dock.dataset.claraPressureSignals = "true";
    card.insertAdjacentElement("afterend", dock);
  } else if (dock.previousElementSibling !== card) {
    card.insertAdjacentElement("afterend", dock);
  }
  dock.dataset.pressureReady = "true";
  dock.dataset.claraYoungProDock = "true";

  let track = dock.querySelector(".clara-pressure-track");
  if (!track) {
    track = document.createElement("div");
    track.className = "clara-pressure-track";
    dock.replaceChildren(track);
  }

  layout(card, dock);
  return track;
}

function renderDock() {
  if (!isYoungPro()) return false;
  const track = dockTrack();
  if (!track) return false;

  const signature = SIGNALS.map((item) => item.id).join("|");
  if (track.dataset.youngProSignature === signature) return true;
  track.dataset.youngProSignature = signature;
  track.innerHTML = SIGNALS.map((item) => `
    <button type="button" class="clara-pressure-chip" data-clara-pressure-signal="${item.id}" aria-label="Show ${item.label} awareness" title="${item.label}">
      <span aria-hidden="true">${item.icon}</span><strong>${item.label}</strong>
    </button>
  `).join("");
  return true;
}

function setActive(id) {
  document.querySelectorAll("[data-clara-pressure-signal]").forEach((button) => {
    button.dataset.active = button.dataset.claraPressureSignal === id ? "true" : "false";
  });
}

function copy(id, mode) {
  const item = signal(id);
  const daily = DAILY[dayIndex(id, DAILY.length)];
  return {
    title: mode === "guidance" ? item.guidanceTitle : item.awarenessTitle,
    body: `${mode === "guidance" ? item.guidance : item.awareness} ${daily}`,
  };
}

function applyState(id = STATE.signalId, mode = STATE.mode, animate = false) {
  if (!isYoungPro()) return;
  const card = supportCard();
  const { title, body } = textNodes(card);
  if (!card || !title || !body) return;

  layout(card, card.parentElement?.querySelector("[data-clara-pressure-signals='true']"));
  STATE.signalId = signal(id).id;
  STATE.mode = mode === "guidance" ? "guidance" : "awareness";

  card.dataset.claraSupportCard = "true";
  card.dataset.claraSignalMode = STATE.mode;
  card.dataset.claraSelectedSignal = STATE.signalId;
  card.dataset.claraYoungProSignalCard = "true";

  const heart = heartNode(card);
  if (heart) {
    heart.dataset.claraYoungProHeartCta = "true";
    heart.setAttribute("role", "button");
    heart.setAttribute("tabindex", "0");
  }

  const next = copy(STATE.signalId, STATE.mode);
  const commit = () => {
    title.textContent = next.title;
    body.textContent = next.body;
    title.style.opacity = "1";
    body.style.opacity = "1";
    title.style.transform = "translateY(0)";
    body.style.transform = "translateY(0)";
  };
  if (!animate) return commit();
  title.style.opacity = "0";
  body.style.opacity = "0";
  title.style.transform = "translateY(4px)";
  body.style.transform = "translateY(4px)";
  window.setTimeout(commit, 90);
}

function handleSignalClick(event) {
  if (!isYoungPro()) return;
  const button = event.target?.closest?.("[data-clara-pressure-signal]");
  const id = button?.dataset?.claraPressureSignal;
  if (!button || !SIGNALS.some((item) => item.id === id)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  STATE.signalId = id;
  STATE.mode = "awareness";
  setActive(id);
  applyState(id, "awareness", true);
}

function handleHeartClick(event) {
  if (!isYoungPro()) return;
  const heart = event.target?.closest?.("[data-clara-young-pro-heart-cta='true'],[data-clara-heart-cta='true']");
  if (!heart) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  STATE.mode = "guidance";
  setActive(STATE.signalId);
  applyState(STATE.signalId, "guidance", true);
}

function installStyles() {
  if (document.getElementById("clara-young-pro-signal-style")) return;
  const style = document.createElement("style");
  style.id = "clara-young-pro-signal-style";
  style.textContent = `
    #root [data-clara-young-pro-layout="true"] [data-clara-support-card="true"] h3,
    #root [data-clara-young-pro-layout="true"] [data-clara-support-card="true"] h3 + p { transition: opacity 160ms ease, transform 160ms ease !important; }
    #root [data-clara-young-pro-layout="true"] [data-clara-support-card="true"] h3 { margin: 0 0 8px !important; max-width: 15.9rem !important; font-size: 13.4px !important; line-height: 1.08 !important; letter-spacing: -0.022em !important; }
    #root [data-clara-young-pro-layout="true"] [data-clara-support-card="true"] h3 + p { display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important; overflow: hidden !important; max-width: 16.2rem !important; font-size: 10.7px !important; line-height: 1.38 !important; }
    #root [data-clara-young-pro-layout="true"] [data-clara-pressure-signal][data-active="true"] { border-color: rgba(165,243,252,.36) !important; background: radial-gradient(circle at 50% 0%, rgba(125,211,252,.20), rgba(255,255,255,.06)) !important; box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 0 18px rgba(34,211,238,.16) !important; }
  `;
  document.head.appendChild(style);
}

function maintain() {
  installStyles();
  if (!isYoungPro()) return;
  if (!renderDock()) return;
  setActive(STATE.signalId);
  applyState(STATE.signalId, STATE.mode, false);
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_YOUNG_PRO_SIGNAL_STATES__) return;
  window.__CLARA_YOUNG_PRO_SIGNAL_STATES__ = true;
  window.addEventListener("click", handleSignalClick, true);
  window.addEventListener("click", handleHeartClick, true);
  window.addEventListener("resize", maintain, { passive: true });

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      maintain();
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
  install();
} catch (error) {
  console.warn("CLARA Young Professional signal bridge failed:", error);
}
