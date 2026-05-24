// Prevent the Working Student heart from changing the card while the support card is still in default/idle mode.
// The user must choose a signal first; then the existing heart guidance bridge can run.

const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

function readProfile() {
  try {
    return JSON.parse(window.localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function findHero() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h2")?.textContent);
    const label = section.querySelector("p")?.textContent?.toLowerCase?.() || "";
    return heading && label.includes("your life stage");
  }) || null;
}

function isWorkingStudent() {
  if (clean(readProfile().stage) === "Working Student") return true;
  return clean(findHero()?.querySelector("h2")?.textContent) === "Working Student";
}

function findSupportCard() {
  const hero = findHero();
  if (!hero) return null;
  let node = hero.nextElementSibling;
  while (node) {
    if (node.matches?.("[data-clara-pressure-signals='true']")) {
      node = node.nextElementSibling;
      continue;
    }
    if (clean(node.querySelector?.("h3")?.textContent) || node.querySelector?.("svg")) return node;
    node = node.nextElementSibling;
  }
  return null;
}

function findHeart(card) {
  const marked = card?.querySelector("[data-clara-heart-cta='true']");
  if (marked) return marked;
  const svg = card?.querySelector("svg");
  return svg?.closest("button,[role='button'],div") || null;
}

function hasChosenSignal(card) {
  const selected = clean(card?.dataset?.claraSelectedSignal);
  const activeMode = clean(card?.dataset?.claraSignalCardActive) === "true";
  const mode = clean(card?.dataset?.claraSignalMode);
  const activeButton = document.querySelector("[data-clara-pressure-signal][data-active='true']")?.dataset?.claraPressureSignal;
  return Boolean((activeMode && selected && selected !== "default" && mode !== "idle") || clean(activeButton));
}

function insideHeart(event, heart) {
  if (!heart) return false;
  if (heart.contains?.(event.target)) return true;
  const x = event.clientX ?? event.changedTouches?.[0]?.clientX;
  const y = event.clientY ?? event.changedTouches?.[0]?.clientY;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const rect = heart.getBoundingClientRect?.();
  return Boolean(rect && x >= rect.left - 18 && x <= rect.right + 18 && y >= rect.top - 18 && y <= rect.bottom + 18);
}

function guardIdleHeart(event) {
  if (!isWorkingStudent()) return;
  const card = findSupportCard();
  const heart = findHeart(card);
  if (!card || !heart || !insideHeart(event, heart)) return;
  if (hasChosenSignal(card)) return;

  heart.dataset.claraHeartHint = "false";
  heart.setAttribute("aria-label", "Choose a signal below first");
  heart.title = "Choose a signal below first";

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_WORKING_STUDENT_IDLE_HEART_GUARD__) return;
  window.__CLARA_WORKING_STUDENT_IDLE_HEART_GUARD__ = true;
  window.addEventListener("click", guardIdleHeart, true);
  window.addEventListener("pointerup", guardIdleHeart, true);
  window.addEventListener("touchend", guardIdleHeart, true);
}

try {
  install();
} catch (error) {
  console.warn("CLARA Working Student idle heart guard failed:", error);
}
