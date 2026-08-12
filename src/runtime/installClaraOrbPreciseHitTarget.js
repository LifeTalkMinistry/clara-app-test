/*
 * CLARA Orb precise hit target.
 *
 * The launcher intentionally keeps a square visual canvas so the native SVG,
 * glow, and floor reflection retain their established size and position. Only
 * the circular Orb itself should activate Ask Before You Spend, so pointer
 * clicks outside the visible sphere are rejected before React receives them.
 *
 * The Orb page also contains an older component-level rule that hides the
 * Support portal. Keep the shared Support experience available here by
 * restoring only that portal while the Orb page is active.
 */

const RUNTIME_KEY = "__claraOrbPreciseHitTargetRuntime__";
const STYLE_ID = "clara-orb-precise-hit-target-style";
const LAUNCHER_SELECTOR =
  '.clara-community-root[data-community-view="orb"] [data-clara-orb-launcher="true"]';
const SUPPORT_WORLD_ID = "clara-support-world";
const SUPPORT_FORCED_ATTRIBUTE = "data-clara-orb-support-visible";

const SVG_SIZE = 320;
const ORB_CENTER_X = 160;
const ORB_CENTER_Y = 153;
const ORB_HIT_RADIUS = 122;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .clara-community-root[data-community-view="orb"]
      [data-clara-orb-launcher="true"]:active {
      transform: none !important;
    }
  `;
  document.head.appendChild(style);
}

function isInsideOrb(event, launcher) {
  // Keyboard activation must remain available for accessibility.
  if (Number(event.detail) === 0) return true;

  const rect = launcher.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;

  const svgX = ((event.clientX - rect.left) / rect.width) * SVG_SIZE;
  const svgY = ((event.clientY - rect.top) / rect.height) * SVG_SIZE;
  const dx = svgX - ORB_CENTER_X;
  const dy = svgY - ORB_CENTER_Y;

  return dx * dx + dy * dy <= ORB_HIT_RADIUS * ORB_HIT_RADIUS;
}

function restoreSupportWorld(world) {
  if (!world?.hasAttribute(SUPPORT_FORCED_ATTRIBUTE)) return;
  world.style.removeProperty("display");
  world.removeAttribute(SUPPORT_FORCED_ATTRIBUTE);
}

function syncOrbSupportVisibility() {
  const world = document.getElementById(SUPPORT_WORLD_ID);
  if (!world) return;

  const orbActive = document.body?.classList.contains("clara-orb-page-active");
  if (orbActive) {
    world.style.setProperty("display", "block", "important");
    world.setAttribute(SUPPORT_FORCED_ATTRIBUTE, "true");
    return;
  }

  restoreSupportWorld(world);
}

function installClaraOrbPreciseHitTarget() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window[RUNTIME_KEY]?.destroy?.();
  ensureStyles();

  const handleClick = (event) => {
    if (!(event.target instanceof Element)) return;

    const launcher = event.target.closest(LAUNCHER_SELECTOR);
    if (!launcher || isInsideOrb(event, launcher)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const observer = new MutationObserver(syncOrbSupportVisibility);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  document.addEventListener("click", handleClick, true);
  syncOrbSupportVisibility();

  window[RUNTIME_KEY] = {
    destroy() {
      observer.disconnect();
      document.removeEventListener("click", handleClick, true);
      restoreSupportWorld(document.getElementById(SUPPORT_WORLD_ID));
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraOrbPreciseHitTarget();
