import { getLifeStageSignals, getLifeStageSignal } from "./life-stage-signals";
import { getLifeStageGuidance } from "./life-stage-guidance";
import { readSelectedLifeStageProfile, getSelectedLifeStageKey } from "./life-stage-flow";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function findLifeStageHero() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h2")?.textContent);
    return heading && section.querySelector("p")?.textContent?.toLowerCase?.().includes("your life stage");
  });
}

function findSupportCard(hero) {
  if (!hero) return null;
  let current = hero.nextElementSibling;
  while (current) {
    if (current.matches?.("[data-clara-pressure-signals='true']")) {
      current = current.nextElementSibling;
      continue;
    }
    const title = clean(current.querySelector?.("h3")?.textContent);
    if (title || current.querySelector?.("svg")) return current;
    current = current.nextElementSibling;
  }
  return null;
}

function findSnapshot(container) {
  return Array.from(container?.children || []).find((node) => node.matches?.("section[data-clara-trend-snapshot='true']")) || null;
}

function setText(node, value) {
  if (!node) return;
  const next = String(value || "");
  if (node.textContent !== next) node.textContent = next;
}

function getProfile() {
  return readSelectedLifeStageProfile() || {};
}

function getStage() {
  return getProfile().stage || getSelectedLifeStageKey();
}

function getMode(card) {
  return card?.dataset?.claraSignalMode === "guidance" ? "guidance" : "awareness";
}

function applySupportCopy(card, signalId, mode = "awareness") {
  const profile = getProfile();
  const stage = profile.stage || getSelectedLifeStageKey();
  const copy = getLifeStageGuidance(stage, { signalId, mode, profile });
  const title = card?.querySelector("h3");
  const body = title?.nextElementSibling;
  if (!card || !title || !body || !copy?.title || !copy?.body) return;
  card.dataset.claraSupportCard = "true";
  card.dataset.claraSignalStage = stage;
  card.dataset.claraSelectedSignal = signalId || "default";
  card.dataset.claraSignalMode = mode;
  card.dataset.claraSignalCardActive = signalId ? "true" : "false";
  setText(title, copy.title);
  setText(body, copy.body);
}

function resetSupportCardForStage(card, stage) {
  if (!card || !stage) return;
  if (card.dataset.claraSignalStage === stage && card.dataset.claraStageResetReady === "true") return;

  card.dataset.claraSupportCard = "true";
  card.dataset.claraSignalStage = stage;
  card.dataset.claraSelectedSignal = "default";
  card.dataset.claraSignalMode = "idle";
  card.dataset.claraSignalCardActive = "false";
  card.dataset.claraStageResetReady = "true";
  card.querySelector?.("[data-clara-solution-hint='true']")?.remove?.();
  setActiveIcon(null);
  applySupportCopy(card, null, "awareness");
  card.dataset.claraSignalMode = "idle";
  card.dataset.claraSelectedSignal = "default";
  card.dataset.claraSignalCardActive = "false";
}

function findHeart(card) {
  return card?.querySelector("[data-clara-heart-cta='true']")
    || card?.querySelector("svg")?.closest("button,[role='button'],div")
    || null;
}

function markHeart(card) {
  const heart = findHeart(card);
  if (!heart) return;
  heart.dataset.claraHeartCta = "true";
  heart.setAttribute("role", "button");
  heart.setAttribute("tabindex", "0");
  heart.setAttribute("aria-label", "Show guidance for selected signal");
}

function getEventPoint(event) {
  const touch = event?.changedTouches?.[0] || event?.touches?.[0];
  const x = touch?.clientX ?? event?.clientX;
  const y = touch?.clientY ?? event?.clientY;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function isInsideExpandedHeart(event, heart) {
  const point = getEventPoint(event);
  const rect = heart?.getBoundingClientRect?.();
  if (!point || !rect) return false;
  const pad = 26;
  return point.x >= rect.left - pad
    && point.x <= rect.right + pad
    && point.y >= rect.top - pad
    && point.y <= rect.bottom + pad;
}

function resolveHeartTarget(event, card) {
  const direct = event.target?.closest?.("[data-clara-heart-cta='true']");
  if (direct && card?.contains?.(direct)) return direct;
  const heart = findHeart(card);
  if (isInsideExpandedHeart(event, heart)) return heart;
  return null;
}

function getSelectedSignalId(card) {
  const cardSignal = clean(card?.dataset?.claraSelectedSignal);
  if (cardSignal && cardSignal !== "default") return cardSignal;
  const activeSignal = clean(document.querySelector("[data-clara-pressure-signal][data-active='true']")?.dataset?.claraPressureSignal);
  if (activeSignal && activeSignal !== "default") return activeSignal;
  return clean(getLifeStageSignal(getStage())?.id);
}

function setActiveIcon(signalId) {
  document.querySelectorAll("[data-clara-pressure-signal]").forEach((button) => {
    button.dataset.active = signalId && button.dataset.claraPressureSignal === signalId ? "true" : "false";
  });
}

function ensureStyles() {
  if (document.getElementById("clara-pressure-signals-bridge-styles")) return;
  const style = document.createElement("style");
  style.id = "clara-pressure-signals-bridge-styles";
  style.textContent = `
    #root [data-clara-pressure-signals="true"] { position: relative !important; z-index: 7 !important; display: block !important; width: auto !important; margin-left: auto !important; margin-right: auto !important; padding: 4px 8px !important; border-radius: 999px !important; border: 1px solid rgba(255,255,255,.075) !important; background: radial-gradient(circle at 12% 0%, rgba(45,212,191,.075), transparent 36%), radial-gradient(circle at 96% 45%, rgba(167,139,250,.120), transparent 42%), rgba(7,18,38,.34) !important; box-shadow: inset 0 1px 0 rgba(255,255,255,.055), 0 10px 24px rgba(0,0,0,.14), 0 0 18px rgba(45,212,191,.018) !important; backdrop-filter: blur(22px) saturate(1.12) !important; -webkit-backdrop-filter: blur(22px) saturate(1.12) !important; overflow: hidden !important; box-sizing: border-box !important; justify-self: center !important; max-width: calc(100% - 18px) !important; }
    #root [data-clara-pressure-signals="true"]::before { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(115deg, rgba(255,255,255,.040), transparent 36%, rgba(255,255,255,.014)); opacity: .72; }
    #root [data-clara-pressure-signals="true"] .clara-pressure-track { position: relative !important; z-index: 2 !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important; height: 100% !important; overflow-x: auto !important; overflow-y: hidden !important; padding: 0 2px !important; scrollbar-width: none !important; }
    #root [data-clara-pressure-signals="true"] .clara-pressure-track::-webkit-scrollbar { display: none !important; }
    #root [data-clara-pressure-signals="true"] .clara-pressure-chip { flex: 0 0 32px !important; display: grid !important; place-items: center !important; width: 32px !important; min-width: 32px !important; max-width: 32px !important; height: 32px !important; min-height: 32px !important; max-height: 32px !important; padding: 0 !important; margin: 0 !important; border-radius: 999px !important; border: 1px solid rgba(255,255,255,.10) !important; background: rgba(255,255,255,.045) !important; color: rgba(255,255,255,.86) !important; font-size: 15px !important; font-weight: 900 !important; line-height: 1 !important; box-shadow: inset 0 1px 0 rgba(255,255,255,.055), 0 7px 18px rgba(0,0,0,.12) !important; backdrop-filter: blur(16px) !important; -webkit-backdrop-filter: blur(16px) !important; transition: transform 160ms ease, border-color 160ms ease, background 160ms ease !important; }
    #root [data-clara-pressure-signals="true"] .clara-pressure-chip:active { transform: scale(.92) !important; border-color: rgba(165,243,252,.28) !important; background: rgba(125,211,252,.075) !important; }
    #root [data-clara-pressure-signals="true"] .clara-pressure-chip[data-active="true"] { border-color: rgba(165,243,252,.36) !important; background: radial-gradient(circle at 50% 0%, rgba(125,211,252,.20), rgba(255,255,255,.06)) !important; box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 0 18px rgba(34,211,238,.16) !important; }
    #root [data-clara-pressure-signals="true"] .clara-pressure-chip span { display: block !important; width: auto !important; height: auto !important; padding: 0 !important; margin: 0 !important; border-radius: 0 !important; background: transparent !important; font-size: 15px !important; line-height: 1 !important; box-shadow: none !important; }
    #root [data-clara-pressure-signals="true"] .clara-pressure-chip strong, #root [data-clara-pressure-signals="true"] .clara-pressure-label { display: none !important; }
  `;
  document.head.appendChild(style);
}

function renderSignals(section, support) {
  const stage = getStage();
  const signals = getLifeStageSignals(stage);
  const signature = `${stage}|${signals.map((signal) => signal.id).join("|")}`;
  const changed = section.dataset.pressureSignature !== signature;

  if (!changed) return false;

  section.dataset.pressureSignature = signature;
  section.innerHTML = `
    <div class="clara-pressure-track" aria-label="Today pressure signals">
      ${signals.map((signal) => `
        <button type="button" class="clara-pressure-chip" data-clara-pressure-signal="${signal.id}" aria-label="${signal.ariaLabel || signal.label}" title="${signal.label}">
          <span aria-hidden="true">${signal.icon}</span>
          <strong>${signal.label}</strong>
        </button>
      `).join("")}
    </div>
  `;

  section.dataset.pressureStage = stage;
  resetSupportCardForStage(support, stage);
  return true;
}

function normalizeDockElement(container) {
  const existing = Array.from(container.children).find((node) => node.matches?.("[data-clara-pressure-signals='true']"));
  if (!existing || existing.tagName !== "SECTION") return existing;
  const replacement = document.createElement("div");
  replacement.dataset.claraPressureSignals = "true";
  replacement.dataset.pressureSignature = existing.dataset.pressureSignature || "";
  replacement.dataset.pressureReady = existing.dataset.pressureReady || "";
  replacement.innerHTML = existing.innerHTML;
  existing.replaceWith(replacement);
  return replacement;
}

function enhanceSignals() {
  ensureStyles();
  const hero = findLifeStageHero();
  const support = findSupportCard(hero);
  const container = support?.parentElement || hero?.parentElement || null;
  const snapshot = findSnapshot(container);
  if (!support || !container || !snapshot) return;

  let dock = normalizeDockElement(container);
  if (!dock) {
    dock = document.createElement("div");
    dock.dataset.claraPressureSignals = "true";
    support.insertAdjacentElement("afterend", dock);
  } else if (dock.previousElementSibling !== support) {
    support.insertAdjacentElement("afterend", dock);
  }

  markHeart(support);
  renderSignals(dock, support);

  const stage = getStage();
  if (support.dataset.claraSignalStage !== stage) {
    resetSupportCardForStage(support, stage);
  }

  if (dock.dataset.pressureReady === "true") return;
  dock.dataset.pressureReady = "true";
  dock.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-clara-pressure-signal]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const signalId = button.dataset.claraPressureSignal;
    setActiveIcon(signalId);
    applySupportCopy(support, signalId, "awareness");
  });
}

function handleHeart(event) {
  const hero = findLifeStageHero();
  const card = findSupportCard(hero);
  if (!card) return;

  markHeart(card);
  const heart = resolveHeartTarget(event, card);
  if (!heart) return;

  const signalId = getSelectedSignalId(card);
  if (!signalId || signalId === "default") return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  applySupportCopy(card, signalId, getMode(card) === "guidance" ? "awareness" : "guidance");
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_LIFE_PRESSURE_SIGNALS__) {
  window.__CLARA_LIFE_PRESSURE_SIGNALS__ = true;
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhanceSignals();
    });
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("storage", schedule, { passive: true });
  window.addEventListener("clara:life-stage-profile-updated", schedule, { passive: true });
  document.addEventListener("click", handleHeart, true);
  document.addEventListener("click", () => window.setTimeout(schedule, 80), { passive: true });
  schedule();
}
