import {
  LIVING_WITH_PARTNER_STAGE_KEY,
  getLivingWithPartnerBehaviorProfile,
  getLivingWithPartnerSignalCopy,
  getLivingWithPartnerSignals,
  getLivingWithPartnerSupportCopy,
} from "./components/fresh/main-dashboard/dashboard-panels/me/livingWithPartnerLifeStageSource";

const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
const STATE = { signalId: "sharedBills", mode: "awareness" };

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

function readProfile() {
  try {
    return JSON.parse(localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function isLivingWithPartner() {
  return clean(readProfile().stage) === LIVING_WITH_PARTNER_STAGE_KEY;
}

function findHero() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h2")?.textContent);
    return heading && section.querySelector("p")?.textContent?.toLowerCase?.().includes("your life stage");
  }) || null;
}

function findSupportCard() {
  const hero = findHero();
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

function heartNode(card) {
  return card?.querySelector("svg")?.closest("div") || null;
}

function important(node, styles) {
  if (!node) return;
  Object.entries(styles).forEach(([key, value]) => node.style.setProperty(key, value, "important"));
}

function prepareCard(card) {
  const { title, body } = findTextNodes(card);
  if (!card || !title || !body) return;
  const row = card.querySelector(":scope > div") || title.parentElement;
  const textColumn = title.parentElement;
  const heart = heartNode(card);

  card.dataset.claraSupportCard = "true";
  card.dataset.claraLivingPartnerSignalCard = "true";

  important(card, { overflow: "hidden" });
  important(row, {
    display: "flex",
    "flex-direction": "row",
    "align-items": "center",
    "justify-content": "space-between",
    gap: "12px",
    height: "100%",
    "min-height": "100%",
  });
  important(textColumn, {
    flex: "1 1 auto",
    "min-width": "0",
    display: "flex",
    "flex-direction": "column",
    "justify-content": "center",
  });
  important(title, {
    "max-width": "100%",
    "font-size": "13.5px",
    "line-height": "1.13",
    margin: "0 0 7px",
    overflow: "visible",
    "text-overflow": "clip",
    "white-space": "normal",
    display: "block",
  });
  important(body, {
    "max-width": "min(14.85rem, calc(100vw - 164px))",
    "font-size": "10.7px",
    "line-height": "1.34",
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

  if (heart) {
    heart.dataset.claraLivingPartnerHeartCta = "true";
    heart.setAttribute("role", "button");
    heart.setAttribute("tabindex", "0");
    important(heart, {
      position: "relative",
      right: "auto",
      top: "auto",
      transform: "none",
      flex: "0 0 56px",
      width: "56px",
      height: "56px",
      "min-width": "56px",
      "min-height": "56px",
      margin: "0",
      display: "grid",
      "place-items": "center",
    });
  }
}

function ensureDock(card) {
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
  dock.dataset.claraLivingPartnerDock = "true";
  dock.dataset.pressureReady = "true";

  let track = dock.querySelector(".clara-pressure-track");
  if (!track) {
    track = document.createElement("div");
    track.className = "clara-pressure-track";
    dock.replaceChildren(track);
  }

  const signals = getLivingWithPartnerSignals();
  const signature = signals.map((signal) => signal.key).join("|");
  if (track.dataset.livingPartnerSignature !== signature) {
    track.dataset.livingPartnerSignature = signature;
    track.innerHTML = signals.map((signal) => `
      <button type="button" class="clara-pressure-chip" data-clara-pressure-signal="${signal.key}" aria-label="Show ${signal.label} awareness" title="${signal.label}">
        <span aria-hidden="true">${signal.icon}</span><strong>${signal.label}</strong>
      </button>
    `).join("");
  }

  track.querySelectorAll("[data-clara-pressure-signal]").forEach((button) => {
    button.dataset.active = button.dataset.claraPressureSignal === STATE.signalId ? "true" : "false";
  });

  return dock;
}

function applySupportCopy(mode = STATE.mode, animate = false) {
  if (!isLivingWithPartner()) return;
  const card = findSupportCard();
  const { title, body } = findTextNodes(card);
  if (!card || !title || !body) return;

  prepareCard(card);
  ensureDock(card);

  const copy = STATE.signalId
    ? getLivingWithPartnerSignalCopy(STATE.signalId, mode)
    : getLivingWithPartnerSupportCopy(readProfile());

  card.dataset.claraSignalMode = mode;
  card.dataset.claraSelectedSignal = STATE.signalId;

  const commit = () => {
    title.textContent = copy.title;
    body.textContent = copy.body;
    prepareCard(card);
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

function trendSnapshotSection() {
  return Array.from(document.querySelectorAll("section")).find((section) => clean(section.querySelector("h3")?.textContent) === "Life Stage Trend Snapshot");
}

const TREND_PATHS = {
  stable: "M2 24 C14 22 20 20 30 19 C42 18 48 16 58 15 C70 14 78 13 90 11",
  wave: "M2 24 C10 20 16 25 24 18 C33 10 40 23 49 15 C59 7 66 22 75 14 C82 8 87 12 90 10",
  spike: "M2 27 C10 24 15 24 22 17 C28 10 34 18 39 7 C45 20 51 12 57 16 C65 21 69 9 76 13 C83 17 86 10 90 11",
  volatile: "M2 29 C8 25 13 27 18 20 C23 12 29 18 34 8 C41 28 47 7 53 17 C59 26 64 11 71 12 C79 13 83 8 90 10",
  upward: "M2 28 C12 24 17 24 26 20 C36 15 42 17 51 13 C62 8 68 12 77 9 C84 6 88 7 90 5",
};

function applyTrendPath(card, trendType) {
  const path = card.querySelector("svg path");
  if (path) path.setAttribute("d", TREND_PATHS[trendType] || TREND_PATHS.wave);
}

function enhanceSnapshot() {
  if (!isLivingWithPartner()) return;
  const section = trendSnapshotSection();
  if (!section) return;
  const behavior = getLivingWithPartnerBehaviorProfile(readProfile());
  const items = Array.from(section.querySelectorAll("button"))
    .map((card, index) => ({ card, index, lines: Array.from(card.querySelectorAll("p")) }))
    .filter((item) => item.lines.length >= 3);

  section.dataset.claraTrendSnapshot = "true";
  section.dataset.claraSnapshotModel = "living-with-partner-stage-engine";

  const subtitle = Array.from(section.querySelectorAll("p")).find((node) => clean(node.textContent).includes("Swipe") || clean(node.textContent).includes("100%"));
  if (subtitle) subtitle.textContent = "100% split of your current shared-life pressure.";

  items.forEach((item, index) => {
    const data = behavior.snapshotDistribution[index];
    if (!data) {
      item.card.style.display = "none";
      return;
    }
    item.card.style.display = "";
    item.lines[0].textContent = data.label;
    item.lines[1].textContent = `${data.value}%`;
    item.lines[2].textContent = data.status;
    item.card.dataset.claraSnapshotKey = data.key;
    item.card.dataset.claraSnapshotLabel = data.label;
    item.card.dataset.claraSnapshotValue = String(data.value);
    item.card.dataset.claraSnapshotStatus = data.status;
    item.card.dataset.claraSnapshotNote = data.note;
    item.card.dataset.claraSnapshotInsight = data.insight;
    item.card.dataset.claraSnapshotAction = data.action;
    item.card.dataset.claraSnapshotTrend = data.trendType;
    item.card.dataset.claraSnapshotCategory = data.category;
    applyTrendPath(item.card, data.trendType);
  });
}

function rememberSnapshotClick(event) {
  if (!isLivingWithPartner()) return;
  const card = event.target?.closest?.("button[data-clara-snapshot-label]");
  if (!card) return;
  window.__CLARA_LAST_LIVING_PARTNER_SNAPSHOT__ = {
    label: card.dataset.claraSnapshotLabel,
    value: card.dataset.claraSnapshotValue,
    status: card.dataset.claraSnapshotStatus,
    note: card.dataset.claraSnapshotNote,
    insight: card.dataset.claraSnapshotInsight,
    action: card.dataset.claraSnapshotAction,
  };
}

function enhanceModal() {
  if (!isLivingWithPartner()) return;
  const snapshot = window.__CLARA_LAST_LIVING_PARTNER_SNAPSHOT__;
  if (!snapshot) return;
  const sourceHeading = Array.from(document.querySelectorAll("p")).find((node) => clean(node.textContent).toLowerCase().includes("source") || clean(node.textContent).toLowerCase().includes("basis"));
  const modal = sourceHeading?.closest(".absolute");
  if (!modal) return;
  const title = modal.querySelector("h4");
  const intro = title?.nextElementSibling;
  const valueNode = Array.from(modal.querySelectorAll("p")).find((node) => /^\d+%$/.test(clean(node.textContent)));
  const statusNode = valueNode?.nextElementSibling;
  if (title) title.textContent = snapshot.label;
  if (intro && intro.tagName === "P") intro.textContent = snapshot.note;
  if (valueNode) valueNode.textContent = `${snapshot.value}%`;
  if (statusNode) statusNode.textContent = snapshot.status;

  let panel = modal.querySelector("[data-clara-living-partner-insight='true']");
  if (!panel) {
    panel = document.createElement("div");
    panel.dataset.claraLivingPartnerInsight = "true";
    panel.style.cssText = "margin:16px 0 12px;padding:15px;border-radius:24px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(145deg, rgba(255,255,255,.060), rgba(255,255,255,.028));";
    sourceHeading?.closest("div")?.parentElement?.insertBefore(panel, sourceHeading.closest("div"));
  }
  panel.innerHTML = `
    <div style="display:grid;gap:9px;">
      <div><p style="margin:0 0 5px;font-size:9px;font-weight:950;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.62);">Meaning</p><p style="margin:0;font-size:12px;line-height:1.55;color:rgba(255,255,255,.86);">${snapshot.note}</p></div>
      <div><p style="margin:0 0 5px;font-size:9px;font-weight:950;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.62);">Why it matters</p><p style="margin:0;font-size:12px;line-height:1.55;color:rgba(255,255,255,.86);">${snapshot.insight}</p></div>
      <div><p style="margin:0 0 5px;font-size:9px;font-weight:950;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.62);">Next move</p><p style="margin:0;font-size:12px;line-height:1.55;color:rgba(255,255,255,.86);">${snapshot.action}</p></div>
    </div>
  `;
}

function installStyles() {
  if (document.getElementById("clara-living-partner-signal-style")) return;
  const style = document.createElement("style");
  style.id = "clara-living-partner-signal-style";
  style.textContent = `
    #root [data-clara-living-partner-signal-card="true"] h3,
    #root [data-clara-living-partner-signal-card="true"] h3 + p { transition: opacity 160ms ease, transform 160ms ease !important; }
    #root [data-clara-living-partner-dock="true"] [data-clara-pressure-signal][data-active="true"] {
      border-color: rgba(165,243,252,.36) !important;
      background: radial-gradient(circle at 50% 0%, rgba(125,211,252,.20), rgba(255,255,255,.06)) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 0 18px rgba(34,211,238,.16) !important;
    }
  `;
  document.head.appendChild(style);
}

function handleSignalClick(event) {
  if (!isLivingWithPartner()) return;
  const button = event.target?.closest?.("[data-clara-pressure-signal]");
  if (!button || !button.closest("[data-clara-living-partner-dock='true']")) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  STATE.signalId = button.dataset.claraPressureSignal || "sharedBills";
  STATE.mode = "awareness";
  applySupportCopy("awareness", true);
}

function handleHeartClick(event) {
  if (!isLivingWithPartner()) return;
  const heart = event.target?.closest?.("[data-clara-living-partner-heart-cta='true']");
  if (!heart) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  STATE.mode = "guidance";
  applySupportCopy("guidance", true);
}

function maintain() {
  installStyles();
  if (!isLivingWithPartner()) return;
  if (!STATE.signalId) STATE.signalId = getLivingWithPartnerSignals()[0]?.key || "sharedBills";
  applySupportCopy(STATE.mode, false);
  enhanceSnapshot();
  enhanceModal();
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_LIVING_WITH_PARTNER_SIGNALS__) return;
  window.__CLARA_LIVING_WITH_PARTNER_SIGNALS__ = true;
  document.addEventListener("click", handleSignalClick, true);
  document.addEventListener("click", handleHeartClick, true);
  document.addEventListener("click", rememberSnapshotClick, true);
  window.addEventListener("resize", maintain, { passive: true });
  window.addEventListener("storage", () => {
    STATE.signalId = "sharedBills";
    STATE.mode = "awareness";
    maintain();
  }, { passive: true });

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
  document.addEventListener("click", () => window.setTimeout(schedule, 80), { passive: true });
  schedule();
}

try {
  install();
} catch (error) {
  console.warn("CLARA Living with Partner signal bridge failed:", error);
}
