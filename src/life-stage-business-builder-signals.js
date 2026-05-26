import { getSelectedLifeStageKey, normalizeLifeStageKey } from "./life-stage-flow";
import { getBusinessBuilderSignalCopy } from "./business-builder-signal-copy";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isBusinessBuilder() {
  return normalizeLifeStageKey(getSelectedLifeStageKey()) === "Business Builder";
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

function setReadableTextFit(body) {
  if (!body) return;
  body.classList?.remove?.("truncate", "line-clamp-1", "line-clamp-2", "line-clamp-3", "overflow-hidden");
  body.style.setProperty("display", "block", "important");
  body.style.setProperty("max-width", "min(15.2rem, calc(100vw - 148px))", "important");
  body.style.setProperty("max-height", "none", "important");
  body.style.setProperty("height", "auto", "important");
  body.style.setProperty("overflow", "visible", "important");
  body.style.setProperty("text-overflow", "clip", "important");
  body.style.setProperty("white-space", "normal", "important");
  body.style.setProperty("-webkit-line-clamp", "unset", "important");
  body.style.setProperty("line-clamp", "unset", "important");
  body.style.setProperty("-webkit-box-orient", "unset", "important");
  body.style.setProperty("font-size", "10.15px", "important");
  body.style.setProperty("line-height", "1.24", "important");
}

function fitDefaultBusinessBuilderCard() {
  if (!isBusinessBuilder()) return;
  const card = findSupportCard();
  const title = card?.querySelector("h3");
  const body = title?.nextElementSibling;
  if (!card || !title || !body) return;
  card.dataset.claraSupportCard = "true";
  card.dataset.claraSignalStage = "Business Builder";
  title.style.setProperty("white-space", "normal", "important");
  title.style.setProperty("overflow", "visible", "important");
  title.style.setProperty("text-overflow", "clip", "important");
  setReadableTextFit(body);
}

function setActiveIcon(signalId) {
  document.querySelectorAll("[data-clara-pressure-signal]").forEach((button) => {
    button.dataset.active = signalId && button.dataset.claraPressureSignal === signalId ? "true" : "false";
  });
}

function applyBusinessBuilderCopy(signalId, mode = "awareness") {
  if (!isBusinessBuilder() || !signalId || signalId === "default") return;
  const card = findSupportCard();
  const title = card?.querySelector("h3");
  const body = title?.nextElementSibling;
  const copy = getBusinessBuilderSignalCopy(signalId, mode);
  if (!card || !title || !body || !copy?.title || !copy?.body) return;

  card.dataset.claraSupportCard = "true";
  card.dataset.claraSignalStage = "Business Builder";
  card.dataset.claraSelectedSignal = signalId;
  card.dataset.claraSignalMode = mode;
  card.dataset.claraSignalCardActive = "true";
  card.dataset.claraStageDefaultCard = "false";
  title.textContent = copy.title;
  body.textContent = copy.body;
  setReadableTextFit(body);
  setActiveIcon(signalId);
}

function queueBusinessBuilderCopy(signalId, mode = "awareness") {
  window.setTimeout(() => applyBusinessBuilderCopy(signalId, mode), 0);
  window.setTimeout(() => applyBusinessBuilderCopy(signalId, mode), 80);
  window.setTimeout(() => applyBusinessBuilderCopy(signalId, mode), 180);
}

function getCardSignal(card) {
  const selected = clean(card?.dataset?.claraSelectedSignal);
  if (selected && selected !== "default") return selected;
  const active = clean(document.querySelector("[data-clara-pressure-signal][data-active='true']")?.dataset?.claraPressureSignal);
  return active && active !== "default" ? active : "cashFlow";
}

function handleClick(event) {
  if (!isBusinessBuilder()) return;

  const signalButton = event.target?.closest?.("[data-clara-pressure-signal]");
  if (signalButton) {
    const signalId = signalButton.dataset.claraPressureSignal;
    queueBusinessBuilderCopy(signalId, "awareness");
    return;
  }

  const card = findSupportCard();
  const heart = event.target?.closest?.("[data-clara-heart-cta='true']");
  if (!card || !heart || !card.contains(heart)) return;

  const signalId = getCardSignal(card);
  const currentMode = card.dataset.claraSignalMode === "guidance" ? "guidance" : "awareness";
  const nextMode = currentMode === "guidance" ? "awareness" : "guidance";
  queueBusinessBuilderCopy(signalId, nextMode);
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_BUSINESS_BUILDER_SIGNALS__) {
  window.__CLARA_BUSINESS_BUILDER_SIGNALS__ = true;
  window.addEventListener("click", handleClick, true);
  document.addEventListener("click", handleClick, true);
  const observer = new MutationObserver(() => window.requestAnimationFrame(fitDefaultBusinessBuilderCard));
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
  window.setTimeout(fitDefaultBusinessBuilderCard, 80);
  window.setTimeout(fitDefaultBusinessBuilderCard, 220);
  window.setTimeout(fitDefaultBusinessBuilderCard, 700);
}
