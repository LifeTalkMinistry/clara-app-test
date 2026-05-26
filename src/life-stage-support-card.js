import { getLifeStageGuidance } from "./life-stage-guidance";
import { readSelectedLifeStageProfile, getSelectedLifeStageKey } from "./life-stage-flow";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function readProfile() {
  return readSelectedLifeStageProfile() || {};
}

function getSupportCopy() {
  const profile = readProfile();
  const stage = profile.stage || getSelectedLifeStageKey();
  return getLifeStageGuidance(stage, { profile, mode: "awareness" });
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

function setText(node, value) {
  if (!node) return;
  const next = String(value || "");
  if (node.textContent !== next) node.textContent = next;
}

function enhanceSupportCard() {
  const hero = findLifeStageRoot();
  const card = findSupportCard(hero);
  if (!hero || !card) return;

  const title = card.querySelector("h3");
  const body = title?.nextElementSibling;
  if (!title || !body) return;

  const copy = getSupportCopy();
  card.dataset.claraSupportCard = "true";
  if (!card.dataset.claraSelectedSignal || card.dataset.claraSignalMode === "idle") {
    setText(title, copy.title);
    setText(body, copy.body);
  }

  card.querySelectorAll("[data-clara-support-signal='true']").forEach((node) => node.remove());
}

function enhanceAll() {
  enhanceSupportCard();
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_LIFE_SUPPORT_CARD__) {
  window.__CLARA_LIFE_SUPPORT_CARD__ = true;

  let scheduled = false;
  const scheduleEnhance = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhanceAll();
    });
  };

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("storage", scheduleEnhance, { passive: true });
  window.addEventListener("clara:life-stage-profile-updated", scheduleEnhance, { passive: true });
  document.addEventListener("click", () => window.setTimeout(scheduleEnhance, 80), { passive: true });
  scheduleEnhance();
}

if (typeof window !== "undefined" && !window.__CLARA_LOAD_PRESSURE_SIGNALS__) {
  window.__CLARA_LOAD_PRESSURE_SIGNALS__ = true;
  import("./life-stage-pressure-signals.js").catch((error) => {
    console.warn("CLARA pressure signals failed to load:", error);
  });
}

if (typeof window !== "undefined" && !window.__CLARA_LOAD_BUSINESS_STAGE_SIGNALS__) {
  window.__CLARA_LOAD_BUSINESS_STAGE_SIGNALS__ = true;
  import("./life-stage-business-builder-signals.js").catch((error) => {
    console.warn("CLARA business stage signals failed to load:", error);
  });
}
