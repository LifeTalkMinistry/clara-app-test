const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

const YOUNG_PRO_SIGNALS = [
  { id: "ypWorkStress", icon: "💼", label: "Work Stress", awarenessTitle: "Work pressure can affect spending.", guidanceTitle: "Create a workday boundary." },
  { id: "ypBills", icon: "🧾", label: "Bills", awarenessTitle: "Bills can create quiet pressure.", guidanceTitle: "Protect the fixed costs first." },
  { id: "ypLifestyle", icon: "🛋️", label: "Lifestyle", awarenessTitle: "Lifestyle pressure can grow quietly.", guidanceTitle: "Choose comfort with a limit." },
  { id: "ypCareer", icon: "📈", label: "Career Pressure", awarenessTitle: "Career pressure can change choices.", guidanceTitle: "Invest without panic." },
  { id: "ypBurnout", icon: "😵", label: "Burnout", awarenessTitle: "Burnout can weaken money control.", guidanceTitle: "Lower the decision load." },
  { id: "ypPayday", icon: "💸", label: "Payday Timing", awarenessTitle: "Payday timing affects discipline.", guidanceTitle: "Assign money before spending." },
];

const THEMES = {
  ypWorkStress: {
    awareness: [
      "Work stress can make convenience spending feel like recovery after a long shift.",
      "A pressured workday can make small rewards feel necessary, not optional.",
      "When work drains your patience, spending can become a quick emotional reset.",
      "After heavy meetings or calls, comfort purchases can feel more reasonable.",
      "Work pressure can make you spend to feel in control again.",
      "Stress from performance, deadlines, or bosses can quietly affect spending discipline.",
      "A difficult workday can make delivery, rides, or treats feel deserved.",
      "When work feels heavy, the wallet often absorbs the emotional load.",
      "Work stress can turn small breaks into repeated spending moments.",
      "Pressure at work can make budget checking feel like another task.",
      "A stressful role can make lifestyle upgrades feel like compensation.",
      "When your mind is full from work, money choices can become automatic.",
      "Work tension can make quick comfort feel more urgent than planning.",
      "After a draining shift, small purchases can feel like proof you survived.",
      "Work pressure can make future goals feel less important in the moment.",
      "A long workday can make boundaries feel harder to keep.",
      "When your job demands a lot, spending may become a private reward system.",
      "Work stress can hide inside coffee, snacks, delivery, rides, and online buys.",
      "A packed workday can weaken the pause before purchase.",
      "Professional pressure can make you pay for ease more often.",
      "Work fatigue can make discipline feel unfair after effort.",
      "When the day feels demanding, money can become a coping tool.",
      "Work stress can make repeated small expenses look harmless.",
      "A high-pressure work rhythm can blur need, reward, and escape.",
      "When work is emotionally loud, spending can feel like silence.",
      "Stress at work can make you avoid checking the real budget number.",
      "Work pressure can make convenience feel like survival.",
      "A difficult workday can trigger spending before you even notice the pattern.",
      "When work drains energy, comfort spending becomes easier to justify.",
      "Work stress is real, but it can quietly train the wallet if unchecked."
    ],
    guidance: [
      "Set one workday spending boundary before the pressure starts.",
      "Choose one affordable reward and stop there.",
      "Delay comfort spending until after a short pause or walk.",
      "Check if the purchase solves stress or only hides it for a moment.",
      "Protect one future bill before buying workday comfort.",
      "Use a fixed workday allowance for snacks, coffee, rides, or delivery.",
      "After work, wait ten minutes before buying a reward.",
      "Make the easiest safe option visible before the day gets heavy.",
      "Name the work pressure first, then decide if spending is needed.",
      "Use one simple rule: no second comfort purchase on the same workday.",
      "Keep a small recovery budget separate from essentials.",
      "Let rest be the first reward before money becomes the reward.",
      "Decide your comfort limit while calm, not while drained.",
      "Track only work-stress spending today to reveal the pattern.",
      "Choose the lowest-cost version of convenience that still helps.",
      "Avoid buying immediately after a stressful conversation.",
      "Give yourself one allowed comfort, but keep it planned.",
      "Protect transportation and food money before workday extras.",
      "Turn the reward into a limit, not an open door.",
      "Check your wallet once before the post-work purchase.",
      "If the expense is emotional, make it smaller and intentional.",
      "Create one no-spend recovery option after work.",
      "Do not let one hard day rewrite the monthly plan.",
      "Pause before spending to ask what kind of rest you actually need.",
      "Use a workday cap so pressure does not choose the amount.",
      "Write the purchase down before making it.",
      "Save bigger rewards for planned dates, not stressful moments.",
      "Reduce one repeated workday leak this week.",
      "Keep the reward, but remove the repeat.",
      "Let CLARA hold one boundary while work feels heavy."
    ]
  },
  ypBills: {
    awareness: [
      "Bills can make salary feel assigned before it arrives.",
      "Fixed costs can create pressure even when income looks stable.",
      "Rent, utilities, subscriptions, and loans can crowd the same paycheck.",
      "Bill pressure often feels quiet until due dates get close.",
      "A young professional may earn more but still feel squeezed by obligations.",
      "Bills can make optional spending riskier near due dates.",
      "Recurring costs can hide because they feel normal.",
      "Fixed expenses can reduce freedom before you notice it.",
      "Bill timing can create stress even without overspending.",
      "When due dates stack, small extras become heavier.",
      "Automatic payments can make money disappear quietly.",
      "Bills can make lifestyle spending feel more dangerous after payday.",
      "A stable job does not always mean stable cash flow.",
      "Monthly obligations can turn income into a passing visitor.",
      "Bills can make the budget feel tight even after a good paycheck.",
      "Due dates can create emotional pressure around spending.",
      "Fixed costs can make unplanned buys more expensive later.",
      "Bills often expose whether the paycheck already has too many promises.",
      "Subscription costs can quietly weaken monthly breathing room.",
      "Bill pressure grows when essentials and comfort spending mix together.",
      "A salary can look large before bills are separated.",
      "Fixed payments can make savings feel optional when they should be protected.",
      "Bills can make you feel behind even while working hard.",
      "A bill-heavy month can make reward spending riskier.",
      "Due dates can quietly affect mood and money decisions.",
      "Bills are not just numbers; they shape how safe money feels.",
      "Recurring obligations can make impulsive spending more costly.",
      "Bill pressure can make you avoid opening banking apps.",
      "Fixed costs need space before lifestyle decisions begin.",
      "Bills can turn payday excitement into pressure quickly."
    ],
    guidance: [
      "Separate bill money first before spending on anything optional.",
      "List the next three due dates and protect them today.",
      "Move bill money out of your spending wallet immediately.",
      "Cancel or pause one recurring cost you no longer value.",
      "Check fixed costs before deciding on lifestyle spending.",
      "Create a bill-first payday routine.",
      "Protect rent, utilities, debt, and food before rewards.",
      "Use separate wallets for bills and daily spending.",
      "Do a quick subscription audit this week.",
      "Assign every fixed cost before treating the paycheck as available.",
      "Pay or reserve the nearest bill first.",
      "Keep a small buffer beside bill money for timing mistakes.",
      "Avoid big optional purchases within three days of major due dates.",
      "Track bills as promises already made.",
      "Review one fixed expense and ask if it still supports your life.",
      "Make savings a fixed cost too, even if small.",
      "Check if today’s purchase will touch a bill later.",
      "Use payday to protect obligations before emotions get loud.",
      "Build a mini calendar for recurring bills.",
      "Separate needs, bills, and lifestyle before the weekend starts.",
      "Freeze optional spending until the nearest bill is safe.",
      "Name the bill pressure instead of avoiding the number.",
      "Protect the first week after payday from careless spending.",
      "Make one bill automatic only if the money is already reserved.",
      "Cut one repeated cost that does not match your current goals.",
      "Set a bill-safe balance you refuse to go below.",
      "Before buying, ask what due date still needs money.",
      "Do not let lifestyle money borrow from bill money.",
      "Treat bill money as already gone once assigned.",
      "Let fixed costs speak first, then decide what is free."
    ]
  },
  ypLifestyle: {
    awareness: Array.from({ length: 30 }, (_, i) => `Lifestyle pressure can show up through food, outfits, gadgets, events, or social expectations. Pattern ${i + 1} still matters when repeated.`),
    guidance: Array.from({ length: 30 }, (_, i) => `Choose one lifestyle limit for today. Keep the experience, but protect the budget boundary first.`)
  },
  ypCareer: {
    awareness: Array.from({ length: 30 }, (_, i) => `Career pressure can make courses, tools, clothes, networking, or upgrades feel urgent. Not every upgrade has to happen today.`),
    guidance: Array.from({ length: 30 }, (_, i) => `Pick one career investment that truly moves you forward, then delay the rest until the budget is safer.`)
  },
  ypBurnout: {
    awareness: Array.from({ length: 30 }, (_, i) => `Burnout can turn spending into escape, convenience, or emotional recovery. The pattern deserves attention before it becomes routine.`),
    guidance: Array.from({ length: 30 }, (_, i) => `Lower the decision load today. Keep one money rule simple enough to follow even while tired.`)
  },
  ypPayday: {
    awareness: Array.from({ length: 30 }, (_, i) => `Payday can create a false feeling of extra money before bills, savings, and daily needs are assigned.`),
    guidance: Array.from({ length: 30 }, (_, i) => `Assign the paycheck first: bills, savings, food, transport, then lifestyle. Spend only from what remains.`)
  }
};

const YOUNG_PRO_SIGNALS = [
  { id: "ypWorkStress", icon: "💼", label: "Work Stress" },
  { id: "ypBills", icon: "🧾", label: "Bills" },
  { id: "ypLifestyle", icon: "🛋️", label: "Lifestyle" },
  { id: "ypCareer", icon: "📈", label: "Career Pressure" },
  { id: "ypBurnout", icon: "😵", label: "Burnout" },
  { id: "ypPayday", icon: "💸", label: "Payday Timing" },
];

const STATE = { signalId: null, mode: "awareness" };

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function readStage() {
  try {
    return clean(JSON.parse(localStorage.getItem(LIFE_STAGE_KEY) || "{}").stage);
  } catch {
    return "";
  }
}

function signalOffset(signalId) {
  return String(signalId || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function getDailyIndex(signalId, length = 30) {
  const now = new Date();
  const dayNumber = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86400000);
  return (dayNumber + signalOffset(signalId)) % length;
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

function applyImportantStyle(node, styles) {
  if (!node) return;
  Object.entries(styles).forEach(([property, value]) => node.style.setProperty(property, value, "important"));
}

function getCopy(signalId, mode) {
  const signal = YOUNG_PRO_SIGNALS.find((item) => item.id === signalId) || YOUNG_PRO_SIGNALS[0];
  const copy = SIGNAL_CARD_COPY[signalId] || SIGNAL_CARD_COPY.ypWorkStress;
  const bank = THEMES[signalId] || THEMES.ypWorkStress;
  const index = getDailyIndex(signalId, 30);
  return {
    title: mode === "guidance" ? copy.guidanceTitle : copy.awarenessTitle,
    body: mode === "guidance" ? bank.guidance[index] : bank.awareness[index],
    label: signal.label,
  };
}

function renderYoungProIcons() {
  if (readStage() !== "Young Professional") return;
  document.querySelectorAll("[data-clara-pressure-signals='true'] .clara-pressure-track").forEach((track) => {
    const signature = YOUNG_PRO_SIGNALS.map((signal) => signal.id).join("|");
    if (track.dataset.youngProSignature === signature) return;
    track.dataset.youngProSignature = signature;
    track.innerHTML = YOUNG_PRO_SIGNALS.map((signal) => `
      <button type="button" class="clara-pressure-chip" data-clara-pressure-signal="${signal.id}" aria-label="Show ${signal.label} awareness" title="${signal.label}">
        <span aria-hidden="true">${signal.icon}</span><strong>${signal.label}</strong>
      </button>
    `).join("");
  });
}

function setActiveIcon(signalId) {
  document.querySelectorAll("[data-clara-pressure-signal]").forEach((button) => {
    button.dataset.active = button.dataset.claraPressureSignal === signalId ? "true" : "false";
  });
}

function prepareCardLayout(card, title, body) {
  const row = card.querySelector(":scope > div") || title.parentElement;
  const textColumn = title.parentElement;
  const heart = findHeartNode(card);
  applyImportantStyle(card, { overflow: "hidden" });
  applyImportantStyle(row, { display: "flex", "flex-direction": "row", "align-items": "center", "justify-content": "space-between", gap: "12px", height: "100%", "min-height": "100%" });
  applyImportantStyle(textColumn, { flex: "1 1 auto", "min-width": "0", display: "flex", "flex-direction": "column", "justify-content": "center", "align-items": "stretch" });
  applyImportantStyle(title, { "max-width": "100%", "font-size": "13.5px", "line-height": "1.13", margin: "0 0 7px", overflow: "visible", "text-overflow": "clip", "white-space": "normal", display: "block" });
  applyImportantStyle(body, { "max-width": "100%", "font-size": "10.8px", "line-height": "1.34", margin: "0", overflow: "visible", "text-overflow": "clip", "white-space": "normal", display: "block", "max-height": "none", "-webkit-line-clamp": "unset", "line-clamp": "unset", "-webkit-box-orient": "unset" });
  if (heart) {
    heart.dataset.claraYoungProHeartCta = "true";
    heart.setAttribute("role", "button");
    heart.setAttribute("tabindex", "0");
    applyImportantStyle(heart, { position: "relative", right: "auto", top: "auto", transform: "none", flex: "0 0 56px", width: "56px", height: "56px", "min-width": "56px", "min-height": "56px", margin: "0", "align-self": "center", display: "grid", "place-items": "center" });
  }
}

function applyCardState(signalId = STATE.signalId, mode = STATE.mode, animate = false) {
  if (!signalId || readStage() !== "Young Professional") return;
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
  const heart = findHeartNode(card);
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
  if (!animate) return commit();
  title.style.opacity = "0";
  body.style.opacity = "0";
  title.style.transform = "translateY(4px)";
  body.style.transform = "translateY(4px)";
  window.setTimeout(commit, 90);
}

function handleSignalClick(event) {
  if (readStage() !== "Young Professional") return;
  const button = event.target?.closest?.("[data-clara-pressure-signal]");
  if (!button || !YOUNG_PRO_SIGNALS.some((signal) => signal.id === button.dataset.claraPressureSignal)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  STATE.signalId = button.dataset.claraPressureSignal;
  STATE.mode = "awareness";
  setActiveIcon(STATE.signalId);
  applyCardState(STATE.signalId, "awareness", true);
}

function handleHeartClick(event) {
  if (readStage() !== "Young Professional") return;
  const heart = event.target?.closest?.("[data-clara-young-pro-heart-cta='true']");
  if (!heart || !STATE.signalId) return;
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
    #root [data-clara-support-card="true"] h3 + p { transition: opacity 160ms ease, transform 160ms ease !important; }
    #root [data-clara-pressure-signal][data-active="true"] { border-color: rgba(165,243,252,.36) !important; background: radial-gradient(circle at 50% 0%, rgba(125,211,252,.20), rgba(255,255,255,.06)) !important; box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 0 18px rgba(34,211,238,.16) !important; }
  `;
  document.head.appendChild(style);
}

function maintainYoungProSignals() {
  installStyles();
  renderYoungProIcons();
  if (STATE.signalId && readStage() === "Young Professional") {
    setActiveIcon(STATE.signalId);
    applyCardState(STATE.signalId, STATE.mode, false);
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_YOUNG_PRO_SIGNAL_STATES__) {
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
  schedule();
}